import { NextRequest, NextResponse } from "next/server";
import { configuredProviders, errorText, generateText, listProvider } from "@/lib/models/catalog";
import { contradictionFlags } from "@/lib/models/contradictions";
import { agreementLabel, demoCatalog, resolveSeats } from "@/lib/models/orchestrator";
import { ANALYST_SYSTEM, briefUserPrompt, slateUserPrompt } from "@/lib/models/prompt";
import { analyzeRequestSchema } from "@/lib/models/request";
import type { AnalyzeColumn, AnalyzeResponse } from "@/lib/models/response";
import { briefSchema, parseModelJson, slateSchema } from "@/lib/models/schema";
import { scriptedBrief, scriptedPicks } from "@/lib/models/scripted";
import { verifyDeal } from "@/lib/quant.verify";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const parsed = analyzeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Analyze request did not match the expected shape" }, { status: 400 });
  }
  const body = parsed.data;
  if (body.task === "brief" && !body.deal) {
    return NextResponse.json({ error: "A brief needs one deal" }, { status: 400 });
  }
  if (body.task === "slate" && (!body.slate || body.slate.length === 0)) {
    return NextResponse.json({ error: "Slate compare needs at least one deal" }, { status: 400 });
  }
  if (body.deal && !verifyDeal(body.deal).ok) {
    return NextResponse.json({ error: "Deal failed the math check and was not sent to a model" }, { status: 400 });
  }

  const listed = configuredProviders().length
    ? await Promise.all(configuredProviders().map((provider) => listProvider(provider)))
    : [];
  const liveModels = listed.flatMap((entry) => entry.models);
  const catalogNote = listed
    .filter((entry) => entry.status.status === "error" && entry.status.message)
    .map((entry) => `${entry.status.provider}: ${entry.status.message}`)
    .join(" ");
  const demo = liveModels.length === 0;
  const catalog = demo ? demoCatalog() : liveModels;
  const seats = resolveSeats(catalog, {
    mode: body.mode,
    seatCount: body.seatCount,
    pinnedIds: body.pinnedIds,
  })
    .filter((seat) => seat.available)
    .map((seat) =>
      demo ? { ...seat, reason: "Demo seat. The live catalog did not return a callable model." } : seat,
    );

  if (seats.length === 0) {
    return NextResponse.json({ error: "No model seat is available for that selection" }, { status: 409 });
  }

  const quote = body.deal?.quotes.find((item) => item.bookmakerKey === body.quoteBook) ?? body.deal?.quotes[0];
  const columns = await Promise.all(
    seats.map(async (seat, index): Promise<AnalyzeColumn> => {
      const started = Date.now();
      try {
        if (body.task === "brief" && body.deal && quote) {
          const facts = {
            book: quote.bookmakerTitle,
            americanOdds: quote.americanOdds,
            fairAmericanOdds: body.deal.fairAmericanOdds,
            trueProb: body.deal.trueProb,
            evPercent: quote.evPercent,
            staleRisk: quote.staleRisk,
          };
          const brief = demo
            ? scriptedBrief(facts)
            : parseModelJson(
                await generateText(
                  seat.provider,
                  seat.id,
                  ANALYST_SYSTEM,
                  briefUserPrompt({
                    matchup: body.deal.matchup,
                    commenceTime: body.deal.commenceTime,
                    market: body.deal.marketKey,
                    selection: body.deal.selection,
                    benchmarkSource: body.deal.benchmarkSource,
                    trueProb: body.deal.trueProb,
                    fairAmericanOdds: body.deal.fairAmericanOdds,
                    vigPercent: body.deal.vigPercent,
                    sharpLastUpdate: body.deal.sharpLastUpdate,
                    target: facts,
                    books: body.deal.quotes.map((item) => ({
                      book: item.bookmakerTitle,
                      americanOdds: item.americanOdds,
                      evPercent: item.evPercent,
                      staleRisk: item.staleRisk,
                      lastUpdate: item.lastUpdate,
                    })),
                  }),
                ),
                briefSchema,
              );
          const flags = contradictionFlags(`${brief.chance} ${brief.price} ${brief.recommendation}`, {
            evPercent: quote.evPercent,
            vigPercent: body.deal.vigPercent,
            winChancePercent: body.deal.trueProb * 100,
            americanPrices: [quote.americanOdds, body.deal.fairAmericanOdds, ...body.deal.quotes.map((item) => item.americanOdds)],
          });
          return {
            id: seat.id,
            provider: seat.provider,
            displayName: seat.displayName,
            tier: seat.tier,
            reason: seat.reason,
            latencyMs: Date.now() - started,
            brief,
            flags,
          };
        }
        const slate = body.slate ?? [];
        const allowed = new Set(slate.map((row) => row.id));
        const picks = demo
          ? scriptedPicks(slate.map((row) => row.id), index)
          : parseModelJson(
              await generateText(seat.provider, seat.id, ANALYST_SYSTEM, slateUserPrompt({ deals: slate })),
              slateSchema,
            ).picks.filter((pick) => allowed.has(pick.id));
        return {
          id: seat.id,
          provider: seat.provider,
          displayName: seat.displayName,
          tier: seat.tier,
          reason: seat.reason,
          latencyMs: Date.now() - started,
          picks,
          flags: [],
        };
      } catch (error) {
        return {
          id: seat.id,
          provider: seat.provider,
          displayName: seat.displayName,
          tier: seat.tier,
          reason: seat.reason,
          latencyMs: Date.now() - started,
          flags: [],
          error: errorText(error),
        };
      }
    }),
  );

  const response: AnalyzeResponse = {
    demo,
    catalogNote: demo && catalogNote ? `${catalogNote} Showing a demo read until a live model is available.` : catalogNote || null,
    task: body.task,
    agreement: agreementLabel(columns.map((column) => column.brief?.verdict ?? null)),
    columns,
    groups: slateGroups(body.slate ?? [], columns),
  };
  return NextResponse.json(response);
}

function slateGroups(slate: NonNullable<AnalyzeRequestSlate>, columns: AnalyzeColumn[]) {
  return slate
    .map((row) => ({
      id: row.id,
      label: row.label,
      namedBy: columns.filter((column) => column.picks?.some((pick) => pick.id === row.id)).map((column) => column.displayName),
    }))
    .filter((group) => group.namedBy.length > 0)
    .sort((a, b) => b.namedBy.length - a.namedBy.length);
}

type AnalyzeRequestSlate = NonNullable<import("@/lib/models/request").AnalyzeRequest["slate"]>;


import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_BOOKMAKERS,
  DEFAULT_MARKETS,
  DESK,
  MARKETS,
  ODDS_REGIONS,
  isSportKey,
  type MarketKey,
} from "@/config/desk";
import { cached, oddsCacheKey } from "@/lib/odds/cache";
import { MOCK_EVENTS } from "@/lib/odds/mock";
import { normalizeEvents } from "@/lib/odds/normalize";
import { rawEventsSchema, type RawEvent } from "@/lib/odds/types";
import { MATH_VERSION } from "@/lib/quant";
import { verifyDeal } from "@/lib/quant.verify";

export const dynamic = "force-dynamic";

type Quota = { remaining: string | null; used: string | null; last: string | null };

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const sport = params.get("sport") ?? "americanfootball_nfl";
  if (!isSportKey(sport)) {
    return NextResponse.json({ error: "Unknown sport" }, { status: 400 });
  }
  const markets = parseMarkets(params.get("markets") ?? DEFAULT_MARKETS);
  const bookmakers = params.get("bookmakers") ?? DEFAULT_BOOKMAKERS;
  if (!/^[\w,]+$/.test(bookmakers)) {
    return NextResponse.json({ error: "Invalid bookmakers" }, { status: 400 });
  }
  const bankroll = parseBankroll(params.get("bankroll"));
  const kellyMultiplier = parseKelly(params.get("kelly"));
  const forceMock = params.get("mock") === "true";
  const apiKey = process.env.ODDS_API_KEY;
  const options = { bankroll, kellyMultiplier, markets };

  if (forceMock || !apiKey) {
    const events = MOCK_EVENTS.filter((event) => event.sport_key === sport);
    return NextResponse.json({
      mode: "demo",
      reason: forceMock ? "Demo mode is on" : "ODDS_API_KEY is not set",
      quota: null,
      demoNote:
        events.length === 0
          ? "Sample prices are loaded for NFL and NBA. Those teams and kickoff times are invented."
          : "Sample prices for practice. These teams and kickoff times are invented. They are not this week's schedule.",
      ...publish(events, options),
    });
  }

  try {
    const payload = await cached(
      oddsCacheKey(sport, markets.join(","), bookmakers, ODDS_REGIONS),
      DESK.cacheTtlMs,
      () => loadLive(sport, markets.join(","), bookmakers, apiKey),
    );
    return NextResponse.json({
      mode: "live",
      quota: payload.quota,
      demoNote: null,
      ...publish(payload.events, options),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Odds request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function publish(
  events: RawEvent[],
  options: { bankroll: number; kellyMultiplier: number; markets: MarketKey[] },
) {
  const normalized = normalizeEvents(events, options);
  const deals = [];
  let suppressed = 0;
  for (const deal of normalized.deals) {
    if (verifyDeal(deal).ok) deals.push(deal);
    else suppressed += 1;
  }
  return { mathVersion: MATH_VERSION, deals, drops: normalized.drops, suppressed };
}

async function loadLive(sport: string, markets: string, bookmakers: string, apiKey: string) {
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/odds`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", ODDS_REGIONS);
  url.searchParams.set("markets", markets);
  url.searchParams.set("bookmakers", bookmakers);
  url.searchParams.set("oddsFormat", "american");
  url.searchParams.set("includeLinks", "true");
  url.searchParams.set("includeSids", "true");
  const response = await fetch(url, { cache: "no-store" });
  const quota: Quota = {
    remaining: response.headers.get("x-requests-remaining"),
    used: response.headers.get("x-requests-used"),
    last: response.headers.get("x-requests-last"),
  };
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Odds API ${response.status}: ${detail.slice(0, 280)}`);
  }
  const parsed = rawEventsSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("Odds API payload did not match the expected shape");
  }
  return { events: parsed.data, quota };
}

function parseMarkets(value: string): MarketKey[] {
  const allowed = new Set(MARKETS.map((market) => market.key));
  const picked = value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is MarketKey => allowed.has(item as MarketKey));
  return picked.length > 0 ? picked : MARKETS.map((market) => market.key);
}

function parseBankroll(value: string | null): number {
  if (!value) return DESK.defaultBankroll;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return DESK.defaultBankroll;
  return Math.min(amount, 1_000_000_000);
}

function parseKelly(value: string | null): number {
  const amount = Number(value);
  return DESK.kellyChoices.some((choice) => choice === amount) ? amount : DESK.defaultKelly;
}

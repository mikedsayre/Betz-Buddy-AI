import { formatAmerican, formatProb } from "@/lib/format";
import type { AnalystBrief } from "@/lib/models/schema";

export type BriefFacts = {
  book: string;
  americanOdds: number;
  fairAmericanOdds: number;
  trueProb: number;
  evPercent: number;
  staleRisk: boolean;
};

export function scriptedBrief(facts: BriefFacts): AnalystBrief {
  const verdict = facts.staleRisk ? "wait" : facts.evPercent > 0 ? "approve" : "pass";
  const pays = facts.evPercent > 0 ? "pays more than fair" : "pays less than fair";
  const recommendation =
    verdict === "wait"
      ? "Wait. This price is older than the benchmark, so confirm it before you use it."
      : verdict === "approve"
        ? "The price is better than fair. You still place the bet yourself."
        : "Skip this price. It pays less than the fair chance.";
  return {
    chance: `This side wins about ${formatProb(facts.trueProb)} of the time.`,
    price: `${facts.book} ${pays}. The price is ${formatAmerican(facts.americanOdds)}. Fair is ${formatAmerican(facts.fairAmericanOdds)}.`,
    verdict,
    recommendation,
  };
}

export function scriptedPicks(ids: string[], seatIndex: number): { id: string; reason: string }[] {
  const picks = [ids[0], ids[Math.min(seatIndex, ids.length - 1)]].filter(
    (id): id is string => Boolean(id),
  );
  return [...new Set(picks)].slice(0, 3).map((id) => ({
    id,
    reason: "Demo rank of a line already on the desk.",
  }));
}

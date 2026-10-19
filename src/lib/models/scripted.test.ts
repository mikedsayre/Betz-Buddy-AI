import { describe, expect, it } from "vitest";
import { contradictionFlags } from "@/lib/models/contradictions";
import { scriptedBrief } from "@/lib/models/scripted";

describe("scripted brief", () => {
  it("cites the desk numbers closely enough to pass the contradiction scan", () => {
    const facts = {
      book: "FanDuel",
      americanOdds: -130,
      fairAmericanOdds: -138,
      trueProb: 0.5806,
      evPercent: 2.585,
      staleRisk: false,
    };
    const brief = scriptedBrief(facts);
    const joined = `${brief.chance} ${brief.price} ${brief.recommendation}`;
    const flags = contradictionFlags(joined, {
      evPercent: facts.evPercent,
      vigPercent: 3.48,
      americanPrices: [facts.americanOdds, facts.fairAmericanOdds],
      winChancePercent: facts.trueProb * 100,
    });
    expect(flags).toEqual([]);
    expect(brief.verdict).toBe("approve");
    expect(contradictionFlags(`${joined} 22%`, {
      evPercent: facts.evPercent,
      vigPercent: 3.48,
      americanPrices: [facts.americanOdds, facts.fairAmericanOdds],
      winChancePercent: facts.trueProb * 100,
    })).toEqual(["22% is not the desk win chance, EV, or vig"]);
  });
});
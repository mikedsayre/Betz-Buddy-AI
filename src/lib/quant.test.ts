import { describe, expect, it } from "vitest";
import {
  QuantInputError,
  americanToDecimal,
  americanToImpliedProb,
  calculateEV,
  calculateKellyStake,
  planSundayCash,
  simulateStake,
  summarizeStakes,
  deVigTwoWayMarket,
  decimalToAmerican,
} from "./quant";

describe("worked references", () => {
  it("de-vigs a -110/-110 market to 50% and about 4.76% vig", () => {
    const result = deVigTwoWayMarket(-110, -110);
    expect(americanToDecimal(-110)).toBeCloseTo(1 + 100 / 110, 12);
    expect(americanToImpliedProb(-110)).toBeCloseTo(110 / 210, 12);
    expect(result.fairProbA).toBeCloseTo(0.5, 12);
    expect(result.fairProbB).toBeCloseTo(0.5, 12);
    expect(result.fairProbA + result.fairProbB).toBeCloseTo(1, 12);
    expect(result.vigPercent).toBeCloseTo(100 / 21, 8);
    expect(result.fairAmericanA).toBe(100);
    expect(result.fairAmericanB).toBe(100);
  });

  it("returns 0 EV and 0 Kelly at a fair +100 price", () => {
    expect(calculateEV(0.5, 2)).toBe(0);
    expect(calculateKellyStake(0.5, 2, 1000, 0.25)).toBe(0);
  });

  it("sizes the 55% at +100 quarter-Kelly example to $25", () => {
    expect(calculateEV(0.55, 2)).toBeCloseTo(10, 12);
    expect(calculateKellyStake(0.55, 2, 1000, 0.25)).toBeCloseTo(25, 12);
  });
});

describe("stake simulator", () => {
  it("pays $36 on a $10 bet at +360 and $1.25 on a $10 bet at -800", () => {
    const longPrice = simulateStake(0.23, americanToDecimal(360), 10);
    const favorite = simulateStake(0.86, americanToDecimal(-800), 10);
    expect(longPrice.profitIfWin).toBeCloseTo(36, 8);
    expect(longPrice.lossIfMiss).toBe(10);
    expect(favorite.profitIfWin).toBeCloseTo(1.25, 8);
    expect(favorite.lossIfMiss).toBe(10);
    expect(favorite.profitIfWin).toBeLessThan(longPrice.profitIfWin);
  });

  it("returns zeros when the typed stake is empty", () => {
    expect(simulateStake(0.5, 2, 0)).toEqual({ profitIfWin: 0, lossIfMiss: 0, expectedProfit: 0 });
  });

  it("adds stake, best profit, cash at risk, and expected dollars across saved bets", () => {
    const summary = summarizeStakes([
      { trueProb: 0.5, decimalOdds: 2, stake: 10 },
      { trueProb: 0.6, decimalOdds: 1.5, stake: 10 },
    ]);
    expect(summary).toEqual({
      count: 2,
      stake: 20,
      profitIfAllWin: 15,
      lossIfAllMiss: 20,
      expectedProfit: (calculateEV(0.6, 1.5) / 100) * 10,
    });
  });

  it("adds the Ravens prices as three separate $10 bets", () => {
    const summary = summarizeStakes([
      { trueProb: 0.52, decimalOdds: americanToDecimal(-115), stake: 10 },
      { trueProb: 0.614, decimalOdds: americanToDecimal(-180), stake: 10 },
      { trueProb: 0.5, decimalOdds: americanToDecimal(-105), stake: 10 },
    ]);
    expect(summary.count).toBe(3);
    expect(summary.stake).toBe(30);
    expect(summary.lossIfAllMiss).toBe(30);
    expect(summary.profitIfAllWin).toBeCloseTo(10 * (100 / 115 + 100 / 180 + 100 / 105), 8);
    const legs = [
      simulateStake(0.52, americanToDecimal(-115), 10),
      simulateStake(0.614, americanToDecimal(-180), 10),
      simulateStake(0.5, americanToDecimal(-105), 10),
    ];
    expect(summary.expectedProfit).toBeCloseTo(
      legs.reduce((sum, leg) => sum + leg.expectedProfit, 0),
      8,
    );
  });

  it("skips a leg the stake simulator cannot price", () => {
    const summary = summarizeStakes([
      { trueProb: 0, decimalOdds: 2, stake: 10 },
      { trueProb: 0.5, decimalOdds: 2, stake: 10 },
    ]);
    expect(summary.count).toBe(1);
    expect(summary.stake).toBe(10);
    expect(summary.profitIfAllWin).toBe(10);
  });
});

describe("Sunday cash", () => {
  const ravens = [
    { id: "spread", eventId: "ravens", trueProb: 0.52, decimalOdds: americanToDecimal(-115), evPercent: -2.9, stale: false },
    { id: "moneyline", eventId: "ravens", trueProb: 0.614, decimalOdds: americanToDecimal(-180), evPercent: -4.4, stale: false },
    { id: "total", eventId: "ravens", trueProb: 0.5, decimalOdds: americanToDecimal(-105), evPercent: -2.4, stale: false },
  ];

  it("puts the whole $50 on the highest win chance in that game", () => {
    const plan = planSundayCash(ravens, 50, false);
    expect(plan.mode).toBe("spend");
    expect(plan.stakes).toEqual([{ id: "moneyline", stake: 50 }]);
    expect(plan.placed).toBe(50);
    expect(plan.left).toBe(0);
    expect(plan.considered[0]).toBe("moneyline");
  });

  it("keeps one side when a second game has a lower chance", () => {
    const plan = planSundayCash(
      [...ravens, { id: "other", eventId: "other", trueProb: 0.57, decimalOdds: 1.8, evPercent: -1, stale: false }],
      50,
      false,
    );
    expect(plan.stakes).toEqual([{ id: "moneyline", stake: 50 }]);
    expect(plan.considered).toEqual(["moneyline", "other"]);
  });

  it("leaves the cash unbet when only better-than-fair prices are allowed and none qualify", () => {
    const plan = planSundayCash(ravens, 50, true);
    expect(plan.mode).toBe("fair-only");
    expect(plan.placed).toBe(0);
    expect(plan.left).toBe(50);
    expect(plan.stakes).toEqual([]);
  });

  it("splits the $50 evenly across each game's best chance", () => {
    const plan = planSundayCash(
      [...ravens, { id: "other", eventId: "other", trueProb: 0.57, decimalOdds: 1.8, evPercent: -1, stale: false }],
      50,
      false,
      true,
    );
    expect(plan.spread).toBe("every");
    expect(plan.stakes).toEqual([
      { id: "moneyline", stake: 25 },
      { id: "other", stake: 25 },
    ]);
    expect(plan.placed).toBe(50);
    expect(plan.left).toBe(0);
  });

  it("gives leftover cents to the higher win chances", () => {
    const plan = planSundayCash(
      [
        { id: "a", eventId: "a", trueProb: 0.7, decimalOdds: 1.5, evPercent: -1, stale: false },
        { id: "b", eventId: "b", trueProb: 0.6, decimalOdds: 1.7, evPercent: -1, stale: false },
        { id: "c", eventId: "c", trueProb: 0.55, decimalOdds: 1.9, evPercent: -1, stale: false },
      ],
      50,
      false,
      true,
    );
    expect(plan.stakes).toEqual([
      { id: "a", stake: 16.67 },
      { id: "b", stake: 16.67 },
      { id: "c", stake: 16.66 },
    ]);
  });

  it("sizes a better-than-fair price with quarter Kelly", () => {
    const plan = planSundayCash(
      [{ id: "plus", eventId: "game", trueProb: 0.55, decimalOdds: 2, evPercent: 10, stale: false }],
      50,
      true,
    );
    expect(plan.stakes).toEqual([{ id: "plus", stake: 1.25 }]);
    expect(plan.placed).toBe(1.25);
    expect(plan.left).toBe(48.75);
  });
});

describe("guards", () => {
  it("rejects american 0 and decimal odds at or below 1", () => {
    expect(() => americanToDecimal(0)).toThrow(QuantInputError);
    expect(() => decimalToAmerican(1)).toThrow(QuantInputError);
  });

  it("excludes a pair whose implied probabilities sum to less than 1", () => {
    expect(() => deVigTwoWayMarket(150, 150)).toThrow(QuantInputError);
  });

  it("converts positive american odds on the decimal path", () => {
    expect(americanToDecimal(150)).toBeCloseTo(2.5, 12);
    expect(americanToImpliedProb(150)).toBeCloseTo(0.4, 12);
  });

  it("returns 0 when Kelly has no edge or the bankroll is empty", () => {
    expect(calculateKellyStake(0.4, 2, 1000, 0.25)).toBe(0);
    expect(calculateKellyStake(0.55, 2, 0, 0.25)).toBe(0);
  });

  it("caps the stake at the bankroll", () => {
    expect(calculateKellyStake(0.9, 3, 100, 5)).toBe(100);
  });
});

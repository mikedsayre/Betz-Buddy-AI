import { DESK } from "@/config/desk";
import type { Deal } from "@/lib/odds/types";
import {
  MATH_VERSION,
  QuantInputError,
  americanToDecimal,
  calculateEV,
  calculateKellyStake,
  fairFromBookPairs,
} from "@/lib/quant";

const FAIR_EPS = 1e-9;
const EV_EPS = 1e-6;
const STAKE_EPS = 1e-6;

export function verifyDeal(deal: Deal): { ok: true } | { ok: false; reason: string } {
  if (deal.mathVersion !== MATH_VERSION || deal.mathAudit.mathVersion !== MATH_VERSION) {
    return { ok: false, reason: "math version mismatch" };
  }
  if (deal.quotes.length === 0) {
    return { ok: false, reason: "deal has no retail quotes" };
  }
  try {
    const fair = fairFromBookPairs(deal.mathAudit.pairs, deal.benchmarkSource);
    if (Math.abs(fair.fairProb - deal.trueProb) > FAIR_EPS) {
      return { ok: false, reason: "fair probability mismatch" };
    }
    if (Math.abs(fair.vigPercent - deal.vigPercent) > EV_EPS) {
      return { ok: false, reason: "vig mismatch" };
    }
    if (fair.fairAmerican !== deal.fairAmericanOdds) {
      return { ok: false, reason: "fair american display mismatch" };
    }
    for (const quote of deal.quotes) {
      const decimal = americanToDecimal(quote.americanOdds);
      if (Math.abs(decimal - quote.decimalOdds) > FAIR_EPS) {
        return { ok: false, reason: "decimal odds mismatch" };
      }
      const ev = calculateEV(deal.trueProb, quote.decimalOdds);
      if (Math.abs(ev - quote.evPercent) > EV_EPS) {
        return { ok: false, reason: "ev mismatch" };
      }
      const stake = calculateKellyStake(
        deal.trueProb,
        quote.decimalOdds,
        deal.mathAudit.bankroll,
        deal.mathAudit.kellyMultiplier,
      );
      if (Math.abs(stake - quote.stakeUnrounded) > STAKE_EPS) {
        return { ok: false, reason: "stake mismatch" };
      }
      const sharpMs = deal.sharpLastUpdate ? Date.parse(deal.sharpLastUpdate) : NaN;
      const quoteMs = quote.lastUpdate ? Date.parse(quote.lastUpdate) : NaN;
      const stale =
        Number.isFinite(sharpMs) &&
        Number.isFinite(quoteMs) &&
        Math.abs(quoteMs - sharpMs) > DESK.staleGapMs;
      if (stale !== quote.staleRisk) {
        return { ok: false, reason: "stale flag mismatch" };
      }
    }
  } catch (error) {
    if (error instanceof QuantInputError) {
      return { ok: false, reason: error.message };
    }
    throw error;
  }
  return { ok: true };
}

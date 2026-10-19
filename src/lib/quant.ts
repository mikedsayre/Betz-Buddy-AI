export const MATH_VERSION = 1;

export class QuantInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuantInputError";
  }
}

export function americanToDecimal(odds: number): number {
  if (!Number.isFinite(odds) || odds === 0) {
    throw new QuantInputError("American odds must be a non-zero finite number");
  }
  if (odds > 0) return 1 + odds / 100;
  return 1 + 100 / Math.abs(odds);
}

/** Display-only. Do not feed the result back into EV or Kelly. */
export function decimalToAmerican(decimal: number): number {
  if (!Number.isFinite(decimal) || decimal <= 1) {
    throw new QuantInputError("Decimal odds must be finite and greater than 1");
  }
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

export function americanToImpliedProb(odds: number): number {
  const decimal = americanToDecimal(odds);
  return 1 / decimal;
}

export type DeVigResult = {
  fairProbA: number;
  fairProbB: number;
  fairAmericanA: number;
  fairAmericanB: number;
  vigPercent: number;
};

export function deVigTwoWayMarket(sideAOdds: number, sideBOdds: number): DeVigResult {
  const impliedA = americanToImpliedProb(sideAOdds);
  const impliedB = americanToImpliedProb(sideBOdds);
  return deVigFromImplied(impliedA, impliedB);
}

export function deVigFromImplied(impliedA: number, impliedB: number): DeVigResult {
  if (
    !Number.isFinite(impliedA) ||
    !Number.isFinite(impliedB) ||
    impliedA <= 0 ||
    impliedA >= 1 ||
    impliedB <= 0 ||
    impliedB >= 1
  ) {
    throw new QuantInputError("Implied probabilities must be inside (0, 1)");
  }
  const sum = impliedA + impliedB;
  if (sum < 1) {
    throw new QuantInputError("Implied probability sum below 1 is excluded");
  }
  const fairProbA = impliedA / sum;
  const fairProbB = impliedB / sum;
  return {
    fairProbA,
    fairProbB,
    fairAmericanA: decimalToAmerican(1 / fairProbA),
    fairAmericanB: decimalToAmerican(1 / fairProbB),
    vigPercent: (sum - 1) * 100,
  };
}

export type BookPair = {
  sideAmerican: number;
  oppositeAmerican: number;
};

/** Fair probability of `side` from one Pinnacle pair or a de-vigged average of complete books. */
export function fairFromBookPairs(
  pairs: BookPair[],
  source: "pinnacle" | "consensus",
): { fairProb: number; vigPercent: number; fairAmerican: number } {
  if (pairs.length === 0) {
    throw new QuantInputError("A fair probability needs at least one two-sided book");
  }
  if (source === "pinnacle") {
    if (pairs.length !== 1) {
      throw new QuantInputError("Pinnacle fair value uses one pair");
    }
    const deVig = deVigTwoWayMarket(pairs[0].sideAmerican, pairs[0].oppositeAmerican);
    return {
      fairProb: deVig.fairProbA,
      vigPercent: deVig.vigPercent,
      fairAmerican: deVig.fairAmericanA,
    };
  }
  const impliedSides = pairs.map((pair) => americanToImpliedProb(pair.sideAmerican));
  const impliedOpposites = pairs.map((pair) => americanToImpliedProb(pair.oppositeAmerican));
  const meanSide = average(impliedSides);
  const meanOpposite = average(impliedOpposites);
  const deVig = deVigFromImplied(meanSide, meanOpposite);
  return {
    fairProb: deVig.fairProbA,
    vigPercent: deVig.vigPercent,
    fairAmerican: deVig.fairAmericanA,
  };
}

export type StakeSimulation = {
  profitIfWin: number;
  lossIfMiss: number;
  expectedProfit: number;
};

/** Cash result of a stake the user typed. Profit uses decimal odds. Expected profit uses the fair probability. */
export function simulateStake(trueProb: number, decimalOdds: number, stake: number): StakeSimulation {
  if (!Number.isFinite(stake) || stake <= 0) {
    return { profitIfWin: 0, lossIfMiss: 0, expectedProfit: 0 };
  }
  return {
    profitIfWin: stake * (decimalOdds - 1),
    lossIfMiss: stake,
    expectedProfit: (calculateEV(trueProb, decimalOdds) / 100) * stake,
  };
}

export type StakeSummary = {
  count: number;
  stake: number;
  profitIfAllWin: number;
  lossIfAllMiss: number;
  expectedProfit: number;
};

/**
 * Adds each stake on its own. Expectation adds even when the bets share a game.
 * This does not produce a chance that the group hits.
 */
export function summarizeStakes(
  legs: { trueProb: number; decimalOdds: number; stake: number }[],
): StakeSummary {
  const summary: StakeSummary = {
    count: 0,
    stake: 0,
    profitIfAllWin: 0,
    lossIfAllMiss: 0,
    expectedProfit: 0,
  };
  for (const leg of legs) {
    let sim: StakeSimulation;
    try {
      sim = simulateStake(leg.trueProb, leg.decimalOdds, leg.stake);
    } catch {
      continue;
    }
    if (!(sim.lossIfMiss > 0)) continue;
    summary.count += 1;
    summary.stake += sim.lossIfMiss;
    summary.profitIfAllWin += sim.profitIfWin;
    summary.lossIfAllMiss += sim.lossIfMiss;
    summary.expectedProfit += sim.expectedProfit;
  }
  return summary;
}

export function calculateEV(trueProb: number, targetBookDecimalOdds: number): number {
  if (!Number.isFinite(trueProb) || trueProb <= 0 || trueProb >= 1) {
    throw new QuantInputError("True probability must be inside (0, 1)");
  }
  if (!Number.isFinite(targetBookDecimalOdds) || targetBookDecimalOdds <= 1) {
    throw new QuantInputError("Target decimal odds must be greater than 1");
  }
  return (trueProb * targetBookDecimalOdds - 1) * 100;
}

export function calculateKellyStake(
  trueProb: number,
  decimalOdds: number,
  bankroll: number,
  kellyMultiplier = 0.25,
): number {
  if (!Number.isFinite(trueProb) || trueProb <= 0 || trueProb >= 1) return 0;
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) return 0;
  if (!Number.isFinite(bankroll) || bankroll <= 0) return 0;
  if (!Number.isFinite(kellyMultiplier) || kellyMultiplier <= 0) return 0;
  const b = decimalOdds - 1;
  const q = 1 - trueProb;
  const f = (b * trueProb - q) / b;
  if (f <= 0) return 0;
  return Math.min(f * kellyMultiplier * bankroll, bankroll);
}

export function displayStake(stake: number): number {
  if (!Number.isFinite(stake) || stake <= 0) return 0;
  return Math.round(stake * 100) / 100;
}

export type SundayLeg = {
  id: string;
  eventId: string;
  trueProb: number;
  decimalOdds: number;
  evPercent: number;
  stale: boolean;
};

export type SundayPlan = {
  mode: "spend" | "fair-only";
  spread: "one" | "every";
  placed: number;
  left: number;
  stakes: { id: string; stake: number }[];
  considered: string[];
};

/** Spends Sunday cash on the highest-chance side, or splits it across every game. Fair-only sizes quarter Kelly. */
export function planSundayCash(
  legs: SundayLeg[],
  cash: number,
  onlyBetterThanFair: boolean,
  everyGame = false,
): SundayPlan {
  const mode = onlyBetterThanFair ? "fair-only" : "spend";
  const spread = everyGame ? "every" : "one";
  const usableCash = Number.isFinite(cash) && cash > 0 ? cash : 0;
  const empty: SundayPlan = { mode, spread, placed: 0, left: displayStake(usableCash), stakes: [], considered: [] };
  const fresh = legs.filter(
    (leg) =>
      !leg.stale &&
      Number.isFinite(leg.trueProb) &&
      leg.trueProb > 0 &&
      leg.trueProb < 1 &&
      Number.isFinite(leg.decimalOdds) &&
      leg.decimalOdds > 1 &&
      Number.isFinite(leg.evPercent),
  );
  if (usableCash <= 0 || fresh.length === 0) return empty;

  const bestPerGame = new Map<string, SundayLeg>();
  for (const leg of fresh) {
    const current = bestPerGame.get(leg.eventId);
    if (!current || preferSundayLeg(leg, current, onlyBetterThanFair)) bestPerGame.set(leg.eventId, leg);
  }
  const ranked = [...bestPerGame.values()].sort((a, b) => compareSundayLeg(a, b, onlyBetterThanFair));
  const considered = ranked.map((leg) => leg.id);

  if (!onlyBetterThanFair) {
    const ids = everyGame ? ranked.map((leg) => leg.id) : [ranked[0].id];
    const stakes = splitEven(ids, usableCash).filter((item) => item.stake > 0);
    const placed = displayStake(stakes.reduce((sum, item) => sum + item.stake, 0));
    return {
      mode,
      spread,
      placed,
      left: displayStake(usableCash - placed),
      stakes,
      considered,
    };
  }

  const priced = ranked.filter((leg) => leg.evPercent > 0);
  const raw = priced
    .map((leg) => ({ id: leg.id, stake: calculateKellyStake(leg.trueProb, leg.decimalOdds, usableCash, 0.25) }))
    .filter((item) => item.stake > 0);
  if (raw.length === 0) return { ...empty, considered };
  const total = raw.reduce((sum, item) => sum + item.stake, 0);
  const scale = total > usableCash ? usableCash / total : 1;
  const stakes = raw
    .map((item) => ({ id: item.id, stake: displayStake(item.stake * scale) }))
    .filter((item) => item.stake > 0);
  let placed = stakes.reduce((sum, item) => sum + item.stake, 0);
  while (placed > usableCash + 1e-9 && stakes.length > 0) {
    const largest = stakes.reduce((best, item) => (item.stake > best.stake ? item : best));
    largest.stake = displayStake(largest.stake - 0.01);
    if (largest.stake <= 0) stakes.splice(stakes.indexOf(largest), 1);
    placed = stakes.reduce((sum, item) => sum + item.stake, 0);
  }
  return {
    mode,
    spread,
    placed: displayStake(placed),
    left: displayStake(usableCash - placed),
    stakes,
    considered,
  };
}

function splitEven(ids: string[], cash: number): { id: string; stake: number }[] {
  if (ids.length === 0) return [];
  const cents = Math.round(cash * 100);
  const each = Math.floor(cents / ids.length);
  let extra = cents - each * ids.length;
  return ids.map((id) => {
    const stakeCents = each + (extra > 0 ? 1 : 0);
    if (extra > 0) extra -= 1;
    return { id, stake: stakeCents / 100 };
  });
}

function preferSundayLeg(next: SundayLeg, current: SundayLeg, onlyBetterThanFair: boolean): boolean {
  return compareSundayLeg(next, current, onlyBetterThanFair) < 0;
}

function compareSundayLeg(a: SundayLeg, b: SundayLeg, onlyBetterThanFair: boolean): number {
  if (onlyBetterThanFair && a.evPercent !== b.evPercent) return b.evPercent - a.evPercent;
  if (!onlyBetterThanFair && a.trueProb !== b.trueProb) return b.trueProb - a.trueProb;
  if (a.trueProb !== b.trueProb) return b.trueProb - a.trueProb;
  if (a.evPercent !== b.evPercent) return b.evPercent - a.evPercent;
  return a.id.localeCompare(b.id);
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

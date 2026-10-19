const PERCENT = /[-+]?\d+(?:\.\d+)?%/g;
const AMERICAN = /(?<![.\d])[+-]\d{3,4}(?!\d)/g;

export function contradictionFlags(
  text: string,
  facts: { evPercent: number; vigPercent: number; americanPrices: number[]; winChancePercent?: number },
): string[] {
  const flags: string[] = [];
  const percents = text.match(PERCENT) ?? [];
  for (const token of percents) {
    const value = Number(token.replace("%", ""));
    const closeToEv = Math.abs(value - facts.evPercent) <= 0.15;
    const closeToVig = Math.abs(value - facts.vigPercent) <= 0.15;
    const closeToChance = facts.winChancePercent != null && Math.abs(value - facts.winChancePercent) <= 0.15;
    if (!closeToEv && !closeToVig && !closeToChance) {
      flags.push(`${token} is not the desk win chance, EV, or vig`);
    }
  }
  const prices = new Set(facts.americanPrices.map((price) => Math.round(price)));
  const odds = text.match(AMERICAN) ?? [];
  for (const token of odds) {
    if (!prices.has(Number(token))) {
      flags.push(`${token} is not a price on this row`);
    }
  }
  return flags;
}

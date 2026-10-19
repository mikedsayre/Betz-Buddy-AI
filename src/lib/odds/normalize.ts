import { MATH_VERSION, americanToDecimal, calculateEV, calculateKellyStake, fairFromBookPairs } from "@/lib/quant";
import { SHARP_BOOK, bookTitle, type MarketKey } from "@/config/desk";
import { DESK } from "@/config/desk";
import type { Deal, DropCounts, Quote, RawBookmaker, RawEvent, RawOutcome } from "@/lib/odds/types";

type SideLeg = {
  name: string;
  point: number | null;
  price: number;
  link: string | null;
};

type CompletePair = {
  bookKey: string;
  title: string;
  lastUpdate: string | null;
  eventLink: string | null;
  marketLink: string | null;
  side: SideLeg;
  opposite: SideLeg;
};

const RETAIL = new Set(["fanduel", "draftkings", "betmgm", "caesars"]);

export function normalizeEvents(
  events: RawEvent[],
  options: { bankroll: number; kellyMultiplier: number; markets: MarketKey[] },
): { deals: Deal[]; drops: DropCounts } {
  const drops: DropCounts = {};
  const deals: Deal[] = [];
  const bump = (reason: string) => {
    drops[reason] = (drops[reason] ?? 0) + 1;
  };

  for (const event of events) {
    for (const marketKey of options.markets) {
      const grouped = new Map<string, CompletePair[]>();
      for (const book of event.bookmakers) {
        for (const pair of pairsFromBook(book, marketKey)) {
          const key = sideKey(marketKey, pair.side);
          const list = grouped.get(key) ?? [];
          list.push(pair);
          grouped.set(key, list);
        }
      }

      for (const [key, pairs] of grouped) {
        const retailPairs = pairs.filter((pair) => RETAIL.has(pair.bookKey));
        if (retailPairs.length === 0) {
          bump("no retail price");
          continue;
        }
        const pinnacle = pairs.find((pair) => pair.bookKey === SHARP_BOOK);
        const benchmark = pinnacle ? [pinnacle] : pairs;
        const source = pinnacle ? "pinnacle" : "consensus";
        if (!pinnacle && pairs.length < 2) {
          bump("incomplete consensus");
          continue;
        }
        try {
          const fair = fairFromBookPairs(
            benchmark.map((pair) => ({
              sideAmerican: pair.side.price,
              oppositeAmerican: pair.opposite.price,
            })),
            source,
          );
          const sharpLastUpdate = pinnacle?.lastUpdate ?? newest(benchmark.map((pair) => pair.lastUpdate));
          const sample = pairs[0];
          const quotes = retailPairs
            .map((pair) => toQuote(pair, fair.fairProb, sharpLastUpdate, options))
            .sort((a, b) => b.evPercent - a.evPercent || a.bookmakerKey.localeCompare(b.bookmakerKey));
          const deal: Deal = {
            id: `${event.id}|${key}`,
            eventId: event.id,
            sportKey: event.sport_key,
            matchup: `${event.away_team} @ ${event.home_team}`,
            commenceTime: event.commence_time,
            marketKey,
            selection: selectionLabel(marketKey, sample.side),
            point: sample.side.point,
            trueProb: fair.fairProb,
            fairAmericanOdds: fair.fairAmerican,
            vigPercent: fair.vigPercent,
            benchmarkSource: source,
            sharpLastUpdate,
            quotes,
            mathVersion: MATH_VERSION,
            mathAudit: {
              mathVersion: MATH_VERSION,
              benchmarkSource: source,
              pairs: benchmark.map((pair) => ({
                book: pair.bookKey,
                sideAmerican: pair.side.price,
                oppositeAmerican: pair.opposite.price,
              })),
              bankroll: options.bankroll,
              kellyMultiplier: options.kellyMultiplier,
            },
          };
          deals.push(deal);
        } catch {
          bump("rejected pair");
        }
      }
    }
  }

  return { deals, drops };
}

function toQuote(
  pair: CompletePair,
  trueProb: number,
  sharpLastUpdate: string | null,
  options: { bankroll: number; kellyMultiplier: number },
): Quote {
  const decimalOdds = americanToDecimal(pair.side.price);
  const lastUpdate = pair.lastUpdate;
  return {
    bookmakerKey: pair.bookKey,
    bookmakerTitle: pair.title || bookTitle(pair.bookKey),
    americanOdds: pair.side.price,
    decimalOdds,
    link: pair.side.link ?? pair.marketLink ?? pair.eventLink,
    lastUpdate,
    evPercent: calculateEV(trueProb, decimalOdds),
    stakeUnrounded: calculateKellyStake(trueProb, decimalOdds, options.bankroll, options.kellyMultiplier),
    staleRisk: isStale(sharpLastUpdate, lastUpdate),
  };
}

function isStale(sharp: string | null, retail: string | null): boolean {
  if (!sharp || !retail) return false;
  const sharpMs = Date.parse(sharp);
  const retailMs = Date.parse(retail);
  if (!Number.isFinite(sharpMs) || !Number.isFinite(retailMs)) return false;
  return Math.abs(retailMs - sharpMs) > DESK.staleGapMs;
}

function newest(stamps: Array<string | null>): string | null {
  let best: string | null = null;
  let bestMs = -Infinity;
  for (const stamp of stamps) {
    if (!stamp) continue;
    const ms = Date.parse(stamp);
    if (Number.isFinite(ms) && ms > bestMs) {
      bestMs = ms;
      best = stamp;
    }
  }
  return best;
}

function pairsFromBook(book: RawBookmaker, marketKey: MarketKey): CompletePair[] {
  const market = book.markets.find((item) => item.key === marketKey);
  if (!market) return [];
  const base = {
    bookKey: book.key,
    title: book.title,
    lastUpdate: market.last_update ?? book.last_update ?? null,
    eventLink: book.link ?? null,
    marketLink: market.link ?? null,
  };
  if (marketKey === "h2h") {
    if (market.outcomes.length !== 2) return [];
    return bothWays(base, market.outcomes[0], market.outcomes[1]);
  }
  if (marketKey === "spreads") {
    const byAbs = groupBy(market.outcomes, (outcome) =>
      outcome.point == null ? "" : Math.abs(outcome.point).toFixed(2),
    );
    const pairs: CompletePair[] = [];
    for (const outcomes of byAbs.values()) {
      const zeros = outcomes.filter((outcome) => outcome.point === 0);
      if (zeros.length === 2) {
        pairs.push(...bothWays(base, zeros[0], zeros[1]));
        continue;
      }
      const negatives = outcomes.filter((outcome) => (outcome.point ?? 0) < 0);
      const positives = outcomes.filter((outcome) => (outcome.point ?? 0) > 0);
      if (negatives.length !== 1 || positives.length !== 1) continue;
      if (Math.abs(negatives[0].point ?? 0) !== Math.abs(positives[0].point ?? 0)) continue;
      pairs.push(...bothWays(base, negatives[0], positives[0]));
    }
    return pairs;
  }
  const byPoint = groupBy(market.outcomes, (outcome) =>
    outcome.point == null ? "" : outcome.point.toFixed(2),
  );
  const pairs: CompletePair[] = [];
  for (const outcomes of byPoint.values()) {
    const over = outcomes.filter((outcome) => /^over\b/i.test(outcome.name));
    const under = outcomes.filter((outcome) => /^under\b/i.test(outcome.name));
    if (over.length !== 1 || under.length !== 1) continue;
    pairs.push(...bothWays(base, over[0], under[0]));
  }
  return pairs;
}

function bothWays(
  base: Omit<CompletePair, "side" | "opposite">,
  a: RawOutcome,
  b: RawOutcome,
): CompletePair[] {
  const left = leg(a);
  const right = leg(b);
  return [
    { ...base, side: left, opposite: right },
    { ...base, side: right, opposite: left },
  ];
}

function leg(outcome: RawOutcome): SideLeg {
  return {
    name: outcome.name,
    point: outcome.point ?? null,
    price: outcome.price,
    link: outcome.link ?? null,
  };
}

function sideKey(marketKey: MarketKey, side: SideLeg): string {
  return `${marketKey}|${side.point == null ? "na" : side.point.toFixed(2)}|${side.name}`;
}

function selectionLabel(marketKey: MarketKey, side: SideLeg): string {
  if (marketKey === "h2h" || side.point == null) return side.name;
  const point = side.point > 0 ? `+${side.point}` : `${side.point}`;
  return `${side.name} ${point}`;
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

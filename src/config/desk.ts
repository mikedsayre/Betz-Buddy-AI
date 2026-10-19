export const DESK = {
  cacheTtlMs: 120_000,
  staleGapMs: 120_000,
  evHighlightPercent: 1.5,
  defaultBankroll: 1000,
  defaultKelly: 0.25,
  slateLimit: 15,
  kellyChoices: [0.25, 0.5, 1] as const,
} as const;

export const SPORTS = [
  { key: "americanfootball_nfl", label: "NFL" },
  { key: "americanfootball_ncaaf", label: "NCAAF" },
  { key: "basketball_nba", label: "NBA" },
  { key: "baseball_mlb", label: "MLB" },
  { key: "icehockey_nhl", label: "NHL" },
] as const;

export const MARKETS = [
  { key: "h2h", label: "Moneyline" },
  { key: "spreads", label: "Spreads" },
  { key: "totals", label: "Totals" },
] as const;

export const ODDS_REGIONS = "us";

export const SHARP_BOOK = "pinnacle";

export const RETAIL_BOOKS = [
  { key: "fanduel", title: "FanDuel" },
  { key: "draftkings", title: "DraftKings" },
  { key: "betmgm", title: "BetMGM" },
  { key: "caesars", title: "Caesars" },
] as const;

export const DEFAULT_BOOKMAKERS = [SHARP_BOOK, ...RETAIL_BOOKS.map((book) => book.key)].join(",");

export const DEFAULT_MARKETS = MARKETS.map((market) => market.key).join(",");

export type SportKey = (typeof SPORTS)[number]["key"];
export type MarketKey = (typeof MARKETS)[number]["key"];

export function isSportKey(value: string): value is SportKey {
  return SPORTS.some((sport) => sport.key === value);
}

export function bookTitle(key: string): string {
  if (key === SHARP_BOOK) return "Pinnacle";
  return RETAIL_BOOKS.find((book) => book.key === key)?.title ?? key;
}

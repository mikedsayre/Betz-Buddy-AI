import { z } from "zod";
import type { MarketKey } from "@/config/desk";

export const rawOutcomeSchema = z.object({
  name: z.string(),
  price: z.number(),
  point: z.number().optional(),
  link: z.string().nullable().optional(),
});

export const rawMarketSchema = z.object({
  key: z.string(),
  last_update: z.string().optional(),
  link: z.string().nullable().optional(),
  outcomes: z.array(rawOutcomeSchema),
});

export const rawBookmakerSchema = z.object({
  key: z.string(),
  title: z.string(),
  last_update: z.string().optional(),
  link: z.string().nullable().optional(),
  markets: z.array(rawMarketSchema),
});

export const rawEventSchema = z.object({
  id: z.string(),
  sport_key: z.string(),
  commence_time: z.string(),
  home_team: z.string(),
  away_team: z.string(),
  bookmakers: z.array(rawBookmakerSchema),
});

export const rawEventsSchema = z.array(rawEventSchema);

export type RawEvent = z.infer<typeof rawEventSchema>;
export type RawBookmaker = z.infer<typeof rawBookmakerSchema>;
export type RawOutcome = z.infer<typeof rawOutcomeSchema>;

export type Quote = {
  bookmakerKey: string;
  bookmakerTitle: string;
  americanOdds: number;
  decimalOdds: number;
  link: string | null;
  lastUpdate: string | null;
  evPercent: number;
  stakeUnrounded: number;
  staleRisk: boolean;
};

export type BenchmarkPair = {
  book: string;
  sideAmerican: number;
  oppositeAmerican: number;
};

export type Deal = {
  id: string;
  eventId: string;
  sportKey: string;
  matchup: string;
  commenceTime: string;
  marketKey: MarketKey;
  selection: string;
  point: number | null;
  trueProb: number;
  fairAmericanOdds: number;
  vigPercent: number;
  benchmarkSource: "pinnacle" | "consensus";
  sharpLastUpdate: string | null;
  quotes: Quote[];
  mathVersion: number;
  mathAudit: {
    mathVersion: number;
    benchmarkSource: "pinnacle" | "consensus";
    pairs: BenchmarkPair[];
    bankroll: number;
    kellyMultiplier: number;
  };
};

export type DropCounts = Record<string, number>;

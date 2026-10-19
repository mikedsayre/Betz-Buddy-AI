import { z } from "zod";

const quoteSchema = z.object({
  bookmakerKey: z.string(),
  bookmakerTitle: z.string(),
  americanOdds: z.number(),
  decimalOdds: z.number(),
  link: z.string().nullable(),
  lastUpdate: z.string().nullable(),
  evPercent: z.number(),
  stakeUnrounded: z.number(),
  staleRisk: z.boolean(),
});

export const dealSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  sportKey: z.string(),
  matchup: z.string(),
  commenceTime: z.string(),
  marketKey: z.enum(["h2h", "spreads", "totals"]),
  selection: z.string(),
  point: z.number().nullable(),
  trueProb: z.number(),
  fairAmericanOdds: z.number(),
  vigPercent: z.number(),
  benchmarkSource: z.enum(["pinnacle", "consensus"]),
  sharpLastUpdate: z.string().nullable(),
  quotes: z.array(quoteSchema).min(1),
  mathVersion: z.number(),
  mathAudit: z.object({
    mathVersion: z.number(),
    benchmarkSource: z.enum(["pinnacle", "consensus"]),
    pairs: z
      .array(
        z.object({
          book: z.string(),
          sideAmerican: z.number(),
          oppositeAmerican: z.number(),
        }),
      )
      .min(1),
    bankroll: z.number(),
    kellyMultiplier: z.number(),
  }),
});

export const analyzeRequestSchema = z.object({
  task: z.enum(["brief", "slate"]),
  mode: z.enum(["adaptive", "custom"]).default("adaptive"),
  seatCount: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  pinnedIds: z.array(z.string()).max(3).optional(),
  deal: dealSchema.optional(),
  quoteBook: z.string().optional(),
  slate: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        evPercent: z.number(),
        americanOdds: z.number(),
        fairAmericanOdds: z.number(),
        benchmarkSource: z.enum(["pinnacle", "consensus"]),
        staleRisk: z.boolean(),
        book: z.string(),
      }),
    )
    .max(15)
    .optional(),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

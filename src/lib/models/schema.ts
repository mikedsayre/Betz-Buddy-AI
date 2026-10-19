import { z } from "zod";

export const briefSchema = z.object({
  chance: z.string().min(1),
  price: z.string().min(1),
  verdict: z.enum(["approve", "pass", "wait"]),
  recommendation: z.string().min(1),
});

export type AnalystBrief = z.infer<typeof briefSchema>;

export const slateSchema = z.object({
  picks: z
    .array(
      z.object({
        id: z.string(),
        reason: z.string(),
      }),
    )
    .max(3),
});

export function parseModelJson<T>(text: string, schema: z.ZodType<T>): T {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("Model did not return JSON");
  }
  return schema.parse(JSON.parse(trimmed.slice(start, end + 1)));
}

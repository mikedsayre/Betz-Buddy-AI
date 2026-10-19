import type { AnalystBrief } from "@/lib/models/schema";

export type AnalyzeColumn = {
  id: string;
  provider: string;
  displayName: string;
  tier: "frontier" | "balanced";
  reason: string;
  latencyMs: number | null;
  brief?: AnalystBrief;
  picks?: { id: string; reason: string }[];
  flags: string[];
  error?: string;
};

export type SlateGroup = {
  id: string;
  label: string;
  namedBy: string[];
};

export type AnalyzeResponse = {
  demo: boolean;
  catalogNote: string | null;
  task: "brief" | "slate";
  agreement: { label: string; ratio: number | null };
  columns: AnalyzeColumn[];
  groups: SlateGroup[];
};

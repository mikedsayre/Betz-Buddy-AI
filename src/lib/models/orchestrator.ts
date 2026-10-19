import { BALANCED_SEED, FRONTIER_SEED, PROVIDERS, providerOfId, type ProviderId } from "@/config/models";

export type CatalogModel = {
  id: string;
  provider: ProviderId;
  displayName: string;
};

export type Seat = {
  id: string;
  provider: ProviderId;
  displayName: string;
  tier: "frontier" | "balanced";
  reason: string;
  available: boolean;
  error?: string;
};

export function resolveSeats(
  catalog: CatalogModel[],
  input: { mode: "adaptive" | "custom"; seatCount?: 1 | 2 | 3; pinnedIds?: string[] },
): Seat[] {
  if (input.mode === "custom") {
    const pins = (input.pinnedIds ?? []).filter(Boolean).slice(0, 3);
    if (pins.length === 0) return [];
    return pins.map((id) => {
      const found = catalog.find((model) => model.id === id);
      if (!found) {
        return {
          id,
          provider: providerOfId(id),
          displayName: id,
          tier: "frontier" as const,
          reason: "Pinned by you",
          available: false,
          error: `${id} is not in the live catalog`,
        };
      }
      return {
        ...found,
        tier: tierOf(found),
        reason: "Pinned by you",
        available: true,
      };
    });
  }

  const seated: Seat[] = [];
  for (const provider of PROVIDERS) {
    const frontier = FRONTIER_SEED[provider].find((id) => catalog.some((model) => model.id === id));
    if (frontier) {
      const model = catalog.find((item) => item.id === frontier);
      if (!model) continue;
      seated.push({
        ...model,
        tier: "frontier",
        reason: "Frontier seed present in the live catalog",
        available: true,
      });
      continue;
    }
    const balanced = BALANCED_SEED[provider].find((id) => catalog.some((model) => model.id === id));
    if (!balanced) continue;
    const model = catalog.find((item) => item.id === balanced);
    if (!model) continue;
    seated.push({
      ...model,
      tier: "balanced",
      reason: "Frontier id missing from the live catalog",
      available: true,
    });
  }

  const limit = input.seatCount ?? Math.min(3, seated.length);
  return seated.slice(0, limit);
}

export function demoCatalog(): CatalogModel[] {
  return PROVIDERS.flatMap((provider) => {
    const ids = [
      ...FRONTIER_SEED[provider],
      ...BALANCED_SEED[provider].filter((id) => !FRONTIER_SEED[provider].includes(id)),
    ];
    return ids.map((id) => ({ id, provider, displayName: id }));
  });
}

function tierOf(model: CatalogModel): "frontier" | "balanced" {
  return FRONTIER_SEED[model.provider].includes(model.id) ? "frontier" : "balanced";
}

export function agreementLabel(verdicts: Array<"approve" | "pass" | "wait" | null>): {
  label: string;
  ratio: number | null;
} {
  const votes = verdicts.filter((verdict): verdict is "approve" | "pass" | "wait" => verdict != null);
  if (votes.length === 0) return { label: "No brief returned", ratio: null };
  if (votes.length === 1) return { label: "Single read", ratio: null };
  const counts = new Map<string, number>();
  for (const vote of votes) counts.set(vote, (counts.get(vote) ?? 0) + 1);
  let top = votes[0];
  for (const [verdict, count] of counts) {
    if (count > (counts.get(top) ?? 0)) top = verdict as typeof top;
  }
  const topCount = counts.get(top) ?? 0;
  if (topCount === 1 && counts.size === votes.length) {
    return { label: "Split", ratio: 1 / votes.length };
  }
  return {
    label: `${topCount} of ${votes.length} say ${top}`,
    ratio: topCount / votes.length,
  };
}

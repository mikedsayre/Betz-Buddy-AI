import { NextResponse } from "next/server";
import { BALANCED_SEED, FRONTIER_SEED, PROVIDERS } from "@/config/models";
import { configuredProviders, listProvider } from "@/lib/models/catalog";
import { demoCatalog, type CatalogModel } from "@/lib/models/orchestrator";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = configuredProviders();
  if (configured.length === 0) {
    return NextResponse.json({
      demo: true,
      models: demoCatalog(),
      providers: PROVIDERS.map((provider) => ({ provider, status: "missing_key" as const })),
    });
  }

  const listed = await Promise.all(configured.map((provider) => listProvider(provider)));
  const missing = PROVIDERS.filter((provider) => !configured.includes(provider)).map((provider) => ({
    provider,
    status: "missing_key" as const,
  }));
  const models = rank(listed.flatMap((entry) => entry.models));
  return NextResponse.json({
    demo: false,
    models,
    providers: [...listed.map((entry) => entry.status), ...missing],
  });
}

function rank(models: CatalogModel[]): CatalogModel[] {
  const score = (model: CatalogModel) => {
    const frontier = FRONTIER_SEED[model.provider].indexOf(model.id);
    if (frontier >= 0) return frontier;
    const balanced = BALANCED_SEED[model.provider].indexOf(model.id);
    if (balanced >= 0) return 100 + balanced;
    return 1000;
  };
  return [...models].sort((a, b) => score(a) - score(b) || a.id.localeCompare(b.id)).slice(0, 80);
}

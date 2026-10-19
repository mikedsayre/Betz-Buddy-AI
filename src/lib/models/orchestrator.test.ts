import { describe, expect, it } from "vitest";
import { agreementLabel, resolveSeats, type CatalogModel } from "@/lib/models/orchestrator";

const catalog: CatalogModel[] = [
  { id: "gemini-4-argon", provider: "google", displayName: "Gemini 4 Argon" },
  { id: "gpt-6-astra", provider: "openai", displayName: "GPT-6 Astra" },
  { id: "claude-fable-5-1", provider: "anthropic", displayName: "Claude Fable 5.1" },
];

describe("resolveSeats", () => {
  it("seats every healthy frontier model when the count is adaptive", () => {
    const seats = resolveSeats(catalog, { mode: "adaptive" });
    expect(seats.map((seat) => seat.id)).toEqual(["gemini-4-argon", "gpt-6-astra", "claude-fable-5-1"]);
    expect(seats.every((seat) => seat.tier === "frontier" && seat.available)).toBe(true);
  });

  it("uses one seat when asked", () => {
    expect(resolveSeats(catalog, { mode: "adaptive", seatCount: 1 })).toHaveLength(1);
  });

  it("steps a provider down when its frontier id is absent", () => {
    const partial = catalog.filter((model) => model.provider !== "openai");
    partial.push({ id: "gpt-6-luna", provider: "openai", displayName: "GPT-6 Luna" });
    const seats = resolveSeats(partial, { mode: "adaptive" });
    const openai = seats.find((seat) => seat.provider === "openai");
    expect(openai?.id).toBe("gpt-6-luna");
    expect(openai?.tier).toBe("balanced");
  });

  it("does not call a pinned id that left the catalog", () => {
    const seats = resolveSeats(catalog, { mode: "custom", pinnedIds: ["gemini-2.5-pro"] });
    expect(seats[0]?.available).toBe(false);
    expect(seats[0]?.error).toMatch(/live catalog/);
  });
});

describe("agreementLabel", () => {
  it("hides the meter for a single read and counts the rest", () => {
    expect(agreementLabel(["approve"]).label).toBe("Single read");
    expect(agreementLabel(["approve", "approve", "wait"]).label).toBe("2 of 3 say approve");
    expect(agreementLabel(["approve", "pass", "wait"]).label).toBe("Split");
  });
});

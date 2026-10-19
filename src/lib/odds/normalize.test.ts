import { describe, expect, it } from "vitest";
import { DESK } from "@/config/desk";
import { MOCK_EVENTS } from "@/lib/odds/mock";
import { normalizeEvents } from "@/lib/odds/normalize";
import { verifyDeal } from "@/lib/quant.verify";
import type { RawEvent } from "@/lib/odds/types";

const options = {
  bankroll: DESK.defaultBankroll,
  kellyMultiplier: DESK.defaultKelly,
  markets: ["h2h", "spreads", "totals"] as const,
};

describe("mock board", () => {
  const { deals } = normalizeEvents(MOCK_EVENTS, { ...options, markets: [...options.markets] });

  it("verifies every deal and includes both a positive and a negative EV price", () => {
    expect(deals.length).toBeGreaterThan(0);
    for (const deal of deals) {
      expect(verifyDeal(deal).ok).toBe(true);
    }
    const evs = deals.flatMap((deal) => deal.quotes.map((quote) => quote.evPercent));
    expect(evs.some((ev) => ev > 0)).toBe(true);
    expect(evs.some((ev) => ev < 0)).toBe(true);
  });

  it("keeps Chiefs -3.5 off the +3 board", () => {
    const chiefsSpread = deals.find((deal) => deal.selection === "Kansas City Chiefs -3.5");
    expect(chiefsSpread?.quotes.every((quote) => quote.bookmakerKey !== "pinnacle")).toBe(true);
    expect(deals.some((deal) => deal.selection.includes("-3") && !deal.selection.includes("-3.5"))).toBe(
      false,
    );
  });

  it("flags the stale Caesars price and leaves the fresh FanDuel price clear", () => {
    const chiefs = deals.find((deal) => deal.id.endsWith("|h2h|na|Kansas City Chiefs"));
    const caesars = chiefs?.quotes.find((quote) => quote.bookmakerKey === "caesars");
    const fanduel = chiefs?.quotes.find((quote) => quote.bookmakerKey === "fanduel");
    expect(caesars?.staleRisk).toBe(true);
    expect(fanduel?.staleRisk).toBe(false);
    expect(fanduel?.evPercent).toBeGreaterThan(1.5);
    expect(fanduel?.link).toContain("example.com");
  });
});

describe("consensus fallback", () => {
  it("de-vigs two complete books when Pinnacle is absent", () => {
    const event: RawEvent = {
      id: "consensus-only",
      sport_key: "americanfootball_nfl",
      commence_time: "2026-10-18T17:00:00Z",
      home_team: "Home",
      away_team: "Away",
      bookmakers: [
        {
          key: "draftkings",
          title: "DraftKings",
          last_update: "2026-10-15T20:00:00Z",
          markets: [
            {
              key: "h2h",
              outcomes: [
                { name: "Home", price: -110 },
                { name: "Away", price: -110 },
              ],
            },
          ],
        },
        {
          key: "fanduel",
          title: "FanDuel",
          last_update: "2026-10-15T20:00:00Z",
          markets: [
            {
              key: "h2h",
              outcomes: [
                { name: "Home", price: 110 },
                { name: "Away", price: -140 },
              ],
            },
          ],
        },
      ],
    };
    const { deals, drops } = normalizeEvents([event], {
      bankroll: 1000,
      kellyMultiplier: 0.25,
      markets: ["h2h"],
    });
    expect(drops["incomplete consensus"] ?? 0).toBe(0);
    expect(deals.every((deal) => deal.benchmarkSource === "consensus")).toBe(true);
    expect(deals.every((deal) => verifyDeal(deal).ok)).toBe(true);
  });
});

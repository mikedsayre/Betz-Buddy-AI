import type { RawEvent } from "@/lib/odds/types";

// Practice prices only. Team names and commence_time are not a real schedule.
const SHARP_AT = "2026-10-15T20:00:00Z";
const FRESH_AT = "2026-10-15T20:00:30Z";
const STALE_AT = "2026-10-15T19:50:00Z";

export const MOCK_EVENTS: RawEvent[] = [
  {
    id: "mock-nfl-kc-buf",
    sport_key: "americanfootball_nfl",
    commence_time: "2026-10-18T17:00:00Z",
    home_team: "Kansas City Chiefs",
    away_team: "Buffalo Bills",
    bookmakers: [
      book("pinnacle", "Pinnacle", SHARP_AT, [
        h2h([
          ["Kansas City Chiefs", -150],
          ["Buffalo Bills", 130],
        ]),
        spread([
          ["Kansas City Chiefs", -110, -3.5],
          ["Buffalo Bills", -110, 3.5],
        ]),
        total([
          ["Over", -110, 47.5],
          ["Under", -110, 47.5],
        ]),
      ]),
      book("fanduel", "FanDuel", FRESH_AT, [
        h2h(
          [
            ["Kansas City Chiefs", -130],
            ["Buffalo Bills", 110],
          ],
          "https://example.com/betslip/fanduel/kc-buf-ml",
        ),
        spread(
          [
            ["Kansas City Chiefs", -108, -3.5],
            ["Buffalo Bills", -112, 3.5],
          ],
          "https://example.com/betslip/fanduel/kc-buf-spread",
        ),
      ]),
      book("draftkings", "DraftKings", FRESH_AT, [
        h2h(
          [
            ["Kansas City Chiefs", -155],
            ["Buffalo Bills", 130],
          ],
          "https://example.com/betslip/draftkings/kc-buf-ml",
        ),
        total(
          [
            ["Over", -115, 47.5],
            ["Under", -105, 47.5],
          ],
          "https://example.com/betslip/draftkings/kc-buf-total",
        ),
      ]),
      book("betmgm", "BetMGM", FRESH_AT, [
        h2h([
          ["Kansas City Chiefs", -148],
          ["Buffalo Bills", 124],
        ]),
      ]),
      book("caesars", "Caesars", STALE_AT, [
        h2h([
          ["Kansas City Chiefs", -145],
          ["Buffalo Bills", 122],
        ]),
      ]),
    ],
  },
  {
    id: "mock-nba-bos-nyk",
    sport_key: "basketball_nba",
    commence_time: "2026-10-18T23:30:00Z",
    home_team: "New York Knicks",
    away_team: "Boston Celtics",
    bookmakers: [
      book("pinnacle", "Pinnacle", SHARP_AT, [
        h2h([
          ["Boston Celtics", -120],
          ["New York Knicks", 100],
        ]),
      ]),
      book("fanduel", "FanDuel", FRESH_AT, [
        h2h(
          [
            ["Boston Celtics", -115],
            ["New York Knicks", -105],
          ],
          "https://example.com/betslip/fanduel/bos-nyk-ml",
        ),
      ]),
      book("draftkings", "DraftKings", FRESH_AT, [
        h2h(
          [
            ["Boston Celtics", -118],
            ["New York Knicks", -102],
          ],
          "https://example.com/betslip/draftkings/bos-nyk-ml",
        ),
      ]),
    ],
  },
];

function book(
  key: string,
  title: string,
  lastUpdate: string,
  markets: RawEvent["bookmakers"][number]["markets"],
): RawEvent["bookmakers"][number] {
  return { key, title, last_update: lastUpdate, link: null, markets };
}

function h2h(
  prices: Array<[string, number]>,
  link?: string,
): RawEvent["bookmakers"][number]["markets"][number] {
  return {
    key: "h2h",
    last_update: undefined,
    link: link ?? null,
    outcomes: prices.map(([name, price]) => ({ name, price, link: link ?? null })),
  };
}

function spread(
  prices: Array<[string, number, number]>,
  link?: string,
): RawEvent["bookmakers"][number]["markets"][number] {
  return {
    key: "spreads",
    link: link ?? null,
    outcomes: prices.map(([name, price, point]) => ({ name, price, point, link: link ?? null })),
  };
}

function total(
  prices: Array<[string, number, number]>,
  link?: string,
): RawEvent["bookmakers"][number]["markets"][number] {
  return {
    key: "totals",
    link: link ?? null,
    outcomes: prices.map(([name, price, point]) => ({ name, price, point, link: link ?? null })),
  };
}

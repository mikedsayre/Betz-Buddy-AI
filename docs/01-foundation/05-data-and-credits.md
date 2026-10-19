# Data and credits

## Upstream

`GET https://api.the-odds-api.com/v4/sports/{sport}/odds`

Query: `apiKey`, `regions=us`, `markets`, `bookmakers`, `oddsFormat=american`, `includeLinks=true`, `includeSids=true`.

`regions=us` is the live scope. Pinnacle is an EU book in this feed, so a US scan usually has no Pinnacle pair. The fair price is then the de-vigged consensus of US books that posted both sides, and the row is labeled `consensus`.

Default sport `americanfootball_nfl`. Also supported: `basketball_nba`, `baseball_mlb`, `icehockey_nhl`, `americanfootball_ncaaf`.

Default markets: `h2h,spreads,totals`.

Default books: `pinnacle,fanduel,draftkings,betmgm,caesars`.

Bookmaker keys are verified against The Odds API bookmaker list at implementation time. If a key has changed, update `src/config/desk.ts` and this file. Do not guess a key in the UI.

## Quota

Return `x-requests-remaining`, `x-requests-used`, and `x-requests-last` to the client on live responses. Demo mode sends a null quota and the Demo badge.

One live scan of the default markets (`h2h,spreads,totals`) in `us` costs **3 credits**: 3 markets × 1 region. Prices below are from [The Odds API](https://the-odds-api.com/) and the [v4 usage guide](https://the-odds-api.com/liveapi/guides/v4/), checked 2026-10-16. This is not the unrelated host `theoddsapi.com`. The account header on a scan is the bill that counts.

| Plan | Monthly price | Credits | Scans at 3 credits |
| --- | --- | --- | --- |
| Free | $0 | 500 | about 166 |
| 20K | $30 | 20,000 | about 6,600 |
| 100K | $59 | 100,000 | about 33,000 |

Two scans a day of one sport is about 180 credits a month, inside the free plan. Five sports, four scans a day, is about 1,800 credits and needs the $30 plan.

## Spend rule

API cost is paid from settled profit, not by raising the stake. A subscription is allowed only after the bet tracker shows realized profit greater than the next bill. Until then the desk stays on the free Odds quota and a Gemini budget with a hard cap in Google. The $30 FanDuel balance is the betting bankroll. It is not the API budget. Quarter Kelly on a 2.6% edge and a $30 bankroll is about a $0.25 stake and under one cent of expected value, so a $30 data plan is larger than the test bankroll and is out.

## Cache

Default TTL: 120 seconds, configurable in `src/config/desk.ts`.

Cache key: sport + markets + bookmakers + region + odds format.

The desk fetches on Scan only. There is no `useEffect` interval. The browser keeps the last board in this tab, so a page reload can show those prices again without a new request. That copy is the scan the user already paid for. It is not a new quote. The on-screen time says when it was scanned.

Vercel serverless isolates do not share a module-level `Map`. An in-memory TTL stops repeat clicks on a warm instance and is not a global credit lock. Implementation plan:

1. In-process TTL plus in-flight request coalescing (concurrent scans share one upstream call).
2. Next.js fetch cache / `revalidate` scoped to the upstream URL, used in a way that still returns fresh quota headers when we do hit origin.
3. If credits still move too fast after deploy, add a shared store (Vercel Runtime Cache or KV) without changing the normalizer.

Document the measured behavior in this file after the first live deploy. Do not claim a global cache we have not proven.

## Freshness

Keep each book's `last_update`. Show it. If the retail timestamp and the Pinnacle timestamp differ by more than 120 seconds, flag `staleRisk` on the row. Still show the row. The flag exists so a stale soft line is not read as a clean edge.

MVP is pregame odds from this endpoint. Live betting is out of scope until we deliberately add it.

## Consensus detail

Average implied probabilities, then divide by their sum. Averaging American odds is forbidden. Averaging one side across books that do not also post the other side at that point is forbidden, because the vig would be invisible.

## Mock fixtures

Mock mode includes at least one NFL game and one NBA game, Pinnacle two-way prices, and differing FanDuel and DraftKings prices at the same points, including one positive-EV side and one negative-EV side. Deep links in fixtures are obvious example URLs, clearly fake, so we never confuse them with a live betslip.

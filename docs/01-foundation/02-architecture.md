# Architecture

Target stack, once build is approved: Next.js 15 App Router, React 19, TypeScript strict, Tailwind CSS, Lucide, Vercel.

## Runtime shape

```
Browser desk
  |  manual Scan (no polling loop)
  |  bankroll + Kelly fraction stay on the client
  v
GET /api/odds          POST /api/analyze
  |                      |
  | Zod-parsed feed      | Zod-parsed structured brief
  v                      v
Normalizer             Model desk (3 adapters, live catalog)
  |
  v
Verifier (pure recompute)
  |
  v
Opportunity[] with mathAudit
```

Shared module `src/lib/quant.ts` is imported by the server and the client. The client recomputes Kelly when bankroll or the fraction changes. It uses `trueProb` and decimal odds on the opportunity. It does not parse American strings back into the formula.

## Planned modules

| Path | Responsibility |
| --- | --- |
| `src/lib/quant.ts` | Conversions, de-vig, EV, Kelly, one-stake simulation, the sum of saved stakes, and the Sunday cash slip. Pure. |
| `src/lib/quant.verify.ts` | Recompute and compare. Pure. |
| `src/lib/odds/types.ts` | Zod schemas for the feed and for opportunities |
| `src/lib/odds/normalize.ts` | Pair lines, choose benchmark, attach audit |
| `src/lib/odds/mock.ts` | Realistic fixtures for demo mode |
| `src/lib/odds/cache.ts` | TTL cache for upstream responses |
| `src/config/desk.ts` | Sports, books, markets, TTL, EV highlight threshold, math version |
| `src/config/models.ts` | Auto and Max preference order. Not a permit to call a stale id |
| `src/lib/models/` | Provider adapters: `list` + `analyze`. Gemini uses `@google/genai` |
| `src/app/api/models/route.ts` | Live catalog for the picker |
| `src/app/api/odds/route.ts` | Fetch, cache, normalize, verify, quota headers |
| `src/app/api/analyze/route.ts` | Three structured briefs, agreement, contradiction flags |
| `src/app/page.tsx` | Desk, three-column drawer, slate compare, tracker |

The brief's file list still holds. These extra modules exist so route handlers stay thin and the math stays testable.

## Opportunity identity

An opportunity is one side of one point at one book:

`(eventId, marketKey, pointOrNull, outcomeName, bookmakerKey)`

Line shopping compares only rows with the same event, market, point, and outcome. A Chiefs -3 price is not shopped against a Chiefs -3.5 price.

## Benchmark selection

1. If Pinnacle has both sides of that exact point, de-vig Pinnacle. Source label: `pinnacle`.
2. Otherwise, take every book that has both sides at that exact point, average implied probability per side, then de-vig that average. Source label: `consensus`. Live scans use `regions=us`, so Pinnacle is usually absent and the label is `consensus`.
3. If fewer than two complete books exist and Pinnacle is incomplete, drop the market. A one-sided price has no vig to remove.

## Deep links

Cascade: `outcome.link`, then `market.link`, then the bookmaker event link, then `null`. A null link disables Approve & Open Betslip and says the book did not provide a betslip URL.

## Analyst boundary

Specified in `07-model-desk.md`. A TypeScript orchestrator seats one to three models from the live catalog. `POST /api/analyze` receives the already-verified opportunity and those resolved ids. An id missing from the latest catalog returns unavailable for that seat. Gemini goes through `@google/genai`. The deprecated `@google/generative-ai` package is unused.

Shared brief shape:

- `chance` — one sentence repeating `trueProb` as a percent
- `price` — one sentence on whether the book pays more or less than fair
- `verdict` — `approve` | `pass` | `wait`
- `recommendation` — one sentence: look, skip, or wait

Agreement is computed in TypeScript from those verdicts.

## Secrets

`ODDS_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, and `ANTHROPIC_API_KEY` are server environment variables. They are never prefixed for the browser. `.env.example` lists the names only.

## Demo mode

`?mock=true`, or a missing `ODDS_API_KEY`, serves fixtures. The desk badge reads Demo or Live. Demo responses do not call The Odds API.

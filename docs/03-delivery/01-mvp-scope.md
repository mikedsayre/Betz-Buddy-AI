# MVP scope

Status: **MVP implemented. Active use paused 2026-10-19.** Math locks and the frontier-adaptive model desk are in the app. The builder described the working desk as about two days of work and stepped back from betting with it. `npm test` and `npm run build` are the checks. GitHub publication was discussed and not done.

Updated: 2026-10-19

## Now, after acceptance

- Next.js 15 app with the stack in the brief
- `quant.ts` and tests for the worked examples, then the rest of the invariants
- Odds route with live and mock modes, quota headers, TTL, pairing, consensus fallback, verifier
- Model catalog route and provider adapters (Google via `@google/genai`, OpenAI, Anthropic), each optional at runtime
- Code orchestrator: adaptive seat count from 1 to 3, frontier tier first, selection reason shown
- Analyze route: one brief per seated model, agreement when more than one returns, contradiction flags, per-seat provider errors
- Compare slate: seated models may only return ids the desk already listed
- Dark deal-desk UI: sport, market, +EV filter, bankroll, Kelly fraction, scan button, credit badge, demo/live badge
- First-run guide and field help: plain sentence, what to do, and the calculation, from `src/components/help-copy.ts`
- Table columns from the brief, EV highlight above 1.5%
- AI brief drawer with Adaptive / seat count / Custom, and one column per seat that actually ran
- Approve opens a deep link and appends a `localStorage` tracker row
- `.env.example` with `ODDS_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, and `ANTHROPIC_API_KEY`
- `npm run build` clean

## Next, not blocking the first screen

Paused with the product. If someone picks the app up, teach with numbers already on the slip before adding feeds:

- Replay the current AI Bets slip many times from the desk win chances, so one game and every game show how often the cash finishes ahead
- A break-even line on the price: the chance that price needs, beside the desk chance
- Shared Vercel cache if in-memory TTL is not enough
- Closing line snapshot so the tracker can later grade CLV
- More sports from config once the five current keys are solid
- Regression incidents folder process, first time a number is wrong

## Not in MVP

- Accounts, payments, or a database of users
- Automatic bet placement
- Live in-play betting
- Parlays, teasers, player props
- Three-way markets
- Injury, lineup, or news ingestion
- Models inventing prices, probabilities, or bets outside the desk list
- Profit guarantees or bankroll sync from sportsbooks

## Done means

- Build passes
- Quant tests pass, including both worked examples
- Mock mode demonstrates one +EV row and one -EV row without an API key
- A row's displayed EV matches a hand calculation from its audit fields
- The brief panel cannot overwrite those numbers
- Approve with a null link does nothing except explain the missing link

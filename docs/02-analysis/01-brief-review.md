# Brief review — 2026-10-15

The brief is accepted as the product definition. Implementation waits on the locks in this file.

## What is already right

- Deterministic TypeScript for de-vig, EV, and Kelly, with the model kept out of the arithmetic.
- Pinnacle as the sharp reference and US books as the places a user can actually bet.
- Manual scan plus a cache TTL, which is the correct way to protect Odds API credits.
- Human approval and a deep link, so this product never becomes an automated betting bot.
- Quarter Kelly as the default. That is the responsible stake preset.
- Mock mode so the desk can be built and tested without spending credits.
- Multiplicative de-vig for two-way markets. The formula in the brief is the right one.
- EV as `((trueProb * decimalOdds) - 1) * 100`, and Kelly as `f = (bp - q) / b` with `b = decimal - 1`. Both are the standard identities. They belong in one module with the worked examples in `03-math-invariants.md`.

## Locks before coding

These amend the brief. They are proposed in decision log D-003, D-004, and D-005.

1. **Canonical number.** Store and calculate from fair probability. Show rounded American fair odds beside it. Never round-trip American odds back into EV or Kelly.
2. **Same-point pairing.** Spreads pair only with the opposite sign at the same absolute point. Totals pair over/under at the same total. The line-shop strip compares that exact point only.
3. **Consensus still removes vig.** If Pinnacle is missing, average implied probabilities across books that post both sides, then normalize. Drop the market when a two-sided price does not exist.
4. **Second deterministic pass.** A verifier recomputes every shown row. Failures are suppressed, not patched by the model or the UI.
5. **Gemini cites the payload.** Structured verdict: `approve`, `pass`, or `wait`. The UI's numbers come from the opportunity. The brief must say when no injury or news feed is connected, and it must not invent those facts. A scanner flags numeric disagreement.
6. **Honest cache.** In-memory TTL plus request coalescing first. Shared cross-instance cache if production credit use requires it. No polling.
7. **Null betslips and stale prices.** Missing links disable execution. `last_update` gaps over 120 seconds raise `staleRisk`.
8. **Shared Kelly function on the client.** Bankroll and fraction changes call `quant.ts`. Highlight threshold stays 1.5% EV as specified.
9. **Full Kelly stays visible and explicit.** The control copy states that `1.0x` does not shrink errors in the fair probability.
10. **Prematch MVP.** Live odds, parlays, accounts, and closing-line grading wait.

## Spec gaps that would become user-facing bugs

- Serverless memory is not a shared cache. A naive `Map` in a route will still multiply credits across Vercel isolates.
- Deep links are often absent even with `includeLinks=true`. The action has to have a disabled state.
- The analyst prompt asks for injuries and pace. Nothing in the request provides them. An unconstrained model will fill that gap with fluent fiction. That is the main trust failure available in v1.
- Fair American odds rounded to integers will not reproduce the EV if someone uses them as inputs. The column can still exist. The probability has to be on the row.
- `deVigTwoWayMarket` in the brief returns fair American odds from inside the math function. That is fine as a display helper. Persisted inputs for EV remain the fair probabilities.
- Bookmaker key `caesars` must be confirmed against the live bookmaker catalog before we freeze config.
- `gemini-2.5-pro` must be confirmed against the current `@google/genai` model list at build time. If the id is stale, we record the replacement in the decision log instead of silently swapping packages.

## Strategies considered

| Strategy | Use |
| --- | --- |
| Docs + `AGENTS.md` + short Cursor rules | Planning memory and session enforcement. Chosen. |
| Math only in markdown | Rejected as authority. Docs drift. Tests do not. |
| Second LLM to audit EV | Rejected for v1. A pure recomputation is cheaper and exact. |
| Multi-agent betting committee | Rejected. It adds disagreement without a ground-truth number. |
| Auto-bet via deep link | Rejected. Human opens the slip. |
| Polling odds | Rejected. Burns credits and fights the brief. |
| Average American odds for consensus | Rejected. Distorts favorites and dogs. |
| Hide Full Kelly | Rejected. The brief includes it. The UI explains it. |
| Treat Pinnacle as just another bet button | Rejected. It is the benchmark. |

## Addendum — 2026-10-15, model layer

The user accepted the math locks and asked for Cursor-style model fluidity plus a three-model view. That design is `docs/01-foundation/07-model-desk.md`. The single default `gemini-2.5-pro` in the founding brief is retired as a pin. Google’s model page dated 2026-10-13 tells new projects to use later ids. Agreement among three briefs is a new surface. It does not replace the verifier.

## Success condition for the MVP

A user can scan one sport, see which number is the price, which number is the fair probability, what the estimated edge and stake are, why the edge might be false, and either open the book or pass. A reviewer can recompute any row from `mathAudit` and match the screen.

# Agent governance

Accuracy is a pipeline of independent checks. A single model, including the coding agent in Cursor, does not get to be the last word on a number.

## Checks

| Check | Who | Failure behavior |
| --- | --- | --- |
| Formula purity | `quant.ts` with no I/O and no model imports | Build review rejects math inside routes or components |
| Known-value tests | Unit tests from `03-math-invariants.md` | Merge stops |
| Schema | Zod on The Odds API payload and on each model brief | Bad payload becomes an error state, not a guessed row |
| Pairing | Normalizer rules in the architecture doc | Unpaired or mixed-point markets are dropped |
| Second compute | `quant.verify.ts` | Row dropped, counted in the response as suppressed |
| Narrative boundary | Three structured briefs from the live catalog | UI renders desk numbers from the payload |
| Contradiction scan | Deterministic scan of the brief for percents and American prices | Banner: brief disagrees with desk math; desk math stands |
| Human | Approve opens a new tab only | No auto-bet, no background placement |
| Process | This doc tree + `AGENTS.md` | Math edits update tests, invariants, and the decision log together |

Three narrators are the desk default. They are not math voters. Agreement is a count of matching verdicts. Adding or removing a provider does not relax the verifier.

## Cursor agent rules

- Read `03-math-invariants.md` before editing calculations.
- Implement a formula once, in `quant.ts`.
- Keep route handlers as orchestration.
- When a doc and the code disagree, make them agree in the same change.
- Record significant product or math decisions in `02-decision-log.md`.
- Do not invent sportsbook behavior, deep links, or injury news to fill a gap. Label the gap.
- API keys stay on the server. They are read from `.env.local`, which is gitignored. Never commit a key, paste one into chat, or put one in a `NEXT_PUBLIC_` variable.

## Security

- Server routes only for The Odds API and the model providers. A leaked Gemini key is a billing incident: revoke it in Google, issue a new key restricted to the Generative Language API, and set a low daily quota plus a billing alert before the new key is used.
- This app is not a git repo yet. The first commit must not include `.env`, `.env.local`, or any key. Next.js does not let `.env.local` override a key already set in the Windows user environment, so a burned key left there will keep being sent.
- Analyze and slate compare stay on buttons so a UI loop cannot spend model quota.
- A model call sends an id that the live catalog returned. A preference string in docs is not sufficient.
- Odds route cache is the credit backstop. See `05-data-and-credits.md`.
- Treat book names and links as data. Render links as URLs we received, open with `noopener`.
- The tracker in `localStorage` holds bet intentions the user already saw. Do not add account passwords, document IDs, or raw API keys to it.
- Prompt contents for Gemini are the system instruction plus our JSON. Upstream text is data, not new instructions.

## Incident memory

If a displayed number is wrong, add `docs/05-incidents/YYYY-MM-DD-short-name.md` with the input, the shown output, the correct output, and the invariant that failed. Add a regression test.

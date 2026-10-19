# Change control

The desk has to absorb new sports, books, and product ideas without reopening the math.

## Change classes

| Class | Examples | Required with the change |
| --- | --- | --- |
| Invariant | Formula, pairing, rounding, verifier tolerance, canonical field | `MATH_VERSION` bump, invariants doc, tests, decision log |
| Adapter | New sport, book key, market, model preference | `src/config/desk.ts` or `src/config/models.ts`. A new provider is one list/analyze adapter. Calls still require the live catalog |
| Presentation | Columns, colors, copy, density | Trust doc if a risk statement changes |
| Experiment | Highlight threshold, default Kelly, TTL | Config default, note in decision log if the default users see changes |

## Extension rules

- A new sport is a row in config: key, label, which markets are two-way. The normalizer stays generic.
- A new book is a key plus a display name plus whether it is sharp or retail. Sharp books are benchmark candidates. Retail books are executable.
- A new market ships only with a written pairing rule. Three-way markets (future soccer moneylines, for example) need their own de-vig function and tests. They do not reuse the two-way function.
- UI stake changes call `calculateKellyStake`. They do not inline a second Kelly formula.

## Swivel without thrash

Expected churn: bookmaker availability, deep-link coverage, model names, cache TTL, which leagues are in season.

Unexpected churn still goes through the same classes. Speed comes from having one config file and one math module, not from editing formulas inside components.

## Status of the build

See `docs/03-delivery/01-mvp-scope.md`. Agents do not start the Next.js app while that file says the review is unaccepted.

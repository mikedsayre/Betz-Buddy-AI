# Operating system

This file tells every agent how Betz Buddy remembers decisions and how to change the product without letting the numbers drift.

## Memory model

Markdown is the planning memory. It is not the math authority.

| Layer | Location | Job | Authority |
| --- | --- | --- | --- |
| Entry | `AGENTS.md` | One-screen laws and where to read next | Always loaded by agents |
| Enforcement | `.cursor/rules/` | Short rules injected into Cursor sessions | Always applied |
| Charter | `docs/00-charter/` | Original intent, how we work, decision log | Intent |
| Foundation | `docs/01-foundation/` | Trust, architecture, math, agents, data, change control | Design law until a decision log entry amends it |
| Analysis | `docs/02-analysis/` | Reviews of the brief and later audits | Evidence |
| Delivery | `docs/03-delivery/` | Current scope, status, what is deliberately deferred | What we are building now |
| Executable truth | `src/lib/quant.ts` + tests, once the app exists | Formulas that actually run | Wins over every document if they disagree |

If a doc and the tests disagree, fix the doc or fix the code in the same change. Do not leave a silent split.

Agent-private stores (Cursor user stores, chat transcripts) are scratch space. Anything that must survive the next session is written into this tree.

## Reading order before significant work

1. `AGENTS.md`
2. `docs/03-delivery/01-mvp-scope.md` for what is in play
3. The foundation file that matches the change (math, data, trust, architecture)
4. The latest entries in `docs/00-charter/02-decision-log.md`

## When to write memory

Write or update a doc when any of these happen:

- A formula, pairing rule, rounding rule, or verification gate changes
- A new sport, book, market, or model is added or removed
- An assumption about The Odds API, Gemini, or Vercel caching is proven true or false
- A user-facing risk statement changes
- Scope moves between "now", "next", and "not in MVP"

Append a decision log row for architecture and math changes. Edit the relevant foundation file so it stays current. Do not leave the decision only in chat.

## Hierarchy

```
docs/
  README.md
  00-charter/        why we exist and how agents operate
  01-foundation/     laws the build obeys
  02-analysis/       reviews and findings
  03-delivery/       current scope and status
  04-adapters/       created when a book, sport, or model needs its own notes
  05-incidents/      created when a number is wrong in the product
```

`04-adapters/` and `05-incidents/` are created on first use. Empty folders are not kept around for show.

## Fluidity

Stable core: fair probability as canonical number, deterministic math, human execution, verification before display.

Swivel points (expected to change often): sports list, bookmaker keys, market set, cache TTL, Gemini model id, copy, visual density, which books appear in the line shop.

New behavior enters through config and adapters. It does not fork the math.

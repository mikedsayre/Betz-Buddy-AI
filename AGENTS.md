# Betz Buddy AI — agent entry

Human-in-the-loop sports betting deal desk. Users see a price, a no-vig fair probability, an estimated edge, a fractional Kelly stake, and the risks. They place bets at sportsbooks themselves.

## Laws

- Math lives in `src/lib/quant.ts` (once the app exists). Language models do not calculate EV, vig, or stakes.
- Fair probability is canonical. Rounded American odds are display-only.
- A second pure function verifies every row before the desk shows it.
- Models narrate a verified payload. They do not invent injuries or news. The UI never replaces desk numbers with model numbers. Call only model ids the live catalog returned. See `docs/01-foundation/07-model-desk.md`.
- Do not claim an AI betting advantage. One game result does not grade the desk. Do not add team history, player history, or a luck factor as a second probability. See decision D-027.
- Odds refresh only when the user scans. Protect The Odds API credits.
- API keys stay on the server.
- Significant decisions are appended to `docs/00-charter/02-decision-log.md`.

## Before you change the product

Read `docs/README.md`, then the foundation file for the area you are touching, then `docs/03-delivery/01-mvp-scope.md`.

Build status is in `docs/03-delivery/01-mvp-scope.md`. The math locks and the frontier-adaptive model desk are accepted. Active betting use paused on 2026-10-19. See D-027.

## Memory

Planning memory is `docs/`. Executable authority is the quant module and its tests. If they disagree, reconcile them in the same change.

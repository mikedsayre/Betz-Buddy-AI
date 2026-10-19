# Betz Buddy AI

A sports-price desk. The screen is basic. The odds engine is the product.

The app shows a book price, a no-vig fair chance, an estimated edge, and a fractional Kelly stake. You place the bet at the sportsbook. A language model may explain a number the code already checked. It does not pick winners, and it is not a betting advantage.

## Run the demo

```bash
npm install
npm test
npm run dev
```

Open the app and leave **Live odds** off. The practice slate needs no API key.

## Odds engine

All price math is in `src/lib/quant.ts`, with tests in `src/lib/quant.test.ts`.

- American odds convert to decimal on one path.
- Fair probability is the number that matters. Rounded American odds are for display.
- Two-way markets are de-vigged, then checked by a second pure function. A row that fails the check is dropped.
- EV and Kelly use that fair probability and the decimal price. They are not recomputed from a rounded American price.
- Planning notes live in `docs/`. If a note and the tests disagree, the tests win.

## Keys

Copy `.env.example` to `.env.local` only on your machine. That file is gitignored. Do not commit it.

| Name | Role |
| --- | --- |
| `ODDS_API_KEY` | Live scan of The Odds API. Each scan is a button press. |
| `GEMINI_API_KEY` | Optional. Explains a verified row. |
| `OPENAI_API_KEY` | Optional. Same role. |
| `ANTHROPIC_API_KEY` | Optional. Same role. |

Without `ODDS_API_KEY`, the desk stays on the practice slate.

## What this is not

This is a learning desk for price, chance, and risk. It does not place bets, promise profit, or claim that a model beats the market. One game result is luck around the chance.

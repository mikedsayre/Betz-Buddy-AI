# Model desk

Checked against provider docs on 2026-10-15. Named models below are a frontier seed. The live catalog plus the selection policy decide what actually runs. There is no fixed roster and no fixed seat count.

## Objective

The desk exists to grow a bankroll by taking favorable prices and sizing them so variance does not wipe the growth.

What raises the chance of long-run growth, in every sport and market we turn on:

1. A price whose no-vig expected value is positive against the sharp benchmark.
2. The best price at that exact point across the books we can bet.
3. A fractional Kelly stake from the bankroll the user typed. Quarter Kelly is the default because full Kelly assumes the fair probability is perfect.
4. A pass when the benchmark is the weaker one (consensus, or a stale timestamp) or when the readings of that price disagree.

Models help the user see which of those prices are clean and which should wait. They do not create a higher win probability than the price supports. A stronger model is a better reader of the board. It is not a second odds engine. A finished game, including Arizona over the Rams on Oct 18, 2026, does not promote the model into an edge. There is no luck input to add.

## Orchestrator

The orchestrator is TypeScript, not a language model. It picks seats, logs why, and the UI shows that reason. A model-chosen router would hide the decision and bring back the stale-id failure mode.

On each AI Brief or slate compare:

1. Load the live catalog for every provider whose key is set.
2. Keep models that can return structured text. Drop image, video, audio, embed, and live-voice ids.
3. Keep the frontier tier. If none are up, step down to the balanced tier and label the panel `frontier unavailable`.
4. Seat them with this order: a provider not yet seated, then the seed rank, then recent success, then lower latency.
5. Seat count follows the control. `Adaptive` uses every healthy frontier seat up to 3. The user can force 1, 2, or 3. One configured key means one seat, and the panel says so.
6. Send only ids from that catalog response.

Each column shows `resolvedId`, tier, the selection reason, latency, and the provider error if the call fails. A failed seat is not a vote.

Custom mode pins ids the user chose from the same live list. A pin that has left the catalog stays on screen as unavailable. Other seats still run. Custom does not silently substitute.

## Frontier seed

These are the top text models each lab listed for new work on 2026-10-15. They float to the top of the picker. They are skipped the moment the catalog omits them.

| Provider | Frontier order | SDK |
| --- | --- | --- |
| Google | `gemini-4-argon`, then `gemini-3.8-flash` | `@google/genai` |
| OpenAI | `gpt-6-astra`, then `gpt-6.1-sol` | Official OpenAI SDK |
| Anthropic | `claude-fable-5-1`, then `claude-opus-5-5` | Official Anthropic SDK |

Balanced fallback, used only when that provider has no frontier id in the live list: `gemini-3.8-flash`, `gpt-6.1-sol`, `claude-sonnet-5-5`.

Sources: [Gemini models](https://ai.google.dev/gemini-api/docs/models) (page stamp 2026-10-13), [OpenAI models](https://developers.openai.com/api/docs/models), [Anthropic models](https://platform.claude.com/docs/en/models/overview).

`gemini-2.5-pro` is not in either list. Google’s guide tells new projects not to start there.

First adapters are these three labs because they are the current upper echelon we can call with a server key. A fourth lab is a new `list` + `analyze` adapter. The policy does not change.

## Live catalog

`GET /api/models` asks each configured provider what it will serve.

- Google: `ai.models.list()`, keep `generateContent`, drop non-text ids
- OpenAI: `GET /v1/models`
- Anthropic: `GET /v1/models`

The picker groups that list by provider. Frontier seeds sit at the top of each group. An id absent from the list cannot be sent.

## Agreement

When two or more briefs return:

- Agreement = (count of the most common verdict) / (briefs that returned)
- The label is the count: `3 of 3 say Wait`, `2 of 2 say Approve`, `split`
- One seat hides the meter and says `single read`

The meter is how alike the readings are. The chance estimate on the row remains the no-vig probability. A model’s own confidence is not requested.

## Brief voice

The system prompt tells the model to write for someone new to betting. The drawer prints the desk win chance first. The model then returns three short sentences: how often the side wins, whether the book pays more or less than fair, and whether to look, skip, or wait. Approve means the edge is positive and the price is fresh. Pass means the edge is zero or negative. Wait means the price is stale. The model does not supply a second probability.

## Slate assist

**Compare slate** sends the filtered rows, capped at the top 15 by EV. Each seated model may name up to three ids from that list. Zod drops any other id. The board groups lines by how many seated models named them.

With one seat, the group is that model’s ranking of the desk’s lines. With several, overlap is the stronger candidate and a solo name is the dissent. Models rank our lines. They do not create lines.

## How “best” stays current

After launch, each model accumulates a desk record: schema failures, numeric contradictions against the payload, and latency. A frontier model that keeps contradicting the math drops below its peers in the seed order via `src/config/models.ts` and a decision-log entry. The catalog remains the permit. The record only changes rank among models the catalog already allows.

## Keys and spend

`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`. Server only, in `.env.local`. The desk runs on whichever keys exist. With only Gemini configured, the orchestrator seats one Gemini model. The TypeScript policy still chooses the seat.

AI Brief and Compare slate are buttons. Nothing in `useEffect` calls a model. Parallel calls abort when the drawer closes. Demo mode, no model keys, or a catalog call that fails (including an invalid key) serves scripted briefs. The provider's error is shown on the panel, and the columns are labeled as a demo read.

Gemini prices checked 2026-10-16 on [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing). A short brief is on the order of a few thousand tokens. `gemini-4-argon` is paid only: about $2 per million input tokens and $10 per million output tokens through 2026-11-30, then $4 and $20. Thinking tokens are billed as output, so an uncapped Argon brief can move from about one cent to several cents. `gemini-3.8-flash` is about $0.75 / $3.75 per million through 2026-12-31 and has a free tier. The local test with a $30 book balance uses Flash, or Argon only inside a Google spend cap of a few dollars. Model spend follows the same settled-profit rule as the odds quota in `05-data-and-credits.md`.

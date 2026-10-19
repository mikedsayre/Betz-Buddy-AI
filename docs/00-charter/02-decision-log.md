# Decision log

Append-only. Newest entries at the bottom. Each entry states the decision, why, and which docs it updates. Do not rewrite history; supersede it with a new entry.

## D-001 — Hybrid memory, docs as planning authority

- Date: 2026-10-15
- Status: accepted
- Decision: Planning memory is the `docs/` tree plus `AGENTS.md` and short `.cursor/rules/`. Executable math authority will be `src/lib/quant.ts` and its tests once the app exists.
- Why: A markdown tree is readable and diffable, and Cursor will not reliably load a deep tree unless a short entry rule points at it. Chat memory and private agent stores drift and are invisible to the next session.

## D-002 — No application code until the brief review is accepted

- Date: 2026-10-15
- Status: accepted
- Decision: Scaffold and features wait until the locks in `docs/02-analysis/01-brief-review.md` are accepted or explicitly revised.
- Why: The brief is the right product. Generating it verbatim would ship false plus-EV from bad line pairing and invented injury commentary from a model with no news feed.

## D-003 — Fair probability is canonical

- Date: 2026-10-15
- Status: proposed, pending build acceptance
- Decision: `trueProb` is the only input to EV and Kelly. American fair odds are a rounded display. They are never converted back into a probability for a calculation.
- Why: Rounding American odds to an integer changes the implied probability enough to move EV across the 0% and 1.5% display thresholds.

## D-004 — Gemini is narrative-only

- Date: 2026-10-15
- Status: proposed, pending build acceptance
- Decision: The desk renders EV, fair odds, and stake from the verified opportunity payload. Gemini returns a structured brief. A contradiction check flags any number in that brief that disagrees with the payload. The model may not assert injuries, pace, or news that are absent from the payload.
- Why: One language model cannot be the accuracy check for money math, and the brief asks for injury factors we do not ingest.

## D-005 — Two deterministic passes before a row is shown

- Date: 2026-10-15
- Status: proposed, pending build acceptance
- Decision: The normalizer computes an opportunity. A separate verifier recomputes de-vig, EV, and Kelly from the stored inputs. Mismatch drops the row and records an incident note rather than showing it.
- Why: The check the user asked for has to be independent of the first calculation and independent of the language model.

## D-006 — Math locks accepted

- Date: 2026-10-15
- Status: accepted
- Decision: D-003 and D-005 stand. Fair probability is canonical. A second pure function verifies every row.
- Why: User accepted the foundation review and moved the open questions onto the model layer.

## D-007 — Live model catalog and a three-column desk

- Date: 2026-10-15
- Status: proposed, pending acceptance of `docs/01-foundation/07-model-desk.md`
- Decision: Supersedes the single-model part of D-004. Narrative stays non-authoritative for math. The analyst surface is three slots, Cursor-style: Auto, Max, and Custom. Auto preferences, confirmed against provider docs on 2026-10-15, are `gemini-3.8-flash`, `gpt-6.1-sol`, and `claude-sonnet-5-5`. The call is allowed only if that id is in the provider’s live list. Agreement is the share of returned briefs that share a verdict. `gemini-2.5-pro` is not the default.
- Why: A pinned id from an older brief is what stalls integration. Google’s model guide dated 2026-10-13 already tells new projects not to start on 2.5. Three labs give the user a visible spread. The score measures agreement among readings. The win estimate stays the no-vig probability.

## D-008 — Frontier-adaptive seats, code orchestrator

- Date: 2026-10-15
- Status: accepted
- Decision: Supersedes the fixed Auto/Max trio in D-007. The live-catalog rule and the narrative-only rule stay. A TypeScript orchestrator seats 1 to 3 frontier models from whatever providers are actually up, preferring distinct labs. The user can force the seat count or pin models. The growth path is positive no-vig EV, best price at that point, and fractional Kelly. Models rank and critique those prices.
- Why: The user wants the upper echelon, room to start with one model or several, and no frozen blueprint. A language model must not be the thing that chooses which model runs.

## D-009 — Build started

- Date: 2026-10-15
- Status: accepted
- Decision: User accepted the revised model desk. Implementation of the MVP in `docs/03-delivery/01-mvp-scope.md` starts from this entry.
- Why: The seating rule and the math locks are the spec.

## D-010 — Failed catalog still returns a labeled demo read

- Date: 2026-10-15
- Status: accepted
- Decision: If every configured provider fails to list models, the brief uses the demo seats and prints the provider error. It does not pretend those seats were live.
- Why: An invalid key in the environment otherwise leaves the drawer with no reading and hides the actual provider message.

## D-011 — Gemini keys stay off git and off chat

- Date: 2026-10-15
- Status: accepted
- Decision: Keys live only in `.env.local` or the host's secret store. A key that may have been exposed is revoked before a replacement is used. The replacement gets an API restriction and a spend cap in Google before local or deployed use.
- Why: A previous Gemini key was billed from fraudulent use after it was likely exposed through GitHub. This project has no git history yet, which is the moment to keep the new key out of the repo.

## D-012 — API spend stays inside settled profit

- Date: 2026-10-16
- Status: accepted
- Decision: Odds and model spend is capped by realized betting profit. Stakes are never increased to pay for API calls. The local test uses The Odds API free quota (500 credits, about 83 scans at 6 credits each) and Gemini Flash or a few-dollar Argon cap. The $30 paid Odds plan waits until settled profit covers it.
- Why: The test bankroll is about $30 at FanDuel. A data subscription of that size would consume the bankroll the edge is supposed to grow.

## D-013 — One guide, one help panel per field

- Date: 2026-10-16
- Status: accepted
- Decision: The desk teaches itself with a four-step guide and a help control on each field. Every panel uses the same three parts: a plain sentence, what to do, and the calculation. Copy lives in `src/components/help-copy.ts`. Models do not define the terms.
- Why: A novice needs the path and the meaning of each number. An expert needs the formula beside the same number. Two separate modes would drift.

## D-014 — Live scans use the US region only

- Date: 2026-10-16
- Status: accepted
- Decision: Live odds requests use `regions=us`. Retail books stay FanDuel, DraftKings, BetMGM, and Caesars. Pinnacle remains the benchmark when a pair exists. A US response usually has no Pinnacle pair, so the fair price is the de-vigged consensus and the row says `consensus`.
- Why: The user bets at US books. A second region spends credits on prices they cannot place.

## D-015 — A typed stake shows the cash win and the cash loss

- Date: 2026-10-18
- Status: accepted
- Decision: Each row can show a dollar amount the user types. The cell shows profit if that price wins, the stake lost if it misses, and the expected dollars from the row's fair probability and decimal price. The Kelly stake stays a separate column.
- Why: A payout in dollars is how a user sees that a longer price pays more and hits less often. The typed amount does not place a bet.

## D-016 — Sort and filter the verified rows

- Date: 2026-10-18
- Status: accepted
- Decision: The board starts sorted by edge, highest first. The user can sort by kickoff, market, book price, win chance, Kelly stake, or expected dollars, and can filter by team, retail book, minimum win chance, minimum edge, and stale prices. Sorting and filtering do not recompute a row.
- Why: Highest edge and highest win chance are different lists. Seeing both on the same scan is how the price difference becomes visible.

## D-017 — Market, price side, and benchmark sit with the other filters

- Date: 2026-10-18
- Status: accepted
- Decision: The market control lives in the filter row with team, book, win chance, edge, and stale. Two more filters use columns that were only sortable: favorite or underdog from the book price, and Pinnacle or consensus from the fair-price source.
- Why: Moneyline, spread, and total were already priced on the scan. Putting that choice with the other filters is how a person opens one kind of bet. Favorite versus underdog is the other split the board is for.

## D-018 — The brief speaks in plain sentences and repeats the desk chance

- Date: 2026-10-18
- Status: accepted
- Decision: The analyst prompt asks for three short sentences: the desk win chance, whether the book pays more or less than fair, and a look, skip, or wait recommendation. The drawer prints the desk probability before the model text. The model does not calculate a new probability, and it still may not invent injuries or news.
- Why: The previous prompt asked for a quantitative discrepancy note. That reading was accurate and hard to use. The chance the user wants is already on the row.

## D-019 — Sunday kickoffs, and sort the typed bet by win or loss

- Date: 2026-10-18
- Status: accepted
- Decision: Kickoff can show every game, games that have not started, or this Sunday in the local timezone among games that have not started. The typed-bet column shows the profit and the desk win chance together, and the stake lost and the miss chance together. Win and Lose are separate sorts. The board still opens on highest edge.
- Why: A positive edge on a long price still loses the stake most of the time. Sunday is the slate the user wants in front of them, and the cash win and the cash loss are the two results of the amount they typed.

## D-020 — Several teams can be kept on the board at once

- Date: 2026-10-18
- Status: accepted
- Decision: The team control adds one or more teams from the current scan. A row stays when a picked team is in the matchup, so both sides of that game remain. Clearing the picks restores the full board.
- Why: Comparing prices means seeing the two sides, or two games, on one list. A single text search could not hold that comparison.

## D-021 — A book filter shows that book's price

- Date: 2026-10-18
- Status: accepted
- Decision: Choosing FanDuel, DraftKings, BetMGM, or Caesars keeps every row that book posted and displays that book's price. A row stays hidden only when that book did not post the market.
- Why: The filter had kept a row only when that book was the best price. A FanDuel spread or moneyline disappeared when another book was closer to fair, which hid the price the user can actually bet.

## D-022 — Saved rows live in Bets I like

- Date: 2026-10-18
- Status: accepted
- Decision: Save on a row stores that verified price in this browser. Bets I like lists those rows with the book, the chance, the typed win and loss, and a link to open the betslip. The approved-bet tracker remains the list of slips that were opened.
- Why: The list to read while placing bets is chosen before the sportsbook opens. Opening a slip and liking a price are different acts.

## D-023 — Bets I like sums stake, best profit, and cash at risk

- Date: 2026-10-18
- Status: accepted
- Decision: The top of Bets I like shows cash put down, profit if every saved bet wins, cash returned with that profit, cash at risk if every one loses, and the sum of each bet's expected dollars. Two bars share one scale so best profit and cash at risk can be compared. A game with more than one saved bet is named, because those bets can all lose on one kickoff. The list does not multiply win chances into a group hit rate.
- Why: Adding expectation is valid when bets share a game. A combined chance is not, because the desk has no joint price for a moneyline, a spread, and a total on the same kickoff.

## D-024 — Same-game likes stay separate tickets

- Date: 2026-10-18
- Status: accepted
- Decision: Bets I like tells the user to place same-game, same-book rows one at a time. When a saved moneyline and spread are the same team at the same book, the list says that slip rejects the pair, because covering the spread already wins the moneyline. The profit total stays the sum of the separate tickets. The desk does not build or price a parlay or a same-game parlay.
- Why: FanDuel rejected a Ravens moneyline, Ravens spread, and total entered as one ticket. A combined price is the sportsbook's number, and the odds feed does not provide it. Copying each book's eligibility rules would drift the first time a book changes them.

## D-025 — AI Bets spends Sunday cash on one highest-chance side

- Date: 2026-10-18
- Status: accepted
- Decision: AI Bets takes a Sunday cash amount and, by default, places all of it on the single not-started Sunday side with the highest desk win chance. One side per game. The book filter chooses the price. A checkbox, Only better than fair, switches the slip to quarter Kelly and leaves the cash unbet when no price clears fair. AI read narrates that slip. The model does not choose the side or the stake. The screen states that a loss takes the stake.
- Why: The user wants the $50 played, with a pass available as a checkbox. The allocation that makes a profit most likely is the whole stake on the highest win chance. Splitting the cash, or promising the cash comes back, fights that chance and the no-guarantee rule.

## D-026 — AI Bets can split Sunday cash across every game

- Date: 2026-10-18
- Status: accepted
- Decision: AI Bets has One game and Every game. One game keeps the full Sunday cash on the highest desk win chance. Every game gives each Sunday game its highest-chance side and splits the cash evenly, with leftover cents on the higher chances. The slip shows profit if all of those tickets win, cash that comes back with that profit, and expected dollars. Only better than fair still sizes quarter Kelly, so a small edge stays a small stake. Game and team notes do not enter the pick or the stake.
- Why: A single best-chance bet hides the rest of the board. An even split shows the dollar return of playing every game, and it stays separate tickets. Quarter Kelly stays small because the edge is small. A team feed would be a second chance the desk does not have.

## D-027 — No AI betting advantage, and the build pauses

- Date: 2026-10-19
- Status: accepted
- Decision: The app does not claim, and must not be extended to claim, that AI improves sports-betting results. Models keep narrating a verified price. They do not pick winners, and historical team or player results are not added as a second chance or a luck factor. The builder watched Arizona Cardinals at Los Angeles Rams, kickoff Oct 18, 2026, 4:05 PM, and Arizona won. That one result is remembered as luck landing, not as proof for or against the desk. The working desk was built in about two days and is a learning tool for price, chance, and risk. Active betting use stopped on 2026-10-19. Publishing to GitHub was mentioned and not done. If work resumes, the next features are interactive teaching on numbers already on the slip: replay the slip many times from the desk chances, and state the break-even chance the price requires beside the desk chance. Do not resume by adding injury feeds, player history, or a model that promises an edge.
- Why: A finished game still happens when the price gave that side the shorter chance. The price already includes the public record. A hot streak is a small sample, not a skill finding. The honest screen often says the money stays unbet, which is useful and also why betting with the app lost its pull.

## D-028 — Public README for a possible GitHub upload

- Date: 2026-10-19
- Status: accepted
- Decision: The repo-root `README.md` is the public face. It says the screen is basic and the odds engine is the product. Live keys stay in `.env.local`, which `.gitignore` already excludes. `.env.example` keeps the key names empty. The GitHub repository was not created in this step.
- Why: A public sample can show the tested math without shipping a key or claiming an AI betting edge.

## D-029 — First push to the public GitHub repo

- Date: 2026-10-19
- Status: accepted
- Decision: The public repository is https://github.com/mikedsayre/Betz-Buddy-AI. The first push is this tree. `.env.local` stays untracked. GitHub's generated gitignore and README were left off so the local files remain the ones in the repo.
- Why: The empty public repo is the sample. The keys never enter it.

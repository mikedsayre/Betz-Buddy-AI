# Product trust

Betz Buddy AI is a deal desk. The user places the bet at a licensed sportsbook. This app identifies a price, explains the edge and the risk, and hands off through a deep link.

## What the user must be able to see

For every opportunity:

- The selection, the point, and the book offering it
- The price they would take, in American odds
- The no-vig fair probability and the rounded fair American price, labeled as a sharp reference
- EV as a percent of stake, from the canonical probability and the target decimal odds
- Suggested stake in dollars, the bankroll used, and the Kelly fraction used
- Prices at the same point across the retail books we track
- Whether the fair number came from Pinnacle or from a de-vigged consensus
- How old the sharp price and the retail price are, when the feed provides `last_update`
- That a missing deep link means we will not pretend a betslip exists

## What "feel good" means here

Confidence comes from legibility. The desk shows when a number is strong, when it is thin, and when the right action is to pass. Green on EV above 1.5% is a highlight for review. It is not a recommendation to bet.

Full Kelly (`1.0x`) is available because the brief asks for it, and the control must state that it assumes the fair probability is correct and that errors in that probability are not shrunk.

## Risk the interface states in plain language

- A positive EV is an estimate against a benchmark. It is not a promise of profit.
- The benchmark can be stale, limited, or missing. Consensus fallback is a weaker reference than Pinnacle and is labeled as such.
- Stake sizing uses the bankroll the user typed. The app does not know their real balance, open bets, or limits at the book. The stake is not increased to pay for odds or model calls. Bonus bets and site credit stay out of that number. A bonus bet that returns profit only is not cash, and the Kelly formula assumes the stake comes back with a win.
- The approved-bet tracker records an intention and a timestamp. It does not grade wins, losses, or closing line value.
- Odds move. The betslip can show a different price than the row they approved.
- The bet-amount simulator shows the cash profit if that stake wins and the stake lost if it misses. It uses the row's decimal price and fair probability. It does not replace the Kelly stake and it does not place the bet. A bigger profit bar is a longer price, which is the lower win chance.
- Demo mode is a practice slate. Its teams and kickoff times are invented. A live scan is the schedule.
- This is gambling. Losing the stake is an expected outcome on individual bets, including bets with positive estimated EV.
- Analyst agreement, when more than one model returns, is how often those briefs share a verdict. A single seated model is labeled as one read. The estimated chance the side wins is the no-vig probability.
- The model is not an advantage. It explains the price. It does not find a winner the odds missed.
- One finished game is luck around the chance. Arizona Cardinals at Los Angeles Rams on Oct 18, 2026, 4:05 PM, is the remembered case: Arizona won. That result does not grade the desk and does not create a formula.
- Team history, player history, and a person's feel for the game stay out of the stake. The public record is already in the price. A winning streak on short prices is a small sample, not proof of skill.

## Pinnacle's role

Pinnacle is the sharp benchmark. It is not offered as a bet button for US retail users. Retail books are the execution venues. A live US scan usually has no Pinnacle pair, and those rows say consensus.

## Age and eligibility

The MVP shows a persistent notice that sports betting is for adults and is illegal in some places, and that the user is responsible for local law and the sportsbook's rules. Account age gates belong to the sportsbook that accepts the wager.

## Copy constraints

User-facing text describes price, probability, stake, and risk. It does not claim a lock, a guarantee, or a duty to bet.

## How the desk teaches the board

A first-run guide states four steps: set the bankroll you can lose, scan on the demo slate or live odds, read book price then fair price then edge then stake, and place the bet at the sportsbook. Hide and Guide persist in this browser.

Column headers for kickoff, market, book price, win chance, edge, Kelly stake, profit if the typed bet wins, and stake lost if it misses sort the same verified rows. Kickoff can keep upcoming games or this Sunday in the local timezone. Market, favorite or underdog, benchmark, one or more teams, book, minimum win chance, minimum edge, and hide-stale narrow that list. Picking a team keeps both sides of that game. The book filter keeps every row that book posted and shows that book's price. Save stores a row in this browser under Bets I like. That list is the slip to read while placing the bet. The top of the list adds the saved stakes: cash put down, profit if every saved bet wins, cash at risk if every one loses, and the sum of each bet's expected dollars. Bets on the same game can lose together. Each win chance stays on its own row. Two or more saved bets on the same game at the same book are placed one at a time. A moneyline and a spread on the same team are named, because a sportsbook slip rejects that pair. The added dollars are separate tickets. The desk does not price a parlay. AI Bets spends a Sunday cash amount the user typed. One game puts the full amount on the Sunday side with the highest desk win chance. Every game splits that amount evenly across each game's highest-chance side and shows the profit and the cash that comes back if every ticket wins. Checked, only better-than-fair prices are sized with quarter Kelly, which is often cents, and the rest stays unbet. The model may read one row. It does not pick a different stake. Game and team notes are not an input, and the screen does not promise the cash comes back. Approve still records a betslip that was opened. Line shop and Actions stay fixed. The starting order is highest edge first.

Each control and column has a help panel with three parts in this order: a plain sentence, what to do, and the calculation. The words live in `src/components/help-copy.ts` and match the risk statements in this file. The model brief repeats the desk win chance in plain sentences and says whether to look, skip, or wait. It does not supply a second probability, and it is not the glossary.

import { DESK } from "@/config/desk";

export type HelpEntry = {
  title: string;
  plain: string;
  action: string;
  calculation: string;
};

export const HELP = {
  sport: {
    title: "Sport",
    plain: "The league this scan will price.",
    action: "Leave NFL selected, or pick another league. One scan covers one sport.",
    calculation: "The desk asks for that sport's prematch moneylines, spreads, and totals. In-play games stay off the board.",
  },
  market: {
    title: "Market",
    plain: "The kind of bet: who wins, the point spread, or the combined score.",
    action: "Use the Market filter above the table. All keeps every priced market. Pick one type when you want a shorter board.",
    calculation:
      "A moneyline is the two named sides. A spread pairs only when the points are equal and opposite, such as -3.5 with +3.5. A total pairs Over and Under at the same number. Different points stay in different rows.",
  },
  bankroll: {
    title: "Bankroll",
    plain: "Cash you can lose. The desk uses this number only to size the suggested stake.",
    action:
      "Type the cash in the sportsbook, not a bonus. Leave FanDuel Bonus Bets and site credit out of this box. A FanDuel test with about $30 of cash means entering 30.",
    calculation:
      "Stake equals the Kelly fraction times this bankroll times the multiplier you picked. The app does not read a sportsbook balance. Changing bankroll changes the stake. The edge stays the same. A FanDuel Bonus Bet returns the profit only, not the stake. Site credit returns the stake too if the bet wins. Those are different products, and the stake formula assumes cash that comes back with a win.",
  },
  kelly: {
    title: "Kelly",
    plain: `How large a fraction of the full Kelly stake to suggest. ${DESK.defaultKelly}x, quarter Kelly, is the default.`,
    action: "Stay on quarter Kelly while you learn the board. Half and full turn the same edge into a larger stake.",
    calculation:
      "Full Kelly is f = (b × p − q) / b. p is the fair win probability, q is 1 − p, and b is the decimal price minus 1. The stake is f × multiplier × bankroll, capped at the bankroll, and shown to the nearest cent. A zero or negative f shows $0. Full Kelly assumes the fair probability is correct and does not shrink an error in that probability.",
  },
  seats: {
    title: "Analyst seats",
    plain: "How many models write a brief. The app picks them from the live catalog. They explain the row. The desk calculates the edge and the stake.",
    action: "Leave Adaptive frontier on. It seats one strong model for each provider that has a key, up to three.",
    calculation:
      "One returned brief is labeled Single read. When more than one model answers, agreement is the share that chose the same verdict: approve, pass, or wait. That share is how often the briefs match. The chance the side wins is the fair probability. Custom lets you pin up to three model ids from the catalog.",
  },
  positiveOnly: {
    title: "Show +EV only",
    plain: "Hides rows whose estimated edge is zero or negative.",
    action: "Leave it on to study prices the benchmark treats as favorable. Turn it off to see the rest of the board, including stale lines.",
    calculation: `Edge is ((fair probability × decimal price) − 1) × 100. Rows at or below 0% hide while this is checked. Green highlighting starts above ${DESK.evHighlightPercent}%.`,
  },
  liveOdds: {
    title: "Live odds",
    plain: "Checked, the next scan fetches current sportsbook prices and spends Odds API credits. Unchecked, the board uses a built-in demo slate.",
    action: "Practice with the box unchecked. Check it when you want current prices, then press Scan.",
    calculation:
      "A live scan requests US books only. The desk fetches when you press Scan. It does not refresh on a timer. A repeat scan inside about two minutes can reuse the prices already in memory. The credit badge shows what the provider billed.",
  },
  scan: {
    title: "Scan live markets",
    plain: "Prices the board for the sport you selected. This is the odds button.",
    action: "Set the bankroll, then scan. A demo scan is free. A live scan spends Odds API credits. The browser reload button is not this button.",
    calculation:
      "The Live odds box decides whether the prices are the demo slate or a paid request. This tab keeps the last scan, so a reload can show it again without a new request. The server also reuses a live response for about two minutes. After that, Scan spends credits.",
  },
  slate: {
    title: "Compare slate",
    plain: "Asks the seated models which of the visible rows they would look at first.",
    action: "Scan first. Compare uses the rows on the board, up to 15.",
    calculation: "A model may name only a row the desk already listed. It cannot add a bet.",
  },
  models: {
    title: "Refresh models",
    plain: "Reloads the models the connected providers currently offer. It does not reload the odds board.",
    action: "Press it after a key change, or when you want to see which models can be seated.",
    calculation: "The desk calls a model only after that id appears on this list.",
  },
  credits: {
    title: "API credits",
    plain: "How many Odds API credits remain after the last live scan.",
    action: "Read this before you scan again. Demo mode shows a dash because no request was sent.",
    calculation: "The number is the provider's remaining-credit header. Credits move when a live scan reaches the provider.",
  },
  event: {
    title: "Event",
    plain: "The game, and the scheduled start. On the practice slate the pairing and the time are invented.",
    action: "Use Kickoff to keep Upcoming games, or This Sunday. This Sunday is Sunday in your timezone and only games that have not started. A Monday night game stays off that view. A practice row is labeled Sample and is not on the schedule.",
    calculation: "A live time comes from the odds feed and is shown in your local timezone. The Sunday window runs from Sunday 12:00 AM to Monday 12:00 AM on that clock.",
  },
  teams: {
    title: "Teams",
    plain: "Pick one or more teams from this scan and keep their games on the board.",
    action: "Add both teams in a game to read their prices together. Add a team from a second game when you want those prices on the same list. Clear brings the full board back.",
    calculation: "A row stays when one picked team is in the matchup. Both sides stay, and so do that game's spread and total. The prices are the rows already on the scan.",
  },
  bestBook: {
    title: "Best book",
    plain: "The sportsbook price selected for this row, in American odds. A minus price is the favorite. A plus price is the underdog.",
    action: "This is the price the edge and the stake use. Choose another book in Line shop to switch it. The Price filter keeps favorites (a minus price) or underdogs (a plus price).",
    calculation:
      "A plus price converts as 1 + price/100. A minus price converts as 1 + 100/|price|. The row is marked stale when this price and the sharp price were updated more than 2 minutes apart. A stale price can still be listed.",
  },
  sharpFair: {
    title: "Sharp fair",
    plain: "The chance this side wins after the book's margin is removed, and that chance shown as an American price.",
    action: "Compare it with the book price. A book price that pays more than this fair price is where a positive edge comes from.",
    calculation:
      "Implied probability is 1 divided by the decimal price. Fair probability removes the margin: fair A = implied A / (implied A + implied B). The two fair probabilities sum to 1. The American number is that probability shown as a price. The edge and the stake use the probability. Pinnacle is the benchmark when it posts both sides. A US live scan does not include that book, so the label is consensus: the desk averages the US books that posted both sides, then removes the margin. Consensus is a weaker reference.",
  },
  edge: {
    title: "Edge",
    plain: "How much better this price is than the fair chance, as a percent of the stake. The board starts with the highest edge first. Click a column name to sort by that number instead.",
    action: `Green means the estimate is above ${DESK.evHighlightPercent}%. That is a highlight for a closer look. Click Sharp fair to put the highest win chance on top. Click Edge again to return to the largest price advantage.`,
    calculation:
      "EV% = ((fair probability × decimal odds) − 1) × 100. Bankroll is not part of this number. A positive edge is an estimate against the benchmark, not a promise of profit. A single bet can lose, including one with a positive estimate.",
  },
  simulator: {
    title: "Bet amount",
    plain: "A dollar amount you type so you can see the cash result of that bet before you open a sportsbook.",
    action: "Type one amount for the whole board, or type a different amount on a row. Click Win to sort by the profit. Click Lose to sort by the stake you lose. This does not place the bet and does not change the Kelly stake.",
    calculation:
      "Profit if it wins is the stake times (decimal price − 1). The percent beside Win is the chance that side wins. If it misses, you lose that stake, and the percent beside Lose is the rest. Expected dollars are the stake times the edge. A plus price has a bigger profit and a lower chance. A heavy favorite can win often and still pay less than the stake you risk.",
  },
  stake: {
    title: "Kelly stake",
    plain: "The dollars the Kelly rule suggests for this price, your bankroll, and the Kelly multiplier.",
    action: "Treat it as a ceiling for what you might risk. Confirm the price at the sportsbook. This app does not place the bet.",
    calculation:
      "The stake uses the same Kelly formula as the Kelly control, then rounds to the nearest cent. $0 means the formula finds no positive fraction at this price.",
  },
  lineShop: {
    title: "Line shop",
    plain: "The same bet at each retail book that posted it, at the same point.",
    action: "Click a book. Its price becomes the one used for the edge and the stake. The Book filter keeps every row that book posted and shows that book's price, including when another book has the better number.",
    calculation: "A -3.5 spread stays with other -3.5 prices. It is not compared with -3. Pinnacle is the benchmark and has no bet button on this desk.",
  },
  actions: {
    title: "Actions",
    plain: "AI Brief explains this row in plain words. Save keeps the row for later. Approve opens the sportsbook betslip and records the row in this browser.",
    action: "Save the prices you may bet, then open Bets I like while you are at the sportsbook. Open the betslip yourself and confirm the price before you wager. A gray Approve means that book sent no link.",
    calculation:
      "The brief repeats the verified win chance, the book price, and whether that price is better than fair. It does not invent a second probability. If a model states a percent or a price that is not on the desk, the drawer flags it and the desk numbers stay. The tracker stores the time, book, price, edge, and stake. It does not record whether the bet won.",
  },
  aiBets: {
    title: "AI Bets",
    plain: "A Sunday slip for the cash you typed. One game puts it all on the best chance. Every game splits it across each game's best chance.",
    action: "Pick One game or Every game, then open each betslip yourself. Check Only better than fair when a small edge should stay a small bet. AI read explains that one row. It does not choose a different bet.",
    calculation: "Each game keeps the side with the highest desk win chance. One game stakes the full cash there. Every game splits the cash evenly, and leftover cents go to the higher chances. Comes back is profit plus stake. The total comes back only when every ticket wins. Only better than fair sizes quarter Kelly, so a small edge is often cents and the rest stays unbet. Game and team notes are not in the win chance, so they do not move the stake.",
  },
  liked: {
    title: "Bets I like",
    plain: "A list, in this browser, of rows you saved before you open a sportsbook, with the cash those rows put down and what they can return or lose.",
    action: "Save on the board. Read the totals, then open one betslip at a time. Bets from the same game at the same book are separate tickets. Remove drops the row and updates the totals. This list does not place the bet.",
    calculation: "Put down is the sum of the saved bet amounts. If every saved bet wins on its own ticket, profit is the sum of each stake times (decimal odds − 1), and cash back is that profit plus the money put down. Cash at risk is the same sum if every one loses. Expected adds each bet's own expected dollars. A moneyline and a spread on the same team at the same book are flagged, because that pair is rejected on one slip. The list does not price a combined ticket. A later scan does not change a saved row.",
  },
  tracker: {
    title: "Approved bet tracker",
    plain: "A list, in this browser, of betslips you opened from the desk.",
    action: "Use it to remember what you approved. Another browser, or a cleared site storage, starts empty.",
    calculation: "Each entry is an intention and a timestamp. Wins, losses, and closing line value are not graded here.",
  },
  agreement: {
    title: "Agreement",
    plain: "How often the models that answered chose the same verdict.",
    action: "Single read means one model answered. Read the desk price, fair probability, edge, and stake above the prose.",
    calculation:
      "Verdicts are approve, pass, or wait. Agreement is the share of returned verdicts that match. The chance the side wins remains the fair probability on the row.",
  },
} as const satisfies Record<string, HelpEntry>;

export type HelpId = keyof typeof HELP;

export const GUIDE_STEPS = [
  {
    title: "Set the money you can lose",
    body: "Bankroll is the amount the stake column uses. Enter what you can afford to risk. The desk does not read your sportsbook balance.",
  },
  {
    title: "Scan when you are ready",
    body: "Leave Live odds off to practice on the demo slate for free. Turn it on for current prices. A live scan spends Odds API credits, and nothing refreshes until you press Scan.",
  },
  {
    title: "Read one row across",
    body: `Book price, then the chance that side wins, then the edge, then the suggested stake. The percent is how often that side is expected to win. The edge is whether the price is better than fair. Green means the edge is above ${DESK.evHighlightPercent}%.`,
  },
  {
    title: "You place the bet",
    body: "Approve & open betslip opens the sportsbook. Confirm the price there. This desk does not send the wager.",
  },
] as const;

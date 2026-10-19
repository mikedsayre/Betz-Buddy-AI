# Original brief

Status: source of record for product intent. Stored verbatim on 2026-10-15. Later decisions live in `02-decision-log.md` and override implementation details when they conflict with this brief. They do not override the product goal.

---

Analyze this build, and give me your feedback first before we proceed, we need to establish a solid foundation for this app first within the framework of cursor and ai agents, and I want all ideas and strategies available and presented and thought over for optimum success, we need a memory structure - store this prompt in an .md file, and use ,md files as your memory (or find a better alternative), when anything significant that will improve our build process and the overall app write it to an .md files with a heirarchy structure, this heirarchy structure will be used optimally to ensure the math and overall success of the app in every aspect. The overall planning and design of this app needs to have it's own foundation which orchestrates all other aspects and manages everything to ensure the numbers never are off and there is never hallucination with just one ai agent, checks and balances should be important for security and accuracy. However this setup intitially might be structured as needed, it also needs to be fluid enough to adapt to any changes needed or required and not hinder any future development or growth, we need to be operating on a swivel to handle incoming chhanges and there will be many expected. You have full creative control, from top to bottom of this app, there needs to be structure and discipline and adherence within this whole apps operation to ultimately ensure trust with users and overall success in identifying odds on any platfrom we choose for the user to make decisions which are accurate and informatiive for them to feel good about their bet placing on any action. They also need to understand the odds and risk involved in the bet.

# Role & Objective
Act as a Principal Full-Stack Quant Engineer. Build a production-ready MVP web application called **"Betz Buddy AI"**—a human-in-the-loop Sports Betting Deal Desk that ingests live odds from The Odds API v4, calculates deterministic No-Vig Fair Odds, Expected Value (+EV), and Fractional Kelly stakes in TypeScript, uses Gemini Pro (`@google/genai`) to provide matchup intelligence, and provides 1-click Betslip Deep Link execution for retail sportsbooks.

# Tech Stack Constraints
- **Framework:** Next.js 15 (App Router), React 19, TypeScript (strict mode), Tailwind CSS, Lucide React icons.
- **Deployment Target:** Vercel (serverless API routes + client dashboard).
- **AI SDK:** MUST use the official `@google/genai` package (`import { GoogleGenAI } from '@google/genai'`). Do NOT use the deprecated `@google/generative-ai` package.
- **State & Caching:** Manual Refresh button + configurable cache TTL in API routes so we never burn The Odds API credits via uncontrolled `useEffect` polling loops.

# Core Architecture & File Structure to Generate

## 1. Quantitative Math Engine (`src/lib/quant.ts`)
Write pure, unit-testable TypeScript functions (zero LLM involvement in math):
- `americanToDecimal(odds: number): number` and `decimalToAmerican(decimal: number): number`
- `americanToImpliedProb(odds: number): number`
- `deVigTwoWayMarket(sideAOdds: number, sideBOdds: number): { fairProbA: number; fairProbB: number; fairAmericanA: number; fairAmericanB: number; vigPercent: number }`
  - Use multiplicative normalization: `fairProbA = impliedA / (impliedA + impliedB)`.
- `calculateEV(trueProb: number, targetBookDecimalOdds: number): number`
  - Formula: `((trueProb * targetBookDecimalOdds) - 1) * 100` (returns EV as a percentage, e.g., `+3.8%`).
- `calculateKellyStake(trueProb: number, decimalOdds: number, bankroll: number, kellyMultiplier: number = 0.25): number`
  - Formula: `b = decimalOdds - 1`, `q = 1 - trueProb`, `f = (b * trueProb - q) / b`. Multiply `f * kellyMultiplier * bankroll`. Return `0` if `f <= 0`.

## 2. The Odds API v4 Service (`src/app/api/odds/route.ts`)
Create a GET endpoint accepting `sport` (default `americanfootball_nfl`, with support for `basketball_nba`, `baseball_mlb`, `icehockey_nhl`, `americanfootball_ncaaf`), `markets` (default `h2h,spreads,totals`), and `bookmakers` (default `pinnacle,fanduel,draftkings,betmgm,caesars`).
- Call `https://api.the-odds-api.com/v4/sports/${sport}/odds` with query params:
  - `apiKey=${process.env.ODDS_API_KEY}`
  - `regions=us,eu`
  - `markets=${markets}`
  - `bookmakers=${bookmakers}`
  - `oddsFormat=american`
  - `includeLinks=true`
  - `includeSids=true`
- **Quota Tracking:** Extract HTTP response headers `x-requests-remaining`, `x-requests-used`, and `x-requests-last` and return them in the JSON payload so the UI displays live API credit health.
- **Opportunity Normalization:**
  - For every event and market (`h2h`, `spreads`, `totals`), match identical outcomes and line points across bookmakers.
  - Use `pinnacle` as the Sharp Benchmark to compute `trueProb` and `fairAmericanOdds` via `deVigTwoWayMarket`. If `pinnacle` is missing for a specific market, fall back to the market consensus average implied probability across all available books.
  - For every US retail book outcome, compute `evPercent`, `recommendedStake`, and resolve the deep link using the fallback cascade: `outcome.link || market.link || bookmakerEvent.link || null`.
  - Also include a realistic **Mock Data Fallback Mode** (`?mock=true` or automatic if `ODDS_API_KEY` is missing) containing realistic NFL/NBA lines with FanDuel/DraftKings deep links and Pinnacle sharp lines so the UI can be tested immediately without burning API credits.

## 3. Gemini AI Deal Analyst Endpoint (`src/app/api/analyze/route.ts`)
Create a POST endpoint using `@google/genai` (`const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })`, model `gemini-2.5-pro`).
- Accept a selected bet opportunity JSON payload (matchup, market, target book, target odds, Pinnacle fair odds, EV%, Kelly stake, and all competing book prices).
- System instruction for Gemini:
  - "You are a quantitative sports betting execution analyst. Never recalculate the provided EV or Kelly math—treat the JSON math payload as ground truth. Provide a concise 3-bullet executive brief: (1) Price Discrepancy Summary (why this line stands out vs. sharp consensus and competing books), (2) Key Matchup/Timing Risk Factors to check before locking in (pace, key injury dependencies, or market timing), and (3) Execution Verdict (Approve vs. Pass/Wait)."

## 4. High-Density Deal Desk Dashboard (`src/app/page.tsx`)
Build a sleek, dark-mode quantitative trading terminal UI (`bg-slate-950 text-slate-100`):
- **Top Control Bar:**
  - Sport selector (`NFL`, `NCAAF`, `NBA`, `MLB`, `NHL`).
  - Market filter (`All`, `Moneyline`, `Spreads`, `Totals`).
  - Filter toggle: `Show +EV Only` vs. `Show All Best Lines`.
  - Bankroll input (default `$1,000`) & Kelly Multiplier selector (`0.25x Quarter Kelly`, `0.50x Half Kelly`, `1.0x Full Kelly`) that dynamically recalculates stakes on the client.
  - Manual **"Scan Live Markets"** button + badge showing `API Credits Remaining: X` and `Demo/Live Mode` toggle.
- **Main Opportunity Table / Deal Cards:**
  - Columns: Event & Start Time | Market & Selection | **Best Book & Odds** | **Sharp Fair Odds (No-Vig)** | **Edge (+EV %)** | **Kelly Stake ($)** | **Line Shop Strip** (compact pills showing prices across FanDuel, DraftKings, BetMGM, Caesars) | **Actions**.
- Highlight rows with `EV > 1.5%` in emerald green badges.
- **Human-in-the-Loop Action Drawer / Modal:**
  - Clicking **"AI Brief"** opens a side panel showing the Gemini breakdown for that exact wager.
  - Clicking **"Approve & Open Betslip"** opens the bookmaker's deep link (`outcome.link`) in a new tab and logs the wager to a local **"Approved Bet Tracker"** tab (`localStorage`) showing timestamp, book, line, EV%, and stake so the user can track their pending action.

# Deliverable Instructions
1. Initialize the project files, install required dependencies (`@google/genai`, `lucide-react`, `clsx`, `tailwind-merge`), and provide a `.env.example` with `ODDS_API_KEY` and `GEMINI_API_KEY`.
2. Ensure TypeScript compiles cleanly with zero errors (`npm run build`).

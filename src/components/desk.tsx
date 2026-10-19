"use client";

import { cloneElement, useEffect, useId, useMemo, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { DESK, MARKETS, RETAIL_BOOKS, SPORTS, isSportKey, type MarketKey, type SportKey } from "@/config/desk";
import { BriefDrawer, type DrawerFacts } from "@/components/brief-drawer";
import { GuideButton, GuidePanel, GuideProvider } from "@/components/desk-guide";
import { HelpTip } from "@/components/help-tip";
import type { HelpId } from "@/components/help-copy";
import { cn } from "@/lib/cn";
import { formatAmerican, formatEv, formatMoney, formatProb, formatWhen } from "@/lib/format";
import type { CatalogModel } from "@/lib/models/orchestrator";
import type { AnalyzeResponse } from "@/lib/models/response";
import type { Deal, Quote } from "@/lib/odds/types";
import { calculateKellyStake, displayStake, planSundayCash, simulateStake, summarizeStakes, type StakeSummary } from "@/lib/quant";

type OddsPayload = {
  mode: "demo" | "live";
  reason?: string;
  demoNote?: string | null;
  quota: { remaining: string | null; used: string | null; last: string | null } | null;
  deals: Deal[];
  suppressed: number;
  error?: string;
};

type CatalogPayload = {
  demo: boolean;
  models: CatalogModel[];
  providers: { provider: string; status: string; message?: string }[];
};

type TrackedBet = {
  id: string;
  at: string;
  matchup: string;
  selection: string;
  book: string;
  americanOdds: number;
  evPercent: number;
  stake: number;
};

type LikedBet = {
  id: string;
  savedAt: string;
  matchup: string;
  commenceTime: string;
  marketLabel: string;
  selection: string;
  book: string;
  americanOdds: number;
  decimalOdds: number;
  trueProb: number;
  evPercent: number;
  link: string | null;
  betAmount: number;
};

const TRACKER_KEY = "betz-buddy-tracker";
const LIKED_KEY = "betz-buddy-liked";
const BOARD_KEY = "betz-buddy-board";

type SortKey = "event" | "market" | "price" | "chance" | "edge" | "kelly" | "win" | "lose" | "expected";
type KickoffFilter = "all" | "upcoming" | "sunday";

const SORT_LABEL: Record<SortKey, string> = {
  event: "kickoff",
  market: "market",
  price: "book price",
  chance: "win chance",
  edge: "edge",
  kelly: "Kelly stake",
  win: "profit if it wins",
  lose: "dollars lost if it misses",
  expected: "expected dollars",
};

type SavedBoard = {
  savedAt: string;
  sport: SportKey;
  market: MarketKey | "all";
  positiveOnly: boolean;
  bankroll: number;
  kelly: (typeof DESK.kellyChoices)[number];
  demo: boolean;
  seatChoice: string;
  board: OddsPayload;
};

export function Desk() {
  const [sport, setSport] = useState<SportKey>("americanfootball_nfl");
  const [market, setMarket] = useState<MarketKey | "all">("all");
  const [positiveOnly, setPositiveOnly] = useState(true);
  const [bankroll, setBankroll] = useState<number>(DESK.defaultBankroll);
  const [betAmount, setBetAmount] = useState(10);
  const [rowBets, setRowBets] = useState<Record<string, number>>({});
  const [kelly, setKelly] = useState<(typeof DESK.kellyChoices)[number]>(DESK.defaultKelly);
  const [demo, setDemo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [board, setBoard] = useState<OddsPayload | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [pickedBook, setPickedBook] = useState<Record<string, string>>({});
  const [catalog, setCatalog] = useState<CatalogPayload | null>(null);
  const [seatChoice, setSeatChoice] = useState("adaptive");
  const [pins, setPins] = useState<string[]>(["", "", ""]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [facts, setFacts] = useState<DrawerFacts | null>(null);
  const [tab, setTab] = useState<"board" | "liked" | "ai" | "tracker">("board");
  const [sundayCash, setSundayCash] = useState(50);
  const [onlyFair, setOnlyFair] = useState(false);
  const [everyGame, setEveryGame] = useState(false);
  const [tracker, setTracker] = useState<TrackedBet[]>([]);
  const [liked, setLiked] = useState<LikedBet[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("edge");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pickedTeams, setPickedTeams] = useState<string[]>([]);
  const [bookFilter, setBookFilter] = useState("all");
  const [minChance, setMinChance] = useState("");
  const [minEdge, setMinEdge] = useState("");
  const [hideStale, setHideStale] = useState(false);
  const [priceSide, setPriceSide] = useState<"all" | "favorite" | "underdog">("all");
  const [benchmark, setBenchmark] = useState<"all" | "pinnacle" | "consensus">("all");
  const [kickoff, setKickoff] = useState<KickoffFilter>("all");

  useEffect(() => {
    const stored = window.localStorage.getItem(TRACKER_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as TrackedBet[];
        if (Array.isArray(parsed)) setTracker(parsed);
      } catch {
        setTracker([]);
      }
    }
    const likedRaw = window.localStorage.getItem(LIKED_KEY);
    if (likedRaw) {
      try {
        const parsed = JSON.parse(likedRaw) as LikedBet[];
        if (Array.isArray(parsed)) setLiked(parsed.filter(isLikedBet));
      } catch {
        setLiked([]);
      }
    }
    const saved = readSavedBoard();
    if (saved) {
      setSport(saved.sport);
      setMarket(saved.market);
      setPositiveOnly(saved.positiveOnly);
      setBankroll(saved.bankroll);
      setKelly(saved.kelly);
      setDemo(saved.demo);
      setSeatChoice(saved.seatChoice);
      setBoard(saved.board);
      setSavedAt(saved.savedAt);
    }
    setHydrated(true);
    void loadCatalog();
  }, []);

  useEffect(() => {
    if (!hydrated || !board || !savedAt) return;
    const snapshot: SavedBoard = {
      savedAt,
      sport,
      market,
      positiveOnly,
      bankroll,
      kelly,
      demo,
      seatChoice,
      board,
    };
    window.sessionStorage.setItem(BOARD_KEY, JSON.stringify(snapshot));
  }, [hydrated, board, savedAt, sport, market, positiveOnly, bankroll, kelly, demo, seatChoice]);

  async function loadCatalog() {
    const response = await fetch("/api/models");
    setCatalog((await response.json()) as CatalogPayload);
  }

  async function scan() {
    setLoading(true);
    setBoardError(null);
    try {
      const params = new URLSearchParams({
        sport,
        mock: demo ? "true" : "false",
        bankroll: String(bankroll),
        kelly: String(kelly),
      });
      const response = await fetch(`/api/odds?${params.toString()}`);
      const payload = (await response.json()) as OddsPayload;
      if (!response.ok) {
        setBoardError(payload.error ?? "Scan failed");
        return;
      }
      setBoard(payload);
      setSavedAt(new Date().toISOString());
      setPickedBook({});
    } catch (error) {
      setBoardError(error instanceof Error ? error.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  const rows = useMemo(() => {
    const deals = board?.deals ?? [];
    const chanceFloor = numberFilter(minChance);
    const edgeFloor = numberFilter(minEdge);
    const now = Date.now();
    const sunday = sundayWindow(new Date(now));
    const filtered = deals.filter((deal) => {
      const kick = Date.parse(deal.commenceTime);
      if (kickoff !== "all" && kick < now) return false;
      if (kickoff === "sunday" && (kick < sunday.start || kick >= sunday.end)) return false;
      if (market !== "all" && deal.marketKey !== market) return false;
      const quote = selectedQuote(deal, pickedBook, bookFilter);
      if (bookFilter !== "all" && quote.bookmakerKey !== bookFilter) return false;
      if (positiveOnly && quote.evPercent <= 0) return false;
      if (hideStale && quote.staleRisk) return false;
      if (chanceFloor !== null && deal.trueProb * 100 < chanceFloor) return false;
      if (edgeFloor !== null && quote.evPercent < edgeFloor) return false;
      if (priceSide === "favorite" && quote.americanOdds >= 0) return false;
      if (priceSide === "underdog" && quote.americanOdds <= 0) return false;
      if (benchmark !== "all" && deal.benchmarkSource !== benchmark) return false;
      if (pickedTeams.length > 0 && !pickedTeams.some((team) => deal.matchup.split(" @ ").includes(team))) return false;
      return true;
    });
    const direction = sortDir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      const compared = compareSort(a, b, sortKey, pickedBook, bookFilter, bankroll, kelly, rowBets, betAmount);
      if (compared !== 0) return compared * direction;
      return a.id.localeCompare(b.id);
    });
  }, [board, market, positiveOnly, pickedBook, bookFilter, hideStale, minChance, minEdge, pickedTeams, priceSide, benchmark, kickoff, sortKey, sortDir, bankroll, kelly, rowBets, betAmount]);

  const teams = useMemo(() => teamNames(board?.deals ?? []), [board]);

  useEffect(() => {
    setPickedTeams((current) => {
      const next = current.filter((team) => teams.includes(team));
      return next.length === current.length ? current : next;
    });
  }, [teams]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "event" || key === "market" ? "asc" : "desc");
  }

  const sundayPlan = useMemo(() => {
    const now = Date.now();
    const sunday = sundayWindow(new Date(now));
    const legs = (board?.deals ?? []).flatMap((deal) => {
      const kick = Date.parse(deal.commenceTime);
      if (kick < now || kick < sunday.start || kick >= sunday.end) return [];
      const quote = selectedQuote(deal, pickedBook, bookFilter);
      if (bookFilter !== "all" && quote.bookmakerKey !== bookFilter) return [];
      return [{
        id: deal.id,
        eventId: deal.eventId,
        trueProb: deal.trueProb,
        decimalOdds: quote.decimalOdds,
        evPercent: quote.evPercent,
        stale: quote.staleRisk,
      }];
    });
    return planSundayCash(legs, sundayCash, onlyFair, everyGame);
  }, [board, pickedBook, bookFilter, sundayCash, onlyFair, everyGame]);

  async function ask(task: "brief" | "slate", deal?: Deal, stakeOverride?: number) {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerError(null);
    setAnalysis(null);
    const quote = deal ? selectedQuote(deal, pickedBook, bookFilter) : undefined;
    if (deal && quote) {
      setFacts({
        matchup: deal.matchup,
        selection: deal.selection,
        book: quote.bookmakerTitle,
        americanOdds: quote.americanOdds,
        fairAmerican: deal.fairAmericanOdds,
        trueProb: deal.trueProb,
        evPercent: quote.evPercent,
        stake: stakeOverride ?? stakeFor(deal, quote, bankroll, kelly),
        benchmarkSource: deal.benchmarkSource,
      });
    } else {
      setFacts(null);
    }
    const seatCount = seatChoice === "1" || seatChoice === "2" || seatChoice === "3" ? Number(seatChoice) : undefined;
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          mode: seatChoice === "custom" ? "custom" : "adaptive",
          seatCount,
          pinnedIds: seatChoice === "custom" ? pins.filter(Boolean) : undefined,
          deal,
          quoteBook: quote?.bookmakerKey,
          slate:
            task === "slate"
              ? rows.slice(0, DESK.slateLimit).map((row) => {
                  const rowQuote = selectedQuote(row, pickedBook, bookFilter);
                  return {
                    id: row.id,
                    label: `${row.matchup} · ${row.selection} · ${rowQuote.bookmakerTitle} ${formatAmerican(rowQuote.americanOdds)}`,
                    evPercent: rowQuote.evPercent,
                    americanOdds: rowQuote.americanOdds,
                    fairAmericanOdds: row.fairAmericanOdds,
                    benchmarkSource: row.benchmarkSource,
                    staleRisk: rowQuote.staleRisk,
                    book: rowQuote.bookmakerTitle,
                  };
                })
              : undefined,
        }),
      });
      const payload = (await response.json()) as AnalyzeResponse & { error?: string };
      if (!response.ok) {
        setDrawerError(payload.error ?? "The brief failed");
        return;
      }
      setAnalysis(payload);
    } catch (error) {
      setDrawerError(error instanceof Error ? error.message : "The brief failed");
    } finally {
      setDrawerLoading(false);
    }
  }

  function approve(deal: Deal) {
    const quote = selectedQuote(deal, pickedBook, bookFilter);
    if (!quote.link) return;
    window.open(quote.link, "_blank", "noopener,noreferrer");
    const entry: TrackedBet = {
      id: `${deal.id}-${Date.now()}`,
      at: new Date().toISOString(),
      matchup: deal.matchup,
      selection: deal.selection,
      book: quote.bookmakerTitle,
      americanOdds: quote.americanOdds,
      evPercent: quote.evPercent,
      stake: stakeFor(deal, quote, bankroll, kelly),
    };
    const next = [entry, ...tracker];
    setTracker(next);
    window.localStorage.setItem(TRACKER_KEY, JSON.stringify(next));
  }

  function toggleLike(deal: Deal) {
    const quote = selectedQuote(deal, pickedBook, bookFilter);
    const id = `${deal.id}|${quote.bookmakerKey}`;
    const next = liked.some((item) => item.id === id)
      ? liked.filter((item) => item.id !== id)
      : [
          {
            id,
            savedAt: new Date().toISOString(),
            matchup: deal.matchup,
            commenceTime: deal.commenceTime,
            marketLabel: marketLabel(deal.marketKey),
            selection: deal.selection,
            book: quote.bookmakerTitle,
            americanOdds: quote.americanOdds,
            decimalOdds: quote.decimalOdds,
            trueProb: deal.trueProb,
            evPercent: quote.evPercent,
            link: quote.link,
            betAmount: rowBets[deal.id] ?? betAmount,
          },
          ...liked,
        ];
    setLiked(next);
    window.localStorage.setItem(LIKED_KEY, JSON.stringify(next));
  }

  return (
    <GuideProvider>
    <main className="min-h-screen">
      <header className="border-b border-slate-800 px-4 py-4 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Deal desk</p>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">Betz Buddy AI</h1>
              <GuideButton />
            </div>
          </div>
          <p className="max-w-xl text-sm text-slate-400">
            Positive EV is an estimate against the benchmark, not a promise of profit. You place the bet at the
            sportsbook. Full Kelly assumes the fair probability is correct.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="Sport" help="sport">
            <select className={controlClass} value={sport} onChange={(event) => setSport(event.target.value as SportKey)}>
              {SPORTS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Bet $" help="simulator">
            <input
              className={cn(controlClass, "w-24")}
              type="number"
              min={0}
              step="1"
              value={betAmount}
              onChange={(event) => setBetAmount(Number(event.target.value))}
            />
          </Field>
          <Field label="Bankroll" help="bankroll">
            <input
              className={cn(controlClass, "w-28")}
              type="number"
              min={0}
              value={bankroll}
              onChange={(event) => setBankroll(Number(event.target.value))}
            />
          </Field>
          <Field label="Kelly" help="kelly">
            <select
              className={controlClass}
              value={kelly}
              onChange={(event) => setKelly(Number(event.target.value) as (typeof DESK.kellyChoices)[number])}
            >
              <option value={0.25}>0.25x Quarter Kelly</option>
              <option value={0.5}>0.50x Half Kelly</option>
              <option value={1}>1.0x Full Kelly</option>
            </select>
          </Field>
          <Field label="Analyst seats" help="seats">
            <select className={controlClass} value={seatChoice} onChange={(event) => setSeatChoice(event.target.value)}>
              <option value="adaptive">Adaptive frontier</option>
              <option value="1">1 seat</option>
              <option value="2">2 seats</option>
              <option value="3">3 seats</option>
              <option value="custom">Custom</option>
            </select>
          </Field>
          <span className="flex items-center gap-1 pb-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={positiveOnly} onChange={(event) => setPositiveOnly(event.target.checked)} />
              Show +EV only
            </label>
            <HelpTip id="positiveOnly" />
          </span>
          <span className="flex items-center gap-1 pb-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!demo} onChange={(event) => setDemo(!event.target.checked)} />
              Live odds
            </label>
            <HelpTip id="liveOdds" />
          </span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void scan()}
              disabled={loading}
              className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              <RefreshCw className={cn("mr-2 inline h-4 w-4", loading && "animate-spin")} />
              Scan live markets
            </button>
            <HelpTip id="scan" />
          </span>
          <span className="flex items-center gap-1">
            <button type="button" onClick={() => void ask("slate")} className="rounded border border-slate-700 px-3 py-2 text-sm">
              Compare slate
            </button>
            <HelpTip id="slate" />
          </span>
          <span className="flex items-center gap-1">
            <button type="button" onClick={() => void loadCatalog()} className="rounded border border-slate-700 px-3 py-2 text-sm">
              Refresh models
            </button>
            <HelpTip id="models" />
          </span>
        </div>
        {seatChoice === "custom" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {pins.map((pin, index) => (
              <select
                key={index}
                aria-label={`Model seat ${index + 1}`}
                className={controlClass}
                value={pin}
                onChange={(event) =>
                  setPins((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                }
              >
                <option value="">Empty seat</option>
                {catalog?.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.displayName}
                  </option>
                ))}
              </select>
            ))}
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge>{board?.mode === "live" ? "Live odds" : "Demo odds"}</Badge>
          <Badge>
            <span className="inline-flex items-center gap-1">
              API credits remaining: {board?.quota?.remaining ?? "—"}
              {board?.quota?.used ? ` · used ${board.quota.used}` : ""}
              <HelpTip id="credits" />
            </span>
          </Badge>
          <Badge>{catalog?.demo ? "Demo models" : "Live model catalog"}</Badge>
          {catalog?.providers
            .filter((provider) => provider.message)
            .map((provider) => (
              <Badge key={provider.provider}>
                {provider.provider}: {provider.message}
              </Badge>
            ))}
          {typeof board?.suppressed === "number" && board.suppressed > 0 ? (
            <Badge>{board.suppressed} rows suppressed by the math check</Badge>
          ) : null}
        </div>
        {kelly === 1 ? (
          <p className="mt-2 text-sm text-amber-300">Full Kelly does not shrink errors in the fair probability.</p>
        ) : null}
        {boardError ? <p className="mt-2 text-sm text-rose-300">{boardError}</p> : null}
        {board?.demoNote ? <p className="mt-2 text-sm text-slate-400">{board.demoNote}</p> : null}
        {board?.reason ? <p className="mt-2 text-sm text-slate-500">{board.reason}</p> : null}
        {savedAt && board ? (
          <p className="mt-2 text-sm text-slate-400">
            Showing the scan from {formatWhen(savedAt)}. This tab keeps it after a reload. Scan again for new prices
            {board.mode === "live" ? ". A live scan after about two minutes spends credits" : ""}.
          </p>
        ) : null}
      </header>

      <GuidePanel />

      <div className="flex items-center gap-2 px-4 pt-4 lg:px-6">
        <button type="button" className={tabClass(tab === "board")} onClick={() => setTab("board")}>
          Board
        </button>
        <button type="button" className={tabClass(tab === "liked")} onClick={() => setTab("liked")}>
          Bets I like ({liked.length})
        </button>
        <HelpTip id="liked" />
        <button type="button" className={tabClass(tab === "ai")} onClick={() => setTab("ai")}>
          AI Bets
        </button>
        <HelpTip id="aiBets" />
        <button type="button" className={tabClass(tab === "tracker")} onClick={() => setTab("tracker")}>
          Approved bet tracker ({tracker.length})
        </button>
        <HelpTip id="tracker" />
      </div>

      {tab === "ai" ? (
        <AiBets
          cash={sundayCash}
          onCash={setSundayCash}
          onlyFair={onlyFair}
          onOnlyFair={setOnlyFair}
          everyGame={everyGame}
          onEveryGame={setEveryGame}
          bookLabel={bookFilter === "all" ? "Any book, using the best price on each row" : RETAIL_BOOKS.find((book) => book.key === bookFilter)?.title ?? bookFilter}
          deals={board?.deals ?? []}
          plan={sundayPlan}
          pickedBook={pickedBook}
          bookFilter={bookFilter}
          onRead={(deal, stake) => void ask("brief", deal, stake)}
          onOpen={(deal, stake) => {
            const quote = selectedQuote(deal, pickedBook, bookFilter);
            if (!quote.link) return;
            window.open(quote.link, "_blank", "noopener,noreferrer");
            const entry: TrackedBet = {
              id: `${deal.id}-${Date.now()}`,
              at: new Date().toISOString(),
              matchup: deal.matchup,
              selection: deal.selection,
              book: quote.bookmakerTitle,
              americanOdds: quote.americanOdds,
              evPercent: quote.evPercent,
              stake,
            };
            const next = [entry, ...tracker];
            setTracker(next);
            window.localStorage.setItem(TRACKER_KEY, JSON.stringify(next));
          }}
        />
      ) : tab === "liked" ? (
        <LikedList
          bets={liked}
          onOpen={(bet) => {
            if (!bet.link) return;
            window.open(bet.link, "_blank", "noopener,noreferrer");
          }}
          onRemove={(id) => {
            const next = liked.filter((item) => item.id !== id);
            setLiked(next);
            window.localStorage.setItem(LIKED_KEY, JSON.stringify(next));
          }}
        />
      ) : tab === "tracker" ? (
        <section className="px-4 py-4 lg:px-6">
          {tracker.length === 0 ? (
            <p className="text-sm text-slate-400">Approved bets you open will land here with the time, book, price, EV, and stake.</p>
          ) : (
            <ul className="space-y-2">
              {tracker.map((bet) => (
                <li key={bet.id} className="rounded border border-slate-800 px-3 py-2 text-sm">
                  <span className="text-slate-500">{formatWhen(bet.at)}</span> · {bet.matchup} · {bet.selection} · {bet.book}{" "}
                  {formatAmerican(bet.americanOdds)} · EV {formatEv(bet.evPercent)} · {formatMoney(bet.stake)}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <div className="overflow-x-auto px-4 py-4 lg:px-6">
          <p className="mb-2 text-sm text-slate-400">
            Sorted by {SORT_LABEL[sortKey]}, {sortPhrase(sortKey, sortDir)}. The percent is the chance that side wins, not the chance the bet grows the bankroll.
          </p>
          <div className="mb-3 flex flex-wrap items-end gap-3 text-xs text-slate-400">
            <label className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1">
                Kickoff
                <HelpTip id="event" />
              </span>
              <select
                className={cn(controlClass, "py-1")}
                value={kickoff}
                onChange={(event) => setKickoff(event.target.value as KickoffFilter)}
              >
                <option value="all">All kickoffs</option>
                <option value="upcoming">Upcoming</option>
                <option value="sunday">This Sunday</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1">
                Market
                <HelpTip id="market" />
              </span>
              <select
                className={cn(controlClass, "py-1")}
                value={market}
                onChange={(event) => setMarket(event.target.value as MarketKey | "all")}
              >
                <option value="all">All markets</option>
                {MARKETS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1">
                Price
                <HelpTip id="bestBook" />
              </span>
              <select
                className={cn(controlClass, "py-1")}
                value={priceSide}
                onChange={(event) => setPriceSide(event.target.value as "all" | "favorite" | "underdog")}
              >
                <option value="all">Favorite or underdog</option>
                <option value="favorite">Favorites</option>
                <option value="underdog">Underdogs</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1">
                Benchmark
                <HelpTip id="sharpFair" />
              </span>
              <select
                className={cn(controlClass, "py-1")}
                value={benchmark}
                onChange={(event) => setBenchmark(event.target.value as "all" | "pinnacle" | "consensus")}
              >
                <option value="all">Any benchmark</option>
                <option value="pinnacle">Pinnacle</option>
                <option value="consensus">Consensus</option>
              </select>
            </label>
            <div className="flex min-w-52 flex-col gap-1">
              <span className="inline-flex items-center gap-1">
                Teams
                <HelpTip id="teams" />
              </span>
              <select
                className={cn(controlClass, "py-1")}
                value=""
                aria-label="Add a team"
                onChange={(event) => {
                  const team = event.target.value;
                  if (!team) return;
                  setPickedTeams((current) => (current.includes(team) ? current : [...current, team]));
                }}
              >
                <option value="">{pickedTeams.length === 0 ? "All teams" : "Add a team"}</option>
                {teams.map((team) => (
                  <option key={team} value={team} disabled={pickedTeams.includes(team)}>
                    {team}
                  </option>
                ))}
              </select>
              {pickedTeams.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {pickedTeams.map((team) => (
                    <button
                      key={team}
                      type="button"
                      className="rounded border border-slate-700 px-2 py-1 text-slate-200"
                      onClick={() => setPickedTeams((current) => current.filter((item) => item !== team))}
                    >
                      {team} ×
                    </button>
                  ))}
                  <button type="button" className="px-1 text-slate-500" onClick={() => setPickedTeams([])}>
                    Clear
                  </button>
                </span>
              ) : null}
            </div>
            <label className="flex flex-col gap-1">
              Book
              <select className={cn(controlClass, "py-1")} value={bookFilter} onChange={(event) => setBookFilter(event.target.value)}>
                <option value="all">Any book</option>
                {RETAIL_BOOKS.map((book) => (
                  <option key={book.key} value={book.key}>
                    {book.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              Min win chance %
              <input
                className={cn(controlClass, "w-28 py-1")}
                type="number"
                min={0}
                max={100}
                step="1"
                value={minChance}
                onChange={(event) => setMinChance(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              Min edge %
              <input
                className={cn(controlClass, "w-24 py-1")}
                type="number"
                step="0.1"
                value={minEdge}
                onChange={(event) => setMinEdge(event.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 pb-2">
              <input type="checkbox" checked={hideStale} onChange={(event) => setHideStale(event.target.checked)} />
              Hide stale
            </label>
          </div>
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-800">
                <ColumnHead label="Event" help="event" sort="event" active={sortKey} dir={sortDir} onSort={toggleSort} />
                <ColumnHead label="Market" help="market" sort="market" active={sortKey} dir={sortDir} onSort={toggleSort} />
                <ColumnHead label="Best book" help="bestBook" sort="price" active={sortKey} dir={sortDir} onSort={toggleSort} />
                <ColumnHead label="Sharp fair" help="sharpFair" sort="chance" active={sortKey} dir={sortDir} onSort={toggleSort} />
                <ColumnHead label="Edge" help="edge" sort="edge" active={sortKey} dir={sortDir} onSort={toggleSort} />
                <ColumnHead label="Kelly stake" help="stake" sort="kelly" active={sortKey} dir={sortDir} onSort={toggleSort} />
                <ColumnHead
                  label="This bet"
                  help="simulator"
                  sorts={[
                    { key: "win", label: "Win" },
                    { key: "lose", label: "Lose" },
                  ]}
                  active={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <ColumnHead label="Line shop" help="lineShop" />
                <ColumnHead label="Actions" help="actions" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-2 py-8 text-slate-500">
                    {board ? "No rows match this filter." : "Scan markets to price the board. Demo mode does not spend odds credits."}
                  </td>
                </tr>
              ) : (
                rows.map((deal) => {
                  const quote = selectedQuote(deal, pickedBook, bookFilter);
                  const stake = stakeFor(deal, quote, bankroll, kelly);
                  const typed = rowBets[deal.id] ?? betAmount;
                  const sim = simulateStake(deal.trueProb, quote.decimalOdds, typed);
                  return (
                    <tr key={deal.id} className="border-b border-slate-900 align-top">
                      <td className="px-2 py-3">
                        <div className="font-medium">
                          {board?.mode === "demo" ? `Sample · ${deal.matchup}` : deal.matchup}
                        </div>
                        <div className={cn("text-xs", board?.mode === "demo" ? "text-amber-300" : "text-slate-500")}>
                          {board?.mode === "demo" ? "Practice slate, not a real kickoff" : formatWhen(deal.commenceTime)}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div>{marketLabel(deal.marketKey)}</div>
                        <div className="text-slate-300">{deal.selection}</div>
                      </td>
                      <td className="px-2 py-3">
                        <div>{quote.bookmakerTitle}</div>
                        <div className="font-medium">{formatAmerican(quote.americanOdds)}</div>
                        {quote.staleRisk ? <div className="text-xs text-amber-300">Stale vs sharp</div> : null}
                      </td>
                      <td className="px-2 py-3">
                        <div>{formatAmerican(deal.fairAmericanOdds)}</div>
                        <div className="text-xs text-slate-500">
                          {formatProb(deal.trueProb)} chance this side wins · {deal.benchmarkSource}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <span
                          className={cn(
                            "rounded px-2 py-1 text-xs font-semibold",
                            quote.evPercent > DESK.evHighlightPercent
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "text-slate-300",
                          )}
                        >
                          {formatEv(quote.evPercent)}
                        </span>
                      </td>
                      <td className="px-2 py-3">{formatMoney(stake)}</td>
                      <td className="px-2 py-3">
                        <input
                          className={cn(controlClass, "w-20 py-1")}
                          type="number"
                          min={0}
                          step="1"
                          aria-label={`Bet amount for ${deal.selection}`}
                          value={typed}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            setRowBets((current) => ({
                              ...current,
                              [deal.id]: Number.isFinite(next) && next > 0 ? next : 0,
                            }));
                          }}
                        />
                        {sim.lossIfMiss > 0 ? (
                          <div className="mt-2 w-40 text-xs">
                            <div className="text-emerald-300">
                              Win {formatMoney(sim.profitIfWin)} · {formatProb(deal.trueProb)}
                            </div>
                            <div className="text-rose-300">
                              Lose {formatMoney(sim.lossIfMiss)} · {formatProb(1 - deal.trueProb)}
                            </div>
                            <PayoutBar profit={sim.profitIfWin} loss={sim.lossIfMiss} />
                            <div className="mt-1 text-slate-500">Expected {formatMoney(sim.expectedProfit)}</div>
                            {quote.americanOdds > 0 ? (
                              <div className="mt-1 text-slate-400">Bigger payout. Lower chance.</div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-slate-500">Enter a bet amount</div>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-1">
                          {deal.quotes.map((item) => (
                            <button
                              key={item.bookmakerKey}
                              type="button"
                              onClick={() => setPickedBook((current) => ({ ...current, [deal.id]: item.bookmakerKey }))}
                              className={cn(
                                "rounded border px-2 py-1 text-xs",
                                item.bookmakerKey === quote.bookmakerKey
                                  ? "border-emerald-500 text-emerald-200"
                                  : "border-slate-700 text-slate-300",
                              )}
                            >
                              {item.bookmakerTitle} {formatAmerican(item.americanOdds)}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-col items-start gap-2">
                          <button type="button" className="text-sm text-emerald-300" onClick={() => void ask("brief", deal)}>
                            AI Brief
                          </button>
                          <button type="button" className="text-sm text-slate-200" onClick={() => toggleLike(deal)}>
                            {liked.some((item) => item.id === `${deal.id}|${quote.bookmakerKey}`) ? "Saved" : "Save"}
                          </button>
                          <button
                            type="button"
                            disabled={!quote.link}
                            onClick={() => approve(deal)}
                            className="inline-flex items-center gap-1 text-sm disabled:text-slate-600"
                            title={quote.link ? "Open the sportsbook betslip" : "This book did not provide a betslip link"}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Approve & open betslip
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      <BriefDrawer
        open={drawerOpen}
        loading={drawerLoading}
        error={drawerError}
        result={analysis}
        facts={facts}
        onClose={() => setDrawerOpen(false)}
      />
    </main>
    </GuideProvider>
  );
}

function readSavedBoard(): SavedBoard | null {
  const raw = window.sessionStorage.getItem(BOARD_KEY);
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as Partial<SavedBoard>;
    if (!saved || typeof saved.savedAt !== "string" || !saved.board || !Array.isArray(saved.board.deals)) return null;
    if (!isSportKey(saved.sport ?? "")) return null;
    if (saved.market !== "all" && !MARKETS.some((item) => item.key === saved.market)) return null;
    if (saved.kelly !== 0.25 && saved.kelly !== 0.5 && saved.kelly !== 1) return null;
    if (typeof saved.bankroll !== "number" || !Number.isFinite(saved.bankroll)) return null;
    if (typeof saved.positiveOnly !== "boolean" || typeof saved.demo !== "boolean") return null;
    if (saved.seatChoice !== "adaptive" && saved.seatChoice !== "1" && saved.seatChoice !== "2" && saved.seatChoice !== "3" && saved.seatChoice !== "custom") {
      return null;
    }
    if (saved.board.mode !== "live" && saved.board.mode !== "demo") return null;
    return saved as SavedBoard;
  } catch {
    return null;
  }
}

function numberFilter(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sortPhrase(key: SortKey, dir: "asc" | "desc"): string {
  if (key === "event") return dir === "asc" ? "soonest first" : "latest first";
  if (key === "market") return dir === "asc" ? "A to Z" : "Z to A";
  return dir === "desc" ? "highest first" : "lowest first";
}

function compareSort(
  a: Deal,
  b: Deal,
  key: SortKey,
  picked: Record<string, string>,
  bookFilter: string,
  bankroll: number,
  kelly: number,
  rowBets: Record<string, number>,
  betAmount: number,
): number {
  if (key === "event") return Date.parse(a.commenceTime) - Date.parse(b.commenceTime);
  if (key === "market") return `${a.marketKey} ${a.selection}`.localeCompare(`${b.marketKey} ${b.selection}`);
  const quoteA = selectedQuote(a, picked, bookFilter);
  const quoteB = selectedQuote(b, picked, bookFilter);
  if (key === "price") return quoteA.decimalOdds - quoteB.decimalOdds;
  if (key === "chance") return a.trueProb - b.trueProb;
  if (key === "edge") return quoteA.evPercent - quoteB.evPercent;
  if (key === "kelly") return stakeFor(a, quoteA, bankroll, kelly) - stakeFor(b, quoteB, bankroll, kelly);
  const simA = simulateStake(a.trueProb, quoteA.decimalOdds, rowBets[a.id] ?? betAmount);
  const simB = simulateStake(b.trueProb, quoteB.decimalOdds, rowBets[b.id] ?? betAmount);
  if (key === "win") return simA.profitIfWin - simB.profitIfWin;
  if (key === "lose") return simA.lossIfMiss - simB.lossIfMiss;
  return simA.expectedProfit - simB.expectedProfit;
}

function LikedList({
  bets,
  onOpen,
  onRemove,
}: {
  bets: LikedBet[];
  onOpen: (bet: LikedBet) => void;
  onRemove: (id: string) => void;
}) {
  if (bets.length === 0) {
    return (
      <section className="px-4 py-4 lg:px-6">
        <p className="text-sm text-slate-400">Save a row on the board. It stays in this browser until you remove it, so you can read it while you place the bet.</p>
      </section>
    );
  }
  const ordered = [...bets].sort((a, b) => Date.parse(a.commenceTime) - Date.parse(b.commenceTime) || a.matchup.localeCompare(b.matchup));
  const summary = summarizeStakes(ordered.map(stakeLeg));
  const groups = likedGroups(ordered);
  const stacked = groups.filter((group) => group.bets.length > 1);
  return (
    <section className="px-4 py-4 lg:px-6">
      <LikedSummary summary={summary} stacked={stacked} />
      <div className="space-y-4">
        {groups.map((group) => {
          const game = summarizeStakes(group.bets.map(stakeLeg));
          return (
            <div key={group.key}>
              {groups.length > 1 ? (
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-medium">{group.matchup}</h3>
                  <p className="text-xs text-slate-400">
                    Put down {formatMoney(game.stake)} · if all win +{formatMoney(game.profitIfAllWin)} · at risk {formatMoney(game.lossIfAllMiss)}
                  </p>
                </div>
              ) : null}
              <ul className="space-y-2">
                {group.bets.map((bet) => {
                  const sim = simulateStake(bet.trueProb, bet.decimalOdds, bet.betAmount);
                  return (
                    <li key={bet.id} className="rounded border border-slate-800 px-3 py-3 text-sm">
                      <div className="font-medium">{bet.matchup}</div>
                      <div className="mt-1 text-slate-400">
                        {formatWhen(bet.commenceTime)} · {bet.marketLabel} · {bet.selection}
                      </div>
                      <div className="mt-1">
                        {bet.book} {formatAmerican(bet.americanOdds)} · {formatProb(bet.trueProb)} chance · edge {formatEv(bet.evPercent)}
                      </div>
                      <div className="mt-1 text-emerald-300">Win {formatMoney(sim.profitIfWin)} on {formatMoney(bet.betAmount)}</div>
                      <div className="text-rose-300">Lose {formatMoney(sim.lossIfMiss)}</div>
                      <div className="mt-2 flex gap-3">
                        <button type="button" className="text-emerald-300 disabled:text-slate-600" disabled={!bet.link} onClick={() => onOpen(bet)}>
                          Open betslip
                        </button>
                        <button type="button" className="text-slate-400" onClick={() => onRemove(bet.id)}>
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function stakeLeg(bet: LikedBet): { trueProb: number; decimalOdds: number; stake: number } {
  return { trueProb: bet.trueProb, decimalOdds: bet.decimalOdds, stake: bet.betAmount };
}

function likedGroups(bets: LikedBet[]): { key: string; matchup: string; bets: LikedBet[] }[] {
  const groups: { key: string; matchup: string; bets: LikedBet[] }[] = [];
  for (const bet of bets) {
    const key = `${bet.matchup}|${bet.commenceTime}`;
    const existing = groups.find((group) => group.key === key);
    if (existing) existing.bets.push(bet);
    else groups.push({ key, matchup: bet.matchup, bets: [bet] });
  }
  return groups;
}

function LikedSummary({
  summary,
  stacked,
}: {
  summary: StakeSummary;
  stacked: { key: string; matchup: string; bets: LikedBet[] }[];
}) {
  const cashBack = summary.stake + summary.profitIfAllWin;
  return (
    <div className="mb-4 rounded border border-slate-800 p-3">
      <h2 className="text-sm font-medium">This list</h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Put down</dt>
          <dd className="text-lg text-slate-100">{formatMoney(summary.stake)}</dd>
          <dd className="text-xs text-slate-400">{summary.count} {summary.count === 1 ? "bet" : "bets"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">If every one wins</dt>
          <dd className="text-lg text-emerald-300">+{formatMoney(summary.profitIfAllWin)}</dd>
          <dd className="text-xs text-slate-400">
            {summary.count > 1 ? `${formatMoney(cashBack)} comes back on separate tickets` : `${formatMoney(cashBack)} comes back`}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Cash at risk</dt>
          <dd className="text-lg text-rose-300">{formatMoney(summary.lossIfAllMiss)}</dd>
          <dd className="text-xs text-slate-400">lost if every one misses</dd>
        </div>
      </dl>
      <MoneyScale profit={summary.profitIfAllWin} risk={summary.lossIfAllMiss} />
      <p className="mt-3 text-sm text-slate-400">
        Expected {formatMoney(summary.expectedProfit)} if each desk chance is right. Sunday pays the wins or takes the losses.
      </p>
      {stacked.map((group) => (
        <div key={group.key} className="mt-2 space-y-2 text-sm text-slate-300">
          <p className="text-slate-400">
            {group.matchup} has {group.bets.length} bets on one kickoff. They can all lose together. Each chance on a row is for that bet alone.
          </p>
          {placementNotes(group.bets).map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      ))}
    </div>
  );
}

function placementNotes(bets: LikedBet[]): string[] {
  const byBook = new Map<string, LikedBet[]>();
  for (const bet of bets) {
    const rows = byBook.get(bet.book) ?? [];
    rows.push(bet);
    byBook.set(bet.book, rows);
  }
  const notes: string[] = [];
  for (const [book, rows] of byBook) {
    if (rows.length < 2) continue;
    const team = sameSideTeam(rows);
    if (team) {
      notes.push(
        `Place each ${book} bet by itself. ${book} rejects the ${team} moneyline and the ${team} spread on one slip. Covering that spread already wins the moneyline. The profit above is what the separate tickets pay if each one wins.`,
      );
    } else {
      notes.push(
        `Place each ${book} bet by itself. When ${book} offers a combined ticket, that price belongs to ${book}. These rows stay separate.`,
      );
    }
  }
  return notes;
}

function sameSideTeam(bets: LikedBet[]): string | null {
  const moneylines = bets.filter((bet) => bet.marketLabel === "Moneyline");
  const spreads = bets.filter((bet) => bet.marketLabel === "Spreads");
  for (const moneyline of moneylines) {
    for (const spread of spreads) {
      if (moneyline.book !== spread.book) continue;
      if (spread.selection === moneyline.selection || spread.selection.startsWith(`${moneyline.selection} `)) {
        return moneyline.selection;
      }
    }
  }
  return null;
}

function MoneyScale({ profit, risk }: { profit: number; risk: number }) {
  const scale = Math.max(profit, risk, 0.01);
  return (
    <div className="mt-3 space-y-1">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="w-24">Best profit</span>
        <div className="h-2 flex-1 rounded bg-slate-800" aria-hidden>
          <div className="h-2 rounded bg-emerald-500" style={{ width: `${(profit / scale) * 100}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="w-24">Cash at risk</span>
        <div className="h-2 flex-1 rounded bg-slate-800" aria-hidden>
          <div className="h-2 rounded bg-rose-500" style={{ width: `${(risk / scale) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function AiBets({
  cash,
  onCash,
  onlyFair,
  onOnlyFair,
  everyGame,
  onEveryGame,
  bookLabel,
  deals,
  plan,
  pickedBook,
  bookFilter,
  onRead,
  onOpen,
}: {
  cash: number;
  onCash: (value: number) => void;
  onlyFair: boolean;
  onOnlyFair: (value: boolean) => void;
  everyGame: boolean;
  onEveryGame: (value: boolean) => void;
  bookLabel: string;
  deals: Deal[];
  plan: ReturnType<typeof planSundayCash>;
  pickedBook: Record<string, string>;
  bookFilter: string;
  onRead: (deal: Deal, stake: number) => void;
  onOpen: (deal: Deal, stake: number) => void;
}) {
  const byId = new Map(deals.map((deal) => [deal.id, deal]));
  const played = plan.stakes.flatMap((item) => {
    const deal = byId.get(item.id);
    if (!deal) return [];
    const quote = selectedQuote(deal, pickedBook, bookFilter);
    return [{ deal, quote, stake: item.stake, sim: simulateStake(deal.trueProb, quote.decimalOdds, item.stake) }];
  });
  const waiting = plan.considered
    .filter((id) => !plan.stakes.some((item) => item.id === id))
    .flatMap((id) => {
      const deal = byId.get(id);
      return deal ? [deal] : [];
    });
  const summary = summarizeStakes(
    played.map((item) => ({ trueProb: item.deal.trueProb, decimalOdds: item.quote.decimalOdds, stake: item.stake })),
  );
  const comesBack = summary.stake + summary.profitIfAllWin;
  return (
    <section className="px-4 py-4 lg:px-6">
      <div className="max-w-3xl rounded border border-slate-800 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              Sunday cash
              <HelpTip id="aiBets" />
            </span>
            <input
              className={cn(controlClass, "w-28")}
              type="number"
              min={0}
              step={1}
              value={cash}
              onChange={(event) => onCash(Math.max(0, Number(event.target.value) || 0))}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Spread
            <select
              className={controlClass}
              value={everyGame ? "every" : "one"}
              onChange={(event) => onEveryGame(event.target.value === "every")}
            >
              <option value="one">One game</option>
              <option value="every">Every game</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-300">
            <input type="checkbox" checked={onlyFair} onChange={(event) => onOnlyFair(event.target.checked)} />
            Only better than fair
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">{bookLabel}. This Sunday. The best chance in each game.</p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Place</dt>
            <dd className="text-lg text-slate-100">{formatMoney(plan.placed)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Left unbet</dt>
            <dd className="text-lg text-slate-100">{formatMoney(plan.left)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">If all win</dt>
            <dd className="text-lg text-emerald-300">{played.length > 0 ? `+${formatMoney(summary.profitIfAllWin)}` : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Comes back</dt>
            <dd className="text-lg text-slate-100">{played.length > 0 ? formatMoney(comesBack) : "—"}</dd>
          </div>
        </dl>
        {played.length > 0 ? (
          <p className="mt-2 text-sm text-slate-400">Expected {formatMoney(summary.expectedProfit)} if each desk chance is right.</p>
        ) : null}
        {played.length === 0 ? (
          <p className="mt-3 text-sm text-slate-300">
            {plan.considered.length === 0
              ? "This Sunday has no fresh prices on the board. Scan, and this tab will place the cash."
              : "No Sunday price at this book pays more than fair. The cash stays unbet while this box is checked."}
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {played.map(({ deal, quote, stake, sim }) => (
              <li key={deal.id} className="rounded border border-slate-800 px-3 py-3 text-sm">
                <div className="font-medium">{deal.matchup}</div>
                <div className="mt-1 text-slate-400">
                  {formatWhen(deal.commenceTime)} · {marketLabel(deal.marketKey)} · {deal.selection}
                </div>
                <div className="mt-1">
                  {quote.bookmakerTitle} {formatAmerican(quote.americanOdds)} · {formatProb(deal.trueProb)} chance · edge {formatEv(quote.evPercent)}
                </div>
                <div className="mt-1 text-emerald-300">Win {formatMoney(sim.profitIfWin)} on {formatMoney(stake)}</div>
                <div className="text-slate-400">Comes back {formatMoney(stake + sim.profitIfWin)}</div>
                <div className="text-rose-300">Lose {formatMoney(sim.lossIfMiss)}</div>
                <div className="mt-1 text-slate-400">Expected {formatMoney(sim.expectedProfit)}</div>
                <div className="mt-2 flex gap-3">
                  <button type="button" className="text-emerald-300" onClick={() => onRead(deal, stake)}>
                    AI read
                  </button>
                  <button type="button" className="text-emerald-300 disabled:text-slate-600" disabled={!quote.link} onClick={() => onOpen(deal, stake)}>
                    Open betslip
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {played.length > 0 && plan.mode === "spend" && plan.spread === "one" ? (
          <p className="mt-3 text-sm text-slate-400">
            One game gets the whole stake: the side with the best chance to win. That is the most likely way for the cash to come back with a profit. A loss takes the stake.
          </p>
        ) : null}
        {played.length > 0 && plan.mode === "spend" && plan.spread === "every" ? (
          <p className="mt-3 text-sm text-slate-400">
            Every Sunday game gets its best-chance side, and the cash is split evenly. Comes back on a row is that ticket alone. The total comes back only when every ticket wins. Each one is a separate bet.
          </p>
        ) : null}
        {plan.mode === "fair-only" && played.length > 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            The stake is quarter Kelly. A small edge on this cash is a small bet, often cents. The rest stays unbet so one miss does not take the whole amount.
          </p>
        ) : null}
        <p className="mt-2 text-sm text-slate-500">
          The pick is the desk win chance from the prices. Game and team notes are not in that chance, so they do not change the stake.
        </p>
        {waiting.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Not played</p>
            <ul className="mt-2 space-y-2">
              {waiting.map((deal) => {
                const quote = selectedQuote(deal, pickedBook, bookFilter);
                return (
                  <li key={deal.id} className="text-sm text-slate-400">
                    {deal.matchup} · {marketLabel(deal.marketKey)} · {deal.selection} · {quote.bookmakerTitle}{" "}
                    {formatAmerican(quote.americanOdds)} · {formatProb(deal.trueProb)} chance · edge {formatEv(quote.evPercent)}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function teamNames(deals: Deal[]): string[] {
  const names = new Set<string>();
  for (const deal of deals) {
    for (const name of deal.matchup.split(" @ ")) {
      if (name) names.add(name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function sundayWindow(now: Date): { start: number; end: number } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  if (day !== 0) start.setDate(start.getDate() + (7 - day));
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

function selectedQuote(deal: Deal, picked: Record<string, string>, bookFilter = "all"): Quote {
  if (bookFilter !== "all") {
    const forced = deal.quotes.find((quote) => quote.bookmakerKey === bookFilter);
    if (forced) return forced;
  }
  return deal.quotes.find((quote) => quote.bookmakerKey === picked[deal.id]) ?? deal.quotes[0];
}

function isLikedBet(value: LikedBet): boolean {
  return Boolean(
    value &&
      typeof value.id === "string" &&
      typeof value.matchup === "string" &&
      typeof value.decimalOdds === "number" &&
      typeof value.trueProb === "number" &&
      typeof value.betAmount === "number",
  );
}

function stakeFor(deal: Deal, quote: Quote, bankroll: number, kelly: number): number {
  return displayStake(calculateKellyStake(deal.trueProb, quote.decimalOdds, bankroll, kelly));
}

function marketLabel(key: MarketKey): string {
  return MARKETS.find((market) => market.key === key)?.label ?? key;
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: HelpId;
  children: React.ReactElement<{ id?: string }>;
}) {
  const fieldId = useId();
  return (
    <div className="flex flex-col gap-1 text-xs text-slate-400">
      <span className="inline-flex items-center gap-1">
        <label htmlFor={fieldId}>{label}</label>
        {help ? <HelpTip id={help} /> : null}
      </span>
      {cloneElement(children, { id: fieldId })}
    </div>
  );
}

function PayoutBar({ profit, loss }: { profit: number; loss: number }) {
  const total = profit + loss;
  const winShare = total > 0 ? (profit / total) * 100 : 0;
  return (
    <div className="mt-1 flex h-2 overflow-hidden rounded bg-slate-800" aria-hidden>
      <div className="bg-emerald-500" style={{ width: `${winShare}%` }} />
      <div className="bg-rose-500" style={{ width: `${100 - winShare}%` }} />
    </div>
  );
}

function ColumnHead({
  label,
  help,
  sort,
  sorts,
  active,
  dir,
  onSort,
}: {
  label: string;
  help: HelpId;
  sort?: SortKey;
  sorts?: { key: SortKey; label: string }[];
  active?: SortKey;
  dir?: "asc" | "desc";
  onSort?: (key: SortKey) => void;
}) {
  const selected = sort !== undefined && sort === active;
  const buttons = sorts ?? (sort ? [{ key: sort, label }] : []);
  return (
    <th className="px-2 py-2 font-medium" aria-sort={selected || sorts?.some((item) => item.key === active) ? (dir === "asc" ? "ascending" : "descending") : undefined}>
      <span className="inline-flex items-center gap-1">
        {buttons.length > 0 && onSort ? (
          buttons.map((item) => {
            const on = item.key === active;
            return (
              <button
                key={item.key}
                type="button"
                className={cn("uppercase tracking-wide", on ? "text-slate-200" : "text-slate-500")}
                onClick={() => onSort(item.key)}
              >
                {item.label}
                {on ? (dir === "asc" ? " ↑" : " ↓") : ""}
              </button>
            );
          })
        ) : (
          label
        )}
        {sorts ? <span className="normal-case tracking-normal text-slate-600">{label}</span> : null}
        <HelpTip id={help} />
      </span>
    </th>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded border border-slate-800 px-2 py-1 text-slate-300">{children}</span>;
}

function tabClass(active: boolean): string {
  return cn("rounded px-3 py-1.5 text-sm", active ? "bg-slate-800 text-white" : "text-slate-400");
}

const controlClass = "rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100";

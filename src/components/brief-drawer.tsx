"use client";

import { X } from "lucide-react";
import { HelpTip } from "@/components/help-tip";
import { formatAmerican, formatEv, formatMoney, formatProb } from "@/lib/format";
import type { AnalyzeResponse } from "@/lib/models/response";

export type DrawerFacts = {
  matchup: string;
  selection: string;
  book: string;
  americanOdds: number;
  fairAmerican: number;
  trueProb: number;
  evPercent: number;
  stake: number;
  benchmarkSource: string;
};

export function BriefDrawer({
  open,
  loading,
  error,
  result,
  facts,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  error: string | null;
  result: AnalyzeResponse | null;
  facts: DrawerFacts | null;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/70">
      <button type="button" className="h-full flex-1" aria-label="Close brief" onClick={onClose} />
      <aside className="flex h-full w-full max-w-3xl flex-col border-l border-slate-800 bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {result?.task === "slate" ? "Slate compare" : "Analyst brief"}
              {result?.demo ? " · Demo models" : ""}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{facts?.matchup ?? "Current board"}</h2>
            {facts ? (
              <div className="mt-2 text-sm text-slate-300">
                <p className="text-base text-slate-100">Chance this side wins: {formatProb(facts.trueProb)}</p>
                <p className="mt-1">
                  {facts.selection} at {facts.book} {formatAmerican(facts.americanOdds)}. Fair price{" "}
                  {formatAmerican(facts.fairAmerican)}. Edge {formatEv(facts.evPercent)}. Suggested stake{" "}
                  {formatMoney(facts.stake)}.
                </p>
              </div>
            ) : null}
            {result ? (
              <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-300">
                {result.agreement.label}
                <HelpTip id="agreement" />
              </p>
            ) : null}
            {result?.catalogNote ? <p className="mt-2 text-sm text-amber-300">{result.catalogNote}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded border border-slate-700 p-2" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? <p className="text-sm text-slate-400">Asking the seated models…</p> : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {result?.task === "slate" && result.groups.length > 0 ? (
            <ul className="mb-4 space-y-2">
              {result.groups.map((group) => (
                <li key={group.id} className="rounded border border-slate-800 px-3 py-2 text-sm">
                  <span className="font-medium">{group.label}</span>
                  <span className="mt-1 block text-slate-400">
                    Named by {group.namedBy.length}: {group.namedBy.join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="grid gap-3 md:grid-cols-3">
            {result?.columns.map((column) => (
              <article key={column.id} className="rounded border border-slate-800 p-3 text-sm">
                <h3 className="font-medium">{column.displayName}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {column.tier} · {column.reason}
                  {column.latencyMs != null ? ` · ${column.latencyMs} ms` : ""}
                </p>
                {column.error ? <p className="mt-3 text-rose-300">{column.error}</p> : null}
                {column.brief ? (
                  <div className="mt-3 space-y-2 text-slate-200">
                    <p className="font-medium text-emerald-300">{verdictLabel(column.brief.verdict)}</p>
                    <p>{column.brief.chance}</p>
                    <p>{column.brief.price}</p>
                    <p>{column.brief.recommendation}</p>
                  </div>
                ) : null}
                {column.picks?.map((pick) => (
                  <p key={pick.id} className="mt-2 text-slate-300">
                    {pick.reason}
                  </p>
                ))}
                {column.flags.length > 0 ? (
                  <p className="mt-3 text-amber-300">Desk math stands. {column.flags.join(" ")}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function verdictLabel(verdict: "approve" | "pass" | "wait"): string {
  if (verdict === "approve") return "Look at this";
  if (verdict === "pass") return "Skip this";
  return "Wait";
}

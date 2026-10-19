"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { GUIDE_STEPS } from "@/components/help-copy";

const GUIDE_KEY = "betz-buddy-guide";

type GuideControls = {
  open: boolean;
  show: () => void;
  hide: () => void;
};

const GuideContext = createContext<GuideControls | null>(null);

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(GUIDE_KEY) !== "hidden") setOpen(true);
  }, []);

  function show() {
    window.localStorage.removeItem(GUIDE_KEY);
    setOpen(true);
  }

  function hide() {
    window.localStorage.setItem(GUIDE_KEY, "hidden");
    setOpen(false);
  }

  return <GuideContext.Provider value={{ open, show, hide }}>{children}</GuideContext.Provider>;
}

function useGuide(): GuideControls {
  const controls = useContext(GuideContext);
  if (!controls) throw new Error("Guide controls are available inside GuideProvider");
  return controls;
}

export function GuideButton() {
  const { open, show, hide } = useGuide();
  return (
    <button
      type="button"
      onClick={open ? hide : show}
      className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300"
      aria-expanded={open}
    >
      {open ? "Hide guide" : "Guide"}
    </button>
  );
}

export function GuidePanel() {
  const { open, hide } = useGuide();
  if (!open) return null;
  return (
    <section className="mx-4 mt-4 rounded border border-slate-700 bg-slate-900/70 px-4 py-3 lg:mx-6" aria-labelledby="desk-guide-title">
      <div className="flex items-start justify-between gap-3">
        <h2 id="desk-guide-title" className="text-sm font-semibold text-slate-100">
          How this desk works
        </h2>
        <button type="button" onClick={hide} className="text-xs text-slate-400 hover:text-slate-200">
          Hide guide
        </button>
      </div>
      <ol className="mt-3 grid gap-3 md:grid-cols-4">
        {GUIDE_STEPS.map((step, index) => (
          <li key={step.title}>
            <p className="text-xs text-slate-500">Step {index + 1}</p>
            <p className="text-sm font-medium text-slate-100">{step.title}</p>
            <p className="mt-1 text-sm text-slate-300">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

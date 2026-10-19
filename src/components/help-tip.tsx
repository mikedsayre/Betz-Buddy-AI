"use client";

import { CircleHelp } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HELP, type HelpId } from "@/components/help-copy";

export function HelpTip({ id }: { id: HelpId }) {
  const entry = HELP[id];
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function place() {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const width = 320;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const panelHeight = panelRef.current?.offsetHeight ?? 240;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow > panelHeight + 12 ? rect.bottom + 8 : Math.max(8, rect.top - panelHeight - 8);
      setCoords({ top, left });
    }
    place();
    const frame = window.requestAnimationFrame(place);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-500 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        aria-label={`Help: ${entry.title}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <CircleHelp className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-labelledby={titleId}
              style={{ top: coords.top, left: coords.left, width: 320 }}
              className="fixed z-50 max-h-[min(24rem,70vh)] overflow-y-auto rounded border border-slate-700 bg-slate-900 p-3 text-left text-sm font-normal normal-case tracking-normal text-slate-200 shadow-lg"
            >
              <h2 id={titleId} className="text-sm font-semibold text-slate-100">
                {entry.title}
              </h2>
              <HelpPart label="In plain terms">{entry.plain}</HelpPart>
              <HelpPart label="What to do">{entry.action}</HelpPart>
              <HelpPart label="The calculation">{entry.calculation}</HelpPart>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function HelpPart({ label, children }: { label: string; children: string }) {
  return (
    <p className="mt-2">
      <span className="block text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="mt-0.5 block">{children}</span>
    </p>
  );
}

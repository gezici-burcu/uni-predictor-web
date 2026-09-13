"use client";

import type { ReactNode } from "react";

type Props = {
  id: string;
  isOpen: boolean;
  onToggle: () => void;
  header: ReactNode;
  children: ReactNode;
  accent?: "blue" | "emerald";
  contentClassName?: string;
  compact?: boolean;
};

export const OPEN_ACCORDION_SECTION_CLASS_NAME = "min-h-0 flex-1 overflow-hidden";
export const CLOSED_ACCORDION_SECTION_CLASS_NAME = "shrink-0";
export const ACCORDION_CONTENT_CLASS_NAME = "min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-blue-50/30 p-3 pr-1 [scrollbar-gutter:stable] max-xl:max-h-[60vh] xl:max-h-none";

export function ScrollableAccordionSection({ id, isOpen, onToggle, header, children, accent = "blue", contentClassName = "", compact = false }: Props) {
  const contentId = `${id}-content`;
  const focusClass = accent === "emerald" ? "focus-visible:outline-emerald-600 hover:bg-emerald-50/40" : "focus-visible:outline-blue-600 hover:bg-slate-50";
  const iconClass = accent === "emerald" ? "text-emerald-700" : "text-blue-700";
  return (
    <section className={`flex min-w-0 flex-col border-b border-slate-200 last:border-b-0 ${isOpen ? OPEN_ACCORDION_SECTION_CLASS_NAME : CLOSED_ACCORDION_SECTION_CLASS_NAME}`}>
      <button type="button" aria-expanded={isOpen} aria-controls={contentId} onClick={onToggle} className={`accordion-toggle relative z-10 flex w-full shrink-0 cursor-pointer items-center justify-between text-left transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${isOpen ? "accordion-active" : "bg-white"} ${compact ? "gap-2 px-3 py-2.5" : "gap-3 px-4 py-3"} ${focusClass}`}>
        <div className="min-w-0 flex-1">{header}</div>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={`pointer-events-none shrink-0 transition-transform ${compact ? "h-4 w-4" : "h-5 w-5"} ${iconClass} ${isOpen ? "rotate-180" : ""}`}><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {isOpen ? <div id={contentId} className={`relative z-0 ${ACCORDION_CONTENT_CLASS_NAME} ${contentClassName}`}><div className="space-y-3 pr-2">{children}</div></div> : null}
    </section>
  );
}

import type { ReactNode } from "react";

export const SCROLLABLE_ACCORDION_LIST_CLASS_NAME =
  "flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm ring-1 ring-slate-200/70";

export function ScrollableAccordionList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${SCROLLABLE_ACCORDION_LIST_CLASS_NAME} ${className}`}>{children}</div>;
}

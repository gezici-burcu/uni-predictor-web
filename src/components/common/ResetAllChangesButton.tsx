"use client";

import { useAppLanguage } from "@/src/contexts/AppLanguageContext";

type ResetAllChangesButtonProps = {
  changedCount: number;
  onReset: () => void;
  methodologyName: string;
  className?: string;
};

export function ResetAllChangesButton({
  changedCount,
  onReset,
  methodologyName,
  className = "",
}: ResetAllChangesButtonProps) {
  const { t } = useAppLanguage();
  return (
    <button
      type="button"
      onClick={onReset}
      disabled={changedCount === 0}
      aria-label={t("actions.resetAllAria").replace("{methodology}", methodologyName)}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:border-slate-200 disabled:hover:bg-slate-50 disabled:hover:text-slate-400 ${className}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h11a5 5 0 1 1-4.6 7"/><path d="m7 4-3 3 3 3"/></svg>
      {t("actions.resetAll")}
    </button>
  );
}

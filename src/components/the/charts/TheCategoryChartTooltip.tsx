"use client";

import type { TooltipContentProps } from "recharts";
import { formatChartScore, type TheCategoryChartDatum } from "./theChartData";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";

const isChartDatum = (value: unknown): value is TheCategoryChartDatum => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<TheCategoryChartDatum>;
  return typeof candidate.label === "string" && "current" in candidate && "scenario" in candidate;
};

export function TheCategoryChartTooltip({ active, payload }: TooltipContentProps) {
  const { t, locale } = useAppLanguage();
  const datum = payload?.[0]?.payload;
  if (!active || !isChartDatum(datum)) return null;
  const difference = datum.current !== null && datum.scenario !== null ? datum.scenario - datum.current : null;
  const formattedDifference = difference === null ? "—" : `${difference > 0 ? "+" : ""}${formatChartScore(difference, locale)}`;

  return (
    <div className="min-w-48 rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-sm text-slate-200 shadow-2xl backdrop-blur-xl">
      <p className="border-b border-white/10 pb-2 font-bold text-white">{datum.label}</p>
      <dl className="mt-2 space-y-1.5 text-slate-300">
        <div className="flex justify-between gap-6"><dt className="flex items-center gap-2"><span className="size-2 rounded-full bg-indigo-400"/>{t("theUi.current")}</dt><dd className="font-bold tabular-nums text-indigo-300">{formatChartScore(datum.current, locale)}</dd></div>
        <div className="flex justify-between gap-6"><dt className="flex items-center gap-2"><span className="size-2 rounded-full bg-teal-400"/>{t("theUi.scenario")}</dt><dd className="font-bold tabular-nums text-teal-300">{formatChartScore(datum.scenario, locale)}</dd></div>
        <div className="mt-2 flex justify-between gap-6 rounded-lg bg-white/5 px-2 py-1.5"><dt>{t("theUi.difference")}</dt><dd className="font-bold tabular-nums text-white">{formattedDifference}</dd></div>
      </dl>
    </div>
  );
}

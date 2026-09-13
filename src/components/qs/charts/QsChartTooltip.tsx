"use client";

import type { TooltipContentProps } from "recharts";
import { formatQsChartScore } from "./qsChartData";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";

type Datum = { label: string; weight?: number; current: number | null; scenario: number | null };
const isDatum = (value: unknown): value is Datum => typeof value === "object" && value !== null && typeof (value as Datum).label === "string" && "current" in value && "scenario" in value;

export function QsChartTooltip({ active, payload }: TooltipContentProps) {
  const { t, locale } = useAppLanguage();
  const datum = payload?.[0]?.payload;
  if (!active || !isDatum(datum)) return null;
  const difference = datum.current === null || datum.scenario === null ? null : datum.scenario - datum.current;
  return <div className="max-w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-sm text-slate-200 shadow-2xl backdrop-blur-xl"><p className="border-b border-white/10 pb-2 font-bold text-white">{datum.label}</p><dl className="mt-2 space-y-1.5 text-slate-300"><div className="flex justify-between gap-6"><dt className="flex items-center gap-2"><span className="size-2 rounded-full bg-indigo-400"/>{t("qsUi.current")}</dt><dd className="font-bold text-indigo-300">{formatQsChartScore(datum.current, locale)}</dd></div><div className="flex justify-between gap-6"><dt className="flex items-center gap-2"><span className="size-2 rounded-full bg-cyan-400"/>{t("qsUi.scenario")}</dt><dd className="font-bold text-cyan-300">{formatQsChartScore(datum.scenario, locale)}</dd></div><div className="mt-2 flex justify-between gap-6 rounded-lg bg-white/5 px-2 py-1.5"><dt>{t("qsUi.difference")}</dt><dd className="font-bold text-white">{difference === null ? "—" : `${difference > 0 ? "+" : ""}${formatQsChartScore(difference, locale)}`}</dd></div>{datum.weight === undefined ? null : <div className="flex justify-between gap-6 px-2"><dt>{t("qsUi.weight")}</dt><dd className="font-semibold">%{formatQsChartScore(datum.weight * 100, locale)}</dd></div>}</dl></div>;
}

"use client";

import type { TooltipContentProps } from "recharts";

type Datum = { label: string; current: number | null; scenario: number | null; maximumScore: number };
const isDatum = (value: unknown): value is Datum => typeof value === "object" && value !== null && "label" in value && "current" in value && "scenario" in value && "maximumScore" in value;
const format = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(value);

export function UiGreenMetricChartTooltip({ active, payload }: TooltipContentProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !isDatum(datum)) return null;
  const difference = datum.current === null || datum.scenario === null ? null : datum.scenario - datum.current;
  return <div className="min-w-52 rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-sm text-slate-200 shadow-2xl backdrop-blur-xl"><p className="border-b border-white/10 pb-2 font-bold text-white">{datum.label}</p><dl className="mt-2 space-y-1.5"><div className="flex justify-between gap-6"><dt className="flex items-center gap-2"><span className="size-2 rounded-full bg-indigo-400"/>Mevcut</dt><dd className="font-bold text-indigo-300">{format(datum.current)} / {format(datum.maximumScore)}</dd></div><div className="flex justify-between gap-6"><dt className="flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-400"/>Senaryo</dt><dd className="font-bold text-emerald-300">{format(datum.scenario)} / {format(datum.maximumScore)}</dd></div><div className="mt-2 flex justify-between rounded-lg bg-white/5 px-2 py-1.5"><dt>Fark</dt><dd className="font-bold text-white">{difference !== null && difference > 0 ? "+" : ""}{format(difference)}</dd></div></dl></div>;
}

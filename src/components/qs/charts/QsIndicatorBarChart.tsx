"use client";

import { useSyncExternalStore } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { QsChartTooltip } from "./QsChartTooltip";
import {
  formatQsChartScore,
  getRenderableQsChartData,
  hasMissingQsChartData,
  hasRenderableQsChartData,
  type QsIndicatorChartDatum,
} from "./qsChartData";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";

const subscribeToChartMount = () => () => undefined;
const getMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;

export function QsIndicatorBarChart({ data, isUpdating = false }: { data: QsIndicatorChartDatum[]; isUpdating?: boolean }) {
  const { t, locale } = useAppLanguage();
  const chartMounted = useSyncExternalStore(
    subscribeToChartMount,
    getMountedSnapshot,
    getServerMountedSnapshot,
  );
  const chartData = getRenderableQsChartData(data);
  const renderable = hasRenderableQsChartData(data);

  return (
    <section aria-label={t("qsUi.scoreChart")} aria-busy={isUpdating} className="chart-card relative min-w-0 overflow-hidden rounded-3xl border border-white/80 bg-white p-4 shadow-sm sm:p-5">
      <div aria-hidden="true" className="chart-card-orb"/>
      <div className="relative flex items-start gap-3"><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-lg shadow-blue-500/20"><svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V9m5 10V5m5 14v-7m5 7V3"/></svg></span><div><h2 className="text-base font-bold text-slate-950">{t("qsUi.scoreChart")}</h2>
      <p className="mt-1 text-sm text-slate-500">{t("qsUi.scoreChartDescription")}</p></div></div>
      {renderable && chartMounted ? (
        <div className={`h-[280px] w-full transition-opacity sm:h-[300px] ${isUpdating ? "opacity-60" : "opacity-100"}`} role="img" aria-label={t("qsUi.scoreChartAria")}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 24, right: 16, bottom: 52, left: 0 }} barCategoryGap="22%" barGap={4}>
              <defs><linearGradient id="qsCurrentBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#2563eb"/></linearGradient><linearGradient id="qsScenarioBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee"/><stop offset="100%" stopColor="#0d9488"/></linearGradient></defs>
              <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="#dbe4f0" />
              <XAxis dataKey="shortLabel" interval={0} tick={{ fontSize: 9, fill: "#475569", fontWeight: 600 }} angle={-25} textAnchor="end" height={76} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip content={(props) => <QsChartTooltip {...props} />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 10, fontSize: 12, fontWeight: 600 }} />
              <Bar name={t("qsUi.current")} dataKey="current" fill="url(#qsCurrentBar)" radius={[8, 8, 2, 2]} maxBarSize={30} background={{ fill: "#f1f5f9", radius: 8 }} isAnimationActive={false} />
              <Bar name={t("qsUi.scenario")} dataKey="scenario" fill="url(#qsScenarioBar)" radius={[8, 8, 2, 2]} maxBarSize={30} isAnimationActive={false} />
              <Line name="Senaryo trendi" dataKey="scenario" stroke="#0e7490" strokeWidth={2.25} dot={{ r: 3.5, fill: "#ffffff", stroke: "#0e7490", strokeWidth: 2 }} activeDot={{ r: 5 }} legendType="none" connectNulls isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : renderable ? (
        <div className="flex h-[280px] items-center justify-center rounded-xl bg-slate-50 px-6 text-center text-sm text-slate-500 sm:h-[300px]" data-testid="qs-bar-placeholder">{t("qsUi.chartPreparing")}</div>
      ) : (
        <div className="flex h-[280px] items-center justify-center rounded-xl bg-slate-50 px-6 text-center text-sm text-slate-500 sm:h-[300px]">{t("qsUi.chartInsufficient")}</div>
      )}
      {isUpdating ? <span className="absolute right-4 top-4 text-xs font-medium text-blue-700">{t("qsUi.chartUpdating")}</span> : null}
      <ul className="sr-only">{data.map((item) => <li key={item.key}>{item.label}: {t("qsUi.current")} {formatQsChartScore(item.current, locale)}, {t("qsUi.scenario")} {formatQsChartScore(item.scenario, locale)}</li>)}</ul>
      {renderable && hasMissingQsChartData(data) ? <p className="mt-2 text-xs text-slate-500">{t("qsUi.missingIndicators")}</p> : null}
    </section>
  );
}

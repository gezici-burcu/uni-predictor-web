"use client";

import { useSyncExternalStore } from "react";
import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { QsChartTooltip } from "./QsChartTooltip";
import {
  formatQsChartScore,
  getRenderableQsLensChartData,
  hasMissingQsLensChartData,
  hasRenderableQsLensChartData,
  type QsLensChartDatum,
} from "./qsChartData";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";

const subscribeToChartMount = () => () => undefined;
const getMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;

export function QsLensRadarChart({ data, isUpdating = false }: { data: QsLensChartDatum[]; isUpdating?: boolean }) {
  const { t, locale } = useAppLanguage();
  const chartMounted = useSyncExternalStore(
    subscribeToChartMount,
    getMountedSnapshot,
    getServerMountedSnapshot,
  );
  const chartData = getRenderableQsLensChartData(data);
  const renderable = hasRenderableQsLensChartData(data);

  return (
    <section aria-label={t("qsUi.lensChart")} aria-busy={isUpdating} className="chart-card relative min-w-0 overflow-hidden rounded-3xl border border-white/80 bg-white p-4 shadow-sm sm:p-5">
      <div aria-hidden="true" className="chart-card-orb"/>
      <div className="relative flex items-start gap-3"><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/20"><svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3 8 6-3 10H7L4 9l8-6Z"/><path d="m4 9 13 10M20 9 7 19M12 3v16"/></svg></span><div><h2 className="text-base font-bold text-slate-950">{t("qsUi.lensChart")}</h2>
      <p className="mt-1 text-sm text-slate-500">{t("qsUi.lensChartDescription")}</p></div></div>
      {renderable && chartMounted ? (
        <div className={`h-[280px] w-full transition-opacity sm:h-[300px] ${isUpdating ? "opacity-60" : "opacity-100"}`} role="img" aria-label={t("qsUi.lensChartAria")}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} outerRadius="68%" margin={{ top: 20, right: 36, bottom: 20, left: 36 }}>
              <defs><radialGradient id="qsRadarCurrent"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.38"/><stop offset="100%" stopColor="#2563eb" stopOpacity="0.08"/></radialGradient><radialGradient id="qsRadarScenario"><stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3"/><stop offset="100%" stopColor="#0d9488" stopOpacity="0.06"/></radialGradient></defs>
              <PolarGrid stroke="#cbd5e1" strokeDasharray="3 4" />
              <PolarAngleAxis dataKey="shortLabel" tick={{ fontSize: 10, fill: "#475569" }} />
              <PolarRadiusAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
              <Tooltip content={(props) => <QsChartTooltip {...props} />} />
              <Legend />
              <Radar name={t("qsUi.current")} dataKey="current" stroke="#4f46e5" fill="url(#qsRadarCurrent)" fillOpacity={1} strokeWidth={2.5} dot={{ r: 3, fill: "#4f46e5" }} isAnimationActive={false} />
              <Radar name={t("qsUi.scenario")} dataKey="scenario" stroke="#0891b2" fill="url(#qsRadarScenario)" fillOpacity={1} strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3, fill: "#0891b2" }} isAnimationActive={false} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : renderable ? (
        <div className="flex h-[280px] items-center justify-center rounded-xl bg-slate-50 px-6 text-center text-sm text-slate-500 sm:h-[300px]" data-testid="qs-radar-placeholder">{t("qsUi.chartPreparing")}</div>
      ) : (
        <div className="flex h-[280px] items-center justify-center rounded-xl bg-slate-50 px-6 text-center text-sm text-slate-500 sm:h-[300px]">{t("qsUi.chartInsufficient")}</div>
      )}
      {isUpdating ? <span className="absolute right-4 top-4 text-xs font-medium text-blue-700">{t("qsUi.chartUpdating")}</span> : null}
      <ul className="sr-only">{data.map((item) => <li key={item.key}>{item.label}: {t("qsUi.current")} {formatQsChartScore(item.current, locale)}, {t("qsUi.scenario")} {formatQsChartScore(item.scenario, locale)}</li>)}</ul>
      {renderable && hasMissingQsLensChartData(data) ? <p className="mt-2 text-xs text-slate-500">{t("qsUi.missingLenses")}</p> : null}
    </section>
  );
}

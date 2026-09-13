"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { memo } from "react";
import { TheCategoryChartTooltip } from "./TheCategoryChartTooltip";
import { TheChartCard, TheChartLegend } from "./TheChartCard";
import { TheChartEmptyState } from "./TheChartEmptyState";
import { formatChartScore, hasCompleteTheCategoryChartData, type TheCategoryChartDatum } from "./theChartData";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";

export const TheCategoryRadarChart = memo(function TheCategoryRadarChart({ data }: { data: TheCategoryChartDatum[] }) {
  const { t, locale } = useAppLanguage();
  return (
    <TheChartCard title={t("theUi.categoryDistribution")}>
      {hasCompleteTheCategoryChartData(data) ? (
        <div className="flex h-[280px] w-full flex-col sm:h-[300px]" role="img" aria-label={t("theUi.categoryDistributionAria")}>
          <div className="min-h-0 flex-1"><ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="68%" margin={{ top: 20, right: 36, bottom: 20, left: 36 }}>
              <defs><radialGradient id="theRadarCurrent"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.38"/><stop offset="100%" stopColor="#2563eb" stopOpacity="0.08"/></radialGradient><radialGradient id="theRadarScenario"><stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.3"/><stop offset="100%" stopColor="#0f766e" stopOpacity="0.06"/></radialGradient></defs>
              <PolarGrid stroke="#cbd5e1" strokeDasharray="3 4" />
              <PolarAngleAxis dataKey="shortLabel" tick={{ fontSize: 11, fill: "#475569" }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip content={(props) => <TheCategoryChartTooltip {...props} />} />
              <Radar name={t("theUi.current")} dataKey="current" stroke="#4f46e5" fill="url(#theRadarCurrent)" fillOpacity={1} strokeWidth={2.5} dot={{ r: 3, fill: "#4f46e5" }} isAnimationActive={false} />
              <Radar name={t("theUi.scenario")} dataKey="scenario" stroke="#0d9488" fill="url(#theRadarScenario)" fillOpacity={1} strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3, fill: "#0d9488" }} isAnimationActive={false} />
            </RadarChart>
          </ResponsiveContainer></div>
          <TheChartLegend current={t("theUi.current")} scenario={t("theUi.scenario")}/>
          <ul className="sr-only">{data.map((item) => <li key={item.key}>{item.label}: {t("theUi.current")} {formatChartScore(item.current, locale)}, {t("theUi.scenario")} {formatChartScore(item.scenario, locale)}</li>)}</ul>
        </div>
      ) : <TheChartEmptyState />}
    </TheChartCard>
  );
});

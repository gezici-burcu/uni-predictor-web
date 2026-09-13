"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { memo } from "react";
import { TheCategoryChartTooltip } from "./TheCategoryChartTooltip";
import { TheChartCard, TheChartLegend } from "./TheChartCard";
import { TheChartEmptyState } from "./TheChartEmptyState";
import { formatChartScore, hasCompleteTheCategoryChartData, type TheCategoryChartDatum } from "./theChartData";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";

export const TheCategoryBarChart = memo(function TheCategoryBarChart({ data }: { data: TheCategoryChartDatum[] }) {
  const { t, locale } = useAppLanguage();
  return (
    <TheChartCard title={t("theUi.scoreComparison")}>
      {hasCompleteTheCategoryChartData(data) ? (
        <div className="flex h-[280px] w-full flex-col sm:h-[300px]" role="img" aria-label={t("theUi.scoreChangeAria")}>
          <div className="min-h-0 flex-1"><ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 22, right: 18, bottom: 24, left: 0 }} barCategoryGap="22%" barGap={4}>
              <defs><linearGradient id="theCurrentBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#2563eb"/></linearGradient><linearGradient id="theScenarioBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2dd4bf"/><stop offset="100%" stopColor="#0f766e"/></linearGradient></defs>
              <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="#dbe4f0" />
              <XAxis dataKey="shortLabel" interval={0} tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }} tickMargin={12} height={48} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} width={34} axisLine={false} tickLine={false} />
              <Tooltip content={(props) => <TheCategoryChartTooltip {...props} />} />
              <Bar name={t("theUi.current")} dataKey="current" fill="url(#theCurrentBar)" radius={[9, 9, 2, 2]} maxBarSize={32} background={{ fill: "#f1f5f9", radius: 9 }} isAnimationActive={false} />
              <Bar name={t("theUi.scenario")} dataKey="scenario" fill="url(#theScenarioBar)" radius={[9, 9, 2, 2]} maxBarSize={32} isAnimationActive={false} />
              <Line name="Senaryo trendi" dataKey="scenario" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 4, fill: "#ffffff", stroke: "#0f766e", strokeWidth: 2.5 }} activeDot={{ r: 6 }} legendType="none" isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer></div>
          <TheChartLegend current={t("theUi.current")} scenario={t("theUi.scenario")}/>
          <ul className="sr-only">{data.map((item) => <li key={item.key}>{item.label}: {t("theUi.current")} {formatChartScore(item.current, locale)}, {t("theUi.scenario")} {formatChartScore(item.scenario, locale)}</li>)}</ul>
        </div>
      ) : <TheChartEmptyState />}
    </TheChartCard>
  );
});

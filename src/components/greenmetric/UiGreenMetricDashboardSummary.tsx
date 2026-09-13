"use client";

import { TheSummaryCard } from "@/src/components/the/TheSummaryCard";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { getTranslation } from "@/src/i18n/getTranslation";
import type { UiGreenMetricCalculationResult } from "@/src/lib/calculations/ui-greenmetric";

export function UiGreenMetricDashboardSummary({
  current,
  scenario,
  changedCount,
}: {
  current: UiGreenMetricCalculationResult;
  scenario: UiGreenMetricCalculationResult;
  changedCount: number;
}) {
  const { language } = useAppLanguage();
  const t = (key: string) => getTranslation(language, `greenMetricUi.${key}`);
  const format = (value: number | null, digits = 0) => value === null
    ? "—"
    : new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value);
  const difference = current.totalScore === null || scenario.totalScore === null
    ? null
    : scenario.totalScore - current.totalScore;
  const rankEstimate = changedCount === 0 ? current.rankEstimate : scenario.rankEstimate;
  const cards = [
    { title: t("currentScore"), value: format(current.totalScore), subtitle: t("publicBaseline") },
    { title: t("scenarioScore"), value: format(scenario.totalScore), subtitle: t("scenarioTotal") },
    {
      title: t("change"),
      value: difference !== null && difference > 0 ? `+${format(difference, 1)}` : format(difference, 1),
      subtitle: t("scoreDifference"),
      status: difference === null || difference === 0
        ? "default" as const
        : difference > 0
          ? "positive" as const
          : "negative" as const,
    },
    {
      title: t("estimatedRank"),
      value: rankEstimate.estimatedRankBand ?? "—",
      subtitle: rankEstimate.method === "unavailable"
        ? t("rankUnavailable")
        : rankEstimate.calibrationSourceType === "approximate-fallback"
          ? t("fallbackHistoricalEstimate")
          : t("historicalEstimate"),
      status: rankEstimate.estimatedRankBand === null ? "warning" as const : "default" as const,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 kpi-grid" data-testid="greenmetric-summary-cards">
        {cards.map((card) => <TheSummaryCard key={card.title} {...card} />)}
      </div>
      <div
        role={scenario.complete ? "status" : "alert"}
        className={`rounded-xl border px-4 py-3 text-sm ${scenario.complete ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}
      >
        <strong>{t("inputBasedCalculation")}</strong>
        <span aria-hidden="true"> · </span>
        <span>{t(scenario.complete ? "complete" : "missingData")}</span>
        {!scenario.complete ? (
          <span className="ml-1" title={scenario.missingIndicators.join(", ")}>
            {t("missingIndicatorsDetail")
              .replace("{count}", String(scenario.missingIndicators.length))
              .replace(/:\s*\{codes\}/, "")}
          </span>
        ) : null}
      </div>
    </div>
  );
}

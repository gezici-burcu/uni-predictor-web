"use client";

import type { TheStochasticSimulationResult } from "@/src/lib/the/stochastic/run-the-stochastic-simulation";
import { TheSummaryCard } from "./TheSummaryCard";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { formatTheScoreDifference } from "@/src/lib/the/format-the-score-difference";
import type { TheRankBandPresentation } from "@/src/lib/the/the-rank-band-source";

export function TheDashboardSummary({
  simulation,
  simulationUpdating = false,
  rankBands,
}: {
  simulation: TheStochasticSimulationResult;
  simulationUpdating?: boolean;
  rankBands?: TheRankBandPresentation;
}) {
  const { t, locale } = useAppLanguage();
  const formatScore = (value: number) => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.round((value + 1e-9) * 100) / 100);
  const difference = simulation.change.overallMedianDifference;
  const complete = simulation.scenario.calculationStatus !== "invalid";
  const statusValue = simulationUpdating
    ? t("theUi.updating")
    : complete
      ? t("theUi.complete")
      : t("theUi.incomplete");
  const cards = [
    {
      title: t("theUi.currentScore"),
      value: formatScore(simulation.current.overallMedian),
      subtitle: t("theUi.stochasticEstimate"),
      status: "default" as const,
    },
    {
      title: t("theUi.scenarioScore"),
      value: formatScore(simulation.scenario.overallMedian),
      subtitle: t("theUi.stochasticEstimate"),
      status: "default" as const,
    },
    {
      title: t("theUi.change"),
      value: formatTheScoreDifference(difference, locale),
      subtitle: t("theUi.medianDifference"),
      status:
        difference === 0
          ? "default" as const
          : difference > 0
            ? "positive" as const
            : "negative" as const,
    },
    {
      title: rankBands ? t("theUi.rankBands") : t("theUi.estimatedRankBand"),
      value: rankBands ? `${rankBands.currentBand ?? "—"} → ${rankBands.scenarioBand ?? "—"}` : simulation.change.rankBandTransition,
      subtitle: (rankBands?.scenarioBand ?? simulation.scenario.predictedRankBand) === null ? t("theUi.insufficientCoverageDetail") : rankBands?.currentSource === "official-reference" ? t("theUi.officialCurrentBandDetail") : t("theUi.referenceDistribution"),
      status: "default" as const,
    },
    {
      title: t("theUi.calculationStatus"),
      value: statusValue,
      valueClassName: "!text-[1.15rem] !leading-snug sm:!text-[1.25rem]",
      subtitle: t("theUi.runsModel").replace("{count}", new Intl.NumberFormat(locale).format(simulation.runCount)),
      status: simulationUpdating
        ? "default" as const
        : complete
          ? "positive" as const
          : "negative" as const,
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 kpi-grid">
      {cards.map((card) => (
        <TheSummaryCard key={card.title} {...card} />
      ))}
    </div>
  );
}

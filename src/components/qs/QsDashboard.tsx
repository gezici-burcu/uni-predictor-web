import type { Ref } from "react";
import type { QsStochasticSimulationResult } from "@/src/types/qs-stochastic";
import type { QsRankEstimationResult } from "@/src/types/qs-rank-estimation";
import { QsCalculationMethod } from "./QsCalculationMethod";
import { QsChangedMetricsPanel } from "./QsChangedMetricsPanel";
import { QsCompactResultsTable } from "./QsCompactResultsTable";
import { QsDashboardSummary } from "./QsDashboardSummary";
import { QsIndicatorBarChart } from "./charts/QsIndicatorBarChart";
import { QsLensRadarChart } from "./charts/QsLensRadarChart";
import { createQsStochasticChartData, createQsStochasticLensChartData } from "./charts/qsChartData";
import type { QsChangedInputRow } from "./qsResultViewModels";
import { SaveScenarioButton } from "@/src/components/scenarios/SaveScenarioButton";
import { resolveQsIndicatorDisplayStatus } from "./qsResultViewModels";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { QsDetailedCalculationDisclosure } from "./QsDetailedCalculationDisclosure";
import { createRankingReferenceSnapshotMetadata } from "@/src/lib/rankings/dataset-resolver";

export function QsDashboard({ simulation, rankEstimation, changedRows, simulationPending, hasValidationError = false, dashboardRef, resultsBoundaryRef }: { simulation: QsStochasticSimulationResult; rankEstimation: QsRankEstimationResult; changedRows: readonly QsChangedInputRow[]; simulationPending: boolean; hasValidationError?: boolean; dashboardRef?: Ref<HTMLElement>; resultsBoundaryRef?: Ref<HTMLDivElement> }) {
  const { t, language } = useAppLanguage();
  const rawAnalysisOnly = simulation.calculationStatus === "raw-analysis-only";
  const chartData = createQsStochasticChartData(simulation, language);
  const lensChartData = createQsStochasticLensChartData(simulation, language);
  return <section ref={dashboardRef} className="min-w-0 space-y-5" data-testid="qs-dashboard" aria-busy={simulationPending}>
    <SaveScenarioButton disabled={hasValidationError} createSnapshot={(name) => ({
      id: crypto.randomUUID(), name, methodology: "QS", source: rawAnalysisOnly ? "raw-analysis" : "manual-scenario",
      institutionalDataYear: String(simulation.institutionalDataYear), scoreReferenceEdition: String(simulation.scoreReferenceEdition),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      currentScore: simulation.current.estimatedOverallScore,
      scenarioScore: simulation.scenario.estimatedOverallScore,
      scoreDifference: simulation.current.estimatedOverallScore === null || simulation.scenario.estimatedOverallScore === null
        ? null
        : simulation.scenario.estimatedOverallScore - simulation.current.estimatedOverallScore,
      currentWeightedCompositeScore: simulation.current.weightedCompositeScore,
      scenarioWeightedCompositeScore: simulation.scenario.weightedCompositeScore,
      currentEstimatedOverallScore: simulation.current.estimatedOverallScore,
      scenarioEstimatedOverallScore: simulation.scenario.estimatedOverallScore,
      currentWeightedComposite: simulation.current.weightedCompositeScore,
      scenarioWeightedComposite: simulation.scenario.weightedCompositeScore,
      currentEstimatedOverall: simulation.current.estimatedOverallScore,
      scenarioEstimatedOverall: simulation.scenario.estimatedOverallScore,
      scoreType: "estimated-overall",
      compositeScoreType: "weighted-indicator-composite",
      currentRankBand: rankEstimation.current.calibrated.predictedBand, scenarioRankBand: rankEstimation.scenario.calibrated.predictedBand,
      rankingReferenceDataset: createRankingReferenceSnapshotMetadata("QS"),
      currentRankSource: "published-reference", scenarioRankSource: changedRows.length === 0 ? "published-reference" : "estimated-from-reference-dataset",
      rankEstimationStatus: rankEstimation.scenario.status,
      rankEstimationWarnings: [...rankEstimation.scenario.modelConfidence.reasons],
      calculationStatus: simulation.calculationStatus,
      warnings: rawAnalysisOnly ? ["Ham değerler değiştirildi; yeterli eşlenmiş QS raw-to-score kalibrasyonu bulunmadığı için senaryo gösterge ve overall skorları kullanılamıyor."] : [],
      changedMetrics: changedRows.map((row) => ({ parameterId: row.parameterId, label: row.parameter, field: row.field, currentValue: row.current, scenarioValue: row.scenario, difference: row.difference, numericScoreEffect: row.numericScoreEffect, impactStatus: row.impactStatus })),
      currentCategoryScores: { ...simulation.current.lensScores },
      scenarioCategoryScores: { ...simulation.scenario.lensScores },
      currentIndicatorScores: Object.fromEntries(Object.entries(simulation.current.indicators).map(([id, item]) => [id, item.median])),
      scenarioIndicatorScores: Object.fromEntries(Object.entries(simulation.scenario.indicators).map(([id, item]) => [id, item.median])),
      currentRawMetrics: structuredClone(simulation.diagnostics.currentRawIndicators),
      scenarioRawMetrics: structuredClone(simulation.diagnostics.scenarioRawIndicators),
      indicatorStatuses: Object.fromEntries(Object.keys(simulation.current.indicators).map((code) => [code, resolveQsIndicatorDisplayStatus({ code: code as keyof typeof simulation.current.indicators, simulation, language }).status])),
      rawCalculationDetails: { current: simulation.diagnostics.currentRawIndicators, scenario: simulation.diagnostics.scenarioRawIndicators }, recommendationContext: null,
    })} />
    <p className="text-sm text-slate-600">
      {t("qsUi.dataReference").replace("{year}", String(simulation.institutionalDataYear)).replace("{edition}", String(simulation.scoreReferenceEdition))}
    </p>
    <div
      className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800"
      hidden={!simulationPending}
      aria-live="polite"
      data-testid="qs-updating-banner"
    >
      {t("qsUi.updating")}
    </div>
    <QsDashboardSummary
      simulation={simulation}
      rankEstimation={rankEstimation}
      hasValidationError={hasValidationError}
    />
    <div className="grid gap-5 xl:grid-cols-2"><QsLensRadarChart data={lensChartData} isUpdating={simulationPending}/><QsIndicatorBarChart data={chartData} isUpdating={simulationPending}/></div>
    <div ref={resultsBoundaryRef} className="space-y-5">
      <QsCompactResultsTable simulation={simulation} rankEstimation={rankEstimation}/>
      <QsChangedMetricsPanel rows={changedRows}/>
    </div>
    <QsCalculationMethod simulation={simulation} rankEstimation={rankEstimation}/>
    <QsDetailedCalculationDisclosure simulation={simulation} rankEstimation={rankEstimation}/>
  </section>;
}

import type { GreenMetricValues } from "@/src/types/greenmetric";
import type { UiGreenMetricCalculationResult } from "@/src/lib/calculations/ui-greenmetric";
import { createUiGreenMetricBarData, createUiGreenMetricRadarData } from "./charts/greenMetricChartData";
import { UiGreenMetricRadarChart } from "./charts/UiGreenMetricRadarChart";
import { UiGreenMetricCategoryBarChart } from "./charts/UiGreenMetricCategoryBarChart";
import { UiGreenMetricCompactResultsTable } from "./UiGreenMetricCompactResultsTable";
import { UiGreenMetricChangedMetricsPanel } from "./UiGreenMetricChangedMetricsPanel";
import { UiGreenMetricDashboardSummary } from "./UiGreenMetricDashboardSummary";
import { UiGreenMetricDetailedCalculationDisclosure } from "./UiGreenMetricDetailedCalculationDisclosure";

export function UiGreenMetricDashboard({ baselineValues, scenarioChanges, current, scenario }: { baselineValues: GreenMetricValues; scenarioChanges: GreenMetricValues; current: UiGreenMetricCalculationResult; scenario: UiGreenMetricCalculationResult }) {
  const changedCount = Object.keys(scenarioChanges).length;
  const radar = createUiGreenMetricRadarData(current.radarScores, scenario.radarScores, current.displayedCategoryScores, scenario.displayedCategoryScores);
  const bars = createUiGreenMetricBarData(current.displayedCategoryScores, scenario.displayedCategoryScores);
  return <main className="min-w-0 space-y-4"><UiGreenMetricDashboardSummary current={current} scenario={scenario} changedCount={changedCount}/><div className="grid gap-4 xl:grid-cols-2"><UiGreenMetricRadarChart data={radar}/><UiGreenMetricCategoryBarChart data={bars}/></div><div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]"><UiGreenMetricCompactResultsTable current={current} scenario={scenario} changedCount={changedCount}/><UiGreenMetricChangedMetricsPanel baselineValues={baselineValues} scenarioChanges={scenarioChanges}/></div><UiGreenMetricDetailedCalculationDisclosure result={scenario}/></main>;
}


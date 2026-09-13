import type { GreenMetricIndicatorDefinition, GreenMetricMetricDefinition, GreenMetricViewMode } from "@/src/types/greenmetric";

export function isGreenMetricVisibleInMode(item: { basic?: boolean; readonly?: boolean }, mode: GreenMetricViewMode): boolean {
  return mode === "detailed" || item.basic === true || item.readonly === true;
}

export function indicatorMatchesGreenMetricQuery(indicator: GreenMetricIndicatorDefinition, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  return [indicator.code, indicator.title, indicator.description ?? "", ...indicator.metrics.flatMap((metric) => [metric.label, metric.description ?? "", metric.id])]
    .some((text) => text.toLocaleLowerCase("tr-TR").includes(normalizedQuery));
}

export function createVisibleGreenMetricIndicators({ indicators, mode, normalizedQuery, showOnlyChanged, changedIds }: { indicators: GreenMetricIndicatorDefinition[]; mode: GreenMetricViewMode; normalizedQuery: string; showOnlyChanged: boolean; changedIds: Set<string> }): GreenMetricIndicatorDefinition[] {
  return indicators
    .filter((indicator) => isGreenMetricVisibleInMode(indicator, mode) && indicatorMatchesGreenMetricQuery(indicator, normalizedQuery))
    .filter((indicator) => !showOnlyChanged || indicator.metrics.some((metric) => changedIds.has(metric.id) || metric.derivedFrom?.some((id) => changedIds.has(id))))
    .map((indicator) => ({ ...indicator, metrics: indicator.metrics.filter((metric) => isGreenMetricVisibleInMode(metric, mode)) }));
}

export function createVisibleGreenMetricContextMetrics(metrics: GreenMetricMetricDefinition[], mode: GreenMetricViewMode): GreenMetricMetricDefinition[] {
  return metrics.filter((metric) => isGreenMetricVisibleInMode(metric, mode));
}

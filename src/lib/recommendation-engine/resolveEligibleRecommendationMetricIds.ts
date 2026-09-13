export type RecommendationScopeMode = "all-eligible" | "only-selected" | "exclude-selected";
export function resolveEligibleRecommendationMetricIds({allEligibleMetricIds,scopeMode,selectedMetricIds,lockedMetricIds}:{allEligibleMetricIds:string[];scopeMode:RecommendationScopeMode;selectedMetricIds:string[];lockedMetricIds:string[]}):string[]{
  const selected=new Set(selectedMetricIds),locked=new Set(lockedMetricIds);
  return allEligibleMetricIds.filter(metricId=>!locked.has(metricId)&&(scopeMode==="only-selected"?selected.has(metricId):scopeMode==="exclude-selected"?!selected.has(metricId):true));
}

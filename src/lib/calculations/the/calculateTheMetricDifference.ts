export const calculateMetricDifference = (
  baselineValue: number,
  scenarioValue: number,
): { absolute: number; percentage: number | null } => {
  const absolute = scenarioValue - baselineValue;

  return {
    absolute,
    percentage: baselineValue === 0 ? null : (absolute / Math.abs(baselineValue)) * 100,
  };
};

export const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export const logit = (probability: number) => Math.log(probability / (1 - probability));
export const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

export function approximatelyEqual(
  left: number, right: number, absoluteTolerance: number, relativeTolerance: number,
) {
  const difference = Math.abs(left - right);
  return difference <= absoluteTolerance ||
    difference <= relativeTolerance * Math.max(Math.abs(left), Math.abs(right));
}

export function calculateQsRelativeChange(
  calibrationRaw: number,
  targetRaw: number,
  options: {
    epsilon: number; minimum: number; maximum: number; higherIsBetter: boolean;
  },
) {
  const raw = calibrationRaw > options.epsilon && targetRaw > options.epsilon
    ? Math.log(targetRaw / calibrationRaw)
    : 2 * (targetRaw - calibrationRaw) /
      (Math.abs(targetRaw) + Math.abs(calibrationRaw) + options.epsilon);
  return clamp(options.higherIsBetter ? raw : -raw, options.minimum, options.maximum);
}

export function empiricalQuantile(sorted: readonly number[], probability: number) {
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function estimateQsOverallScore({
  baselineOfficialOverallScore,
  baselineCompositeScore,
  scenarioCompositeScore,
}: {
  baselineOfficialOverallScore: number | null;
  baselineCompositeScore: number;
  scenarioCompositeScore: number;
}) {
  if (![baselineCompositeScore, scenarioCompositeScore].every(Number.isFinite)) return null;
  if (baselineOfficialOverallScore === null) {
    return { value: clamp(scenarioCompositeScore, 1, 100), approximate: true };
  }
  if (!Number.isFinite(baselineOfficialOverallScore) ||
      baselineOfficialOverallScore < 1 || baselineOfficialOverallScore > 100) return null;
  return {
    value: clamp(
      baselineOfficialOverallScore + scenarioCompositeScore - baselineCompositeScore,
      1,
      100,
    ),
    approximate: false,
  };
}

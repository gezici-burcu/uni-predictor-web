import { RECOMMENDATION_PLANNING_HORIZON, RECOMMENDATION_STRATEGY } from "@/src/config/recommendation-engine/realism-limits";
import { isMeaningfulRecommendationScoreIncrease, runRecommendationEngine } from "./core";
import type {
  AlternativeImprovementPlan,
  RecommendationAdapter,
  RecommendationParameterInput,
  RecommendationRangeAssessment,
} from "./types";

export function createQsAlternativeImprovementPlan({
  adapter,
  inputs,
  recommendationParameterIds,
  targetScore,
  initialValues,
}: {
  adapter: RecommendationAdapter;
  inputs: RecommendationParameterInput[];
  recommendationParameterIds: string[];
  targetScore: number;
  initialValues: Record<string, unknown>;
}): AlternativeImprovementPlan | null {
  if (adapter.id !== "qs") return null;
  if (recommendationParameterIds.length === 0) return null;
  const definitionsById = new Map(adapter.definitions.map((definition) => [definition.metricId, definition]));
  const ranges = inputs.filter((input) =>
    input.selected && input.inputMode === "range" &&
    input.min !== undefined && input.max !== undefined);
  if (!ranges.length) return null;

  const startScore = score(adapter, initialValues);
  if (startScore === null) return null;
  const assessments = ranges.flatMap<RecommendationRangeAssessment>((input) => {
    const definition = definitionsById.get(input.parameterId);
    if (!definition || input.min === undefined || input.max === undefined) return [];
    const step = definition.step ?? 1;
    const samples = [...new Set([
      input.min,
      ...[0.25, 0.5, 0.75].map((factor) =>
        roundToStep(input.min! + (input.max! - input.min!) * factor, step)),
      input.max,
    ])];
    const scored = samples.flatMap((value) => {
      const candidateScore = score(adapter, { ...initialValues, [definition.engineField]: value });
      return candidateScore === null ? [] : [{ value, score: candidateScore }];
    }).sort((a, b) => b.score - a.score || Math.abs(a.value - input.max!) - Math.abs(b.value - input.max!));
    if (!scored.length) return [];
    const best = scored[0];
    const threshold = isMeaningfulRecommendationScoreIncrease(adapter, startScore, best.score)
      ? { value: best.value, score: best.score }
      : findPositiveThreshold({ adapter, definition, initialValues, startScore, from: input.max, step });
    return [{
      metricId: input.parameterId,
      minimumValue: input.min,
      maximumValue: input.max,
      bestValueInRange: best.value,
      scoreAtBestValue: best.score,
      scoreImpactInRange: best.score - startScore,
      positiveThreshold: threshold?.value ?? null,
      thresholdScore: threshold?.score ?? null,
      thresholdImpact: threshold ? threshold.score - startScore : null,
      exceedsUserMaximumBy: threshold && threshold.value > input.max
        ? threshold.value - input.max
        : null,
    }];
  });
  if (!assessments.some((assessment) => assessment.positiveThreshold !== null)) return null;

  const eligibleIds = adapter.definitions
    .filter((definition) =>
      definition.isRecommendationCandidate &&
      definition.affectsTotalScore &&
      definition.eligibleForNumericRecommendation === true &&
      definition.recommendationStatus === "eligible")
    .map((definition) => definition.metricId);
  const rangeIds = assessments.map((assessment) => assessment.metricId);
  const supporterIds = recommendationParameterIds.filter((id) =>
    eligibleIds.includes(id) && !rangeIds.includes(id));
  const actionableRangeIds = assessments
    .filter((assessment) =>
      assessment.positiveThreshold !== null &&
      assessment.exceedsUserMaximumBy === null)
    .map((assessment) => assessment.metricId);
  const allowed = new Set([...supporterIds, ...actionableRangeIds]);
  const exactIds = new Set(inputs.filter((input) => input.selected && input.inputMode === "value").map((input) => input.parameterId));
  const holdIds = new Set(inputs.filter((input) => input.selected && input.inputMode === "default").map((input) => input.parameterId));
  const constraints = assessments.flatMap((assessment) =>
    assessment.positiveThreshold === null || assessment.exceedsUserMaximumBy !== null
      ? []
      : [{
          metricId: assessment.metricId,
          minimumValue: Math.max(assessment.minimumValue, assessment.positiveThreshold),
          maximumValue: assessment.maximumValue,
        }]);
  const engineResult = runRecommendationEngine({
    adapter,
    targetScore,
    planningHorizon: RECOMMENDATION_PLANNING_HORIZON,
    strategy: RECOMMENDATION_STRATEGY,
    initialValues,
    baselineValues: adapter.initialValues,
    constraints,
    preferredMetricIds: [...actionableRangeIds, ...supporterIds],
    lockedMetricIds: adapter.definitions
      .filter((definition) => !allowed.has(definition.metricId) || exactIds.has(definition.metricId) || holdIds.has(definition.metricId))
      .map((definition) => definition.metricId),
  });
  return { rangeAssessments: assessments, engineResult };
}

function findPositiveThreshold({ adapter, definition, initialValues, startScore, from, step }: {
  adapter: RecommendationAdapter;
  definition: RecommendationAdapter["definitions"][number];
  initialValues: Record<string, unknown>;
  startScore: number;
  from: number;
  step: number;
}) {
  const technicalMaximum = definition.technicalMaximum ?? Math.max(from * 8, from + step * 10_000);
  let low = from;
  let high = Math.min(technicalMaximum, Math.max(from + step, from * 1.05));
  let highScore = score(adapter, { ...initialValues, [definition.engineField]: high });
  while (high < technicalMaximum && (highScore === null ||
    !isMeaningfulRecommendationScoreIncrease(adapter, startScore, highScore))) {
    low = high;
    high = Math.min(technicalMaximum, Math.max(high + step, high * 1.25));
    high = roundToStep(high, step);
    highScore = score(adapter, { ...initialValues, [definition.engineField]: high });
  }
  if (highScore === null || !isMeaningfulRecommendationScoreIncrease(adapter, startScore, highScore)) return null;
  while (high - low > step) {
    const mid = roundToStep((low + high) / 2, step);
    if (mid <= low || mid >= high) break;
    const midScore = score(adapter, { ...initialValues, [definition.engineField]: mid });
    if (midScore !== null && isMeaningfulRecommendationScoreIncrease(adapter, startScore, midScore)) {
      high = mid;
      highScore = midScore;
    } else low = mid;
  }
  return { value: high, score: highScore };
}

const score = (adapter: RecommendationAdapter, values: Record<string, unknown>) =>
  adapter.getDisplayedScore(adapter.calculate({ ...values }));
const roundToStep = (value: number, step: number) => Math.round(value / step) * step;

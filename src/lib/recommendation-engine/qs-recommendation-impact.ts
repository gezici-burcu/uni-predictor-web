import { generateMetricCandidates } from "./core";
import { calculateDisplayedScoreDifference } from "./presentation";
import type { QsCalculationResult } from "@/src/types/qs";
import type {
  QsRecommendationCapabilityResult,
  RecommendationAdapter,
  RecommendationEngineResult,
  RecommendationRankRange,
  RecommendationParameterInput,
  RecommendationPlanningHorizon,
} from "./types";
import { evaluateRankTarget, UNAVAILABLE_RECOMMENDATION_RANK_ESTIMATE } from "./rank-target";

export type QsScoreEffectStatus =
  | "held-constant-no-calibration"
  | "calculated";

export type QsRecommendationScoreEffect = {
  scoreEffectStatus: QsScoreEffectStatus;
  numericScoreEffect: number | null;
  rawValueChanged: boolean;
};

export type QsRecommendationDisplayStatus =
  | "validation-error"
  | "numeric-improvement"
  | "raw-analysis-only"
  | "no-positive-candidate"
  | "target-reached";

export const QS_MINIMUM_DISPLAYED_RECOMMENDATION_IMPACT = 0.05;

export function classifyQsRecommendationDisplayStatus({
  hasValidationErrors,
  currentScore,
  constrainedStartScore,
  recommendedScore,
  targetScore,
  hasRawChanges,
}: {
  hasValidationErrors: boolean;
  currentScore: number;
  constrainedStartScore: number;
  recommendedScore: number;
  targetScore: number;
  hasRawChanges: boolean;
}): QsRecommendationDisplayStatus {
  if (hasValidationErrors) return "validation-error";
  if (recommendedScore >= targetScore - 0.0001) return "target-reached";
  if ((calculateDisplayedScoreDifference(constrainedStartScore, recommendedScore) ?? 0) >=
    QS_MINIMUM_DISPLAYED_RECOMMENDATION_IMPACT) return "numeric-improvement";
  if (hasRawChanges && Math.abs(recommendedScore - currentScore) <= 0.0001) {
    return "raw-analysis-only";
  }
  return "no-positive-candidate";
}

export function formatQsRawRatio(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("tr-TR", {
        minimumFractionDigits: 6,
        maximumFractionDigits: 6,
      })
    : "—";
}

export function formatQsRawRatioDifference(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatQsRawRatio(Math.abs(value))}`;
}

export function createHeldConstantQsScoreEffect(
  rawValueChanged: boolean,
): QsRecommendationScoreEffect {
  return {
    scoreEffectStatus: "held-constant-no-calibration",
    numericScoreEffect: null,
    rawValueChanged,
  };
}

export type QsEmploymentDiagnostics = {
  graduateEmploymentRate: number | null;
  surveyResponseRate: number | null;
};

export function calculateQsEmploymentDiagnostics(values: Record<string, unknown>): QsEmploymentDiagnostics {
  const employed = finiteNumber(values.employedGraduates);
  const unemployed = finiteNumber(values.unemployedGraduates);
  const respondents = finiteNumber(values.totalEmploymentRespondents);
  const totalGraduates = finiteNumber(values.totalGraduateStudents2023);
  const employmentDenominator = employed === null || unemployed === null
    ? null
    : employed + unemployed;
  return {
    graduateEmploymentRate:
      employmentDenominator === null || employmentDenominator === 0 || employed === null
        ? null
        : employed / employmentDenominator * 100,
    surveyResponseRate:
      respondents === null || totalGraduates === null || totalGraduates === 0
        ? null
        : respondents / totalGraduates * 100,
  };
}

export function getQsEffectiveRecommendationValues(
  baselineValues: Record<string, unknown>,
  inputs: RecommendationParameterInput[],
) {
  const effective = { ...baselineValues };
  for (const input of inputs) {
    if (
      input.selected &&
      input.inputMode === "value" &&
      input.value !== undefined
    ) {
      effective[input.parameterId] = input.value;
    }
  }
  return effective;
}

export function createQsRawRecommendationAnalysis({
  adapter,
  selectedParameterIds,
  inputs,
  initialValues,
  planningHorizon,
}: {
  adapter: RecommendationAdapter;
  selectedParameterIds: string[];
  inputs: RecommendationParameterInput[];
  initialValues: Record<string, unknown>;
  planningHorizon: RecommendationPlanningHorizon;
}): QsRecommendationCapabilityResult {
  const selected = new Set(selectedParameterIds);
  const inputById = new Map(inputs.map((input) => [input.parameterId, input]));
  const definitions = adapter.definitions.filter((definition) =>
    selected.has(definition.metricId));
  const scoreComputable = definitions.filter((definition) =>
    definition.eligibleForNumericRecommendation === true &&
    definition.recommendationStatus === "eligible");
  const startCalculation = adapter.calculate(initialValues) as QsCalculationResult & {
    recommendationScoreCoverage?: QsRecommendationCapabilityResult["startScoreCoverage"];
  };
  let values = { ...initialValues };
  const rawChanges: QsRecommendationCapabilityResult["rawChanges"] = [];

  for (const definition of definitions) {
    if (definition.eligibleForNumericRecommendation === true) continue;
    const input = inputById.get(definition.metricId);
    if (input?.selected && input.inputMode === "default") {
      continue;
    }
    if (input?.selected && input.inputMode === "value") {
      const baselineValue = adapter.initialValues[definition.engineField];
      const scenarioValue = values[definition.engineField];
      if (
        typeof baselineValue !== "number" ||
        !Number.isFinite(baselineValue) ||
        typeof scenarioValue !== "number" ||
        !Number.isFinite(scenarioValue) ||
        Object.is(baselineValue, scenarioValue)
      ) continue;
      const baselineCalculation = adapter.calculate(adapter.initialValues) as QsCalculationResult;
      const candidateCalculation = adapter.calculate({
        ...adapter.initialValues,
        [definition.engineField]: scenarioValue,
      }) as QsCalculationResult;
      rawChanges.push({
        metricId: definition.metricId,
        label: definition.label,
        currentValue: baselineValue,
        candidateValue: scenarioValue,
        indicatorChanges: collectQsRawIndicatorChanges(
          baselineCalculation,
          candidateCalculation,
        ),
      });
      continue;
    }
    const currentValue = values[definition.engineField];
    if (typeof currentValue !== "number" || !Number.isFinite(currentValue)) continue;
    const constraint = input?.selected && input.inputMode === "range"
      ? { metricId: definition.metricId, minimumValue: input.min, maximumValue: input.max }
      : undefined;
    const candidates = generateMetricCandidates({
      currentValue,
      metricDefinition: {
        ...definition,
        direction: "increase-only",
        defaultLocked: false,
      },
      planningHorizon,
      constraint,
    });
    const baselineCalculation = adapter.calculate(values) as QsCalculationResult;
    const chosen = candidates.toReversed().find((candidate) =>
      qsAggregateRelationsAreValid({
        ...values,
        [definition.engineField]: candidate.value,
      }));
    if (!chosen || typeof chosen.value !== "number") continue;
    const candidateValues = { ...values, [definition.engineField]: chosen.value };
    const candidateCalculation = adapter.calculate(candidateValues) as QsCalculationResult;
    const indicatorChanges = collectQsRawIndicatorChanges(
      baselineCalculation,
      candidateCalculation,
    );
    rawChanges.push({
      metricId: definition.metricId,
      label: definition.label,
      currentValue,
      candidateValue: chosen.value,
      indicatorChanges,
    });
    values = candidateValues;
  }

  return {
    status: scoreComputable.length > 0 ? "score-computable" :
      rawChanges.length > 0 ? "raw-impact-only" : "no-positive-score",
    constrainedStartScoreAvailable: adapter.definitions.every((definition) =>
      Object.is(
        adapter.initialValues[definition.engineField],
        initialValues[definition.engineField],
      )),
    projectedScoreAvailable: scoreComputable.length > 0,
    startScoreCoverage: startCalculation.recommendationScoreCoverage,
    rawChanges,
    resultingValues: values,
  };
}

function collectQsRawIndicatorChanges(
  currentCalculation: QsCalculationResult,
  scenarioCalculation: QsCalculationResult,
) {
  return (["FSR", "IFR", "ISR"] as const).flatMap((code) => {
    const current = currentCalculation.rawIndicators[code];
    const projected = scenarioCalculation.rawIndicators[code];
    return current !== null && projected !== null && Math.abs(projected - current) > 1e-12
      ? [{ code, current, projected, difference: projected - current }]
      : [];
  });
}

export function attachQsCapabilityToRecommendationResult(
  result: RecommendationEngineResult,
  capability: QsRecommendationCapabilityResult,
  targetRankRange?: RecommendationRankRange | null,
): RecommendationEngineResult {
  return {
    ...result,
    qsCapability: capability,
    ...(targetRankRange && result.rankTarget && !capability.projectedScoreAvailable
      ? {
          rankTarget: {
            ...result.rankTarget,
            recommendedEvaluation: evaluateRankTarget(
              UNAVAILABLE_RECOMMENDATION_RANK_ESTIMATE,
              targetRankRange,
            ),
          },
        }
      : {}),
  };
}

function qsAggregateRelationsAreValid(values: Record<string, unknown>) {
  const pairs = [
    ["internationalAcademicStaff.total", "academicStaff.total"],
    ["undergraduateInternationalStudents.total", "undergraduateStudents.total"],
    ["graduatePostgraduateInternationalStudents.total", "graduatePostgraduateStudents.total"],
  ] as const;
  return pairs.every(([part, total]) =>
    typeof values[part] !== "number" || typeof values[total] !== "number" ||
    values[part] <= values[total]);
}

const finiteNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

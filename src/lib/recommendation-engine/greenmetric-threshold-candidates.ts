import { UI_GREENMETRIC_ACTIVE_DATA_MODE } from "@/src/config/ui-greenmetric.data-mode";
import { calculateUiGreenMetricResult } from "@/src/lib/calculations/ui-greenmetric";
import type { UiGreenMetricCalculationResult, UiGreenMetricIndicatorCode } from "@/src/lib/calculations/ui-greenmetric/types";
import type { GreenMetricValues } from "@/src/types/greenmetric";
import { getGreenMetricRelationErrors } from "@/src/utils/greenmetric-derived";
import type {
  RecommendationCandidateGeneration,
  RecommendationMetricCandidate,
  RecommendationMetricConstraint,
  RecommendationMetricDefinition,
} from "./types";

const DECREASE_ONLY_METRIC_IDS = new Set([
  "greenmetric.common.buildingGroundFloorAreaM2",
  "greenmetric.common.totalAnnualElectricityKwh",
  "greenmetric.common.totalCarbonFootprintTons",
  "greenmetric.common.groundParkingAreaM2",
  "greenmetric.common.totalBuildingFloorAreaM2",
  "greenmetric.common.totalAnnualEnergyUsageKwh",
  "greenmetric.ws.organicWasteProducedCurrentTons",
  "greenmetric.ws.inorganicWasteProducedCurrentTons",
  "greenmetric.ws.toxicWasteProducedCurrentTons",
  "greenmetric.common.totalCourseCount",
  "greenmetric.common.totalResearchFundingUsd",
  "greenmetric.common.lecturerResearcherCount",
  "greenmetric.ed.totalGraduateCountLastThreeYears",
  "greenmetric.common.totalUniversityBudgetUsd",
  "greenmetric.common.totalInstitutionalLeaderCount",
  "greenmetric.tr.universityManagedCombustionCars",
  "greenmetric.tr.dailyIncomingCombustionCars",
  "greenmetric.tr.dailyIncomingCombustionMotorcycles",
]);

const BOTH_DIRECTION_METRIC_IDS = new Set([
  "greenmetric.common.totalCampusAreaM2",
  "greenmetric.common.regularStudentCount",
  "greenmetric.common.academicStaffCount",
  "greenmetric.common.administrativeStaffCount",
]);

export function getGreenMetricRecommendationDirection(metricId: string) {
  if (BOTH_DIRECTION_METRIC_IDS.has(metricId)) return "both" as const;
  if (DECREASE_ONLY_METRIC_IDS.has(metricId)) return "decrease-only" as const;
  return "increase-only" as const;
}

const calculate = (values: GreenMetricValues) => calculateUiGreenMetricResult({
  values,
  mode: UI_GREENMETRIC_ACTIVE_DATA_MODE,
});

const indicator = (result: UiGreenMetricCalculationResult, code: string) =>
  result.indicatorResults[code as UiGreenMetricIndicatorCode];

const scoreImproved = (
  result: UiGreenMetricCalculationResult,
  code: string,
  currentScore: number,
) => {
  const proposed = indicator(result, code);
  return proposed.status !== "invalid-input" && proposed.score !== null && proposed.score > currentScore;
};

const candidate = ({
  definition,
  value,
  currentValue,
  code,
  result,
  direction,
}: {
  definition: RecommendationMetricDefinition;
  value: unknown;
  currentValue: unknown;
  code: string;
  result: UiGreenMetricCalculationResult;
  direction: "increase" | "decrease" | "ordered-level";
}): RecommendationMetricCandidate => {
  const rawThreshold = indicator(result, code).rawValue;
  const delta = typeof value === "number" && typeof currentValue === "number"
    ? Math.abs(value - currentValue)
    : 1;
  const scale = typeof currentValue === "number"
    ? Math.max(Math.abs(currentValue), definition.step ?? 1)
    : 1;
  return {
    metricId: definition.metricId,
    value,
    normalizedChange: Math.min(1, delta / scale),
    indicatorCode: code,
    targetThreshold: typeof rawThreshold === "number" || typeof rawThreshold === "string"
      ? rawThreshold
      : undefined,
    thresholdDirection: direction,
    changedSourceMetricIds: [definition.engineField],
  };
};

function generateOrderedCandidates(
  values: GreenMetricValues,
  definition: RecommendationMetricDefinition,
  currentResult: UiGreenMetricCalculationResult,
  constraint?: RecommendationMetricConstraint,
): RecommendationMetricCandidate[] {
  const currentValue = values[definition.engineField];
  const options = definition.options ?? [];
  const currentIndex = options.findIndex((option) => Object.is(option, currentValue));
  if (currentIndex < 0) return [];
  const generated: RecommendationMetricCandidate[] = [];
  for (const code of definition.targetIndicatorCodes ?? []) {
    const current = indicator(currentResult, code);
    if (current.score === null || current.score >= current.maximumScore) continue;
    for (const value of options.slice(currentIndex + 1)) {
      if (typeof value !== "string") continue;
      const numericValue = Number(value);
      if (constraint?.minimumValue !== undefined && numericValue < constraint.minimumValue) continue;
      if (constraint?.maximumValue !== undefined && numericValue > constraint.maximumValue) continue;
      const proposedValues = { ...values, [definition.engineField]: value };
      const proposedResult = calculate(proposedValues);
      if (!scoreImproved(proposedResult, code, current.score)) continue;
      generated.push(candidate({
        definition,
        value,
        currentValue,
        code,
        result: proposedResult,
        direction: "ordered-level",
      }));
      break;
    }
  }
  return generated;
}

function generateMultiSelectCandidates(
  values: GreenMetricValues,
  definition: RecommendationMetricDefinition,
  currentResult: UiGreenMetricCalculationResult,
  constraint?: RecommendationMetricConstraint,
): RecommendationMetricCandidate[] {
  const currentValue = values[definition.engineField];
  if (!Array.isArray(currentValue)) return [];
  const generated: RecommendationMetricCandidate[] = [];
  for (const code of definition.targetIndicatorCodes ?? []) {
    const current = indicator(currentResult, code);
    if (current.score === null || current.score >= current.maximumScore) continue;
    for (const option of definition.options ?? []) {
      if (typeof option !== "string") continue;
      if (currentValue.some((value) => Object.is(value, option))) continue;
      const value = [...currentValue, option];
      if (constraint?.minimumValue !== undefined && value.length < constraint.minimumValue) continue;
      if (constraint?.maximumValue !== undefined && value.length > constraint.maximumValue) continue;
      const proposedResult = calculate({ ...values, [definition.engineField]: value });
      if (!scoreImproved(proposedResult, code, current.score)) continue;
      generated.push(candidate({
        definition,
        value,
        currentValue,
        code,
        result: proposedResult,
        direction: "ordered-level",
      }));
      break;
    }
  }
  return generated;
}

type NumericEvaluation = {
  valid: boolean;
  value: number;
  result: UiGreenMetricCalculationResult;
};

function findNumericCandidate({
  values,
  definition,
  constraint,
  code,
  sign,
  currentScore,
}: {
  values: GreenMetricValues;
  definition: RecommendationMetricDefinition;
  constraint?: RecommendationMetricConstraint;
  code: string;
  sign: 1 | -1;
  currentScore: number;
}): RecommendationMetricCandidate | null {
  const currentValue = values[definition.engineField];
  if (typeof currentValue !== "number" || !Number.isFinite(currentValue)) return null;
  const step = Math.max(Number.EPSILON, definition.step ?? (definition.kind === "integer-count" ? 1 : 0.01));
  const technicalMin = Math.max(definition.technicalMinimum ?? -Infinity, constraint?.minimumValue ?? -Infinity);
  const technicalMax = Math.min(definition.technicalMaximum ?? Infinity, constraint?.maximumValue ?? Infinity);
  const minimumK = Math.max(1, Math.ceil((sign === 1 ? technicalMin - currentValue : currentValue - technicalMax) / step));
  const maximumKByBound = sign === 1
    ? (Number.isFinite(technicalMax) ? Math.floor((technicalMax - currentValue) / step) : Number.POSITIVE_INFINITY)
    : (Number.isFinite(technicalMin) ? Math.floor((currentValue - technicalMin) / step) : Number.POSITIVE_INFINITY);
  if (maximumKByBound < minimumK) return null;

  const evaluate = (k: number): NumericEvaluation => {
    const value = currentValue + sign * k * step;
    const proposedValues = { ...values, [definition.engineField]: value };
    return {
      valid: getGreenMetricRelationErrors(proposedValues).length === 0,
      value,
      result: calculate(proposedValues),
    };
  };
  const improves = (evaluation: NumericEvaluation) =>
    evaluation.valid && scoreImproved(evaluation.result, code, currentScore);

  let previousValidK = minimumK - 1;
  let highK = minimumK;
  let highEvaluation: NumericEvaluation | null = null;
  const searchCap = Number.isFinite(maximumKByBound)
    ? maximumKByBound
    : Math.max(minimumK, 2 ** 30);

  while (highK <= searchCap) {
    const evaluation = evaluate(highK);
    if (improves(evaluation)) {
      highEvaluation = evaluation;
      break;
    }
    if (!evaluation.valid) {
      let low = previousValidK + 1;
      let high = highK - 1;
      let maximumValidK = previousValidK;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        if (evaluate(middle).valid) {
          maximumValidK = middle;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }
      if (maximumValidK >= minimumK) {
        const maximumValid = evaluate(maximumValidK);
        if (improves(maximumValid)) {
          highK = maximumValidK;
          highEvaluation = maximumValid;
        }
      }
      break;
    }
    previousValidK = highK;
    if (highK === searchCap) break;
    highK = Math.min(searchCap, Math.max(highK + 1, highK * 2));
  }
  if (!highEvaluation) return null;

  let low = minimumK;
  let high = highK;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (improves(evaluate(middle))) high = middle;
    else low = middle + 1;
  }
  const minimum = evaluate(low);
  if (!improves(minimum)) return null;
  return candidate({
    definition,
    value: minimum.value,
    currentValue,
    code,
    result: minimum.result,
    direction: sign === 1 ? "increase" : "decrease",
  });
}

export function generateGreenMetricThresholdCandidates({
  values,
  definition,
  constraint,
}: {
  values: GreenMetricValues;
  definition: RecommendationMetricDefinition;
  constraint?: RecommendationMetricConstraint;
}): RecommendationCandidateGeneration {
  if (!definition.isEditableInput || !definition.isRecommendationCandidate) {
    return { candidates: [], status: "not-editable", message: "Parametre öneri için değiştirilebilir değil." };
  }
  if (getGreenMetricRelationErrors(values).length > 0) {
    return { candidates: [], status: "invalid-relation", message: "Baseline ham verilerinde geçersiz pay/payda ilişkisi var." };
  }
  const currentResult = calculate(values);
  const targets = definition.targetIndicatorCodes ?? [];
  const currentIndicators = targets.map((code) => indicator(currentResult, code));
  if (!targets.length || currentIndicators.some((item) => item.score === null)) {
    return { candidates: [], status: "missing-baseline-data", message: "Öneri için gerekli GreenMetric baseline verisi eksik." };
  }
  if (currentIndicators.every((item) => item.score === item.maximumScore)) {
    return { candidates: [], status: "maximum-score", message: "Gösterge zaten maksimum puanda." };
  }

  let candidates: RecommendationMetricCandidate[];
  if (definition.kind === "ordered-level") {
    candidates = generateOrderedCandidates(values, definition, currentResult, constraint);
  } else if (Array.isArray(values[definition.engineField])) {
    candidates = generateMultiSelectCandidates(values, definition, currentResult, constraint);
  } else {
    candidates = targets.flatMap((code) => {
      const current = indicator(currentResult, code);
      if (current.score === null || current.score >= current.maximumScore) return [];
      const signs = definition.direction === "both"
        ? [1, -1] as const
        : definition.direction === "decrease-only"
          ? [-1] as const
          : [1] as const;
      return signs.flatMap((sign) => {
        const found = findNumericCandidate({
          values,
          definition,
          constraint,
          code,
          sign,
          currentScore: current.score!,
        });
        return found ? [found] : [];
      });
    });
  }

  candidates = [...new Map(candidates.map((item) => [JSON.stringify(item.value), item])).values()]
    .toSorted((left, right) => left.normalizedChange - right.normalizedChange ||
      String(left.indicatorCode).localeCompare(String(right.indicatorCode)));
  return candidates.length
    ? { candidates, status: "candidate-found" }
    : { candidates: [], status: "threshold-unreachable", message: "Bir sonraki puan eşiği seçili ham parametreyle geçerli biçimde erişilemiyor." };
}

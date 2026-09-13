import {
  calculateReferenceReadiness,
  theNormalizationReferenceSet,
} from "@/src/config/the.normalization";
import type {
  TheCalculationInput,
  TheCalculationReadiness,
  TheImputationContext,
  TheIndicatorCode,
  TheIndicatorEngineResult,
  TheNormalizationReferenceSet,
} from "@/src/types/the-calculation";
import { calculateTheIndicatorScores } from "./calculateTheIndicatorScores";
import { calculateTheRawIndicators } from "./calculateTheRawIndicators";

export { createTheInputData, toNullableNumber } from "./createTheInputData";
export { calculateTheRawIndicators, safeDivide, validateExternalScore, THE_INDICATOR_DIRECTIONS, THE_INDICATOR_METADATA, THE_INDICATOR_WEIGHTS } from "./calculateTheRawIndicators";
export {
  calculateCitationImpact,
  calculateDoctorateBachelorRatio,
  calculateDoctorateStaffRatio,
  calculateIndustryIncome,
  calculateInstitutionalIncome,
  calculateInternationalCoauthorship,
  calculateInternationalStaff,
  calculateInternationalStudents,
  calculatePatents,
  calculateResearchExcellence,
  calculateResearchIncome,
  calculateResearchInfluence,
  calculateResearchProductivity,
  calculateResearchReputation,
  calculateResearchStrength,
  calculateStudentStaffRatio,
  calculateStudyAbroad,
  calculateTeachingReputation,
  calculateTheRawIndicators as calculateOfficialTheRawIndicators,
  safeDivide as safeDivideOfficialTheRawInput,
} from "./calculateOfficialRawIndicators";
export { calculateTheIndicatorScores } from "./calculateTheIndicatorScores";
export { calculateTheAggregateScores, calculateWeightedCategoryScore } from "./calculateTheAggregateScores";
export { calculateMetricDifference } from "./calculateTheMetricDifference";
export { createThePublicSimulationReferences } from "./createThePublicSimulationReferences";
export { calculateThePublicSimulationResult, calculateAnchoredPillarScore, calculatePublicPillarOverall } from "./calculateThePublicSimulationResult";

export const calculateImputedScore = (context: TheImputationContext): number | null => {
  const values = [context.institutionTwoLowestMean, context.populationMinimumScore].filter((value): value is number => value !== null && Number.isFinite(value));
  return values.length === 2 ? Math.max(...values) : null;
};

const isMissingInput = (warnings: string[]) =>
  warnings.some((warning) => warning.includes("eksik") || warning.includes("girilmedi"));

export function calculateTheIndicatorEngine(
  inputs: TheCalculationInput,
  referenceSet: TheNormalizationReferenceSet = theNormalizationReferenceSet,
): TheIndicatorEngineResult {
  const rawIndicators = calculateTheRawIndicators(inputs);
  const indicatorScores = calculateTheIndicatorScores(rawIndicators, referenceSet);
  const referenceReadiness = calculateReferenceReadiness(referenceSet);
  const invalidIndicators = Object.values(rawIndicators)
    .filter((indicator) => !indicator.valid && !isMissingInput(indicator.warnings))
    .map((indicator) => indicator.code);
  const missingInputIndicators = Object.values(rawIndicators)
    .filter((indicator) => !indicator.valid && isMissingInput(indicator.warnings))
    .map((indicator) => indicator.code);
  const status: TheCalculationReadiness["status"] = invalidIndicators.length > 0
    ? "invalid-inputs"
    : missingInputIndicators.length > 0
      ? "missing-inputs"
      : !referenceReadiness.complete
        ? "missing-references"
        : "ready";
  const warnings = [...new Set(Object.values(indicatorScores).flatMap((indicator) => indicator.warnings))];
  const calculationReadiness: TheCalculationReadiness = {
    status,
    requiredReferenceCount: referenceReadiness.requiredCount,
    readyReferenceCount: referenceReadiness.readyCount,
    missingReferenceIndicators: referenceReadiness.missingIndicators,
    missingInputIndicators: missingInputIndicators as TheIndicatorCode[],
    invalidIndicators: invalidIndicators as TheIndicatorCode[],
    warnings,
  };
  return {
    inputs,
    rawIndicators,
    indicatorScores,
    warnings,
    hasMissingReferences: !referenceReadiness.complete,
    referenceReadiness,
    calculationReadiness,
  };
}

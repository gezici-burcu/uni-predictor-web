import { THE_RAW_INDICATORS_BY_ID } from "@/src/config/the-raw-indicators";
import { THE_RAW_INDICATOR_IDS } from "@/src/types/the-raw-calculation";
import type {
  TheRawCalculationResult,
  TheRawIndicatorId,
  TheRawIndicatorResult,
  TheRawInputId,
  TheRawInputValues,
} from "@/src/types/the-raw-calculation";

type SafeDivisionArguments = {
  numerator: number | null | undefined;
  denominator: number | null | undefined;
  numeratorInputIds: readonly TheRawInputId[];
  denominatorInputIds: readonly TheRawInputId[];
};

type SafeDivisionResult = {
  value: number | null;
  status: "calculated" | "missing" | "invalid";
  missingInputIds: TheRawInputId[];
  invalidInputIds: TheRawInputId[];
};

const missingIds = (entries: readonly (readonly [TheRawInputId, number | null | undefined])[]) =>
  entries.filter(([, value]) => value === null || value === undefined).map(([id]) => id);

const invalidIds = (entries: readonly (readonly [TheRawInputId, number | null | undefined])[]) =>
  entries
    .filter(([, value]) => value !== null && value !== undefined && (!Number.isFinite(value) || value < 0))
    .map(([id]) => id);

export function safeDivide({
  numerator,
  denominator,
  numeratorInputIds,
  denominatorInputIds,
}: SafeDivisionArguments): SafeDivisionResult {
  const numeratorEntries = numeratorInputIds.map((id) => [id, numerator] as const);
  const denominatorEntries = denominatorInputIds.map((id) => [id, denominator] as const);
  const entries = [...numeratorEntries, ...denominatorEntries];
  const missingInputIds = missingIds(entries);
  if (missingInputIds.length) return { value: null, status: "missing", missingInputIds, invalidInputIds: [] };

  const invalidInputIds = invalidIds(entries);
  if (denominator === 0) invalidInputIds.push(...denominatorInputIds);
  if (invalidInputIds.length) {
    return { value: null, status: "invalid", missingInputIds: [], invalidInputIds: [...new Set(invalidInputIds)] };
  }

  return { value: (numerator as number) / (denominator as number), status: "calculated", missingInputIds: [], invalidInputIds: [] };
}

const formulaResult = (
  metricId: TheRawIndicatorId,
  division: SafeDivisionResult,
): TheRawIndicatorResult => ({
  metricId,
  value: division.value,
  status: division.status,
  accuracy: division.status === "calculated" ? "official-raw" : "missing",
  requiredInputIds: THE_RAW_INDICATORS_BY_ID[metricId].requiredInputIds,
  missingInputIds: division.missingInputIds,
  invalidInputIds: division.invalidInputIds,
  warnings: division.status === "missing" ? ["missing-inputs"] : division.status === "invalid" ? ["invalid-inputs"] : [],
});

const divideInputs = (
  metricId: TheRawIndicatorId,
  inputs: TheRawInputValues,
  numeratorId: TheRawInputId,
  denominatorId: TheRawInputId,
) => formulaResult(metricId, safeDivide({
  numerator: inputs[numeratorId],
  denominator: inputs[denominatorId],
  numeratorInputIds: [numeratorId],
  denominatorInputIds: [denominatorId],
}));

const sumDenominatorInputs = (
  metricId: TheRawIndicatorId,
  inputs: TheRawInputValues,
  numeratorId: TheRawInputId,
  denominatorIds: readonly [TheRawInputId, TheRawInputId],
): TheRawIndicatorResult => {
  const denominatorValues = denominatorIds.map((id) => inputs[id]);
  const missingDenominators = denominatorIds.filter((_, index) => denominatorValues[index] === null || denominatorValues[index] === undefined);
  const invalidDenominators = denominatorIds.filter((_, index) => {
    const value = denominatorValues[index];
    return value !== null && value !== undefined && (!Number.isFinite(value) || value < 0);
  });
  if (missingDenominators.length) {
    return formulaResult(metricId, { value: null, status: "missing", missingInputIds: missingDenominators, invalidInputIds: [] });
  }
  if (invalidDenominators.length) {
    return formulaResult(metricId, { value: null, status: "invalid", missingInputIds: [], invalidInputIds: invalidDenominators });
  }
  return formulaResult(metricId, safeDivide({
    numerator: inputs[numeratorId],
    denominator: (denominatorValues[0] as number) + (denominatorValues[1] as number),
    numeratorInputIds: [numeratorId],
    denominatorInputIds: denominatorIds,
  }));
};

const externalResult = (
  metricId: TheRawIndicatorId,
  inputId: TheRawInputId,
  value: number | null | undefined,
): TheRawIndicatorResult => {
  const missing = value === null || value === undefined;
  const invalid = !missing && (!Number.isFinite(value) || value < 0);
  return {
    metricId,
    value: missing || invalid ? null : value,
    status: missing ? "missing" : invalid ? "invalid" : "external",
    accuracy: missing || invalid ? "missing" : "external-data",
    requiredInputIds: [inputId],
    missingInputIds: missing ? [inputId] : [],
    invalidInputIds: invalid ? [inputId] : [],
    warnings: missing ? ["missing-external-input"] : invalid ? ["invalid-external-input"] : [],
  };
};

export const calculateTeachingReputation = (inputs: TheRawInputValues) =>
  externalResult("teachingReputation", "teachingReputationVotes", inputs.teachingReputationVotes);

export const calculateStudentStaffRatio = (inputs: TheRawInputValues) =>
  divideInputs("studentStaffRatio", inputs, "academicStaffFte", "studentsFte");

export const calculateDoctorateBachelorRatio = (inputs: TheRawInputValues) =>
  divideInputs("doctorateBachelorRatio", inputs, "doctoratesAwarded", "undergraduateDegreesAwarded");

export const calculateDoctorateStaffRatio = (inputs: TheRawInputValues) =>
  divideInputs("doctorateStaffRatio", inputs, "subjectWeightedDoctorates", "subjectWeightedAcademicStaffForDoctorates");

export const calculateInstitutionalIncome = (inputs: TheRawInputValues) =>
  divideInputs("institutionalIncome", inputs, "institutionalIncomePppAdjusted", "academicStaffFte");

export const calculateResearchReputation = (inputs: TheRawInputValues) =>
  externalResult("researchReputation", "researchReputationVotes", inputs.researchReputationVotes);

export const calculateResearchIncome = (inputs: TheRawInputValues) =>
  divideInputs("researchIncome", inputs, "subjectWeightedResearchIncomePppAdjusted", "subjectWeightedAcademicStaffForResearchIncome");

export const calculateResearchProductivity = (inputs: TheRawInputValues) =>
  sumDenominatorInputs("researchProductivity", inputs, "subjectWeightedPublicationCount", [
    "subjectWeightedAcademicStaffForProductivity",
    "subjectWeightedResearchStaffForProductivity",
  ]);

export const calculateCitationImpact = (inputs: TheRawInputValues): TheRawIndicatorResult => {
  const countryId = "citationImpactCountryAdjustedRaw";
  const nonCountryId = "citationImpactNonCountryAdjustedRaw";
  const country = inputs[countryId];
  const nonCountry = inputs[nonCountryId];
  const missingInputIds = missingIds([[countryId, country], [nonCountryId, nonCountry]]);
  if (missingInputIds.length) return formulaResult("citationImpact", { value: null, status: "missing", missingInputIds, invalidInputIds: [] });
  const invalidInputIds = invalidIds([[countryId, country], [nonCountryId, nonCountry]]);
  if (invalidInputIds.length) return formulaResult("citationImpact", { value: null, status: "invalid", missingInputIds: [], invalidInputIds });
  return formulaResult("citationImpact", { value: ((country as number) + (nonCountry as number)) / 2, status: "calculated", missingInputIds: [], invalidInputIds: [] });
};

export const calculateResearchStrength = (inputs: TheRawInputValues) =>
  externalResult("researchStrength", "researchStrengthFwci75thPercentile", inputs.researchStrengthFwci75thPercentile);

export const calculateResearchExcellence = (inputs: TheRawInputValues) =>
  externalResult("researchExcellence", "researchExcellenceAdjustedRaw", inputs.researchExcellenceAdjustedRaw);

export const calculateResearchInfluence = (inputs: TheRawInputValues) =>
  externalResult("researchInfluence", "researchInfluenceAdjustedRaw", inputs.researchInfluenceAdjustedRaw);

export const calculateInternationalStudents = (inputs: TheRawInputValues) =>
  divideInputs("internationalStudents", inputs, "internationalStudentsFte", "studentsFte");

export const calculateInternationalStaff = (inputs: TheRawInputValues) =>
  divideInputs("internationalStaff", inputs, "internationalAcademicStaffFte", "academicStaffFte");

export const calculateInternationalCoauthorship = (inputs: TheRawInputValues) =>
  divideInputs("internationalCoauthorship", inputs, "subjectWeightedInternationalCoauthoredPublications", "subjectWeightedTotalPublications");

export const calculateStudyAbroad = (inputs: TheRawInputValues) =>
  divideInputs("studyAbroad", inputs, "outboundExchangeStudentsHeadcount", "studentsFte");

export const calculateIndustryIncome = (inputs: TheRawInputValues) =>
  divideInputs("industryIncome", inputs, "industryIncomePppAdjusted", "academicStaffFte");

export const calculatePatents = (inputs: TheRawInputValues) =>
  sumDenominatorInputs("patents", inputs, "subjectWeightedPatentCitationCount", [
    "subjectWeightedAcademicStaffForPatents",
    "subjectWeightedResearchStaffForPatents",
  ]);

export function calculateTheRawIndicators(inputs: TheRawInputValues): TheRawCalculationResult {
  const results = [
    calculateTeachingReputation(inputs),
    calculateStudentStaffRatio(inputs),
    calculateDoctorateBachelorRatio(inputs),
    calculateDoctorateStaffRatio(inputs),
    calculateInstitutionalIncome(inputs),
    calculateResearchReputation(inputs),
    calculateResearchIncome(inputs),
    calculateResearchProductivity(inputs),
    calculateCitationImpact(inputs),
    calculateResearchStrength(inputs),
    calculateResearchExcellence(inputs),
    calculateResearchInfluence(inputs),
    calculateInternationalStudents(inputs),
    calculateInternationalStaff(inputs),
    calculateInternationalCoauthorship(inputs),
    calculateStudyAbroad(inputs),
    calculateIndustryIncome(inputs),
    calculatePatents(inputs),
  ];
  const indicators = Object.fromEntries(results.map((result) => [result.metricId, result])) as Record<TheRawIndicatorId, TheRawIndicatorResult>;
  const missingInputIds = [...new Set(results.flatMap((result) => result.missingInputIds))];
  const invalidInputIds = [...new Set(results.flatMap((result) => result.invalidInputIds))];
  return {
    methodologyYear: "2026",
    indicators,
    missingInputIds,
    invalidInputIds,
    status: invalidInputIds.length ? "invalid" : THE_RAW_INDICATOR_IDS.every((id) => ["calculated", "external"].includes(indicators[id].status)) ? "complete" : "partial",
  };
}

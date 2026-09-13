export const THE_RAW_INDICATOR_IDS = [
  "teachingReputation",
  "studentStaffRatio",
  "doctorateBachelorRatio",
  "doctorateStaffRatio",
  "institutionalIncome",
  "researchReputation",
  "researchIncome",
  "researchProductivity",
  "citationImpact",
  "researchStrength",
  "researchExcellence",
  "researchInfluence",
  "internationalStudents",
  "internationalStaff",
  "internationalCoauthorship",
  "studyAbroad",
  "industryIncome",
  "patents",
] as const;

export type TheRawIndicatorId = (typeof THE_RAW_INDICATOR_IDS)[number];

export const THE_INSTITUTIONAL_INPUT_IDS = [
  "academicStaffFte",
  "researchStaffFte",
  "studentsFte",
  "internationalAcademicStaffFte",
  "internationalStudentsFte",
  "undergraduateDegreesAwarded",
  "doctoratesAwarded",
  "institutionalIncome",
  "researchIncome",
  "industryCommerceResearchIncome",
] as const;

export const THE_ADDITIONAL_INPUT_IDS = [
  "teachingReputationVotes",
  "researchReputationVotes",
  "institutionalIncomePppAdjusted",
  "subjectWeightedResearchIncomePppAdjusted",
  "industryIncomePppAdjusted",
  "subjectWeightedDoctorates",
  "subjectWeightedAcademicStaffForDoctorates",
  "subjectWeightedAcademicStaffForResearchIncome",
  "subjectWeightedPublicationCount",
  "subjectWeightedAcademicStaffForProductivity",
  "subjectWeightedResearchStaffForProductivity",
  "citationImpactCountryAdjustedRaw",
  "citationImpactNonCountryAdjustedRaw",
  "researchStrengthFwci75thPercentile",
  "researchExcellenceAdjustedRaw",
  "researchInfluenceAdjustedRaw",
  "subjectWeightedInternationalCoauthoredPublications",
  "subjectWeightedTotalPublications",
  "outboundExchangeStudentsHeadcount",
  "subjectWeightedPatentCitationCount",
  "subjectWeightedAcademicStaffForPatents",
  "subjectWeightedResearchStaffForPatents",
] as const;

export type TheInstitutionalInputId = (typeof THE_INSTITUTIONAL_INPUT_IDS)[number];
export type TheAdditionalInputId = (typeof THE_ADDITIONAL_INPUT_IDS)[number];
export type TheRawInputId = TheInstitutionalInputId | TheAdditionalInputId;

export type TheInputSource =
  | "institutional"
  | "additional"
  | "bibliometric"
  | "reputation"
  | "subject-weighted"
  | "financial-preprocessed";

export type TheRawInputUnit =
  | "fte"
  | "count"
  | "ratio"
  | "currency"
  | "currency-ppp"
  | "votes"
  | "fwci"
  | "raw-index";

export interface TheRawInputDefinition {
  id: TheRawInputId;
  label: { tr: string; en: string };
  unit: TheRawInputUnit;
  source: TheInputSource;
  requiredForMetrics: readonly TheRawIndicatorId[];
  editableInScenario: boolean;
  description: { tr: string; en: string };
}

export type TheRawInputValues = Partial<Record<TheRawInputId, number | null>>;
export type TheRawIndicatorStatus = "calculated" | "external" | "missing" | "invalid";
export type TheCalculationAccuracy = "official-raw" | "external-data" | "missing";

export interface TheRawIndicatorResult {
  metricId: TheRawIndicatorId;
  value: number | null;
  status: TheRawIndicatorStatus;
  accuracy: TheCalculationAccuracy;
  requiredInputIds: readonly TheRawInputId[];
  missingInputIds: readonly TheRawInputId[];
  invalidInputIds: readonly TheRawInputId[];
  warnings: string[];
}

export interface TheRawCalculationResult {
  methodologyYear: "2026";
  indicators: Record<TheRawIndicatorId, TheRawIndicatorResult>;
  missingInputIds: TheRawInputId[];
  invalidInputIds: TheRawInputId[];
  status: "complete" | "partial" | "invalid";
}

export type TheRawIndicatorCategory =
  | "teaching"
  | "researchEnvironment"
  | "researchQuality"
  | "internationalOutlook"
  | "industry";

export interface TheRawIndicatorDefinition {
  id: TheRawIndicatorId;
  officialName: string;
  category: TheRawIndicatorCategory;
  weight: number;
  requiredInputIds: readonly TheRawInputId[];
  inputMode: "formula" | "external";
}

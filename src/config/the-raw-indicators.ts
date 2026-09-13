import type { TheRawIndicatorDefinition, TheRawIndicatorId } from "@/src/types/the-raw-calculation";

const indicator = (definition: TheRawIndicatorDefinition) => definition;

export const THE_RAW_INDICATOR_DEFINITIONS = [
  indicator({ id: "teachingReputation", officialName: "Teaching Reputation", category: "teaching", weight: 0.15, requiredInputIds: ["teachingReputationVotes"], inputMode: "external" }),
  indicator({ id: "studentStaffRatio", officialName: "Student Staff Ratio", category: "teaching", weight: 0.045, requiredInputIds: ["academicStaffFte", "studentsFte"], inputMode: "formula" }),
  indicator({ id: "doctorateBachelorRatio", officialName: "Doctorate Bachelor Ratio", category: "teaching", weight: 0.02, requiredInputIds: ["doctoratesAwarded", "undergraduateDegreesAwarded"], inputMode: "formula" }),
  indicator({ id: "doctorateStaffRatio", officialName: "Doctorate Staff Ratio", category: "teaching", weight: 0.055, requiredInputIds: ["subjectWeightedDoctorates", "subjectWeightedAcademicStaffForDoctorates"], inputMode: "formula" }),
  indicator({ id: "institutionalIncome", officialName: "Institutional Income", category: "teaching", weight: 0.025, requiredInputIds: ["institutionalIncomePppAdjusted", "academicStaffFte"], inputMode: "formula" }),
  indicator({ id: "researchReputation", officialName: "Research Reputation", category: "researchEnvironment", weight: 0.18, requiredInputIds: ["researchReputationVotes"], inputMode: "external" }),
  indicator({ id: "researchIncome", officialName: "Research Income", category: "researchEnvironment", weight: 0.055, requiredInputIds: ["subjectWeightedResearchIncomePppAdjusted", "subjectWeightedAcademicStaffForResearchIncome"], inputMode: "formula" }),
  indicator({ id: "researchProductivity", officialName: "Research Productivity", category: "researchEnvironment", weight: 0.055, requiredInputIds: ["subjectWeightedPublicationCount", "subjectWeightedAcademicStaffForProductivity", "subjectWeightedResearchStaffForProductivity"], inputMode: "formula" }),
  indicator({ id: "citationImpact", officialName: "Citation Impact", category: "researchQuality", weight: 0.15, requiredInputIds: ["citationImpactCountryAdjustedRaw", "citationImpactNonCountryAdjustedRaw"], inputMode: "formula" }),
  indicator({ id: "researchStrength", officialName: "Research Strength", category: "researchQuality", weight: 0.05, requiredInputIds: ["researchStrengthFwci75thPercentile"], inputMode: "external" }),
  indicator({ id: "researchExcellence", officialName: "Research Excellence", category: "researchQuality", weight: 0.05, requiredInputIds: ["researchExcellenceAdjustedRaw"], inputMode: "external" }),
  indicator({ id: "researchInfluence", officialName: "Research Influence", category: "researchQuality", weight: 0.05, requiredInputIds: ["researchInfluenceAdjustedRaw"], inputMode: "external" }),
  indicator({ id: "internationalStudents", officialName: "International Students", category: "internationalOutlook", weight: 0.025, requiredInputIds: ["internationalStudentsFte", "studentsFte"], inputMode: "formula" }),
  indicator({ id: "internationalStaff", officialName: "International Staff", category: "internationalOutlook", weight: 0.025, requiredInputIds: ["internationalAcademicStaffFte", "academicStaffFte"], inputMode: "formula" }),
  indicator({ id: "internationalCoauthorship", officialName: "International Co-authorship", category: "internationalOutlook", weight: 0.025, requiredInputIds: ["subjectWeightedInternationalCoauthoredPublications", "subjectWeightedTotalPublications"], inputMode: "formula" }),
  indicator({ id: "studyAbroad", officialName: "Studying Abroad", category: "internationalOutlook", weight: 0, requiredInputIds: ["outboundExchangeStudentsHeadcount", "studentsFte"], inputMode: "formula" }),
  indicator({ id: "industryIncome", officialName: "Industry Income", category: "industry", weight: 0.02, requiredInputIds: ["industryIncomePppAdjusted", "academicStaffFte"], inputMode: "formula" }),
  indicator({ id: "patents", officialName: "Patents", category: "industry", weight: 0.02, requiredInputIds: ["subjectWeightedPatentCitationCount", "subjectWeightedAcademicStaffForPatents", "subjectWeightedResearchStaffForPatents"], inputMode: "formula" }),
] as const satisfies readonly TheRawIndicatorDefinition[];

export const THE_RAW_INDICATORS_BY_ID = Object.fromEntries(
  THE_RAW_INDICATOR_DEFINITIONS.map((definition) => [definition.id, definition]),
) as Record<TheRawIndicatorId, TheRawIndicatorDefinition>;

/** Existing simulator codes are retained for backward compatibility; the new keys are official-name mappings. */
export const THE_RAW_INDICATOR_LEGACY_CODE_MAP = {
  teachingReputation: "TREP",
  studentStaffRatio: "SSR",
  doctorateBachelorRatio: "DBR",
  doctorateStaffRatio: "DSR",
  institutionalIncome: "II",
  researchReputation: "RREP",
  researchIncome: "RI",
  researchProductivity: "RP",
  citationImpact: "CI",
  researchStrength: "RS",
  researchExcellence: "RE",
  researchInfluence: "RINF",
  internationalStudents: "IS",
  internationalStaff: "IF",
  internationalCoauthorship: "IC",
  studyAbroad: "SA",
  industryIncome: "IND",
  patents: "PAT",
} as const satisfies Record<TheRawIndicatorId, string>;

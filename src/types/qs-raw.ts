import type { QsIndicatorCode } from "./qs";

export const QS_FACULTY_AREA_CODES = [
  "artsHumanities",
  "engineeringTechnology",
  "lifeSciencesMedicine",
  "naturalSciences",
  "socialSciencesManagement",
] as const;

export type QsFacultyAreaCode = typeof QS_FACULTY_AREA_CODES[number];
export type QsDerivedValueKind = "headcount" | "actualFte" | "roundedFte" | "scalar";
export type QsInstitutionalInputRole = "score-affecting" | "indicator-only" | "informational";

export interface QsDerivedCountInput {
  headcount: number | null;
  actualFte: number | null;
  roundedFte: number | null;
}

export interface QsInstitutionalCalculationInputs {
  academicStaff: QsDerivedCountInput;
  internationalAcademicStaff: QsDerivedCountInput;
  students: QsDerivedCountInput;
  internationalStudents: QsDerivedCountInput;
  studentNationalityCount: number | null;
  employment: {
    totalGraduates: number | null;
    respondents: number | null;
    employed: number | null;
    unemployed: number | null;
    furtherStudy: number | null;
    unavailableForWork: number | null;
  };
}

export type QsAdditionalInputKey =
  | `academicReputation.${QsFacultyAreaCode}.domesticWeightedNominations`
  | `academicReputation.${QsFacultyAreaCode}.internationalWeightedNominations`
  | `citationsPerFaculty.${QsFacultyAreaCode}.fieldNormalizedCitations`
  | `employerReputation.domesticWeightedNominations`
  | `employerReputation.internationalWeightedNominations`
  | "employmentOutcomes.alumniImpactIndex"
  | "employmentOutcomes.graduateEmploymentIndex"
  | `internationalResearchNetwork.${QsFacultyAreaCode}.distinctCountries`
  | `internationalResearchNetwork.${QsFacultyAreaCode}.distinctInternationalPartners`
  | "sustainability.qsIndicatorValue"
  | "sustainability.sourceYear";

export type QsAdditionalCalculationInputs = Record<QsAdditionalInputKey, number | null>;

export interface QsCalculationInputs {
  institutional: QsInstitutionalCalculationInputs;
  additional: QsAdditionalCalculationInputs;
}

export type QsRawIndicatorStatus =
  | "calculated"
  | "missing-input"
  | "invalid-input"
  | "zero-denominator"
  | "external-data-required"
  | "normalization-required";

export type QsRawIndicatorSourceType =
  | "institutional"
  | "external"
  | "institutional-and-external";

export interface QsRawIndicatorResult {
  code: QsIndicatorCode;
  rawValue: number | null;
  status: QsRawIndicatorStatus;
  inputsUsed: string[];
  missingInputs: string[];
  warnings: string[];
  sourceType: QsRawIndicatorSourceType;
  calculationMetadata: {
    numerator?: number | null;
    denominator?: number | null;
    components?: Record<string, number | null>;
    scope?: string;
    derivedValueKind?: QsDerivedValueKind;
    uncappedRawValue?: number | null;
    cappedRawValue?: number | null;
    cap?: number;
    approximateCitationData?: boolean;
  };
}

export type QsRawIndicatorResults = Record<QsIndicatorCode, QsRawIndicatorResult>;

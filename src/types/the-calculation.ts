export type TheIndicatorCode = "TREP" | "SSR" | "DBR" | "DSR" | "II" | "RREP" | "RI" | "RP" | "CI" | "RS" | "RE" | "RINF" | "IS" | "IF" | "IC" | "SA" | "IND" | "PAT";
export type TheCategoryCode = "TEACHING" | "RESEARCH_ENVIRONMENT" | "RESEARCH_QUALITY" | "INTERNATIONAL_OUTLOOK" | "INDUSTRY";
export type TheIndicatorSource = "external-score" | "raw-calculation" | "simulation-approximation" | "imputed" | "unavailable";
export type TheNormalizedRawIndicatorCode = "SSR" | "DBR" | "DSR" | "II" | "RI" | "RP" | "IS" | "IF" | "IC" | "SA" | "IND";
export type TheCalculationStatus = "ready" | "missing-inputs" | "missing-references" | "invalid-inputs";

export interface TheNormalizationIndicatorReference { mean: number | null; standardDeviation: number | null; sampleSize: number | null; sourceDescription: string }
export interface TheNormalizationMetadata { methodology: string; methodologyYear: 2026; referenceSetId: string; datasetName: string | null; sourceYear: number | null; populationScope: string | null; sourceDescription: string; updatedAt: string | null }
export interface TheNormalizationReferenceSet { metadata: TheNormalizationMetadata; indicators: Record<TheNormalizedRawIndicatorCode, TheNormalizationIndicatorReference> }
export interface TheReferenceValidationResult { valid: boolean; ready: boolean; warnings: string[] }
export interface TheReferenceReadiness { requiredCount: number; readyCount: number; missingCount: number; readyIndicators: TheNormalizedRawIndicatorCode[]; missingIndicators: TheNormalizedRawIndicatorCode[]; warnings: string[]; complete: boolean }
export interface TheCalculationReadiness { status: TheCalculationStatus; requiredReferenceCount: number; readyReferenceCount: number; missingReferenceIndicators: TheNormalizedRawIndicatorCode[]; missingInputIndicators: TheIndicatorCode[]; invalidIndicators: TheIndicatorCode[]; warnings: string[] }

export interface TheCalculationInput {
  teachingReputationScore: number | null; studentsFte: number | null; academicStaffFte: number | null; bachelorGraduates: number | null; doctorateGraduates: number | null; institutionalIncomePpp: number | null;
  researchReputationScore: number | null; researchIncomePpp: number | null; academicResearchStaffFte: number | null; publicationCount: number | null; fieldWeightedResearchIncome: number | null; fieldWeightedPublications: number | null;
  citationImpactScore: number | null; researchStrengthScore: number | null; researchExcellenceScore: number | null; researchInfluenceScore: number | null;
  rawCitationCount: number | null; fwci: number | null; highImpactPublicationRatio: number | null;
  internationalStudentsFte: number | null; internationalAcademicStaffFte: number | null; internationalCoauthoredPublications: number | null; outboundStudents: number | null;
  industryResearchIncomePpp: number | null; patentScore: number | null; citingPatentCount: number | null;
}

export interface TheRawIndicatorResult { code: TheIndicatorCode; category: TheCategoryCode; label: string; rawValue: number | null; rawUnit: string | null; source: TheIndicatorSource; approximation: boolean; valid: boolean; warnings: string[]; dependencies: string[] }
export interface TheIndicatorScoreResult extends TheRawIndicatorResult { score: number | null; normalizationMethod: "external-direct" | "zscore-cdf-simulation" | "not-normalized"; normalizationReferenceId: string | null; referenceSetReady: boolean; referenceSourceDescription: string | null; mean: number | null; standardDeviation: number | null; zScore: number | null }
export interface TheIndicatorEngineResult { inputs: TheCalculationInput; rawIndicators: Record<TheIndicatorCode, TheRawIndicatorResult>; indicatorScores: Record<TheIndicatorCode, TheIndicatorScoreResult>; warnings: string[]; hasMissingReferences: boolean; referenceReadiness: TheReferenceReadiness; calculationReadiness: TheCalculationReadiness }
export interface TheImputationContext { institutionTwoLowestMean: number | null; populationMinimumScore: number | null }
export interface SafeDivisionResult { value: number | null; valid: boolean; warning?: string }

export interface TheCategoryScores {
  teaching: number | null;
  researchEnvironment: number | null;
  researchQuality: number | null;
  industry: number | null;
  internationalOutlook: number | null;
}

export interface TheAggregateResult {
  totalScore: number | null;
  categoryScores: TheCategoryScores;
  complete: boolean;
  missingIndicators: TheIndicatorCode[];
  warnings: string[];
}

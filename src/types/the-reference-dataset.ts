import type { TheCategoryScores } from "@/src/types/the-calculation";

export type TheReferenceSourceType =
  | "the-public"
  | "the-licensed"
  | "manual-verified";

export interface TheReferenceInstitutionRecord {
  id: string;
  universityName: string;
  countryCode: string | null;
  methodologyYear: number;
  categoryScores: TheCategoryScores;
  overallScore: number | null;
  rank: number | null;
  rankBand: string | null;
  sourceType: TheReferenceSourceType;
  sourceNote: string | null;
}

export interface TheReferenceDatasetManifest {
  datasetId: string;
  methodology: "the";
  methodologyYear: number;
  version: string;
  updatedAt: string | null;
  recordCount: number;
  description: string;
  sourceSummary: string;
  warnings: string[];
}

export interface TheReferenceDataset {
  manifest: TheReferenceDatasetManifest;
  records: TheReferenceInstitutionRecord[];
}

export interface TheReferenceDatasetValidationResult {
  valid: boolean;
  dataset: TheReferenceDataset | null;
  errors: string[];
  warnings: string[];
}

export interface TheReferenceDatasetSummary {
  recordCount: number;
  recordsWithOverallScore: number;
  recordsWithRank: number;
  recordsWithRankBand: number;
  recordsWithCompleteCategoryScores: number;
  availableRankBands: string[];
}

export interface TheReferenceCsvParseResult {
  records: TheReferenceInstitutionRecord[];
  errors: string[];
  warnings: string[];
}

export interface TheReferenceCsvRowResult {
  record: TheReferenceInstitutionRecord | null;
  errors: string[];
  warnings: string[];
}

export interface TheReferenceImportResult {
  success: boolean;
  importedRecordCount: number;
  totalRecordCount: number;
  dataset: TheReferenceDataset | null;
  errors: string[];
  warnings: string[];
  wroteDataset: boolean;
}

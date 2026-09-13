import type { QsIndicatorCode } from "@/src/types/qs";

export interface QsReferenceInstitutionRecord {
  institutionId: string;
  institutionName: string;
  country: string | null;
  methodologyYear: number;
  rank: number | null;
  rankBand: string | null;
  tiedRank?: boolean;
  overallScore: number | null;
  derivedWeightedScore?: number | null;
  derivedScoreMetadata?: {
    method: "official-weighted-indicator-sum";
    officialOverall: false;
    indicatorCount: number;
    methodologyYear: number;
  } | null;
  indicatorScores: Partial<Record<QsIndicatorCode, number>>;
  sourceMetadata: {
    sourceName: string;
    sourceReference: string | null;
    accessedAt: string | null;
    methodologyYearVerified: boolean;
    officialVerificationReference?: string;
    sourceTier?: "secondary-verified" | "official";
    officialDatasetClaim?: boolean;
  };
  completeness: {
    availableIndicatorCodes: QsIndicatorCode[];
    missingWeightedIndicatorCodes: QsIndicatorCode[];
    weightedIndicatorCount: number;
    totalWeightedIndicatorCount: number;
    completenessRatio: number;
    classification: "complete" | "partial" | "rank-only" | "invalid";
    completeForDistanceModel: boolean;
  };
  isTargetInstitution?: boolean;
}

export interface QsReferenceDataset {
  schemaVersion: 1;
  records: Array<Omit<QsReferenceInstitutionRecord, "completeness">>;
}

export interface QsReferenceDatasetSummary {
  totalRecordCount: number;
  methodologyYears: number[];
  completeRecordCount: number;
  partialRecordCount: number;
  rankOnlyRecordCount: number;
  invalidRecordCount: number;
  exactRankCount: number;
  rankBandCount: number;
  overallScoreCount: number;
  indicatorAvailability: Record<QsIndicatorCode, number>;
  countryCount: number;
  duplicateCount: number;
  sourceVerifiedCount: number;
  modelReadyRecordCount: number;
}

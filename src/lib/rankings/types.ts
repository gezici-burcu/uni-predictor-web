export type RankingMethodology = "QS" | "THE";
export type RankingReferenceSourceType = "bundled" | "downloaded" | "manually-imported";

export type RankingDatasetCoverage = {
  rankBands: string[];
  bestRank: number | null;
  worstRank: number | null;
  completeVectorCount: number;
  incompleteRecordCount: number;
};

export type RankingReferenceDatasetMetadata = {
  datasetId: string;
  methodology: RankingMethodology;
  edition: number;
  datasetVersion: string;
  schemaVersion: number;
  sourceLabel: string;
  sourceType: RankingReferenceSourceType;
  publishedAt: string | null;
  generatedAt: string | null;
  recordCount: number;
  usableRecordCount: number;
  coverage: RankingDatasetCoverage;
  checksum: string | null;
};

export type RankingManifestEntry = {
  activeEdition: number;
  datasetId: string;
  datasetVersion: string;
  file: string;
  url?: string | null;
  publishedAt: string | null;
  addedToProjectAt: string | null;
  sourceLabel: string;
  recordCount: number;
  usableRecordCount: number;
  checksum?: string | null;
};

export type RankingReferenceManifest = {
  schemaVersion: number;
  generatedAt: string;
  methodologies: Record<RankingMethodology, RankingManifestEntry>;
};

export type QsRankingRecord = {
  institutionId: string; institutionName: string; country: string | null; edition: number;
  publishedRank: number | null; publishedRankBand: string | null; overallScore: number | null;
  indicators: Partial<Record<"AR"|"CPF"|"ER"|"EO"|"IFR"|"IRN"|"ISR"|"FSR"|"SUS"|"ISD", number>>;
  completeness: { hasRank: boolean; hasWeightedIndicatorVector: boolean; hasOverallScore: boolean };
};

export type TheRankingRecord = {
  institutionId: string; institutionName: string; country: string | null; edition: number;
  publishedRank: number | null; publishedRankBand: string | null; overallScore: number | null;
  categories: Partial<Record<"teaching"|"researchEnvironment"|"researchQuality"|"internationalOutlook"|"industry", number>>;
  completeness: { hasRank: boolean; hasCategoryVector: boolean; hasOverallScore: boolean };
};

export type RankingReferenceDataset = {
  metadata: RankingReferenceDatasetMetadata;
  records: Array<QsRankingRecord | TheRankingRecord>;
};

export type RankingDatasetValidationReport = {
  valid: boolean; totalRecords: number; usableRecords: number; duplicateInstitutions: string[];
  invalidRecords: number; missingRankRecords: number; incompleteVectorRecords: number;
  coveredRankBands: string[]; warnings: string[]; errors: string[];
};

export type RankingDatasetResolution = {
  dataset: RankingReferenceDataset;
  metadata: RankingReferenceDatasetMetadata;
  sourceType: RankingReferenceSourceType;
  fallbackUsed: boolean;
  warnings: string[];
};

export type RankingCoverageResult = {
  isSufficient: boolean; usableRecordCount: number; requiredNeighborCount: number;
  availableNeighborCount: number; coveredRankBands: string[]; outOfDistribution: boolean;
  reasons: string[];
};

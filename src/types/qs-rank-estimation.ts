import type { QsIndicatorCode } from "./qs";

export interface QsRankFeatureStatistics {
  code: QsIndicatorCode;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  standardDeviation: number;
  scale: number;
  scaleSource: "iqr" | "standard-deviation" | "unit";
}

export interface QsRankBandDefinition {
  id: string;
  label: string;
  lowerBound: number;
  upperBound: number | null;
  openEnded: boolean;
  order: number;
}

export interface QsRankCrossValidationResult {
  k: number;
  bandHitRate: number;
  adjacentBandHitRate: number;
  medianAbsoluteRankError: number;
  meanAbsoluteRankError: number;
  bandAccuracy: Record<string, number | null>;
  selected: boolean;
}

export interface QsRankModelArtifact {
  schemaVersion: 1;
  modelId: "qs-wur-2027-rank-knn";
  modelVersion: string;
  methodologyYear: 2027;
  sourceDataset: {
    sourceId: string;
    sha256: string;
    totalRecords: number;
    completeRecords: number;
  };
  featureCodes: QsIndicatorCode[];
  featureStatistics: Partial<Record<QsIndicatorCode, QsRankFeatureStatistics>>;
  selectedK: number;
  candidateKResults: QsRankCrossValidationResult[];
  distanceConfig: {
    metric: "official-weighted-robust-euclidean";
    inverseDistancePower: number;
    epsilon: number;
  };
  bandTaxonomy: QsRankBandDefinition[];
  validationSummary: {
    bandHitRate: number;
    adjacentBandHitRate: number;
    medianAbsoluteRankError: number;
  };
  generatedAt: string;
}

export interface QsBandProbability {
  band: string;
  probability: number;
  order: number;
}

export interface QsRankNeighborSummary {
  institutionId: string;
  institutionName: string;
  country: string | null;
  distance: number;
  similarityWeight: number;
  rank: number | null;
  rankBand: string | null;
  rankProxy: number;
  rankProxySource: "exact-rank" | "rank-band-midpoint-proxy" | "open-ended-tail-proxy";
  derivedWeightedScore: number | null;
}

export type QsRankPredictionStatus =
  | "ready"
  | "score-incomplete"
  | "dataset-insufficient"
  | "model-stale"
  | "invalid-input";

export interface QsRankDistribution {
  expectedRank: number | null;
  medianRank: number | null;
  p10Rank: number | null;
  p90Rank: number | null;
  predictedBand: string | null;
  bandProbabilities: QsBandProbability[];
}

export interface QsRankPredictionSide {
  status: QsRankPredictionStatus;
  raw: QsRankDistribution;
  calibrated: QsRankDistribution;
  modelConfidence: {
    level: "high" | "medium" | "low" | null;
    score: number | null;
    reasons: string[];
  };
  nearestNeighbors: QsRankNeighborSummary[];
}

export interface QsDominanceGuardResult {
  applied: boolean;
  direction: "scenario-dominates" | "current-dominates" | "mixed" | "equal";
  adjustment: string | null;
}

export interface QsRankEstimationResult {
  modelVersion: string;
  methodologyYear: number;
  datasetHash: string;
  selectedK: number;
  calibration: {
    institutionId: string;
    publishedBand: string;
    representativeRank: number;
    representativeMethod: "closed-band-midpoint";
    rawCurrentExpectedRank: number | null;
    offset: number | null;
  };
  current: QsRankPredictionSide;
  scenario: QsRankPredictionSide;
  change: {
    status: "improved" | "unchanged" | "worsened" | "unavailable";
    bandDelta: number | null;
    expectedRankDelta: number | null;
    label: string;
  };
  dominanceGuard: QsDominanceGuardResult;
  diagnostics: {
    totalReferenceRecords: number;
    completeReferenceRecords: number;
    eligibleNeighborCount: number;
    targetExcluded: boolean;
    featureCodes: QsIndicatorCode[];
    reusedScenarioResult: boolean;
  };
}

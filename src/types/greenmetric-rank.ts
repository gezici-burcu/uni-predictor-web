export type UiGreenMetricRankConfidence = "HIGH" | "MEDIUM" | "LOW";
export type UiGreenMetricRankMethod = "historical-local-interpolation" | "unavailable";
export type UiGreenMetricRankPosition =
  | "exact-observation"
  | "interpolation"
  | "above-range"
  | "below-range"
  | "unavailable";
export type UiGreenMetricRankPointSourceType =
  | "official-historical"
  | "derived-historical"
  | "approximate-manual"
  | "unknown-source";

export type UiGreenMetricHistoricalRankingRecord = {
  rank: number;
  university: string;
  country: string;
  totalScore: number;
  year: 2025;
};

export type UiGreenMetricHistoricalRankingDataset = {
  metadata: {
    datasetId: string;
    datasetVersion: string;
    year: 2025;
    methodologyYear: 2025;
    sourceType: "official-historical";
    sourceLabel: string;
    sourceUrl: string;
    importedAt: string;
    recordCount: number;
    checksum: string;
    calibrationUse: "approximate-2026-total-score-rank-calibration";
    categoryDataUse: "not-imported-six-category-2025-methodology";
  };
  records: UiGreenMetricHistoricalRankingRecord[];
};

export type UiGreenMetricRankCalibrationPoint = {
  score: number;
  rank: number;
  sourceYear: number;
  methodologyYear: number;
  institution: string | null;
  sourceType: UiGreenMetricRankPointSourceType;
  source: string;
};

export type UiGreenMetricRankCalibrationDataset = {
  metadata: {
    datasetId: string;
    calibrationDataYear: number;
    calibrationMethodologyYear: number;
    sourceLabel: string;
    sourceType: "approximate-fallback" | "historical-ranking-dataset" | "official-historical-dataset";
    provenance: string;
    approximate: boolean;
    institutionCount: number | null;
  };
  points: UiGreenMetricRankCalibrationPoint[];
};

export type UiGreenMetricRankEstimate = {
  inputScore: number | null;
  estimatedRank: number | null;
  estimatedRankBand: string | null;
  observedRankRange: { minimum: number; maximum: number } | null;
  nearestScoreDistance: number | null;
  confidence: UiGreenMetricRankConfidence;
  approximate: boolean;
  method: UiGreenMetricRankMethod;
  position: UiGreenMetricRankPosition;
  isExtrapolated: boolean;
  scoreMethodologyYear: number;
  calibrationDataYear: number;
  calibrationMethodologyYear: number;
  calibrationDatasetId: string;
  calibrationSourceType: UiGreenMetricRankCalibrationDataset["metadata"]["sourceType"];
  calibrationPointCount: number;
};

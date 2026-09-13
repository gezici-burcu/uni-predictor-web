import type { QsIndicatorCode, QsLensScores } from "./qs";
import type { QsRawIndicatorResult, QsRawIndicatorResults } from "./qs-raw";

export type QsNormalizationMode =
  | "stochastic-anchor"
  | "external-score-direct"
  | "indicator-only"
  | "unsupported";

export type QsScoreUsage = "weighted" | "indicator-only";

export interface QsStochasticIndicatorDefinition {
  code: QsIndicatorCode;
  label: string;
  shortLabel: string;
  englishLabel: string;
  officialWeight: number;
  beneficialDirection: "higherIsBetter" | "lowerIsBetter";
  scoreUsage: QsScoreUsage;
  sourceType: QsRawIndicatorResult["sourceType"];
  normalizationMode: QsNormalizationMode;
}

export interface QsStochasticCalibration {
  institutionId: string;
  methodologyYear: number;
  institutionalBaselineYear: number | null;
  publishedIndicatorScores: Partial<Record<QsIndicatorCode, number>>;
  publishedOverallScore: number | null;
  publishedRankBand: string | null;
  publishedRank?: number | null;
  derivedWeightedScore?: number | null;
  baselineMode?: "raw-anchor" | "published-reference-only";
  scoreSourceType?: "published-indicator-scores";
  sourceReferences?: readonly string[];
  sourceRecordId: string;
}

export type QsIndicatorScoreSource =
  | "official-qs-2027-reference"
  | "same-year-official"
  | "same-year-external"
  | "previous-year-official"
  | "published-reference"
  | "held-constant-no-calibration"
  | "held-constant-no-public-calibration"
  | "held-constant-no-public-normalization"
  | "direct-external-score"
  | "estimated-from-current-raw"
  | "unavailable-no-calibration"
  | "missing";

export type QsIndicatorSimulationStatus =
  | "ready"
  | "missing-input"
  | "external-data-required"
  | "calibration-required"
  | "invalid-input"
  | "zero-denominator";

export interface QsIndicatorSimulationSummary {
  code: QsIndicatorCode;
  status: QsIndicatorSimulationStatus;
  rawValue: number | null;
  mean: number | null;
  median: number | null;
  p10: number | null;
  p90: number | null;
  officialWeight: number;
  warnings: string[];
  sampleSource: "published-reference" | "current-reuse" | "external-direct" | "estimated" | "held-constant" | "unavailable";
  source: QsIndicatorScoreSource;
  sourceYear: number | null;
  sourceEdition: number | null;
  isApproximate: boolean;
  currentRaw: number | null;
  scenarioRaw: number | null;
  referenceRaw: number | null;
  referenceScore: number | null;
  calibrationType: "official" | "empirical" | "model-based" | "unavailable";
  calibrationYear: number | null;
  calibrationDataPointCount: number;
  calibrationConfidence: "high" | "medium" | "low" | "unavailable";
  samples?: number[];
}

export interface QsSimulationSide {
  indicators: Record<QsIndicatorCode, QsIndicatorSimulationSummary>;
  overallMean: number | null;
  overallMedian: number | null;
  overallP10: number | null;
  overallP90: number | null;
  overallStatus: "ready" | "incomplete";
  readyWeightedIndicatorCount: number;
  totalWeightedIndicatorCount: number;
  missingIndicatorCodes: QsIndicatorCode[];
  compositeScore: number | null;
  /** Official-weight composition of the nine weighted indicator scores. */
  weightedCompositeScore: number | null;
  /** Empirical estimate on the QS overall-score scale. */
  estimatedOverallScore: number | null;
  /** Same-subset baseline comparison score used for partial scenario deltas. */
  partialEstimatedOverallScore: number | null;
  partialWeightedCompositeScore: number | null;
  includedIndicatorCodes: QsIndicatorCode[];
  excludedIndicatorCodes: QsIndicatorCode[];
  includedWeight: number;
  excludedWeight: number;
  isPartial: boolean;
  overallScoreType: "empirical-estimate";
  isOfficialOverallScore: false;
  normalizerSampleSize: number;
  normalizerRSquared: number;
  scoreCoverage: number;
  institutionalDataReadiness: number;
  ratioScoreCalibrationCoverage: number;
  lensScores: QsLensScores;
  indicatorSources: Record<QsIndicatorCode, QsIndicatorScoreSource>;
  isApproximate: boolean;
  overallScoreSource: "empirical-qs-2027-public-table-normalization" | "missing";
  overallScoreSourceYear: number | null;
  overallSamples?: number[];
}

export interface QsStochasticSimulationResult {
  modelVersion: string;
  methodologyYear: number;
  rankingEdition: number;
  institutionalDataYear: number;
  scoreReferenceInstitution: string;
  scoreReferenceEdition: number;
  isApproximate: true;
  calculationStatus: "complete" | "complete-with-held-indicator-scores" | "raw-analysis-only" | "missing-data";
  warnings: string[];
  seed: number;
  runCount: number;
  current: QsSimulationSide;
  scenario: QsSimulationSide;
  change: {
    indicatorMedianDifference: Record<QsIndicatorCode, number | null>;
    overallMedianDifference: number | null;
  };
  diagnostics: {
    calibrationSourceRecordId: string;
    calibrationRawIndicators: QsRawIndicatorResults;
    currentRawIndicators: QsRawIndicatorResults;
    scenarioRawIndicators: QsRawIndicatorResults;
    missingPublishedIndicatorScores: QsIndicatorCode[];
    missingCalibrationRawIndicators: QsIndicatorCode[];
    reusedScenarioIndicatorCodes: QsIndicatorCode[];
    legacyScoreUsed: false;
    rankEstimatorUsed: false;
    selectedInstitutionalYear: number;
    publishedReferenceYear: number;
  };
}

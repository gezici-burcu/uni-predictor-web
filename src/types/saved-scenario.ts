import type {
  CrossAnalysisBaselineSnapshot,
  CrossAnalysisInput,
  CrossAnalysisResult,
} from "@/src/lib/cross-analysis/types";

export type SavedMethodologyScenarioMethodology = "THE" | "QS" | "GREENMETRIC";
export type SavedScenarioMethodology = SavedMethodologyScenarioMethodology | "CROSS_ANALYSIS";
export type SavedScenarioSource = "manual-scenario" | "recommendation-engine" | "raw-analysis" | "cross-analysis";
export type SavedScenarioCalculationStatus =
  | "complete"
  | "complete-with-held-indicator-scores"
  | "raw-analysis-only"
  | "validation-error"
  | "missing-data";

export type SavedScenarioMetricChange = {
  parameterId: string;
  label: string;
  field?: string | null;
  currentValue: unknown;
  scenarioValue: unknown;
  difference?: number | null;
  numericScoreEffect?: number | null;
  impactStatus?: string | null;
};

type SavedScenarioCommon = {
  id: string;
  name: string;
  institutionalDataYear: string | null;
  scoreReferenceEdition: string | null;
  createdAt: string;
  updatedAt: string;
  currentScore: number | null;
  scenarioScore: number | null;
  scoreDifference: number | null;
  currentWeightedCompositeScore?: number | null;
  scenarioWeightedCompositeScore?: number | null;
  currentEstimatedOverallScore?: number | null;
  scenarioEstimatedOverallScore?: number | null;
  currentEstimatedOverall?: number | null;
  scenarioEstimatedOverall?: number | null;
  currentWeightedComposite?: number | null;
  scenarioWeightedComposite?: number | null;
  scoreType?: "estimated-overall" | "legacy-unknown";
  compositeScoreType?: "weighted-indicator-composite";
  currentRankBand: string | null;
  scenarioRankBand: string | null;
  rankingReferenceDataset?: {
    datasetId: string;
    methodology: "QS" | "THE";
    edition: number;
    datasetVersion: string;
    schemaVersion: number;
    sourceType: "bundled" | "downloaded" | "manually-imported";
    usableRecordCount: number;
    generatedAt: string | null;
  } | null;
  currentRankSource?: "published-reference" | "estimated-from-reference-dataset" | "unknown";
  scenarioRankSource?: "published-reference" | "estimated-from-reference-dataset" | "unknown";
  rankEstimationStatus?: string;
  rankEstimationWarnings?: string[];
  currentRankBandSource?: "official-reference" | "estimated-current";
  scenarioRankBandSource?: "official-reference" | "estimated-scenario" | "estimated-current";
  currentScoreType?: "stochastic-estimate";
  calculationStatus: SavedScenarioCalculationStatus;
  warnings: string[];
  changedMetrics: SavedScenarioMetricChange[];
  currentCategoryScores: Record<string, number | null> | null;
  scenarioCategoryScores: Record<string, number | null> | null;
  currentIndicatorScores: Record<string, number | null> | null;
  scenarioIndicatorScores: Record<string, number | null> | null;
  currentRawMetrics?: Record<string, unknown> | null;
  scenarioRawMetrics?: Record<string, unknown> | null;
  indicatorStatuses?: Record<string, string> | null;
  rawCalculationDetails: Record<string, unknown> | null;
  recommendationContext: Record<string, unknown> | null;
};

export type SavedMethodologyScenarioSnapshot = SavedScenarioCommon & {
  methodology: SavedMethodologyScenarioMethodology;
  source: Exclude<SavedScenarioSource, "cross-analysis">;
  crossAnalysis?: never;
};

export type SavedCrossAnalysisScenarioSnapshot = SavedScenarioCommon & {
  methodology: "CROSS_ANALYSIS";
  source: "cross-analysis";
  crossAnalysis: {
    schemaVersion: 1;
    baselineIdentity: string;
    baselineSnapshot: CrossAnalysisBaselineSnapshot;
    overrides: CrossAnalysisInput[];
    resultSnapshot: CrossAnalysisResult;
  };
};

export type SavedScenarioSnapshot =
  | SavedMethodologyScenarioSnapshot
  | SavedCrossAnalysisScenarioSnapshot;

export const isSavedCrossAnalysisScenario = (
  scenario: SavedScenarioSnapshot,
): scenario is SavedCrossAnalysisScenarioSnapshot =>
  scenario.methodology === "CROSS_ANALYSIS";

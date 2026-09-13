import type { MetricDefinition } from "./metric";

export type QsMetricDefinition = MetricDefinition & {
  min: number;
  max: number;
  step: number;
  baselineValue: number;
  shared?: boolean;
  infoOnly?: boolean;
  externalScore?: boolean;
  subgroup?: string;
};

export type QsIndicatorDefinition = {
  id: string;
  title: string;
  description?: string;
  weight: number;
  metrics: QsMetricDefinition[];
  calculatedItems?: string[];
  notice?: string;
};

export type QsCategoryDefinition = {
  id: string;
  title: string;
  description: string;
  weight: number;
  indicators: QsIndicatorDefinition[];
};

export type QsMetricValues = Record<string, number>;

export type QsIndicatorCode = "AR" | "CPF" | "ER" | "EO" | "IFR" | "IRN" | "ISD" | "ISR" | "FSR" | "SUS";
export type QsWeightedIndicatorCode = Exclude<QsIndicatorCode, "ISD">;
export type QsLensCode = "researchDiscovery" | "employabilityOutcomes" | "globalEngagement" | "learningExperience" | "sustainability";
export type QsValueSource = "qs-wur-published-indicator-score" | "qs-public-profile" | "derived-from-qs-public-profile" | "temporary-simulation-placeholder" | "institution-provided" | "unavailable";

export interface QsLensScores {
  researchDiscovery: number | null;
  employabilityOutcomes: number | null;
  globalEngagement: number | null;
  learningExperience: number | null;
  sustainability: number | null;
}

export interface QsIndicatorNormalizationReference {
  mean: number | null; standardDeviation: number | null; minScaled: number | null; maxScaled: number | null;
  lockedTopX: number | null; zClipMin: number | null; zClipMax: number | null; sourceDescription: string;
}
export interface QsOverallNormalizationReference { weightedMin: number | null; weightedMax: number | null; sourceYear: number | null; sourceDescription: string; }

export interface QsRawIndicators { IFR: number | null; ISR: number | null; FSR: number | null; ISD: number | null; }
export interface QsCalculationDetail {
  code: QsIndicatorCode; source: QsValueSource; baselineRawValue: number | null; scenarioRawValue: number | null;
  publishedBaselineScore: number | null; temporaryMean: number | null; temporaryStandardDeviation: number | null;
  baselineInternalScore: number | null; scenarioInternalScore: number | null; displayedScenarioScore: number | null;
  weight: number; contribution: number | null; warning: string | null;
}
export interface QsCalculationResult {
  indicatorScores: Record<QsIndicatorCode, number | null>; lensScores: QsLensScores;
  weightedScore: number | null; finalOverallScore: number | null; displayedScore: number | null;
  publishedRankBand: string | null; estimatedScenarioRankBand: string | null;
  scoreKind: "estimated-overall" | "qs-final-overall" | "weighted-public-simulation" | "unavailable";
  complete: boolean; missingIndicators: QsIndicatorCode[]; invalidIndicators: QsIndicatorCode[]; warnings: string[];
  rawIndicators: QsRawIndicators; details: QsCalculationDetail[];
}

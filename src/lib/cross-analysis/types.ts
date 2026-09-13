import type { InstitutionDataYear } from "@/src/config/institution-data-years";
import type { StoredInstitutionData } from "@/src/contexts/InstitutionDataContext";
import type { QsRankPredictionSide } from "@/src/types/qs-rank-estimation";
import type { CalibratedTheRankEstimate } from "@/src/lib/the/calibrated-rank-band";

export type CrossAnalysisMethodologyId = "the" | "qs";
export type CrossAnalysisBaselineUnavailableReason =
  | "no-current-data"
  | "no-history"
  | "incomplete-baseline"
  | "invalid-baseline";
export type LegacyCrossAnalysisParameterId =
  | "academicStaffFte"
  | "internationalAcademicStaffFte"
  | "studentsFte"
  | "internationalStudentsFte";
export type CrossAnalysisParameterId = string;

export type CrossAnalysisParameterValueType = "integer" | "decimal" | "currency";
export type CrossAnalysisParameterSemanticType =
  | "fte" | "headcount" | "currency" | "area" | "energy" | "emissions"
  | "percentage" | "count" | "waste";
export type CrossAnalysisImpactRole = "numerator" | "denominator" | "mixed";
export type CrossAnalysisUnaffectedReason =
  | "notMapped"
  | "notUsedInScore"
  | "semanticMismatch"
  | "externalMetricOnly"
  | "insufficientDependency";

export interface CrossAnalysisParameterMapping {
  inputPaths: readonly string[];
  impactedMetrics: readonly string[];
  scoreImpactingMetrics: readonly string[];
  impactRole: CrossAnalysisImpactRole;
  qsRawComponent?: {
    target: "academicStaff" | "internationalAcademicStaff" | "students" | "internationalStudents";
    component: "fullTime" | "partTime";
  };
}

export interface CrossAnalysisParameterDefinition {
  id: CrossAnalysisParameterId;
  labelKey: string;
  labels: { tr: string; en: string };
  semanticType: CrossAnalysisParameterSemanticType;
  semanticFamily: string;
  unit: string;
  valueType: CrossAnalysisParameterValueType;
  editable: true;
  validation: {
    minimum: number;
    integerOnly: boolean;
    subsetOf?: CrossAnalysisParameterId;
    maximum?: number;
  };
  required: boolean;
  sourceSection: string;
  baselineSource: string;
  baselineSources: readonly string[];
  semanticNotes: string;
  mappings: Partial<Record<CrossAnalysisMethodologyId, CrossAnalysisParameterMapping>>;
  affectedMethodologies: readonly CrossAnalysisMethodologyId[];
  unaffectedReasons: Partial<Record<CrossAnalysisMethodologyId, CrossAnalysisUnaffectedReason>>;
}

export interface CrossAnalysisInput {
  parameterId: CrossAnalysisParameterId;
  baselineValue: number;
  proposedValue: number;
}

export interface CrossAnalysisState {
  inputs: CrossAnalysisInput[];
}

export interface CrossAnalysisBaselineSnapshot {
  source: "InstitutionDataContext";
  institutionDataUpdatedAt: string | null;
  years: {
    the: InstitutionDataYear | null;
    qs: number;
  };
  methodologyBaselines: Record<CrossAnalysisMethodologyId, {
    year: number | null;
    source: string;
    usable: boolean;
    unavailableReason: CrossAnalysisBaselineUnavailableReason | null;
  }>;
  parameters: Record<CrossAnalysisParameterId, number | null>;
  methodologyParameterValues: Record<CrossAnalysisMethodologyId, Record<CrossAnalysisParameterId, number | null>>;
  parameterSources: Record<CrossAnalysisParameterId, string | null>;
  methodologyInputs: {
    the: Record<string, unknown>;
    qs: import("@/src/types/qs-raw").QsCalculationInputs;
  };
  sourceSnapshot: Readonly<StoredInstitutionData>;
}

export type CrossAnalysisStatus =
  | "complete"
  | "raw-impact-only"
  | "not-affected"
  | "insufficient-data"
  | "invalid";

export type CrossAnalysisMetricImpactType =
  | "score-changed"
  | "raw-only"
  | "threshold-unchanged"
  | "score-unchanged"
  | "unavailable";

export type CrossAnalysisMetricValue = number | string | string[] | null;

export interface CrossAnalysisIndicatorDetail {
  metricId: string;
  baselineRawValue: CrossAnalysisMetricValue;
  proposedRawValue: CrossAnalysisMetricValue;
  baselineScore: number | null;
  proposedScore: number | null;
  scoreDelta: number | null;
  baselineContribution: number | null;
  proposedContribution: number | null;
  contributionDelta: number | null;
  scoreValueKind: "indicator-score" | "model-contribution" | "unavailable";
  impactType: CrossAnalysisMetricImpactType;
  parameterIds: CrossAnalysisParameterId[];
}

export interface CrossAnalysisValidationIssue {
  parameterIds: CrossAnalysisParameterId[];
  methodologies: CrossAnalysisMethodologyId[];
  message: string;
}

export interface CrossAnalysisMethodologyResult<TRankMetadata> {
  affected: boolean;
  status: CrossAnalysisStatus;
  baselineScore: number | null;
  proposedScore: number | null;
  scoreDelta: number | null;
  baselineRankBand: string | null;
  proposedRankBand: string | null;
  impactedMetrics: string[];
  rawChangedMetrics: string[];
  scoreChangedMetrics: string[];
  indicatorDetails: CrossAnalysisIndicatorDetail[];
  missingMetrics: string[];
  propagation?: {
    rawChangedMetrics: string[];
    scoreChangedMetrics: string[];
    heldConstantMetrics: string[];
  };
  rankMetadata: TRankMetadata;
  warnings: string[];
  baselineContext: {
    year: number | null;
    source: string;
    usable: boolean;
    unavailableReason: CrossAnalysisBaselineUnavailableReason | null;
  };
}

export interface CrossAnalysisParameterTrace {
  parameterId: CrossAnalysisParameterId;
  methodology: CrossAnalysisMethodologyId;
  baselineYear: number | null;
  baselineValue: number | null;
  proposedValue: number;
}

export interface CrossAnalysisResult {
  changes: CrossAnalysisInput[];
  parameterTraces: CrossAnalysisParameterTrace[];
  validationIssues: CrossAnalysisValidationIssue[];
  methodologies: {
    the: CrossAnalysisMethodologyResult<{
      baseline: { source: string; estimate: CalibratedTheRankEstimate | null };
      proposed: { source: string; estimate: CalibratedTheRankEstimate | null };
    }>;
    qs: CrossAnalysisMethodologyResult<{
      approximate: true;
      methodologyYear: number;
      baseline: QsRankPredictionSide;
      proposed: QsRankPredictionSide;
    }>;
  };
}

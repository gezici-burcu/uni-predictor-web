import type {
  CrossAnalysisIndicatorDetail,
  CrossAnalysisParameterId,
  CrossAnalysisMethodologyId,
  CrossAnalysisMethodologyResult,
  CrossAnalysisState,
} from "@/src/lib/cross-analysis";

export function getCrossAnalysisAffectedIndicatorDetails(
  result: Pick<CrossAnalysisMethodologyResult<unknown>, "indicatorDetails" | "scoreChangedMetrics">,
): CrossAnalysisIndicatorDetail[] {
  const changedMetricIds = new Set(result.scoreChangedMetrics);
  return result.indicatorDetails.filter((detail) => changedMetricIds.has(detail.metricId));
}

export function parseCrossAnalysisNumericInput(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function removeCrossAnalysisParameter(
  state: CrossAnalysisState,
  parameterId: CrossAnalysisParameterId,
): CrossAnalysisState {
  return { inputs: state.inputs.filter((input) => input.parameterId !== parameterId) };
}

export function canDisplayCrossAnalysisResult(
  hasChanges: boolean,
  result: Pick<CrossAnalysisMethodologyResult<unknown>, "affected" | "status">,
) {
  return hasChanges && result.affected &&
    (result.status === "complete" || result.status === "raw-impact-only");
}

export function createCrossAnalysisMethodologyPresentation(
  hasChanges: boolean,
  result: Pick<
    CrossAnalysisMethodologyResult<unknown>,
    | "affected"
    | "status"
    | "baselineScore"
    | "proposedScore"
    | "scoreDelta"
    | "baselineRankBand"
    | "proposedRankBand"
    | "baselineContext"
  >,
) {
  const baselineAvailable = result.baselineContext.usable
    && result.baselineScore !== null;
  const unaffectedWithBaseline = hasChanges && baselineAvailable && !result.affected;
  const proposedAvailable = unaffectedWithBaseline
    || (baselineAvailable &&
      (result.status === "complete" || result.status === "raw-impact-only") &&
      result.proposedScore !== null);

  return {
    baselineAvailable,
    proposedAvailable,
    baselineScore: baselineAvailable ? result.baselineScore : null,
    proposedScore: proposedAvailable
      ? result.proposedScore ?? result.baselineScore
      : null,
    scoreDelta: proposedAvailable
      ? result.scoreDelta ?? (unaffectedWithBaseline ? 0 : null)
      : null,
    baselineRankBand: baselineAvailable ? result.baselineRankBand : null,
    proposedRankBand: proposedAvailable
      ? result.proposedRankBand ?? (unaffectedWithBaseline ? result.baselineRankBand : null)
      : null,
    differenceKind: unaffectedWithBaseline
      ? "unaffected" as const
      : proposedAvailable && result.scoreDelta !== null
        ? "numeric" as const
        : "unavailable" as const,
  };
}

export function formatCrossAnalysisScore(
  value: number | null,
  methodology: CrossAnalysisMethodologyId,
  locale: string,
  difference = false,
) {
  if (value === null) return "N/A";
  const digits = 2;
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: difference ? 0 : digits,
    maximumFractionDigits: digits,
  }).format(value);
  const signed = difference && value > 0 ? `+${formatted}` : formatted;
  return signed;
}

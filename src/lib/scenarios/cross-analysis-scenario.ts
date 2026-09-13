import type {
  CrossAnalysisBaselineSnapshot,
  CrossAnalysisInput,
  CrossAnalysisMethodologyId,
  CrossAnalysisResult,
} from "@/src/lib/cross-analysis/types";
import { CROSS_ANALYSIS_PARAMETER_BY_ID } from "@/src/lib/cross-analysis/registry";
import type { SavedCrossAnalysisScenarioSnapshot } from "@/src/types/saved-scenario";

export function createCrossAnalysisBaselineIdentity(
  baseline: CrossAnalysisBaselineSnapshot,
) {
  const serialized = JSON.stringify({
    source: baseline.source,
    years: baseline.years,
    methodologyBaselines: baseline.methodologyBaselines,
    parameters: baseline.parameters,
    methodologyInputs: baseline.methodologyInputs,
  });
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `institution-data:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function createSavedCrossAnalysisScenario({
  id = createId(),
  name,
  baseline,
  overrides,
  result,
  now = new Date().toISOString(),
}: {
  id?: string;
  name: string;
  baseline: CrossAnalysisBaselineSnapshot;
  overrides: readonly CrossAnalysisInput[];
  result: CrossAnalysisResult;
  now?: string;
}): SavedCrossAnalysisScenarioSnapshot {
  const actualOverrides = overrides.filter((input) =>
    input.baselineValue !== input.proposedValue);
  const ineligible = actualOverrides.find((input) =>
    !CROSS_ANALYSIS_PARAMETER_BY_ID.has(input.parameterId));
  if (ineligible) {
    throw new Error(`Cross Analysis shared parameter is not eligible: ${ineligible.parameterId}`);
  }
  const statuses = Object.values(result.methodologies)
    .filter((methodology) => methodology.affected)
    .map((methodology) => methodology.status);
  const calculationStatus = statuses.includes("invalid")
    ? "validation-error" as const
    : statuses.includes("insufficient-data")
      ? "missing-data" as const
      : statuses.includes("raw-impact-only")
        ? "raw-analysis-only" as const
      : "complete" as const;
  return structuredClone({
    id,
    name,
    methodology: "CROSS_ANALYSIS" as const,
    source: "cross-analysis" as const,
    institutionalDataYear: formatDataYears(baseline),
    scoreReferenceEdition: null,
    createdAt: now,
    updatedAt: now,
    currentScore: null,
    scenarioScore: null,
    scoreDifference: null,
    currentRankBand: null,
    scenarioRankBand: null,
    calculationStatus,
    warnings: [],
    changedMetrics: [],
    currentCategoryScores: null,
    scenarioCategoryScores: null,
    currentIndicatorScores: null,
    scenarioIndicatorScores: null,
    rawCalculationDetails: null,
    recommendationContext: null,
    crossAnalysis: {
      schemaVersion: 1 as const,
      baselineIdentity: createCrossAnalysisBaselineIdentity(baseline),
      baselineSnapshot: baseline,
      overrides: actualOverrides,
      resultSnapshot: result,
    },
  });
}

export function crossAnalysisBaselineMatches(
  scenario: SavedCrossAnalysisScenarioSnapshot,
  currentBaseline: CrossAnalysisBaselineSnapshot,
) {
  return scenario.crossAnalysis.baselineIdentity ===
    createCrossAnalysisBaselineIdentity(currentBaseline);
}

export function getSavedCrossAnalysisAffectedMethodologies(
  scenario: SavedCrossAnalysisScenarioSnapshot,
): CrossAnalysisMethodologyId[] {
  return (["the", "qs"] as const).filter((methodology) =>
    scenario.crossAnalysis.resultSnapshot.methodologies[methodology]?.affected);
}

function formatDataYears(baseline: CrossAnalysisBaselineSnapshot) {
  const years = baseline.years;
  return `THE ${years.the ?? "—"} · QS ${years.qs}`;
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ??
    `cross-analysis-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

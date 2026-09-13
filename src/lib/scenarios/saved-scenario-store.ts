import type {
  SavedCrossAnalysisScenarioSnapshot,
  SavedScenarioSnapshot,
} from "@/src/types/saved-scenario";
import { calculateQsWeightedComposite } from "@/src/lib/calculations/qs/calculateQsWeightedScore";
import { estimateQs2027Overall } from "@/src/lib/calculations/qs/qs2027OverallNormalizer";
import {
  CROSS_ANALYSIS_ARCHIVED_PARAMETER_BY_ID,
  CROSS_ANALYSIS_PARAMETER_REGISTRY,
} from "@/src/lib/cross-analysis/registry";
import type { QsIndicatorCode } from "@/src/types/qs";

export const SAVED_SCENARIOS_STORAGE_KEY = "university-ranking-scenarios";
export const SAVED_SCENARIOS_STORAGE_VERSION = 1;
export const SAVED_SCENARIO_NAME_MAX_LENGTH = 100;

export type SavedScenarioState = { version: 1; scenarios: SavedScenarioSnapshot[] };
export const EMPTY_SAVED_SCENARIO_STATE: SavedScenarioState = { version: 1, scenarios: [] };

export function validateSavedScenarioName(
  state: SavedScenarioState,
  methodology: SavedScenarioSnapshot["methodology"],
  nameInput: string,
  excludingId?: string,
) {
  const name = nameInput.trim();
  if (!name) return { name, error: "Senaryo adı boş olamaz." };
  if (name.length > SAVED_SCENARIO_NAME_MAX_LENGTH) {
    return { name, error: `Senaryo adı en fazla ${SAVED_SCENARIO_NAME_MAX_LENGTH} karakter olabilir.` };
  }
  if (state.scenarios.some((item) => item.id !== excludingId &&
    item.methodology === methodology &&
    item.name.trim().toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR"))) {
    return { name, error: "Bu adla kayıtlı bir senaryo zaten var. Lütfen farklı bir senaryo adı girin." };
  }
  return { name, error: null };
}

export function parseSavedScenarioState(raw: string | null): SavedScenarioState {
  if (!raw) return EMPTY_SAVED_SCENARIO_STATE;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const candidates = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.scenarios)
        ? parsed.scenarios
        : [];
    const validCandidates = candidates.filter(isSavedScenarioSnapshot);
    if (validCandidates.length !== candidates.length) {
      console.warn("Geçersiz senaryo kayıtları atlandı.");
    }
    const scenarios = validCandidates.map(normalizeSavedScenario);
    return { version: 1, scenarios };
  } catch (error) {
    console.warn("Bozuk senaryo kaydı atlandı.", error);
    return EMPTY_SAVED_SCENARIO_STATE;
  }
}

export function addSavedScenario(
  state: SavedScenarioState,
  scenario: SavedScenarioSnapshot,
) {
  if (scenario.calculationStatus === "validation-error") {
    return { state, error: "Doğrulama hatası bulunan senaryo kaydedilemez." };
  }
  const { name, error } = validateSavedScenarioName(state, scenario.methodology, scenario.name);
  if (error) return { state, error };
  if (hasSavedScenarioWithSameInputs(state, scenario)) {
    return { state, error: "Aynı parametre değerlerine sahip bir senaryo zaten kayıtlı." };
  }
  return {
    state: { ...state, scenarios: [...state.scenarios, normalizeSavedScenario({ ...scenario, name })] },
    error: null,
  };
}

export function updateSavedScenario(
  state: SavedScenarioState,
  scenario: SavedScenarioSnapshot,
) {
  const existing = state.scenarios.find((item) => item.id === scenario.id);
  if (!existing) return { state, error: "Senaryo bulunamadı." };
  if (scenario.calculationStatus === "validation-error") {
    return { state, error: "Doğrulama hatası bulunan senaryo kaydedilemez." };
  }
  const { name, error } = validateSavedScenarioName(
    state,
    scenario.methodology,
    scenario.name,
    scenario.id,
  );
  if (error) return { state, error };
  if (hasSavedScenarioWithSameInputs(state, scenario, scenario.id)) {
    return { state, error: "Aynı parametre değerlerine sahip bir senaryo zaten kayıtlı." };
  }
  const updated = normalizeSavedScenario({
    ...scenario,
    id: existing.id,
    name,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  });
  return {
    state: {
      ...state,
      scenarios: state.scenarios.map((item) => item.id === existing.id ? updated : item),
    },
    error: null,
  };
}

export function hasSavedScenarioWithSameInputs(
  state: SavedScenarioState,
  scenario: SavedScenarioSnapshot,
  excludingId?: string,
) {
  const key = createSavedScenarioInputKey(scenario);
  return state.scenarios.some((item) => item.id !== excludingId &&
    createSavedScenarioInputKey(item) === key);
}

export function createSavedScenarioInputKey(scenario: SavedScenarioSnapshot) {
  const parameterValues = scenario.methodology === "CROSS_ANALYSIS"
    ? scenario.crossAnalysis.overrides.map((item) => ({
        parameterId: item.parameterId,
        value: normalizeComparisonValue(item.proposedValue),
      }))
    : scenario.changedMetrics.map((item) => ({
        parameterId: item.parameterId,
        field: item.field ?? null,
        value: normalizeComparisonValue(item.scenarioValue),
      }));
  parameterValues.sort((left, right) =>
    `${left.parameterId}\u0000${"field" in left ? left.field ?? "" : ""}`.localeCompare(
      `${right.parameterId}\u0000${"field" in right ? right.field ?? "" : ""}`,
    ));
  return stableSerialize({
    methodology: scenario.methodology,
    year: scenario.institutionalDataYear,
    parameterValues,
  });
}

export function renameSavedScenario(state: SavedScenarioState, id: string, nameInput: string) {
  const scenario = state.scenarios.find((item) => item.id === id);
  if (!scenario) return { state, error: "Senaryo bulunamadı." };
  const { name, error } = validateSavedScenarioName(state, scenario.methodology, nameInput, id);
  if (error) return { state, error };
  return {
    state: {
      ...state,
      scenarios: state.scenarios.map((item) => item.id === id
        ? { ...item, name, updatedAt: new Date().toISOString() }
        : item),
    },
    error: null,
  };
}

export const deleteSavedScenario = (state: SavedScenarioState, id: string): SavedScenarioState => ({
  ...state,
  scenarios: state.scenarios.filter((item) => item.id !== id),
});

function isSavedScenarioSnapshot(value: unknown): value is SavedScenarioSnapshot {
  if (isSavedCrossAnalysisSnapshot(value)) return true;
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string" &&
    ["THE", "QS", "GREENMETRIC"].includes(String(value.methodology)) &&
    typeof value.createdAt === "string" && Array.isArray(value.changedMetrics) &&
    value.calculationStatus !== "validation-error";
}

function normalizeSavedScenario(scenario: SavedScenarioSnapshot): SavedScenarioSnapshot {
  if (scenario.methodology === "CROSS_ANALYSIS") {
    const normalized = structuredClone(scenario);
    const parameters = normalized.crossAnalysis.baselineSnapshot.parameters as Record<
      string,
      number | null
    >;
    const parameterSources = (normalized.crossAnalysis.baselineSnapshot.parameterSources ?? {}) as Record<
      string,
      string | null
    >;
    normalized.crossAnalysis.baselineSnapshot.parameterSources = parameterSources;
    const snapshot = normalized.crossAnalysis.baselineSnapshot;
    snapshot.methodologyParameterValues ??= {
      the: { ...snapshot.parameters },
      qs: { ...snapshot.parameters },
    };
    snapshot.methodologyBaselines ??= {
      the: { year: snapshot.years.the, source: "legacy-saved-baseline", usable: snapshot.years.the !== null, unavailableReason: null },
      qs: { year: snapshot.years.qs, source: "legacy-saved-baseline", usable: true, unavailableReason: null },
    };
    normalized.crossAnalysis.resultSnapshot.parameterTraces ??= [];
    normalized.crossAnalysis.overrides = normalized.crossAnalysis.overrides.filter((override) =>
      CROSS_ANALYSIS_ARCHIVED_PARAMETER_BY_ID.has(override.parameterId));
    normalized.crossAnalysis.resultSnapshot.changes = normalized.crossAnalysis.resultSnapshot.changes.filter((change) =>
      CROSS_ANALYSIS_ARCHIVED_PARAMETER_BY_ID.has(change.parameterId));
    normalized.crossAnalysis.resultSnapshot.parameterTraces = normalized.crossAnalysis.resultSnapshot.parameterTraces.filter((trace) =>
      CROSS_ANALYSIS_ARCHIVED_PARAMETER_BY_ID.has(trace.parameterId));
    for (const definition of CROSS_ANALYSIS_PARAMETER_REGISTRY) {
      if (typeof parameters[definition.id] !== "number" ||
        !Number.isFinite(parameters[definition.id])) {
        parameters[definition.id] = null;
      }
      if (typeof parameterSources[definition.id] !== "string") {
        parameterSources[definition.id] = null;
      }
    }
    for (const methodology of ["the", "qs"] as const) {
      snapshot.methodologyBaselines[methodology].unavailableReason ??= null;
      const methodologyResult = normalized.crossAnalysis.resultSnapshot.methodologies[methodology];
      const storedMetrics = Array.isArray(methodologyResult.impactedMetrics)
        ? methodologyResult.impactedMetrics
        : normalized.crossAnalysis.overrides.flatMap((override) =>
          CROSS_ANALYSIS_ARCHIVED_PARAMETER_BY_ID.get(override.parameterId)
            ?.mappings[methodology]?.impactedMetrics ?? []);
      methodologyResult.impactedMetrics = methodologyResult.affected
        ? Array.from(new Set(storedMetrics))
        : [];
      methodologyResult.rawChangedMetrics = Array.isArray(methodologyResult.rawChangedMetrics)
        ? Array.from(new Set(methodologyResult.rawChangedMetrics))
        : methodologyResult.propagation?.rawChangedMetrics ?? [];
      methodologyResult.scoreChangedMetrics = Array.isArray(methodologyResult.scoreChangedMetrics)
        ? Array.from(new Set(methodologyResult.scoreChangedMetrics))
        : methodologyResult.propagation?.scoreChangedMetrics ?? [];
      methodologyResult.indicatorDetails = Array.isArray(methodologyResult.indicatorDetails)
        ? methodologyResult.indicatorDetails
        : [];
      methodologyResult.missingMetrics = Array.isArray(methodologyResult.missingMetrics)
        ? Array.from(new Set(methodologyResult.missingMetrics))
        : [];
      methodologyResult.baselineContext ??= { ...snapshot.methodologyBaselines[methodology] };
      methodologyResult.baselineContext.unavailableReason ??=
        snapshot.methodologyBaselines[methodology].unavailableReason;
    }
    for (const container of [
      snapshot.years,
      snapshot.methodologyParameterValues,
      snapshot.methodologyBaselines,
      snapshot.methodologyInputs,
      normalized.crossAnalysis.resultSnapshot.methodologies,
    ] as object[]) {
      delete (container as Record<string, unknown>).greenmetric;
      delete (container as Record<string, unknown>).greenMetric;
      delete (container as Record<string, unknown>).gmResult;
      delete (container as Record<string, unknown>).greenMetricResult;
    }
    return normalized;
  }
  const source = ["manual-scenario", "recommendation-engine", "raw-analysis"].includes(scenario.source)
    ? scenario.source
    : "manual-scenario";
  const calculationStatus = ["complete", "complete-with-held-indicator-scores", "raw-analysis-only", "missing-data"].includes(scenario.calculationStatus)
    ? scenario.calculationStatus
    : "missing-data";
  const qsScores = scenario.methodology === "QS" ? resolveStoredQsScores(scenario) : null;
  const legacyWarning = scenario.methodology === "QS" && scenario.scoreType === undefined && !qsScores
    ? ["Eski skor türü: Bu kayıtta composite ve estimated overall ayrımı belirlenemiyor."]
    : [];
  return structuredClone({
    ...scenario,
    source,
    institutionalDataYear: scenario.institutionalDataYear ?? null,
    scoreReferenceEdition: scenario.scoreReferenceEdition ?? null,
    updatedAt: scenario.updatedAt || scenario.createdAt,
    currentScore: qsScores?.currentOverall ?? finiteOrNull(scenario.currentScore),
    scenarioScore: qsScores?.scenarioOverall ?? finiteOrNull(scenario.scenarioScore),
    scoreDifference: qsScores ? difference(qsScores.currentOverall, qsScores.scenarioOverall) : finiteOrNull(scenario.scoreDifference),
    currentWeightedCompositeScore: qsScores?.currentComposite ?? scenario.currentWeightedCompositeScore ?? null,
    scenarioWeightedCompositeScore: qsScores?.scenarioComposite ?? scenario.scenarioWeightedCompositeScore ?? null,
    currentEstimatedOverallScore: qsScores?.currentOverall ?? scenario.currentEstimatedOverallScore ?? null,
    scenarioEstimatedOverallScore: qsScores?.scenarioOverall ?? scenario.scenarioEstimatedOverallScore ?? null,
    scoreType: scenario.methodology === "QS" ? qsScores ? "estimated-overall" : scenario.scoreType ?? "legacy-unknown" : scenario.scoreType,
    compositeScoreType: scenario.methodology === "QS" && qsScores ? "weighted-indicator-composite" : scenario.compositeScoreType,
    currentRankBand: scenario.currentRankBand ?? null,
    scenarioRankBand: scenario.scenarioRankBand ?? null,
    currentRankBandSource: scenario.currentRankBandSource,
    scenarioRankBandSource: scenario.scenarioRankBandSource,
    currentScoreType: scenario.currentScoreType,
    calculationStatus,
    warnings: [...(Array.isArray(scenario.warnings) ? scenario.warnings.filter((item): item is string => typeof item === "string") : []), ...legacyWarning],
    changedMetrics: Array.isArray(scenario.changedMetrics) ? scenario.changedMetrics : [],
    currentCategoryScores: scenario.currentCategoryScores ?? null,
    scenarioCategoryScores: scenario.scenarioCategoryScores ?? null,
    currentIndicatorScores: scenario.currentIndicatorScores ?? null,
    scenarioIndicatorScores: scenario.scenarioIndicatorScores ?? null,
    rawCalculationDetails: scenario.rawCalculationDetails ?? null,
    recommendationContext: scenario.recommendationContext ?? null,
  });
}

function isSavedCrossAnalysisSnapshot(
  value: unknown,
): value is SavedCrossAnalysisScenarioSnapshot {
  if (!isRecord(value) || value.methodology !== "CROSS_ANALYSIS" ||
    value.source !== "cross-analysis" || typeof value.id !== "string" ||
    typeof value.name !== "string" || typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string" || !Array.isArray(value.changedMetrics) ||
    !["complete", "raw-analysis-only", "missing-data"].includes(String(value.calculationStatus)) ||
    !isRecord(value.crossAnalysis)) return false;
  const cross = value.crossAnalysis;
  if (cross.schemaVersion !== 1 || typeof cross.baselineIdentity !== "string" ||
    !Array.isArray(cross.overrides) || !isRecord(cross.baselineSnapshot) ||
    !isRecord(cross.resultSnapshot)) return false;
  if (!cross.overrides.length || !cross.overrides.every(isCrossAnalysisOverride)) return false;
  const baseline = cross.baselineSnapshot;
  if (baseline.source !== "InstitutionDataContext" || !isRecord(baseline.years) ||
    !isRecord(baseline.parameters) || !isRecord(baseline.methodologyInputs) ||
    !isRecord(baseline.sourceSnapshot)) return false;
  const result = cross.resultSnapshot;
  if (!Array.isArray(result.changes) || !Array.isArray(result.validationIssues) ||
    !isRecord(result.methodologies)) return false;
  const methodologies = result.methodologies;
  return ["the", "qs"].every((id) =>
    isCrossAnalysisMethodologyResult(methodologies[id]));
}

function isCrossAnalysisOverride(value: unknown) {
  return isRecord(value) && typeof value.parameterId === "string" &&
    typeof value.baselineValue === "number" && Number.isFinite(value.baselineValue) &&
    typeof value.proposedValue === "number" && Number.isFinite(value.proposedValue) &&
    value.baselineValue !== value.proposedValue;
}

function isCrossAnalysisMethodologyResult(value: unknown) {
  if (!isRecord(value)) return false;
  return typeof value.affected === "boolean" &&
    ["complete", "raw-impact-only", "not-affected", "insufficient-data", "invalid"].includes(String(value.status)) &&
    nullableFinite(value.baselineScore) && nullableFinite(value.proposedScore) &&
    nullableFinite(value.scoreDelta) && nullableString(value.baselineRankBand) &&
    nullableString(value.proposedRankBand) &&
    (value.impactedMetrics === undefined || Array.isArray(value.impactedMetrics) &&
      value.impactedMetrics.every((metric) => typeof metric === "string")) &&
    (value.rawChangedMetrics === undefined || Array.isArray(value.rawChangedMetrics) &&
      value.rawChangedMetrics.every((metric) => typeof metric === "string")) &&
    (value.scoreChangedMetrics === undefined || Array.isArray(value.scoreChangedMetrics) &&
      value.scoreChangedMetrics.every((metric) => typeof metric === "string")) &&
    (value.indicatorDetails === undefined || Array.isArray(value.indicatorDetails)) &&
    (value.missingMetrics === undefined || Array.isArray(value.missingMetrics) &&
      value.missingMetrics.every((metric) => typeof metric === "string")) &&
    Array.isArray(value.warnings) && value.warnings.every((warning) => typeof warning === "string") &&
    isRecord(value.rankMetadata);
}

const nullableFinite = (value: unknown) =>
  value === null || typeof value === "number" && Number.isFinite(value);

const nullableString = (value: unknown) =>
  value === null || typeof value === "string";

const finiteOrNull = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

function resolveStoredQsScores(scenario: SavedScenarioSnapshot) {
  const currentComposite = scenario.currentWeightedCompositeScore ?? compositeFromIndicators(scenario.currentIndicatorScores);
  const scenarioComposite = scenario.scenarioWeightedCompositeScore ?? compositeFromIndicators(scenario.scenarioIndicatorScores);
  const currentOverall = scenario.currentEstimatedOverallScore ?? estimateQs2027Overall(currentComposite);
  const scenarioOverall = scenario.scenarioEstimatedOverallScore ?? estimateQs2027Overall(scenarioComposite);
  if (currentComposite === null || scenarioComposite === null || currentOverall === null || scenarioOverall === null) return null;
  return { currentComposite, scenarioComposite, currentOverall, scenarioOverall };
}

function compositeFromIndicators(scores: Record<string, number | null> | null) {
  if (!scores) return null;
  return calculateQsWeightedComposite(scores as Record<QsIndicatorCode, number | null>);
}

const difference = (current: number | null, scenario: number | null) =>
  current === null || scenario === null ? null : scenario - current;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function stableSerialize(value: unknown): string {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(Object.is(value, -0) ? 0 : value) : "null";
  }
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`)
    .join(",")}}`;
}

function normalizeComparisonValue(value: unknown): unknown {
  if (typeof value === "number") return Object.is(value, -0) ? 0 : value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(trimmed)) {
      const numeric = Number(trimmed.replace(",", "."));
      if (Number.isFinite(numeric)) return Object.is(numeric, -0) ? 0 : numeric;
    }
    return trimmed;
  }
  if (Array.isArray(value)) return value.map(normalizeComparisonValue);
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      normalizeComparisonValue(item),
    ]));
  }
  return value ?? null;
}

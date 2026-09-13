import artifactJson from "@/src/data/qs/reference/qs-rank-model-2027.json";
import { QS_RANK_MODEL_CONFIG } from "@/src/config/qs-rank-estimation";
import { QS_STOCHASTIC_CALIBRATION } from "@/src/config/qs.stochastic-calibration";
import { getCompleteQsReferenceRecordsByMethodologyYear } from "./qs-reference-dataset";
import { createQsRankDistribution, predictQsRawRank } from "./qs-rank-model";
import { normalizeQsRankBand } from "./qs-rank-band";
import type { QsIndicatorCode } from "@/src/types/qs";
import type { QsRankDistribution, QsRankEstimationResult, QsRankModelArtifact, QsRankPredictionSide } from "@/src/types/qs-rank-estimation";
import type { QsStochasticSimulationResult } from "@/src/types/qs-stochastic";
import { resolveActiveReferenceDatasetSync } from "@/src/lib/rankings/dataset-resolver";
import { analyzeReferenceCoverage, INSUFFICIENT_REFERENCE_COVERAGE_MESSAGE } from "@/src/lib/rankings/coverage-analyzer";
import { toLegacyQsReferenceRecords } from "@/src/lib/rankings/bundled-datasets";

const artifact = artifactJson as QsRankModelArtifact;
let cachedPool: ReturnType<typeof getCompleteQsReferenceRecordsByMethodologyYear> | null = null;
let cachedDatasetId = "";

const emptyDistribution = (): QsRankDistribution => ({
  expectedRank: null, medianRank: null, p10Rank: null, p90Rank: null,
  predictedBand: null, bandProbabilities: [],
});

const unavailableSide = (status: QsRankPredictionSide["status"]): QsRankPredictionSide => ({
  status, raw: emptyDistribution(), calibrated: emptyDistribution(),
  modelConfidence: { level: null, score: null, reasons: [] }, nearestNeighbors: [],
});

function getPool() {
  const resolved=resolveActiveReferenceDatasetSync("QS");
  const identity=`${resolved.metadata.datasetId}@${resolved.metadata.datasetVersion}`;
  if (!cachedPool||cachedDatasetId!==identity){cachedDatasetId=identity;cachedPool = getCompleteQsReferenceRecordsByMethodologyYear(
    QS_RANK_MODEL_CONFIG.methodologyYear,
    toLegacyQsReferenceRecords(resolved.dataset),
  ).filter((record) => record.institutionId !== QS_RANK_MODEL_CONFIG.targetInstitutionId);}
  return cachedPool;
}

function getScoreVector(simulation: QsStochasticSimulationResult, side: "current" | "scenario") {
  const vector: Partial<Record<QsIndicatorCode, number>> = {};
  const heldCurrentScoreCodes: QsIndicatorCode[] = [];
  const canHoldCurrentScore = new Set([
    "unavailable-no-calibration",
    "held-constant-no-calibration",
    "held-constant-no-public-calibration",
    "held-constant-no-public-normalization",
  ]);
  for (const code of artifact.featureCodes) {
    const summary = simulation[side].indicators[code];
    if (summary.status === "ready" && summary.median !== null && Number.isFinite(summary.median)) {
      vector[code] = summary.median;
      continue;
    }
    const current = simulation.current.indicators[code];
    if (
      side === "scenario" &&
      canHoldCurrentScore.has(summary.source) &&
      current.status === "ready" &&
      current.median !== null &&
      Number.isFinite(current.median)
    ) {
      vector[code] = current.median;
      heldCurrentScoreCodes.push(code);
      continue;
    }
    return null;
  }
  return { vector, heldCurrentScoreCodes };
}

function equivalentVectors(
  left: Partial<Record<QsIndicatorCode, number>>,
  right: Partial<Record<QsIndicatorCode, number>>,
) {
  return artifact.featureCodes.every((code) => left[code] === right[code]);
}

function offsetDistribution(
  weightedRanks: readonly { value: number; weight: number }[],
  offset: number,
) {
  return createQsRankDistribution(
    weightedRanks.map((item) => ({ ...item, value: Math.max(1, item.value + offset) })),
    artifact.bandTaxonomy,
  );
}

function bandForExpectedRank(expectedRank: number | null) {
  if (expectedRank === null || !Number.isFinite(expectedRank)) return null;
  const containing = artifact.bandTaxonomy.find((band) =>
    expectedRank >= band.lowerBound &&
    (band.upperBound === null || expectedRank <= band.upperBound));
  if (containing) return containing.label;
  return artifact.bandTaxonomy.reduce<{ label: string; distance: number } | null>((nearest, band) => {
    const upper = band.upperBound ?? band.lowerBound;
    const distance = expectedRank < band.lowerBound
      ? band.lowerBound - expectedRank
      : Math.max(0, expectedRank - upper);
    return nearest === null || distance < nearest.distance ? { label: band.label, distance } : nearest;
  }, null)?.label ?? null;
}

function confidence(
  distribution: QsRankDistribution,
  nearestDistance: number | undefined,
): QsRankPredictionSide["modelConfidence"] {
  const probabilities = distribution.bandProbabilities;
  const top = probabilities[0]?.probability ?? null;
  if (top === null) return { level: null, score: null, reasons: [] as string[] };
  const margin = top - (probabilities[1]?.probability ?? 0);
  const reasons: string[] = [];
  if (margin < QS_RANK_MODEL_CONFIG.confidence.closeBandMargin) reasons.push("En yüksek iki bant komşu ağırlığı birbirine yakın.");
  if (nearestDistance !== undefined && nearestDistance > 1) reasons.push("En yakın profilin normalize mesafesi yüksek.");
  const score = Math.max(0, Math.min(1, top * 0.75 + Math.max(0, margin) * 0.25));
  const level = score >= QS_RANK_MODEL_CONFIG.confidence.high ? "high"
    : score >= QS_RANK_MODEL_CONFIG.confidence.medium ? "medium" : "low";
  return { level, score, reasons };
}

function createReadySide(
  rawPrediction: ReturnType<typeof predictQsRawRank>,
  offset: number,
): QsRankPredictionSide {
  const calibrated = offsetDistribution(rawPrediction.weightedRanks, offset);
  return {
    status: "ready",
    raw: rawPrediction.distribution,
    calibrated,
    modelConfidence: confidence(calibrated, rawPrediction.neighbors[0]?.distance),
    nearestNeighbors: rawPrediction.neighbors.slice(0, 10),
  };
}

function applyDominanceGuard(
  current: QsRankPredictionSide,
  scenario: QsRankPredictionSide,
  direction: QsRankEstimationResult["dominanceGuard"]["direction"],
) {
  if (current.status !== "ready" || scenario.status !== "ready") return { side: scenario, applied: false, adjustment: null };
  const currentRank = current.calibrated.expectedRank;
  const scenarioRank = scenario.calibrated.expectedRank;
  if (currentRank === null || scenarioRank === null) return { side: scenario, applied: false, adjustment: null };
  const violatesImprovement = direction === "scenario-dominates" && scenarioRank > currentRank;
  const violatesWorsening = direction === "current-dominates" && scenarioRank < currentRank;
  if (!violatesImprovement && !violatesWorsening) return { side: scenario, applied: false, adjustment: null };
  return {
    side: {
      ...scenario,
      calibrated: {
        ...scenario.calibrated,
        expectedRank: currentRank,
        medianRank: current.calibrated.medianRank,
        p10Rank: current.calibrated.p10Rank,
        p90Rank: current.calibrated.p90Rank,
        predictedBand: current.calibrated.predictedBand,
        bandProbabilities: current.calibrated.bandProbabilities,
      },
    },
    applied: true,
    adjustment: direction === "scenario-dominates"
      ? "Scenario tüm weighted göstergelerde üstün olduğundan daha kötü sıra sonucu current sınırına çekildi."
      : "Current tüm weighted göstergelerde üstün olduğundan daha iyi scenario sonucu current sınırına çekildi.",
  };
}

export function estimateQsRank(simulation: QsStochasticSimulationResult): QsRankEstimationResult {
  const resolvedDataset=resolveActiveReferenceDatasetSync("QS");
  const totalRecords = resolvedDataset.dataset.records.length;
  const pool = getPool();
  const baseDiagnostics = {
    totalReferenceRecords: totalRecords,
    completeReferenceRecords: pool.length + 1,
    eligibleNeighborCount: pool.length,
    targetExcluded: !pool.some((record) => record.institutionId === QS_RANK_MODEL_CONFIG.targetInstitutionId),
    featureCodes: [...artifact.featureCodes],
    reusedScenarioResult: false,
  };
  const publishedBand = QS_STOCHASTIC_CALIBRATION.publishedRankBand;
  const normalizedPublishedBand = publishedBand ? normalizeQsRankBand(publishedBand) : null;
  const representativeRank = normalizedPublishedBand?.upperBound === null || !normalizedPublishedBand
    ? null : (normalizedPublishedBand.lowerBound + normalizedPublishedBand.upperBound) / 2;
  const calibrationBase = {
    institutionId: QS_RANK_MODEL_CONFIG.targetInstitutionId,
    publishedBand: publishedBand ?? "",
    representativeRank: representativeRank ?? 0,
    representativeMethod: "closed-band-midpoint" as const,
    rawCurrentExpectedRank: null,
    offset: null,
  };
  const currentVectorResult = getScoreVector(simulation, "current");
  const coverage=analyzeReferenceCoverage(resolvedDataset.dataset,{availableNeighborCount:pool.length});
  if(!coverage.isSufficient){const unavailable=unavailableSide("dataset-insufficient");unavailable.modelConfidence.reasons=[INSUFFICIENT_REFERENCE_COVERAGE_MESSAGE];return{modelVersion:artifact.modelVersion,methodologyYear:artifact.methodologyYear,datasetHash:artifact.sourceDataset.sha256,selectedK:artifact.selectedK,calibration:calibrationBase,current:unavailable,scenario:unavailable,change:{status:"unavailable",bandDelta:null,expectedRankDelta:null,label:"Hesaplanamadı"},dominanceGuard:{applied:false,direction:"equal",adjustment:null},diagnostics:baseDiagnostics};}
  if (artifact.sourceDataset.sha256 !== QS_RANK_MODEL_CONFIG.sourceDataset.sha256) {
    return {
      modelVersion: artifact.modelVersion, methodologyYear: artifact.methodologyYear,
      datasetHash: artifact.sourceDataset.sha256, selectedK: artifact.selectedK,
      calibration: calibrationBase, current: unavailableSide("model-stale"), scenario: unavailableSide("model-stale"),
      change: { status: "unavailable", bandDelta: null, expectedRankDelta: null, label: "Hesaplanamadı" },
      dominanceGuard: { applied: false, direction: "equal", adjustment: null }, diagnostics: baseDiagnostics,
    };
  }
  if (!currentVectorResult || representativeRank === null) {
    return {
      modelVersion: artifact.modelVersion, methodologyYear: artifact.methodologyYear,
      datasetHash: artifact.sourceDataset.sha256, selectedK: artifact.selectedK,
      calibration: calibrationBase, current: unavailableSide("score-incomplete"), scenario: unavailableSide("score-incomplete"),
      change: { status: "unavailable", bandDelta: null, expectedRankDelta: null, label: "Hesaplanamadı" },
      dominanceGuard: { applied: false, direction: "equal", adjustment: null }, diagnostics: baseDiagnostics,
    };
  }
  const currentVector = currentVectorResult.vector;
  const currentRaw = predictQsRawRank(currentVector, pool, artifact);
  const currentRawExpectedRank = currentRaw.distribution.expectedRank;
  const offset = representativeRank - (currentRawExpectedRank ?? representativeRank);
  const current = createReadySide(currentRaw, offset);
  // The current display is the verified published baseline; model diagnostics remain separately available.
  current.calibrated.predictedBand = normalizedPublishedBand?.label ?? current.calibrated.predictedBand;
  const scenarioVectorResult = getScoreVector(simulation, "scenario");
  if (!scenarioVectorResult) {
    return {
      modelVersion: artifact.modelVersion, methodologyYear: artifact.methodologyYear,
      datasetHash: artifact.sourceDataset.sha256, selectedK: artifact.selectedK,
      calibration: { ...calibrationBase, rawCurrentExpectedRank: currentRawExpectedRank, offset },
      current, scenario: unavailableSide("score-incomplete"),
      change: { status: "unavailable", bandDelta: null, expectedRankDelta: null, label: "Hesaplanamadı" },
      dominanceGuard: { applied: false, direction: "mixed", adjustment: null }, diagnostics: baseDiagnostics,
    };
  }
  const scenarioVector = scenarioVectorResult.vector;
  const equal = equivalentVectors(currentVector, scenarioVector);
  let scenario = equal ? current : createReadySide(predictQsRawRank(scenarioVector, pool, artifact), offset);
  const comparisons = artifact.featureCodes.map((code) => (scenarioVector[code] ?? 0) - (currentVector[code] ?? 0));
  const direction = comparisons.every((value) => value === 0) ? "equal"
    : comparisons.every((value) => value >= 0) ? "scenario-dominates"
      : comparisons.every((value) => value <= 0) ? "current-dominates" : "mixed";
  const guard = applyDominanceGuard(current, scenario, direction);
  scenario = guard.side;
  if (!equal) {
    scenario = {
      ...scenario,
      calibrated: {
        ...scenario.calibrated,
        predictedBand: bandForExpectedRank(scenario.calibrated.expectedRank),
      },
    };
  }
  if (!equal && scenario.modelConfidence.level === "low") {
    scenario = {
      ...scenario,
      modelConfidence: {
        ...scenario.modelConfidence,
        reasons: [...scenario.modelConfidence.reasons, "Referans dağılımı dışında"],
      },
    };
  }
  if (scenarioVectorResult.heldCurrentScoreCodes.length) {
    scenario = {
      ...scenario,
      modelConfidence: {
        ...scenario.modelConfidence,
        level: "low",
        reasons: [
          ...scenario.modelConfidence.reasons,
          `${scenarioVectorResult.heldCurrentScoreCodes.join(", ")} senaryo skoru kalibre edilemediği için sıralama tahmininde mevcut skor sabit tutuldu.`,
        ],
      },
    };
  }
  const currentBand = artifact.bandTaxonomy.find((band) => band.label === current.calibrated.predictedBand);
  const scenarioBand = artifact.bandTaxonomy.find((band) => band.label === scenario.calibrated.predictedBand);
  const bandDelta = currentBand && scenarioBand ? currentBand.order - scenarioBand.order : null;
  const expectedRankDelta = current.calibrated.expectedRank === null || scenario.calibrated.expectedRank === null
    ? null : scenario.calibrated.expectedRank - current.calibrated.expectedRank;
  const status = bandDelta === null || expectedRankDelta === null ? "unavailable"
    : bandDelta > 0 || (bandDelta === 0 && expectedRankDelta < -0.5) ? "improved"
      : bandDelta < 0 || (bandDelta === 0 && expectedRankDelta > 0.5) ? "worsened"
        : "unchanged";
  const roundedRankDelta = Math.round(Math.abs(expectedRankDelta ?? 0));
  const label = status === "improved"
    ? bandDelta ? `${bandDelta} bant yükseldi` : `Bant aynı · merkez tahmin ${roundedRankDelta} sıra iyileşti`
    : status === "worsened"
      ? bandDelta ? `${Math.abs(bandDelta)} bant geriledi` : `Bant aynı · merkez tahmin ${roundedRankDelta} sıra geriledi`
      : status === "unchanged" ? "Değişmedi" : "Hesaplanamadı";
  return {
    modelVersion: artifact.modelVersion, methodologyYear: artifact.methodologyYear,
    datasetHash: artifact.sourceDataset.sha256, selectedK: artifact.selectedK,
    calibration: { ...calibrationBase, rawCurrentExpectedRank: currentRawExpectedRank, offset },
    current, scenario,
    change: { status, bandDelta, expectedRankDelta, label },
    dominanceGuard: { applied: guard.applied, direction, adjustment: guard.adjustment },
    diagnostics: { ...baseDiagnostics, reusedScenarioResult: equal },
  };
}

export function getQsRankModelArtifact() {
  return structuredClone(artifact);
}

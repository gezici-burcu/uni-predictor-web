import { THE_DEFAULT_NEIGHBOR_COUNT } from "@/src/config/the-rank-estimation";
import {
  calculateTheCategoryDistance,
  estimateTheRankBand,
  getTheRankBandForOrdinal,
  getTheRankBandOrdinal,
} from "@/src/lib/the/estimate-rank-band";
import type { TheRankBandEstimate } from "@/src/types/the-rank-band-estimate";
import type { TheReferenceDataset } from "@/src/types/the-reference-dataset";
import type { TheRankEstimationCategoryScores } from "@/src/types/the-rank-band-estimate";

export type TheRankBandSource =
  | "calibration-anchor"
  | "calibrated-stochastic-estimator"
  | "raw-stochastic-estimator"
  | "insufficient-reference-coverage";

export type PreparedTheRankCalibration = {
  calibrationVector: TheRankEstimationCategoryScores;
  publishedBand: string;
  referenceInstitutionId: string;
  anchorRawEstimate: TheRankBandEstimate;
  anchorRawExpectedOrdinal: number;
  anchorPublishedOrdinal: number;
  anchorOrdinalOffset: number;
  calibrationRadius: number;
};

const preparedCalibrationCache = new WeakMap<
  TheReferenceDataset,
  Map<string, PreparedTheRankCalibration>
>();

export type CalibratedTheRankEstimate = {
  predictedBand: string | null;
  source: TheRankBandSource;
  rawPredictedBand: string | null;
  rawExpectedOrdinal: number | null;
  calibratedExpectedOrdinal: number | null;
  calibrationWeight: number;
  distanceFromCalibration: number;
  calibrationRadius: number;
  anchorRawExpectedOrdinal: number;
  anchorPublishedOrdinal: number;
  dominanceAdjustmentApplied: boolean;
  rawEstimate: TheRankBandEstimate;
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
};

export const calculateTheCalibrationWeight = (
  distance: number,
  radius: number,
): number => {
  if (!Number.isFinite(distance) || distance < 0) return 0;
  if (!Number.isFinite(radius) || radius <= 0) return distance === 0 ? 1 : 0;
  const ratio = distance / radius;
  return 1 / (1 + ratio * ratio);
};

export function prepareTheRankCalibration({
  calibrationVector,
  publishedBand,
  referenceInstitutionId,
  dataset,
  neighborCount = THE_DEFAULT_NEIGHBOR_COUNT,
}: {
  calibrationVector: TheRankEstimationCategoryScores;
  publishedBand: string;
  referenceInstitutionId: string;
  dataset: TheReferenceDataset;
  neighborCount?: number;
}): PreparedTheRankCalibration {
  const cacheKey = JSON.stringify({
    calibrationVector,
    publishedBand,
    referenceInstitutionId,
    neighborCount,
  });
  const datasetCache = preparedCalibrationCache.get(dataset) ?? new Map();
  preparedCalibrationCache.set(dataset, datasetCache);
  const cached = datasetCache.get(cacheKey);
  if (cached) return cached;
  const anchorRawEstimate = estimateTheRankBand({
    categoryScores: calibrationVector,
    dataset,
    excludeInstitutionId: referenceInstitutionId,
    neighborCount,
  });
  const anchorRawExpectedOrdinal = anchorRawEstimate.rawExpectedOrdinal;
  const anchorPublishedOrdinal = getTheRankBandOrdinal(publishedBand);
  if (anchorRawExpectedOrdinal === null || anchorPublishedOrdinal === null) {
    throw new Error("THE rank calibration requires known, estimable rank bands.");
  }
  const distances = dataset.records.flatMap((record) => {
    if (
      record.id === referenceInstitutionId ||
      record.methodologyYear !== 2026 ||
      record.rankBand === null ||
      Object.values(record.categoryScores).some(
        (value) => typeof value !== "number" || !Number.isFinite(value),
      )
    ) {
      return [];
    }
    return [
      calculateTheCategoryDistance(
        calibrationVector,
        record.categoryScores as TheRankEstimationCategoryScores,
      ),
    ];
  }).sort((left, right) => left - right);
  const calibrationRadius = median(distances.slice(0, neighborCount));
  if (!Number.isFinite(calibrationRadius) || calibrationRadius <= 0) {
    throw new Error("THE rank calibration radius must be positive and finite.");
  }
  const prepared = {
    calibrationVector: { ...calibrationVector },
    publishedBand,
    referenceInstitutionId,
    anchorRawEstimate,
    anchorRawExpectedOrdinal,
    anchorPublishedOrdinal,
    anchorOrdinalOffset: anchorPublishedOrdinal - anchorRawExpectedOrdinal,
    calibrationRadius,
  };
  datasetCache.set(cacheKey, prepared);
  return prepared;
}

export function estimateCalibratedTheRankBand({
  categoryScores,
  dataset,
  calibration,
}: {
  categoryScores: TheRankEstimationCategoryScores;
  dataset: TheReferenceDataset;
  calibration: PreparedTheRankCalibration;
}): CalibratedTheRankEstimate {
  const rawEstimate = estimateTheRankBand({
    categoryScores,
    dataset,
    excludeInstitutionId: calibration.referenceInstitutionId,
  });
  const estimateAllowed = rawEstimate.status === "estimated";
  const distanceFromCalibration = calculateTheCategoryDistance(
    categoryScores,
    calibration.calibrationVector,
  );
  const calibrationWeight = calculateTheCalibrationWeight(
    distanceFromCalibration,
    calibration.calibrationRadius,
  );
  const rawExpectedOrdinal = estimateAllowed ? rawEstimate.rawExpectedOrdinal : null;
  const calibratedExpectedOrdinal = rawExpectedOrdinal === null
    ? null
    : rawExpectedOrdinal + calibrationWeight * calibration.anchorOrdinalOffset;
  return {
    predictedBand: !estimateAllowed ? null : calibratedExpectedOrdinal === null
      ? rawEstimate.predictedBand
      : getTheRankBandForOrdinal(calibratedExpectedOrdinal),
    source: calibratedExpectedOrdinal === null
      ? "raw-stochastic-estimator"
      : "calibrated-stochastic-estimator",
    rawPredictedBand: rawEstimate.predictedBand,
    rawExpectedOrdinal,
    calibratedExpectedOrdinal,
    calibrationWeight,
    distanceFromCalibration,
    calibrationRadius: calibration.calibrationRadius,
    anchorRawExpectedOrdinal: calibration.anchorRawExpectedOrdinal,
    anchorPublishedOrdinal: calibration.anchorPublishedOrdinal,
    dominanceAdjustmentApplied: false,
    rawEstimate,
  };
}

export type ParetoRelation =
  | "scenario-dominates"
  | "current-dominates"
  | "equal"
  | "mixed";

export function compareTheCategoryVectors(
  current: TheRankEstimationCategoryScores,
  scenario: TheRankEstimationCategoryScores,
  epsilon: number,
): ParetoRelation {
  const keys = Object.keys(current) as Array<keyof TheRankEstimationCategoryScores>;
  let scenarioBetter = false;
  let scenarioWorse = false;
  for (const key of keys) {
    const difference = scenario[key] - current[key];
    if (difference > epsilon) scenarioBetter = true;
    if (difference < -epsilon) scenarioWorse = true;
  }
  if (!scenarioBetter && !scenarioWorse) return "equal";
  if (scenarioBetter && !scenarioWorse) return "scenario-dominates";
  if (scenarioWorse && !scenarioBetter) return "current-dominates";
  return "mixed";
}

export function applyTheRankDominanceGuard({
  currentBand,
  scenarioEstimate,
  relation,
}: {
  currentBand: string | null;
  scenarioEstimate: CalibratedTheRankEstimate;
  relation: ParetoRelation;
}): CalibratedTheRankEstimate {
  const currentOrdinal = currentBand === null ? null : getTheRankBandOrdinal(currentBand);
  const scenarioOrdinal = scenarioEstimate.predictedBand === null
    ? null
    : getTheRankBandOrdinal(scenarioEstimate.predictedBand);
  if (currentOrdinal === null || scenarioOrdinal === null) return scenarioEstimate;
  const violatesPositive =
    relation === "scenario-dominates" && scenarioOrdinal > currentOrdinal;
  const violatesNegative =
    relation === "current-dominates" && scenarioOrdinal < currentOrdinal;
  if (!violatesPositive && !violatesNegative) return scenarioEstimate;
  return {
    ...scenarioEstimate,
    predictedBand: currentBand,
    calibratedExpectedOrdinal: currentOrdinal,
    dominanceAdjustmentApplied: true,
  };
}

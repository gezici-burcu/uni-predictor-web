import {
  THE_2026_RANK_BAND_ORDER,
  THE_ALTERNATIVE_BAND_MIN_SHARE,
  THE_COMPOSITE_RANGE_MARGIN,
  THE_DEFAULT_NEIGHBOR_COUNT,
  THE_DISTANCE_EPSILON,
  THE_HIGH_CONFIDENCE_MAX_AVERAGE_DISTANCE,
  THE_HIGH_CONFIDENCE_MAX_NEAREST_DISTANCE,
  THE_HIGH_CONFIDENCE_MIN_NEIGHBOR_COUNT,
  THE_HIGH_CONFIDENCE_MIN_VOTE_SHARE,
  THE_MEDIUM_CONFIDENCE_MAX_AVERAGE_DISTANCE,
  THE_MEDIUM_CONFIDENCE_MIN_VOTE_SHARE,
  THE_MINIMUM_REFERENCE_COUNT,
  THE_OUT_OF_RANGE_NEAREST_DISTANCE,
  THE_RANK_ESTIMATION_CATEGORY_WEIGHTS,
  getThePublishedRankBand,
} from "@/src/config/the-rank-estimation";
import { THE_REFERENCE_CATEGORY_KEYS } from "@/src/lib/the/reference-dataset";
import type { TheCategoryScores } from "@/src/types/the-calculation";
import type {
  TheRankBandEstimate,
  TheRankBandEstimateConfidence,
  TheRankBandNeighbor,
  TheRankBandVoteSummary,
  TheRankEstimationCategoryScores,
} from "@/src/types/the-rank-band-estimate";
import type {
  TheReferenceDataset,
  TheReferenceInstitutionRecord,
} from "@/src/types/the-reference-dataset";
import { resolveActiveReferenceDatasetSync } from "@/src/lib/rankings/dataset-resolver";
import { toLegacyTheReferenceDataset } from "@/src/lib/rankings/bundled-datasets";

const isValidScore = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;

const toCompleteCategoryScores = (
  scores: TheCategoryScores,
): TheRankEstimationCategoryScores | null => {
  const { teaching, researchEnvironment, researchQuality, internationalOutlook, industry } = scores;
  if (
    !isValidScore(teaching) ||
    !isValidScore(researchEnvironment) ||
    !isValidScore(researchQuality) ||
    !isValidScore(internationalOutlook) ||
    !isValidScore(industry)
  ) {
    return null;
  }
  return {
    teaching,
    researchEnvironment,
    researchQuality,
    internationalOutlook,
    industry,
  };
};

const isValidTargetScores = (
  value: TheRankEstimationCategoryScores,
): value is TheRankEstimationCategoryScores =>
  THE_REFERENCE_CATEGORY_KEYS.every((category) => isValidScore(value[category]));

export function calculateTheCategoryDistance(
  left: TheRankEstimationCategoryScores,
  right: TheRankEstimationCategoryScores,
): number {
  if (!isValidTargetScores(left) || !isValidTargetScores(right)) {
    throw new RangeError("THE category scores must be finite numbers between 0 and 100.");
  }
  const squaredDistance = THE_REFERENCE_CATEGORY_KEYS.reduce((total, category) => {
    const difference = left[category] - right[category];
    return total + THE_RANK_ESTIMATION_CATEGORY_WEIGHTS[category] * difference ** 2;
  }, 0);
  return Math.sqrt(Math.max(0, squaredDistance));
}

export function calculateTheWeightedComposite(
  scores: TheRankEstimationCategoryScores,
): number {
  if (!isValidTargetScores(scores)) {
    throw new RangeError("THE category scores must be finite numbers between 0 and 100.");
  }
  return THE_REFERENCE_CATEGORY_KEYS.reduce(
    (total, category) =>
      total + scores[category] * THE_RANK_ESTIMATION_CATEGORY_WEIGHTS[category],
    0,
  );
}

export const getTheRankBandOrdinal = (rankBand: string): number | null => {
  const index = THE_2026_RANK_BAND_ORDER.findIndex((knownBand) => knownBand === rankBand);
  return index === -1 ? null : index;
};

export const getTheRankBandForOrdinal = (ordinal: number): string | null => {
  if (!Number.isFinite(ordinal)) return null;
  const index = Math.min(
    THE_2026_RANK_BAND_ORDER.length - 1,
    Math.max(0, Math.round(ordinal)),
  );
  return THE_2026_RANK_BAND_ORDER[index] ?? null;
};

const rankBandIndex = (rankBand: string): number => {
  const ordinal = getTheRankBandOrdinal(rankBand);
  return ordinal ?? Number.POSITIVE_INFINITY;
};

const compareRankBands = (left: string, right: string): number => {
  const leftIndex = rankBandIndex(left);
  const rightIndex = rankBandIndex(right);
  if (leftIndex !== rightIndex) return leftIndex - rightIndex;
  return left.localeCompare(right, "en");
};

const areAdjacentKnownBands = (left: string, right: string): boolean => {
  const leftIndex = rankBandIndex(left);
  const rightIndex = rankBandIndex(right);
  return Number.isFinite(leftIndex) && Number.isFinite(rightIndex) &&
    Math.abs(leftIndex - rightIndex) === 1;
};

type EligibleReference = {
  record: TheReferenceInstitutionRecord;
  categoryScores: TheRankEstimationCategoryScores;
  rankBand: string;
};

const createEmptyEstimate = ({
  status,
  requestedNeighborCount,
  eligibleReferenceCount,
  excludedReferenceCount,
  warnings,
}: {
  status: "invalid-input" | "insufficient-data" | "insufficient-reference-coverage";
  requestedNeighborCount: number;
  eligibleReferenceCount: number;
  excludedReferenceCount: number;
  warnings: string[];
}): TheRankBandEstimate => ({
  methodologyYear: 2026,
  status,
  predictedBand: null,
  alternativeBand: null,
  confidence: null,
  rawExpectedOrdinal: null,
  neighbors: [],
  bandVotes: [],
  diagnostics: {
    requestedNeighborCount,
    usedNeighborCount: 0,
    eligibleReferenceCount,
    excludedReferenceCount,
    targetComposite: null,
    minReferenceComposite: null,
    maxReferenceComposite: null,
    nearestDistance: null,
    averageNeighborDistance: null,
    topBandVoteShare: null,
    secondBandVoteShare: null,
  },
  warnings,
});

const determineConfidence = ({
  topBandVoteShare,
  topBandNeighborCount,
  averageNeighborDistance,
  nearestDistance,
}: {
  topBandVoteShare: number;
  topBandNeighborCount: number;
  averageNeighborDistance: number;
  nearestDistance: number;
}): TheRankBandEstimateConfidence => {
  if (
    topBandVoteShare >= THE_HIGH_CONFIDENCE_MIN_VOTE_SHARE &&
    topBandNeighborCount >= THE_HIGH_CONFIDENCE_MIN_NEIGHBOR_COUNT &&
    averageNeighborDistance <= THE_HIGH_CONFIDENCE_MAX_AVERAGE_DISTANCE &&
    nearestDistance <= THE_HIGH_CONFIDENCE_MAX_NEAREST_DISTANCE
  ) {
    return "high";
  }
  if (
    topBandVoteShare >= THE_MEDIUM_CONFIDENCE_MIN_VOTE_SHARE &&
    averageNeighborDistance <= THE_MEDIUM_CONFIDENCE_MAX_AVERAGE_DISTANCE
  ) {
    return "medium";
  }
  return "low";
};

export function estimateTheRankBand({
  categoryScores,
  dataset,
  excludeInstitutionId,
  neighborCount = THE_DEFAULT_NEIGHBOR_COUNT,
}: {
  categoryScores: TheRankEstimationCategoryScores;
  dataset: TheReferenceDataset;
  excludeInstitutionId?: string;
  neighborCount?: number;
}): TheRankBandEstimate {
  if (dataset.manifest.warnings.includes("insufficient-reference-coverage")) {
    return createEmptyEstimate({
      status: "insufficient-reference-coverage",
      requestedNeighborCount: neighborCount,
      eligibleReferenceCount: 0,
      excludedReferenceCount: dataset.records.length,
      warnings: ["Bu sonuç için yeterli karşılaştırılabilir THE referans kaydı bulunmadığından güvenilir bir sıralama bandı üretilemedi."],
    });
  }
  if (
    !isValidTargetScores(categoryScores) ||
    !Number.isInteger(neighborCount) ||
    neighborCount < 1
  ) {
    return createEmptyEstimate({
      status: "invalid-input",
      requestedNeighborCount: neighborCount,
      eligibleReferenceCount: 0,
      excludedReferenceCount: dataset.records.length,
      warnings: ["Target category scores or neighborCount are invalid."],
    });
  }

  const warnings: string[] = [];
  let wrongYearCount = 0;
  let missingRankBandCount = 0;
  let incompleteCategoryCount = 0;
  let excludedInstitutionCount = 0;
  const eligibleReferences: EligibleReference[] = [];

  for (const record of dataset.records) {
    if (record.methodologyYear !== 2026) {
      wrongYearCount += 1;
      continue;
    }
    const rankBand = record.rankBand ?? (record.rank === null ? null : getThePublishedRankBand(record.rank));
    if (rankBand === null || rankBand.trim() === "") {
      missingRankBandCount += 1;
      continue;
    }
    const completeScores = toCompleteCategoryScores(record.categoryScores);
    if (!completeScores) {
      incompleteCategoryCount += 1;
      continue;
    }
    if (excludeInstitutionId !== undefined && record.id === excludeInstitutionId) {
      excludedInstitutionCount += 1;
      continue;
    }
    eligibleReferences.push({
      record,
      categoryScores: completeScores,
      rankBand,
    });
  }

  if (wrongYearCount > 0) warnings.push(`${wrongYearCount} reference record(s) were excluded because methodologyYear is not 2026.`);
  if (missingRankBandCount > 0) warnings.push(`${missingRankBandCount} reference record(s) were excluded because rankBand is missing.`);
  if (incompleteCategoryCount > 0) warnings.push(`${incompleteCategoryCount} reference record(s) were excluded because category scores are incomplete or invalid.`);
  if (excludedInstitutionCount > 0) warnings.push(`Reference institution "${excludeInstitutionId}" was excluded from its own estimate.`);

  const excludedReferenceCount = dataset.records.length - eligibleReferences.length;
  const requiredReferenceCount = Math.max(THE_MINIMUM_REFERENCE_COUNT, neighborCount);
  if (eligibleReferences.length < requiredReferenceCount) {
    warnings.push(`At least ${requiredReferenceCount} eligible reference records are required for the requested neighbor count.`);
    return createEmptyEstimate({
      status: "insufficient-reference-coverage",
      requestedNeighborCount: neighborCount,
      eligibleReferenceCount: eligibleReferences.length,
      excludedReferenceCount,
      warnings,
    });
  }

  const countries = new Set(eligibleReferences.map(({ record }) => record.countryCode));
  if (countries.size === 1) warnings.push("Reference calibration contains records from only one country.");
  if (countries.size === 1 && countries.has("TR")) {
    warnings.push("Estimate uses a Türkiye-centered THE 2026 reference calibration.");
  }

  const unknownBands = [...new Set(
    eligibleReferences
      .map(({ rankBand }) => rankBand)
      .filter((rankBand) => !Number.isFinite(rankBandIndex(rankBand))),
  )].sort((left, right) => left.localeCompare(right, "en"));
  if (unknownBands.length > 0) {
    warnings.push(`Unknown rankBand value(s) were included: ${unknownBands.join(", ")}.`);
  }

  const allNeighbors: TheRankBandNeighbor[] = eligibleReferences
    .map(({ record, categoryScores: referenceScores, rankBand }) => {
      const distance = calculateTheCategoryDistance(categoryScores, referenceScores);
      return {
        institutionId: record.id,
        universityName: record.universityName,
        countryCode: record.countryCode,
        rankBand,
        distance,
        voteWeight: 1 / (distance + THE_DISTANCE_EPSILON),
        categoryScores: { ...referenceScores },
      };
    })
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        left.universityName.localeCompare(right.universityName, "en") ||
        left.institutionId.localeCompare(right.institutionId, "en"),
    );

  const neighbors = allNeighbors.slice(0, neighborCount);
  if (neighbors.length < neighborCount) {
    warnings.push(`Only ${neighbors.length} eligible reference record(s) were available for the requested ${neighborCount} neighbors.`);
  }

  const totalVoteWeight = neighbors.reduce((sum, neighbor) => sum + neighbor.voteWeight, 0);
  const ordinalNeighbors = neighbors.flatMap((neighbor) => {
    const ordinal = getTheRankBandOrdinal(neighbor.rankBand);
    return ordinal === null ? [] : [{ neighbor, ordinal }];
  });
  const ordinalVoteWeight = ordinalNeighbors.reduce(
    (sum, { neighbor }) => sum + neighbor.voteWeight,
    0,
  );
  const rawExpectedOrdinal = ordinalVoteWeight > 0
    ? ordinalNeighbors.reduce(
        (sum, { neighbor, ordinal }) => sum + neighbor.voteWeight * ordinal,
        0,
      ) / ordinalVoteWeight
    : null;
  const voteGroups = new Map<string, TheRankBandNeighbor[]>();
  for (const neighbor of neighbors) {
    const group = voteGroups.get(neighbor.rankBand) ?? [];
    group.push(neighbor);
    voteGroups.set(neighbor.rankBand, group);
  }
  const bandVotes: TheRankBandVoteSummary[] = [...voteGroups.entries()]
    .map(([rankBand, group]) => {
      const totalBandWeight = group.reduce((sum, neighbor) => sum + neighbor.voteWeight, 0);
      const totalDistance = group.reduce((sum, neighbor) => sum + neighbor.distance, 0);
      return {
        rankBand,
        totalVoteWeight: totalBandWeight,
        voteShare: totalBandWeight / totalVoteWeight,
        neighborCount: group.length,
        nearestDistance: Math.min(...group.map(({ distance }) => distance)),
        averageDistance: totalDistance / group.length,
      };
    })
    .sort(
      (left, right) =>
        right.totalVoteWeight - left.totalVoteWeight ||
        right.neighborCount - left.neighborCount ||
        left.averageDistance - right.averageDistance ||
        compareRankBands(left.rankBand, right.rankBand),
    );

  const topBand = bandVotes[0];
  const secondBand = bandVotes[1];
  const secondBandVoteShare = secondBand?.voteShare ?? 0;
  let alternativeBand: string | null = null;
  if (
    secondBand &&
    secondBandVoteShare >= THE_ALTERNATIVE_BAND_MIN_SHARE &&
    areAdjacentKnownBands(topBand.rankBand, secondBand.rankBand)
  ) {
    alternativeBand = secondBand.rankBand;
  } else if (secondBand && secondBandVoteShare >= THE_ALTERNATIVE_BAND_MIN_SHARE) {
    warnings.push("Votes are dispersed across non-adjacent rank bands.");
  }

  const targetComposite = calculateTheWeightedComposite(categoryScores);
  const referenceComposites = eligibleReferences.map(({ categoryScores: scores }) =>
    calculateTheWeightedComposite(scores)
  );
  const minReferenceComposite = Math.min(...referenceComposites);
  const maxReferenceComposite = Math.max(...referenceComposites);
  const nearestDistance = neighbors[0].distance;
  const averageNeighborDistance = neighbors.reduce((sum, neighbor) => sum + neighbor.distance, 0) /
    neighbors.length;
  const outOfRange =
    targetComposite < minReferenceComposite - THE_COMPOSITE_RANGE_MARGIN ||
    targetComposite > maxReferenceComposite + THE_COMPOSITE_RANGE_MARGIN ||
    nearestDistance > THE_OUT_OF_RANGE_NEAREST_DISTANCE;
  if (outOfRange) warnings.push("Target category profile is outside the reference distribution.");

  const confidence = outOfRange
    ? "low"
    : determineConfidence({
        topBandVoteShare: topBand.voteShare,
        topBandNeighborCount: topBand.neighborCount,
        averageNeighborDistance,
        nearestDistance,
      });

  return {
    methodologyYear: 2026,
    status: outOfRange ? "out-of-range" : "estimated",
    predictedBand: outOfRange ? null : topBand.rankBand,
    alternativeBand: outOfRange ? null : alternativeBand,
    confidence,
    rawExpectedOrdinal,
    neighbors,
    bandVotes,
    diagnostics: {
      requestedNeighborCount: neighborCount,
      usedNeighborCount: neighbors.length,
      eligibleReferenceCount: eligibleReferences.length,
      excludedReferenceCount,
      targetComposite,
      minReferenceComposite,
      maxReferenceComposite,
      nearestDistance,
      averageNeighborDistance,
      topBandVoteShare: topBand.voteShare,
      secondBandVoteShare,
    },
    warnings,
  };
}

export function estimateThe2026RankBand({
  categoryScores,
  excludeInstitutionId,
  neighborCount,
}: {
  categoryScores: TheRankEstimationCategoryScores;
  excludeInstitutionId?: string;
  neighborCount?: number;
}): TheRankBandEstimate {
  return estimateTheRankBand({
    categoryScores,
    dataset: toLegacyTheReferenceDataset(resolveActiveReferenceDatasetSync("THE").dataset),
    excludeInstitutionId,
    neighborCount,
  });
}

import { UI_GREENMETRIC_ACTIVE_RANK_CALIBRATION } from "@/src/data/ui-greenmetric/ui-greenmetric-rank-calibration";
import type {
  UiGreenMetricRankCalibrationDataset,
  UiGreenMetricRankConfidence,
  UiGreenMetricRankEstimate,
} from "@/src/types/greenmetric-rank";

const DEFAULT_SCORE_METHODOLOGY_YEAR = 2026;

type RankObservationGroup = {
  score: number;
  minimumRank: number;
  maximumRank: number;
  representativeRank: number;
};

function createMetadata(
  score: number | null,
  scoreMethodologyYear: number,
  dataset: UiGreenMetricRankCalibrationDataset,
) {
  return {
    inputScore: score,
    scoreMethodologyYear,
    calibrationDataYear: dataset.metadata.calibrationDataYear,
    calibrationMethodologyYear: dataset.metadata.calibrationMethodologyYear,
    calibrationDatasetId: dataset.metadata.datasetId,
    calibrationSourceType: dataset.metadata.sourceType,
    calibrationPointCount: dataset.points.length,
    approximate: dataset.metadata.approximate ||
      dataset.metadata.calibrationMethodologyYear !== scoreMethodologyYear,
  };
}

function calibrationGroups(dataset: UiGreenMetricRankCalibrationDataset): RankObservationGroup[] {
  const maximumRank = dataset.metadata.institutionCount ?? Number.POSITIVE_INFINITY;
  const ranksByScore = new Map<number, number[]>();
  for (const point of dataset.points) {
    if (!Number.isFinite(point.score) || !Number.isInteger(point.rank) || point.rank < 1) continue;
    const rank = Math.min(maximumRank, point.rank);
    const ranks = ranksByScore.get(point.score) ?? [];
    ranks.push(rank);
    ranksByScore.set(point.score, ranks);
  }

  const groups = [...ranksByScore.entries()]
    .map(([score, ranks]) => ({
      score,
      minimumRank: Math.min(...ranks),
      maximumRank: Math.max(...ranks),
      representativeRank: Math.round((Math.min(...ranks) + Math.max(...ranks)) / 2),
    }))
    .toSorted((left, right) => right.score - left.score);

  let previousMinimumRank = 1;
  let previousMaximumRank = 1;
  return groups.map((group) => {
    const minimumRank = Math.max(previousMinimumRank, group.minimumRank);
    const maximumRankForGroup = Math.max(minimumRank, previousMaximumRank, group.maximumRank);
    previousMinimumRank = minimumRank;
    previousMaximumRank = maximumRankForGroup;
    return {
      ...group,
      minimumRank,
      maximumRank: maximumRankForGroup,
      representativeRank: Math.round((minimumRank + maximumRankForGroup) / 2),
    };
  });
}

function confidenceForNeighborhood({
  dataset,
  scoreGap,
  nearestScoreDistance,
  scoreMethodologyYear,
}: {
  dataset: UiGreenMetricRankCalibrationDataset;
  scoreGap: number;
  nearestScoreDistance: number;
  scoreMethodologyYear: number;
}): UiGreenMetricRankConfidence {
  if (dataset.metadata.approximate || dataset.points.length < 20) return "LOW";
  let confidence: UiGreenMetricRankConfidence = scoreGap <= 75 && nearestScoreDistance <= 25
    ? "HIGH"
    : scoreGap <= 300 && nearestScoreDistance <= 150
      ? "MEDIUM"
      : "LOW";
  if (dataset.metadata.calibrationMethodologyYear !== scoreMethodologyYear && confidence === "HIGH") {
    confidence = "MEDIUM";
  }
  return confidence;
}

function bandWidth(confidence: UiGreenMetricRankConfidence, localRankGap: number) {
  if (confidence === "HIGH") return 25;
  if (confidence === "MEDIUM") return 50;
  return localRankGap > 100 ? 250 : 100;
}

function formatRankRangeBand({
  minimumRank,
  maximumRank,
  confidence,
  localRankGap,
  institutionCount,
}: {
  minimumRank: number;
  maximumRank: number;
  confidence: UiGreenMetricRankConfidence;
  localRankGap: number;
  institutionCount: number | null;
}) {
  const width = bandWidth(confidence, localRankGap);
  const start = Math.floor((Math.max(1, minimumRank) - 1) / width) * width + 1;
  const unconstrainedEnd = Math.ceil(Math.max(minimumRank, maximumRank) / width) * width;
  const end = institutionCount === null ? unconstrainedEnd : Math.min(unconstrainedEnd, institutionCount);
  return `${start}–${Math.max(start, end)}`;
}

function interpolate(upper: number, lower: number, ratio: number) {
  return Math.round(upper + ratio * (lower - upper));
}

function unavailableEstimate(
  metadata: ReturnType<typeof createMetadata>,
): UiGreenMetricRankEstimate {
  return {
    ...metadata,
    estimatedRank: null,
    estimatedRankBand: null,
    observedRankRange: null,
    nearestScoreDistance: null,
    confidence: "LOW",
    method: "unavailable",
    position: "unavailable",
    isExtrapolated: false,
  };
}

export function estimateUiGreenMetricRankBand(
  calculatedGreenMetricTotalScore: number | null,
  options: {
    dataset?: UiGreenMetricRankCalibrationDataset;
    scoreMethodologyYear?: number;
  } = {},
): UiGreenMetricRankEstimate {
  const dataset = options.dataset ?? UI_GREENMETRIC_ACTIVE_RANK_CALIBRATION;
  const scoreMethodologyYear = options.scoreMethodologyYear ?? DEFAULT_SCORE_METHODOLOGY_YEAR;
  const metadata = createMetadata(calculatedGreenMetricTotalScore, scoreMethodologyYear, dataset);
  if (calculatedGreenMetricTotalScore === null || !Number.isFinite(calculatedGreenMetricTotalScore)) {
    return unavailableEstimate(metadata);
  }

  const groups = calibrationGroups(dataset);
  if (groups.length < 2) return unavailableEstimate(metadata);
  const best = groups[0];
  const worst = groups.at(-1)!;

  if (calculatedGreenMetricTotalScore > best.score) {
    return {
      ...metadata,
      estimatedRank: best.representativeRank,
      estimatedRankBand: formatRankRangeBand({ minimumRank: best.minimumRank, maximumRank: best.maximumRank, confidence: "LOW", localRankGap: 101, institutionCount: dataset.metadata.institutionCount }),
      observedRankRange: { minimum: best.minimumRank, maximum: best.maximumRank },
      nearestScoreDistance: calculatedGreenMetricTotalScore - best.score,
      confidence: "LOW",
      method: "historical-local-interpolation",
      position: "above-range",
      isExtrapolated: true,
    };
  }

  if (calculatedGreenMetricTotalScore < worst.score) {
    const firstUncoveredRank = worst.maximumRank + 1;
    const institutionCount = dataset.metadata.institutionCount;
    return {
      ...metadata,
      estimatedRank: null,
      estimatedRankBand: institutionCount === null
        ? `${firstUncoveredRank}+`
        : firstUncoveredRank > institutionCount
          ? formatRankRangeBand({
              minimumRank: worst.minimumRank,
              maximumRank: institutionCount,
              confidence: "LOW",
              localRankGap: 101,
              institutionCount,
            })
          : `${firstUncoveredRank}–${institutionCount}`,
      observedRankRange: { minimum: worst.minimumRank, maximum: worst.maximumRank },
      nearestScoreDistance: worst.score - calculatedGreenMetricTotalScore,
      confidence: "LOW",
      method: "historical-local-interpolation",
      position: "below-range",
      isExtrapolated: true,
    };
  }

  const exactIndex = groups.findIndex((group) => group.score === calculatedGreenMetricTotalScore);
  if (exactIndex >= 0) {
    const exact = groups[exactIndex];
    const upper = groups[Math.max(0, exactIndex - 1)];
    const lower = groups[Math.min(groups.length - 1, exactIndex + 1)];
    const scoreGap = upper.score - lower.score;
    const localRankGap = Math.max(
      exact.representativeRank - upper.representativeRank,
      lower.representativeRank - exact.representativeRank,
      0,
    );
    const confidence = confidenceForNeighborhood({ dataset, scoreGap, nearestScoreDistance: 0, scoreMethodologyYear });
    return {
      ...metadata,
      estimatedRank: exact.representativeRank,
      estimatedRankBand: formatRankRangeBand({ minimumRank: exact.minimumRank, maximumRank: exact.maximumRank, confidence, localRankGap, institutionCount: dataset.metadata.institutionCount }),
      observedRankRange: { minimum: exact.minimumRank, maximum: exact.maximumRank },
      nearestScoreDistance: 0,
      confidence,
      method: "historical-local-interpolation",
      position: "exact-observation",
      isExtrapolated: false,
    };
  }

  for (let index = 0; index < groups.length - 1; index += 1) {
    const upper = groups[index];
    const lower = groups[index + 1];
    if (calculatedGreenMetricTotalScore >= upper.score || calculatedGreenMetricTotalScore <= lower.score) continue;
    const ratio = (upper.score - calculatedGreenMetricTotalScore) / (upper.score - lower.score);
    const minimumRank = interpolate(upper.minimumRank, lower.minimumRank, ratio);
    const maximumRank = interpolate(upper.maximumRank, lower.maximumRank, ratio);
    const maximumAllowedRank = dataset.metadata.institutionCount ?? worst.maximumRank;
    const boundedMinimumRank = Math.min(maximumAllowedRank, Math.max(1, minimumRank));
    const boundedMaximumRank = Math.min(maximumAllowedRank, Math.max(boundedMinimumRank, maximumRank));
    const nearestScoreDistance = Math.min(upper.score - calculatedGreenMetricTotalScore, calculatedGreenMetricTotalScore - lower.score);
    const localRankGap = lower.representativeRank - upper.representativeRank;
    const confidence = confidenceForNeighborhood({ dataset, scoreGap: upper.score - lower.score, nearestScoreDistance, scoreMethodologyYear });
    return {
      ...metadata,
      estimatedRank: Math.round((boundedMinimumRank + boundedMaximumRank) / 2),
      estimatedRankBand: formatRankRangeBand({ minimumRank: boundedMinimumRank, maximumRank: boundedMaximumRank, confidence, localRankGap, institutionCount: dataset.metadata.institutionCount }),
      observedRankRange: { minimum: boundedMinimumRank, maximum: boundedMaximumRank },
      nearestScoreDistance,
      confidence,
      method: "historical-local-interpolation",
      position: "interpolation",
      isExtrapolated: false,
    };
  }

  return unavailableEstimate(metadata);
}

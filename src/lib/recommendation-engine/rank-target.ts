import type {
  RecommendationRankEstimate,
  RecommendationRankRange,
  RecommendationRankTargetEvaluation,
} from "./types";

export const UNAVAILABLE_RECOMMENDATION_RANK_ESTIMATE: RecommendationRankEstimate = {
  exactRank: null,
  band: null,
  available: false,
  approximate: true,
};

export function parseRecommendationRankBand(band: string | null) {
  if (!band) return null;
  const normalized = band.replaceAll(",", "").replaceAll(".", "").replace(/\s/g, "");
  const closed = normalized.match(/^(\d+)[\-–—](\d+)$/);
  if (closed) {
    const minimum = Number(closed[1]);
    const maximum = Number(closed[2]);
    return minimum > 0 && maximum >= minimum ? { minimum, maximum } : null;
  }
  const open = normalized.match(/^(\d+)\+$/);
  return open ? { minimum: Number(open[1]), maximum: Number.POSITIVE_INFINITY } : null;
}

export function evaluateRankTarget(
  estimate: RecommendationRankEstimate,
  targetRange: RecommendationRankRange,
): RecommendationRankTargetEvaluation {
  const unavailable = (): RecommendationRankTargetEvaluation => ({
    status: "unavailable",
    match: "unavailable",
    estimate,
    targetRange,
  });
  if (!estimate.available) return unavailable();
  if (estimate.exactRank !== null && Number.isFinite(estimate.exactRank)) {
    if (estimate.exactRank < targetRange.bestRank) {
      return { status: "exceeded", match: "better", estimate, targetRange };
    }
    if (estimate.exactRank <= targetRange.worstRank) {
      return { status: "reached", match: "inside", estimate, targetRange };
    }
    return { status: "notReached", match: "none", estimate, targetRange };
  }
  const parsed = parseRecommendationRankBand(estimate.band);
  if (!parsed) return unavailable();
  if (parsed.maximum <= targetRange.bestRank) {
    return { status: "exceeded", match: "better", estimate, targetRange };
  }
  if (parsed.minimum >= targetRange.bestRank && parsed.maximum <= targetRange.worstRank) {
    return { status: "reached", match: "inside", estimate, targetRange };
  }
  if (parsed.minimum <= targetRange.worstRank && parsed.maximum >= targetRange.bestRank) {
    return { status: "overlaps", match: "overlap", estimate, targetRange };
  }
  return { status: "notReached", match: "none", estimate, targetRange };
}

export function getRankTargetDistance(evaluation: RecommendationRankTargetEvaluation) {
  if (evaluation.status === "unavailable") return Number.POSITIVE_INFINITY;
  if (
    evaluation.status === "reached" ||
    evaluation.status === "overlaps" ||
    evaluation.status === "exceeded"
  ) return 0;
  if (evaluation.estimate.exactRank !== null) {
    return Math.max(0, evaluation.estimate.exactRank - evaluation.targetRange.worstRank);
  }
  const parsed = parseRecommendationRankBand(evaluation.estimate.band);
  return parsed ? Math.max(0, parsed.minimum - evaluation.targetRange.worstRank) : Number.POSITIVE_INFINITY;
}

export function formatRecommendationRankEstimate(estimate: RecommendationRankEstimate | null) {
  if (!estimate?.available) return "—";
  return estimate.band ?? (estimate.exactRank === null ? "—" : String(Math.round(estimate.exactRank)));
}

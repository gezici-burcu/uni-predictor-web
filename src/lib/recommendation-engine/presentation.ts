import type { RecommendationEngineResult } from "./types";

export const RECOMMENDATION_SCORE_EPSILON = 0.0001;

export type RecommendationOutcomeStatus =
  | "reached"
  | "limited-improvement"
  | "no-positive-improvement";

export function classifyRecommendationOutcome(
  result: RecommendationEngineResult,
): RecommendationOutcomeStatus {
  const recommendedScore =
    result.primaryPlan?.recommendedScore ?? result.reachability.maximumReachableScore;
  const targetScore = result.targetScore ?? result.constrainedStartScore;
  if (recommendedScore >= targetScore - RECOMMENDATION_SCORE_EPSILON) {
    return "reached";
  }
  if (recommendedScore > result.constrainedStartScore + RECOMMENDATION_SCORE_EPSILON) {
    return "limited-improvement";
  }
  return "no-positive-improvement";
}

export function getRecommendationScoreRelations(result: RecommendationEngineResult) {
  const recommendedScore =
    result.primaryPlan?.recommendedScore ?? result.reachability.maximumReachableScore;
  const targetScore = result.targetScore ?? result.constrainedStartScore;
  return {
    recommendedScore,
    currentTargetGap: Math.max(0, targetScore - result.currentScore),
    constrainedTargetGap: Math.max(0, targetScore - result.constrainedStartScore),
    remainingTargetGap: Math.max(0, targetScore - recommendedScore),
    userImpact: result.constrainedStartScore - result.currentScore,
    recommendationImpact: recommendedScore - result.constrainedStartScore,
    netImpact: recommendedScore - result.currentScore,
  };
}

export function formatRecommendationScore(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "—"
    : value.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

export function calculateDisplayedScoreDifference(
  before: number | null | undefined,
  after: number | null | undefined,
) {
  if (before === null || before === undefined || after === null || after === undefined ||
      !Number.isFinite(before) || !Number.isFinite(after)) return null;
  const displayedBefore = Math.round((before + Number.EPSILON) * 100) / 100;
  const displayedAfter = Math.round((after + Number.EPSILON) * 100) / 100;
  return displayedAfter - displayedBefore;
}

export function formatRecommendationValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("tr-TR", { maximumFractionDigits: 2 })
    : "—";
}

export interface RecommendationProgressChartDatum {
  label: string;
  score: number;
}

export function buildRecommendationProgressChartData(
  result: RecommendationEngineResult,
): RecommendationProgressChartDatum[] {
  const plan = result.primaryPlan;
  if (!plan) return [];
  return [
    { label: "Mevcut", score: result.currentScore },
    { label: "Kullanıcı Senaryosu", score: result.constrainedStartScore },
    ...plan.changes.map((change, index, changes) => ({
      label: index === changes.length - 1 ? "Önerilen" : String(index + 1),
      score: change.scoreAfterChange,
    })),
  ];
}

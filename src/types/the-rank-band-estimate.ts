import type { TheCategoryScores } from "@/src/types/the-calculation";

export type TheRankEstimationCategoryScores = {
  [Category in keyof TheCategoryScores]: number;
};

export type TheRankBandEstimateStatus =
  | "estimated"
  | "insufficient-data"
  | "insufficient-reference-coverage"
  | "out-of-range"
  | "invalid-input";

export type TheRankBandEstimateConfidence = "high" | "medium" | "low";

export interface TheRankBandNeighbor {
  institutionId: string;
  universityName: string;
  countryCode: string | null;
  rankBand: string;
  distance: number;
  voteWeight: number;
  categoryScores: TheRankEstimationCategoryScores;
}

export interface TheRankBandVoteSummary {
  rankBand: string;
  totalVoteWeight: number;
  voteShare: number;
  neighborCount: number;
  nearestDistance: number;
  averageDistance: number;
}

export interface TheRankBandEstimateDiagnostics {
  requestedNeighborCount: number;
  usedNeighborCount: number;
  eligibleReferenceCount: number;
  excludedReferenceCount: number;
  targetComposite: number | null;
  minReferenceComposite: number | null;
  maxReferenceComposite: number | null;
  nearestDistance: number | null;
  averageNeighborDistance: number | null;
  topBandVoteShare: number | null;
  secondBandVoteShare: number | null;
}

export interface TheRankBandEstimate {
  methodologyYear: 2026;
  status: TheRankBandEstimateStatus;
  predictedBand: string | null;
  alternativeBand: string | null;
  confidence: TheRankBandEstimateConfidence | null;
  rawExpectedOrdinal: number | null;
  neighbors: TheRankBandNeighbor[];
  bandVotes: TheRankBandVoteSummary[];
  diagnostics: TheRankBandEstimateDiagnostics;
  warnings: string[];
}

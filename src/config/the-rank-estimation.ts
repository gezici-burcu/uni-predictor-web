import type { TheCategoryScores } from "@/src/types/the-calculation";

export const THE_RANK_ESTIMATION_CATEGORY_WEIGHTS = {
  teaching: 0.295,
  researchEnvironment: 0.29,
  researchQuality: 0.3,
  internationalOutlook: 0.075,
  industry: 0.04,
} as const satisfies Record<keyof TheCategoryScores, number>;

export const THE_DEFAULT_NEIGHBOR_COUNT = 5;
export const THE_MINIMUM_REFERENCE_COUNT = 3;
export const THE_DISTANCE_EPSILON = 1;
export const THE_ALTERNATIVE_BAND_MIN_SHARE = 0.2;

export const THE_HIGH_CONFIDENCE_MIN_VOTE_SHARE = 0.65;
export const THE_HIGH_CONFIDENCE_MIN_NEIGHBOR_COUNT = 3;
export const THE_HIGH_CONFIDENCE_MAX_AVERAGE_DISTANCE = 12;
export const THE_HIGH_CONFIDENCE_MAX_NEAREST_DISTANCE = 8;
export const THE_MEDIUM_CONFIDENCE_MIN_VOTE_SHARE = 0.45;
export const THE_MEDIUM_CONFIDENCE_MAX_AVERAGE_DISTANCE = 22;

export const THE_COMPOSITE_RANGE_MARGIN = 5;
export const THE_OUT_OF_RANGE_NEAREST_DISTANCE = 30;

export const THE_2026_RANK_BAND_ORDER = [
  "1–50",
  "51–100",
  "101–150",
  "151–200",
  "301–350",
  "351–400",
  "401–500",
  "501–600",
  "601–800",
  "801–1000",
  "1001–1200",
  "1201–1500",
  "1501+",
] as const;

export function getThePublishedRankBand(rank: number): string | null {
  if (!Number.isInteger(rank) || rank < 1) return null;
  if (rank <= 50) return "1–50";
  if (rank <= 100) return "51–100";
  if (rank <= 150) return "101–150";
  if (rank <= 200) return "151–200";
  return null;
}

import { clamp } from "./stochasticMath";

export const QS_2027_OVERALL_NORMALIZER = {
  intercept: -2.1766787169862454,
  slope: 1.0328246491321467,
  sampleSize: 688,
  rSquared: 0.9999976897411559,
  source: "derived-from-official-qs-2027-public-table",
} as const;

export function estimateQs2027Overall(weightedComposite: number | null) {
  if (weightedComposite === null || !Number.isFinite(weightedComposite)) return null;
  return clamp(
    QS_2027_OVERALL_NORMALIZER.intercept +
      QS_2027_OVERALL_NORMALIZER.slope * weightedComposite,
    1,
    100,
  );
}

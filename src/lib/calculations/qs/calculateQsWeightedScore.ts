import { QS_2027_INDICATOR_WEIGHTS, QS_INDICATOR_ORDER } from "@/src/config/qs.calculation";
import type { QsIndicatorCode } from "@/src/types/qs";

export function calculateQsWeightedComposite(scores: Record<QsIndicatorCode, number | null>): number | null {
  let total = 0;
  for (const code of QS_INDICATOR_ORDER) {
    const weight = QS_2027_INDICATOR_WEIGHTS[code];
    if (weight === 0) continue;
    const score = scores[code];
    if (score === null || !Number.isFinite(score)) return null;
    total += score * weight;
  }
  return total;
}

/** @deprecated Use calculateQsWeightedComposite; retained for migration/tests. */
export const calculateQsWeightedScore = calculateQsWeightedComposite;

export function calculateQsScoreCoverage(
  scores: Record<QsIndicatorCode, number | null>,
): number {
  return QS_INDICATOR_ORDER.reduce((coverage, code) => {
    const score = scores[code];
    return coverage + (
      QS_2027_INDICATOR_WEIGHTS[code] > 0 &&
      score !== null &&
      Number.isFinite(score)
        ? QS_2027_INDICATOR_WEIGHTS[code] * 100
        : 0
    );
  }, 0);
}

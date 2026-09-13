import { QS_WEIGHTED_INDICATOR_DEFINITIONS } from "@/src/config/qs.stochastic";
import type { QsIndicatorCode } from "@/src/types/qs";

export function calculateQsDerivedWeightedScore(
  scores: Partial<Record<QsIndicatorCode, number>>,
): number | null {
  if (QS_WEIGHTED_INDICATOR_DEFINITIONS.some(({code}) => scores[code] === undefined)) return null;
  return QS_WEIGHTED_INDICATOR_DEFINITIONS.reduce(
    (sum, definition) => sum + scores[definition.code]! * definition.officialWeight,
    0,
  );
}

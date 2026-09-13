import type { QsIndicatorCode, QsLensScores } from "@/src/types/qs";

const weightedAverage = (items: Array<[number | null, number]>) => items.some(([value, weight]) => weight > 0 && value === null) ? null : items.reduce((sum, [value, weight]) => sum + (value ?? 0) * weight, 0) / items.reduce((sum, [, weight]) => sum + weight, 0);
export function calculateQsLensScores(s: Record<QsIndicatorCode, number | null>): QsLensScores {
  return { researchDiscovery: weightedAverage([[s.AR, 30], [s.CPF, 20]]), employabilityOutcomes: weightedAverage([[s.ER, 15], [s.EO, 5]]), globalEngagement: weightedAverage([[s.IFR, 5], [s.IRN, 5], [s.ISR, 5], [s.ISD, 0]]), learningExperience: s.FSR, sustainability: s.SUS };
}

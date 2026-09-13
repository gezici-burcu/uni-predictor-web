import {
  theNormalizationReferenceSet,
  validateNormalizationReference,
} from "@/src/config/the.normalization";
import { normalCdf } from "@/src/lib/normalization/normalCdf";
import { calculateZScore } from "@/src/lib/normalization/zScore";
import type {
  TheIndicatorCode,
  TheIndicatorScoreResult,
  TheNormalizationReferenceSet,
  TheNormalizedRawIndicatorCode,
  TheRawIndicatorResult,
} from "@/src/types/the-calculation";

const externalCodes = new Set<TheIndicatorCode>(["TREP", "RREP", "CI", "RS", "RE", "RINF", "PAT"]);

/**
 * Z-score/CDF dönüşümü Uni-Predictor Web simülasyon yaklaşımıdır;
 * THE'nin yayımladığı kesin kapalı normalizasyon formülü değildir.
 */
const zScoreToSafeSimulationScore = (zScore: number): number | null => {
  if (!Number.isFinite(zScore)) return null;
  const score = 100 * normalCdf(zScore);
  return Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : null;
};

export function calculateTheIndicatorScores(
  rawIndicators: Record<TheIndicatorCode, TheRawIndicatorResult>,
  referenceSet: TheNormalizationReferenceSet = theNormalizationReferenceSet,
): Record<TheIndicatorCode, TheIndicatorScoreResult> {
  return Object.fromEntries(Object.entries(rawIndicators).map(([key, raw]) => {
    const code = key as TheIndicatorCode;
    if (externalCodes.has(code)) {
      return [code, {
        ...raw,
        score: raw.valid ? raw.rawValue : null,
        normalizationMethod: "external-direct",
        normalizationReferenceId: null,
        referenceSetReady: true,
        referenceSourceDescription: null,
        mean: null,
        standardDeviation: null,
        zScore: null,
      } satisfies TheIndicatorScoreResult];
    }

    const normalizedCode = code as TheNormalizedRawIndicatorCode;
    const reference = referenceSet.indicators[normalizedCode];
    const validation = validateNormalizationReference(normalizedCode, reference);

    if (!raw.valid || raw.rawValue === null || !validation.ready) {
      const missingWarning = raw.valid && raw.rawValue !== null
        ? ["Normalizasyon referansı bulunmadığı için gösterge skoru hesaplanamadı."]
        : [];
      return [code, {
        ...raw,
        score: null,
        normalizationMethod: "not-normalized",
        normalizationReferenceId: referenceSet.metadata.referenceSetId,
        referenceSetReady: validation.ready,
        referenceSourceDescription: reference.sourceDescription,
        mean: reference.mean,
        standardDeviation: reference.standardDeviation,
        zScore: null,
        warnings: [...raw.warnings, ...validation.warnings, ...missingWarning],
      } satisfies TheIndicatorScoreResult];
    }

    const zScoreResult = calculateZScore(raw.rawValue, reference.mean, reference.standardDeviation);
    const score = zScoreResult.value === null ? null : zScoreToSafeSimulationScore(zScoreResult.value);
    return [code, {
      ...raw,
      score,
      normalizationMethod: zScoreResult.valid && score !== null ? "zscore-cdf-simulation" : "not-normalized",
      normalizationReferenceId: referenceSet.metadata.referenceSetId,
      referenceSetReady: validation.ready,
      referenceSourceDescription: reference.sourceDescription,
      mean: reference.mean,
      standardDeviation: reference.standardDeviation,
      zScore: zScoreResult.value,
      warnings: [...raw.warnings, ...(zScoreResult.warning ? [zScoreResult.warning] : [])],
    } satisfies TheIndicatorScoreResult];
  })) as Record<TheIndicatorCode, TheIndicatorScoreResult>;
}

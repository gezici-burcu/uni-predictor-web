import rawReferenceSet from "@/src/data/the/the-2026-normalization-references.json";
import type {
  TheNormalizationIndicatorReference,
  TheNormalizationReferenceSet,
  TheNormalizedRawIndicatorCode,
  TheReferenceReadiness,
  TheReferenceValidationResult,
} from "@/src/types/the-calculation";

export const THE_NORMALIZED_RAW_INDICATOR_CODES = [
  "SSR", "DBR", "DSR", "II", "RI", "RP", "IS", "IF", "IC", "SA", "IND",
] as const satisfies readonly TheNormalizedRawIndicatorCode[];

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";
const isNullableNumber = (value: unknown): value is number | null =>
  value === null || (typeof value === "number" && Number.isFinite(value));
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function loadNormalizationReferenceSet(value: unknown): TheNormalizationReferenceSet {
  if (!isRecord(value)) {
    throw new Error("THE normalizasyon referans dosyasının yapısı geçersiz.");
  }

  const metadata = value.metadata;
  const rawIndicators = value.indicators;
  if (!isRecord(metadata) || !isRecord(rawIndicators)) {
    throw new Error("THE normalizasyon referans dosyasının yapısı geçersiz.");
  }
  if (
    typeof metadata.methodology !== "string" ||
    metadata.methodologyYear !== 2026 ||
    typeof metadata.referenceSetId !== "string" ||
    !isNullableString(metadata.datasetName) ||
    !isNullableNumber(metadata.sourceYear) ||
    !isNullableString(metadata.populationScope) ||
    typeof metadata.sourceDescription !== "string" ||
    !isNullableString(metadata.updatedAt)
  ) {
    throw new Error("THE normalizasyon metadata alanları geçersiz.");
  }

  const indicators = Object.fromEntries(
    THE_NORMALIZED_RAW_INDICATOR_CODES.map((code) => {
      const reference = rawIndicators[code];
      if (
        !isRecord(reference) ||
        !isNullableNumber(reference.mean) ||
        !isNullableNumber(reference.standardDeviation) ||
        !isNullableNumber(reference.sampleSize) ||
        typeof reference.sourceDescription !== "string"
      ) {
        throw new Error(`${code} normalizasyon referansı yapısal olarak geçersiz.`);
      }
      return [code, reference as unknown as TheNormalizationIndicatorReference];
    }),
  ) as Record<TheNormalizedRawIndicatorCode, TheNormalizationIndicatorReference>;

  return { metadata: metadata as unknown as TheNormalizationReferenceSet["metadata"], indicators };
}

export const validateNormalizationReference = (
  indicator: TheNormalizedRawIndicatorCode,
  reference: TheNormalizationIndicatorReference,
): TheReferenceValidationResult => {
  const warnings: string[] = [];
  if (reference.mean === null || !Number.isFinite(reference.mean)) warnings.push(`${indicator} için ortalama değeri bulunmuyor.`);
  if (reference.standardDeviation === null || !Number.isFinite(reference.standardDeviation)) warnings.push(`${indicator} için standart sapma bulunmuyor.`);
  else if (reference.standardDeviation <= 0) warnings.push(`${indicator} standart sapması sıfırdan büyük olmalıdır.`);
  if (reference.sampleSize !== null && (!Number.isInteger(reference.sampleSize) || reference.sampleSize <= 0)) warnings.push(`${indicator} örneklem büyüklüğü geçersiz.`);
  return { valid: warnings.length === 0, ready: warnings.length === 0, warnings };
};

export const calculateReferenceReadiness = (
  referenceSet: TheNormalizationReferenceSet,
): TheReferenceReadiness => {
  const validations = THE_NORMALIZED_RAW_INDICATOR_CODES.map((indicator) => ({
    indicator,
    validation: validateNormalizationReference(indicator, referenceSet.indicators[indicator]),
  }));
  const readyIndicators = validations.filter(({ validation }) => validation.ready).map(({ indicator }) => indicator);
  const missingIndicators = validations.filter(({ validation }) => !validation.ready).map(({ indicator }) => indicator);
  return {
    requiredCount: validations.length,
    readyCount: readyIndicators.length,
    missingCount: missingIndicators.length,
    readyIndicators,
    missingIndicators,
    warnings: validations.flatMap(({ validation }) => validation.warnings),
    complete: missingIndicators.length === 0,
  };
};

export const theNormalizationReferenceSet = loadNormalizationReferenceSet(rawReferenceSet);
export const theNormalizationReferenceReadiness = calculateReferenceReadiness(theNormalizationReferenceSet);

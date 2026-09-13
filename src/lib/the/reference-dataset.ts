import rawReferenceDataset from "../../data/the/reference/the-2026-reference-dataset.json" with { type: "json" };
import type { TheCategoryScores } from "@/src/types/the-calculation";
import type {
  TheReferenceDataset,
  TheReferenceDatasetManifest,
  TheReferenceDatasetSummary,
  TheReferenceDatasetValidationResult,
  TheReferenceInstitutionRecord,
  TheReferenceSourceType,
} from "@/src/types/the-reference-dataset";

export const THE_REFERENCE_CATEGORY_KEYS = [
  "teaching",
  "researchEnvironment",
  "researchQuality",
  "internationalOutlook",
  "industry",
] as const satisfies readonly (keyof TheCategoryScores)[];

const SOURCE_TYPES = [
  "the-public",
  "the-licensed",
  "manual-verified",
] as const satisfies readonly TheReferenceSourceType[];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isNullableNonEmptyString = (value: unknown): value is string | null =>
  value === null || isNonEmptyString(value);

const isScore = (value: unknown): value is number | null =>
  value === null ||
  (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100);

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 1;

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0;

const isSourceType = (value: unknown): value is TheReferenceSourceType =>
  typeof value === "string" && SOURCE_TYPES.some((sourceType) => sourceType === value);

const parseRecord = (
  value: unknown,
  path: string,
): { record: TheReferenceInstitutionRecord | null; errors: string[] } => {
  if (!isObject(value)) {
    return { record: null, errors: [`${path} must be an object`] };
  }

  const errors: string[] = [];
  if (!isNonEmptyString(value.id)) errors.push(`${path}.id must be a non-empty string`);
  if (!isNonEmptyString(value.universityName)) errors.push(`${path}.universityName must be a non-empty string`);
  if (!isNullableNonEmptyString(value.countryCode)) errors.push(`${path}.countryCode must be null or a non-empty string`);
  if (!isPositiveInteger(value.methodologyYear)) errors.push(`${path}.methodologyYear must be a positive integer`);

  const rawCategoryScores = value.categoryScores;
  const categoryScores: Partial<TheCategoryScores> = {};
  if (!isObject(rawCategoryScores)) {
    errors.push(`${path}.categoryScores must be an object`);
  } else {
    for (const key of THE_REFERENCE_CATEGORY_KEYS) {
      const score = rawCategoryScores[key];
      if (!isScore(score)) {
        errors.push(`${path}.categoryScores.${key} must be null or between 0 and 100`);
      } else {
        categoryScores[key] = score;
      }
    }
  }

  if (!isScore(value.overallScore)) errors.push(`${path}.overallScore must be null or between 0 and 100`);
  if (value.rank !== null && !isPositiveInteger(value.rank)) errors.push(`${path}.rank must be null or an integer greater than or equal to 1`);
  if (!isNullableNonEmptyString(value.rankBand)) errors.push(`${path}.rankBand must be null or a non-empty string`);
  if (!isSourceType(value.sourceType)) errors.push(`${path}.sourceType is invalid`);
  if (!isNullableNonEmptyString(value.sourceNote)) errors.push(`${path}.sourceNote must be null or a non-empty string`);

  if (
    errors.length > 0 ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.universityName) ||
    !isNullableNonEmptyString(value.countryCode) ||
    !isPositiveInteger(value.methodologyYear) ||
    !isObject(rawCategoryScores) ||
    !isScore(categoryScores.teaching) ||
    !isScore(categoryScores.researchEnvironment) ||
    !isScore(categoryScores.researchQuality) ||
    !isScore(categoryScores.internationalOutlook) ||
    !isScore(categoryScores.industry) ||
    !isScore(value.overallScore) ||
    (value.rank !== null && !isPositiveInteger(value.rank)) ||
    !isNullableNonEmptyString(value.rankBand) ||
    !isSourceType(value.sourceType) ||
    !isNullableNonEmptyString(value.sourceNote)
  ) {
    return { record: null, errors };
  }

  return {
    record: {
      id: value.id,
      universityName: value.universityName,
      countryCode: value.countryCode,
      methodologyYear: value.methodologyYear,
      categoryScores: {
        teaching: categoryScores.teaching,
        researchEnvironment: categoryScores.researchEnvironment,
        researchQuality: categoryScores.researchQuality,
        internationalOutlook: categoryScores.internationalOutlook,
        industry: categoryScores.industry,
      },
      overallScore: value.overallScore,
      rank: value.rank,
      rankBand: value.rankBand,
      sourceType: value.sourceType,
      sourceNote: value.sourceNote,
    },
    errors: [],
  };
};

const parseManifest = (
  value: unknown,
): { manifest: TheReferenceDatasetManifest | null; errors: string[] } => {
  if (!isObject(value)) {
    return { manifest: null, errors: ["manifest must be an object"] };
  }

  const errors: string[] = [];
  if (!isNonEmptyString(value.datasetId)) errors.push("manifest.datasetId must be a non-empty string");
  if (value.methodology !== "the") errors.push('manifest.methodology must be "the"');
  if (!isPositiveInteger(value.methodologyYear)) errors.push("manifest.methodologyYear must be a positive integer");
  if (!isNonEmptyString(value.version)) errors.push("manifest.version must be a non-empty string");
  if (!isNullableNonEmptyString(value.updatedAt)) errors.push("manifest.updatedAt must be null or a non-empty string");
  if (!isNonNegativeInteger(value.recordCount)) errors.push("manifest.recordCount must be a non-negative integer");
  if (!isNonEmptyString(value.description)) errors.push("manifest.description must be a non-empty string");
  if (!isNonEmptyString(value.sourceSummary)) errors.push("manifest.sourceSummary must be a non-empty string");
  if (!Array.isArray(value.warnings) || !value.warnings.every(isNonEmptyString)) {
    errors.push("manifest.warnings must be an array of non-empty strings");
  }

  if (
    errors.length > 0 ||
    !isNonEmptyString(value.datasetId) ||
    value.methodology !== "the" ||
    !isPositiveInteger(value.methodologyYear) ||
    !isNonEmptyString(value.version) ||
    !isNullableNonEmptyString(value.updatedAt) ||
    !isNonNegativeInteger(value.recordCount) ||
    !isNonEmptyString(value.description) ||
    !isNonEmptyString(value.sourceSummary) ||
    !Array.isArray(value.warnings) ||
    !value.warnings.every(isNonEmptyString)
  ) {
    return { manifest: null, errors };
  }

  return {
    manifest: {
      datasetId: value.datasetId,
      methodology: value.methodology,
      methodologyYear: value.methodologyYear,
      version: value.version,
      updatedAt: value.updatedAt,
      recordCount: value.recordCount,
      description: value.description,
      sourceSummary: value.sourceSummary,
      warnings: [...value.warnings],
    },
    errors: [],
  };
};

export function validateTheReferenceRecord(
  value: unknown,
): TheReferenceInstitutionRecord | null {
  return parseRecord(value, "record").record;
}

export function validateTheReferenceDataset(
  value: unknown,
): TheReferenceDatasetValidationResult {
  if (!isObject(value)) {
    return { valid: false, dataset: null, errors: ["dataset must be an object"], warnings: [] };
  }

  const manifestResult = parseManifest(value.manifest);
  const errors = [...manifestResult.errors];
  const records: TheReferenceInstitutionRecord[] = [];

  if (!Array.isArray(value.records)) {
    errors.push("records must be an array");
  } else {
    value.records.forEach((recordValue, index) => {
      const result = parseRecord(recordValue, `records[${index}]`);
      errors.push(...result.errors);
      if (result.record) records.push(result.record);
    });
  }

  const manifest = manifestResult.manifest;
  if (manifest && Array.isArray(value.records)) {
    if (manifest.recordCount !== value.records.length) {
      errors.push(`manifest.recordCount (${manifest.recordCount}) must equal records.length (${value.records.length})`);
    }

    const recordIds = new Set<string>();
    records.forEach((record, index) => {
      if (recordIds.has(record.id)) errors.push(`records[${index}].id "${record.id}" is duplicated`);
      recordIds.add(record.id);
      if (record.methodologyYear !== manifest.methodologyYear) {
        errors.push(
          `records[${index}].methodologyYear (${record.methodologyYear}) must match manifest.methodologyYear (${manifest.methodologyYear})`,
        );
      }
    });
  }

  if (!manifest || errors.length > 0) {
    return { valid: false, dataset: null, errors, warnings: manifest?.warnings ?? [] };
  }

  return {
    valid: true,
    dataset: { manifest, records },
    errors: [],
    warnings: [...manifest.warnings],
  };
}

export function loadTheReferenceDataset(): TheReferenceDataset {
  const result = validateTheReferenceDataset(rawReferenceDataset);
  if (!result.valid || !result.dataset) {
    throw new Error(`THE reference dataset is invalid: ${result.errors.join("; ")}`);
  }
  return result.dataset;
}

export function summarizeTheReferenceDataset(
  dataset: TheReferenceDataset,
): TheReferenceDatasetSummary {
  const availableRankBands = new Set<string>();
  let recordsWithOverallScore = 0;
  let recordsWithRank = 0;
  let recordsWithRankBand = 0;
  let recordsWithCompleteCategoryScores = 0;

  for (const record of dataset.records) {
    if (record.overallScore !== null) recordsWithOverallScore += 1;
    if (record.rank !== null) recordsWithRank += 1;
    if (record.rankBand !== null) {
      recordsWithRankBand += 1;
      availableRankBands.add(record.rankBand);
    }
    if (THE_REFERENCE_CATEGORY_KEYS.every((key) => record.categoryScores[key] !== null)) {
      recordsWithCompleteCategoryScores += 1;
    }
  }

  return {
    recordCount: dataset.records.length,
    recordsWithOverallScore,
    recordsWithRank,
    recordsWithRankBand,
    recordsWithCompleteCategoryScores,
    availableRankBands: [...availableRankBands],
  };
}

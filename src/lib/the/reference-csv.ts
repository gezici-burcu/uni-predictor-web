import {
  validateTheReferenceDataset,
  validateTheReferenceRecord,
} from "./reference-dataset.ts";
import type {
  TheReferenceCsvParseResult,
  TheReferenceCsvRowResult,
  TheReferenceDataset,
  TheReferenceImportResult,
  TheReferenceInstitutionRecord,
} from "../../types/the-reference-dataset.ts";

export const THE_REFERENCE_CSV_HEADERS = [
  "id",
  "universityName",
  "countryCode",
  "methodologyYear",
  "teaching",
  "researchEnvironment",
  "researchQuality",
  "internationalOutlook",
  "industry",
  "overallScore",
  "rank",
  "rankBand",
  "sourceType",
  "sourceNote",
] as const;

type CsvRow = Record<(typeof THE_REFERENCE_CSV_HEADERS)[number], string>;

type CsvMatrixResult = {
  rows: Array<{ cells: string[]; rowNumber: number }>;
  errors: string[];
};

const parseCsvMatrix = (csvText: string): CsvMatrixResult => {
  const rows: CsvMatrixResult["rows"] = [];
  const errors: string[] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let rowNumber = 1;
  let rowStart = 1;

  const finishRow = () => {
    cells.push(cell);
    if (!cells.every((value) => value.trim() === "")) {
      rows.push({ cells, rowNumber: rowStart });
    }
    cells = [];
    cell = "";
  };

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];

    if (character === '"') {
      if (inQuotes && csvText[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      cells.push(cell);
      cell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      finishRow();
      if (character === "\r" && csvText[index + 1] === "\n") index += 1;
      rowNumber += 1;
      rowStart = rowNumber;
      continue;
    }

    if (character === "\n") rowNumber += 1;
    cell += character;
  }

  if (inQuotes) errors.push(`Row ${rowStart}: quoted field is not closed`);
  if (cell.length > 0 || cells.length > 0) finishRow();

  return { rows, errors };
};

const parseNullableNumber = (
  value: string,
  field: string,
  rowNumber: number,
  errors: string[],
): number | null => {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    errors.push(`Row ${rowNumber}: ${field} must be a finite number`);
    return null;
  }
  return parsed;
};

const parseRequiredYear = (
  value: string,
  rowNumber: number,
  errors: string[],
): number => {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed !== 2026) {
    errors.push(`Row ${rowNumber}: methodologyYear must be 2026`);
  }
  return parsed;
};

export function convertTheReferenceCsvRow(
  row: Record<string, string>,
  rowNumber: number,
): TheReferenceCsvRowResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const id = (row.id ?? "").trim();
  const universityName = (row.universityName ?? "").trim();
  const countryCode = (row.countryCode ?? "").trim() || null;
  const rankBand = (row.rankBand ?? "").trim() || null;
  const sourceNote = (row.sourceNote ?? "").trim() || null;

  if (id === "") errors.push(`Row ${rowNumber}: id must not be empty`);
  if (universityName === "") errors.push(`Row ${rowNumber}: universityName must not be empty`);

  const teaching = parseNullableNumber(row.teaching ?? "", "teaching", rowNumber, errors);
  const researchEnvironment = parseNullableNumber(row.researchEnvironment ?? "", "researchEnvironment", rowNumber, errors);
  const researchQuality = parseNullableNumber(row.researchQuality ?? "", "researchQuality", rowNumber, errors);
  const internationalOutlook = parseNullableNumber(row.internationalOutlook ?? "", "internationalOutlook", rowNumber, errors);
  const industry = parseNullableNumber(row.industry ?? "", "industry", rowNumber, errors);
  const overallScore = parseNullableNumber(row.overallScore ?? "", "overallScore", rowNumber, errors);
  const rank = parseNullableNumber(row.rank ?? "", "rank", rowNumber, errors);
  const methodologyYear = parseRequiredYear(row.methodologyYear ?? "", rowNumber, errors);
  const sourceType = (row.sourceType ?? "").trim();

  if (overallScore === null) warnings.push(`Row ${rowNumber}: overallScore is empty`);
  if (rank === null && rankBand === null) warnings.push(`Row ${rowNumber}: both rank and rankBand are empty`);
  if ([teaching, researchEnvironment, researchQuality, internationalOutlook, industry].some((score) => score === null)) {
    warnings.push(`Row ${rowNumber}: one or more category scores are empty`);
  }
  if (countryCode === null) warnings.push(`Row ${rowNumber}: countryCode is empty`);
  if (sourceNote === null) warnings.push(`Row ${rowNumber}: sourceNote is empty`);

  const candidate = {
    id,
    universityName,
    countryCode,
    methodologyYear,
    categoryScores: {
      teaching,
      researchEnvironment,
      researchQuality,
      internationalOutlook,
      industry,
    },
    overallScore,
    rank,
    rankBand,
    sourceType,
    sourceNote,
  };
  const record = validateTheReferenceRecord(candidate);

  if (!record && errors.length === 0) {
    errors.push(`Row ${rowNumber}: record does not match the THE reference dataset model`);
  }

  return { record: errors.length === 0 ? record : null, errors, warnings };
}

export function parseTheReferenceCsv(csvText: string): TheReferenceCsvParseResult {
  const matrix = parseCsvMatrix(csvText.replace(/^\uFEFF/, ""));
  const errors = [...matrix.errors];
  const warnings: string[] = [];
  const records: TheReferenceInstitutionRecord[] = [];
  const headerRow = matrix.rows[0];

  if (!headerRow) {
    return { records: [], errors: ["Row 1: CSV header is missing"], warnings: [] };
  }

  const headers = headerRow.cells.map((header) => header.trim());
  const missingHeaders = THE_REFERENCE_CSV_HEADERS.filter((header) => !headers.includes(header));
  const unexpectedHeaders = headers.filter(
    (header) => !THE_REFERENCE_CSV_HEADERS.some((expected) => expected === header),
  );
  if (missingHeaders.length > 0) errors.push(`Row ${headerRow.rowNumber}: missing CSV headers: ${missingHeaders.join(", ")}`);
  if (unexpectedHeaders.length > 0) errors.push(`Row ${headerRow.rowNumber}: unexpected CSV headers: ${unexpectedHeaders.join(", ")}`);
  if (
    headers.length !== THE_REFERENCE_CSV_HEADERS.length ||
    THE_REFERENCE_CSV_HEADERS.some((header, index) => headers[index] !== header)
  ) {
    errors.push(`Row ${headerRow.rowNumber}: CSV headers must match the required column order`);
  }
  if (errors.length > 0) return { records: [], errors, warnings };

  for (const rawRow of matrix.rows.slice(1)) {
    if (rawRow.cells.length !== THE_REFERENCE_CSV_HEADERS.length) {
      errors.push(
        `Row ${rawRow.rowNumber}: expected ${THE_REFERENCE_CSV_HEADERS.length} columns but found ${rawRow.cells.length}`,
      );
      continue;
    }

    const row = Object.fromEntries(
      THE_REFERENCE_CSV_HEADERS.map((header, index) => [header, rawRow.cells[index] ?? ""]),
    ) as CsvRow;
    const result = convertTheReferenceCsvRow(row, rawRow.rowNumber);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    if (result.record) records.push(result.record);
  }

  const firstRowById = new Map<string, number>();
  records.forEach((record, index) => {
    const sourceRowNumber = matrix.rows[index + 1]?.rowNumber ?? index + 2;
    const firstRow = firstRowById.get(record.id);
    if (firstRow !== undefined) {
      errors.push(`Row ${sourceRowNumber}: duplicate id "${record.id}" also appears on Row ${firstRow}`);
    } else {
      firstRowById.set(record.id, sourceRowNumber);
    }
  });

  return { records, errors, warnings };
}

const updateManifestWarnings = (
  currentWarnings: string[],
  importWarnings: string[],
  totalRecordCount: number,
): string[] => {
  const warnings = currentWarnings.filter(
    (warning) => totalRecordCount === 0 || warning !== "Bu veri seti henüz boş durumdadır.",
  );
  if (importWarnings.length > 0) {
    warnings.push(`Son CSV içe aktarmasında ${importWarnings.length} veri kalitesi uyarısı oluştu.`);
  }
  return [...new Set(warnings)];
};

export function prepareTheReferenceDatasetImport({
  csvText,
  currentDataset,
  now,
}: {
  csvText: string;
  currentDataset: TheReferenceDataset;
  now: Date;
}): TheReferenceImportResult {
  const currentValidation = validateTheReferenceDataset(currentDataset);
  if (!currentValidation.valid || !currentValidation.dataset) {
    return {
      success: false,
      importedRecordCount: 0,
      totalRecordCount: currentDataset.records.length,
      dataset: null,
      errors: currentValidation.errors,
      warnings: currentValidation.warnings,
      wroteDataset: false,
    };
  }

  const parsed = parseTheReferenceCsv(csvText);
  const errors = [...parsed.errors];
  const existingIds = new Set(currentValidation.dataset.records.map((record) => record.id));
  for (const record of parsed.records) {
    if (existingIds.has(record.id)) {
      errors.push(`Duplicate record id already exists in dataset: ${record.id}`);
    }
    if (record.methodologyYear !== currentValidation.dataset.manifest.methodologyYear) {
      errors.push(
        `Record ${record.id} methodologyYear must match dataset methodologyYear ${currentValidation.dataset.manifest.methodologyYear}`,
      );
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      importedRecordCount: 0,
      totalRecordCount: currentValidation.dataset.records.length,
      dataset: null,
      errors,
      warnings: parsed.warnings,
      wroteDataset: false,
    };
  }

  const records = [...currentValidation.dataset.records, ...parsed.records].sort(
    (left, right) =>
      left.universityName.localeCompare(right.universityName, "en", { sensitivity: "base" }) ||
      left.id.localeCompare(right.id, "en"),
  );
  const dataset: TheReferenceDataset = {
    manifest: {
      ...currentValidation.dataset.manifest,
      updatedAt: now.toISOString(),
      recordCount: records.length,
      sourceSummary: `${currentValidation.dataset.manifest.sourceSummary} Yerel CSV içe aktarmasıyla ${parsed.records.length} doğrulanmış kayıt eklendi.`,
      warnings: updateManifestWarnings(
        currentValidation.dataset.manifest.warnings,
        parsed.warnings,
        records.length,
      ),
    },
    records,
  };
  const finalValidation = validateTheReferenceDataset(dataset);
  if (!finalValidation.valid || !finalValidation.dataset) {
    return {
      success: false,
      importedRecordCount: 0,
      totalRecordCount: currentValidation.dataset.records.length,
      dataset: null,
      errors: finalValidation.errors,
      warnings: parsed.warnings,
      wroteDataset: false,
    };
  }

  return {
    success: true,
    importedRecordCount: parsed.records.length,
    totalRecordCount: records.length,
    dataset: finalValidation.dataset,
    errors: [],
    warnings: parsed.warnings,
    wroteDataset: false,
  };
}

export function runTheReferenceDatasetImport({
  csvText,
  currentDataset,
  dryRun,
  now,
  writeDataset,
}: {
  csvText: string;
  currentDataset: TheReferenceDataset;
  dryRun: boolean;
  now: Date;
  writeDataset: (dataset: TheReferenceDataset) => void;
}): TheReferenceImportResult {
  const result = prepareTheReferenceDatasetImport({ csvText, currentDataset, now });
  if (!result.success || !result.dataset || dryRun) return result;

  writeDataset(result.dataset);
  return { ...result, wroteDataset: true };
}

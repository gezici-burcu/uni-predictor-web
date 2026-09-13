import { qsInstitutionalCountRows } from "@/src/types/qsInstitutional";
import type {
  QsCountInput,
  QsInstitutionalInputByRowId,
} from "@/src/types/qsInstitutional";
import { validateQsActiveScenarioConsistency } from "./validate-qs-active-scenario";

export type QsInstitutionalYearValues = Partial<QsInstitutionalInputByRowId>;
export type QsInstitutionalNumberInput = string | number | null | undefined;

export class QsInstitutionalValidationError extends Error {
  readonly field: string;
  readonly reason:
    | "not-finite"
    | "negative"
    | "not-integer"
    | "out-of-range"
    | "subset-limit";

  constructor(
    field: string,
    reason:
      | "not-finite"
      | "negative"
      | "not-integer"
      | "out-of-range"
      | "subset-limit",
  ) {
    super(`${field}: ${reason}`);
    this.field = field;
    this.reason = reason;
    this.name = "QsInstitutionalValidationError";
  }
}

export type QsAcademicStaffSubsetFieldId =
  | "maleAcademicStaff"
  | "femaleAcademicStaff"
  | "otherAcademicStaff"
  | "internationalAcademicStaff";

export type QsAcademicStaffSubsetValidationError = {
  fieldId: QsAcademicStaffSubsetFieldId;
  inputPart: keyof QsCountInput;
  message: string;
};

const QS_ACADEMIC_STAFF_SUBSET_LABELS: Record<
  QsAcademicStaffSubsetFieldId,
  string
> = {
  maleAcademicStaff: "Erkek akademik personel",
  femaleAcademicStaff: "Kadın akademik personel",
  otherAcademicStaff: "Diğer akademik personel",
  internationalAcademicStaff: "Uluslararası akademik personel",
};

const QS_ACADEMIC_STAFF_SUBSET_FIELD_IDS =
  Object.keys(QS_ACADEMIC_STAFF_SUBSET_LABELS) as QsAcademicStaffSubsetFieldId[];

export function validateQsAcademicStaffSubsetLimits(
  values: QsInstitutionalYearValues,
): QsAcademicStaffSubsetValidationError[] {
  const total = values.academicStaff as Partial<QsCountInput> | undefined;

  return QS_ACADEMIC_STAFF_SUBSET_FIELD_IDS.flatMap((fieldId) => {
    const subset = values[fieldId] as Partial<QsCountInput> | undefined;

    return (["fullTime", "partTime"] as const).flatMap((inputPart) => {
      const totalValue = total?.[inputPart];
      const subsetValue = subset?.[inputPart];
      if (
        totalValue === null ||
        totalValue === undefined ||
        subsetValue === null ||
        subsetValue === undefined ||
        !Number.isFinite(totalValue) ||
        !Number.isFinite(subsetValue) ||
        subsetValue <= totalValue
      ) {
        return [];
      }

      const partLabel = inputPart === "fullTime" ? "Full-Time" : "Part-Time";
      return [{
        fieldId,
        inputPart,
        message:
          `${QS_ACADEMIC_STAFF_SUBSET_LABELS[fieldId]} ${partLabel} değeri, ` +
          `toplam akademik personel ${partLabel} değerinden büyük olamaz.`,
      }];
    });
  });
}

export function getQsAcademicStaffSubsetErrorMap(
  values: QsInstitutionalYearValues,
) {
  return Object.fromEntries(
    validateQsAcademicStaffSubsetLimits(values).map((error) => [
      `${error.fieldId}.${error.inputPart}`,
      error.message,
    ]),
  ) as Partial<Record<
    `${QsAcademicStaffSubsetFieldId}.${keyof QsCountInput}`,
    string
  >>;
}

export type QsUndergraduateSubsetFieldId =
  | "undergraduateInternationalStudents"
  | "undergraduateExchangeStudentsInbound"
  | "undergraduateExchangeStudentsOutbound";

export type QsUndergraduateSubsetValidationError = {
  fieldId: QsUndergraduateSubsetFieldId;
  inputPart: keyof QsCountInput;
  message: string;
};

const QS_UNDERGRADUATE_SUBSET_LABELS: Record<
  QsUndergraduateSubsetFieldId,
  string
> = {
  undergraduateInternationalStudents: "Uluslararası lisans öğrencilerinin",
  undergraduateExchangeStudentsInbound: "Gelen lisans değişim öğrencilerinin",
  undergraduateExchangeStudentsOutbound: "Giden lisans değişim öğrencilerinin",
};

const QS_UNDERGRADUATE_SUBSET_FIELD_IDS =
  Object.keys(QS_UNDERGRADUATE_SUBSET_LABELS) as QsUndergraduateSubsetFieldId[];

export function validateQsUndergraduateSubsetLimits(
  values: QsInstitutionalYearValues,
): QsUndergraduateSubsetValidationError[] {
  const total = values.undergraduateStudents as Partial<QsCountInput> | undefined;

  return QS_UNDERGRADUATE_SUBSET_FIELD_IDS.flatMap((fieldId) => {
    const subset = values[fieldId] as Partial<QsCountInput> | undefined;

    return (["fullTime", "partTime"] as const).flatMap((inputPart) => {
      const totalValue = total?.[inputPart];
      const subsetValue = subset?.[inputPart];
      if (
        totalValue === null ||
        totalValue === undefined ||
        subsetValue === null ||
        subsetValue === undefined ||
        !Number.isFinite(totalValue) ||
        !Number.isFinite(subsetValue) ||
        subsetValue <= totalValue
      ) {
        return [];
      }

      const partLabel = inputPart === "fullTime" ? "Full-Time" : "Part-Time";
      return [{
        fieldId,
        inputPart,
        message:
          `${QS_UNDERGRADUATE_SUBSET_LABELS[fieldId]} ${partLabel} değeri, ` +
          `toplam lisans öğrencilerinin ${partLabel} değerinden büyük olamaz.`,
      }];
    });
  });
}

export function getQsUndergraduateSubsetErrorMap(
  values: QsInstitutionalYearValues,
) {
  return Object.fromEntries(
    validateQsUndergraduateSubsetLimits(values).map((error) => [
      `${error.fieldId}.${error.inputPart}`,
      error.message,
    ]),
  ) as Partial<Record<
    `${QsUndergraduateSubsetFieldId}.${keyof QsCountInput}`,
    string
  >>;
}

const parseFiniteNumber = (
  input: QsInstitutionalNumberInput,
  field: string,
): number => {
  if (input === null || input === undefined) return 0;
  const text = typeof input === "string" ? input.trim() : input;
  if (text === "") return 0;
  const parsed = typeof text === "number" ? text : Number(text.replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new QsInstitutionalValidationError(field, "not-finite");
  }
  return parsed;
};

export function parseQsInstitutionalDraftNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function normalizeQsInstitutionalNumber(
  input: QsInstitutionalNumberInput,
  field = "value",
): number {
  return parseFiniteNumber(input, field);
}

const validateNonNegative = (value: number, field: string) => {
  if (value < 0) throw new QsInstitutionalValidationError(field, "negative");
};

const validateInteger = (value: number, field: string) => {
  if (!Number.isInteger(value)) {
    throw new QsInstitutionalValidationError(field, "not-integer");
  }
};

export function normalizeQsInstitutionalPair(input: {
  fullTime?: QsInstitutionalNumberInput;
  partTime?: QsInstitutionalNumberInput;
}): QsCountInput {
  const fullTime = normalizeQsInstitutionalNumber(input.fullTime, "fullTime");
  const partTime = normalizeQsInstitutionalNumber(input.partTime, "partTime");
  validateNonNegative(fullTime, "fullTime");
  validateNonNegative(partTime, "partTime");
  validateInteger(fullTime, "fullTime");
  validateInteger(partTime, "partTime");
  return { fullTime, partTime };
}

export function normalizeQsInstitutionalYearData(
  values: QsInstitutionalYearValues,
): QsInstitutionalInputByRowId {
  return Object.fromEntries(qsInstitutionalCountRows.map((row) => {
    const input = values[row.id];
    if (row.inputKind === "fte-count") {
      return [
        row.id,
        normalizeQsInstitutionalPair(
          (input as Partial<QsCountInput> | undefined) ?? {},
        ),
      ];
    }

    const rawValue = (input as { value?: QsInstitutionalNumberInput } | undefined)?.value;
    if (rawValue === null || rawValue === undefined ||
      typeof rawValue === "string" && rawValue.trim() === "") {
      return [row.id, { value: null }];
    }
    const value = normalizeQsInstitutionalNumber(rawValue, `${row.id}.value`);
    validateNonNegative(value, `${row.id}.value`);
    validateInteger(value, `${row.id}.value`);
    return [row.id, { value }];
  })) as QsInstitutionalInputByRowId;
}

export function validateQsInstitutionalYearData(values: QsInstitutionalYearValues) {
  const [subsetError] = [
    ...validateQsAcademicStaffSubsetLimits(values),
    ...validateQsUndergraduateSubsetLimits(values),
  ];
  if (subsetError) {
    return {
      valid: false as const,
      values: null,
      error: new QsInstitutionalValidationError(
        `${subsetError.fieldId}.${subsetError.inputPart}`,
        "subset-limit",
      ),
      issues: [subsetError.message],
      fieldErrors: { [subsetError.fieldId]: subsetError.message },
    };
  }

  try {
    const normalizedValues = normalizeQsInstitutionalYearData(values);
    const consistency = validateQsActiveScenarioConsistency(normalizedValues);
    if (!consistency.isValid) {
      const firstIssue = consistency.errors[0]!;
      return {
        valid: false as const,
        values: null,
        error: new QsInstitutionalValidationError(`${firstIssue.fieldId}.${firstIssue.part}`, "subset-limit"),
        issues: consistency.errors.map((issue) => issue.message),
        fieldErrors: Object.fromEntries(consistency.errors.map((issue) => [issue.fieldId, issue.message])),
      };
    }
    return { valid: true as const, values: normalizedValues, error: null, issues: [] as string[], fieldErrors: {} as Record<string, string> };
  } catch (error) {
    return {
      valid: false as const,
      values: null,
      error: error instanceof QsInstitutionalValidationError
        ? error
        : new QsInstitutionalValidationError("unknown", "not-finite"),
      issues: ["Geçerli, negatif olmayan tam sayılar girilmelidir."],
      fieldErrors: { unknown: "Geçerli, negatif olmayan tam sayılar girilmelidir." },
    };
  }
}

import type { TheInstitutionData } from "@/src/data/data-entry/the-institution-data";
import { THE_INSTITUTION_DATA_FIELDS } from "@/src/config/data-entry/the-institution-fields";
import type { TheMetricValues } from "@/src/types/the";

export type TheSubsetFieldId =
  | "internationalAcademicStaffFte"
  | "femaleAcademicStaffFte"
  | "internationalStudentsFte"
  | "femaleStudentsFte"
  | "bachelorsStudentsFte"
  | "mastersStudentsFte"
  | "doctorateStudentsFte";

export type TheSubsetValidationError = {
  fieldId: TheSubsetFieldId;
  totalFieldId: keyof TheInstitutionData;
  value: number;
  totalValue: number;
  message: string;
};

const THE_INSTITUTION_FIELD_LABELS = new Map(
  THE_INSTITUTION_DATA_FIELDS.map((field) => [field.id, field.label.tr]),
);

const formatValidationValue = (value: number) => new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 20,
}).format(value);

function createSubsetLimitMessage(
  fieldId: TheSubsetFieldId,
  value: number,
  totalFieldId: keyof TheInstitutionData,
  totalValue: number,
) {
  return `${THE_INSTITUTION_FIELD_LABELS.get(fieldId) ?? fieldId} (${formatValidationValue(value)}), ${THE_INSTITUTION_FIELD_LABELS.get(totalFieldId) ?? totalFieldId} (${formatValidationValue(totalValue)}) değerini aşamaz.`;
}

export const THE_SUBSET_LIMITS = [
  {
    fieldId: "internationalAcademicStaffFte",
    totalFieldId: "academicStaffFte",
    message: "Uluslararası akademik personel sayısı toplam akademik personel sayısını aşamaz.",
  },
  {
    fieldId: "femaleAcademicStaffFte",
    totalFieldId: "academicStaffFte",
    message: "Kadın akademik personel sayısı, toplam akademik personel sayısından büyük olamaz.",
  },
  {
    fieldId: "internationalStudentsFte",
    totalFieldId: "studentsFte",
    message: "Uluslararası öğrenci sayısı toplam öğrenci sayısını aşamaz.",
  },
  {
    fieldId: "femaleStudentsFte",
    totalFieldId: "studentsFte",
    message: "Kadın öğrenci sayısı, toplam öğrenci sayısından büyük olamaz.",
  },
  {
    fieldId: "bachelorsStudentsFte",
    totalFieldId: "studentsFte",
    message: "Lisans öğrencisi sayısı, toplam öğrenci sayısından büyük olamaz.",
  },
  {
    fieldId: "mastersStudentsFte",
    totalFieldId: "studentsFte",
    message: "Yüksek lisans öğrencisi sayısı, toplam öğrenci sayısından büyük olamaz.",
  },
  {
    fieldId: "doctorateStudentsFte",
    totalFieldId: "studentsFte",
    message: "Doktora öğrencisi sayısı, toplam öğrenci sayısından büyük olamaz.",
  },
] as const satisfies readonly {
  fieldId: TheSubsetFieldId;
  totalFieldId: keyof TheInstitutionData;
  message: string;
}[];

export function validateTheSubsetLimits(
  values: Partial<Record<keyof TheInstitutionData, number | null>>,
): TheSubsetValidationError[] {
  return THE_SUBSET_LIMITS.flatMap((rule) => {
    const total = values[rule.totalFieldId];
    const subset = values[rule.fieldId];
    if (total === null || total === undefined || subset === null || subset === undefined) {
      return [];
    }
    return subset > total
      ? [{
          fieldId: rule.fieldId,
          totalFieldId: rule.totalFieldId,
          value: subset,
          totalValue: total,
          message: createSubsetLimitMessage(rule.fieldId, subset, rule.totalFieldId, total),
        }]
      : [];
  });
}

function validInstitutionField(value: number | null, field: typeof THE_INSTITUTION_DATA_FIELDS[number]) {
  return value === null
    ? !field.required
    : Number.isFinite(value) && value >= field.minimum &&
        (field.inputType === "currency" || Number.isInteger(value));
}

export function validateTheInstitutionData(values: TheInstitutionData) {
  const errors: Partial<Record<keyof TheInstitutionData, string>> = {};
  for (const field of THE_INSTITUTION_DATA_FIELDS) {
    if (!validInstitutionField(values[field.id], field)) {
      errors[field.id] = `${field.label.tr}: geçerli bir değer girilmelidir.`;
    }
  }
  for (const { fieldId, message } of validateTheSubsetLimits(values)) errors[fieldId] = message;
  return errors;
}

export function getTheSubsetValidationErrorMap(
  values: Partial<Record<keyof TheInstitutionData, number | null>>,
) {
  return Object.fromEntries(
    validateTheSubsetLimits(values).map(({ fieldId, message }) => [fieldId, message]),
  ) as Partial<Record<TheSubsetFieldId, string>>;
}

const INTEGER_SCENARIO_PARAMETER_IDS = new Set([
  "the.common.academicStaffFte", "the.common.studentsFte",
  "the.internationalOutlook.internationalAcademicStaffFte",
  "the.internationalOutlook.internationalStudentsFte",
  "the.teaching.bachelorGraduates", "the.teaching.doctorateGraduates",
  "the.researchEnvironment.academicResearchStaffFte",
  "the.researchEnvironment.publicationCount",
  "the.researchQuality.researchExcellenceScore",
  "the.internationalOutlook.internationalCoauthoredPublications",
  "the.industry.citingPatentCount",
]);

export function validateTheScenarioMetricValues(values: TheMetricValues) {
  const errors: Record<string, string> = {};
  for (const [parameterId, value] of Object.entries(values)) {
    if (!Number.isFinite(value)) errors[parameterId] = "Geçerli bir sayı girilmelidir.";
    else if (value < 0) errors[parameterId] = "Değer negatif olamaz.";
    else if (INTEGER_SCENARIO_PARAMETER_IDS.has(parameterId) && !Number.isInteger(value)) errors[parameterId] = "Tam sayı girilmelidir.";
  }
  return errors;
}

export function getTheEffectiveScenarioValue(
  override: number | null | undefined,
  baseline: number | null | undefined,
): number | null {
  if (typeof override === "number" && Number.isFinite(override)) return override;
  if (typeof baseline === "number" && Number.isFinite(baseline)) return baseline;
  return null;
}

export function createTheScenarioMetricValidationValues(
  effectiveValues: TheMetricValues,
  overrides: Record<string, number | null | undefined>,
  heldAtReferenceParameterIds: ReadonlySet<string>,
): TheMetricValues {
  return Object.fromEntries(Object.entries(effectiveValues).flatMap(([parameterId, value]) => {
    if (!heldAtReferenceParameterIds.has(parameterId)) return [[parameterId, value]];
    const override = overrides[parameterId];
    return Object.prototype.hasOwnProperty.call(overrides, parameterId) &&
      typeof override === "number"
      ? [[parameterId, override]]
      : [];
  }));
}

export function validateThePublicationCountRange(value: number, baseline: number | null) {
  if (!Number.isFinite(value) || baseline === null || !Number.isFinite(baseline) || baseline <= 0) return null;
  return value > baseline * 2 ? `Değer ${baseline * 2} değerini aşamaz.` : null;
}

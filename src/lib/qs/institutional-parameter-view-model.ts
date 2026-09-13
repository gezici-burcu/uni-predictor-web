import { QS_PART_TIME_FTE_COEFFICIENT } from "@/src/config/qs-institutional";
import {
  QS_ACTIVE_SCENARIO_PARAMETER_HELP,
  QS_ACTIVE_SCENARIO_SECTIONS,
} from "@/src/config/qs-active-scenario-parameters";
import {
  getQsInstitutionalSections,
  qsInstitutionalIndicatorCodesByField,
} from "@/src/config/qs-institutional-mapping";
import type { QsMetricValues } from "@/src/types/qs";
import {
  calculateQsCount,
  createEmptyQsCountInput,
  type QsCountInput,
  type QsInstitutionalFteCountRowId,
  type QsInstitutionalInputByRowId,
} from "@/src/types/qsInstitutional";
import type { QsInstitutionalYearData } from "@/src/contexts/InstitutionDataContext";
import { getQsEffectiveValue } from "./qs-effective-value";

export type QsInstitutionalScenarioOverrides = {
  [Id in keyof QsInstitutionalInputByRowId]?: Partial<QsInstitutionalInputByRowId[Id]>;
};

const detailAcademicIds = [
  "maleAcademicStaff",
  "femaleAcademicStaff",
  "otherAcademicStaff",
] as const;

const valueOrNull = (value: number | null | undefined) => value ?? null;

export function mergeQsInstitutionalScenario(
  baseline: QsInstitutionalYearData,
  overrides: QsInstitutionalScenarioOverrides,
): QsInstitutionalYearData {
  const result: QsInstitutionalYearData = { ...baseline };
  for (const [id, override] of Object.entries(overrides)) {
    const baselineRow = baseline[id as keyof QsInstitutionalYearData] as Record<string, number | null | undefined> | undefined;
    const parts = new Set([...Object.keys(baselineRow ?? {}), ...Object.keys(override ?? {})]);
    if (parts.size === 0) continue;
    result[id as keyof QsInstitutionalYearData] = Object.fromEntries(
      [...parts].map((part) => [part, getQsEffectiveValue(
        (override as Record<string, number | "" | null | undefined>)[part],
        baselineRow?.[part],
      )]),
    ) as never;
  }
  return result;
}

export function deriveQsAcademicStaffInput(
  values: QsInstitutionalYearData,
): QsCountInput {
  const sum = (field: keyof QsCountInput) => {
    const valid = detailAcademicIds
      .map((id) => valueOrNull(values[id]?.[field]))
      .filter((value): value is number =>
        value !== null && Number.isFinite(value) && value >= 0 && Number.isInteger(value));
    return valid.length ? valid.reduce((total, value) => total + value, 0) : null;
  };
  return { fullTime: sum("fullTime"), partTime: sum("partTime") };
}

function getCount(
  values: QsInstitutionalYearData,
  id: QsInstitutionalFteCountRowId,
): QsCountInput {
  const stored = values[id] as QsCountInput | undefined;
  if (id !== "academicStaff") return stored ?? createEmptyQsCountInput();
  const derived = deriveQsAcademicStaffInput(values);
  return {
    fullTime: stored?.fullTime ?? derived.fullTime,
    partTime: stored?.partTime ?? derived.partTime,
  };
}

const rawFte = (
  values: QsInstitutionalYearData,
  ids: readonly QsInstitutionalFteCountRowId[],
) => ids.reduce<number | null>((total, id) => {
  const value = calculateQsCount(getCount(values, id), QS_PART_TIME_FTE_COEFFICIENT).rawFte;
  return value === null ? total : (total ?? 0) + value;
}, null);

/** Kurumsal girdileri mevcut QS motorunun beklediği türetilmiş metriklere taşır. */
export function createQsEngineValuesFromInstitutionalData(
  values: QsInstitutionalYearData,
): QsMetricValues {
  const result: QsMetricValues = {};
  const set = (id: string, value: number | null) => {
    if (value !== null) result[id] = value;
  };
  set("qs.common.academicStaffFte", rawFte(values, ["academicStaff"]));
  set("qs.common.studentsFte", rawFte(values, [
      "undergraduateStudents",
      "graduatePostgraduateStudents",
    ]));
  set("qs.common.internationalStudentsFte", rawFte(values, [
      "undergraduateInternationalStudents",
      "graduatePostgraduateInternationalStudents",
    ]));
  set("qs.globalEngagement.internationalFacultyFte", rawFte(values, ["internationalAcademicStaff"]));
  set("qs.globalEngagement.internationalStudentNationalityCount", valueOrNull(values.totalStudentNationalities?.value));
  return result;
}

export function createQsInstitutionalParameterViewModel(
  baseline: QsInstitutionalYearData,
  overrides: QsInstitutionalScenarioOverrides,
) {
  const effective = mergeQsInstitutionalScenario(baseline, overrides);
  return getQsInstitutionalSections().map((section) => ({
    ...section,
    rows: section.rows.map((row) => ({
      definition: row,
      currentValue: baseline[row.id],
      scenarioValue: effective[row.id],
      indicatorCodes: qsInstitutionalIndicatorCodesByField.get(row.id) ?? [],
    })),
  }));
}

export function createQsActiveScenarioParameterViewModel(
  baseline: QsInstitutionalYearData,
) {
  const definitions = new Map(
    getQsInstitutionalSections().flatMap((section) =>
      section.rows.map((row) => [row.id, row] as const)),
  );
  return QS_ACTIVE_SCENARIO_SECTIONS.map((section) => ({
    ...section,
    rows: section.rowIds.map((id) => {
      const definition = definitions.get(id);
      if (!definition) throw new Error(`Missing QS institutional definition: ${id}`);
      return {
        definition,
        currentValue: baseline[id],
        indicatorCodes: qsInstitutionalIndicatorCodesByField.get(id) ?? [],
        help: QS_ACTIVE_SCENARIO_PARAMETER_HELP[id],
      };
    }),
  }));
}

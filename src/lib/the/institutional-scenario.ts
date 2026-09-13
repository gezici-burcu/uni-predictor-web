import type { InstitutionDataYear } from "@/src/config/institution-data-years";
import type { TheInstitutionFieldKey } from "@/src/config/data-entry/the-institution-fields";
import type { TheInstitutionData } from "@/src/data/data-entry/the-institution-data";
import type { TheMetricValues } from "@/src/types/the";

export const THE_INSTITUTIONAL_TO_SCENARIO_MAPPING = {
  academicStaffFte: "the.common.academicStaffFte",
  internationalAcademicStaffFte: "the.internationalOutlook.internationalAcademicStaffFte",
  researchStaffFte: "the.researchEnvironment.academicResearchStaffFte",
  studentsFte: "the.common.studentsFte",
  internationalStudentsFte: "the.internationalOutlook.internationalStudentsFte",
  undergraduateDegreesAwarded: "the.teaching.bachelorGraduates",
  doctoratesAwarded: "the.teaching.doctorateGraduates",
  institutionalIncome: "the.teaching.institutionalIncomePpp",
  researchIncome: "the.researchEnvironment.researchIncomePpp",
  industryCommerceResearchIncome: "the.industry.industryResearchIncomePpp",
} as const satisfies Partial<Record<TheInstitutionFieldKey, string>>;

export type TheScenarioOverrideValues = Record<string, number | null>;

export interface TheYearScopedScenarioState {
  __theDataYearScope: 1;
  years: Record<string, TheScenarioOverrideValues>;
}

const UNSCOPED_YEAR_KEY = "__no-active-year__";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const yearKey = (year: InstitutionDataYear | null): string =>
  year === null ? UNSCOPED_YEAR_KEY : String(year);

export const getTheInstitutionalScenarioKey = (
  fieldId: TheInstitutionFieldKey,
): string => THE_INSTITUTIONAL_TO_SCENARIO_MAPPING[
  fieldId as keyof typeof THE_INSTITUTIONAL_TO_SCENARIO_MAPPING
] ?? fieldId;

export function createTheInstitutionalMetricBaseline(
  defaults: TheMetricValues,
  institutionalData: TheInstitutionData | null,
): TheMetricValues {
  if (!institutionalData) return { ...defaults };
  const values = { ...defaults };
  for (const [fieldId, metricId] of Object.entries(THE_INSTITUTIONAL_TO_SCENARIO_MAPPING)) {
    const institutionalValue = institutionalData[fieldId as keyof typeof THE_INSTITUTIONAL_TO_SCENARIO_MAPPING];
    if (institutionalValue !== null) values[metricId] = institutionalValue;
  }
  return values;
}

export function removeYearLinkedBaselineOverrides(
  overrides: Record<string, unknown>,
): TheMetricValues {
  const linkedMetricIds = new Set<string>(
    Object.values(THE_INSTITUTIONAL_TO_SCENARIO_MAPPING),
  );
  return Object.fromEntries(
    Object.entries(overrides).filter(
      (entry): entry is [string, number] =>
        !linkedMetricIds.has(entry[0]) &&
        typeof entry[1] === "number" &&
        Number.isFinite(entry[1]),
    ),
  );
}

export function pickTheMetricScenarioOverrides(
  overrides: TheScenarioOverrideValues,
  metricIds: ReadonlySet<string>,
): TheMetricValues {
  return Object.fromEntries(
    Object.entries(overrides).filter(
      (entry): entry is [string, number] =>
        metricIds.has(entry[0]) &&
        typeof entry[1] === "number" &&
        Number.isFinite(entry[1]),
    ),
  );
}

export function createTheEffectiveScenarioInputs(
  baseline: TheMetricValues,
  overrides: TheScenarioOverrideValues,
): TheMetricValues {
  const effective = { ...baseline };
  for (const [parameterId, value] of Object.entries(overrides)) {
    if (Object.prototype.hasOwnProperty.call(baseline, parameterId) && typeof value === "number" && Number.isFinite(value)) {
      effective[parameterId] = value;
    }
  }
  return effective;
}

export function parseTheYearScopedScenarioState(
  value: Record<string, unknown>,
): TheYearScopedScenarioState {
  if (value.__theDataYearScope !== 1 || !isRecord(value.years)) {
    return { __theDataYearScope: 1, years: {} };
  }
  const years: Record<string, TheScenarioOverrideValues> = {};
  for (const [key, rawOverrides] of Object.entries(value.years)) {
    if (!isRecord(rawOverrides)) continue;
    years[key] = Object.fromEntries(
      Object.entries(rawOverrides).filter((entry): entry is [string, number | null] =>
        entry[1] === null ||
        (typeof entry[1] === "number" && Number.isFinite(entry[1]))
      ),
    );
  }
  return { __theDataYearScope: 1, years };
}

export function getTheScenarioOverridesForYear(
  value: Record<string, unknown>,
  year: InstitutionDataYear | null,
): TheScenarioOverrideValues {
  const state = parseTheYearScopedScenarioState(value);
  return { ...(state.years[yearKey(year)] ?? {}) };
}

export function setTheScenarioOverrideForYear({
  state: rawState,
  year,
  key,
  value,
  baselineValue,
}: {
  state: Record<string, unknown>;
  year: InstitutionDataYear | null;
  key: string;
  value: number | null;
  baselineValue: number | null;
}): TheYearScopedScenarioState {
  const state = parseTheYearScopedScenarioState(rawState);
  const keyForYear = yearKey(year);
  const overrides = { ...(state.years[keyForYear] ?? {}) };
  if (value === null || Object.is(value, baselineValue)) delete overrides[key];
  else overrides[key] = value;
  const years = { ...state.years };
  if (Object.keys(overrides).length === 0) delete years[keyForYear];
  else years[keyForYear] = overrides;
  return { __theDataYearScope: 1, years };
}

export function clearTheScenarioOverridesForYear(
  rawState: Record<string, unknown>,
  year: InstitutionDataYear | null,
): TheYearScopedScenarioState {
  const state = parseTheYearScopedScenarioState(rawState);
  const years = { ...state.years };
  delete years[yearKey(year)];
  return { __theDataYearScope: 1, years };
}

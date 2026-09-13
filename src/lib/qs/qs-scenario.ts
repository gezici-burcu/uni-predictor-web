import type { QsAdditionalCalculationInputs } from "@/src/types/qs-raw";
import type { QsDataYear } from "@/src/types/qsInstitutional";
import { QS_ACTIVE_SCENARIO_PARAMETER_ID_SET } from "@/src/config/qs-active-scenario-parameters";
import type { QsInstitutionalScenarioOverrides } from "./institutional-parameter-view-model";

export type QsYearScenarioChanges = {
  institutional: QsInstitutionalScenarioOverrides;
  additional: Partial<QsAdditionalCalculationInputs>;
};

export type QsScenarioChangesByYear = Partial<Record<QsDataYear, QsYearScenarioChanges>>;

export const emptyQsYearScenarioChanges = (): QsYearScenarioChanges => ({
  institutional: {},
  additional: {},
});

export const resetQsYearScenarioChanges = (): QsYearScenarioChanges => ({
  institutional: {},
  additional: {},
});

export function readQsYearScenarioChanges(
  stored: Record<string, unknown>,
  year: QsDataYear,
): QsYearScenarioChanges {
  const value = stored[year];
  if (!value || typeof value !== "object") return emptyQsYearScenarioChanges();
  const record = value as Record<string, unknown>;
  if ("institutional" in record || "additional" in record) {
    return {
      institutional: (record.institutional ?? {}) as QsInstitutionalScenarioOverrides,
      additional: (record.additional ?? {}) as Partial<QsAdditionalCalculationInputs>,
    };
  }
  // Backward-compatible read for the previous year -> institutional shape.
  return { institutional: value as QsInstitutionalScenarioOverrides, additional: {} };
}

export function writeQsYearScenarioChanges(
  stored: Record<string, unknown>,
  year: QsDataYear,
  changes: QsYearScenarioChanges,
): Record<string, unknown> {
  const next = { ...stored };
  if (Object.keys(changes.institutional).length || Object.keys(changes.additional).length) {
    next[year] = changes;
  } else {
    delete next[year];
  }
  return next;
}

export function countQsScenarioOverrides(changes: QsYearScenarioChanges): number {
  return Object.keys(
    filterQsActiveInstitutionalScenarioOverrides(changes.institutional),
  ).length;
}

export function filterQsActiveInstitutionalScenarioOverrides(
  overrides: QsInstitutionalScenarioOverrides,
): QsInstitutionalScenarioOverrides {
  return Object.fromEntries(
    Object.entries(overrides).filter(([id]) =>
      QS_ACTIVE_SCENARIO_PARAMETER_ID_SET.has(id as never)),
  ) as QsInstitutionalScenarioOverrides;
}

export function clearQsActiveScenarioOverrides(
  changes: QsYearScenarioChanges,
): QsYearScenarioChanges {
  return {
    ...changes,
    institutional: Object.fromEntries(
      Object.entries(changes.institutional).filter(([id]) =>
        !QS_ACTIVE_SCENARIO_PARAMETER_ID_SET.has(id as never)),
    ) as QsInstitutionalScenarioOverrides,
  };
}

"use client";

import { useMemo } from "react";
import { getQsAdditionalBaselineForYear } from "@/src/config/qs-additional-baselines";
import { QS_ACTIVE_SCENARIO_PARAMETER_ID_SET } from "@/src/config/qs-active-scenario-parameters";
import { useInstitutionData } from "@/src/contexts/InstitutionDataContext";
import { useMethodologyScenario } from "@/src/contexts/MethodologyScenarioContext";
import { calculateQsOfficialRawIndicators, runQsStochasticSimulation } from "@/src/lib/calculations/qs";
import { buildQsCalculationInputs } from "@/src/lib/qs/qs-calculation-inputs";
import { estimateQsRank } from "@/src/lib/qs/estimate-qs-rank";
import { distributeQsAggregateTotal } from "@/src/lib/recommendation-engine/qs-recommendation-parameters";
import {
  selectQsValidatedScenarioInputs,
  validateQsActiveScenarioConsistency,
} from "@/src/lib/qs/validate-qs-active-scenario";
import {
  countQsScenarioOverrides,
  filterQsActiveInstitutionalScenarioOverrides,
  readQsYearScenarioChanges,
  resetQsYearScenarioChanges,
  writeQsYearScenarioChanges,
  type QsYearScenarioChanges,
} from "@/src/lib/qs/qs-scenario";
import {
  mergeQsInstitutionalScenario,
  type QsInstitutionalScenarioOverrides,
} from "@/src/lib/qs/institutional-parameter-view-model";
import type { QsAdditionalInputKey } from "@/src/types/qs-raw";
import type {
  QsDataYear,
  QsInstitutionalFteCountRowId,
  QsInstitutionalScalarRowId,
} from "@/src/types/qsInstitutional";
import { DEFAULT_QS_INSTITUTIONAL_DATA_YEAR, getQsInstitutionYearDisplayData } from "@/src/lib/qs/qs-institution-year-data";

const DEFAULT_QS_YEAR: QsDataYear = DEFAULT_QS_INSTITUTIONAL_DATA_YEAR;

export function setQsInstitutionalScenarioField(
  overrides: QsInstitutionalScenarioOverrides,
  id: QsInstitutionalFteCountRowId | QsInstitutionalScalarRowId,
  field: "fullTime" | "partTime" | "value",
  value: number | null,
): QsInstitutionalScenarioOverrides {
  if (!QS_ACTIVE_SCENARIO_PARAMETER_ID_SET.has(id)) {
    return overrides;
  }
  const institutional = { ...overrides };
  const row = { ...(institutional[id] as Record<string, number | null> | undefined) };
  if (value === null) delete row[field];
  else row[field] = value;
  if (Object.keys(row).length) institutional[id] = row as never;
  else delete institutional[id];
  return institutional;
}

export function setQsAdditionalScenarioField(
  overrides: Partial<Record<QsAdditionalInputKey, number | null>>,
  key: QsAdditionalInputKey,
  value: number | null,
) {
  const additional = { ...overrides };
  if (value === null) delete additional[key];
  else additional[key] = value;
  return additional;
}

export function useQsRawIndicatorResults() {
  const { activeQsYear, getQsYearData, getQsYearOverride } = useInstitutionData();
  const { getChanges, setChanges } = useMethodologyScenario();
  const selectedYear = activeQsYear ? String(activeQsYear) as QsDataYear : DEFAULT_QS_YEAR;
  const currentInstitutional = getQsYearData(selectedYear);
  const currentInstitutionalDisplay = getQsInstitutionYearDisplayData(selectedYear, getQsYearOverride(selectedYear));
  const stored = getChanges("qs");
  const yearChanges = useMemo(
    () => readQsYearScenarioChanges(stored, selectedYear),
    [stored, selectedYear],
  );
  const currentAdditional = useMemo(
    () => getQsAdditionalBaselineForYear(selectedYear),
    [selectedYear],
  );
  const activeInstitutionalOverrides = useMemo(
    () => filterQsActiveInstitutionalScenarioOverrides(yearChanges.institutional),
    [yearChanges.institutional],
  );
  const scenarioInstitutional = useMemo(
    () => mergeQsInstitutionalScenario(currentInstitutional, activeInstitutionalOverrides),
    [currentInstitutional, activeInstitutionalOverrides],
  );
  const scenarioAdditional = currentAdditional;
  const currentInputs = useMemo(
    () => buildQsCalculationInputs(currentInstitutional, currentAdditional),
    [currentInstitutional, currentAdditional],
  );
  const scenarioInputs = useMemo(
    () => buildQsCalculationInputs(scenarioInstitutional, scenarioAdditional),
    [scenarioInstitutional, scenarioAdditional],
  );
  const changedCount = countQsScenarioOverrides(yearChanges);
  const activeScenarioInputs = changedCount === 0
    ? currentInputs
    : scenarioInputs;
  const scenarioValidation = useMemo(
    () => validateQsActiveScenarioConsistency(scenarioInstitutional, activeInstitutionalOverrides),
    [scenarioInstitutional, activeInstitutionalOverrides],
  );
  const currentRawResults = useMemo(
    () => calculateQsOfficialRawIndicators(currentInputs),
    [currentInputs],
  );
  const validatedScenarioInputs = selectQsValidatedScenarioInputs(
    scenarioValidation.isValid,
    currentInputs,
    activeScenarioInputs,
  );
  const scenarioRawResults = useMemo(
    () => calculateQsOfficialRawIndicators(validatedScenarioInputs),
    [validatedScenarioInputs],
  );
  const simulation = useMemo(
    () => runQsStochasticSimulation({
      currentInputs,
      scenarioInputs: validatedScenarioInputs,
      selectedInstitutionalYear: Number(selectedYear),
    }),
    [currentInputs, validatedScenarioInputs, selectedYear],
  );
  const rankEstimation = useMemo(() => estimateQsRank(simulation), [simulation]);

  const storeYear = (changes: QsYearScenarioChanges) =>
    setChanges("qs", writeQsYearScenarioChanges(stored, selectedYear, changes));

  const updateInstitutionalField = (
    id: QsInstitutionalFteCountRowId | QsInstitutionalScalarRowId,
    field: "fullTime" | "partTime" | "value",
    value: number | null,
  ) => {
    const baselineRow = currentInstitutional[id] as
      | Record<"fullTime" | "partTime" | "value", number | null>
      | undefined;
    const baselineValue = baselineRow?.[field] ?? null;
    const institutional = setQsInstitutionalScenarioField(
      yearChanges.institutional,
      id,
      field,
      Object.is(value, baselineValue) ? null : value,
    );
    storeYear({ ...yearChanges, institutional });
  };

  const updateAdditionalField = (key: QsAdditionalInputKey, value: number | null) => {
    const additional = setQsAdditionalScenarioField(yearChanges.additional, key, value);
    storeYear({ ...yearChanges, additional });
  };

  const updateInstitutionalTotal = (id: QsInstitutionalFteCountRowId, value: number | null) => {
    const baselineRow = currentInstitutional[id] ?? { fullTime: null, partTime: null };
    let institutional = { ...yearChanges.institutional };
    if (value === null) {
      institutional = setQsInstitutionalScenarioField(institutional, id, "fullTime", null);
      institutional = setQsInstitutionalScenarioField(institutional, id, "partTime", null);
    } else {
      const distributed = distributeQsAggregateTotal({ scenarioTotal: value, baselineFullTime: baselineRow.fullTime ?? 0, baselinePartTime: baselineRow.partTime ?? 0 });
      institutional = setQsInstitutionalScenarioField(institutional, id, "fullTime", Object.is(distributed.fullTime, baselineRow.fullTime) ? null : distributed.fullTime);
      institutional = setQsInstitutionalScenarioField(institutional, id, "partTime", Object.is(distributed.partTime, baselineRow.partTime) ? null : distributed.partTime);
    }
    storeYear({ ...yearChanges, institutional });
  };

  const missingInputSummary = Array.from(new Set(
    Object.values(scenarioRawResults).flatMap((item) => item.missingInputs),
  ));

  return {
    selectedYear,
    currentInstitutional,
    currentInstitutionalDisplay,
    scenarioInstitutional,
    institutionalOverrides: activeInstitutionalOverrides,
    currentAdditional,
    scenarioAdditional,
    additionalOverrides: yearChanges.additional,
    currentInputs,
    scenarioInputs,
    currentRawResults,
    scenarioRawResults,
    simulation,
    rankEstimation,
    simulationPending: false,
    scenarioValidation,
    missingInputSummary,
    changedCount,
    updateInstitutionalField,
    updateInstitutionalTotal,
    updateAdditionalField,
    resetSelectedYear: () => storeYear(resetQsYearScenarioChanges()),
  };
}

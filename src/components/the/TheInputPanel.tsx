"use client";

import { useEffect, useMemo, useState } from "react";
import { THE_ACTIVE_DATA_MODE } from "@/src/config/the.data-mode";
import { THE_MODEL_BASELINE_ASSUMPTIONS } from "@/src/config/the.public-simulation";
import {
  THE_DISPLAYED_INDICATOR_COUNT,
  theInitialValues,
} from "@/src/config/the.metrics";
import { getTheParameterUnitLabel, getTheSimulatorBaselineValue, THE_FLAT_PARAMETER_DEFINITIONS, THE_SIMULATOR_PARAMETER_GROUPS, THE_UNVERIFIED_RAW_TO_SCORE_PARAMETER_IDS, type TheSimulatorParameterDefinition } from "@/src/config/the-simulator-parameters";
export { THE_FLAT_PARAMETER_DEFINITIONS } from "@/src/config/the-simulator-parameters";
import { getTheInstitutionDataForYear, type TheInstitutionData } from "@/src/data/data-entry/the-institution-data";
import {
  compactTheStochasticSimulationForUi,
  runTheStochasticSimulation,
} from "@/src/lib/the/stochastic/run-the-stochastic-simulation";
import { THE_STOCHASTIC_CALIBRATION_INPUTS } from "@/src/lib/the/stochastic/the-stochastic-model-config";
import {
  clearTheScenarioOverridesForYear,
  createTheEffectiveScenarioInputs,
  createTheInstitutionalMetricBaseline,
  getTheScenarioOverridesForYear,
  setTheScenarioOverrideForYear,
} from "@/src/lib/the/institutional-scenario";
import type { TheMetricValues } from "@/src/types/the";
import { ResetAllChangesButton } from "@/src/components/common/ResetAllChangesButton";
import { TheDashboard } from "./TheDashboard";
import {
  getTheBaselineSliderMax,
  getTheCountSliderStep,
  getTheIncomeSliderStep,
  TheScenarioParameterInput,
} from "./TheScenarioParameterInput";
import { useInstitutionData } from "@/src/contexts/InstitutionDataContext";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { useMethodologyScenario } from "@/src/contexts/MethodologyScenarioContext";
import { createTheScenarioMetricValidationValues, getTheSubsetValidationErrorMap, validateThePublicationCountRange, validateTheScenarioMetricValues } from "@/src/lib/the/validate-the-subset-limits";
import { SimulatorLayout, SIMULATOR_ASIDE_CLASS_NAME } from "@/src/components/common/SimulatorLayout";

const institutionalParameterDefinitions = THE_FLAT_PARAMETER_DEFINITIONS.filter(
  (definition) => definition.source === "institutional",
);

const metricInputId = (metricId: string) =>
  metricId === "the.internationalOutlook.internationalStudentsFte"
    ? metricId.replace(/[^a-zA-Z0-9-_]/g, "-")
    : metricId;

const institutionalSliderDependencies: Partial<
  Record<keyof TheInstitutionData, keyof TheInstitutionData>
> = {
  internationalAcademicStaffFte: "academicStaffFte",
  femaleAcademicStaffFte: "academicStaffFte",
  internationalStudentsFte: "studentsFte",
  femaleStudentsFte: "studentsFte",
  bachelorsStudentsFte: "studentsFte",
  mastersStudentsFte: "studentsFte",
  doctorateStudentsFte: "studentsFte",
  researchIncome: "institutionalIncome",
  industryCommerceResearchIncome: "researchIncome",
};

const additionalParameterLimits: Record<string, string> = {
  "the.researchEnvironment.researchIncomePpp":
    "the.teaching.institutionalIncomePpp",
  "the.internationalOutlook.internationalCoauthoredPublications":
    "the.researchEnvironment.publicationCount",
  "the.internationalOutlook.outboundStudents": "the.common.studentsFte",
};

export function TheInputPanel() {
  const { getChanges, setChanges } = useMethodologyScenario();
  const { activeTheYear, getTheYearOverride } = useInstitutionData();
  const { language, t } = useAppLanguage();
  const [resetRevision, setResetRevision] = useState(0);
  const defaultBaseline = THE_ACTIVE_DATA_MODE === "public-simulation" ? THE_MODEL_BASELINE_ASSUMPTIONS : theInitialValues;
  const institutionalData = useMemo<TheInstitutionData | null>(() => {
    if (activeTheYear === null) return null;
    return {
      ...getTheInstitutionDataForYear(activeTheYear),
      ...getTheYearOverride(activeTheYear),
    };
  }, [activeTheYear, getTheYearOverride]);
  const baselineValues = useMemo<TheMetricValues>(() => {
    return createTheInstitutionalMetricBaseline(
      defaultBaseline,
      institutionalData,
    );
  }, [defaultBaseline, institutionalData]);
  const rawScenarioState = getChanges("the");
  const scenarioOverrides = useMemo(
    () => getTheScenarioOverridesForYear(rawScenarioState, activeTheYear),
    [activeTheYear, rawScenarioState],
  );
  const scenarioInstitutionalValues = useMemo(() => Object.fromEntries(
    institutionalParameterDefinitions.map((definition) => {
      const field = definition.institutionalField!;
      const baselineValue = institutionalData === null
        ? definition.metric?.baselineValue ?? null
        : institutionalData[field.id];
      return [
        field.id,
        Object.prototype.hasOwnProperty.call(scenarioOverrides, definition.scenarioKey)
          ? scenarioOverrides[definition.scenarioKey] ?? null
          : baselineValue,
      ];
    }),
  ) as Partial<Record<keyof TheInstitutionData, number | null>>, [
    institutionalData,
    scenarioOverrides,
  ]);
  const subsetErrors = useMemo(
    () => getTheSubsetValidationErrorMap(scenarioInstitutionalValues),
    [scenarioInstitutionalValues],
  );
  const scenarioEffectiveMetricValues = useMemo(
    () => createTheEffectiveScenarioInputs(baselineValues, scenarioOverrides),
    [baselineValues, scenarioOverrides],
  );
  const scenarioMetricValidationValues = useMemo(
    () => createTheScenarioMetricValidationValues(
      scenarioEffectiveMetricValues,
      scenarioOverrides,
      THE_UNVERIFIED_RAW_TO_SCORE_PARAMETER_IDS,
    ),
    [scenarioEffectiveMetricValues, scenarioOverrides],
  );
  const numericErrors = useMemo(
    () => validateTheScenarioMetricValues(scenarioMetricValidationValues),
    [scenarioMetricValidationValues],
  );
  const publicationRangeErrors = useMemo<Record<string, string>>(() => {
    const id = "the.researchEnvironment.publicationCount";
    const message = validateThePublicationCountRange(scenarioEffectiveMetricValues[id], baselineValues[id] ?? null);
    if (!message) return {};
    return { [id]: message } as Record<string, string>;
  }, [baselineValues, scenarioEffectiveMetricValues]);
  const heldExternalParameterIds = useMemo(() => THE_FLAT_PARAMETER_DEFINITIONS.flatMap((definition) =>
      THE_UNVERIFIED_RAW_TO_SCORE_PARAMETER_IDS.has(definition.scenarioKey)
        ? [definition.scenarioKey]
        : []), []);
  const linkedParameterLimitErrors = useMemo(() => Object.fromEntries(
    Object.entries(additionalParameterLimits).flatMap(([parameterId, linkedTotalParameterId]) => {
      const linkedPairWasChanged = Object.prototype.hasOwnProperty.call(scenarioOverrides, parameterId) ||
        Object.prototype.hasOwnProperty.call(scenarioOverrides, linkedTotalParameterId);
      if (!linkedPairWasChanged) return [];
      const parameterValue = scenarioEffectiveMetricValues[parameterId];
      const linkedTotalValue = scenarioEffectiveMetricValues[linkedTotalParameterId];
      const parameterLabel = THE_FLAT_PARAMETER_DEFINITIONS.find((item) => item.scenarioKey === parameterId)?.label[language] ?? parameterId;
      const linkedTotalLabel = THE_FLAT_PARAMETER_DEFINITIONS.find((item) => item.scenarioKey === linkedTotalParameterId)?.label[language] ?? linkedTotalParameterId;
      const formatValue = (candidate: number) => new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: 20 }).format(candidate);
      return Number.isFinite(parameterValue) && Number.isFinite(linkedTotalValue) && parameterValue > linkedTotalValue
        ? [[parameterId, language === "tr"
            ? `${parameterLabel} (${formatValue(parameterValue)}), ${linkedTotalLabel} (${formatValue(linkedTotalValue)}) değerini aşamaz.`
            : `${parameterLabel} (${formatValue(parameterValue)}) cannot exceed ${linkedTotalLabel} (${formatValue(linkedTotalValue)}).`]]
        : [];
    }),
  ) as Record<string, string>, [language, scenarioEffectiveMetricValues, scenarioOverrides]);
  const subsetScenarioErrors = useMemo(() => Object.fromEntries(
    institutionalParameterDefinitions.flatMap((definition) => {
      const fieldId = definition.institutionalField?.id;
      if (!fieldId) return [];
      const message = subsetErrors[fieldId as keyof typeof subsetErrors];
      return message ? [[definition.scenarioKey, message]] : [];
    }),
  ) as Record<string, string>, [subsetErrors]);
  const hasScenarioErrors =
    Object.keys(subsetErrors).length > 0 ||
    Object.keys(linkedParameterLimitErrors).length > 0 ||
    Object.keys(numericErrors).length > 0 ||
    Object.keys(publicationRangeErrors).length > 0;
  const validationErrors = useMemo(
    () => ({ ...numericErrors, ...subsetScenarioErrors, ...linkedParameterLimitErrors, ...publicationRangeErrors }),
    [linkedParameterLimitErrors, numericErrors, publicationRangeErrors, subsetScenarioErrors],
  );
  const validScenarioInputs = hasScenarioErrors ? null : scenarioEffectiveMetricValues;
  const effectiveScenarioChanges = useMemo(() => Object.fromEntries(
    Object.keys(scenarioOverrides).flatMap((parameterId) =>
      Object.prototype.hasOwnProperty.call(scenarioEffectiveMetricValues, parameterId)
        ? [[parameterId, scenarioEffectiveMetricValues[parameterId]]]
        : []),
  ) as TheMetricValues, [scenarioOverrides, scenarioEffectiveMetricValues]);
  const changedMetricCount = Object.keys(scenarioOverrides).length;
  const [debouncedScenarioInputs, setDebouncedScenarioInputs] =
    useState<TheMetricValues | null>(validScenarioInputs);
  useEffect(() => {
    if (validScenarioInputs === null) return;
    const timeout = window.setTimeout(
      () => setDebouncedScenarioInputs(validScenarioInputs),
      125,
    );
    return () => window.clearTimeout(timeout);
  }, [validScenarioInputs]);
  const simulationUpdating =
    debouncedScenarioInputs !== validScenarioInputs;
  const simulation = useMemo(
    () => debouncedScenarioInputs === null ? null : compactTheStochasticSimulationForUi(
      runTheStochasticSimulation({
        calibrationInputs: THE_STOCHASTIC_CALIBRATION_INPUTS,
        currentInputs: baselineValues,
        scenarioInputs: debouncedScenarioInputs,
      }),
    ),
    [baselineValues, debouncedScenarioInputs],
  );
  const changeBaselineValues = useMemo<Record<string, number | null>>(
    () => Object.fromEntries(Object.entries({
      ...baselineValues,
      ...(institutionalData ?? {}),
    }).map(([parameterId, baselineValue]) => [
      parameterId,
      getTheSimulatorBaselineValue(parameterId, baselineValue),
    ])),
    [baselineValues, institutionalData],
  );

  const updateScenarioOverride = (
    key: string,
    value: number | null,
    baselineValue: number | null,
  ) => {
    setChanges("the", { ...setTheScenarioOverrideForYear({
      state: rawScenarioState,
      year: activeTheYear,
      key,
      value,
      baselineValue,
    }) });
  };

  const handleResetAllTheChanges = () => {
    setChanges("the", {
      ...clearTheScenarioOverridesForYear(rawScenarioState, activeTheYear),
    });
    setResetRevision((revision) => revision + 1);
  };

  const renderInstitutionalParameter = (definition: TheSimulatorParameterDefinition) => {
    const field = definition.institutionalField;
    if (!field) return null;
    const baselineValue = institutionalData === null
      ? definition.metric?.baselineValue ?? null
      : institutionalData[field.id];
    const hasOverride = Object.prototype.hasOwnProperty.call(
      scenarioOverrides,
      definition.scenarioKey,
    );
    const effectiveValue = hasOverride
      ? scenarioOverrides[definition.scenarioKey] ?? null
      : baselineValue;
    const inputId = definition.metric
      ? metricInputId(definition.metric.id)
      : `the-institution-scenario-${field.id}`;
    const dependencyFieldId = institutionalSliderDependencies[field.id];
    const dependencyValue = dependencyFieldId
      ? scenarioInstitutionalValues[dependencyFieldId] ?? null
      : null;
    const hasUsableDependency = dependencyValue !== null && dependencyValue > 0;
    const fallbackMaximum = field.inputType === "currency" ? 1_000_000_000 : 100_000;
    const maximum = dependencyFieldId && hasUsableDependency
      ? dependencyValue
      : getTheBaselineSliderMax({
          baselineValue,
          configuredMax: definition.metric?.max,
          fallbackMax: fallbackMaximum,
        });
    const baseStep = field.inputType === "currency"
      ? getTheIncomeSliderStep(baselineValue)
      : getTheCountSliderStep(baselineValue);
    const step = dependencyFieldId && hasUsableDependency
      ? Math.min(baseStep, maximum)
      : baseStep;

    return (
      <div key={`${definition.id}-${resetRevision}`} data-institution-field-id={field.id}>
        <TheScenarioParameterInput
          id={inputId}
          label={definition.label[language]}
          value={effectiveValue}
          currentValue={baselineValue}
          minimum={field.minimum}
          maximum={maximum}
          step={step}
          unit={getTheParameterUnitLabel(definition.metric?.unit ?? field.unit[language], language)}
          required={definition.required}
          statusLabel={definition.required ? t("dataEntry.requiredCalculationStatus") : t("dataEntry.optional")}
          sliderDisabled={Boolean(dependencyFieldId) && !hasUsableDependency}
          dependencyHint={dependencyFieldId && !hasUsableDependency
            ? t("theSimulator.dependencyHint")
            : undefined}
          error={subsetErrors[field.id as keyof typeof subsetErrors] ?? numericErrors[definition.scenarioKey]}
          onChange={(value) => updateScenarioOverride(
            definition.scenarioKey,
            value,
            baselineValue,
          )}
        />
      </div>
    );
  };

  const renderAdditionalParameter = (definition: TheSimulatorParameterDefinition) => {
    const metric = definition.metric;
    if (!metric) return null;
    const baselineValue = getTheSimulatorBaselineValue(
      metric.id,
      baselineValues[metric.id] ?? metric.baselineValue,
    );
    const scenarioValue = scenarioOverrides[metric.id];
    const effectiveValue = typeof scenarioValue === "number"
      ? scenarioValue
      : baselineValue;
    const dependencyMetricId = additionalParameterLimits[metric.id];
    const dependencyValue = dependencyMetricId
      ? scenarioEffectiveMetricValues[dependencyMetricId]
      : undefined;
    const hasUsableDependency =
      typeof dependencyValue === "number" && dependencyValue > 0;
    const isFwci = metric.id === "the.researchQuality.fwci";
    const isPercentage = metric.inputType === "percentage";
    const isIncome = metric.id.toLowerCase().includes("income");
    const scoreImpactUnavailable = THE_UNVERIFIED_RAW_TO_SCORE_PARAMETER_IDS.has(metric.id);
    const maximum = dependencyMetricId && hasUsableDependency
      ? dependencyValue
      : isFwci
        ? Math.max(5, (baselineValue ?? metric.baselineValue) * 2)
        : isPercentage
          ? 100
          : getTheBaselineSliderMax({
              baselineValue,
              configuredMax: metric.max,
              fallbackMax: 100_000,
            });
    const step = metric.id === "the.researchEnvironment.publicationCount"
      ? metric.step
      : isFwci
        ? .01
      : isPercentage
        ? .01
        : isIncome
          ? getTheIncomeSliderStep(baselineValue)
          : getTheCountSliderStep(baselineValue);
    return (
      <div key={`${definition.id}-${resetRevision}`}>
        <TheScenarioParameterInput
          id={metricInputId(metric.id)}
          label={definition.label[language]}
          value={effectiveValue}
          currentValue={baselineValue}
          minimum={metric.min}
          maximum={maximum}
          step={dependencyMetricId && hasUsableDependency
            ? Math.min(step, maximum)
            : step}
          unit={getTheParameterUnitLabel(metric.unit ?? "", language)}
          required={definition.required}
          statusLabel={scoreImpactUnavailable
            ? t("theUi.scoreImpactUnavailable")
            : t("dataEntry.requiredCalculationStatus")}
          scoreImpactUnavailable={scoreImpactUnavailable}
          sliderDisabled={Boolean(dependencyMetricId) && !hasUsableDependency}
          dependencyHint={dependencyMetricId && !hasUsableDependency
            ? t("theSimulator.dependencyHint")
            : scoreImpactUnavailable
              ? t("theUi.scoreImpactUnavailableDetail")
              : undefined}
          error={linkedParameterLimitErrors[metric.id] ?? numericErrors[metric.id] ?? publicationRangeErrors[metric.id]}
          onChange={(value) => updateScenarioOverride(metric.id, value, baselineValue)}
        />
      </div>
    );
  };

  const infoCards = [
    { key: "parameter", label: t("theSimulator.parameter"), value: THE_FLAT_PARAMETER_DEFINITIONS.length },
    { key: "indicator", label: t("theSimulator.indicator"), value: THE_DISPLAYED_INDICATOR_COUNT },
    { key: "changed", label: t("theSimulator.changed"), value: changedMetricCount },
  ];

  return (
    <SimulatorLayout parameterPanel={<aside className={SIMULATOR_ASIDE_CLASS_NAME}>
          <div className="flex min-w-0 flex-col gap-4">
          <section className="shrink-0 rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50/60 p-4 shadow-sm">
            <div className="h-1 w-10 rounded-full bg-blue-600" aria-hidden="true" />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-slate-950">
                  {t("theSimulator.inputTitle")}
                </h1>
                {activeTheYear ? <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{t("dataEntry.dataYear")}: {activeTheYear}</span> : null}
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t("theSimulator.inputDescription")}
                </p>
              </div>
              <ResetAllChangesButton
                methodologyName="THE"
                changedCount={changedMetricCount}
                onReset={handleResetAllTheChanges}
              />
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-2">
              {infoCards.map((card) => {
                const isChanged = card.key === "changed";

                return (
                  <div
                    key={card.label}
                    className={
                      isChanged
                        ? "rounded-lg border border-blue-100 bg-blue-50 px-3 py-2"
                        : "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    }
                  >
                    <dt className={isChanged ? "text-[11px] text-blue-600" : "text-[11px] text-slate-500"}>
                      {card.label}
                    </dt>
                    <dd
                      className={`mt-1 text-lg font-bold ${
                        isChanged ? "text-blue-700" : "text-slate-950"
                      }`}
                    >
                      {card.value}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>

          <section aria-labelledby="the-flat-parameters-title" className="min-w-0 rounded-3xl border border-white/80 bg-white p-3 shadow-sm ring-1 ring-slate-200/70">
            <h2 id="the-flat-parameters-title" className="sr-only">THE {t("theSimulator.parameters")}</h2>
            <div className="grid grid-cols-1 gap-2">
              {THE_SIMULATOR_PARAMETER_GROUPS.map((group, index) => {
                const definitions = THE_FLAT_PARAMETER_DEFINITIONS.filter((definition) => definition.groupId === group.id);
                const errorCount = definitions.filter((definition) =>
                  (definition.institutionalField && subsetErrors[definition.institutionalField.id as keyof typeof subsetErrors]) ||
                  validationErrors[definition.scenarioKey],
                ).length;
                return <details key={group.id} open={index === 0} data-testid="the-required-parameter-group" className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 transition open:border-indigo-900/20 open:shadow-lg open:shadow-indigo-950/10">
                  <summary className="flex cursor-pointer list-none items-center gap-2 bg-slate-50 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-700 transition group-open:bg-gradient-to-r group-open:from-slate-950 group-open:via-indigo-950 group-open:to-blue-950 group-open:text-white [&::-webkit-details-marker]:hidden">
                    <span aria-hidden="true" className="size-2 rounded-full bg-slate-300 shadow-[0_0_0_4px_rgba(203,213,225,0.2)] group-open:bg-cyan-400 group-open:shadow-[0_0_0_4px_rgba(34,211,238,0.12),0_0_14px_rgba(34,211,238,0.75)]"/><span>{group.label[language]}</span>{errorCount ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold normal-case text-red-700">{errorCount} hata</span> : null}<span className="ml-auto rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold normal-case text-slate-500 group-open:bg-white/10 group-open:text-slate-200">{t("theSimulator.parameterCount").replace("{count}", String(definitions.length))}</span>
                  </summary>
                  <div className="grid grid-cols-1 gap-3 border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-indigo-50/25 p-3">
                    {definitions.map((definition) => definition.source === "institutional"
                      ? renderInstitutionalParameter(definition)
                      : renderAdditionalParameter(definition))}
                  </div>
                </details>;
              })}
            </div>
          </section>
          </div>
        </aside>} dashboard={<TheDashboard
          simulation={simulation}
          institutionalDataYear={activeTheYear}
          baselineValues={changeBaselineValues}
          scenarioChanges={effectiveScenarioChanges}
          simulationUpdating={simulationUpdating}
          hasValidationError={hasScenarioErrors}
          validationErrors={validationErrors}
          heldExternalParameterIds={heldExternalParameterIds}
        />}
    />
  );
}

"use client";

import { Fragment, useState } from "react";
import type {
  RecommendationMetricDefinition,
  RecommendationParameterInput,
  RecommendationTargetMode,
} from "@/src/lib/recommendation-engine";
import {
  getQsRecommendationParameterGroupNotice,
  getQsRecommendationParameterUiStatus,
  type QsRecommendationParameterUiStatus,
} from "@/src/lib/recommendation-engine";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { QsRecommendationMetricScope } from "./QsRecommendationMetricScope";
import { GreenMetricRecommendationMetricScope } from "./GreenMetricRecommendationMetricScope";

const formatCurrentValue = (value: unknown, locale: string) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString(locale, { maximumFractionDigits: 2 })
    : "—";

const badgeToneClasses: Record<QsRecommendationParameterUiStatus["badgeTone"], string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  error: "bg-red-50 text-red-700 ring-red-200",
};

export function toggleRecommendationParameterSelection(
  currentIds: readonly string[],
  parameterId: string,
  selected: boolean,
) {
  if (!selected) return currentIds.filter((id) => id !== parameterId);
  return currentIds.includes(parameterId) ? [...currentIds] : [...currentIds, parameterId];
}

function ParameterStatusBadge({
  status,
}: {
  status: QsRecommendationParameterUiStatus | null;
}) {
  if (!status) return null;

  return (
    <span
      title={status.tooltip}
      className={`mt-1 inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 ring-1 ring-inset ${badgeToneClasses[status.badgeTone]}`}
    >
      {status.badgeLabel}
    </span>
  );
}

function ParameterGroupHeading({
  definition,
  visibleDefinitions,
}: {
  definition: RecommendationMetricDefinition;
  visibleDefinitions: RecommendationMetricDefinition[];
}) {
  if (!definition.groupLabel) return null;

  const groupDefinitions = visibleDefinitions.filter(
    (item) => item.groupId === definition.groupId,
  );
  const notice = getQsRecommendationParameterGroupNotice(groupDefinitions);
  const hasAggregateTotals = groupDefinitions.some(
    (item) => item.recommendationView === "aggregate-total",
  );

  return (
    <div className="col-span-full mt-2 border-b border-slate-200 pb-2">
      <h3 className="text-sm font-bold text-slate-800">{definition.groupLabel}</h3>
      {notice ? <p className="mt-1 text-xs text-slate-600">{notice}</p> : null}
      {hasAggregateTotals ? (
        <p className="mt-1 text-xs text-slate-600">
          Girilen toplam değer, hesaplamada mevcut kurumsal Full-Time/Part-Time
          dağılımı korunarak kullanılır.
        </p>
      ) : null}
    </div>
  );
}

export function RecommendationMetricScope({
  definitions,
  currentValues,
  inputs,
  errors,
  onChange,
  recommendationParameterIds,
  onRecommendationParameterIdsChange,
  recommendationSelectableMetricIds,
  targetMode,
}: {
  definitions: RecommendationMetricDefinition[];
  currentValues: Record<string, unknown>;
  inputs: Record<string, RecommendationParameterInput>;
  errors: Record<string, string>;
  onChange: (input: RecommendationParameterInput) => void;
  recommendationParameterIds: string[];
  onRecommendationParameterIdsChange: (parameterIds: string[]) => void;
  recommendationSelectableMetricIds?: string[];
  targetMode?: RecommendationTargetMode;
}) {
  const [isValueParametersOpen, setIsValueParametersOpen] = useState(true);
  const { t, locale } = useAppLanguage();
  const isTheParameterSet = definitions.some((definition) =>
    definition.metricId.startsWith("the."),
  );
  const usesFlatParameterGrid = isTheParameterSet || definitions.every((definition) =>
    definition.parameterKind === "institutionalInput" &&
    definition.recommendationStatus === "calibration-required",
  );
  const [isRecommendationParametersOpen, setIsRecommendationParametersOpen] =
    useState(true);

  const isQsParameterSet = definitions.length > 0 && definitions.some((definition) =>
    definition.metricId === "academicStaff.total" ||
    definition.metricId === "internationalAcademicStaff.total"
  );
  if (isQsParameterSet) {
    return <QsRecommendationMetricScope {...{
      definitions, currentValues, inputs, errors, onChange,
      recommendationParameterIds, onRecommendationParameterIdsChange,
      recommendationSelectableMetricIds,
      targetMode,
    }} />;
  }

  const isGreenMetricParameterSet = definitions.some((definition) =>
    definition.metricId.startsWith("greenmetric."),
  );
  if (isGreenMetricParameterSet) {
    return <GreenMetricRecommendationMetricScope {...{
      definitions, currentValues, inputs, errors, onChange,
      recommendationParameterIds, onRecommendationParameterIdsChange,
    }} />;
  }

  return (
    <details open className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-950">{t("recommendationUi.parameterSettings")}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {t("recommendationUi.parametersOptional")}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {t("recommendationUi.parameterSettingsDescription")}
          </p>
        </div>
        <span aria-hidden="true" className="shrink-0 text-slate-500">⌄</span>
      </summary>

      <div className="space-y-5 border-t border-slate-200 p-4">
        <section className="overflow-hidden rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setIsValueParametersOpen((previous) => !previous)}
            aria-expanded={isValueParametersOpen}
            aria-controls="value-parameters-content"
            className="flex w-full cursor-pointer items-center justify-between gap-4 bg-white px-4 py-3 text-left"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">
                {t("recommendationUi.valueParametersTitle")}
              </span>
              <span className="mt-1 block text-sm font-normal text-slate-500">
                {t("recommendationUi.valueParametersDescription")}
              </span>
            </span>
            <span aria-hidden="true" className="shrink-0 text-slate-500">
              {isValueParametersOpen ? "⌃" : "⌄"}
            </span>
          </button>
          {isValueParametersOpen ? (
          <div
            id="value-parameters-content"
            className="grid grid-cols-1 items-start gap-4 border-t border-slate-200 p-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
          >
            {definitions.filter((definition) => definition.isEditableInput).map((definition, index, visibleDefinitions) => {
          const input = inputs[definition.metricId] ?? {
            parameterId: definition.metricId,
            selected: false,
            inputMode: "default" as const,
          };
          const error = errors[definition.metricId];
          const currentValue =
            currentValues[definition.engineField] ?? currentValues[definition.metricId];
          const status = getQsRecommendationParameterUiStatus(definition, {
            context: "scenario-input",
            baselineMissing: currentValue === undefined || currentValue === null,
          });
          const aggregateBaselineIsZero = definition.aggregateParts
            ? currentValue === 0
            : false;
          const aggregateScenarioIsPositive = input.inputMode === "value"
            ? (input.value ?? 0) > 0
            : input.inputMode === "range"
              ? (input.max ?? 0) > 0
              : false;

          return (
            <Fragment key={definition.metricId}>
            {!usesFlatParameterGrid && definition.groupLabel &&
            definition.groupId !== visibleDefinitions[index - 1]?.groupId ? (
              <ParameterGroupHeading
                definition={definition}
                visibleDefinitions={visibleDefinitions}
              />
            ) : null}
            <article className={`w-full rounded-xl border border-slate-200 p-3 ${input.selected ? "h-auto" : "min-h-[132px]"}`}>
              <strong
                className="block text-sm text-slate-900"
                title={definition.recommendationView === "aggregate-total"
                  ? t("recommendationUi.aggregateDistributionTitle")
                  : undefined}
              >{definition.label}</strong>
              <ParameterStatusBadge status={status} />
              <p className="mt-1 text-xs text-slate-500">
                {t("recommendationUi.currentValue")}: {formatCurrentValue(currentValue, locale)}
              </p>

              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={input.selected}
                  onChange={(event) => onChange({
                    ...input,
                    selected: event.target.checked,
                    inputMode: event.target.checked ? input.inputMode : "default",
                    value: undefined,
                    min: undefined,
                    max: undefined,
                  })}
                />
                {t("recommendationUi.changeValue")}
              </label>
              {input.selected ? (
                <div className="mt-3 space-y-3">
                  <fieldset>
                    <legend className="text-xs font-semibold text-slate-700">
                      {t("recommendationUi.inputMode")}
                    </legend>
                    <div className="mt-2 space-y-2">
                      {([
                        ["default", t("recommendationUi.keepCurrentValue")],
                        ["value", t("recommendationUi.fixedValue")],
                        ["range", t("recommendationUi.valueRange")],
                      ] as const).map(([mode, label]) => (
                        <label key={mode} className="flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="radio"
                            name={`${definition.metricId}-input-mode`}
                            value={mode}
                            checked={input.inputMode === mode}
                            onChange={() => onChange({
                              parameterId: input.parameterId,
                              selected: true,
                              inputMode: mode,
                            })}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {input.inputMode === "value" ? (
                    <label className="block text-xs font-semibold text-slate-700">
                       {t("recommendationUi.simulationValue")}
                      <input
                        type="number"
                        value={input.value ?? ""}
                        onChange={(event) => onChange({
                          ...input,
                          value: event.target.value === "" ? undefined : Number(event.target.value),
                        })}
                        className={`mt-1 h-10 w-full rounded-lg border px-2 ${error ? "border-red-500" : "border-slate-300"}`}
                        aria-invalid={Boolean(error)}
                      />
                    </label>
                  ) : null}

                  {input.inputMode === "range" ? (
                    <div className="grid grid-cols-2 gap-2">
                      {(["min", "max"] as const).map((part) => (
                        <label key={part} className="block text-xs font-semibold text-slate-700">
                          {part === "min" ? t("recommendationUi.minimumValue") : t("recommendationUi.maximumValue")}
                          <input
                            type="number"
                            value={input[part] ?? ""}
                            onChange={(event) => onChange({
                              ...input,
                              [part]: event.target.value === "" ? undefined : Number(event.target.value),
                            })}
                            className={`mt-1 h-10 w-full rounded-lg border px-2 ${error ? "border-red-500" : "border-slate-300"}`}
                            aria-invalid={Boolean(error)}
                          />
                        </label>
                      ))}
                    </div>
                  ) : null}

                  {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
                </div>
              ) : null}
              {aggregateBaselineIsZero && aggregateScenarioIsPositive ? (
                <p className="mt-2 text-xs text-amber-700">
                  {t("recommendationUi.aggregateZeroWarning")}
                </p>
              ) : null}
              </article>
              </Fragment>
            );
          })}
          </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() =>
              setIsRecommendationParametersOpen((previous) => !previous)}
            aria-expanded={isRecommendationParametersOpen}
            aria-controls="recommendation-parameters-content"
            className="flex w-full cursor-pointer items-center justify-between gap-4 bg-white px-4 py-3 text-left"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">
                 {t("recommendationUi.recommendationParametersTitle")}
              </span>
              <span className="mt-1 block text-sm font-normal text-slate-500">
                 {t("recommendationUi.recommendationParametersDescription")}
              </span>
              <span className="mt-1 block text-xs font-normal text-slate-500">
                 {t("recommendationUi.recommendationParametersEmptySelection")}
              </span>
            </span>
            <span aria-hidden="true" className="shrink-0 text-slate-500">
              {isRecommendationParametersOpen ? "⌃" : "⌄"}
            </span>
          </button>
          {isRecommendationParametersOpen ? (
          <div
            id="recommendation-parameters-content"
            className="grid grid-cols-1 items-start gap-4 border-t border-slate-200 p-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
          >
            {definitions
              .filter((definition) =>
                recommendationSelectableMetricIds
                  ? recommendationSelectableMetricIds.includes(definition.metricId)
                  : definition.affectsTotalScore &&
                    definition.isRecommendationCandidate &&
                    !definition.defaultLocked &&
                    definition.kind !== "direct-score")
              .map((definition, index, visibleDefinitions) => {
                const checked = recommendationParameterIds.includes(definition.metricId);
                const currentValue =
                  currentValues[definition.engineField] ?? currentValues[definition.metricId];
                const status = getQsRecommendationParameterUiStatus(definition, {
                  context: "recommendation-selection",
                  baselineMissing: currentValue === undefined || currentValue === null,
                });
                return (
                  <Fragment key={definition.metricId}>
                  {!usesFlatParameterGrid && definition.groupLabel &&
                  definition.groupId !== visibleDefinitions[index - 1]?.groupId ? (
                    <ParameterGroupHeading
                      definition={definition}
                      visibleDefinitions={visibleDefinitions}
                    />
                  ) : null}
                  <label
                    className="flex min-h-[132px] items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm text-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => onRecommendationParameterIdsChange(
                        toggleRecommendationParameterSelection(
                          recommendationParameterIds,
                          definition.metricId,
                          event.target.checked,
                        ),
                      )}
                    />
                    <span className="flex min-w-0 flex-col">
                      {definition.label}
                      <ParameterStatusBadge status={status} />
                    </span>
                  </label>
                  </Fragment>
                );
              })}
          </div>
          ) : null}
        </section>
      </div>
    </details>
  );
}

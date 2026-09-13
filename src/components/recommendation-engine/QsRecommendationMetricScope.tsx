"use client";

import type {
  RecommendationMetricDefinition,
  RecommendationParameterInput,
  RecommendationTargetMode,
} from "@/src/lib/recommendation-engine";
import {
  getQsRecommendationDependencyGroups,
  getQsRecommendationParameterUiStatus,
} from "@/src/lib/recommendation-engine";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { useState } from "react";

type Props = {
  definitions: RecommendationMetricDefinition[];
  currentValues: Record<string, unknown>;
  inputs: Record<string, RecommendationParameterInput>;
  errors: Record<string, string>;
  onChange: (input: RecommendationParameterInput) => void;
  recommendationParameterIds: string[];
  onRecommendationParameterIdsChange: (parameterIds: string[]) => void;
  recommendationSelectableMetricIds?: string[];
  targetMode?: RecommendationTargetMode;
};

const QS_EMPLOYMENT_PARAMETER_IDS = new Set([
  "totalGraduateStudents2023",
  "totalEmploymentRespondents",
  "employedGraduates",
  "unemployedGraduates",
  "graduatesInFullTimeFurtherStudy",
  "graduatesUnavailableForWork",
]);

export function QsRecommendationMetricScope(props: Props) {
  const { t, locale, language } = useAppLanguage();
  const groups = getQsRecommendationDependencyGroups(props.definitions, language);
  const definitions = groups.flatMap((group) => group.definitions);
  const numericRecommendationDefinitions = definitions.filter((definition) =>
    definition.eligibleForNumericRecommendation === true &&
    definition.recommendationStatus === "eligible" &&
    (!props.recommendationSelectableMetricIds ||
      props.recommendationSelectableMetricIds.includes(definition.metricId)));
  const [isValueParametersOpen, setIsValueParametersOpen] = useState(true);
  const [isRecommendationParametersOpen, setIsRecommendationParametersOpen] = useState(true);
  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        <h2 className="font-semibold">{t(props.targetMode === "rankRange"
          ? "recommendationUi.qsRankPlanningTitle"
          : "recommendationUi.qsRawPlanningTitle")}</h2>
        <p className="mt-1">{t(props.targetMode === "rankRange"
          ? "recommendationUi.qsRankPlanningDescription"
          : "recommendationUi.qsRawPlanningDescription")}</p>
        <p className="mt-2 text-xs font-medium">{t("recommendationUi.qsValueAndEngineSeparation")}</p>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setIsValueParametersOpen((previous) => !previous)}
          aria-expanded={isValueParametersOpen}
          aria-controls="value-parameters-content"
          aria-label={isValueParametersOpen ? t("recommendationUi.collapseValueParameters") : t("recommendationUi.expandValueParameters")}
          className="flex w-full cursor-pointer items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
        >
          <span className="min-w-0">
            <span className="block text-base font-semibold text-slate-950">{t("recommendationUi.valueParametersTitle")}</span>
            <span className="mt-1 block text-sm font-normal text-slate-500">{t("recommendationUi.valueParametersDescription")}</span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-slate-500">{isValueParametersOpen ? "⌃" : "⌄"}</span>
        </button>
        {isValueParametersOpen ? (
          <div id="value-parameters-content" className="grid grid-cols-1 items-stretch gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {definitions.map((definition) => (
              <QsValueCard key={definition.metricId} definition={definition} {...props} locale={locale} />
            ))}
          </div>
        ) : null}
      </section>

      <section className={`overflow-hidden rounded-xl border ${props.errors.recommendationParameters ? "border-red-300" : "border-slate-200"}`}>
        <button
          type="button"
          onClick={() => setIsRecommendationParametersOpen((previous) => !previous)}
          aria-expanded={isRecommendationParametersOpen}
          aria-controls="recommendation-parameters-content"
          aria-label={isRecommendationParametersOpen ? t("recommendationUi.collapseRecommendationParameters") : t("recommendationUi.expandRecommendationParameters")}
          className="flex w-full cursor-pointer items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
        >
          <span className="min-w-0">
            <span className="block text-base font-semibold text-slate-950">{t("recommendationUi.recommendationParametersTitle")}</span>
            <span className="mt-1 block text-sm font-normal text-slate-500">{t("recommendationUi.recommendationParametersDescription")}</span>
            <span className="mt-1 block text-xs font-normal text-slate-500">{t("recommendationUi.recommendationParametersSelectionRequired")}</span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-slate-500">{isRecommendationParametersOpen ? "⌃" : "⌄"}</span>
        </button>
        {isRecommendationParametersOpen ? (
          <div id="recommendation-parameters-content" className="grid grid-cols-1 items-stretch gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            {numericRecommendationDefinitions.length === 0 ? (
              <p className="col-span-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {t("recommendationUi.qsNoVerifiedNumericCandidates")}
              </p>
            ) : numericRecommendationDefinitions.map((definition) => {
                  const checked = props.recommendationParameterIds.includes(definition.metricId);
                  const scenarioInput = props.inputs[definition.metricId];
                  const fixedByUser = scenarioInput?.selected === true && scenarioInput.inputMode === "value";
                  return (
                    <label key={definition.metricId} className={`flex min-h-12 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm ${fixedByUser ? "bg-slate-50 text-slate-500" : "text-slate-800"}`}>
                      <input type="checkbox" checked={checked && !fixedByUser} disabled={fixedByUser} onChange={() => props.onRecommendationParameterIdsChange(
                        checked
                          ? props.recommendationParameterIds.filter((id) => id !== definition.metricId)
                          : [...props.recommendationParameterIds, definition.metricId],
                      )} />
                      <span className="flex min-w-0 flex-col">
                        {definition.label}
                        {fixedByUser
                          ? <span className="mt-1 text-[11px] font-medium text-slate-600">{t("recommendationUi.qsFixedValueLocked")}</span>
                          : <QsRecommendationCapabilityBadge definition={definition} />}
                      </span>
                    </label>
                  );
                })}
          </div>
        ) : null}
        {props.errors.recommendationParameters ? (
          <p className="border-t border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700" role="alert">
            {props.errors.recommendationParameters}
          </p>
        ) : null}
      </section>

    </section>
  );
}

function QsRecommendationCapabilityBadge({ definition }: { definition: RecommendationMetricDefinition }) {
  const status = getQsRecommendationParameterUiStatus(definition, {
    context: "recommendation-selection",
  });
  if (!status) return null;
  return <span className={`mt-1 text-[11px] font-medium ${status.canProduceNumericRecommendation ? "text-emerald-700" : "text-amber-700"}`} title={status.tooltip}>
    {status.badgeLabel}
  </span>;
}

function QsValueCard({
  definition,
  currentValues,
  inputs,
  errors,
  onChange,
  recommendationParameterIds,
  onRecommendationParameterIdsChange,
  locale,
}: Props & { definition: RecommendationMetricDefinition; locale: string }) {
  const { t } = useAppLanguage();
  const input = inputs[definition.metricId] ?? { parameterId: definition.metricId, selected: false, inputMode: "default" as const };
  const current = currentValues[definition.engineField] ?? currentValues[definition.metricId];
  const currentLabel = typeof current === "number" && Number.isFinite(current)
    ? current.toLocaleString(locale, { maximumFractionDigits: 2 })
    : t("recommendationUi.noData");
  const error = errors[definition.metricId];
  const unit = getParameterUnit(definition.metricId, t);
  const update = (next: Partial<RecommendationParameterInput>) => onChange({ ...input, ...next, parameterId: definition.metricId });
  const setMode = (mode: "value" | "range") => {
    update({ inputMode: mode, value: undefined, min: undefined, max: undefined });
    if (mode === "value" && recommendationParameterIds.includes(definition.metricId)) {
      onRecommendationParameterIdsChange(
        recommendationParameterIds.filter((id) => id !== definition.metricId),
      );
    }
  };

  return (
    <article className={`w-full rounded-xl border border-slate-200 p-3 ${input.selected ? "h-auto" : "min-h-[132px]"}`}>
      <strong className="block text-sm text-slate-900">{definition.label}</strong>
      <p className="mt-1 text-xs text-slate-500">{t("recommendationUi.currentShort")}: <span className="font-semibold text-slate-900">{currentLabel} {unit}</span></p>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={input.selected} onChange={(event) => {
          update({ selected: event.target.checked, inputMode: event.target.checked ? "value" : "default", value: undefined, min: undefined, max: undefined });
          if (event.target.checked && recommendationParameterIds.includes(definition.metricId)) {
            onRecommendationParameterIdsChange(
              recommendationParameterIds.filter((id) => id !== definition.metricId),
            );
          }
        }} />
        {t("recommendationUi.qsScenarioConstraint")}
      </label>
      {input.selected ? (
        <div className="mt-3 space-y-2">
          <div className="flex gap-3 text-xs">
            {(["value", "range"] as const).map((mode) => (
              <label key={mode} className="flex items-center gap-1">
                <input type="radio" name={`${definition.metricId}-mode`} checked={input.inputMode === mode} onChange={() => setMode(mode)} />
                {mode === "value" ? t("recommendationUi.qsFixedValueMode") : t("recommendationUi.qsEngineRangeMode")}
              </label>
            ))}
          </div>
          {input.inputMode === "value" ? <NumberInput value={input.value} error={error} onValue={(value) => update({ value })} /> : null}
          {input.inputMode === "range" ? <div className="grid grid-cols-2 gap-2"><NumberInput value={input.min} error={error} label={t("recommendationUi.minimumValue")} onValue={(min) => update({ min })} /><NumberInput value={input.max} error={error} label={t("recommendationUi.maximumValue")} onValue={(max) => update({ max })} /></div> : null}
        </div>
      ) : null}
      {error ? <p className="mt-2 text-xs font-medium text-red-700">{error}</p> : null}
    </article>
  );
}

function getParameterUnit(metricId: string, t: (key: string) => string) {
  if (QS_EMPLOYMENT_PARAMETER_IDS.has(metricId)) return t("recommendationUi.graduateUnit");
  if (metricId.includes("Student") || metricId.includes("undergraduate")) return t("recommendationUi.studentUnit");
  return t("recommendationUi.peopleUnit");
}

function NumberInput({ value, error, label, onValue }: { value?: number; error?: string; label?: string; onValue: (value?: number) => void }) {
  return <label className="block text-xs text-slate-700">{label}<input type="number" min={0} step={1} value={value ?? ""} aria-invalid={Boolean(error)} onChange={(event) => onValue(event.target.value === "" ? undefined : Number(event.target.value))} className={`mt-1 h-10 w-full rounded-lg border px-2 ${error ? "border-red-500" : "border-slate-300"}`} /></label>;
}

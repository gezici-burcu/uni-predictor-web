"use client";

import { useState } from "react";
import { greenMetricRawMetricDefinitions } from "@/src/data/greenmetric.baseline";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import type {
  RecommendationMetricDefinition,
  RecommendationParameterInput,
} from "@/src/lib/recommendation-engine";

const CATEGORY_CODES = ["SI", "EC", "WS", "WR", "TR", "ED", "GD"] as const;
const metricById = new Map(greenMetricRawMetricDefinitions.map((metric) => [metric.id, metric]));

function categoryOf(definition: RecommendationMetricDefinition) {
  return definition.categoryId ?? definition.targetIndicatorCodes?.[0]?.slice(0, 2) ?? "SI";
}

function formatCurrentValue(definition: RecommendationMetricDefinition, value: unknown, locale: string) {
  const metric = metricById.get(definition.metricId);
  if (Array.isArray(value)) {
    const labels = value.map((item) => metric?.options?.find((option) => option.value === item)?.label ?? String(item));
    return labels.length ? labels.join(", ") : "—";
  }
  if (typeof value === "string") {
    return metric?.options?.find((option) => option.value === value)?.label ?? value;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const formatted = value.toLocaleString(locale, {
    maximumFractionDigits: definition.kind === "integer-count" ? 0 : 2,
  });
  return `${formatted}${metric?.unit ? ` ${metric.unit}` : ""}`;
}

function CategoryGroup({
  code,
  definitions,
  children,
}: {
  code: typeof CATEGORY_CODES[number];
  definitions: RecommendationMetricDefinition[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(code === "SI");
  if (!definitions.length) return null;
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500">
        <span>{code}</span>
        <span className="flex items-center gap-2 text-xs font-normal text-slate-500">
          {definitions.length}
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={`h-4 w-4 text-blue-700 transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open ? <div className="grid min-w-0 gap-2 border-t border-slate-200 bg-slate-50/60 p-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {children}
      </div> : null}
    </section>
  );
}

function ScopeToggle({
  title,
  description,
  open,
  contentId,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  contentId: string;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full cursor-pointer items-center justify-between gap-4 bg-white px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-900">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500 sm:text-sm">{description}</span>
        </span>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={`h-5 w-5 shrink-0 text-blue-700 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? <div id={contentId} className="space-y-2 border-t border-slate-200 bg-slate-50/40 p-3 sm:p-4">{children}</div> : null}
    </section>
  );
}

export function GreenMetricRecommendationMetricScope({
  definitions,
  currentValues,
  inputs,
  errors,
  onChange,
  recommendationParameterIds,
  onRecommendationParameterIdsChange,
}: {
  definitions: RecommendationMetricDefinition[];
  currentValues: Record<string, unknown>;
  inputs: Record<string, RecommendationParameterInput>;
  errors: Record<string, string>;
  onChange: (input: RecommendationParameterInput) => void;
  recommendationParameterIds: string[];
  onRecommendationParameterIdsChange: (parameterIds: string[]) => void;
}) {
  const { t, locale } = useAppLanguage();
  const [valueOpen, setValueOpen] = useState(true);
  const [recommendationOpen, setRecommendationOpen] = useState(false);
  const editable = definitions.filter((definition) =>
    definition.isEditableInput && definition.parameterKind !== "computedScore" && definition.kind !== "direct-score");
  const candidates = definitions.filter((definition) =>
    definition.affectsTotalScore && definition.isRecommendationCandidate &&
    !definition.defaultLocked && definition.kind !== "direct-score");

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-4">
        <h2 className="text-base font-semibold text-slate-950">{t("recommendationUi.parameterSettings")}</h2>
        <p className="mt-1 text-sm text-slate-500">{t("recommendationUi.greenMetricParameterSettingsDescription")}</p>
      </div>
      <div className="space-y-3 p-3 sm:p-4">
        <ScopeToggle
          title={t("recommendationUi.valueParametersTitle")}
          description={t("recommendationUi.greenMetricValueParametersDescription")}
          open={valueOpen}
          contentId="greenmetric-value-parameters-content"
          onToggle={() => setValueOpen((current) => !current)}
        >
          {CATEGORY_CODES.map((code) => {
            const categoryDefinitions = editable.filter((definition) => categoryOf(definition) === code);
            return (
              <CategoryGroup key={code} code={code} definitions={categoryDefinitions}>
                {categoryDefinitions.map((definition) => {
                  const input = inputs[definition.metricId] ?? {
                    parameterId: definition.metricId,
                    selected: false,
                    inputMode: "default" as const,
                  };
                  const currentValue = currentValues[definition.engineField] ?? currentValues[definition.metricId];
                  const error = errors[definition.metricId];
                  return (
                    <article key={definition.metricId} data-recommendation-metric-id={definition.metricId} className="min-w-0 rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex min-w-0 items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1 shrink-0"
                          checked={input.selected}
                          onChange={(event) => onChange({
                            parameterId: definition.metricId,
                            selected: event.target.checked,
                            inputMode: event.target.checked ? input.inputMode : "default",
                          })}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold text-slate-900">{definition.label}</p>
                          <p className="mt-1 break-words text-xs text-slate-500">
                            {t("recommendationUi.currentValue")}: {formatCurrentValue(definition, currentValue, locale)}
                          </p>
                          <p className="mt-1 text-[11px] font-medium text-blue-700">{definition.targetIndicatorCodes?.join(" · ")}</p>
                        </div>
                      </div>
                      {input.selected ? (
                        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                          <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs text-slate-700">
                            {(["default", "value", "range"] as const).map((mode) => (
                              <label key={mode} className="flex items-center gap-1.5">
                                <input type="radio" name={`${definition.metricId}-greenmetric-mode`} checked={input.inputMode === mode} onChange={() => onChange({ parameterId: definition.metricId, selected: true, inputMode: mode })} />
                                {t(mode === "default" ? "recommendationUi.keepCurrentValue" : mode === "value" ? "recommendationUi.fixedValue" : "recommendationUi.valueRange")}
                              </label>
                            ))}
                          </div>
                          {input.inputMode === "value" ? (
                            <input
                              aria-label={`${definition.label} ${t("recommendationUi.fixedValue")}`}
                              type="number"
                              value={input.value ?? ""}
                              onChange={(event) => onChange({ ...input, value: event.target.value === "" ? undefined : Number(event.target.value) })}
                              className={`h-10 w-full min-w-0 rounded-lg border px-3 text-sm ${error ? "border-red-500" : "border-slate-300"}`}
                            />
                          ) : null}
                          {input.inputMode === "range" ? (
                            <div className="grid grid-cols-2 gap-2">
                              {(["min", "max"] as const).map((part) => (
                                <label key={part} className="text-xs font-medium text-slate-600">
                                  {t(part === "min" ? "recommendationUi.minimumValue" : "recommendationUi.maximumValue")}
                                  <input
                                    type="number"
                                    value={input[part] ?? ""}
                                    onChange={(event) => onChange({ ...input, [part]: event.target.value === "" ? undefined : Number(event.target.value) })}
                                    className={`mt-1 h-10 w-full min-w-0 rounded-lg border px-2 ${error ? "border-red-500" : "border-slate-300"}`}
                                  />
                                </label>
                              ))}
                            </div>
                          ) : null}
                          {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </CategoryGroup>
            );
          })}
        </ScopeToggle>

        <ScopeToggle
          title={t("recommendationUi.recommendationParametersTitle")}
          description={t("recommendationUi.greenMetricRecommendationParametersDescription")}
          open={recommendationOpen}
          contentId="greenmetric-recommendation-parameters-content"
          onToggle={() => setRecommendationOpen((current) => !current)}
        >
          {CATEGORY_CODES.map((code) => {
            const categoryDefinitions = candidates.filter((definition) => categoryOf(definition) === code);
            return (
              <CategoryGroup key={code} code={code} definitions={categoryDefinitions}>
                {categoryDefinitions.map((definition) => {
                  const checked = recommendationParameterIds.includes(definition.metricId);
                  return (
                    <label key={definition.metricId} className="flex min-w-0 items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
                      <input
                        type="checkbox"
                        className="mt-1 shrink-0"
                        checked={checked}
                        onChange={() => onRecommendationParameterIdsChange(
                          checked
                            ? recommendationParameterIds.filter((id) => id !== definition.metricId)
                            : [...recommendationParameterIds, definition.metricId],
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block break-words font-medium">{definition.label}</span>
                        <span className="mt-1 block text-[11px] font-medium text-blue-700">{definition.targetIndicatorCodes?.join(" · ")}</span>
                      </span>
                    </label>
                  );
                })}
              </CategoryGroup>
            );
          })}
        </ScopeToggle>
      </div>
    </section>
  );
}

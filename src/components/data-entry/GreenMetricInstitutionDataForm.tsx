"use client";

import { useMemo, useState } from "react";
import { ScrollableAccordionList } from "@/src/components/common/ScrollableAccordionList";
import { ScrollableAccordionSection } from "@/src/components/common/ScrollableAccordionSection";
import {
  GREEN_METRIC_INSTITUTION_SECTIONS,
  getGreenMetricInstitutionUnit,
  type GreenMetricInstitutionField,
  type GreenMetricInstitutionSectionId,
} from "@/src/config/data-entry/greenmetric-institution-fields";
import type { InstitutionDataYear } from "@/src/config/institution-data-years";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { useInstitutionData } from "@/src/contexts/InstitutionDataContext";
import {
  createEmptyGreenMetricValues,
  createGreenMetricInstitutionalValues,
} from "@/src/data/greenmetric.baseline";
import type { AppLanguage } from "@/src/i18n/types";
import type { GreenMetricValue, GreenMetricValues } from "@/src/types/greenmetric";
import {
  getGreenMetricRelationErrors,
  type GreenMetricRelationError,
} from "@/src/utils/greenmetric-derived";

const ENGLISH_RELATION_ERRORS: Record<string, string> = {
  "greenmetric.common.buildingGroundFloorAreaM2": "Building ground coverage cannot exceed total campus area.",
  "greenmetric.si.forestVegetationAreaM2": "Forested area cannot exceed total campus area.",
  "greenmetric.si.plantedVegetationAreaM2": "Planted vegetation area cannot exceed total campus area.",
  "greenmetric.wr.waterAbsorptionAreaM2": "Water absorption area cannot exceed total campus area.",
  "greenmetric.ec.smartBuildingAreaM2": "Smart building area cannot exceed total building floor area.",
  "greenmetric.ws.organicWasteTreatedCurrentTons": "Treated organic waste cannot exceed the generated amount.",
  "greenmetric.ws.inorganicWasteTreatedCurrentTons": "Treated inorganic waste cannot exceed the generated amount.",
  "greenmetric.ws.toxicWasteTreatedCurrentTons": "Treated toxic waste cannot exceed the generated amount.",
  "greenmetric.common.groundParkingAreaM2": "Parking area cannot exceed total campus area.",
  "greenmetric.common.sustainabilityCourseCount": "Sustainability course count cannot exceed total course count.",
  "greenmetric.common.sustainabilityResearchFundingUsd": "Sustainability research funding cannot exceed total research funding.",
  "greenmetric.common.femaleInstitutionalLeaderCount": "Female leader count cannot exceed total leader count.",
  "greenmetric.ed.greenJobGraduateCount": "Graduates working in green jobs cannot exceed total graduates.",
  "greenmetric.ec.renewableProduction.biodieselKwh": "Total renewable energy production cannot exceed total energy use.",
};

export function getGreenMetricInstitutionRelationErrorMessage(
  error: GreenMetricRelationError,
  language: AppLanguage,
) {
  if (language === "tr") return error.message;
  const translated = error.metricIds
    .map((metricId) => ENGLISH_RELATION_ERRORS[metricId])
    .find(Boolean);
  return translated ?? error.message;
}

function buildErrorsByMetric(
  errors: GreenMetricRelationError[],
  language: AppLanguage,
) {
  const result = new Map<string, string[]>();
  for (const error of errors) {
    const message = getGreenMetricInstitutionRelationErrorMessage(error, language);
    for (const metricId of error.metricIds) {
      result.set(metricId, [...(result.get(metricId) ?? []), message]);
    }
  }
  return result;
}

function NumericInstitutionField({
  field,
  year,
  baselineValue,
  value,
  errorMessages,
  onChange,
  onReset,
}: {
  field: GreenMetricInstitutionField;
  year: InstitutionDataYear;
  baselineValue: number | null;
  value: number | null;
  errorMessages: string[];
  onChange: (value: number | null) => void;
  onReset: () => void;
}) {
  const { language, t } = useAppLanguage();
  const inputId = `greenmetric-institution-${year}-${field.id}`.replace(/[^a-zA-Z0-9-_]/g, "-");
  const errorId = `${inputId}-error`;
  const unit = getGreenMetricInstitutionUnit(field.unit, language);
  const changed = value !== baselineValue;
  const formatter = useMemo(
    () => new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: 20 }),
    [language],
  );

  return (
    <div
      data-field-id={field.id}
      className={`min-w-0 rounded-xl border bg-white p-3.5 ${errorMessages.length ? "border-red-300" : "border-slate-200"}`}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1 basis-44">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <label htmlFor={inputId} className="min-w-0 break-words text-sm font-semibold text-slate-900">
              {field.localizedLabel[language]}
            </label>
            <span className={`text-[11px] font-medium ${field.required ? "text-blue-700" : "text-slate-500"}`}>
              {t(field.required ? "greenMetricInstitutionUi.required" : "greenMetricInstitutionUi.optional")}
            </span>
          </div>
          {language === "tr" && field.description ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">{field.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={!changed}
          onClick={onReset}
          className="ml-auto shrink-0 text-xs font-semibold text-blue-700 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          {t("greenMetricInstitutionUi.reset")}
        </button>
      </div>

      <div className={`mt-3 flex min-w-0 overflow-hidden rounded-lg border bg-white focus-within:ring-2 ${errorMessages.length ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-100" : "border-slate-300 focus-within:border-blue-500 focus-within:ring-blue-100"}`}>
        <input
          id={inputId}
          type="number"
          min={field.min}
          max={field.max}
          step={field.step}
          required={field.required}
          aria-invalid={errorMessages.length > 0}
          aria-describedby={errorMessages.length ? errorId : undefined}
          value={value ?? ""}
          onChange={(event) => onChange(event.currentTarget.value === "" ? null : event.currentTarget.valueAsNumber)}
          className="h-10 min-w-0 flex-1 bg-transparent px-3 text-right text-sm font-semibold text-slate-900 outline-none"
        />
        {unit ? (
          <span className="flex max-w-[45%] shrink-0 items-center whitespace-nowrap border-l border-slate-200 bg-slate-50 px-3 text-xs text-slate-600">
            {unit}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {baselineValue === null
            ? t("greenMetricInstitutionUi.noSavedValue")
            : `${t("greenMetricInstitutionUi.savedValue")}: ${formatter.format(baselineValue)}${unit ? ` ${unit}` : ""}`}
        </span>
      </div>
      {errorMessages.length ? (
        <div id={errorId} className="mt-2 space-y-1" role="alert">
          {errorMessages.map((error) => (
            <p key={error} className="text-xs font-medium leading-5 text-red-700">{error}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function GreenMetricInstitutionDataForm({ year }: { year: InstitutionDataYear }) {
  const { language, t } = useAppLanguage();
  const { getGreenMetricYearData, saveGreenMetricYear, clearGreenMetricYear } = useInstitutionData();
  const initial = useMemo<GreenMetricValues>(() => createGreenMetricInstitutionalValues(
    getGreenMetricYearData(year),
  ), [getGreenMetricYearData, year]);
  const [draft, setDraft] = useState<GreenMetricValues>(initial);
  const [message, setMessage] = useState("");
  const [openSection, setOpenSection] = useState<GreenMetricInstitutionSectionId | null>("campus");
  const relationErrors = useMemo(() => getGreenMetricRelationErrors(draft), [draft]);
  const errorsByMetric = useMemo(
    () => buildErrorsByMetric(relationErrors, language),
    [language, relationErrors],
  );

  const update = (id: string, value: GreenMetricValue) => {
    setDraft((current) => ({ ...current, [id]: value }));
    setMessage("");
  };

  const save = () => {
    if (relationErrors.length) {
      setMessage(t("dataEntry.completeRequiredFields"));
      return;
    }
    saveGreenMetricYear(year, draft);
    setMessage(t("dataEntry.savedSuccessfully"));
  };

  const discard = () => {
    setDraft(initial);
    setMessage("");
  };

  const clear = () => {
    clearGreenMetricYear(year);
    setDraft(createEmptyGreenMetricValues());
    setMessage("");
  };

  return (
    <section className="mt-5 min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-950 sm:text-xl">{t("greenMetricInstitutionUi.title")}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{t("greenMetricInstitutionUi.description")}</p>
        </div>
        <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {t("dataEntry.dataYear")}: {year}
        </span>
      </div>

      <ScrollableAccordionList className="mt-5">
        {GREEN_METRIC_INSTITUTION_SECTIONS.map((section) => {
          const isOpen = openSection === section.id;
          return (
            <ScrollableAccordionSection
              key={section.id}
              id={`greenmetric-institution-${year}-${section.id}`}
              isOpen={isOpen}
              onToggle={() => setOpenSection(isOpen ? null : section.id)}
              header={(
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-900 sm:text-base">{section.title[language]}</h3>
                    <p className="mt-0.5 hidden truncate text-xs text-slate-500 sm:block">{section.description[language]}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-500">
                    {section.fields.length} {t("greenMetricInstitutionUi.fieldCount")}
                  </span>
                </div>
              )}
              contentClassName="bg-slate-50/70 p-3 sm:p-4"
            >
              <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
                {section.fields.map((field) => {
                  const storedBaselineValue = initial[field.id];
                  const draftValue = draft[field.id];
                  const baselineValue = typeof storedBaselineValue === "number" ? storedBaselineValue : null;
                  const value = typeof draftValue === "number" ? draftValue : null;
                  return (
                    <NumericInstitutionField
                      key={field.id}
                      field={field}
                      year={year}
                      baselineValue={baselineValue}
                      value={value}
                      errorMessages={errorsByMetric.get(field.id) ?? []}
                      onChange={(nextValue) => update(field.id, nextValue)}
                      onReset={() => update(field.id, baselineValue)}
                    />
                  );
                })}
              </div>
            </ScrollableAccordionSection>
          );
        })}
      </ScrollableAccordionList>

      {message ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" aria-live="polite">
          {message}
        </p>
      ) : null}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={save} className="rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white">
          {t("dataEntry.save")}
        </button>
        <button type="button" onClick={discard} className="rounded-lg border px-4 py-2.5 font-semibold">
          {t("dataEntry.discard")}
        </button>
        <button type="button" onClick={clear} className="rounded-lg border border-red-200 px-4 py-2.5 font-semibold text-red-700">
          {t("dataEntry.clearYear")}
        </button>
      </div>
    </section>
  );
}

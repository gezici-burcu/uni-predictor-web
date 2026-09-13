"use client";

import { useState } from "react";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { THE_INSTITUTION_DATA_FIELDS } from "@/src/config/data-entry/the-institution-fields";
import { theCategories } from "@/src/config/the.metrics";
import { THE_FLAT_PARAMETER_DEFINITIONS, THE_PARAMETER_DISPLAY_METADATA, THE_UNVERIFIED_RAW_TO_SCORE_PARAMETER_IDS } from "@/src/config/the-simulator-parameters";
import {
  getTheInstitutionalScenarioKey,
  type TheScenarioOverrideValues,
} from "@/src/lib/the/institutional-scenario";

type Props = {
  baselineValues: Record<string, number | null>;
  scenarioChanges: TheScenarioOverrideValues;
};
type DisplayDefinition = {
  label: string;
  unit: string;
  affectsCalculation: boolean;
};

const definitions = new Map<string, DisplayDefinition>();
const displayLabels = new Map(
  THE_FLAT_PARAMETER_DEFINITIONS.map(({ scenarioKey, label }) => [scenarioKey, label]),
);
for (const metric of theCategories.flatMap((category) => category.metrics)) {
  if (!definitions.has(metric.id)) {
    definitions.set(metric.id, {
      label: metric.label,
      unit: metric.unit ?? "",
      affectsCalculation: !metric.subgroup?.startsWith("Bilgi Amaçlı"),
    });
  }
}
for (const field of THE_INSTITUTION_DATA_FIELDS) {
  const key = getTheInstitutionalScenarioKey(field.id);
  definitions.set(key, {
    label: field.label.tr,
    unit: field.unit.tr,
    affectsCalculation: field.affectsCalculation ||
      field.calculationMetricId !== undefined ||
      [
        "internationalAcademicStaffFte",
        "internationalStudentsFte",
        "researchIncome",
        "industryCommerceResearchIncome",
      ].includes(field.id),
  });
}

const localeFor = (language: "tr" | "en") => language === "tr" ? "tr-TR" : "en-US";
const magnitude = (value: number) => value < 0 ? -value : value;

export function formatTheChangedMetricValue(
  parameterId: string,
  value: number | null,
  language: "tr" | "en",
  signed = false,
): string {
  if (value === null) return "—";
  const metadata = THE_PARAMETER_DISPLAY_METADATA[parameterId];
  const locale = localeFor(language);
  const sign = signed && value !== 0 ? value > 0 ? "+" : "−" : "";
  const unsignedValue = signed ? magnitude(value) : value;
  if (metadata?.format === "income") {
    const divisor = magnitude(value) >= 1_000_000_000 ? 1_000_000_000 : 1_000_000;
    const suffix = divisor === 1_000_000_000
      ? language === "tr" ? "Mlr" : "B"
      : language === "tr" ? "Mn" : "M";
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(unsignedValue / divisor);
    return `${sign}${formatted}${language === "tr" ? " " : ""}${suffix}`;
  }
  const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(unsignedValue);
  const unit = metadata?.unit[language] ?? "";
  return `${sign}${formatted}${unit ? ` ${unit}` : ""}`;
}

const incomeTitle = (value: number, language: "tr" | "en") => {
  const formatted = new Intl.NumberFormat(localeFor(language), { maximumFractionDigits: 2 }).format(value);
  return language === "tr"
    ? `Kaynak sistemde bildirilen para birimiyle ${formatted}`
    : `${formatted} in the currency reported by the source system`;
};

export function TheChangedMetricsPanel({
  baselineValues,
  scenarioChanges,
}: Props) {
  const { t, language } = useAppLanguage();
  const [showAll, setShowAll] = useState(false);
  const changes = Object.entries(scenarioChanges).flatMap(
    ([id, scenarioValue]) => {
      if (typeof scenarioValue !== "number" || !Number.isFinite(scenarioValue)) {
        return [];
      }
      const definition = definitions.get(id) ?? {
        label: id,
        unit: "",
        affectsCalculation: true,
      };
      const affectsCalculation = !THE_UNVERIFIED_RAW_TO_SCORE_PARAMETER_IDS.has(id) && definition.affectsCalculation;
      const rawBaseline = baselineValues[id];
      const baselineValue =
        typeof rawBaseline === "number" && Number.isFinite(rawBaseline)
          ? rawBaseline
          : null;
      return [{ id, definition: { ...definition, affectsCalculation }, baselineValue, scenarioValue }];
    },
  );
  const reflectedChanges = changes.filter(({ definition }) => definition.affectsCalculation);
  const unreflectedChanges = changes.filter(({ definition }) => !definition.affectsCalculation);
  const orderedChanges = [...reflectedChanges, ...unreflectedChanges];
  const visibleChanges = showAll ? orderedChanges : orderedChanges.slice(0, 6);

  return (
    <section className="data-panel min-w-0 overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5"><div className="flex items-center gap-3"><span aria-hidden="true" className="flex size-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600"><svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 18V9m5 9V5m5 13v-6m5 6V3"/></svg></span><h2 className="text-base font-bold text-slate-950">{t("theUi.changedMetrics")}</h2></div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{t("theUi.reflectedChanges")}: {reflectedChanges.length}</span><span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">{t("theUi.unreflectedChanges")}: {unreflectedChanges.length}</span></div></div>
      <div className="p-4 sm:px-5">
      {changes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-600">
          {t("theUi.noChangedMetrics")}
        </p>
      ) : (
        <>
          <div className="max-w-full overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[560px] table-fixed text-left text-sm sm:min-w-0">
              <colgroup><col className="w-[32%]" /><col className="w-[23%]" /><col className="w-[23%]" /><col className="w-[22%]" /></colgroup>
              <thead className="border-y border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">{t("theUi.metric")}</th>
                  <th className="px-2 py-2 text-right sm:px-3">{t("theUi.currentValue")}</th>
                  <th className="px-2 py-2 text-right sm:px-3">{t("theUi.scenarioValue")}</th>
                  <th className="px-2 py-2 text-right sm:px-3">{t("theUi.difference")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleChanges.map(
                  ({ id, definition, baselineValue, scenarioValue }) => {
                    const difference =
                      baselineValue === null
                        ? null
                        : scenarioValue - baselineValue;
                    return (
                      <tr key={id} data-metric-key={id} data-score-impact={definition.affectsCalculation ? "reflected" : "unavailable"} className={definition.affectsCalculation ? "group" : "group bg-amber-50/50"}>
                        <th className="break-words px-3 py-2 font-medium text-slate-900 [overflow-wrap:anywhere]">
                          {displayLabels.get(id)?.[language] ?? definition.label}
                          {!definition.affectsCalculation ? (
                            <span className="mt-1 block text-xs font-normal text-slate-500">
                              {t("theUi.scoreImpactUnavailableDetail")}
                            </span>
                          ) : null}
                          <span className="sr-only"> ({id})</span>
                        </th>
                        <td className="break-words px-2 py-2 text-right tabular-nums text-slate-700 sm:px-3" title={baselineValue !== null && THE_PARAMETER_DISPLAY_METADATA[id]?.format === "income" ? incomeTitle(baselineValue, language) : undefined}>
                          {formatTheChangedMetricValue(id, baselineValue, language)}
                        </td>
                        <td className="break-words px-2 py-2 text-right tabular-nums font-medium text-blue-700 sm:px-3" title={THE_PARAMETER_DISPLAY_METADATA[id]?.format === "income" ? incomeTitle(scenarioValue, language) : undefined}>
                          {formatTheChangedMetricValue(id, scenarioValue, language)}
                        </td>
                        <td className="break-words px-2 py-2 text-right tabular-nums font-semibold sm:px-3">
                          {difference === null
                            ? "—"
                            : formatTheChangedMetricValue(id, difference, language, true)}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
          {changes.length > 6 ? (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-800"
              aria-expanded={showAll}
            >
              {showAll ? t("theUi.showLess") : t("theUi.showAllChanges")}
            </button>
          ) : null}
        </>
      )}</div>
    </section>
  );
}

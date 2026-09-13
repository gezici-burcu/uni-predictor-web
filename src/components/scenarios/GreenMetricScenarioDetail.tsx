"use client";

import { greenMetricCategoryMeta } from "@/src/config/greenmetric.categories";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { scenarioComparisonUiTranslations } from "@/src/i18n/scenario-comparison-ui";
import {
  formatGreenMetricScenarioValue,
  getGreenMetricScenarioParameterLabel,
} from "@/src/lib/scenarios/scenario-presentation";
import type { SavedScenarioSnapshot } from "@/src/types/saved-scenario";

const CATEGORY_LABELS = {
  SI: { tr: "Yerleşim ve Altyapı", en: "Setting and Infrastructure" },
  EC: { tr: "Enerji ve İklim Değişikliği", en: "Energy and Climate Change" },
  WS: { tr: "Atık", en: "Waste" },
  WR: { tr: "Su", en: "Water" },
  TR: { tr: "Ulaşım", en: "Transportation" },
  ED: { tr: "Eğitim ve Araştırma", en: "Education and Research" },
  GD: { tr: "Yönetişim ve Dijitalleşme", en: "Governance and Digitalization" },
} as const;

export function GreenMetricScenarioDetail({
  scenario,
  onClose,
}: {
  scenario: SavedScenarioSnapshot;
  onClose: () => void;
}) {
  const { language, locale } = useAppLanguage();
  const ui = scenarioComparisonUiTranslations[language];
  const changes = uniqueChanges(scenario.changedMetrics);
  const hasRank = scenario.currentRankBand !== null || scenario.scenarioRankBand !== null;

  return (
    <section className="min-w-0 rounded-xl border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-bold text-slate-950">{scenario.name}</h2>
          <p className="mt-1 text-xs text-slate-500">UI GreenMetric 2026 · {sourceLabel(scenario.source, language)}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-md border px-2.5 py-1.5 text-xs font-semibold text-slate-700">
          {ui.close}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        <SummaryItem label={ui.greenMetricBaselineScore} value={formatGreenMetricScore(scenario.currentScore, locale)} />
        <SummaryItem label={ui.greenMetricScenarioScore} value={formatGreenMetricScore(scenario.scenarioScore, locale)} emphasized />
        <SummaryItem label={ui.scoreDifference} value={formatSigned(scenario.scoreDifference, locale)} tone={tone(scenario.scoreDifference)} />
        <SummaryItem
          label={ui.estimatedRankBand}
          value={`${scenario.currentRankBand ?? "—"} → ${scenario.scenarioRankBand ?? "—"}`}
          hint={hasRank ? ui.greenMetricRankApproximate : ui.noRankData}
        />
        <SummaryItem label={ui.changedParameters} value={changes.length.toLocaleString(locale)} />
      </div>

      <details open className="group mt-4 rounded-lg border border-slate-200">
        <summary className="cursor-pointer list-none px-3 py-2.5 font-semibold text-slate-900 marker:content-none">
          <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="text-slate-400 group-open:rotate-90">›</span>{ui.categoryComparison}</span>
        </summary>
        <div className="grid gap-2 border-t border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {greenMetricCategoryMeta.map((category) => {
            const baseline = finiteScore(scenario.currentCategoryScores?.[category.code]);
            const proposed = finiteScore(scenario.scenarioCategoryScores?.[category.code]);
            const difference = baseline === null || proposed === null ? null : proposed - baseline;
            return (
              <article key={category.code} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><span className="text-xs font-bold text-blue-700">{category.code}</span><h3 className="truncate text-sm font-semibold" title={CATEGORY_LABELS[category.code][language]}>{CATEGORY_LABELS[category.code][language]}</h3></div>
                  <span className={`shrink-0 text-xs font-semibold tabular-nums ${toneClass(difference)}`}>{formatSigned(difference, locale)}</span>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <ScoreDatum label={ui.baseline} value={formatCategoryScore(baseline, category.maxScore, locale)} />
                  <ScoreDatum label={ui.scenarioColumnValue} value={formatCategoryScore(proposed, category.maxScore, locale)} />
                </dl>
              </article>
            );
          })}
        </div>
      </details>

      <details open className="group mt-3 rounded-lg border border-slate-200">
        <summary className="cursor-pointer list-none px-3 py-2.5 font-semibold text-slate-900 marker:content-none">
          <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="text-slate-400 group-open:rotate-90">›</span>{ui.changedParameters} · {changes.length}</span>
        </summary>
        <div className="border-t border-slate-200 p-3">
          {changes.length ? (
            <div className="grid gap-2 lg:grid-cols-2">
              {changes.map((change) => (
                <article key={metricKey(change)} className="min-w-0 rounded-lg border border-slate-200 p-3">
                  <h3 className="break-words text-sm font-semibold">{getGreenMetricScenarioParameterLabel(change.parameterId, change.label, language)}</h3>
                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-sm tabular-nums">
                    <span className="min-w-0 break-words text-slate-500">{formatGreenMetricScenarioValue(change.parameterId, change.currentValue, language, locale)}</span>
                    <span aria-hidden="true" className="text-slate-400">→</span>
                    <span className="min-w-0 break-words font-semibold text-slate-950">{formatGreenMetricScenarioValue(change.parameterId, change.scenarioValue, language, locale)}</span>
                  </div>
                  {typeof change.numericScoreEffect === "number" && Number.isFinite(change.numericScoreEffect) ? (
                    <p className="mt-2 text-xs text-slate-500">{ui.scoreEffect}: <span className={`font-semibold ${toneClass(change.numericScoreEffect)}`}>{formatSigned(change.numericScoreEffect, locale)}</span></p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">{ui.noChangedParameters}</p>}
        </div>
      </details>

      {scenario.warnings.length ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-semibold">{ui.warnings}</p>
          <ul className="mt-1 list-disc pl-5">{scenario.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </div>
      ) : null}
    </section>
  );
}

function SummaryItem({ label, value, hint, emphasized = false, tone: itemTone = "neutral" }: { label: string; value: string; hint?: string; emphasized?: boolean; tone?: "positive" | "negative" | "neutral" }) {
  return <div className="min-w-0 rounded-lg border border-slate-200 p-3"><dt className="text-[11px] text-slate-500">{label}</dt><dd className={`${emphasized ? "text-base font-bold" : "font-semibold"} mt-0.5 break-words tabular-nums ${itemTone === "positive" ? "text-emerald-700" : itemTone === "negative" ? "text-red-700" : "text-slate-950"}`}>{value}</dd>{hint ? <p className="mt-1 text-[11px] leading-4 text-slate-400">{hint}</p> : null}</div>;
}

function ScoreDatum({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-slate-500">{label}</dt><dd className="mt-0.5 break-words font-semibold tabular-nums text-slate-900">{value}</dd></div>;
}

const finiteScore = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? value : null;
const formatGreenMetricScore = (value: number | null, locale: string) => finiteScore(value) === null ? "— / 10.000" : `${value!.toLocaleString(locale, { maximumFractionDigits: 2 })} / 10.000`;
const formatCategoryScore = (value: number | null, maximum: number, locale: string) => value === null ? `— / ${maximum.toLocaleString(locale)}` : `${value.toLocaleString(locale, { maximumFractionDigits: 2 })} / ${maximum.toLocaleString(locale)}`;
const formatSigned = (value: number | null, locale: string) => value === null || !Number.isFinite(value) ? "—" : value === 0 ? "0" : `${value > 0 ? "+" : "−"}${Math.abs(value).toLocaleString(locale, { maximumFractionDigits: 2 })}`;
const tone = (value: number | null): "positive" | "negative" | "neutral" => value === null || value === 0 ? "neutral" : value > 0 ? "positive" : "negative";
const toneClass = (value: number | null) => value === null || value === 0 ? "text-slate-500" : value > 0 ? "text-emerald-700" : "text-red-700";
const metricKey = (change: SavedScenarioSnapshot["changedMetrics"][number]) => `${change.parameterId}::${change.field ?? ""}`;
const uniqueChanges = (changes: SavedScenarioSnapshot["changedMetrics"]) => [...new Map(changes.map((change) => [metricKey(change), change])).values()];
const sourceLabel = (source: SavedScenarioSnapshot["source"], language: "tr" | "en") => source === "manual-scenario" ? language === "tr" ? "Manuel Senaryo" : "Manual Scenario" : source === "recommendation-engine" ? language === "tr" ? "Öneri Motoru" : "Recommendation Engine" : language === "tr" ? "Ham Veri Analizi" : "Raw Data Analysis";


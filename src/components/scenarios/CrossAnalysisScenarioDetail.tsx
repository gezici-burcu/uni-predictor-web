"use client";

import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { getTranslation } from "@/src/i18n/getTranslation";
import {
  CROSS_ANALYSIS_ARCHIVED_PARAMETER_BY_ID,
  CROSS_ANALYSIS_PARAMETER_BY_ID,
} from "@/src/lib/cross-analysis";
import { formatCrossAnalysisScore } from "@/src/components/cross-analysis/crossAnalysisUi";
import { CrossAnalysisImpactDetails } from "@/src/components/cross-analysis/CrossAnalysisImpactDetails";
import type {
  CrossAnalysisMethodologyResult,
} from "@/src/lib/cross-analysis/types";
import type { SavedCrossAnalysisScenarioSnapshot } from "@/src/types/saved-scenario";

const methodologies = [
  { id: "the", label: "THE" },
  { id: "qs", label: "QS" },
] as const;

export function CrossAnalysisScenarioDetail({
  scenario,
  onClose,
}: {
  scenario: SavedCrossAnalysisScenarioSnapshot;
  onClose: () => void;
}) {
  const { language, locale } = useAppLanguage();
  const t = (key: string) => getTranslation(language, `crossAnalysisUi.${key}`);
  const snapshot = scenario.crossAnalysis;
  return <section className="min-w-0 space-y-4 rounded-xl border bg-white p-5">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{t("crossAnalysisLabel")}</span>
        <h2 className="mt-2 break-words text-xl font-bold text-slate-950">{scenario.name}</h2>
        <p className="mt-1 text-xs text-slate-500">{t("createdAt")}: {new Date(scenario.createdAt).toLocaleString(locale)} · {scenario.institutionalDataYear}</p>
      </div>
      <button type="button" onClick={onClose} className="rounded-lg border px-3 py-1.5 text-sm font-semibold text-slate-700">{t("close")}</button>
    </div>

    <section>
      <h3 className="font-bold text-slate-900">{t("changedParameters")} ({snapshot.overrides.length})</h3>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {snapshot.overrides.map((input) => {
          const definition = CROSS_ANALYSIS_PARAMETER_BY_ID.get(input.parameterId) ??
            CROSS_ANALYSIS_ARCHIVED_PARAMETER_BY_ID.get(input.parameterId);
          return <article key={input.parameterId} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-slate-900">{definition?.labels[language] ?? input.parameterId}</p>
              <div className="flex gap-1">{definition?.affectedMethodologies.map((methodology) => <span key={methodology} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold uppercase text-slate-600">{methodology}</span>)}</div>
            </div>
            <p className="mt-2 text-sm tabular-nums text-slate-700">{input.baselineValue.toLocaleString(locale)} → <strong>{input.proposedValue.toLocaleString(locale)}</strong> {definition?.unit}</p>
          </article>;
        })}
      </div>
    </section>

    <section>
      <h3 className="font-bold text-slate-900">{t("methodologyEffects")}</h3>
      <div className="mt-2 grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
        {methodologies.map((methodology) => <SavedMethodologyResult key={methodology.id} methodology={methodology} result={snapshot.resultSnapshot.methodologies[methodology.id]} locale={locale} language={language} t={t} />)}
      </div>
    </section>
  </section>;
}

function SavedMethodologyResult({
  methodology,
  result,
  locale,
  language,
  t,
}: {
  methodology: typeof methodologies[number];
  result: CrossAnalysisMethodologyResult<unknown>;
  locale: string;
  language: "tr" | "en";
  t: (key: string) => string;
}) {
  return <article className="flex min-h-56 min-w-0 flex-col rounded-xl border border-slate-200 p-4">
    <h4 className="font-bold text-slate-950">{methodology.label}</h4>
    {!result.affected ? <>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Score label={t("current")} value={formatCrossAnalysisScore(result.baselineScore, methodology.id, locale)} />
        <span aria-hidden="true" className="text-slate-300">→</span>
        <Score label={t("newValue")} value={formatCrossAnalysisScore(result.proposedScore, methodology.id, locale)} right />
      </div>
      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-center text-sm"><span className="text-slate-500">{t("difference")}</span> <strong>{result.baselineContext.usable ? t("summaryUnaffected") : t("notAvailable")}</strong></p>
      <p className="mt-3 text-xs font-semibold uppercase text-slate-500">{t("estimatedRank")}</p>
      <p className="mt-1 font-semibold text-slate-900">{result.baselineRankBand ?? t("notAvailable")} → {result.proposedRankBand ?? t("notAvailable")}</p>
      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-center text-sm text-slate-600">{t("notAffected")}</p>
    </>
      : result.status === "insufficient-data" ? <div className="my-auto rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800"><p className="text-center">{t("sufficientDataMissing")}</p><CrossAnalysisImpactDetails methodology={methodology.id} metricCodes={result.missingMetrics} language={language} summary={t("missingMetrics")} weightedLabel={t("scoreImpactWeighted")} indicatorOnlyLabel={t("scoreImpactIndicatorOnly")} className="mt-3" /></div>
        : result.status === "invalid" ? <p className="my-auto rounded-lg bg-red-50 p-3 text-center text-sm font-semibold text-red-800">{t("invalidData")}</p>
          : <>
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <Score label={t("current")} value={formatCrossAnalysisScore(result.baselineScore, methodology.id, locale)} />
              <span aria-hidden="true" className="text-slate-300">→</span>
              <Score label={t("newValue")} value={formatCrossAnalysisScore(result.proposedScore, methodology.id, locale)} right />
            </div>
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-center text-sm"><span className="text-slate-500">{t("difference")}</span> <strong>{formatCrossAnalysisScore(result.scoreDelta, methodology.id, locale, true)}</strong></p>
            {result.scoreDelta === 0 && result.propagation?.rawChangedMetrics.length && result.propagation.scoreChangedMetrics.length === 0 && result.propagation.heldConstantMetrics.length ? <p className="mt-2 text-xs leading-5 text-slate-500">{t("dependencyWithoutScoreChange")}</p> : null}
            <p className="mt-3 text-xs font-semibold uppercase text-slate-500">{t("estimatedRank")}</p>
            <p className="mt-1 font-semibold text-slate-900">{result.baselineRankBand ?? t("notAvailable")} → {result.proposedRankBand ?? t("notAvailable")}</p>
            <CrossAnalysisImpactDetails methodology={methodology.id} metricCodes={result.impactedMetrics} language={language} summary={t("impactedMetrics")} weightedLabel={t("scoreImpactWeighted")} indicatorOnlyLabel={t("scoreImpactIndicatorOnly")} className="mt-auto pt-3" />
          </>}
  </article>;
}

function Score({ label, value, right = false }: { label: string; value: string; right?: boolean }) {
  return <div className={right ? "text-right" : ""}><p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 break-words font-bold tabular-nums text-slate-950">{value}</p></div>;
}

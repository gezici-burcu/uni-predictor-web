"use client";

import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import type { QsRankEstimationResult } from "@/src/types/qs-rank-estimation";
import type { QsStochasticSimulationResult } from "@/src/types/qs-stochastic";

export function QsCalculationMethod({ simulation, rankEstimation }: { simulation: QsStochasticSimulationResult; rankEstimation: QsRankEstimationResult }) {
  const { t, locale } = useAppLanguage();
  const ready = simulation.scenario.overallStatus === "ready";
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <h2 className="font-semibold text-slate-950">{t("qsResultsUi.method")}</h2>
    <p className="mt-2 text-sm text-slate-600">{t("qsResultsUi.methodComposite")}</p>
    <p className="mt-2 text-sm text-slate-600">{ready ? t("qsResultsUi.methodReady") : t("qsResultsUi.methodMissing")}</p>
    <details className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">{t("qsResultsUi.methodDetails")}</summary>
      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
        <div><dt>{t("qsResultsUi.methodology")}</dt><dd className="font-semibold">QS {simulation.methodologyYear}</dd></div>
        <div><dt>{t("qsResultsUi.scoreModel")}</dt><dd className="font-semibold">{simulation.modelVersion}</dd></div>
        <div><dt>{t("qsResultsUi.rankingModel")}</dt><dd className="font-semibold">{rankEstimation.modelVersion}</dd></div>
        <div><dt>{t("qsResultsUi.reference")}</dt><dd className="font-semibold">{rankEstimation.diagnostics.completeReferenceRecords.toLocaleString(locale)} / {rankEstimation.selectedK}</dd></div>
        <div><dt>{t("qsResultsUi.distance")}</dt><dd className="font-semibold">{t("qsResultsUi.robustDistance")}</dd></div>
        <div><dt>{t("qsResultsUi.calibration")}</dt><dd className="font-semibold">{rankEstimation.calibration.publishedBand}</dd></div>
      </dl>
      <p className="mt-2">{t("qsResultsUi.methodTechnical")}</p>
    </details>
  </section>;
}

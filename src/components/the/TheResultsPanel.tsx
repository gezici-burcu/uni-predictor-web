"use client";

import type { InstitutionDataYear } from "@/src/config/institution-data-years";
import type { TheStochasticSimulationResult } from "@/src/lib/the/stochastic/run-the-stochastic-simulation";
import { THE_STOCHASTIC_MODEL_CONFIG } from "@/src/lib/the/stochastic/the-stochastic-model-config";
import { TheCompactResultsTable } from "./TheCompactResultsTable";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import type { TheRankBandPresentation } from "@/src/lib/the/the-rank-band-source";

export function TheResultsPanel({ simulation, institutionalDataYear, rankBands }: { simulation: TheStochasticSimulationResult; institutionalDataYear: InstitutionDataYear | null; rankBands?: TheRankBandPresentation }) {
  const { t, locale } = useAppLanguage();
  return <div className="min-w-0 space-y-3">
    <section className="data-panel min-w-0 overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-5"><span aria-hidden="true" className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg></span><h2 className="text-base font-bold text-slate-950">{t("theUi.resultsTable")}</h2></div>
      <div className="p-4 sm:px-5"><TheCompactResultsTable simulation={simulation} rankBands={rankBands} /></div>
    </section>
    <section className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">{t("theUi.calculationMethod")}</h2>
      <p className="mt-1 text-sm text-slate-600">{t("theUi.compactMethodDescription").replace("{count}", new Intl.NumberFormat(locale).format(simulation.runCount))}</p>
      <details className="mt-2 text-xs text-slate-600"><summary className="cursor-pointer font-medium">{t("theUi.methodDetails")}</summary><dl className="mt-2 grid gap-1 sm:grid-cols-2">
        <div>{t("theUi.modelType")}: {t("theUi.stochastic")}</div><div>{t("theUi.runCount")}: {simulation.runCount}</div>
        <div>{t("theUi.modelVersion")}: {simulation.modelVersion}</div><div>{t("theUi.institutionalYear")}: {institutionalDataYear ?? "—"}</div>
        <div>{t("theUi.calibrationYear")}: {THE_STOCHASTIC_MODEL_CONFIG.institutionalBaselineYear}</div><div>{t("theUi.referenceInstitutions")}: {simulation.diagnostics.usedReferenceInstitutionCount}</div>
        <div>{t("theUi.seed")}: {simulation.seed}</div><div>{t("theUi.stochasticIndicators")}: {simulation.diagnostics.stochasticIndicatorCount}</div>
        <div>{t("theUi.modelInputsUsed")}: {simulation.diagnostics.unavailableIndicatorCount}</div>
      </dl></details>
    </section>
  </div>;
}

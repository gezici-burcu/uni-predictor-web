"use client";

import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import type { TheStochasticSimulationResult } from "@/src/lib/the/stochastic/run-the-stochastic-simulation";
import { formatTheScoreDifference } from "@/src/lib/the/format-the-score-difference";
import type { TheRankBandPresentation } from "@/src/lib/the/the-rank-band-source";
import { getMethodologyCategoryLabel } from "@/src/lib/scenarios/scenario-presentation";

const roundedScore = (value: number) => Math.round((value + 1e-9) * 100) / 100;
const displayedDifference = (current: number, scenario: number) => roundedScore(scenario) - roundedScore(current);
const categories = ["teaching", "researchEnvironment", "researchQuality", "internationalOutlook", "industry"] as const;

export function TheCompactResultsTable({ simulation, rankBands }: { simulation: TheStochasticSimulationResult; rankBands?: TheRankBandPresentation }) {
  const { t, locale, language } = useAppLanguage();
  const formatScore = (value: number) => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(roundedScore(value));
  const rows = categories.map((key) => ({
    key,
    label: getMethodologyCategoryLabel("THE", key, language),
    current: simulation.current.categories[key].median,
    scenario: simulation.scenario.categories[key].median,
    difference: displayedDifference(simulation.current.categories[key].median, simulation.scenario.categories[key].median),
  }));
  const overallDifference = simulation.change.overallMedianDifference;
  return <div className="overflow-x-auto rounded-xl border border-slate-100"><table className="w-full min-w-[460px] text-left text-sm">
    <thead className="bg-slate-50/90 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500"><tr>
      <th className="px-3 py-2">{t("theUi.indicator")}</th><th className="px-3 py-2">{t("theUi.current")}</th><th className="px-3 py-2">{t("theUi.scenario")}</th><th className="px-3 py-2">{t("theUi.difference")}</th>
    </tr></thead>
    <tbody className="divide-y divide-slate-100">
      {rows.map((row) => <tr key={row.key}><th className="px-3 py-3 font-semibold text-slate-800">{row.label}</th><td className="px-3 py-3 tabular-nums text-slate-600">{formatScore(row.current)}</td><td className="px-3 py-3 tabular-nums"><span className="inline-flex rounded-lg bg-blue-50 px-2 py-1 font-bold text-blue-700">{formatScore(row.scenario)}</span></td><td className="px-3 py-3 tabular-nums"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${row.difference > 0 ? "bg-emerald-50 text-emerald-700" : row.difference < 0 ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>{formatTheScoreDifference(row.difference, locale)}</span></td></tr>)}
      <tr className="bg-slate-50/70"><th className="px-3 py-2 font-medium">{t("theUi.overallScore")}</th><td className="px-3 py-2">{formatScore(simulation.current.overallMedian)}</td><td className="px-3 py-2 font-medium text-blue-700">{formatScore(simulation.scenario.overallMedian)}</td><td className="px-3 py-2">{formatTheScoreDifference(overallDifference, locale)}</td></tr>
      <tr className="bg-slate-50/70"><th className="px-3 py-2 font-medium">{t("theUi.estimatedRankBand")}</th><td className="px-3 py-2"><span className="block">{rankBands?.currentBand ?? simulation.current.predictedRankBand ?? "—"}</span>{rankBands?.currentSource === "official-reference" ? <span className="block text-[11px] text-slate-400">{t("theUi.officialCurrentBandDetail")}</span> : null}</td><td className="px-3 py-2 font-medium text-blue-700"><span className="block">{rankBands?.scenarioBand ?? simulation.scenario.predictedRankBand ?? "—"}</span>{rankBands ? <span className="block text-[11px] font-normal text-slate-400">{rankBands.scenarioSource === "official-reference" ? t("theUi.sameOfficialBandDetail") : t("theUi.estimatedScenarioBandDetail")}</span> : null}</td><td className="px-3 py-2">—</td></tr>
    </tbody>
  </table></div>;
}

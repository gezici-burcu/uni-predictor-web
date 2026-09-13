"use client";

import type {
  IndicatorChangeDiagnostic,
  TheStochasticSimulationResult,
} from "@/src/lib/the/stochastic/run-the-stochastic-simulation";
import {
  calculateDisplayPercentChange,
  describeDisplayPercentChange,
  formatDisplayPercentChange,
} from "./theDisplayPercentChange";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";

const formatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 6 });
const scoreFormatter = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const categories = [
  ["teaching", "Öğretim"],
  ["researchEnvironment", "Araştırma Ortamı"],
  ["researchQuality", "Araştırma Kalitesi"],
  ["internationalOutlook", "Uluslararası Görünüm"],
  ["industry", "Sanayi"],
] as const;

const formatRaw = (value: number | null, unit: string | null) =>
  value === null ? "—" : `${formatter.format(value)}${unit ? ` ${unit}` : ""}`;

const effectLabel = (effect: IndicatorChangeDiagnostic["effect"]) => ({
  increasing: "Artırıcı",
  decreasing: "Azaltıcı",
  unchanged: "Değişmedi",
  "zero-weight": "Ağırlığı 0",
  unavailable: "Hesaplanamadı",
})[effect];

export function TheDetailedCalculationDisclosure({
  simulation,
}: {
  simulation: TheStochasticSimulationResult;
}) {
  const { t } = useAppLanguage();
  return (
    <details className="group overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 text-sm font-bold text-slate-800 transition hover:bg-slate-50 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 5h16v14H4zM8 9h8M8 13h5"/></svg></span>
        <span>{t("theUi.showDetails")}</span><svg aria-hidden="true" viewBox="0 0 20 20" className="ml-auto size-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 7.5 5 5 5-5"/></svg>
      </summary>
      <div className="grid gap-4 border-t border-slate-100 bg-gradient-to-b from-slate-50/60 to-white p-4 sm:p-5">
        {categories.map(([key, label]) => {
          const current = simulation.current.categories[key];
          const scenario = simulation.scenario.categories[key];
          const indicators = simulation.diagnostics.indicatorChanges.filter(
            ({ category }) => category === key,
          );
          return (
            <section key={key} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <h3 className="flex items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-indigo-50/40 px-4 py-3 font-bold">
                <span>{label}</span>
                {simulation.scenario.categorySampleSources[key] === "current-reuse" ? (
                  <span className="text-xs font-medium text-slate-500">Senaryoda değişmedi</span>
                ) : null}
              </h3>
              <div className="grid gap-2 p-3 text-sm sm:grid-cols-3">
                <span>Mevcut: {scoreFormatter.format(current.median)} ({scoreFormatter.format(current.p10)}–{scoreFormatter.format(current.p90)})</span>
                <span>Senaryo: {scoreFormatter.format(scenario.median)} ({scoreFormatter.format(scenario.p10)}–{scoreFormatter.format(scenario.p90)})</span>
                <span>Fark: {scoreFormatter.format(
                  Math.round((scenario.median + 1e-9) * 100) / 100 -
                  Math.round((current.median + 1e-9) * 100) / 100,
                )}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Gösterge</th>
                      <th className="px-3 py-2">Mevcut ham değer</th>
                      <th className="px-3 py-2">Senaryo ham değer</th>
                      <th className="px-3 py-2">Değişim (%)</th>
                      <th className="px-3 py-2">Yön</th>
                      <th className="px-3 py-2">Ağırlık</th>
                      <th className="px-3 py-2">Etki</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {indicators.map((indicator) => {
                      const displayChange = calculateDisplayPercentChange(
                        indicator.currentRawValue,
                        indicator.scenarioRawValue,
                      );
                      const zeroBaseline = indicator.currentRawValue === 0
                        && indicator.scenarioRawValue !== null
                        && indicator.scenarioRawValue !== 0;
                      return (
                        <tr key={indicator.code}>
                          <td className="px-3 py-2">
                            <span className="font-semibold">{indicator.code}</span>
                            {" — "}
                            {indicator.label}
                          </td>
                          <td className="px-3 py-2">{formatRaw(indicator.currentRawValue, indicator.rawUnit)}</td>
                          <td className="px-3 py-2">{formatRaw(indicator.scenarioRawValue, indicator.rawUnit)}</td>
                          <td
                            className="px-3 py-2"
                            aria-label={describeDisplayPercentChange(
                              indicator.label,
                              indicator.currentRawValue,
                              indicator.scenarioRawValue,
                            )}
                            title={zeroBaseline ? "Başlangıç değeri sıfır olduğu için yüzde değişim hesaplanamadı." : undefined}
                          >
                            {formatDisplayPercentChange(displayChange)}
                          </td>
                          <td className="px-3 py-2">
                            {indicator.configuredDirection === "higherIsBetter"
                              ? "Yüksek değer olumlu" : "Düşük değer olumlu"}
                          </td>
                          <td className="px-3 py-2">%{scoreFormatter.format(indicator.officialWeight)}</td>
                          <td className="px-3 py-2">{effectLabel(indicator.effect)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </details>
  );
}

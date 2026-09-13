import { QS_STOCHASTIC_INDICATOR_DEFINITIONS } from "@/src/config/qs.stochastic";
import type { QsRankEstimationResult } from "@/src/types/qs-rank-estimation";
import type { QsStochasticSimulationResult } from "@/src/types/qs-stochastic";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { getQsIndicatorDisplayLabel } from "./charts/qsChartData";
import type { AppLanguage } from "@/src/i18n/types";
import { resolveQsIndicatorDisplayStatus } from "./qsResultViewModels";

export const createQsCompactResultsRows = (simulation: QsStochasticSimulationResult, language: AppLanguage = "tr") =>
  QS_STOCHASTIC_INDICATOR_DEFINITIONS.map((definition) => ({
    id: definition.code,
    label: `${definition.code} · ${getQsIndicatorDisplayLabel(definition.code, language)}`,
    current: simulation.current.indicators[definition.code].median,
    scenario: simulation.scenario.indicators[definition.code].median,
    weight: definition.officialWeight,
  }));

export function QsCompactResultsTable({ simulation, rankEstimation }: { simulation: QsStochasticSimulationResult; rankEstimation: QsRankEstimationResult }) {
  const { t, locale, language } = useAppLanguage();
  const format = (value: number | null) => value === null ? "—" : new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
  const formatRank = (value: number | null) => value === null ? "—" : new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
  const rows = createQsCompactResultsRows(simulation, language);
  const unavailableCalibrationCodes = rows.filter((row) => {
    const source = simulation.scenario.indicators[row.id].source;
    return source === "unavailable-no-calibration" || source === "held-constant-no-calibration";
  }).map((row) => row.id);
  const hasUnavailableCalibration = unavailableCalibrationCodes.length > 0;
  const partial = simulation.scenario.isPartial;
  const displayedCurrentOverall = partial
    ? simulation.current.partialEstimatedOverallScore
    : simulation.current.estimatedOverallScore;
  const displayedScenarioOverall = partial
    ? simulation.scenario.partialEstimatedOverallScore
    : simulation.scenario.estimatedOverallScore;
  const displayedOverallDifference = displayedCurrentOverall === null || displayedScenarioOverall === null
    ? null
    : displayedScenarioOverall - displayedCurrentOverall;
  return <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <h2 className="text-base font-semibold text-slate-950">{t("qsResultsUi.resultsTable")}</h2>
    <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm">
      <thead className="border-y bg-slate-50 text-xs uppercase text-slate-500"><tr>{["indicator", "current", "scenario", "difference", "weight", "status"].map((key) => <th key={key} className="px-3 py-2">{t(`qsResultsUi.${key}`)}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((row) => {
          const source = simulation.scenario.indicators[row.id].source;
          const unavailableCalibration = source === "unavailable-no-calibration";
          const scenario = row.scenario;
          const difference = unavailableCalibration || row.current === null || scenario === null
            ? null
            : scenario - row.current;
          const displayStatus = resolveQsIndicatorDisplayStatus({ code: row.id, simulation, language });
          const approximate = simulation.scenario.indicators[row.id].sampleSource === "estimated";
          const scenarioTone = approximate ? "text-amber-800" : displayStatus.status === "reference-score" ? "text-slate-700" : "text-blue-800";
          return <tr key={row.id}><th className="px-3 py-2">{row.label}</th><td className="px-3 py-2">{format(row.current)}</td><td className={`px-3 py-2 font-semibold ${scenarioTone}`} title={displayStatus.description}>{approximate && scenario !== null ? "≈" : ""}{format(scenario)}</td><td className="px-3 py-2" title={displayStatus.description}>{difference !== null && difference > 0 ? "+" : ""}{format(difference)}</td><td className="px-3 py-2">%{format(row.weight * 100)}</td><td className="px-3 py-2 text-xs font-medium text-slate-700" title={displayStatus.description}>{displayStatus.label}</td></tr>;
        })}
        <tr><th className="px-3 py-2">{t("qsResultsUi.composite")}</th><td className="px-3 py-2">{format(simulation.current.weightedCompositeScore)}</td><td className="px-3 py-2">{format(simulation.scenario.weightedCompositeScore)}</td><td className="px-3 py-2">{format(simulation.current.weightedCompositeScore === null || simulation.scenario.weightedCompositeScore === null ? null : simulation.scenario.weightedCompositeScore - simulation.current.weightedCompositeScore)}</td><td className="px-3 py-2">%100</td><td className="px-3 py-2">—</td></tr>
        <tr className="bg-slate-50 font-semibold"><th className="px-3 py-2">{partial ? (language === "tr" ? "Kapsam Eşlenmiş Kısmi Skor" : "Coverage-matched Partial Score") : t("qsResultsUi.estimatedOverall")}</th><td className="px-3 py-2">{format(displayedCurrentOverall)}</td><td className="px-3 py-2">{format(displayedScenarioOverall)}</td><td className="px-3 py-2">{format(displayedOverallDifference)}</td><td className="px-3 py-2">—</td><td className="px-3 py-2">{partial ? (language === "tr" ? "Tam QS skoru değildir" : "Not a full QS score") : "—"}</td></tr>
        <tr><th className="px-3 py-2">{partial ? (language === "tr" ? "Yaklaşık Kısmi Sıralama Bandı" : "Approximate Partial Ranking Band") : t("qsResultsUi.estimatedBand")}</th><td className="px-3 py-2">{rankEstimation.calibration.publishedBand}</td><td className="px-3 py-2">{rankEstimation.scenario.status === "ready" ? <><span className={partial ? "font-semibold text-amber-800" : "block"}>{partial ? "≈" : ""}{rankEstimation.scenario.calibrated.predictedBand}</span><span className="block text-[11px] font-normal text-slate-600">≈{formatRank(rankEstimation.scenario.calibrated.expectedRank)}</span></> : "—"}</td><td className="px-3 py-2">{rankEstimation.scenario.status === "ready" ? (language === "tr" ? rankEstimation.change.label : rankEstimation.change.status === "unchanged" ? "Unchanged" : rankEstimation.change.status === "improved" ? "Estimated rank improved" : "Estimated rank worsened") : "—"}</td><td className="px-3 py-2">—</td><td className="px-3 py-2 text-xs text-slate-700">{partial ? (language === "tr" ? "Düşük güven · kısmi skordan üretildi" : "Low confidence · derived from a partial score") : "—"}</td></tr>
      </tbody>
    </table></div>
    {hasUnavailableCalibration ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950" role="status">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">!</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{language === "tr" ? "Kalibrasyon kapsamı sınırlı" : "Limited calibration coverage"}</p>
          <p className="mt-1 text-xs leading-5 text-amber-900">{language === "tr" ? "Bazı ham oranlar değişti. Eşlenmiş kalibrasyon bulunmadığından ilgili gösterge skorları bu hesaplamaya dahil edilmedi." : "Some raw ratios changed. Related indicator scores were excluded from this calculation because paired calibration is unavailable."}</p>
          <p className="mt-2 text-xs text-amber-900">
            <span className="font-medium">{language === "tr" ? "Etkilenen göstergeler:" : "Affected indicators:"}</span>{" "}
            <span className="font-semibold">{unavailableCalibrationCodes.join(", ")}</span>
          </p>
        </div>
      </div>
    </div> : null}
  </section>;
}

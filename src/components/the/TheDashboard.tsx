"use client";

import { useMemo } from "react";
import type { InstitutionDataYear } from "@/src/config/institution-data-years";
import type { TheStochasticSimulationResult } from "@/src/lib/the/stochastic/run-the-stochastic-simulation";
import type { TheScenarioOverrideValues } from "@/src/lib/the/institutional-scenario";
import { TheChangedMetricsPanel } from "./TheChangedMetricsPanel";
import { TheCategoryBarChart } from "./charts/TheCategoryBarChart";
import { TheCategoryRadarChart } from "./charts/TheCategoryRadarChart";
import { createTheCategoryChartData } from "./charts/theChartData";
import { TheDashboardSummary } from "./TheDashboardSummary";
import { TheDetailedCalculationDisclosure } from "./TheDetailedCalculationDisclosure";
import { TheResultsPanel } from "./TheResultsPanel";
import { SaveScenarioButton } from "@/src/components/scenarios/SaveScenarioButton";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { resolveTheRankBandPresentation } from "@/src/lib/the/the-rank-band-source";
import { TheSummaryCard } from "./TheSummaryCard";
import { THE_FLAT_PARAMETER_DEFINITIONS } from "@/src/config/the-simulator-parameters";
import { getMethodologyCategoryLabel } from "@/src/lib/scenarios/scenario-presentation";
import { createRankingReferenceSnapshotMetadata } from "@/src/lib/rankings/dataset-resolver";

type Props = {
  simulation: TheStochasticSimulationResult | null;
  institutionalDataYear: InstitutionDataYear | null;
  baselineValues: Record<string, number | null>;
  scenarioChanges: TheScenarioOverrideValues;
  simulationUpdating: boolean;
  hasValidationError: boolean;
  validationErrors: Record<string, string>;
  heldExternalParameterIds: string[];
};

export function TheDashboard(props: Props) {
  const { language } = useAppLanguage();
  const currentOnlyChartData = useMemo(() => props.simulation === null ? [] : createTheCategoryChartData({
    current: props.simulation.current.categoryMedian,
    scenario: props.simulation.current.categoryMedian,
    language,
  }), [language, props.simulation]);
  if (props.simulation === null || props.hasValidationError) {
    const errors = Object.entries(props.validationErrors);
    const missingOnly = errors.length > 0 && errors.every(([, message]) => message.includes("doğrulanmış ham veri bulunmuyor"));
    const validationHeadline = "Simülasyon güncellenemedi. Tutarsız parametre değerlerini düzeltin.";
    const labels = new Map(THE_FLAT_PARAMETER_DEFINITIONS.map((definition) => [definition.scenarioKey, definition.label.tr]));
    const current = props.simulation?.current ?? null;
    const rankBands = resolveTheRankBandPresentation({ institutionalDataYear: props.institutionalDataYear, scoreReferenceEdition:2026, estimatedCurrentBand:null, estimatedScenarioBand:null, hasScenarioChanges:true });
    return <main className="min-w-0 space-y-5"><HeldExternalIndicatorWarning parameterIds={props.heldExternalParameterIds} language={language} /><section role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><p className="font-semibold">{missingOnly ? `Simülasyon çalıştırılmadı. ${errors.length} zorunlu parametrede doğrulanmış veri eksik.` : validationHeadline}</p>{missingOnly ? null : <p className="mt-1">{errors.length} parametrede hata bulunuyor.</p>}<ul className="mt-2 list-disc pl-5">{errors.map(([id, message]) => <li key={id}>{message.includes(labels.get(id) ?? "") ? message : `${labels.get(id) ?? id}: ${message}`}</li>)}</ul></section><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><TheSummaryCard title="THE Mevcut Skoru" value={current ? current.overallMedian.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"} subtitle={current ? "Current sonuç korundu" : "Current sonuç yeniden hesaplanmadı"} /><TheSummaryCard title="THE Senaryo Skoru" value="—" subtitle="Geçersiz girdiler hesaplanmadı" /><TheSummaryCard title="Değişim" value="—" subtitle="Senaryo sonucu üretilmedi" /><TheSummaryCard title="Sıralama Bantları" value={`${rankBands.currentBand ?? "—"} → —`} subtitle="Current resmî bant korundu" /><TheSummaryCard title="Hesaplama Durumu" value={missingOnly ? "Eksik veri" : "Parametre hatası"} subtitle="Stokastik simülasyon çalıştırılmadı" status="negative" /></div>{current ? <><div className="grid gap-5 xl:grid-cols-2"><TheCategoryRadarChart data={currentOnlyChartData} /><TheCategoryBarChart data={currentOnlyChartData} /></div><section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold text-slate-950">Mevcut kategori skorları</h2><dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{Object.entries(current.categoryMedian).map(([categoryId, score]) => <div key={categoryId}><dt className="text-xs text-slate-500">{getMethodologyCategoryLabel("THE", categoryId, language)}</dt><dd className="font-semibold text-slate-900">{score.toLocaleString(language === "tr" ? "tr-TR" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd></div>)}</dl></section></> : null}<TheChangedMetricsPanel baselineValues={props.baselineValues} scenarioChanges={props.scenarioChanges} /></main>;
  }
  return <ValidTheDashboard {...props} simulation={props.simulation}/>;
}

function ValidTheDashboard(props: Omit<Props, "simulation"> & { simulation: TheStochasticSimulationResult }) {
  const { language, t } = useAppLanguage();
  const rankCoverageInsufficient = props.simulation.scenario.predictedRankBand === null;
  const rankCoverageWarning = t("theUi.insufficientCoverageDetail");
  const currentCategoryMedian =
    props.simulation.current.categoryMedian;
  const scenarioCategoryMedian =
    props.simulation.scenario.categoryMedian;
  const categoryChartData = useMemo(
    () => createTheCategoryChartData({
      current: currentCategoryMedian,
      scenario: scenarioCategoryMedian,
      language,
    }),
    [currentCategoryMedian, scenarioCategoryMedian, language],
  );
  const rankBands = resolveTheRankBandPresentation({
    institutionalDataYear: props.institutionalDataYear,
    scoreReferenceEdition: 2026,
    estimatedCurrentBand: props.simulation.current.predictedRankBand,
    estimatedScenarioBand: props.simulation.scenario.predictedRankBand,
    hasScenarioChanges: Object.keys(props.scenarioChanges).length > 0,
  });

  return (
    <main className="min-w-0 space-y-5">
      <HeldExternalIndicatorWarning parameterIds={props.heldExternalParameterIds} language={language} />
      <SaveScenarioButton createSnapshot={(name) => ({
        id: crypto.randomUUID(), name, methodology: "THE", source: "manual-scenario",
        institutionalDataYear: props.institutionalDataYear === null ? null : String(props.institutionalDataYear), scoreReferenceEdition: "THE 2026",
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        currentScore: props.simulation.current.overallMedian, scenarioScore: props.simulation.scenario.overallMedian,
        scoreDifference: props.simulation.change.overallMedianDifference,
        currentRankBand: rankBands.currentBand, scenarioRankBand: rankBands.scenarioBand,
        rankingReferenceDataset: createRankingReferenceSnapshotMetadata("THE"),
        currentRankSource: "published-reference", scenarioRankSource: Object.keys(props.scenarioChanges).length === 0 ? "published-reference" : "estimated-from-reference-dataset",
        rankEstimationStatus: props.simulation.scenario.predictedRankBand === null ? "insufficient-reference-coverage" : "estimated",
        rankEstimationWarnings: rankCoverageInsufficient ? [rankCoverageWarning] : [],
        currentRankBandSource: rankBands.currentSource, scenarioRankBandSource: rankBands.scenarioSource,
        currentScoreType: "stochastic-estimate",
        calculationStatus: "complete", warnings: rankCoverageInsufficient ? [rankCoverageWarning] : [],
        changedMetrics: Object.entries(props.scenarioChanges).map(([parameterId, scenarioValue]) => ({ parameterId, label: parameterId, currentValue: props.baselineValues[parameterId] ?? null, scenarioValue })),
        currentCategoryScores: { ...props.simulation.current.categoryMedian },
        scenarioCategoryScores: { ...props.simulation.scenario.categoryMedian },
        currentIndicatorScores: null, scenarioIndicatorScores: null,
        rawCalculationDetails: null, recommendationContext: null,
      })} />
      {rankCoverageInsufficient ? <section role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><p className="font-semibold">{t("theUi.insufficientCoverageStatus")}</p><p className="mt-1">{rankCoverageWarning}</p></section> : null}
      <TheDashboardSummary
        simulation={props.simulation}
        simulationUpdating={props.simulationUpdating}
        rankBands={rankBands}
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <TheCategoryRadarChart data={categoryChartData} />
        <TheCategoryBarChart data={categoryChartData} />
      </div>
      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)]">
        <TheResultsPanel simulation={props.simulation} institutionalDataYear={props.institutionalDataYear} rankBands={rankBands} />
        <TheChangedMetricsPanel baselineValues={props.baselineValues} scenarioChanges={props.scenarioChanges} />
      </div>
      <TheDetailedCalculationDisclosure simulation={props.simulation} />
    </main>
  );
}

function HeldExternalIndicatorWarning({ parameterIds, language }: { parameterIds: string[]; language: "tr" | "en" }) {
  if (parameterIds.length === 0) return null;
  return <section role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><p className="font-semibold">{language === "tr" ? "Doğrulanmış ham→skor dönüşümü bulunmayan bibliyometrik alanlar THE skoruna katılmadı." : "Bibliometric fields without a verified raw-to-score transformation were excluded from the THE score."}</p><p className="mt-1 text-amber-800">{language === "tr" ? "Bu değerler değiştirilebilir ve ham veri olarak izlenebilir; ilgili normalize gösterge skorları mevcut referans değerinde sabit tutulur." : "These values can be edited and tracked as raw data; the related normalized indicator scores are held at their current reference values."}</p><ul className="mt-2 list-disc pl-5 text-amber-800">{parameterIds.map((parameterId) => { const definition = THE_FLAT_PARAMETER_DEFINITIONS.find((item) => item.scenarioKey === parameterId); return <li key={parameterId}>{definition?.label[language] ?? parameterId}</li>; })}</ul></section>;
}

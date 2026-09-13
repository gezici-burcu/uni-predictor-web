"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSavedScenarios } from "@/src/contexts/SavedScenariosContext";
import { formatGreenMetricScenarioValue, formatScenarioParameterValue, getGreenMetricScenarioParameterLabel, getMethodologyCategoryLabel, getScenarioParameterArea, getScenarioParameterLabel, getScenarioReviewHref, presentQsLegacyMetricChanges } from "@/src/lib/scenarios/scenario-presentation";
import type { SavedScenarioSnapshot } from "@/src/types/saved-scenario";
import { formatTheScoreDifference } from "@/src/lib/the/format-the-score-difference";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { scenarioComparisonUiTranslations } from "@/src/i18n/scenario-comparison-ui";
import { resolveSavedTheRankBandPresentation } from "@/src/lib/the/the-rank-band-source";
import { createScenarioPdf, validateScenarioPdfSelection } from "@/src/lib/scenarios/scenario-pdf";
import { GreenMetricScenarioDetail } from "@/src/components/scenarios/GreenMetricScenarioDetail";
import { CrossAnalysisScenarioDetail } from "@/src/components/scenarios/CrossAnalysisScenarioDetail";
import { greenMetricCategoryMeta } from "@/src/config/greenmetric.categories";
import { getTranslation } from "@/src/i18n/getTranslation";
import { getSavedCrossAnalysisAffectedMethodologies } from "@/src/lib/scenarios/cross-analysis-scenario";
import { isSavedCrossAnalysisScenario } from "@/src/types/saved-scenario";

export function ScenariosPage() {
  const { scenarios, rename, remove } = useSavedScenarios();
  const { language } = useAppLanguage();
  const crossT = (key: string) => getTranslation(language, `crossAnalysisUi.${key}`);
  const [query, setQuery] = useState("");
  const [methodology, setMethodology] = useState("all");
  const [source, setSource] = useState("all");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<SavedScenarioSnapshot | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const pdfInFlight = useRef(false);
  const filtered = useMemo(() => scenarios.filter((item) =>
    item.name.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR")) &&
    (methodology === "all" || item.methodology === methodology) &&
    (source === "all" || item.source === source))
    .sort((a, b) => sort === "score"
      ? (b.scoreDifference ?? Number.NEGATIVE_INFINITY) - (a.scoreDifference ?? Number.NEGATIVE_INFINITY)
      : Date.parse(b.createdAt) - Date.parse(a.createdAt)), [scenarios, query, methodology, source, sort]);
  const selectedScenarios = selected.flatMap((id) => scenarios.find((item) => item.id === id) ?? []);
  const selectedMethodology = selectedScenarios[0]?.methodology;
  const pdfSelectionError = validateScenarioPdfSelection(selectedScenarios);
  const toggle = (scenario: SavedScenarioSnapshot) => {
    if (selected.includes(scenario.id)) {
      setSelected(selected.filter((id) => id !== scenario.id));
      setMessage(null);
      return;
    }
    const selectionError = getScenarioSelectionError(selectedScenarios, scenario);
    if (selectionError) {
      setMessage(selectionError);
      return;
    }
    setSelected([...selected, scenario.id]);
    setMessage(null);
  };
  const downloadPdf = async (scenariosToExport: readonly SavedScenarioSnapshot[] = selectedScenarios) => {
    const selectionError = validateScenarioPdfSelection(scenariosToExport);
    if (pdfInFlight.current || selectionError) {
      if (selectionError === "mixed-methodology") setMessage(scenarioComparisonUiTranslations[language].pdfMixedMethodology);
      if (selectionError === "unsupported-cross-analysis") setMessage(scenarioComparisonUiTranslations[language].pdfCrossAnalysisUnsupported);
      if (selectionError === "empty-cross-analysis") setMessage(crossT("pdfRequiresChange"));
      if (selectionError === "invalid-cross-analysis") setMessage(crossT("pdfInvalid"));
      return;
    }
    pdfInFlight.current = true;
    setPdfLoading(true);
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const report = createScenarioPdf(scenariosToExport, language);
      const blob = new Blob([report.bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = report.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(scenarioComparisonUiTranslations[language].pdfSuccess);
    } catch {
      setMessage(scenarioComparisonUiTranslations[language].pdfError);
    } finally {
      pdfInFlight.current = false;
      setPdfLoading(false);
    }
  };

  if (!scenarios.length) return <EmptyScenarios />;
  return (
    <main className="scenario-workspace min-w-0 space-y-5">
      <header className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-5 text-white shadow-lg sm:p-6">
        <div className="absolute -right-16 -top-20 size-52 rounded-full bg-cyan-300/20 blur-3xl" aria-hidden="true" />
        <div className="relative"><span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-100">Karar Destek Arşivi</span><h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Senaryolar</h1><p className="mt-1.5 max-w-2xl text-sm leading-6 text-blue-100">Kaydettiğiniz simülasyonları tek alanda yönetin, karşılaştırın ve raporlayın.</p></div>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {["Toplam Senaryo", "THE Senaryoları", "QS Senaryoları", "UI GreenMetric Senaryoları", crossT("savedCrossAnalysis")].map((label, index) => {
          const count = index === 0 ? scenarios.length : scenarios.filter((item) => item.methodology === ["", "THE", "QS", "GREENMETRIC", "CROSS_ANALYSIS"][index]).length;
          return <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{count}</p></article>;
        })}
      </div>
      <section className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <input aria-label="Senaryo ara" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ara" className="input" />
        <select aria-label="Metodoloji filtresi" value={methodology} onChange={(event) => setMethodology(event.target.value)} className="input"><option value="all">Tüm metodolojiler</option><option>THE</option><option>QS</option><option value="GREENMETRIC">UI GreenMetric</option><option value="CROSS_ANALYSIS">{crossT("crossAnalysisLabel")}</option></select>
        <select aria-label="Kaynak filtresi" value={source} onChange={(event) => setSource(event.target.value)} className="input"><option value="all">Tüm kaynaklar</option><option value="manual-scenario">Manuel Senaryo</option><option value="recommendation-engine">Öneri Motoru</option><option value="raw-analysis">Ham Veri Analizi</option><option value="cross-analysis">{crossT("crossAnalysisLabel")}</option></select>
        <select aria-label="Sıralama" value={sort} onChange={(event) => setSort(event.target.value)} className="input"><option value="newest">En yeni</option><option value="score">Skor değişimi</option></select>
      </section>
      <ScenarioTable scenarios={filtered} selected={selected} selectedMethodology={selectedMethodology} onToggle={toggle} onDetail={setDetail} onRename={(scenario) => {
        const crossAnalysis = isSavedCrossAnalysisScenario(scenario);
        const name = window.prompt(crossAnalysis ? crossT("newAnalysisName") : "Yeni senaryo adı", scenario.name);
        if (name !== null) {
          const error = rename(scenario.id, name);
          setMessage(error ?? (crossAnalysis ? crossT("analysisRenamed") : "Senaryo yeniden adlandırıldı."));
          if (!error) setDetail((current) => current?.id === scenario.id ? { ...current, name: name.trim(), updatedAt: new Date().toISOString() } : current);
        }
      }} onDelete={(scenario) => {
        if (window.confirm(isSavedCrossAnalysisScenario(scenario) ? crossT("deleteAnalysisConfirm") : "Bu senaryo silinecek. Kurumsal veriler etkilenmeyecek.")) {
          remove(scenario.id);
          setSelected(selected.filter((id) => id !== scenario.id));
          setDetail((current) => current?.id === scenario.id ? null : current);
          setCompareOpen(false);
        }
      }} onPdf={(scenario) => void downloadPdf([scenario])} />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={selected.length < 2} onClick={() => setCompareOpen(true)} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Seçili Senaryoları Karşılaştır</button>
        <button type="button" disabled={Boolean(pdfSelectionError) || pdfLoading} aria-busy={pdfLoading} aria-label={scenarioComparisonUiTranslations[language].downloadPdf} title={pdfSelectionError === "empty" ? scenarioComparisonUiTranslations[language].pdfSelectOne : pdfSelectionError === "mixed-methodology" ? scenarioComparisonUiTranslations[language].pdfMixedMethodology : pdfSelectionError === "unsupported-cross-analysis" ? scenarioComparisonUiTranslations[language].pdfCrossAnalysisUnsupported : undefined} onClick={() => void downloadPdf()} className="rounded-lg border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-40">{pdfLoading ? scenarioComparisonUiTranslations[language].pdfPreparing : scenarioComparisonUiTranslations[language].downloadPdf}</button>
        <button type="button" onClick={() => { setSelected([]); setCompareOpen(false); setMessage(null); }} className="rounded-lg border px-4 py-2 text-sm">Seçimi Temizle</button>
      </div>
      {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{message}</p> : null}
      {detail ? <ScenarioDetailPanel scenario={detail} onClose={() => setDetail(null)} /> : null}
      {compareOpen && selectedScenarios.length >= 2 ? <ScenarioComparison scenarios={selectedScenarios} /> : null}
    </main>
  );
}

export function ScenarioTable({ scenarios, selected, selectedMethodology, onToggle, onDetail, onRename, onDelete, onPdf }: { scenarios: SavedScenarioSnapshot[]; selected: string[]; selectedMethodology?: string; onToggle: (scenario: SavedScenarioSnapshot) => void; onDetail: (scenario: SavedScenarioSnapshot) => void; onRename: (scenario: SavedScenarioSnapshot) => void; onDelete: (scenario: SavedScenarioSnapshot) => void; onPdf?: (scenario: SavedScenarioSnapshot) => void }) {
  const { language, locale } = useAppLanguage();
  const crossT = (key: string) => getTranslation(language, `crossAnalysisUi.${key}`);
  return <div className="max-w-full overflow-x-auto rounded-xl border bg-white pb-2"><table className="min-w-[1320px] text-sm"><thead><tr>{["Seç", "Senaryo adı", "Metodoloji", "Kaynak", "Veri yılı", "Oluşturulma", "Mevcut skor", "Senaryo skoru", "Fark", "Sıralama bandı", "Metrik", "Durum", "İşlemler"].map((title) => <th key={title} className="whitespace-nowrap px-3 py-2 text-left">{title}</th>)}</tr></thead><tbody>{scenarios.map((scenario) => {
    const reviewHref = getScenarioReviewHref(scenario.methodology, scenario.id);
    const greenMetric = scenario.methodology === "GREENMETRIC";
    const crossAnalysis = isSavedCrossAnalysisScenario(scenario);
    const affected = crossAnalysis ? getSavedCrossAnalysisAffectedMethodologies(scenario) : [];
    const comparisonDisabled = crossAnalysis || Boolean(selectedMethodology && selectedMethodology !== scenario.methodology);
    return <tr key={scenario.id} className="border-t">
      <td className="px-3 py-2"><input aria-label={`${scenario.name} karşılaştırma seçimi`} title={crossAnalysis ? crossT("comparisonUnavailable") : undefined} type="checkbox" checked={selected.includes(scenario.id)} disabled={comparisonDisabled} onChange={() => onToggle(scenario)} /></td>
      <td className="sticky left-0 bg-white px-3 py-2"><span className="font-semibold">{scenario.name}</span>{crossAnalysis ? <span className="mt-1 block text-[11px] text-slate-500">{scenario.crossAnalysis.overrides.length} {crossT("changedParameters").toLocaleLowerCase(locale)} · {affected.map(methodologyShortLabel).join(" · ") || "—"}</span> : null}</td>
      <td className="px-3 py-2">{methodologyLabel(scenario.methodology, language)}</td>
      <td className="px-3 py-2">{sourceLabelLocalized(scenario.source, scenarioComparisonUiTranslations[language].manualScenario, language)}</td>
      <td className="px-3 py-2">{scenario.institutionalDataYear ?? "—"}</td>
      <td className="px-3 py-2">{new Date(scenario.createdAt).toLocaleDateString(locale)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{crossAnalysis ? "—" : greenMetric ? `${score(scenario.currentScore)} / 10.000` : score(scenario.currentScore)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{crossAnalysis ? "—" : greenMetric ? `${score(scenario.scenarioScore)} / 10.000` : score(scenario.scenarioScore)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{crossAnalysis ? "—" : score(scenario.scoreDifference)}</td>
      <td className="px-3 py-2">{crossAnalysis ? affected.map(methodologyShortLabel).join(" · ") || "—" : greenMetric ? `${scenario.currentRankBand ?? "—"} → ${scenario.scenarioRankBand ?? "—"}` : scenario.scenarioRankBand ?? "—"}</td>
      <td className="px-3 py-2 text-right">{countUniqueMetricChanges(scenario)}</td>
      <td className="px-3 py-2"><StatusBadge status={scenario.calculationStatus} /></td>
      <td className="sticky right-0 bg-white px-3 py-2 shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)]"><div className="flex items-center justify-end gap-2 whitespace-nowrap"><button className="rounded-md bg-blue-700 px-2.5 py-1.5 text-xs font-semibold text-white" onClick={() => onDetail(scenario)}>{crossAnalysis ? crossT("details") : "Ayrıntı"}</button>{reviewHref ? <Link className="rounded-md border px-2.5 py-1.5 text-xs font-semibold text-slate-700" href={reviewHref}>{crossAnalysis ? crossT("openAnalysis") : "Metodoloji Ekranında İncele"}</Link> : null}{crossAnalysis ? <button type="button" disabled={scenario.crossAnalysis.overrides.length === 0 || scenario.calculationStatus === "validation-error"} title={scenario.crossAnalysis.overrides.length === 0 ? crossT("pdfRequiresChange") : scenario.calculationStatus === "validation-error" ? crossT("pdfInvalid") : undefined} className="rounded-md border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => onPdf?.(scenario)}>{crossT("createPdf")}</button> : null}<button className="rounded-md border px-2.5 py-1.5 text-xs" onClick={() => onRename(scenario)}>{crossAnalysis ? crossT("renameAnalysis") : "Yeniden Adlandır"}</button><button className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-700" onClick={() => onDelete(scenario)}>{crossAnalysis ? crossT("deleteAnalysis") : "Sil"}</button></div></td>
    </tr>;
  })}</tbody></table></div>;
}

export function ScenarioDetailPanel({ scenario: inputScenario, onClose }: { scenario: SavedScenarioSnapshot; onClose: () => void }) {
  const { language, locale } = useAppLanguage();
  if (isSavedCrossAnalysisScenario(inputScenario)) {
    return <CrossAnalysisScenarioDetail scenario={inputScenario} onClose={onClose} />;
  }
  if (inputScenario.methodology === "GREENMETRIC") {
    return <GreenMetricScenarioDetail scenario={inputScenario} onClose={onClose} />;
  }
  const ui = scenarioComparisonUiTranslations[language];
  const legacyPresentation = inputScenario.methodology === "QS" ? presentQsLegacyMetricChanges(inputScenario.changedMetrics) : { metrics: inputScenario.changedMetrics, warnings: [] };
  const scenario = { ...inputScenario, changedMetrics: legacyPresentation.metrics, warnings: [...inputScenario.warnings, ...legacyPresentation.warnings] };
  const currentScore = scenario.currentEstimatedOverallScore ?? scenario.currentScore;
  const scenarioScore = scenario.scenarioEstimatedOverallScore ?? scenario.scenarioScore;
  const rankBands = scenario.methodology === "THE" ? resolveSavedTheRankBandPresentation(scenario) : null;
  return <section className="min-w-0 rounded-xl border bg-white p-5">
    <div className="flex items-start justify-between gap-4"><div><h2 className="break-words text-lg font-bold">{ui.scenario}: {scenario.name}</h2><p className="mt-1 text-xs text-slate-500">{methodologyLabel(scenario.methodology)} · {sourceLabelLocalized(scenario.source, ui.manualScenario, language)}</p></div><button onClick={onClose}>{ui.close}</button></div>
    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      <InfoGroup title={ui.scenarioInfo} items={[[ui.methodology, methodologyLabel(scenario.methodology)], [ui.source, sourceLabelLocalized(scenario.source, ui.manualScenario, language)], [ui.institutionalYear, scenario.institutionalDataYear ?? "—"], [ui.scoreReference, scenario.scoreReferenceEdition ?? "—"]]} />
      <InfoGroup title={ui.dateInfo} items={[[ui.created, localizedDateTime(scenario.createdAt, locale)], [ui.updated, localizedDateTime(scenario.updatedAt, locale)]]} />
      <section className="rounded-lg border border-slate-200 p-3"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{ui.resultSummary}</h3><div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        <InfoItem label={ui.currentScore} value={localizedScore(currentScore, locale)} hint={ui.currentScoreHint} />
        <InfoItem label={ui.scenarioScore} value={localizedScore(scenarioScore, locale)} hint={ui.scenarioScoreHint} emphasized />
        <InfoItem label={ui.scoreDifference} value={localizedSignedDifference(scenario, locale)} hint={ui.differenceHint} tone={differenceTone(scenario.scoreDifference)} />
        <InfoItem label={ui.currentBand} value={rankBands?.currentBand ?? scenario.currentRankBand ?? "—"} hint={rankBands?.currentSource === "official-reference" ? ui.currentBandHint : ui.currentBandHint} />
        <InfoItem label={ui.scenarioBand} value={rankBands?.scenarioBand ?? scenario.scenarioRankBand ?? "—"} hint={rankBands?.scenarioSource === "official-reference" ? ui.unchangedScenarioBandHint : ui.scenarioBandHint} />
        <StatusWithHint status={scenario.calculationStatus} language={language} />
      </div></section>
    </div>{rankBands?.legacyCurrentBand ? <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{ui.legacyBand}: {rankBands.legacyCurrentBand} · {ui.officialBand}: {rankBands.currentBand}</p> : null}
    {scenario.methodology === "QS" ? <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3"><InfoItem label={ui.currentComposite} value={localizedScore(scenario.currentWeightedCompositeScore ?? null, locale)} /><InfoItem label={ui.scenarioComposite} value={localizedScore(scenario.scenarioWeightedCompositeScore ?? null, locale)} /><InfoItem label={ui.scoreType} value={scenario.scoreType === "estimated-overall" ? ui.estimatedOverall : ui.legacyScoreType} /></div> : null}
    {scenario.warnings.length ? <><h3 className="mt-4 font-semibold">{ui.warnings}</h3><ul className="mt-2 list-disc pl-5 text-amber-800">{scenario.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></> : null}
    <h3 className="mt-4 font-semibold">{ui.changedMetrics}</h3><p className="mt-1 text-xs text-slate-500">{ui.changedMetricsHint}</p>
    <div className="mt-2 max-w-full overflow-x-auto"><table className="w-full min-w-[720px] table-fixed text-sm"><thead><tr><th className="w-[32%] px-3 py-2 text-left">{ui.parameter}</th><th className="w-[18%] px-3 py-2 text-left">{ui.area}</th><th className="px-3 py-2 text-right">{ui.currentValue}</th><th className="px-3 py-2 text-right">{ui.scenarioValue}</th><th className="px-3 py-2 text-right">{ui.difference}</th></tr></thead><tbody>{uniqueMetricChanges(scenario).map((item) => <tr key={metricKey(item)} className="border-t"><td className="break-words px-3 py-2">{getScenarioParameterLabel(item.parameterId, item.label)}</td><td className="px-3 py-2">{getScenarioParameterArea(item.parameterId) ?? item.field ?? "—"}</td><td className="px-3 py-2 text-right tabular-nums">{formatScenarioParameterValue(item.parameterId, item.currentValue)}</td><td className="px-3 py-2 text-right tabular-nums">{formatScenarioParameterValue(item.parameterId, item.scenarioValue)}</td><td className="px-3 py-2 text-right tabular-nums">{metricDifference(item)}</td></tr>)}</tbody></table></div>
    <SnapshotData title="Kategori skorları" current={scenario.currentCategoryScores} scenario={scenario.scenarioCategoryScores} methodology={scenario.methodology} language={language} /><SnapshotData title="Gösterge skorları" current={scenario.currentIndicatorScores} scenario={scenario.scenarioIndicatorScores} />
    {scenario.rawCalculationDetails ? <details className="mt-4"><summary className="font-semibold">Ham oran ve hesaplama ayrıntıları</summary><pre className="mt-2 max-w-full overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(scenario.rawCalculationDetails, null, 2)}</pre></details> : null}
    {scenario.recommendationContext ? <details className="mt-4"><summary className="font-semibold">Öneri planı ve kullanıcı kısıtları</summary><pre className="mt-2 max-w-full overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(scenario.recommendationContext, null, 2)}</pre></details> : null}
  </section>;
}

export function ScenarioComparison({ scenarios: inputScenarios }: { scenarios: SavedScenarioSnapshot[] }) {
  const { language, locale } = useAppLanguage();
  const ui = scenarioComparisonUiTranslations[language];
  if (inputScenarios.some(isSavedCrossAnalysisScenario)) return <p role="alert">Çapraz Analiz kayıtları bu sürümde karşılaştırma görünümüne dahil edilmez.</p>;
  const scenarios = inputScenarios.map((scenario) => ({ ...scenario, changedMetrics: uniqueMetricChanges(scenario) }));
  if (scenarios.length > 4) return <p role="alert">Aynı anda en fazla 4 senaryo karşılaştırılabilir.</p>;
  if (new Set(scenarios.map((item) => item.methodology)).size > 1) return <p role="alert">Doğrudan karşılaştırma için aynı metodolojiye ait senaryolar seçilmelidir.</p>;
  const scoreData = scenarios.map((item) => ({ name: item.name, score: item.scenarioScore, difference: item.scoreDifference }));
  const categoryIds = getScenarioComparisonCategoryIds(scenarios);
  const categoryData = categoryIds.map((id) => Object.fromEntries([["category", getMethodologyCategoryLabel(scenarios[0].methodology, id, language)], ...scenarios.map((item) => [item.name, item.scenarioCategoryScores?.[id] ?? null])])) as Record<string, unknown>[];
  const metrics = [...new Set(scenarios.flatMap((item) => item.changedMetrics.map((metric) => metric.parameterId)))];
  return <section className="min-w-0 space-y-5 rounded-xl border bg-white p-4">
    <div><h2 className="text-xl font-bold">{ui.comparisonTitle}</h2><p className="mt-1 text-sm text-slate-500">{ui.comparisonHint}</p></div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{scenarios.map((item) => <article key={item.id} className="min-w-0 rounded-lg border p-3"><h3 className="break-words font-semibold">{item.name}</h3><p className="mt-0.5 text-xs text-slate-500">{methodologyLabel(item.methodology)} · {sourceLabelLocalized(item.source, ui.manualScenario, language)}</p><dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
      <SummaryDatum label={ui.currentScore} value={localizedMethodologyScore(item, item.currentScore, locale)} hint={ui.currentScoreTooltip} />
      <SummaryDatum label={ui.scenarioScore} value={localizedMethodologyScore(item, item.scenarioScore, locale)} hint={ui.scenarioScoreTooltip} emphasized />
      <SummaryDatum label={ui.scoreDifference} value={localizedSignedDifference(item, locale)} hint={ui.differenceTooltip} tone={differenceTone(item.scoreDifference)} />
      <SummaryDatum label={ui.estimatedBand} value={item.methodology === "GREENMETRIC" ? `${item.currentRankBand ?? "—"} → ${item.scenarioRankBand ?? "—"}` : item.scenarioRankBand ?? "—"} hint={ui.bandTooltip} />
      <SummaryDatum label={ui.changedMetric} value={`${countUniqueMetricChanges(item)} ${ui.parameters}`} />
    </dl><div className="mt-3"><StatusWithHint status={item.calculationStatus} language={language} compact /></div></article>)}</div>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2"><ComparisonChart title="Genel skor" height={260}><BarChart data={scoreData} margin={{ top: 8, right: 12, bottom: 28, left: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" interval={0} tick={{ fontSize: 11 }} tickFormatter={shortName}/><YAxis/><Tooltip labelFormatter={(label) => String(label)} formatter={(v) => [typeof v === "number" ? localizedScore(v, locale) : "—", ui.scenarioScore]}/><Bar name={ui.scenarioScore} dataKey="score" fill="#2563eb" maxBarSize={44}/></BarChart></ComparisonChart><ComparisonChart title="Skor değişimi" height={260}><BarChart data={scoreData} margin={{ top: 8, right: 12, bottom: 28, left: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" interval={0} tick={{ fontSize: 11 }} tickFormatter={shortName}/><YAxis/><Tooltip labelFormatter={(label) => String(label)} formatter={(v) => [typeof v === "number" ? signedScore(v) : "—", ui.scoreDifference]}/><Bar name={ui.scoreDifference} dataKey="difference" fill="#0d9488" maxBarSize={44}/></BarChart></ComparisonChart></div>
    {categoryData.length ? <div className="grid grid-cols-1 gap-5 xl:grid-cols-2"><ComparisonChart title="Kategori karşılaştırması" height={300}><BarChart data={categoryData} margin={{ top: 8, right: 12, bottom: 22, left: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="category" interval={0} tick={{ fontSize: 10 }}/><YAxis/><Tooltip formatter={(v, name) => [typeof v === "number" ? localizedScore(v, locale) : "—", String(name)]}/><Legend wrapperStyle={{ fontSize: 12 }}/>{scenarios.map((item, i) => <Bar key={item.id} name={item.name} dataKey={item.name} fill={SCENARIO_COLORS[i]} maxBarSize={24}/>)}</BarChart></ComparisonChart><ComparisonChart title="Radar karşılaştırması" height={320}><RadarChart data={categoryData} outerRadius="68%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}><PolarGrid/><PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }}/><Tooltip formatter={(v, name) => [typeof v === "number" ? localizedScore(v, locale) : "—", String(name)]}/><Legend wrapperStyle={{ fontSize: 12 }}/>{scenarios.map((item, i) => <Radar key={item.id} name={item.name} dataKey={item.name} stroke={SCENARIO_COLORS[i]} fill={SCENARIO_COLORS[i]} fillOpacity={0.04} strokeWidth={2}/>)}</RadarChart></ComparisonChart></div> : null}
    <div className="max-w-full overflow-x-auto rounded-lg border"><table className="w-full min-w-[620px] table-fixed text-sm"><thead><tr><th className="w-[34%] px-3 py-2 text-left">{ui.parameter}</th><th className="px-3 py-2 text-right"><span className="block">{ui.institutionalCurrent}</span><span className="block text-[11px] font-normal text-slate-400">{ui.baselineValue}</span></th>{scenarios.map((item) => <th key={item.id} title={item.name} className="break-words px-3 py-2 text-right"><span className="block">{item.name}</span><span className="block text-[11px] font-normal text-slate-400">{ui.scenarioColumnValue}</span></th>)}</tr></thead><tbody>{metrics.map((id) => { const first = scenarios.flatMap((item) => item.changedMetrics).find((item) => item.parameterId === id); const isGreenMetric = scenarios[0]?.methodology === "GREENMETRIC"; return <tr key={id} className="border-t"><td className="break-words px-3 py-2">{isGreenMetric ? getGreenMetricScenarioParameterLabel(id, first?.label, language) : getScenarioParameterLabel(id, first?.label)}</td><td className="break-words px-3 py-2 text-right tabular-nums">{isGreenMetric ? formatGreenMetricScenarioValue(id, first?.currentValue, language, locale) : value(first?.currentValue)}</td>{scenarios.map((scenario) => { const metric = scenario.changedMetrics.find((item) => item.parameterId === id); return <td key={scenario.id} className="break-words px-3 py-2 text-right tabular-nums">{metric ? isGreenMetric ? formatGreenMetricScenarioValue(id, metric.scenarioValue, language, locale) : value(metric.scenarioValue) : <span title={ui.unchangedHint}><span className="block">{ui.unchanged}</span><span className="block text-[11px] text-slate-400">{ui.unchangedHint}</span></span>}</td>; })}</tr>; })}</tbody></table></div>
  </section>;
}

const SCENARIO_COLORS = ["#2563eb", "#0d9488", "#7c3aed", "#ea580c"] as const;
function InfoGroup({ title, items }: { title: string; items: string[][] }) { return <section className="rounded-lg border border-slate-200 p-3"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3><dl className="mt-2 grid gap-2">{items.map(([label, value]) => <InfoItem key={label} label={label} value={value} />)}</dl></section>; }
function InfoItem({ label, value, hint, emphasized = false, tone = "neutral" }: { label: string; value: string; hint?: string; emphasized?: boolean; tone?: "positive" | "negative" | "neutral" }) { const color = tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-700" : "text-slate-900"; return <div className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className={`${emphasized ? "font-bold" : "font-semibold"} break-words tabular-nums ${color}`}>{value}</dd>{hint ? <p className="text-[11px] leading-4 text-slate-400">{hint}</p> : null}</div>; }
function SummaryDatum({ label, value, hint, emphasized = false, tone = "neutral" }: { label: string; value: string; hint?: string; emphasized?: boolean; tone?: "positive" | "negative" | "neutral" }) { const color = tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-700" : "text-slate-900"; return <div className="min-w-0" title={hint}><dt className="text-[11px] text-slate-500">{label}</dt><dd className={`${emphasized ? "font-bold" : "font-semibold"} break-words tabular-nums ${color}`}>{value}</dd></div>; }
function StatusWithHint({ status, language, compact = false }: { status: SavedScenarioSnapshot["calculationStatus"]; language: "tr" | "en"; compact?: boolean }) { const ui = scenarioComparisonUiTranslations[language]; const presentation = status === "complete" ? [ui.complete, ui.completeHint] : status === "raw-analysis-only" ? [ui.rawAnalysis, ui.rawAnalysisHint] : status === "complete-with-held-indicator-scores" ? [ui.held, ui.heldHint] : status === "missing-data" ? [ui.missing, ui.missingHint] : [ui.validation, ui.validationHint]; return <div><span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">{presentation[0]}</span><p className={`${compact ? "mt-1" : "mt-0.5"} text-[11px] leading-4 text-slate-400`}>{presentation[1]}</p></div>; }
const localizedScore = (number: number | null, locale: string) => number === null || !Number.isFinite(number) ? "—" : number.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const localizedMethodologyScore = (scenario: SavedScenarioSnapshot, number: number | null, locale: string) => scenario.methodology === "GREENMETRIC" ? `${localizedScore(number, locale)} / 10.000` : localizedScore(number, locale);
const localizedSignedDifference = (scenario: SavedScenarioSnapshot, locale: string) => { const difference = scenario.scoreDifference; if (difference === null || !Number.isFinite(difference)) return "—"; if (scenario.methodology === "THE") return formatTheScoreDifference(difference, locale); const magnitude = difference < 0 ? -difference : difference; const formatted = magnitude.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); return difference === 0 ? formatted : `${difference > 0 ? "+" : "−"}${formatted}`; };
const differenceTone = (difference: number | null): "positive" | "negative" | "neutral" => difference === null || difference === 0 ? "neutral" : difference > 0 ? "positive" : "negative";
const localizedDateTime = (input: string, locale: string) => Number.isNaN(Date.parse(input)) ? "—" : new Date(input).toLocaleString(locale);
const sourceLabelLocalized = (source: SavedScenarioSnapshot["source"], manualLabel: string, language: "tr" | "en") => source === "cross-analysis" ? language === "tr" ? "Çapraz Analiz" : "Cross Analysis" : source === "manual-scenario" ? manualLabel : source === "recommendation-engine" ? language === "tr" ? "Öneri Motoru" : "Recommendation Engine" : language === "tr" ? "Ham Veri Analizi" : "Raw Data Analysis";
function ComparisonChart({ title, height, children }: { title: string; height: number; children: React.ReactElement }) { return <article className="min-w-0 overflow-hidden rounded-xl border bg-slate-50/40 p-3"><h3 className="font-semibold">{title}</h3><div className="mt-2 min-w-0" style={{ height }}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></article>; }
const shortName = (name: string) => name.length > 22 ? `${name.slice(0, 21)}…` : name;
const signedScore = (number: number) => formatTheScoreDifference(number, "tr-TR");
function SnapshotData({ title, current, scenario, methodology, language = "tr" }: { title: string; current: Record<string, number | null> | null; scenario: Record<string, number | null> | null; methodology?: SavedScenarioSnapshot["methodology"]; language?: "tr" | "en" }) {
  const ids = [...new Set([...Object.keys(current ?? {}), ...Object.keys(scenario ?? {})])];
  if (!ids.length) return <p className="mt-4 text-sm text-slate-500">{title}: Veri mevcut değil.</p>;
  return <details className="mt-4"><summary className="font-semibold">{title}</summary><div className="mt-2 overflow-x-auto"><table className="min-w-[500px] text-sm"><thead><tr><th>Alan</th><th>Mevcut</th><th>Senaryo</th></tr></thead><tbody>{ids.map((id) => <tr key={id} className="border-t"><td className="p-2">{methodology ? getMethodologyCategoryLabel(methodology, id, language) : id}</td><td className="p-2">{score(current?.[id] ?? null)}</td><td className="p-2">{score(scenario?.[id] ?? null)}</td></tr>)}</tbody></table></div></details>;
}
const metricKey = (item: SavedScenarioSnapshot["changedMetrics"][number]) => `${item.parameterId}::${item.field ?? ""}`;
export const getScenarioComparisonCategoryIds = (scenarios: readonly SavedScenarioSnapshot[]) => scenarios[0]?.methodology === "CROSS_ANALYSIS"
  ? []
  : scenarios[0]?.methodology === "GREENMETRIC"
    ? greenMetricCategoryMeta.map((category) => category.code)
    : [...new Set(scenarios.flatMap((item) => Object.keys(item.scenarioCategoryScores ?? {})))];
export const uniqueMetricChanges = (scenario: SavedScenarioSnapshot) => {
  if (isSavedCrossAnalysisScenario(scenario)) return [];
  const displayed = scenario.methodology === "QS" ? presentQsLegacyMetricChanges(scenario.changedMetrics).metrics : scenario.changedMetrics;
  return [...new Map(displayed.map((item) => [metricKey(item), item])).values()];
};
const countUniqueMetricChanges = (scenario: SavedScenarioSnapshot) => isSavedCrossAnalysisScenario(scenario) ? scenario.crossAnalysis.overrides.length : uniqueMetricChanges(scenario).length;
const metricDifference = (item: SavedScenarioSnapshot["changedMetrics"][number]) => {
  if (typeof item.difference === "number") return formatScenarioParameterValue(item.parameterId, item.difference);
  return typeof item.currentValue === "number" && typeof item.scenarioValue === "number" ? formatScenarioParameterValue(item.parameterId, item.scenarioValue - item.currentValue) : "—";
};
function EmptyScenarios() { return <main className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/70 p-8 text-center shadow-sm"><div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-100 text-xl text-blue-700">◇</div><h1 className="mt-4 text-xl font-bold">Henüz kayıtlı senaryo bulunmuyor</h1><p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">THE, QS veya UI GreenMetric simülatöründe oluşturduğunuz senaryoları kaydederek burada görüntüleyebilir ve karşılaştırabilirsiniz.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm" href="/the">THE Simülatörüne Git</Link><Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm" href="/qs">QS Simülatörüne Git</Link><Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm" href="/greenmetric">UI GreenMetric Simülatörüne Git</Link></div></main>; }
function StatusBadge({ status }: { status: SavedScenarioSnapshot["calculationStatus"] }) { return <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs">{status === "raw-analysis-only" ? "Ham veri analizi" : status === "complete" ? "Tamamlandı" : status === "complete-with-held-indicator-scores" ? "Sabit gösterge skorları" : status === "missing-data" ? "Eksik veri" : "Doğrulama hatası"}</span>; }
const score = (number: number | null) => number === null || !Number.isFinite(number) ? "—" : number.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const value = (item: unknown) => typeof item === "number" ? item.toLocaleString("tr-TR") : item === null || item === undefined ? "—" : String(item);
const methodologyLabel = (item: SavedScenarioSnapshot["methodology"], language: "tr" | "en" = "tr") => item === "GREENMETRIC" ? "UI GreenMetric" : item === "CROSS_ANALYSIS" ? language === "tr" ? "Çapraz Analiz" : "Cross Analysis" : item;
const methodologyShortLabel = (item: "the" | "qs" | "greenmetric") => item === "greenmetric" ? "GM" : item.toUpperCase();

export function getScenarioSelectionError(
  selectedScenarios: readonly SavedScenarioSnapshot[],
  candidate: SavedScenarioSnapshot,
) {
  if (isSavedCrossAnalysisScenario(candidate)) return "Çapraz Analiz kayıtları normal metodoloji senaryolarıyla karşılaştırılamaz.";
  if (selectedScenarios.length >= 4) return "Aynı anda en fazla 4 senaryo karşılaştırılabilir.";
  if (selectedScenarios[0] && selectedScenarios[0].methodology !== candidate.methodology) {
    return "Doğrudan karşılaştırma için aynı metodolojiye ait senaryolar seçilmelidir.";
  }
  return null;
}

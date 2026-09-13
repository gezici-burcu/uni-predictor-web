"use client";

import Link from "next/link";
import { useState } from "react";
import { useSavedScenarios } from "@/src/contexts/SavedScenariosContext";
import {
  formatGreenMetricScenarioValue,
  getGreenMetricScenarioParameterLabel,
  getMethodologyCategoryLabel,
  getScenarioParameterLabel,
  presentQsLegacyMetricChanges,
} from "@/src/lib/scenarios/scenario-presentation";
import type { SavedScenarioMethodology, SavedScenarioSnapshot } from "@/src/types/saved-scenario";
import { formatTheScoreDifference } from "@/src/lib/the/format-the-score-difference";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { resolveSavedTheRankBandPresentation } from "@/src/lib/the/the-rank-band-source";

const GREEN_METRIC_REVIEW_TEXT = {
  tr: {
    reviewing: "Kayıtlı senaryo inceleniyor", snapshotNotice: "Bu görünüm kayıtlı snapshot üzerinden açılmıştır. Yapacağınız değişiklikler kurumsal verileri veya kayıtlı senaryoyu otomatik olarak değiştirmez.", legacyNotice: "Bu eski senaryoda bazı giriş değerleri kayıtlı değildir. Mevcut snapshot sonuçları gösterilmektedir.", back: "Senaryolar Sekmesine Dön", saveCopy: "Yeni Senaryo Olarak Kaydet", currentScore: "Kurumsal mevcut skor", scenarioScore: "Kayıtlı senaryo skoru", scoreChange: "Skor değişimi", currentRank: "Mevcut sıralama bandı", scenarioRank: "Senaryo tahmini sıralama bandı", changedParameters: "Değiştirilen Parametreler", parameter: "Parametre", current: "Kurumsal mevcut", scenario: "Kayıtlı senaryo", categories: "Kategori Sonuçları", indicators: "Gösterge Sonuçları", area: "Alan", warnings: "Uyarılar", noData: "Kayıtlı veri bulunmuyor.",
  },
  en: {
    reviewing: "Reviewing saved scenario", snapshotNotice: "This view was opened from the saved snapshot. Changes made here do not automatically modify institutional data or the saved scenario.", legacyNotice: "Some input values are unavailable in this legacy scenario. The stored snapshot results are shown.", back: "Back to Scenarios", saveCopy: "Save as New Scenario", currentScore: "Institutional baseline score", scenarioScore: "Saved scenario score", scoreChange: "Score change", currentRank: "Current ranking band", scenarioRank: "Estimated scenario ranking band", changedParameters: "Changed Parameters", parameter: "Parameter", current: "Institutional baseline", scenario: "Saved scenario", categories: "Category Results", indicators: "Indicator Results", area: "Area", warnings: "Warnings", noData: "No saved data available.",
  },
} as const;

export function ScenarioMethodologyReview({ methodology, scenarioId, children }: {
  methodology: SavedScenarioMethodology;
  scenarioId?: string;
  children: React.ReactNode;
}) {
  const { scenarios, save } = useSavedScenarios();
  const [message, setMessage] = useState<string | null>(null);
  if (!scenarioId) return children;
  const scenario = scenarios.find((item) => item.id === scenarioId);
  if (!scenario || scenario.methodology !== methodology) {
    return <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950" role="alert">
      <h1 className="text-lg font-bold">Senaryo açılamadı</h1>
      <p className="mt-2 text-sm">Senaryo bulunamadı veya metodoloji bilgisi bu ekranla eşleşmiyor.</p>
      <Link className="mt-4 inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold" href="/scenario-comparison">Senaryolar Sekmesine Dön</Link>
    </section>;
  }
  const saveCopy = () => {
    const name = window.prompt("Yeni senaryo adı", `${scenario.name} Kopyası`);
    if (name === null) return;
    const now = new Date().toISOString();
    const copy = createScenarioReviewCopy(scenario, name, crypto.randomUUID(), now);
    setMessage(save(copy) ?? "Yeni senaryo kaydedildi. Kayıtlı kaynak senaryo değiştirilmedi.");
  };
  return <ScenarioSnapshotReview scenario={scenario} message={message} onSaveCopy={saveCopy} />;
}

export function createScenarioReviewCopy(scenario: SavedScenarioSnapshot, name: string, id: string, now: string) {
  return structuredClone({ ...scenario, id, name, createdAt: now, updatedAt: now });
}

export function ScenarioSnapshotReview({ scenario, message, onSaveCopy }: {
  scenario: SavedScenarioSnapshot;
  message?: string | null;
  onSaveCopy?: () => void;
}) {
  const { language, locale } = useAppLanguage();
  const greenMetricText = scenario.methodology === "GREENMETRIC" ? GREEN_METRIC_REVIEW_TEXT[language] : null;
  const scoreLocale = greenMetricText ? locale : "tr-TR";
  const displayedChanges = scenario.methodology === "QS" ? presentQsLegacyMetricChanges(scenario.changedMetrics) : { metrics: scenario.changedMetrics, warnings: [] };
  const changedParameterRows = displayedChanges.metrics.map((metric) => scenario.methodology === "GREENMETRIC"
    ? [
        getGreenMetricScenarioParameterLabel(metric.parameterId, metric.label, language),
        formatGreenMetricScenarioValue(metric.parameterId, metric.currentValue, language, locale),
        formatGreenMetricScenarioValue(metric.parameterId, metric.scenarioValue, language, locale),
      ]
    : [getScenarioParameterLabel(metric.parameterId, metric.label), display(metric.currentValue), display(metric.scenarioValue)]);
  const rankBands = scenario.methodology === "THE" ? resolveSavedTheRankBandPresentation(scenario) : null;
  return <main className="min-w-0 space-y-5">
    <section className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-950">
      <h1 className="font-bold">{greenMetricText?.reviewing ?? "Kayıtlı senaryo inceleniyor"}: {scenario.name}</h1>
      <p className="mt-1 text-sm">{greenMetricText?.snapshotNotice ?? "Bu görünüm kayıtlı snapshot üzerinden açılmıştır. Yapacağınız değişiklikler kurumsal verileri veya kayıtlı senaryoyu otomatik olarak değiştirmez."}</p>
    </section>
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{greenMetricText?.legacyNotice ?? "Bu eski senaryoda bazı giriş değerleri kayıtlı değildir. Mevcut snapshot sonuçları gösterilmektedir."}</p>
    <div className="flex flex-wrap gap-2">
      <Link href="/scenario-comparison" className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold">{greenMetricText?.back ?? "Senaryolar Sekmesine Dön"}</Link>
      {onSaveCopy ? <button type="button" onClick={onSaveCopy} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white">{greenMetricText?.saveCopy ?? "Yeni Senaryo Olarak Kaydet"}</button> : null}
    </div>
    {message ? <p role="status" className="rounded-lg border bg-white px-4 py-3 text-sm">{message}</p> : null}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SnapshotCard label={greenMetricText?.currentScore ?? "Kurumsal mevcut skor"} value={formatScore(scenario.currentScore, scoreLocale)} />
      <SnapshotCard label={greenMetricText?.scenarioScore ?? "Kayıtlı senaryo skoru"} value={formatScore(scenario.scenarioScore, scoreLocale)} />
      <SnapshotCard label={greenMetricText?.scoreChange ?? "Skor değişimi"} value={scenario.methodology === "THE" && scenario.scoreDifference !== null ? formatTheScoreDifference(scenario.scoreDifference, "tr-TR") : formatScore(scenario.scoreDifference, scoreLocale)} />
      <SnapshotCard label={greenMetricText?.currentRank ?? "Mevcut sıralama bandı"} value={rankBands?.currentBand ?? scenario.currentRankBand ?? "—"} />
      <SnapshotCard label={greenMetricText?.scenarioRank ?? "Senaryo tahmini sıralama bandı"} value={rankBands?.scenarioBand ?? scenario.scenarioRankBand ?? "—"} />
    </div>
    <SnapshotTable title={greenMetricText?.changedParameters ?? "Değiştirilen Parametreler"} rows={changedParameterRows} headings={[greenMetricText?.parameter ?? "Parametre", greenMetricText?.current ?? "Kurumsal mevcut", greenMetricText?.scenario ?? "Kayıtlı senaryo"]} emptyLabel={greenMetricText?.noData} />
    {displayedChanges.warnings.map((warning) => <p key={warning} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{warning}</p>)}
    <SnapshotScores title={greenMetricText?.categories ?? "Kategori Sonuçları"} current={scenario.currentCategoryScores} scenario={scenario.scenarioCategoryScores} methodology={scenario.methodology} language={language} locale={scoreLocale} headings={[greenMetricText?.area ?? "Alan", greenMetricText?.current ?? "Kurumsal mevcut", greenMetricText?.scenario ?? "Kayıtlı senaryo"]} emptyLabel={greenMetricText?.noData} />
    <SnapshotScores title={greenMetricText?.indicators ?? "Gösterge Sonuçları"} current={scenario.currentIndicatorScores} scenario={scenario.scenarioIndicatorScores} locale={scoreLocale} headings={[greenMetricText?.area ?? "Alan", greenMetricText?.current ?? "Kurumsal mevcut", greenMetricText?.scenario ?? "Kayıtlı senaryo"]} emptyLabel={greenMetricText?.noData} />
    {scenario.warnings.length ? <section className="rounded-xl border bg-white p-4"><h2 className="font-semibold">{greenMetricText?.warnings ?? "Uyarılar"}</h2><ul className="mt-2 list-disc pl-5 text-sm text-amber-800">{scenario.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></section> : null}
  </main>;
}

function SnapshotCard({ label, value }: { label: string; value: string }) { return <article className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></article>; }
function SnapshotScores({ title, current, scenario, methodology = "THE", language = "tr", locale = "tr-TR", headings = ["Alan", "Kurumsal mevcut", "Kayıtlı senaryo"], emptyLabel }: { title: string; current: Record<string, number | null> | null; scenario: Record<string, number | null> | null; methodology?: SavedScenarioMethodology; language?: "tr" | "en"; locale?: string; headings?: string[]; emptyLabel?: string }) {
  const ids = [...new Set([...Object.keys(current ?? {}), ...Object.keys(scenario ?? {})])];
  return <SnapshotTable title={title} headings={headings} rows={ids.map((id) => [getMethodologyCategoryLabel(methodology, id, language), formatScore(current?.[id] ?? null, locale), formatScore(scenario?.[id] ?? null, locale)])} emptyLabel={emptyLabel} />;
}
function SnapshotTable({ title, headings, rows, emptyLabel = "Kayıtlı veri bulunmuyor." }: { title: string; headings: string[]; rows: string[][]; emptyLabel?: string }) { return <section className="min-w-0 rounded-xl border bg-white p-4"><h2 className="font-semibold">{title}</h2>{rows.length ? <div className="mt-3 max-w-full overflow-x-auto"><table className="min-w-[620px] text-sm"><thead><tr>{headings.map((heading) => <th key={heading} className="px-3 py-2 text-left">{heading}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`} className="border-t">{row.map((cell, cellIndex) => <td key={cellIndex} className={`px-3 py-2 ${cellIndex ? "text-right tabular-nums" : ""}`}>{cell}</td>)}</tr>)}</tbody></table></div> : <p className="mt-2 text-sm text-slate-500">{emptyLabel}</p>}</section>; }
const formatScore = (value: number | null, locale = "tr-TR") => value === null ? "—" : value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const display = (value: unknown) => typeof value === "number" ? value.toLocaleString("tr-TR") : value == null ? "—" : String(value);

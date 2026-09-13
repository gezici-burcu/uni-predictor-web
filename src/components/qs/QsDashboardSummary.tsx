"use client";

import type { QsRankEstimationResult } from "@/src/types/qs-rank-estimation";
import type { QsStochasticSimulationResult } from "@/src/types/qs-stochastic";
import { TheSummaryCard } from "@/src/components/the/TheSummaryCard";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";

export function QsDashboardSummary({
  simulation,
  rankEstimation,
  hasValidationError = false,
}: {
  simulation: QsStochasticSimulationResult;
  rankEstimation: QsRankEstimationResult;
  hasValidationError?: boolean;
}) {
  const { t, locale, language } = useAppLanguage();
  const format = (value: number | null) => value === null ? "—" : new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const complete = simulation.scenario.overallStatus === "ready"
    && !hasValidationError;
  const scenarioOverall = complete ? simulation.scenario.estimatedOverallScore : null;
  const rankReady = rankEstimation.scenario.status === "ready"
    && !hasValidationError;
  const calculationStatus = hasValidationError ? "validation-error" : simulation.calculationStatus;
  const rawImpactOnly = calculationStatus === "raw-analysis-only";
  const partialEstimate = calculationStatus === "complete-with-held-indicator-scores";
  const modeledIndicatorCodes = Object.values(simulation.scenario.indicators)
    .filter((indicator) => indicator.calibrationType === "model-based")
    .map((indicator) => indicator.code);
  const hasModeledEstimate = modeledIndicatorCodes.length > 0;
  const currentDisplayedScore = partialEstimate
    ? simulation.current.partialEstimatedOverallScore
    : simulation.current.estimatedOverallScore;
  const scenarioDisplayedScore = partialEstimate
    ? simulation.scenario.partialEstimatedOverallScore
    : scenarioOverall;
  // Keep the delta synchronized with the exact pair rendered in the cards.
  const displayedDifference = currentDisplayedScore === null || scenarioDisplayedScore === null
    ? null
    : scenarioDisplayedScore - currentDisplayedScore;
  const currentComposite = simulation.current.weightedCompositeScore;
  const scenarioComposite = simulation.scenario.weightedCompositeScore;
  const compositeDifference = currentComposite !== null && scenarioComposite !== null
    ? scenarioComposite - currentComposite
    : null;
  const formatRank = (value: number | null) => value === null ? "—" : new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
  const scenarioBand = rankEstimation.scenario.calibrated.predictedBand;
  const scenarioRankCenter = rankEstimation.scenario.calibrated.expectedRank;
  const rankHasScenarioChange = !rankEstimation.diagnostics.reusedScenarioResult;
  const rankValue = rankReady
    ? `${rankEstimation.calibration.publishedBand} → ${scenarioBand ?? "—"}`
    : `${rankEstimation.calibration.publishedBand} → —`;
  const rankChangeLabel = language === "tr"
    ? rankEstimation.change.label
    : rankEstimation.change.status === "improved"
      ? "Estimated ranking improved"
      : rankEstimation.change.status === "worsened"
        ? "Estimated ranking worsened"
        : "Ranking band unchanged";
  const rankSubtitle = partialEstimate && rankReady
    ? (language === "tr"
      ? "Yaklaşık bant · kısmi skor nedeniyle düşük güven. Kalibre edilemeyen göstergeler dışarıda bırakıldı."
      : "Approximate band · low confidence due to the partial score. Uncalibrated indicators were excluded.")
    : rankReady && rankHasScenarioChange
    ? language === "tr"
      ? `Merkez: ≈${formatRank(scenarioRankCenter)} · ${rankChangeLabel}`
      : `Center: ≈${formatRank(scenarioRankCenter)} · ${rankChangeLabel}`
    : rankReady ? t("qsUi.rankDescription") : t("qsUi.rankMissing");
  const cards = [
    {
      title: partialEstimate
        ? (language === "tr" ? "Mevcut Kısmi Tahmin" : "Current Partial Estimate")
        : t("qsUi.currentEstimated"),
      value: format(currentDisplayedScore),
      subtitle: partialEstimate
        ? (language === "tr" ? "QS 2027 referans göstergelerinden üretilen mevcut skor." : "Current score derived from QS 2027 reference indicators.")
        : simulation.current.overallStatus === "ready" ? t("qsUi.currentEstimateDescription") : t("qsUi.waitingIndicators"),
    },
    {
      title: partialEstimate
        ? (language === "tr" ? "Senaryo Kısmi Tahmini" : "Scenario Partial Estimate")
        : t("qsUi.scenarioEstimated"),
      value: format(scenarioDisplayedScore),
      subtitle: partialEstimate
        ? (language === "tr"
          ? `Kısmi tahmin · kalibre edilen göstergelerin %${(simulation.scenario.includedWeight * 100).toFixed(0)} ağırlığı.`
          : `Partial estimate · ${(simulation.scenario.includedWeight * 100).toFixed(0)}% calibrated indicator weight.`)
        : complete ? t("qsUi.scenarioEstimateDescription") : t("qsUi.waitingIndicators"),
    },
    {
      title: partialEstimate
        ? (language === "tr" ? "Kısmi Skor Değişimi" : "Partial Score Change")
        : t("qsUi.scoreChange"),
      value: displayedDifference === null ? "—" : `${displayedDifference > 0 ? "+" : ""}${format(displayedDifference)}`,
      subtitle: partialEstimate
        ? (language === "tr"
          ? `${format(simulation.current.partialEstimatedOverallScore)} mevcut kısmi baza göre değişim.`
          : `Change from the ${format(simulation.current.partialEstimatedOverallScore)} current partial baseline.`)
        : t("qsUi.scoreDifferenceDescription"),
    },
    {
      title: partialEstimate
        ? (language === "tr" ? "Yaklaşık Kısmi Sıralama Bandı" : "Approximate Partial Ranking Band")
        : t("qsUi.estimatedBand"),
      value: rankValue,
      subtitle: rankSubtitle,
      valueClassName: "break-words !text-[1.05rem] !leading-snug sm:!text-[1.15rem] 2xl:!text-[1.2rem]",
      status: partialEstimate || !rankReady ? "warning" as const : undefined,
    },
    {
      title: t("qsUi.calculationStatus"),
      value: hasValidationError
        ? t("qsUi.parameterError")
        : rawImpactOnly
          ? t("qsUi.rawAnalysis")
          : partialEstimate
          ? (language === "tr" ? "Kısmi" : "Partial")
          : hasModeledEstimate
          ? (language === "tr" ? "Model tahmini" : "Model estimate")
          : complete
          ? t("qsUi.complete")
          : t("qsUi.missingData"),
      subtitle: rawImpactOnly
        ? t("qsUi.calibrationUnavailable")
        : hasValidationError
          ? t("qsUi.validationDetail")
        : partialEstimate
          ? (language === "tr"
            ? `${simulation.scenario.excludedIndicatorCodes.join(", ")} dışarıda · kapsam %${(simulation.scenario.includedWeight * 100).toFixed(0)}`
            : `${simulation.scenario.excludedIndicatorCodes.join(", ")} excluded · ${(simulation.scenario.includedWeight * 100).toFixed(0)}% coverage`)
        : hasModeledEstimate
          ? (language === "tr"
            ? `${modeledIndicatorCodes.join(", ")} · düşük güven`
            : `${modeledIndicatorCodes.join(", ")} · low confidence`)
        : complete
          ? t("qsUi.calculated")
        : t("qsUi.ready").replace("{ready}", String(simulation.scenario.readyWeightedIndicatorCount)).replace("{total}", String(simulation.scenario.totalWeightedIndicatorCount)),
      status: !complete || calculationStatus !== "complete" ? "warning" as const : undefined,
    },
  ];
  const statusDetail = hasValidationError
    ? `${t("qsUi.validationDetail")} ${t("qsUi.readyDetail").replace("{ready}", String(simulation.scenario.readyWeightedIndicatorCount)).replace("{total}", String(simulation.scenario.totalWeightedIndicatorCount))}`
    : rawImpactOnly
      ? t("qsUi.rawDetail")
    : partialEstimate
      ? (language === "tr"
        ? `${simulation.scenario.excludedIndicatorCodes.join(", ")} skor kalibrasyonu olmadığı için kartlarda kapsam-eşlenmiş kısmi tahmin gösteriliyor: ${format(simulation.current.partialEstimatedOverallScore)} → ${format(simulation.scenario.partialEstimatedOverallScore)} (${displayedDifference !== null && displayedDifference > 0 ? "+" : ""}${format(displayedDifference)}). Bu değer tam QS skoru değildir; dahil edilen ağırlık %${(simulation.scenario.includedWeight * 100).toFixed(0)}.`
        : `Because score calibration is unavailable for ${simulation.scenario.excludedIndicatorCodes.join(", ")}, the cards show a coverage-matched partial estimate: ${format(simulation.current.partialEstimatedOverallScore)} → ${format(simulation.scenario.partialEstimatedOverallScore)} (${displayedDifference !== null && displayedDifference > 0 ? "+" : ""}${format(displayedDifference)}). This is not a full QS score; included weight ${(simulation.scenario.includedWeight * 100).toFixed(0)}%.`)
    : hasModeledEstimate
      ? (language === "tr"
        ? `${modeledIndicatorCodes.join(", ")} göstergelerindeki değişim, mevcut yayımlanmış skor ankrajı ve ham oran değişimiyle düşük güvenli stokastik model üzerinden tahmin edildi. Senaryo skoru ve fark yaklaşık değerdir; resmî QS sonucu değildir.`
        : `Changes in ${modeledIndicatorCodes.join(", ")} were estimated with a low-confidence stochastic model using the current published score anchor and raw-ratio change. The scenario score and delta are approximate, not official QS results.`)
    : !complete
      ? t("qsUi.readyDetail").replace("{ready}", String(simulation.scenario.readyWeightedIndicatorCount)).replace("{total}", String(simulation.scenario.totalWeightedIndicatorCount))
      : t("qsUi.completeDetail").replace("{year}", String(simulation.institutionalDataYear)).replace("{edition}", String(simulation.scoreReferenceEdition));

  return <div className="space-y-3" data-calculation-status={calculationStatus}>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 kpi-grid" data-testid="qs-summary-cards">
      {cards.map((card) => <TheSummaryCard key={card.title} {...card} />)}
    </div>
    <div className={`rounded-xl border px-4 py-3 text-sm ${calculationStatus === "complete" ? "border-blue-200 bg-blue-50 text-blue-900" : partialEstimate ? "border-amber-200 bg-amber-50 text-amber-900" : "border-amber-200 bg-amber-50 text-amber-900"}`} role={calculationStatus === "complete" ? "status" : "alert"}>
      {statusDetail}
    </div>
    <details className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
      <summary className="cursor-pointer font-semibold text-slate-900">{t("qsUi.technicalDetails")}</summary>
      <div className="mt-3 space-y-2">
        <ol className="grid gap-2 sm:grid-cols-3" aria-label={language === "tr" ? "QS hesaplama aşamaları" : "QS calculation stages"}>
          <li className="rounded-lg bg-slate-50 p-3"><strong className="block text-slate-900">1. {t("qsUi.composite")}</strong><span className="mt-1 block text-xs text-slate-600">{language === "tr" ? "Gösterge skorlarının resmî ağırlıklı teknik toplamı." : "Technical weighted sum of indicator scores."}</span></li>
          <li className="rounded-lg bg-amber-50 p-3"><strong className="block text-amber-950">2. {language === "tr" ? "Kapsam Eşlenmiş Kısmi Skor" : "Coverage-matched Partial Score"}</strong><span className="mt-1 block text-xs text-amber-900">{language === "tr" ? "Yalnız kalibre edilebilen göstergelerin karşılaştırılabilir ara sonucu." : "Comparable intermediate result using only calibrated indicators."}</span></li>
          <li className="rounded-lg bg-blue-50 p-3"><strong className="block text-blue-950">3. {language === "tr" ? "Senaryo Tahmini" : "Scenario Estimate"}</strong><span className="mt-1 block text-xs text-blue-900">{language === "tr" ? "Veri kapsamına göre tam veya açıkça kısmi olarak sunulan model çıktısı." : "Model output presented as full or explicitly partial according to data coverage."}</span></li>
        </ol>
        {currentComposite === scenarioComposite ? (
          <p><span className="font-medium">{t("qsUi.composite")}:</span> {format(currentComposite)}</p>
        ) : (
          <dl className="grid gap-1 sm:grid-cols-[auto_1fr] sm:gap-x-3">
            <dt className="font-medium">{t("qsUi.currentComposite")}</dt><dd>{format(currentComposite)}</dd>
            <dt className="font-medium">{t("qsUi.scenarioComposite")}</dt><dd>{format(scenarioComposite)}</dd>
            <dt className="font-medium">{t("qsUi.compositeDifference")}</dt><dd>{compositeDifference === null ? "—" : `${compositeDifference > 0 ? "+" : ""}${format(compositeDifference)}`}</dd>
          </dl>
        )}
        <p className="max-w-4xl leading-5 text-slate-600">{t("qsUi.compositeDescription")}</p>
      </div>
    </details>
  </div>;
}

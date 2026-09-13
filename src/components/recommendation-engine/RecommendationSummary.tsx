import {
  classifyRecommendationOutcome,
  formatRecommendationScore,
  getRecommendationScoreRelations,
  formatRecommendationRankEstimate,
  type RecommendationEngineResult,
} from "@/src/lib/recommendation-engine";
import { RecommendationSummaryCard } from "./RecommendationSummaryCard";

export function RecommendationSummary({
  result,
  locale,
  t,
  rawAnalysisOnly = false,
  alternativePlan = false,
}: {
  result: RecommendationEngineResult;
  locale: string;
  t: (key: string) => string;
  rawAnalysisOnly?: boolean;
  alternativePlan?: boolean;
}) {
  const format = result.methodology === "ui-greenmetric"
    ? (value: number | null) => value === null ? "—" : value.toLocaleString(locale, { maximumFractionDigits: 2 })
    : formatRecommendationScore;
  const relations = getRecommendationScoreRelations(result);
  const estimatedScore = relations.recommendedScore;
  const reachable = result.reachability.reachable;
  const improved = estimatedScore - result.constrainedStartScore > 0.0001;

  if (result.calculationAvailability === "score-unavailable") {
    return (
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950" role="status">
        <h2 className="font-semibold">{t("recommendationUi.analysisUnavailable")}</h2>
        <p className="mt-2 text-sm">{t("recommendationUi.qsScoreUnavailableControlled")}</p>
      </section>
    );
  }

  if (result.targetMode === "rankRange" && result.targetRankRange && result.rankTarget) {
    const recommendedEvaluation = result.rankTarget.recommendedEvaluation ??
      result.rankTarget.constrainedStartEvaluation;
    const targetRange = `${result.targetRankRange.bestRank.toLocaleString(locale)}–${result.targetRankRange.worstRank.toLocaleString(locale)}`;
    const statusKey = result.rankTarget.alreadySatisfied
      ? result.rankTarget.constrainedStartEvaluation.status === "exceeded"
        ? "recommendationUi.alreadyExceededRankTarget"
        : "recommendationUi.alreadyMetRankTarget"
      : recommendedEvaluation.status === "exceeded"
        ? "recommendationUi.rankExceeded"
        : recommendedEvaluation.status === "overlaps"
          ? "recommendationUi.rankOverlap"
          : recommendedEvaluation.status === "reached"
            ? "recommendationUi.rankReached"
            : recommendedEvaluation.status === "unavailable"
              ? result.methodology === "qs" && result.qsCapability?.status === "raw-impact-only"
                ? "recommendationUi.qsRankRecommendationUnavailableExplanation"
                : "recommendationUi.rankTargetUnavailable"
              : "recommendationUi.rankNotReached";
    const projectedLabel = recommendedEvaluation.status === "notReached"
      ? "recommendationUi.closestProjectedRank"
      : "recommendationUi.projectedRank";
    const statusTone = recommendedEvaluation.status === "reached" ||
      recommendedEvaluation.status === "exceeded"
      ? "positive"
      : recommendedEvaluation.status === "unavailable"
        ? "neutral"
        : "warning";
    const descriptionKey = result.rankTarget.alreadySatisfied
      ? "recommendationUi.rankAlreadySatisfiedDescription"
      : "recommendationUi.rankRecommendationDescription";
    return (
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/40 p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold text-slate-950">{t("recommendationUi.rankResultTitle")}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {t(descriptionKey).replace("{range}", targetRange)}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <RecommendationSummaryCard
            label={t("recommendationUi.currentEstimatedRank")}
            value={formatRecommendationRankEstimate(result.rankTarget.currentEvaluation.estimate)}
          />
          <RecommendationSummaryCard
            label={t("recommendationUi.targetRankRange")}
            value={targetRange}
          />
          <RecommendationSummaryCard
            label={t(projectedLabel)}
            value={formatRecommendationRankEstimate(recommendedEvaluation.estimate)}
          />
          <RecommendationSummaryCard
            label={t("recommendationUi.targetStatus")}
            value={t(statusKey)}
            variant="status"
            tone={statusTone}
          />
          <RecommendationSummaryCard
            label={t("recommendationUi.changedParameterCount")}
            value={result.primaryPlan?.changes.length ?? result.qsCapability?.rawChanges.length ?? 0}
          />
        </div>
        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-slate-500">{t("recommendationUi.scoreChange")}</p>
          <p className="mt-1 text-base font-semibold text-slate-800">
            {format(result.currentScore)} → {result.qsCapability?.projectedScoreAvailable === false
              ? "—"
              : format(estimatedScore)}
          </p>
        </div>
      </section>
    );
  }

  if (rawAnalysisOnly) {
    const constrainedAvailable = result.qsCapability?.constrainedStartScoreAvailable !== false;
    return <div className="space-y-3">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        <RecommendationSummaryCard label="Mevcut Kurumsal Skor" value={format(result.currentScore)} />
        <RecommendationSummaryCard label="Kullanıcı Değerleri Sonrası Başlangıç Skoru" value={constrainedAvailable ? format(result.constrainedStartScore) : "—"} />
        <RecommendationSummaryCard label="Öneriler Sonrası Tahmini Skor" value="—" />
        <RecommendationSummaryCard label="Hedef Skor" value={format(result.targetScore)} />
        <RecommendationSummaryCard label="Mevcut skora göre gerekli artış" value={format(relations.currentTargetGap)} />
        <RecommendationSummaryCard label="Hedefe kalan fark" value="—" />
        <RecommendationSummaryCard
          label={t("recommendation.reachability")}
          value={t("recommendationUi.qsRawImpactOnlyMessage")}
          variant="status"
          tone="warning"
        />
      </section>
      <QsStartScoreCoverageNotice result={result} locale={locale} t={t} />
    </div>;
  }

  if (result.methodology === "ui-greenmetric") {
    return (
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <RecommendationSummaryCard label={t("recommendation.current")} value={format(result.currentScore)} />
        <RecommendationSummaryCard label={t("recommendation.target")} value={format(result.targetScore)} />
        <RecommendationSummaryCard label={t("recommendationUi.greenMetricEstimatedScore")} value={format(estimatedScore)} />
        <RecommendationSummaryCard label={t("recommendation.increase")} value={format(relations.currentTargetGap)} />
        <RecommendationSummaryCard label={t("recommendationUi.greenMetricRemainingGap")} value={format(relations.remainingTargetGap)} />
        <RecommendationSummaryCard
          label={t("recommendation.reachability")}
          value={reachable ? t("recommendationSummary.reachable") : improved ? t("recommendationUi.greenMetricPartiallyImproved") : t("recommendationSummary.unreachable")}
          variant="status"
          tone={reachable ? "positive" : "warning"}
        />
      </section>
    );
  }

  const status = classifyRecommendationOutcome(result);
  const statusLabel = {
    reached: "Hedefe ulaşıldı",
    "limited-improvement": "Sınırlı iyileşme sağlandı, hedefe ulaşılamadı",
    "no-positive-improvement": "Pozitif iyileşme üretilemedi",
  }[status];

  return (
    <div className="space-y-3">
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      <RecommendationSummaryCard
        label="Mevcut Kurumsal Skor"
        value={format(result.currentScore)}
      />
      <RecommendationSummaryCard
        label="Kullanıcı Değerleri Sonrası Başlangıç Skoru"
        value={format(result.constrainedStartScore)}
      />
      <RecommendationSummaryCard
        label="Öneriler sonrası tahmini skor"
        value={format(estimatedScore)}
      />
      <RecommendationSummaryCard
        label="Hedef Skor"
        value={format(result.targetScore)}
      />
      <RecommendationSummaryCard
        label="Mevcut skora göre gerekli artış"
        value={format(relations.currentTargetGap)}
      />
      <RecommendationSummaryCard
        label="Kullanıcı değerleri sonrasında gerekli artış"
        value={format(relations.constrainedTargetGap)}
      />
      <RecommendationSummaryCard
        label="Hedefe kalan fark"
        value={format(relations.remainingTargetGap)}
      />
      <RecommendationSummaryCard
        label={t("recommendation.reachability")}
        value={alternativePlan
          ? t("recommendationUi.alternativeImprovementPlan")
          : rawAnalysisOnly ? "Ham veri senaryosu oluşturuldu" : statusLabel}
        variant="status"
        tone={status === "reached" ? "positive" : "warning"}
      />
    </section>
    <QsStartScoreCoverageNotice result={result} locale={locale} t={t} />
    </div>
  );
}

function QsStartScoreCoverageNotice({
  result,
  locale,
  t,
}: {
  result: RecommendationEngineResult;
  locale: string;
  t: (key: string) => string;
}) {
  const coverage = result.methodology === "qs"
    ? result.qsCapability?.startScoreCoverage
    : undefined;
  if (!coverage?.isPartial || coverage.excludedIndicatorCodes.length === 0) return null;
  const includedPercent = (coverage.includedWeight * 100).toLocaleString(locale, {
    maximumFractionDigits: 1,
  });
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
      <h2 className="font-semibold">{t("recommendationUi.qsPartialStartScoreTitle")}</h2>
      <p className="mt-1">
        {t("recommendationUi.qsPartialStartScoreDescription")
          .replace("{coverage}", includedPercent)
          .replace("{excluded}", coverage.excludedIndicatorCodes.join(", "))}
      </p>
    </section>
  );
}

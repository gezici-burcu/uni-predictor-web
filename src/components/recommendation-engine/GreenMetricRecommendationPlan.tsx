import { greenMetricIndicators } from "@/src/config/greenmetric.metrics";
import { greenMetricRawMetricDefinitions } from "@/src/data/greenmetric.baseline";
import type { AppLanguage } from "@/src/i18n/types";
import type {
  RecommendationEngineResult,
  RecommendationMetricChange,
  RecommendationMetricDefinition,
  RecommendationParameterInput,
  RecommendationPlan,
} from "@/src/lib/recommendation-engine";

const rawMetricById = new Map(greenMetricRawMetricDefinitions.map((metric) => [metric.id, metric]));
const indicatorByCode = new Map(greenMetricIndicators.map((indicator) => [indicator.code, indicator]));

export function formatGreenMetricRecommendationValue({
  value,
  definition,
  locale,
}: {
  value: unknown;
  definition: RecommendationMetricDefinition | undefined;
  locale: string;
}) {
  const metric = definition ? rawMetricById.get(definition.metricId) : undefined;
  if (Array.isArray(value)) {
    const labels = value.map((item) => metric?.options?.find((option) => option.value === item)?.label ?? String(item));
    return labels.length ? labels.join(", ") : "—";
  }
  if (typeof value === "string") {
    return metric?.options?.find((option) => option.value === value)?.label ?? value;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const formatted = value.toLocaleString(locale, {
    maximumFractionDigits: definition?.kind === "integer-count" ? 0 : 2,
  });
  return `${formatted}${metric?.unit ? ` ${metric.unit}` : ""}`;
}

function score(value: number | null | undefined, locale: string) {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "—"
    : value.toLocaleString(locale, { maximumFractionDigits: 2 });
}

function signed(value: number | null | undefined, locale: string) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${score(value, locale)}`;
}

function threshold(change: RecommendationMetricChange, definition: RecommendationMetricDefinition | undefined, locale: string) {
  if (change.targetThreshold === undefined) return "—";
  const value = typeof change.targetThreshold === "number"
    ? change.targetThreshold.toLocaleString(locale, { maximumFractionDigits: 4 })
    : formatGreenMetricRecommendationValue({ value: change.targetThreshold, definition, locale });
  if (change.thresholdDirection === "decrease") return `↓ ${value}`;
  if (change.thresholdDirection === "increase") return `↑ ${value}`;
  return value;
}

function ValuePair({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="min-w-0 break-words">{before}</span>
        <span aria-hidden="true" className="text-blue-600">→</span>
        <span className="min-w-0 break-words text-blue-700">{after}</span>
      </dd>
    </div>
  );
}

export function GreenMetricRecommendationPlan({
  plan,
  definitions,
  locale,
  language,
  t,
}: {
  plan: RecommendationPlan;
  definitions: RecommendationMetricDefinition[];
  locale: string;
  language: AppLanguage;
  t: (key: string) => string;
}) {
  const definitionById = new Map(definitions.map((definition) => [definition.metricId, definition]));
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-950">{t("recommendation.plan")}</h2>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          {plan.changes.length} {t("recommendationUi.greenMetricRecommendations")}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {plan.changes.map((change, index) => {
          const definition = definitionById.get(change.metricId);
          const indicator = change.indicatorCode ? indicatorByCode.get(change.indicatorCode) : undefined;
          const current = formatGreenMetricRecommendationValue({ value: change.currentValue, definition, locale });
          const proposed = formatGreenMetricRecommendationValue({ value: change.proposedValue ?? change.recommendedValue, definition, locale });
          const changedSources = (change.changedSourceMetricIds ?? []).map((metricId) =>
            rawMetricById.get(metricId)?.label ?? definitionById.get(metricId)?.label ?? metricId);
          return (
            <article key={`${change.metricId}-${change.indicatorCode ?? index}`} data-greenmetric-recommendation-card className="min-w-0 rounded-xl border border-slate-200 p-3.5 sm:p-4">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">{change.indicatorCode ?? change.categoryId ?? "UI GreenMetric"}</p>
                  <h3 className="mt-1 break-words text-sm font-semibold text-slate-950 sm:text-base">
                    {change.metricName ?? change.label[language] ?? definition?.label ?? change.metricId}
                  </h3>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700">
                  {signed(change.scoreGain ?? change.incrementalScoreImpact, locale)} {t("recommendationUi.greenMetricPoints")}
                </span>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.8fr)]">
                <div className="rounded-lg bg-slate-50 p-3">
                  <ValuePair label={t("recommendationUi.greenMetricRawValueChange")} before={current} after={proposed} />
                  {changedSources.length ? (
                    <div className="mt-3 border-t border-slate-200 pt-2">
                      <p className="text-xs font-medium text-slate-500">{t("recommendationUi.greenMetricChangedParameters")}</p>
                      <ul className="mt-1 space-y-1 text-xs text-slate-700">
                        {changedSources.map((label) => <li key={label} className="break-words">{label}</li>)}
                      </ul>
                    </div>
                  ) : null}
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3">
                  <p className="text-xs font-medium text-blue-700">{t("recommendationUi.greenMetricNextThreshold")}</p>
                  <p className="mt-1 break-words text-base font-bold text-blue-950">{threshold(change, definition, locale)}</p>
                  <p className="mt-1 text-xs text-blue-800">{t("recommendationUi.greenMetricThresholdFromResult")}</p>
                </div>
              </div>

              <dl className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
                <ValuePair
                  label={t("recommendationUi.greenMetricIndicatorScore")}
                  before={`${score(change.currentIndicatorScore ?? change.currentScore, locale)}${indicator ? ` / ${score(indicator.maxScore, locale)}` : ""}`}
                  after={`${score(change.proposedIndicatorScore ?? change.proposedScore, locale)}${indicator ? ` / ${score(indicator.maxScore, locale)}` : ""}`}
                />
                <ValuePair
                  label={`${change.categoryId ?? ""} ${t("recommendationUi.greenMetricCategoryScore")}`.trim()}
                  before={score(change.currentCategoryScore, locale)}
                  after={score(change.proposedCategoryScore, locale)}
                />
                <ValuePair
                  label={t("recommendationUi.greenMetricTotalScore")}
                  before={score(change.currentTotalScore ?? change.scoreBeforeChange, locale)}
                  after={score(change.proposedTotalScore ?? change.scoreAfterChange, locale)}
                />
                <div>
                  <dt className="text-xs font-medium text-slate-500">{t("recommendationUi.greenMetricTotalImpact")}</dt>
                  <dd className="mt-1 text-sm font-bold text-emerald-700">{signed(change.incrementalScoreImpact, locale)}</dd>
                </div>
              </dl>
              {plan.targetMode === "rankRange" ? (
                <div className="mt-3 rounded-lg bg-blue-50/70 p-3 text-xs leading-5 text-blue-950">
                  <p className="font-semibold">{t("recommendationUi.whyThisRecommendation")}</p>
                  <p className="mt-1">
                    {t("recommendationUi.calculatedScoreImpact")}: {signed(change.incrementalScoreImpact, locale)}. {t("recommendationUi.totalProjectedRankImpact")
                      .replace("{current}", plan.currentRankEstimate?.band ?? String(plan.currentRankEstimate?.exactRank ?? "—"))
                      .replace("{projected}", plan.recommendedRankEstimate?.band ?? String(plan.recommendedRankEstimate?.exactRank ?? "—"))}
                  </p>
                </div>
              ) : null}
              {change.evidenceRequired ? (
                <p className="mt-3 text-xs text-slate-500">{t("recommendationUi.greenMetricEvidenceNotice")}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function GreenMetricRecommendationEmptyState({
  result,
  inputs,
  recommendationParameterIds,
  t,
}: {
  result: RecommendationEngineResult;
  inputs: RecommendationParameterInput[];
  recommendationParameterIds: string[];
  t: (key: string) => string;
}) {
  const hasChangePermission = inputs.some((input) => input.selected && input.inputMode === "range");
  const diagnostics = result.candidateDiagnostics ?? [];
  const message = !hasChangePermission
    ? t("recommendationUi.greenMetricEmptyNoEditableSelection")
    : recommendationParameterIds.length > 0 && !diagnostics.length
      ? t("recommendationUi.greenMetricEmptyNoContextMatch")
      : diagnostics.length > 0 && diagnostics.every((item) => item.status === "maximum-score")
        ? t("recommendationUi.greenMetricEmptyMaximum")
        : diagnostics.some((item) => item.status === "missing-baseline-data")
          ? t("recommendationUi.greenMetricEmptyMissingBaseline")
          : t("recommendationUi.greenMetricEmptyUnreachable");
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:p-5">
      <h2 className="font-semibold">{t("recommendationUi.greenMetricNoRecommendationTitle")}</h2>
      <p className="mt-2">{message}</p>
    </section>
  );
}

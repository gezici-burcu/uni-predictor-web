import {
  getCrossAnalysisMetricPresentations,
  type CrossAnalysisIndicatorDetail,
  type CrossAnalysisImpactLanguage,
  type CrossAnalysisMethodologyId,
} from "@/src/lib/cross-analysis";

const formatValue = (
  value: CrossAnalysisIndicatorDetail["baselineRawValue"],
  locale: string,
) => {
  if (value === null) return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "number") return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 4,
  }).format(value);
  return value;
};

const formatDelta = (value: number | null, locale: string) => {
  if (value === null) return "—";
  const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(value);
  return value > 0 ? `+${formatted}` : formatted;
};

export function CrossAnalysisImpactDetails({
  methodology,
  metricCodes,
  language,
  summary,
  weightedLabel,
  indicatorOnlyLabel,
  className = "",
}: {
  methodology: CrossAnalysisMethodologyId;
  metricCodes: readonly string[];
  language: CrossAnalysisImpactLanguage;
  summary: string;
  weightedLabel: string;
  indicatorOnlyLabel: string;
  className?: string;
}) {
  const metrics = getCrossAnalysisMetricPresentations(methodology, metricCodes, language);
  if (!metrics.length) return null;
  return (
    <details className={className}>
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
        {summary} ({metrics.length})
      </summary>
      <ul className="mt-2 space-y-1.5">
        {metrics.map((metric) => (
          <li key={metric.code} className="rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-700">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <strong className="text-slate-950">{metric.code}</strong>
              <span>{metric.label}</span>
              {metric.category ? <span className="text-slate-500">· {metric.category}</span> : null}
            </div>
            <span className="mt-0.5 block text-[11px] text-slate-500">
              {metric.scoreUsage === "indicator-only" ? indicatorOnlyLabel : weightedLabel}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function CrossAnalysisIndicatorImpactDetails({
  methodology,
  details,
  language,
  locale,
  summary,
  labels,
  parameterLabels,
  className = "",
}: {
  methodology: CrossAnalysisMethodologyId;
  details: readonly CrossAnalysisIndicatorDetail[];
  language: CrossAnalysisImpactLanguage;
  locale: string;
  summary: string;
  labels: {
    current: string;
    proposed: string;
    difference: string;
    rawValue: string;
    indicatorScore: string;
    modelContribution: string;
    affectingParameters: string;
    statuses: Record<CrossAnalysisIndicatorDetail["impactType"], string>;
  };
  parameterLabels: Readonly<Record<string, string>>;
  className?: string;
}) {
  const presentations = new Map(
    getCrossAnalysisMetricPresentations(methodology, details.map((detail) => detail.metricId), language)
      .map((metric) => [metric.code, metric]),
  );
  if (!details.length) return null;

  return (
    <details className={className}>
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
        {summary} ({details.length})
      </summary>
      <div className="mt-2 space-y-2">
        {details.map((detail) => {
          const metric = presentations.get(detail.metricId);
          const baselineSecondary = detail.scoreValueKind === "indicator-score"
            ? detail.baselineScore
            : detail.baselineContribution;
          const proposedSecondary = detail.scoreValueKind === "indicator-score"
            ? detail.proposedScore
            : detail.proposedContribution;
          const secondaryDelta = detail.scoreValueKind === "indicator-score"
            ? detail.scoreDelta
            : detail.contributionDelta;
          const secondaryLabel = detail.scoreValueKind === "model-contribution"
            ? labels.modelContribution
            : labels.indicatorScore;
          return (
            <section key={detail.metricId} className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-700">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p><strong className="text-slate-950">{detail.metricId}</strong>{metric ? ` · ${metric.label}` : ""}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  {labels.statuses[detail.impactType]}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 rounded-md bg-slate-50 p-2 text-center">
                {([
                  [labels.current, detail.baselineRawValue, baselineSecondary],
                  [labels.proposed, detail.proposedRawValue, proposedSecondary],
                ] as const).map(([heading, raw, secondary]) => (
                  <div key={heading} className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">{heading}</p>
                    <p className="truncate font-bold tabular-nums text-slate-900" title={String(raw ?? "—")}>{formatValue(raw, locale)}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{labels.rawValue}</p>
                    <p className="font-semibold tabular-nums text-slate-800">{formatValue(secondary, locale)}</p>
                    <p className="text-[10px] text-slate-500">{secondaryLabel}</p>
                  </div>
                ))}
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">{labels.difference}</p>
                  <p className="font-bold tabular-nums text-slate-900">{formatDelta(secondaryDelta, locale)}</p>
                </div>
              </div>
              {detail.parameterIds.length ? (
                <p className="mt-2 text-[11px] text-slate-500">
                  <strong>{labels.affectingParameters}:</strong>{" "}
                  {detail.parameterIds.map((id) => parameterLabels[id] ?? id).join(", ")}
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
    </details>
  );
}

import type { GreenMetricIndicatorDefinition, GreenMetricValue, GreenMetricValues } from "@/src/types/greenmetric";
import { calculateDerivedValue, getGreenMetricRelationWarningsForMetrics } from "@/src/utils/greenmetric-derived";
import { GreenMetricMetricRenderer } from "./GreenMetricMetricRenderer";

type Props = {
  indicator: GreenMetricIndicatorDefinition;
  score: number | null;
  baselineValues: GreenMetricValues;
  effectiveValues: GreenMetricValues;
  detailed: boolean;
  onChange: (id: string, value: GreenMetricValue) => void;
  onReset: (id: string) => void;
};

export function GreenMetricIndicatorCard({ indicator, score, baselineValues, effectiveValues, detailed, onChange, onReset }: Props) {
  const relationWarning = getGreenMetricRelationWarningsForMetrics(
    effectiveValues,
    indicator.metrics.map((metric) => metric.id),
  )[0];

  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
      <div className="mb-2 flex flex-col gap-2 border-b border-slate-200 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-emerald-700 px-2 py-0.5 text-[11px] font-bold text-white">{indicator.code}</span>
            {indicator.basic ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Temel Mod</span> : null}
            {indicator.evidenceRequired ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Kanıt gerekli</span> : null}
          </div>
          <h3 className="mt-1.5 text-sm font-bold leading-5 text-slate-900">{indicator.title}</h3>
          {indicator.description ? <p className="mt-0.5 text-xs leading-4 text-slate-600">{indicator.description}</p> : null}
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-emerald-800">{score === null ? "Eksik veri" : score} / {indicator.maxScore}</span>
      </div>

      <div className="space-y-3">
        {indicator.metrics.map((metric) => (
          <GreenMetricMetricRenderer key={metric.id} metric={metric} domPrefix={indicator.code} baselineValue={baselineValues[metric.id] ?? null} value={effectiveValues[metric.id] ?? null} derivedValue={metric.readonly ? calculateDerivedValue(metric.id, effectiveValues) : undefined} detailed={detailed} onChange={(value) => onChange(metric.id, value)} onReset={() => onReset(metric.id)} />
        ))}
      </div>
      {relationWarning ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{relationWarning}</p> : null}
    </article>
  );
}

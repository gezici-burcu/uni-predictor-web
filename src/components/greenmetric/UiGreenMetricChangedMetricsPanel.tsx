"use client";

import { useState } from "react";
import { greenMetricContextMetrics, greenMetricIndicators } from "@/src/config/greenmetric.metrics";
import type { GreenMetricMetricDefinition, GreenMetricValue, GreenMetricValues } from "@/src/types/greenmetric";

const definitions = new Map<string, GreenMetricMetricDefinition>();
for (const metric of [...greenMetricContextMetrics, ...greenMetricIndicators.flatMap((indicator) => indicator.metrics)]) {
  if (!metric.readonly && !definitions.has(metric.id)) definitions.set(metric.id, metric);
}

const formatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
const equal = (left: GreenMetricValue, right: GreenMetricValue) => JSON.stringify(left) === JSON.stringify(right);

function optionLabel(metric: GreenMetricMetricDefinition, value: string) {
  return metric.options?.find((option) => option.value === value)?.label ?? value;
}

function formatValue(value: GreenMetricValue, metric: GreenMetricMetricDefinition) {
  if (value === null) return "Veri girilmedi";
  if (Array.isArray(value)) return value.length ? value.map((item) => optionLabel(metric, item)).join(", ") : "Seçilmedi";
  if (typeof value === "string") return optionLabel(metric, value) || "Seçilmedi";
  return `${formatter.format(value)}${metric.unit ? ` ${metric.unit}` : ""}`;
}

export function getChangedGreenMetricRows(
  baseline: GreenMetricValues,
  changes: GreenMetricValues,
) {
  return Object.entries(changes).flatMap(([id, scenarioValue]) => {
    const metric = definitions.get(id);
    const baselineValue = baseline[id] ?? null;
    return metric && !equal(baselineValue, scenarioValue)
      ? [{ id, metric, baselineValue, scenarioValue }]
      : [];
  });
}

export function UiGreenMetricChangedMetricsPanel({
  baselineValues,
  scenarioChanges,
}: {
  baselineValues: GreenMetricValues;
  scenarioChanges: GreenMetricValues;
}) {
  const [showAll, setShowAll] = useState(false);
  const rows = getChangedGreenMetricRows(baselineValues, scenarioChanges);
  const visible = showAll ? rows : rows.slice(0, 6);

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">Değiştirilen Metrikler</h2>
      {rows.length === 0 ? (
        <p className="mt-3 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
          Henüz değiştirilmiş bir UI GreenMetric metriği bulunmuyor.
        </p>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="w-[46%] px-2 py-2 sm:px-3">Metrik</th>
                  <th scope="col" className="w-[27%] px-2 py-2 sm:px-3">Mevcut</th>
                  <th scope="col" className="w-[27%] px-2 py-2 sm:px-3">Senaryo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map(({ id, metric, baselineValue, scenarioValue }) => (
                  <tr key={id}>
                    <th scope="row" className="break-words px-2 py-2 font-medium text-slate-900 sm:px-3">{metric.label}</th>
                    <td className="break-words px-2 py-2 text-slate-700 sm:px-3">{formatValue(baselineValue, metric)}</td>
                    <td className="break-words px-2 py-2 font-medium text-emerald-700 sm:px-3">{formatValue(scenarioValue, metric)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 6 ? (
            <button
              type="button"
              aria-expanded={showAll}
              onClick={() => setShowAll((value) => !value)}
              className="mt-3 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              {showAll ? "Daha az göster" : "Tüm değişiklikleri göster"}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}

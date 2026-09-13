"use client";

import { SelectMetricInput } from "@/src/components/inputs/SelectMetricInput";
import type { GreenMetricMetricDefinition, GreenMetricValue } from "@/src/types/greenmetric";
import { GreenMetricDerivedValue } from "./GreenMetricDerivedValue";
import { GreenMetricMultiSelectInput } from "./GreenMetricMultiSelectInput";
import { GreenMetricNumericInput } from "./GreenMetricNumericInput";

type Props = {
  metric: GreenMetricMetricDefinition;
  domPrefix: string;
  baselineValue: GreenMetricValue;
  value: GreenMetricValue;
  derivedValue?: number | null;
  detailed: boolean;
  onChange: (value: GreenMetricValue) => void;
  onReset: () => void;
};

export function GreenMetricMetricRenderer({ metric, domPrefix, baselineValue, value, derivedValue, detailed, onChange, onReset }: Props) {
  if (metric.infoOnly && !detailed) return null;
  const safeId = `${domPrefix}-${metric.id}`.replace(/[^a-zA-Z0-9-_]/g, "-");

  if (metric.inputType === "readonly") return <GreenMetricDerivedValue label={metric.label} value={derivedValue ?? null} unit={metric.unit} formula={metric.formulaLabel} />;
  if (metric.inputType === "multi-select") return <GreenMetricMultiSelectInput id={safeId} label={metric.label} options={metric.options ?? []} value={Array.isArray(value) ? value : []} onChange={onChange} onReset={onReset} />;
  if (metric.inputType === "select") {
    return <SelectMetricInput id={safeId} label={metric.label} description={metric.description} value={typeof value === "string" ? value : ""} baselineValue={typeof baselineValue === "string" ? baselineValue : ""} options={[{ value: "", label: "Seçiniz" }, ...(metric.options ?? [])]} warning={metric.warning} compact hideComparisonSummaryOnDesktop onChange={onChange} onReset={onReset} />;
  }
  const baselineNumber = typeof baselineValue === "number" ? baselineValue : null;
  const currentNumber = typeof value === "number" ? value : null;
  return (
    <div>
      {metric.shared ? <span className="mb-2 inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">Ortak veri — diğer göstergelerle senkronize</span> : null}
      {metric.infoOnly ? <span className="mb-2 ml-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Bilgi amaçlı</span> : null}
      <GreenMetricNumericInput
        id={safeId}
        label={metric.label}
        description={metric.description}
        baselineValue={baselineNumber}
        value={currentNumber}
        min={metric.min ?? 0}
        configuredMax={metric.inputType === "percentage" ? 100 : metric.max}
        configuredStep={metric.step}
        sliderStep={metric.sliderStep}
        fallbackMax={metric.inputType === "percentage" ? 100 : (metric.fallbackMax ?? 1000)}
        integerOnly={metric.inputType === "percentage" ? false : metric.integerOnly}
        unit={metric.unit}
        warning={metric.warning}
        onChange={onChange}
        onReset={onReset}
      />
    </div>
  );
}

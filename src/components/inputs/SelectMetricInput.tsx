"use client";

import { useId } from "react";
import type { MetricSelectOption } from "@/src/types/metric";

type SelectMetricInputProps = {
  id?: string;
  label: string;
  description?: string;
  value: string;
  baselineValue: string;
  options: MetricSelectOption[];
  warning?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onReset?: () => void;
  compact?: boolean;
  hideComparisonSummaryOnDesktop?: boolean;
};

export function SelectMetricInput({
  id,
  label,
  description,
  value,
  baselineValue,
  options,
  warning,
  disabled = false,
  onChange,
  onReset,
  compact = false,
  hideComparisonSummaryOnDesktop = false,
}: SelectMetricInputProps) {
  const generatedId = useId();
  const inputId = id ?? `select-metric-${generatedId.replaceAll(":", "")}`;
  const descriptionId = `${inputId}-description`;
  const warningId = `${inputId}-warning`;
  const hasChanged = value !== baselineValue;
  const optionLabel = (optionValue: string) =>
    options.find((option) => option.value === optionValue)?.label ?? optionValue;

  return (
    <article className={`rounded-xl border border-slate-200 bg-white shadow-sm ${compact ? "p-4" : "p-5"} ${disabled ? "opacity-60" : ""}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="lg:max-w-sm lg:flex-1">
          <label htmlFor={inputId} className="block text-base font-bold text-slate-900">{label}</label>
          {description ? <p id={descriptionId} className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        <select
          id={inputId}
          value={value}
          disabled={disabled}
          aria-describedby={[description ? descriptionId : null, warning ? warningId : null].filter(Boolean).join(" ") || undefined}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 lg:max-w-sm"
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      <div className={`mt-5 flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-end sm:justify-between ${hideComparisonSummaryOnDesktop ? "xl:hidden" : ""}`}>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-10">
          <div><p className="text-xs font-medium text-slate-500">Mevcut üniversite değeri</p><p className="mt-1 text-sm font-bold text-slate-800">{optionLabel(baselineValue)}</p></div>
          <div><p className="text-xs font-medium text-slate-500">Senaryo değeri</p><p className="mt-1 text-sm font-bold text-blue-700">{optionLabel(value)}</p></div>
        </div>
        <button type="button" disabled={disabled || !hasChanged || !onReset} onClick={onReset} className="self-start rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent sm:self-auto">
          Sıfırla
        </button>
      </div>

      {warning ? <p id={warningId} role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{warning}</p> : null}
    </article>
  );
}

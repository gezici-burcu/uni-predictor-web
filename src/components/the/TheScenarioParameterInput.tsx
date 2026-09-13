"use client";

import { useState, type CSSProperties } from "react";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";

export function getTheCountSliderStep(baselineValue: number | null) {
  if (baselineValue === null || baselineValue < 1_000) return 1;
  if (baselineValue < 10_000) return 10;
  return 100;
}

export function getTheIncomeSliderStep(baselineValue: number | null) {
  if (baselineValue === null || baselineValue <= 0) return 1;
  const target = baselineValue * .01;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  return Math.max(1, Math.round(target / magnitude) * magnitude);
}

export function getTheBaselineSliderMax({
  baselineValue,
  configuredMax,
  fallbackMax,
}: {
  baselineValue: number | null;
  configuredMax?: number;
  fallbackMax: number;
}) {
  if (baselineValue !== null && Number.isFinite(baselineValue) && baselineValue > 0) {
    return baselineValue * 2;
  }
  return configuredMax ?? fallbackMax;
}

export function TheScenarioParameterInput({
  id,
  label,
  value,
  currentValue,
  minimum,
  maximum,
  step,
  unit,
  statusLabel,
  required = false,
  sliderDisabled = false,
  dependencyHint,
  error,
  onChange,
  clampToMinimum = true,
  scoreImpactUnavailable = false,
}: {
  id: string;
  label: string;
  value: number | null;
  currentValue?: number | null;
  minimum: number;
  maximum: number;
  step: number;
  unit?: string;
  statusLabel?: string;
  required?: boolean;
  sliderDisabled?: boolean;
  dependencyHint?: string;
  error?: string;
  onChange: (value: number | null) => void;
  clampToMinimum?: boolean;
  scoreImpactUnavailable?: boolean;
}) {
  const { locale, t } = useAppLanguage();
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const [editingText, setEditingText] = useState<string | null>(null);
  const numberId = `${id}-number`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const rangeValue = Math.min(
    maximum,
    Math.max(minimum, value ?? minimum),
  );
  const rangeProgress = maximum === minimum ? 0 : ((rangeValue - minimum) / (maximum - minimum)) * 100;
  const hasChanged = currentValue !== undefined && value !== null && currentValue !== null && value !== currentValue;
  const handleRangeInput = (nextValue: string) => {
    const parsed = Number(nextValue);
    if (Number.isFinite(parsed)) onChange(parsed);
  };

  const handleNumberChange = (text: string) => {
    setEditingText(text);
    if (text === "") {
      onChange(null);
      return;
    }
    if (text === "-" || text === ".") return;
    const parsed = Number(text);
    if (Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum) onChange(parsed);
  };

  const handleNumberBlur = (text: string) => {
    if (text.trim() === "" || !Number.isFinite(Number(text))) {
      setEditingText(null);
      return;
    }
    const parsed = Number(text);
    onChange(Math.min(maximum, clampToMinimum ? Math.max(minimum, parsed) : parsed));
    setEditingText(null);
  };

  return (
    <article className={`parameter-card group relative overflow-hidden rounded-2xl border p-4 ${
      error ? "border-red-400 bg-red-50/30" : scoreImpactUnavailable ? "border-amber-200 bg-amber-50/40" : hasChanged ? "border-blue-200 bg-gradient-to-br from-white to-blue-50/60" : required ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50/70"
    }`}>
      <span aria-hidden="true" className={`absolute inset-y-4 left-0 w-1 rounded-r-full ${error ? "bg-red-500" : hasChanged ? "bg-gradient-to-b from-indigo-500 to-cyan-400" : "bg-slate-200"}`}/>
      <div className="flex items-start justify-between gap-3 pl-1"><div className="min-w-0"><label
        htmlFor={numberId}
        className={`block break-words text-sm leading-5 ${
          required ? "font-bold text-slate-950" : "font-medium text-slate-700"
        }`}
      >
        {label}
      </label>
      {statusLabel ? (
        <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          scoreImpactUnavailable
            ? "bg-amber-100 text-amber-900"
            : required
            ? "bg-blue-50 font-semibold text-blue-700"
            : "bg-slate-100 text-slate-500"
        }`}>
          {statusLabel}
        </span>
      ) : null}
      {currentValue !== undefined ? (
        <p className="mt-1.5 text-[11px] text-slate-500">
          {t("qsUi.currentValue")}: {currentValue === null ? "—" : formatter.format(currentValue)}
        </p>
      ) : null}
      </div>{hasChanged ? <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${scoreImpactUnavailable ? "bg-amber-100 text-amber-900" : "bg-blue-100 text-blue-700"}`}>Değişti</span> : null}</div>
      <div className="mt-4 grid min-w-0 grid-cols-1 items-center gap-3 pl-1 sm:grid-cols-[minmax(0,1fr)_220px] sm:gap-4">
        <div className="min-w-0">
          <input
            id={`${id}-range`}
            type="range"
            min={minimum}
            max={maximum}
            step={step}
            value={rangeValue}
            disabled={sliderDisabled}
            aria-label={`${label} kaydırıcısı`}
            aria-describedby={dependencyHint ? hintId : error ? errorId : undefined}
            onInput={(event) => handleRangeInput(event.currentTarget.value)}
            style={{ "--range-progress": `${rangeProgress}%` } as CSSProperties}
            className="modern-range relative z-10 h-5 w-full cursor-pointer touch-none pointer-events-auto disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400" aria-hidden="true">
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5">{formatter.format(minimum)}</span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5">{formatter.format(maximum)}</span>
          </div>
        </div>
        <div className={`flex h-11 w-full min-w-0 items-center overflow-hidden rounded-xl border bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)] transition sm:min-w-[220px] focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100/70 ${
          error ? "border-red-400" : "border-slate-300"
        }`}>
          <input
            id={numberId}
            type="number"
            min={minimum}
            max={maximum}
            step={step}
            value={editingText ?? (value === null ? "" : String(value))}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : dependencyHint ? hintId : undefined}
            onChange={(event) => handleNumberChange(event.target.value)}
            onBlur={(event) => handleNumberBlur(event.target.value)}
            onFocus={() => setEditingText(value === null ? "" : String(value))}
            className="h-full w-full min-w-[120px] flex-1 bg-transparent px-3 text-right text-sm font-bold text-slate-950 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          {unit ? (
            <span title={unit} className="pointer-events-none flex max-w-[88px] shrink-0 self-stretch items-center truncate whitespace-nowrap border-l border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 px-2 text-[10px] font-semibold text-slate-500">
              {unit}
            </span>
          ) : null}
        </div>
      </div>
      {dependencyHint ? (
        <p id={hintId} className="mt-2 text-xs text-slate-500">{dependencyHint}</p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-2 text-sm font-medium text-red-700">{error}</p>
      ) : null}
    </article>
  );
}

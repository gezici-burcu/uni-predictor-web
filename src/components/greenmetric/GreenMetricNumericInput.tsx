"use client";

import { useEffect, useState } from "react";
import { resolveInitialSliderMax, resolveSliderStep } from "@/src/utils/greenmetric-derived";

type Props = {
  id: string;
  label: string;
  description?: string;
  baselineValue: number | null;
  value: number | null;
  min: number;
  configuredMax?: number;
  configuredStep?: number;
  sliderStep?: number;
  fallbackMax: number;
  integerOnly?: boolean;
  unit?: string;
  warning?: string;
  onChange: (value: number) => void;
  onReset: () => void;
};

const formatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

export function GreenMetricNumericInput(props: Props) {
  const initialMax = resolveInitialSliderMax(props.baselineValue, props.configuredMax, props.fallbackMax);
  const [resolvedMax, setResolvedMax] = useState(() => Math.max(initialMax, (props.value ?? 0) * 1.25));
  const [editingText, setEditingText] = useState<string | null>(null);
  const step = props.sliderStep ?? resolveSliderStep({ min: props.min, max: resolvedMax, configuredStep: props.configuredStep, integerOnly: props.integerOnly });
  const hasValue = props.value !== null;
  const rangeValue = props.value ?? props.min;
  const rangeId = `${props.id}-range`;
  const numberId = `${props.id}-number`;

  useEffect(() => {
    if (props.value !== null && props.value > resolvedMax) {
      // Yalnızca genişletilir; değer azalınca maksimum küçültülmez.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResolvedMax(Math.ceil(props.value * 1.25));
    }
  }, [props.value, resolvedMax]);

  const commitNumber = (rawValue: number) => {
    if (!Number.isFinite(rawValue)) return;
    const lowerBounded = Math.max(props.min, rawValue);
    const nextValue = props.configuredMax === undefined ? lowerBounded : Math.min(lowerBounded, props.configuredMax);
    if (props.configuredMax === undefined && nextValue > resolvedMax) setResolvedMax(Math.ceil(nextValue * 1.25));
    props.onChange(nextValue);
  };

  const difference = props.value === null || props.baselineValue === null ? null : props.value - props.baselineValue;
  const percentage =
    difference === null || props.baselineValue === null || props.baselineValue === 0
      ? null
      : (difference / props.baselineValue) * 100;
  const format = (value: number | null) => value === null ? "Veri girilmedi" : `${formatter.format(value)}${props.unit ? ` ${props.unit}` : ""}`;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0"><label htmlFor={rangeId} className="block text-base font-semibold text-slate-900">{props.label}</label>
          {props.description ? <p className="mt-1 text-sm leading-5 text-slate-500">{props.description}</p> : null}</div>
          <button type="button" disabled={props.value === null || props.value === props.baselineValue} onClick={() => { setEditingText(null); props.onReset(); }} className="shrink-0 text-xs font-semibold text-emerald-700 disabled:text-slate-400">Sıfırla</button>
          {props.value === null ? <p className="mt-2 text-sm font-semibold text-amber-700">Veri girilmedi</p> : null}
        </div>
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(145px,180px)]">
          <div>
            <input id={rangeId} type="range" min={props.min} max={resolvedMax} step={step} value={rangeValue} disabled={!hasValue} onChange={(event) => props.onChange(Number(event.currentTarget.value))} className="relative z-10 h-5 w-full cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-40" />
            <div className="mt-1 flex justify-between text-xs text-slate-400" aria-hidden="true"><span>{formatter.format(props.min)}</span><span>{formatter.format(resolvedMax)}</span></div>
          </div>
          <div>
            <label htmlFor={numberId} className="sr-only">{props.label} sayısal değeri</label>
            <div className="flex min-w-0 items-center overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
              <input id={numberId} type="number" min={props.min} step={step} value={editingText ?? (props.value === null ? "" : String(props.value))} placeholder="Veri girilmedi" onFocus={() => setEditingText(props.value === null ? "" : String(props.value))} onChange={(event) => { const text = event.currentTarget.value; setEditingText(text); if (text !== "" && text !== "-") commitNumber(Number(text)); }} onBlur={() => { if (editingText === null || editingText === "" || !Number.isFinite(Number(editingText))) setEditingText(null); else { commitNumber(Number(editingText)); setEditingText(null); } }} className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-right font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400" />
              {props.unit ? <span className="pointer-events-none flex shrink-0 self-stretch items-center whitespace-nowrap border-l border-slate-200 px-3 text-xs text-slate-500">{props.unit}</span> : null}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4 xl:hidden">
        <div><p className="text-xs text-slate-500">Mevcut üniversite değeri</p><p className="mt-1 text-sm font-bold">{format(props.baselineValue)}</p></div>
        <div><p className="text-xs text-slate-500">Senaryo değeri</p><p className="mt-1 text-sm font-bold text-emerald-700">{format(props.value)}</p></div>
        <div><p className="text-xs text-slate-500">Değişim</p><p className="mt-1 text-sm font-bold">{difference === null ? "Hesaplanamaz" : difference === 0 ? "Değişiklik yok" : `${difference > 0 ? "+" : ""}${format(difference)}`}</p></div>
        <div><p className="text-xs text-slate-500">Yüzde değişim</p><p className="mt-1 text-sm font-bold">{difference === 0 ? "Değişiklik yok" : percentage === null ? "Hesaplanamaz" : `${percentage > 0 ? "+" : ""}${formatter.format(percentage)}%`}</p></div>
      </div>
      {props.warning ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{props.warning}</p> : null}
    </article>
  );
}

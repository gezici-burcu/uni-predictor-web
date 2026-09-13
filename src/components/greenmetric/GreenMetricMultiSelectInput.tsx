"use client";

import type { GreenMetricOption } from "@/src/types/greenmetric";

type Props = { id: string; label: string; options: GreenMetricOption[]; value: string[]; onChange: (value: string[]) => void; onReset: () => void };

export function GreenMetricMultiSelectInput({ id, label, options, value, onChange, onReset }: Props) {
  return (
    <fieldset className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <legend className="text-base font-bold text-slate-900">{label}</legend>
        <button type="button" disabled={value.length === 0} onClick={onReset} className="text-sm font-semibold text-emerald-700 disabled:text-slate-400">Sıfırla</button>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
            <input id={`${id}-${option.value}`} type="checkbox" checked={value.includes(option.value)} onChange={(event) => onChange(event.currentTarget.checked ? [...value, option.value] : value.filter((item) => item !== option.value))} className="h-4 w-4 accent-emerald-600" />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

type GreenMetricDerivedValueProps = {
  label: string;
  value: number | null;
  unit?: string;
  formula?: string;
};

const formatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

export function GreenMetricDerivedValue({ label, value, unit, formula }: GreenMetricDerivedValueProps) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Hesaplanan Değer</p>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-lg font-bold text-emerald-800">
          {value === null ? "Veri girilmedi" : `${formatter.format(value)}${unit ? ` ${unit}` : ""}`}
        </p>
      </div>
      {formula ? <p className="mt-3 border-t border-emerald-200 pt-2 text-xs text-emerald-900"><span className="font-bold">Formül:</span> {formula}</p> : null}
    </div>
  );
}

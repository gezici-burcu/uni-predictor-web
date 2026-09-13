import type { QsChangedInputRow } from "./qsResultViewModels";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";

export function QsChangedMetricsPanel({ rows }: { rows: readonly QsChangedInputRow[] }) {
  const { t, locale, language } = useAppLanguage();
  const localFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const localizedValue = (value: number | null) => value === null ? (language === "tr" ? "Veri yok" : "No data") : localFormatter.format(value);
  const localizedDifference = (value: number | null) => value === null ? "—" : `${value > 0 ? "+" : ""}${localFormatter.format(value)}`;
  return (
    <section
      className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      data-testid="qs-changed-metrics"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">{t("qsResultsUi.changedMetrics")}</h2>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          {t("qsResultsUi.changeCount").replace("{count}", String(rows.length))}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
          {t("qsResultsUi.noChanges")}
        </p>
      ) : (
        <div className="mt-3 max-h-80 overflow-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="sticky top-0 border-y border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                {["parameter", "category", "current", "scenario", "difference", "impactStatus"].map((key) => (
                  <th key={key} scope="col" className="px-3 py-2">{key === "impactStatus" ? (language === "tr" ? "Etki Durumu" : "Impact Status") : t(`qsResultsUi.${key}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className="px-3 py-2 font-medium text-slate-900">{row.parameter}</th>
                  <td className="px-3 py-2 text-slate-600">{row.field}</td>
                  <td className="px-3 py-2 tabular-nums text-slate-700">{localizedValue(row.current)}</td>
                  <td className="px-3 py-2 tabular-nums font-medium text-blue-700">{localizedValue(row.scenario)}</td>
                  <td className="px-3 py-2 tabular-nums font-semibold text-slate-800">
                    {localizedDifference(row.difference)}
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-amber-800">{row.impactStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">
        {t("qsResultsUi.changesYearNotice")}
      </p>
    </section>
  );
}

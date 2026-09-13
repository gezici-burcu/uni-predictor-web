"use client";

import type { GreenMetricViewMode } from "@/src/types/greenmetric";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { getTranslation } from "@/src/i18n/getTranslation";

type Props = { mode: GreenMetricViewMode; query: string; showOnlyChanged: boolean; onModeChange: (mode: GreenMetricViewMode) => void; onQueryChange: (query: string) => void; onShowOnlyChangedChange: (value: boolean) => void; onCloseAll: () => void };

export function GreenMetricToolbar(props: Props) {
  const { language } = useAppLanguage();
  const t = (key: string) => getTranslation(language, `greenMetricUi.${key}`);
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" className="grid min-w-[15rem] grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1" aria-label={t("detailLevel")}>
          {(["basic", "detailed"] as const).map((option) => <button key={option} type="button" aria-pressed={props.mode === option} onClick={() => props.onModeChange(option)} className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition ${props.mode === option ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{t(option === "basic" ? "basicMode" : "detailedMode")}</button>)}
        </div>
        <button type="button" onClick={props.onCloseAll} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">{t("closeAll")}</button>
      </div>
      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <label className="min-w-0"><span className="sr-only">{t("search")}</span><input type="search" value={props.query} onChange={(event) => props.onQueryChange(event.currentTarget.value)} placeholder={t("searchPlaceholder")} className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
        <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-xs font-medium text-slate-700"><input type="checkbox" checked={props.showOnlyChanged} onChange={(event) => props.onShowOnlyChangedChange(event.currentTarget.checked)} className="h-4 w-4 shrink-0 accent-emerald-600" />{t("changedOnly")}</label>
      </div>
      <p className="text-[11px] leading-4 text-slate-500">{t(props.mode === "basic" ? "basicHelp" : "detailedHelp")}</p>
    </div>
  );
}

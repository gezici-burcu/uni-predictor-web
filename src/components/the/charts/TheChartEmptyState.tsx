"use client";

import { useAppLanguage } from "@/src/contexts/AppLanguageContext";

export function TheChartEmptyState() {
  const { t } = useAppLanguage();
  return (
    <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 sm:h-[300px]">
      <div className="max-w-sm text-center">
        <p className="font-medium text-slate-700">{t("theUi.chartNotReady")}</p>
        <p className="mt-1 text-sm text-slate-500">{t("theUi.chartNotReadyDescription")}</p>
      </div>
    </div>
  );
}

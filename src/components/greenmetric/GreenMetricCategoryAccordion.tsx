"use client";

import type { GreenMetricCategoryDefinition, GreenMetricIndicatorDefinition, GreenMetricValue, GreenMetricValues } from "@/src/types/greenmetric";
import { GreenMetricIndicatorCard } from "./GreenMetricIndicatorCard";
import { ScrollableAccordionSection } from "@/src/components/common/ScrollableAccordionSection";
import type { UiGreenMetricCalculationResult } from "@/src/lib/calculations/ui-greenmetric";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";

type Props = {
  category: GreenMetricCategoryDefinition;
  categoryScore: number | null;
  indicatorResults: UiGreenMetricCalculationResult["indicatorResults"];
  indicators: GreenMetricIndicatorDefinition[];
  completedCount: number;
  isOpen: boolean;
  baselineValues: GreenMetricValues;
  effectiveValues: GreenMetricValues;
  detailed: boolean;
  onToggle: () => void;
  onChange: (id: string, value: GreenMetricValue) => void;
  onReset: (id: string) => void;
};

export function GreenMetricCategoryAccordion({ category, categoryScore, indicatorResults, indicators, completedCount, isOpen, baselineValues, effectiveValues, detailed, onToggle, onChange, onReset }: Props) {
  const { locale } = useAppLanguage();
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  return (
    <ScrollableAccordionSection compact id={`greenmetric-${category.code.toLowerCase()}`} isOpen={isOpen} onToggle={onToggle} accent="emerald" header={
        <span className="block min-w-0">
          <span className="flex min-w-0 items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{category.code}</span>
              <span className="truncate text-sm font-semibold text-slate-900" title={category.title}>{category.title}</span>
            </span>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-700">{categoryScore === null ? "—" : formatter.format(categoryScore)} / {formatter.format(category.maxScore)}</span>
          </span>
          <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{completedCount} / {category.indicatorCount} tamamlandı · %{category.weight} ağırlık</span>
        </span>} contentClassName="p-3">
        {indicators.map((indicator) => <GreenMetricIndicatorCard key={indicator.id} indicator={indicator} score={indicatorResults[indicator.code as keyof typeof indicatorResults]?.score ?? null} baselineValues={baselineValues} effectiveValues={effectiveValues} detailed={detailed} onChange={onChange} onReset={onReset} />)}
        {indicators.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-600">Bu kategoride mevcut filtrelerle eşleşen gösterge bulunmuyor.</p> : null}
    </ScrollableAccordionSection>
  );
}

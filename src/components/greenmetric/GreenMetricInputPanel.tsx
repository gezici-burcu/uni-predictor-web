"use client";

import { useMemo, useState } from "react";
import { applyGreenMetricScenarioValues, createGreenMetricInstitutionalValues } from "@/src/data/greenmetric.baseline";
import { TOTAL_CATEGORY_COUNT, TOTAL_INDICATOR_COUNT, greenMetricCategories } from "@/src/config/greenmetric.categories";
import { greenMetricContextMetrics, greenMetricIndicators } from "@/src/config/greenmetric.metrics";
import type { GreenMetricValue, GreenMetricValues, GreenMetricViewMode } from "@/src/types/greenmetric";
import { calculateDerivedValue, isIndicatorComplete } from "@/src/utils/greenmetric-derived";
import { ResetAllChangesButton } from "@/src/components/common/ResetAllChangesButton";
import { GreenMetricCategoryAccordion } from "./GreenMetricCategoryAccordion";
import { GreenMetricMetricRenderer } from "./GreenMetricMetricRenderer";
import { GreenMetricToolbar } from "./GreenMetricToolbar";
import { ScrollableAccordionList } from "@/src/components/common/ScrollableAccordionList";
import { ScrollableAccordionSection } from "@/src/components/common/ScrollableAccordionSection";
import { toggleGreenMetricCategoryId } from "./greenMetricAccordionState";
import { UiGreenMetricDashboard } from "./UiGreenMetricDashboard";
import { createVisibleGreenMetricContextMetrics, createVisibleGreenMetricIndicators } from "./greenMetricVisibility";
import { UI_GREENMETRIC_ACTIVE_DATA_MODE } from "@/src/config/ui-greenmetric.data-mode";
import { calculateUiGreenMetricResult } from "@/src/lib/calculations/ui-greenmetric";
import { useMethodologyScenario } from "@/src/contexts/MethodologyScenarioContext";
import { useInstitutionData } from "@/src/contexts/InstitutionDataContext";
import { SaveScenarioButton } from "@/src/components/scenarios/SaveScenarioButton";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { getTranslation } from "@/src/i18n/getTranslation";
import {
  SimulatorLayout,
  SIMULATOR_ASIDE_CLASS_NAME,
  SIMULATOR_PAGE_CLASS_NAME,
} from "@/src/components/common/SimulatorLayout";

const isEqual = (left: GreenMetricValue, right: GreenMetricValue) => JSON.stringify(left) === JSON.stringify(right);

export function GreenMetricInputPanel() {
  const { language } = useAppLanguage();
  const t = (key: string) => getTranslation(language, `greenMetricUi.${key}`);
  const { getChanges, setChanges } = useMethodologyScenario();
  const { activeGreenMetricYear, getGreenMetricYearData } = useInstitutionData();
  const baselineValues = useMemo<GreenMetricValues>(() => createGreenMetricInstitutionalValues(
    activeGreenMetricYear === null ? {} : getGreenMetricYearData(activeGreenMetricYear),
  ), [activeGreenMetricYear, getGreenMetricYearData]);
  const scenarioChanges = getChanges("ui-greenmetric") as GreenMetricValues;
  const setScenarioChanges = (update: GreenMetricValues | ((current: GreenMetricValues) => GreenMetricValues)) => {
    setChanges("ui-greenmetric", typeof update === "function"
      ? (current) => update(current as GreenMetricValues)
      : update);
  };
  const [mode, setMode] = useState<GreenMetricViewMode>("basic");
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyChanged, setShowOnlyChanged] = useState(false);
  const [openCategoryId, setOpenCategoryId] = useState<string | null>("context");

  const effectiveValues = applyGreenMetricScenarioValues(baselineValues, scenarioChanges);
  const baselineResult = useMemo(() => calculateUiGreenMetricResult({ values: baselineValues, mode: UI_GREENMETRIC_ACTIVE_DATA_MODE }), [baselineValues]);
  const scenarioResult = calculateUiGreenMetricResult({ values: effectiveValues, mode: UI_GREENMETRIC_ACTIVE_DATA_MODE });
  const changedIds = new Set(Object.keys(scenarioChanges));

  const updateMetric = (id: string, value: GreenMetricValue) => {
    if (isEqual(value, baselineValues[id] ?? null)) {
      setScenarioChanges((previous) => { const next = { ...previous }; delete next[id]; return next; });
      return;
    }
    setScenarioChanges((previous) => ({ ...previous, [id]: value }));
  };
  const resetMetric = (id: string) => setScenarioChanges((previous) => { const next = { ...previous }; delete next[id]; return next; });
  const handleResetAllUiGreenMetricChanges = () => setScenarioChanges({});
  const toggleCategory = (id: string) => setOpenCategoryId((current) => toggleGreenMetricCategoryId(current, id));

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase(language === "tr" ? "tr-TR" : "en-US");
  const visibleIndicators = createVisibleGreenMetricIndicators({ indicators: greenMetricIndicators, mode, normalizedQuery, showOnlyChanged, changedIds });
  const visibleContextMetrics = createVisibleGreenMetricContextMetrics(greenMetricContextMetrics, mode);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    const normalized = query.trim().toLocaleLowerCase(language === "tr" ? "tr-TR" : "en-US");
    if (!normalized) return;
    const matchingCodes = new Set(createVisibleGreenMetricIndicators({ indicators: greenMetricIndicators, mode, normalizedQuery: normalized, showOnlyChanged, changedIds }).map((indicator) => indicator.categoryCode));
    const firstMatchingCategory = greenMetricCategories.find((category) => matchingCodes.has(category.code));
    if (firstMatchingCategory) setOpenCategoryId(firstMatchingCategory.id);
  };

  return (
    <>
      <SimulatorLayout parameterPanel={
      <aside className={`${SIMULATOR_ASIDE_CLASS_NAME} min-h-0 xl:h-full xl:overflow-hidden`}>
      <div className="flex min-h-0 flex-col gap-3 xl:h-full">
      <section className="shrink-0 rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/60 p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-1.5 h-1 w-9 rounded-full bg-emerald-600" aria-hidden="true" />
            <h1 className="text-xl font-bold tracking-tight text-slate-950">{t("inputTitle")}</h1>
            <p className="mt-1 max-w-xl text-sm leading-5 text-slate-600">{t("inputDescription")}</p>
          </div>
          <ResetAllChangesButton
            methodologyName="UI GreenMetric"
            changedCount={changedIds.size}
            onReset={handleResetAllUiGreenMetricChanges}
          />
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2">
          {[
            [t("category"), TOTAL_CATEGORY_COUNT], [t("indicator"), TOTAL_INDICATOR_COUNT], [t("changed"), changedIds.size],
          ].map(([label, value], index) => {const changed=index===2;return <div key={label} className={changed?"rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1.5":"rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5"}><dt className={changed?"text-[10px] text-emerald-700":"text-[10px] text-slate-500"}>{label}</dt><dd className={`text-base font-bold leading-5 ${changed?"text-emerald-700":"text-slate-950"}`}>{value}</dd></div>;})}
        </dl>
      </section>
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="shrink-0 p-3">
        <GreenMetricToolbar mode={mode} query={searchQuery} showOnlyChanged={showOnlyChanged} onModeChange={setMode} onQueryChange={handleSearchChange} onShowOnlyChangedChange={setShowOnlyChanged} onCloseAll={() => setOpenCategoryId(null)} />
      </div>
      <ScrollableAccordionList className="rounded-none border-x-0 border-b-0 shadow-none">
        <ScrollableAccordionSection compact id="greenmetric-context" isOpen={openCategoryId === "context"} onToggle={() => toggleCategory("context")} accent="emerald" header={<span><span className="text-sm font-bold text-slate-900">{t("sharedCampus")}</span><span className="mt-0.5 block text-xs leading-4 text-slate-500">{t("sharedCampusDescription")}</span></span>} contentClassName="p-3">
            {visibleContextMetrics
              .map((metric) => <GreenMetricMetricRenderer key={metric.id} metric={metric} domPrefix="context" baselineValue={baselineValues[metric.id] ?? null} value={effectiveValues[metric.id] ?? null} derivedValue={metric.readonly ? calculateDerivedValue(metric.id, effectiveValues) : undefined} detailed={mode === "detailed"} onChange={(value) => updateMetric(metric.id, value)} onReset={() => resetMetric(metric.id)} />)}
        </ScrollableAccordionSection>

        {showOnlyChanged && changedIds.size === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-6 text-center text-sm text-slate-600">{t("noChanges")}</p> : null}

        {greenMetricCategories.map((category) => {
          const categoryIndicators = visibleIndicators.filter((indicator) => indicator.categoryCode === category.code);
          const completed = greenMetricIndicators.filter((indicator) => indicator.categoryCode === category.code && isIndicatorComplete(indicator, effectiveValues)).length;
          return <GreenMetricCategoryAccordion key={category.id} category={category} categoryScore={scenarioResult.displayedCategoryScores[category.code]} indicatorResults={scenarioResult.indicatorResults} indicators={categoryIndicators} completedCount={completed} isOpen={openCategoryId === category.id} baselineValues={baselineValues} effectiveValues={effectiveValues} detailed={mode === "detailed"} onToggle={() => toggleCategory(category.id)} onChange={updateMetric} onReset={resetMetric} />;
        })}
      </ScrollableAccordionList>
      </section>
      </div>
      </aside>
      } dashboard={<UiGreenMetricDashboard baselineValues={baselineValues} scenarioChanges={scenarioChanges} current={baselineResult} scenario={scenarioResult} />} />
      <div className={`${SIMULATOR_PAGE_CLASS_NAME} mt-4`}><SaveScenarioButton createSnapshot={(name) => ({
        id: crypto.randomUUID(), name, methodology: "GREENMETRIC", source: "manual-scenario",
        institutionalDataYear: activeGreenMetricYear === null ? null : String(activeGreenMetricYear), scoreReferenceEdition: "UI GreenMetric 2026",
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        currentScore: baselineResult.totalScore, scenarioScore: scenarioResult.totalScore,
        scoreDifference: baselineResult.totalScore === null || scenarioResult.totalScore === null ? null : scenarioResult.totalScore - baselineResult.totalScore,
        currentRankBand: baselineResult.estimatedRankBand, scenarioRankBand: scenarioResult.estimatedRankBand,
        calculationStatus: scenarioResult.complete ? "complete" : "missing-data", warnings: scenarioResult.warnings,
        changedMetrics: Object.entries(scenarioChanges).map(([parameterId, scenarioValue]) => ({ parameterId, label: parameterId, currentValue: baselineValues[parameterId] ?? null, scenarioValue })),
        currentCategoryScores: baselineResult.displayedCategoryScores,
        scenarioCategoryScores: scenarioResult.displayedCategoryScores,
        currentIndicatorScores: null, scenarioIndicatorScores: null,
        rawCalculationDetails: null, recommendationContext: null,
      })} /></div>
    </>
  );
}

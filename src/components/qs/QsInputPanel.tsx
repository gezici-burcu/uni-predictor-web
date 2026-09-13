"use client";

import { useMemo } from "react";
import { ResetAllChangesButton } from "@/src/components/common/ResetAllChangesButton";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { QsDashboard } from "./QsDashboard";
import { QsInstitutionalParameterPanel } from "./QsInstitutionalParameterPanel";
import { useQsRawIndicatorResults } from "./useQsRawIndicatorResults";
import { createQsChangedInputRows } from "./qsResultViewModels";
import { QS_ACTIVE_SCENARIO_PARAMETER_IDS } from "@/src/config/qs-active-scenario-parameters";
import { QS_WEIGHTED_INDICATOR_DEFINITIONS } from "@/src/config/qs.stochastic";
import { SimulatorLayout, SIMULATOR_ASIDE_CLASS_NAME } from "@/src/components/common/SimulatorLayout";

export function QsInputPanel() {
  const { language, t } = useAppLanguage();
  const raw = useQsRawIndicatorResults();
  const changedRows = useMemo(() => createQsChangedInputRows({
    language,
    institutionalBaseline: raw.currentInstitutionalDisplay,
    institutionalOverrides: raw.institutionalOverrides,
  }), [
    language,
    raw.currentInstitutionalDisplay,
    raw.institutionalOverrides,
  ]);
  const infoCards = [
    { key: "parameter", label: t("theSimulator.parameter"), value: QS_ACTIVE_SCENARIO_PARAMETER_IDS.length },
    { key: "indicator", label: t("theSimulator.indicator"), value: QS_WEIGHTED_INDICATOR_DEFINITIONS.length },
    { key: "changed", label: t("theSimulator.changed"), value: raw.changedCount },
  ];

  return (
    <SimulatorLayout parameterPanel={
        <aside
          className={SIMULATOR_ASIDE_CLASS_NAME}
          data-testid="qs-input-panel"
        >
          <div className="flex min-w-0 flex-col gap-4">
          <section className="shrink-0 rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50/60 p-4 shadow-sm">
            <div className="h-1 w-10 rounded-full bg-blue-600" aria-hidden="true" />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-slate-950">{t("qsUi.inputTitle")}</h1>
                <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {t("qsUi.dataYear")}: {raw.selectedYear}
                </span>
              </div>
              <ResetAllChangesButton methodologyName="QS" changedCount={raw.changedCount} onReset={raw.resetSelectedYear} />
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2">
              {infoCards.map((card) => { const isChanged = card.key === "changed"; return <div key={card.key} className={isChanged ? "rounded-lg border border-blue-100 bg-blue-50 px-3 py-2" : "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"}><dt className={isChanged ? "text-[11px] text-blue-600" : "text-[11px] text-slate-500"}>{card.label}</dt><dd className={`mt-1 text-lg font-bold ${isChanged ? "text-blue-700" : "text-slate-950"}`}>{card.value}</dd></div>; })}
            </dl>
          </section>
          <div data-testid="qs-input-list">
            <QsInstitutionalParameterPanel
              language={language}
              baseline={raw.currentInstitutional}
              overrides={raw.institutionalOverrides}
              validation={raw.scenarioValidation}
              onTotalChange={raw.updateInstitutionalTotal}
              onScalarChange={(id, value) => raw.updateInstitutionalField(id, "value", value)}
            />
            {!raw.scenarioValidation.isValid ? (
              <div
                className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                role="alert"
              >
                <p>Simülasyon güncellenemedi. {new Set(raw.scenarioValidation.errors.map((issue) => issue.fieldId)).size} parametrede tutarsız değer bulunuyor.</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {raw.scenarioValidation.errors.map((issue, index) => <li key={`${issue.fieldId}-${issue.part}-${index}`}>{issue.message}</li>)}
                </ul>
              </div>
            ) : null}
          </div>
          </div>
        </aside>
      } dashboard={<QsDashboard
          simulation={raw.simulation}
          rankEstimation={raw.rankEstimation}
          changedRows={changedRows}
          simulationPending={raw.simulationPending}
          hasValidationError={!raw.scenarioValidation.isValid}
        />}
    />
  );
}

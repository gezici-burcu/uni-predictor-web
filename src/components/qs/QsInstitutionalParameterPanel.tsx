"use client";

import { useState, type SyntheticEvent } from "react";
import { QS_ACTIVE_SCENARIO_GROUPS, type QsActiveScenarioParameterId } from "@/src/config/qs-active-scenario-parameters";
import type { QsInstitutionalYearData } from "@/src/contexts/InstitutionDataContext";
import type { AppLanguage } from "@/src/i18n/types";
import { getTranslation } from "@/src/i18n/getTranslation";
import type { QsInstitutionalScenarioOverrides } from "@/src/lib/qs/institutional-parameter-view-model";
import { getQsActiveScenarioFieldError, type QsActiveScenarioValidationResult } from "@/src/lib/qs/validate-qs-active-scenario";
import { qsInstitutionalCountRows, type QsInstitutionalFteCountRowId, type QsInstitutionalScalarRowId } from "@/src/types/qsInstitutional";
import { TheScenarioParameterInput } from "@/src/components/the/TheScenarioParameterInput";
import { getQsEffectiveTotal, getQsEffectiveValue } from "@/src/lib/qs/qs-effective-value";
import { getQsScenarioConstraint } from "@/src/config/qs-scenario-constraints";
import { mergeQsInstitutionalScenario } from "@/src/lib/qs/institutional-parameter-view-model";

type Props = { language: AppLanguage; baseline: QsInstitutionalYearData; overrides: QsInstitutionalScenarioOverrides; validation?: QsActiveScenarioValidationResult; onTotalChange?: (id: QsInstitutionalFteCountRowId, value: number | null) => void; onScalarChange?: (id: QsInstitutionalScalarRowId, value: number | null) => void; onCountChange?: (id: QsInstitutionalFteCountRowId, field: "fullTime"|"partTime", value: number|null) => void };
const fteIds = new Set<string>(["academicStaff","internationalAcademicStaff","undergraduateStudents","undergraduateInternationalStudents","graduatePostgraduateStudents","graduatePostgraduateInternationalStudents"]);
const definitions = new Map(qsInstitutionalCountRows.map((row) => [row.id, row]));

export function updateQsOpenGroupIds(current: ReadonlySet<string>, groupId: string, isOpen: boolean) {
  const next = new Set(current);
  if (isOpen) next.add(groupId); else next.delete(groupId);
  return next;
}

export function QsInstitutionalParameterPanel({ language, baseline, overrides, validation = {errors:[],warnings:[],isValid:true}, onTotalChange = () => undefined, onScalarChange = () => undefined }: Props) {
  const t = (key: string) => getTranslation(language, key);
  const [open, setOpen] = useState<Set<string>>(() => new Set([QS_ACTIVE_SCENARIO_GROUPS[0].id]));
  const handleGroupToggle = (groupId: string, event: SyntheticEvent<HTMLDetailsElement>) => {
    const isOpen = event.currentTarget.open;
    setOpen((current) => updateQsOpenGroupIds(current, groupId, isOpen));
  };
  const effectiveValues = mergeQsInstitutionalScenario(baseline, overrides);

  return <section aria-labelledby="qs-flat-parameters-title" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
    <h2 id="qs-flat-parameters-title" className="sr-only">QS {t("theSimulator.parameters")}</h2>
    <div className="grid grid-cols-1 gap-2" data-testid="qs-display-parameter-sections">
      {QS_ACTIVE_SCENARIO_GROUPS.map((group) => <details key={group.id} open={open.has(group.id)} data-section-id={group.id} className="group min-w-0 overflow-hidden rounded-xl border border-slate-200" onToggle={(event) => handleGroupToggle(group.id, event)}>
        <summary className="flex cursor-pointer list-none items-center gap-2 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 [&::-webkit-details-marker]:hidden">
          <span>{group.label[language]}</span><span className="ml-auto text-[11px] font-medium normal-case text-slate-500">{t("theSimulator.parameterCount").replace("{count}", String(group.rowIds.length))}</span>
        </summary>
        <div className="grid grid-cols-1 gap-3 border-t border-slate-200 p-3">
          {group.rowIds.map((id) => {
            const definition = definitions.get(id)!;
            const isTotal = fteIds.has(id);
            const baselineRow = baseline[id] as Record<string, number | null> | undefined;
            const overrideRow = overrides[id] as Record<string, number | null> | undefined;
            const current = isTotal ? getQsEffectiveTotal(undefined, baselineRow) : getQsEffectiveValue(undefined, baselineRow?.value);
            const scenario = isTotal ? getQsEffectiveTotal(overrideRow, baselineRow) : getQsEffectiveValue(overrideRow?.value, baselineRow?.value);
            const error = getQsActiveScenarioFieldError(validation, id as QsActiveScenarioParameterId, isTotal ? "total" : "value");
            const constraint = getQsScenarioConstraint(id as QsActiveScenarioParameterId, effectiveValues);
            return <div key={id} data-parameter-id={id} data-input-kind={isTotal ? "aggregate-total" : "scalar"}>
              <TheScenarioParameterInput
                id={`qs-${id}`}
                label={definition.label[language]}
                value={scenario}
                currentValue={current}
                minimum={constraint.min}
                maximum={constraint.max}
                step={constraint.step}
                unit={language === "tr" ? (isTotal ? "kişi" : "adet") : (isTotal ? "people" : "count")}
                required
                clampToMinimum
                statusLabel={group.id === "employment"
                  ? (language === "tr" ? "Zorunlu veri · yalnız ham EO analizinde kullanılır" : "Required data · used only in raw EO analysis")
                  : (language === "tr" ? "Zorunlu veri · ham gösterge oranında kullanılır" : "Required data · used in the raw indicator ratio")}
                error={error?.message}
                onChange={(value) => isTotal ? onTotalChange(id as QsInstitutionalFteCountRowId, value) : onScalarChange(id as QsInstitutionalScalarRowId, value)}
              />
            </div>;
          })}
          {group.id === "employment" ? <EmploymentDiagnostics baseline={baseline} overrides={overrides} language={language} /> : null}
        </div>
      </details>)}
    </div>
  </section>;
}

function EmploymentDiagnostics({ baseline, overrides, language }: Pick<Props,"baseline"|"overrides"|"language">) {
  const value = (id: QsInstitutionalScalarRowId) => getQsEffectiveValue(
    (overrides[id] as {value?:number|null}|undefined)?.value,
    baseline[id]?.value,
  );
  const total = value("totalGraduateStudents2023"), respondents = value("totalEmploymentRespondents"), employed = value("employedGraduates"), unemployed = value("unemployedGraduates");
  const response = total && respondents !== null ? respondents / total * 100 : null;
  const employmentDenominator = (employed ?? 0) + (unemployed ?? 0);
  const employment = employmentDenominator > 0 && employed !== null ? employed / employmentDenominator * 100 : null;
  const t = (key: string) => getTranslation(language, key);
  const locale = language === "tr" ? "tr-TR" : "en-US";
  return <div className="grid gap-2 rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-600 sm:grid-cols-2"><span>{t("qsUi.surveyResponseRate")}: {response === null ? "—" : `%${response.toLocaleString(locale,{maximumFractionDigits:2})}`}</span><span>{t("qsUi.graduateEmploymentRate")}: {employment === null ? "—" : `%${employment.toLocaleString(locale,{maximumFractionDigits:2})}`}</span><span className="sm:col-span-2">{t("qsUi.eoScoreImpact")}: {t("qsUi.couldNotCalculate")}</span></div>;
}

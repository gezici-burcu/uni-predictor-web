"use client";

import { useState } from "react";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { useInstitutionData } from "@/src/contexts/InstitutionDataContext";
import type { MethodologyId } from "@/src/contexts/MethodologyBaselineContext";
import { INSTITUTION_DATA_YEARS, type InstitutionDataYear } from "@/src/config/institution-data-years";
import type { QsDataYear } from "@/src/types/qsInstitutional";
import { TheInstitutionDataForm } from "./TheInstitutionDataForm";
import { QsInstitutionalDataForm } from "./qs/QsInstitutionalDataForm";
import { GreenMetricInstitutionDataForm } from "./GreenMetricInstitutionDataForm";

export function DataEntryPage() {
  const { t } = useAppLanguage();
  const { selectTheYear, selectQsYear, selectGreenMetricYear } = useInstitutionData();
  const [selectedMethodology, setSelectedMethodology] = useState<MethodologyId | "">("");
  const [selectedYear, setSelectedYear] = useState<InstitutionDataYear | "">("");

  const handleMethodologyChange = (value: MethodologyId | "") => {
    setSelectedMethodology(value);
    setSelectedYear("");
  };
  const handleYearChange = (value: string) => {
    const year = value === "" ? "" : Number(value) as InstitutionDataYear;
    setSelectedYear(year);
    if (selectedMethodology === "the" && year !== "") selectTheYear(year);
    if (selectedMethodology === "qs" && year !== "") selectQsYear(String(year) as QsDataYear);
    if (selectedMethodology === "ui-greenmetric" && year !== "") selectGreenMetricYear(year);
  };
  const selectClass = "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

  return <div>
    <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50/70 p-5 shadow-sm sm:p-6">
      <div className="absolute -right-16 -top-20 size-48 rounded-full bg-blue-200/30 blur-3xl" aria-hidden="true" />
      <div className="relative"><span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">{t("dataEntry.methodologyLabel")}</span>
      <h1 className="mt-3 text-2xl font-bold text-slate-950">{t("dataEntry.title")}</h1>
      <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">{t("dataEntry.description")}</p>
      <div className="mt-5 grid max-w-4xl gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="data-entry-methodology" className="text-sm font-semibold text-slate-800">{t("dataEntry.methodologyLabel")}</label>
          <select id="data-entry-methodology" value={selectedMethodology} onChange={event => handleMethodologyChange(event.target.value as MethodologyId | "")} className={selectClass}>
            <option value="">{t("dataEntry.selectMethodology")}</option><option value="the">THE</option><option value="qs">QS</option><option value="ui-greenmetric">UI GreenMetric</option>
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="data-entry-year" className="text-sm font-semibold text-slate-800">{t("dataEntry.yearLabel")}</label>
          <select id="data-entry-year" value={selectedYear} disabled={!selectedMethodology} onChange={event => handleYearChange(event.target.value)} className={selectClass}>
            <option value="">{t("dataEntry.selectYear")}</option>
            {INSTITUTION_DATA_YEARS.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
          <p className="text-xs text-slate-500">{t("dataEntry.dataYearHelp")}</p>
        </div>
      </div></div>
    </section>
    {selectedMethodology === "the" && selectedYear !== "" ? <TheInstitutionDataForm key={selectedYear} year={selectedYear} /> :
      selectedMethodology === "qs" && selectedYear !== "" ? <QsInstitutionalDataForm key={selectedYear} year={String(selectedYear) as QsDataYear} /> :
      selectedMethodology === "ui-greenmetric" && selectedYear !== "" ? <GreenMetricInstitutionDataForm key={selectedYear} year={selectedYear} /> :
      selectedMethodology && selectedYear !== "" ? <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">{t("dataEntry.noFieldsForMethodology")}</p> : null}
  </div>;
}

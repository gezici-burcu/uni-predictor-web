"use client";

import { useMemo, useState } from "react";
import {
  THE_INSTITUTION_DATA_FIELDS,
  type TheInstitutionFieldDefinition,
} from "@/src/config/data-entry/the-institution-fields";
import type { InstitutionDataYear } from "@/src/config/institution-data-years";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { useInstitutionData } from "@/src/contexts/InstitutionDataContext";
import {
  getTheInstitutionDataForYear,
  type TheInstitutionData,
} from "@/src/data/data-entry/the-institution-data";
import {
  getTheSubsetValidationErrorMap,
  validateTheInstitutionData,
} from "@/src/lib/the/validate-the-subset-limits";


export function getTheFemaleStudentFteError(
  values: Pick<TheInstitutionData, "studentsFte" | "femaleStudentsFte">,
) {
  return getTheSubsetValidationErrorMap(values).femaleStudentsFte ?? null;
}

export { validateTheInstitutionData };

function Field({
  field,
  value,
  error,
  errorMessage,
  onChange,
}: {
  field: TheInstitutionFieldDefinition;
  value: number | null;
  error: boolean;
  errorMessage?: string;
  onChange: (value: number | null) => void;
}) {
  const { language, t } = useAppLanguage();
  return (
    <div
      data-field-id={field.id}
      className={`w-full min-w-0 rounded-xl border p-4 ${
        field.required
          ? "border-slate-300 bg-white"
          : "border-slate-200 bg-slate-50/60"
      }`}
    >
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <label
          htmlFor={`the-institution-${field.id}`}
          className={`min-w-0 break-words ${
            field.required ? "font-bold text-slate-950" : "font-medium text-slate-700"
          }`}
        >
          {field.label[language]}
        </label>
        <span
          className={`text-xs ${
            field.required ? "font-semibold text-blue-700" : "text-slate-500"
          }`}
        >
          ({t(field.required
            ? "dataEntry.requiredCalculationStatus"
            : "dataEntry.optionalInformationStatus")})
        </span>
      </div>
      <input
        id={`the-institution-${field.id}`}
        type="number"
        min={field.minimum}
        step={field.step}
        required={field.required}
        aria-invalid={error}
        aria-describedby={errorMessage ? `the-institution-${field.id}-error` : undefined}
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value === "" ? null : Number(event.target.value))
        }
        className={`mt-3 h-11 w-full min-w-0 rounded-lg border px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
          error ? "border-red-400" : "border-slate-300"
        }`}
      />
      {errorMessage ? (
        <p
          id={`the-institution-${field.id}-error`}
          className="mt-2 text-sm font-medium text-red-700"
        >
          {errorMessage}
        </p>
      ) : null}
      <div className="mt-2 flex min-w-0 flex-wrap justify-between gap-2 text-xs text-slate-500">
        <span>{field.unit[language]}</span>
        <span>
          {value === null
            ? "—"
            : new Intl.NumberFormat(
                language === "tr" ? "tr-TR" : "en-US",
                { maximumFractionDigits: 20 },
              ).format(value)}
        </span>
      </div>
    </div>
  );
}

export function TheInstitutionDataForm({ year }: { year: InstitutionDataYear }) {
  const { t } = useAppLanguage();
  const { getTheYearOverride, saveTheYear, clearTheYear } = useInstitutionData();
  const source = useMemo(() => getTheInstitutionDataForYear(year), [year]);
  const initial = useMemo(
    () => ({ ...source, ...getTheYearOverride(year) }),
    [source, year, getTheYearOverride],
  );
  const [draft, setDraft] = useState<TheInstitutionData>(initial);
  const [errors, setErrors] =
    useState<Partial<Record<keyof TheInstitutionData, string>>>({});
  const [message, setMessage] = useState("");
  const subsetErrors = getTheSubsetValidationErrorMap(draft);

  const save = () => {
    const nextErrors = validateTheInstitutionData(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setMessage(t("dataEntry.completeRequiredFields"));
      return;
    }
    if (saveTheYear(year,draft)) setMessage(t("dataEntry.savedSuccessfully"));
  };

  const discard = () => {
    setDraft(initial);
    setErrors({});
    setMessage("");
  };

  const clear = () => {
    clearTheYear(year);
    const defaults = getTheInstitutionDataForYear(year);
    setDraft(defaults);
    setErrors({});
    setMessage("");
  };

  return (
    <section className="mt-5 min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{t("dataEntry.theFormTitle")}</h2>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {t("dataEntry.dataYear")}: {year}
        </span>
      </div>
      <div className="mt-6 grid min-w-0 grid-cols-1 gap-3">
        {THE_INSTITUTION_DATA_FIELDS.map((field) => {
          const storedError = errors[field.id];
          const liveSubsetError = subsetErrors[field.id as keyof typeof subsetErrors];
          const fieldError = liveSubsetError ?? storedError;
          return (
            <Field
              key={field.id}
              field={field}
              value={draft[field.id]}
              error={Boolean(fieldError)}
          errorMessage={liveSubsetError ?? (storedError ? storedError : undefined)}
              onChange={(value) => {
                setDraft((current) => ({ ...current, [field.id]: value }));
                setErrors((current) => {
                  const next = { ...current };
                  delete next[field.id];
                  return next;
                });
                setMessage("");
              }}
            />
          );
        })}
      </div>
      {message ? (
        <div
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${Object.keys(errors).length ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}
          aria-live="polite"
        >
          <strong>{message}</strong>
          {Object.keys(errors).length ? <ul className="mt-2 list-disc space-y-1 pl-5">{Object.entries(errors).map(([fieldId, error]) => <li key={fieldId}>{error}</li>)}</ul> : null}
        </div>
      ) : null}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={save}
          className="rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white"
        >
          {t("dataEntry.save")}
        </button>
        <button
          type="button"
          onClick={discard}
          className="rounded-lg border px-4 py-2.5 font-semibold"
        >
          {t("dataEntry.discard")}
        </button>
        <button
          type="button"
          onClick={clear}
          className="rounded-lg border border-red-200 px-4 py-2.5 font-semibold text-red-700"
        >
          {t("dataEntry.clearYear")}
        </button>
      </div>
    </section>
  );
}

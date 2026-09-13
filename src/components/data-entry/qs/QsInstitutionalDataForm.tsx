"use client";

import {
  Fragment,
  useMemo,
  useState,
} from "react";

import {
  QS_PART_TIME_FTE_COEFFICIENT,
} from "@/src/config/qs-institutional";
import {
  qsInstitutionalSectionLabels as groupLabels,
} from "@/src/config/qs-institutional-mapping";

import {
  useAppLanguage,
} from "@/src/contexts/AppLanguageContext";

import {
  useInstitutionData,
} from "@/src/contexts/InstitutionDataContext";
import {
  useMethodologyScenario,
} from "@/src/contexts/MethodologyScenarioContext";
import { getCanonicalQsYearData } from "@/src/lib/qs/qs-institution-year-data";
import {
  readQsYearScenarioChanges,
  writeQsYearScenarioChanges,
} from "@/src/lib/qs/qs-scenario";
import {
  getQsAcademicStaffSubsetErrorMap,
  getQsUndergraduateSubsetErrorMap,
  normalizeQsInstitutionalPair,
  parseQsInstitutionalDraftNumber,
  validateQsInstitutionalYearData,
} from "@/src/lib/qs/qs-institutional-normalization";

import {
  calculateQsCount,
  createEmptyQsCountInput,
  qsInstitutionalCountRows,
  type QsCalculatedCount,
  type QsCountInput,
  type QsDataYear,
  type QsInstitutionalCountRowId,
  type QsInstitutionalFteCountRowId,
  type QsInstitutionalInputByRowId,
  type QsInstitutionalScalarRowId,
  type QsSingleValueRowId,
} from "@/src/types/qsInstitutional";

const graduateDetailWarningLabels = {
  graduatePostgraduateInternationalStudents: {
    tr: "Uluslararası lisansüstü öğrenci",
    en: "International graduate/postgraduate",
    trValue: "uluslararası",
    enValue: "international",
  },
  graduatePostgraduateExchangeStudentsInbound: {
    tr: "Gelen lisansüstü değişim öğrencisi",
    en: "Inbound graduate/postgraduate exchange student",
    trValue: "gelen değişim",
    enValue: "inbound",
  },
  graduatePostgraduateExchangeStudentsOutbound: {
    tr: "Giden lisansüstü değişim öğrencisi",
    en: "Outbound graduate/postgraduate exchange student",
    trValue: "giden değişim",
    enValue: "outbound",
  },
} as const;

const overallDetailWarningLabels = {
  overallInternationalStudents: {
    tr: "Toplam uluslararası öğrenci",
    en: "International students - overall",
  },
  distanceStudents: {
    tr: "Uzaktan eğitim öğrencisi",
    en: "Distance student",
  },
  distanceInternationalStudents: {
    tr: "Uluslararası uzaktan eğitim öğrencisi",
    en: "International distance student",
  },
  exchangeStudentsInbound: {
    tr: "Gelen değişim öğrencisi",
    en: "Inbound exchange student",
  },
  exchangeStudentsOutbound: {
    tr: "Giden değişim öğrencisi",
    en: "Outbound exchange student",
  },
} as const;

const employmentWarningConfig = {
  totalEmploymentRespondents: {
    totalId: "totalGraduateStudents2023",
    tr: "Toplam katılımcı sayısı, toplam mezun öğrenci sayısından büyük olamaz.",
    en: "Total respondents cannot be greater than total graduate students.",
    trValues: "Toplam mezun",
    enValues: "Total graduates",
    trDetail: "katılımcı",
    enDetail: "respondents",
  },
  employedGraduates: {
    totalId: "totalEmploymentRespondents",
    tr: "İstihdam edilen mezun sayısı, toplam katılımcı sayısından büyük olamaz.",
    en: "Employed graduates cannot be greater than total respondents.",
    trValues: "Katılımcı",
    enValues: "Respondents",
    trDetail: "istihdam edilen",
    enDetail: "employed",
  },
  unemployedGraduates: {
    totalId: "totalEmploymentRespondents",
    tr: "İşsiz mezun sayısı, toplam katılımcı sayısından büyük olamaz.",
    en: "Unemployed graduates cannot be greater than total respondents.",
    trValues: "Katılımcı",
    enValues: "Respondents",
    trDetail: "işsiz",
    enDetail: "unemployed",
  },
  graduatesInFullTimeFurtherStudy: {
    totalId: "totalEmploymentRespondents",
    tr: "Tam zamanlı ileri eğitime devam eden mezun sayısı, toplam katılımcı sayısından büyük olamaz.",
    en: "Graduates in full-time further study cannot be greater than total respondents.",
    trValues: "Katılımcı",
    enValues: "Respondents",
    trDetail: "ileri eğitim",
    enDetail: "further study",
  },
  graduatesUnavailableForWork: {
    totalId: "totalEmploymentRespondents",
    tr: "Çalışmaya uygun olmayan mezun sayısı, toplam katılımcı sayısından büyük olamaz.",
    en: "Graduates unavailable for work cannot be greater than total respondents.",
    trValues: "Katılımcı",
    enValues: "Respondents",
    trDetail: "uygun olmayan",
    enDetail: "unavailable",
  },
} as const;

const employmentCountRowIds = new Set<QsInstitutionalScalarRowId>([
  "totalGraduateStudents2023",
  "totalEmploymentRespondents",
  "employedGraduates",
  "unemployedGraduates",
  "graduatesInFullTimeFurtherStudy",
  "graduatesUnavailableForWork",
]);

/**
 * Formdaki bütün QS akademik personel satırlarının
 * Full-Time ve Part-Time değerlerini tutar.
 */
type QsInstitutionalDraft =
  QsInstitutionalInputByRowId;

/**
 * Her satır için hesaplanan Headcount ve FTE sonuçlarını tutar.
 */
type QsInstitutionalCalculations = Record<
  Exclude<
    QsInstitutionalCountRowId,
    QsSingleValueRowId
  >,
  QsCalculatedCount
>;

export function parseQsNullableNumber(
  value: string,
): number | null {
  return parseQsInstitutionalDraftNumber(value);
}

export function validateQsCountInput(
  value: QsCountInput,
): boolean {
  return (
    value.fullTime !== null &&
    value.partTime !== null &&
    Number.isFinite(value.fullTime) &&
    Number.isFinite(value.partTime) &&
    value.fullTime >= 0 &&
    value.partTime >= 0 &&
    Number.isInteger(value.fullTime) &&
    Number.isInteger(value.partTime)
  );
}

/**
 * Tanımlanan bütün QS satırları için boş form oluşturur.
 */
export function createQsInstitutionalDraft(
  source: Partial<QsInstitutionalInputByRowId> = {},
): QsInstitutionalDraft {
  return Object.fromEntries(
    qsInstitutionalCountRows.map((row) => [
      row.id,
      {
        ...(row.inputKind === "fte-count"
          ? source[row.id] ?? createEmptyQsCountInput()
          : source[row.id] ?? { value: null }),
      },
    ]),
  ) as QsInstitutionalDraft;
}

/**
 * Toplam akademik personeli yalnız erkek, kadın ve diğer
 * alt satırlardaki geçerli alanlardan bağımsız olarak türetir.
 */
const academicStaffDetailRowIds = [
  "maleAcademicStaff",
  "femaleAcademicStaff",
  "otherAcademicStaff",
] as const;

export function isValidQsCountValue(
  value: number | null,
): value is number {
  return (
    value !== null &&
    Number.isFinite(value) &&
    value >= 0 &&
    Number.isInteger(value)
  );
}

export function sumCompleteQsCountValues(
  values: Array<number | null>,
): number | null {
  if (!values.every(isValidQsCountValue)) {
    return null;
  }

  return values.reduce(
    (total, value) => total + value,
    0,
  );
}

export function deriveAcademicStaffInput(
  draft: Pick<
    QsInstitutionalDraft,
    | "maleAcademicStaff"
    | "femaleAcademicStaff"
    | "otherAcademicStaff"
  >,
): QsCountInput {
  const validFullTimeValues =
    academicStaffDetailRowIds
      .map(
        (rowId) =>
          draft[rowId].fullTime,
      )
      .filter(isValidQsCountValue);

  const validPartTimeValues =
    academicStaffDetailRowIds
      .map(
        (rowId) =>
          draft[rowId].partTime,
      )
      .filter(isValidQsCountValue);

  return {
    fullTime:
      validFullTimeValues.length > 0
        ? validFullTimeValues.reduce(
            (total, value) =>
              total + value,
            0,
          )
        : null,
    partTime:
      validPartTimeValues.length > 0
        ? validPartTimeValues.reduce(
            (total, value) =>
              total + value,
            0,
          )
        : null,
  };
}

export function calculateQsCountAllowingEmptySide(
  input: QsCountInput,
): QsCalculatedCount {
  if (input.fullTime === null && input.partTime === null) {
    return calculateQsCount(
      input,
      QS_PART_TIME_FTE_COEFFICIENT,
    );
  }
  let effectiveInput = input;
  try {
    effectiveInput =
      normalizeQsInstitutionalPair(input);
  } catch {
    // Invalid draft values remain editable; save validation reports them.
  }
  return calculateQsCount(
    effectiveInput,
    QS_PART_TIME_FTE_COEFFICIENT,
  );
}

function Result({
  label,
  description,
  value,
}: {
  label: string;
  description: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <dt className="text-xs font-semibold text-slate-600">
        {label}
      </dt>

      <dd className="mt-1 text-lg font-bold text-slate-950">
        {value}
      </dd>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export function QsInstitutionalDataForm({
  year,
}: {
  year: QsDataYear;
}) {
  const {
    language,
    t,
  } = useAppLanguage();

  const {
    getQsYearOverride,
    saveQsYear,
    clearQsYear,
  } = useInstitutionData();
  const {
    getChanges,
    setChanges,
  } = useMethodologyScenario();

  /**
   * Seçilen yılın kayıtlı değerlerini forma hazırlar.
   *
   * Kayıt bulunmayan satırlar boş oluşturulur.
   */
  const saved =
    useMemo<QsInstitutionalDraft>(() => {
      const savedYearOverride =
        getQsYearOverride(year);
      const canonicalYearData =
        getCanonicalQsYearData(year);
      const hasSavedRecord =
        savedYearOverride !== undefined &&
        Object.keys(savedYearOverride).length > 0;
      const savedYearData = hasSavedRecord
        ? {
            ...(canonicalYearData ?? {}),
            ...savedYearOverride,
          }
        : canonicalYearData ?? {};

      return createQsInstitutionalDraft(
        savedYearData,
      );
    }, [getQsYearOverride, year]);

  const [
    draft,
    setDraft,
  ] = useState<QsInstitutionalDraft>(
    saved,
  );

  const [
    message,
    setMessage,
  ] = useState("");
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [validationFieldErrors, setValidationFieldErrors] = useState<Record<string, string>>({});
  const countSubsetErrors = useMemo(
    () => ({
      ...getQsAcademicStaffSubsetErrorMap(draft),
      ...getQsUndergraduateSubsetErrorMap(draft),
    }),
    [draft],
  );

  /**
   * Beş akademik personel satırının sonuçlarını
   * ayrı ayrı hesaplar.
   */
  const calculatedByRow =
    useMemo<QsInstitutionalCalculations>(
      () =>
        Object.fromEntries(
          qsInstitutionalCountRows
            .filter(
              (row) =>
                row.inputKind === "fte-count",
            )
            .map((row) => [
              row.id,
              calculateQsCountAllowingEmptySide(
                row.id === "academicStaff"
                  ? draft.academicStaff
                  : draft[row.id],
              ),
            ]),
        ) as QsInstitutionalCalculations,
      [draft],
    );

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(
        language === "tr"
          ? "tr-TR"
          : "en-US",
        {
          maximumFractionDigits: 2,
        },
      ),
    [language],
  );

  const display = (
    value: number | null,
  ): string =>
    value === null
      ? "—"
      : formatter.format(value);

  /**
   * Belirli bir satırın Full-Time veya Part-Time
   * değerini günceller.
   */
  const updateCountDraft = (
    rowId: QsInstitutionalFteCountRowId,
    field: keyof QsCountInput,
    value: number | null,
  ) => {
    setDraft((current) => ({
      ...current,

      [rowId]: {
        ...current[rowId],
        [field]: value,
      },
    }));

    setMessage("");
    setValidationIssues([]);
    setValidationFieldErrors((current) => {
      const next = { ...current };
      delete next[rowId];
      return next;
    });
  };

  const updateScalarDraft = (
    rowId: QsInstitutionalScalarRowId,
    value: number | null,
  ) => {
    setDraft((current) => ({
      ...current,
      [rowId]: {
        value,
      },
    }));

    setMessage("");
    setValidationIssues([]);
    setValidationFieldErrors((current) => {
      const next = { ...current };
      delete next[rowId];
      return next;
    });
  };

  const save = () => {
    const validation =
      validateQsInstitutionalYearData(
        draft,
      );
    const hasInvalidInput =
      !validation.valid;

    if (hasInvalidInput) {
      setValidationIssues(validation.issues);
      setValidationFieldErrors(validation.fieldErrors);
      setMessage(
        t(
          "dataEntry.qs.validationError",
        ),
      );

      return;
    }

    /*
     * Beş satırın Full-Time ve Part-Time değerlerini
     * seçilen yıl altında kaydeder.
     */
    const normalizedDraft =
      validation.values;
    setValidationIssues([]);
    setValidationFieldErrors({});

    saveQsYear(
      year,
      normalizedDraft,
    );
    const storedScenario =
      getChanges("qs");
    const selectedYearScenario =
      readQsYearScenarioChanges(
        storedScenario,
        year,
      );
    setChanges(
      "qs",
      writeQsYearScenarioChanges(
        storedScenario,
        year,
        {
          ...selectedYearScenario,
          institutional: {},
        },
      ),
    );

    setMessage(
      t(
        "dataEntry.savedSuccessfully",
      ),
    );
  };

  const discard = () => {
    setDraft(
      createQsInstitutionalDraft(
        getCanonicalQsYearData(year) ?? {},
      ),
    );

    setMessage("");
  };

  const clear = () => {
    clearQsYear(year);

    setDraft(
      createQsInstitutionalDraft(
        getCanonicalQsYearData(year) ?? {},
      ),
    );

    setMessage("");
  };

  return (
    <section className="mt-5 min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-950">
            {t(
              "dataEntry.qs.title",
            )}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {t(
              "dataEntry.qs.description",
            )}
          </p>
        </div>

        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {t(
            "dataEntry.dataYear",
          )}
          : {year}
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {qsInstitutionalCountRows.map(
          (row) => {
            const groupLabel =
              groupLabels[
                row.id as keyof typeof groupLabels
              ];

            const groupDivider = groupLabel ? (
              <div className="mt-8 flex items-center gap-3 first:mt-0">
                <h3 className="whitespace-nowrap text-sm font-bold uppercase tracking-wide text-slate-800">
                  {groupLabel[language]}
                </h3>

                <div className="h-px flex-1 bg-slate-300" />
              </div>
            ) : null;

            if (row.inputKind !== "fte-count") {
              const numberInput = draft[row.id];
              const employmentWarning =
                employmentWarningConfig[
                  row.id as keyof typeof employmentWarningConfig
                ];
              const employmentWarningTotal =
                employmentWarning
                  ? draft[employmentWarning.totalId].value
                  : null;
              const hasEmploymentWarning =
                employmentWarning !== undefined &&
                isValidQsCountValue(
                  employmentWarningTotal,
                ) &&
                isValidQsCountValue(
                  numberInput.value,
                ) &&
                numberInput.value >
                  employmentWarningTotal;

              return (
                <Fragment key={row.id}>
                  {groupDivider}

                  <div className={`min-w-0 rounded-xl border p-4 ${row.required ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50/60"}`}>
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                      <h3 className={row.required ? "font-bold text-slate-950" : "font-semibold text-slate-700"}>
                        {row.label[language]}
                      </h3>

                      <span className="text-xs font-semibold text-slate-500">
                        (
                        {language === "tr"
                          ? "İsteğe bağlı"
                          : "Optional"}
                        )
                      </span>
                    </div>

                    <label className="mt-4 block min-w-0 text-sm font-semibold text-slate-700">
                      {employmentCountRowIds.has(row.id)
                          ? language === "tr"
                            ? "Öğrenci Sayısı"
                            : "Number of Students"
                      : row.id === "totalStudentNationalities"
                        ? language === "tr"
                          ? "Uyruk Sayısı"
                          : "Number of Nationalities"
                        : language === "tr"
                            ? "Değer"
                            : "Value"}

                      <input
                        data-testid={`qs-${row.id}-value`}
                        type="number"
                        min={0}
                        step={1}
                        aria-invalid={Boolean(validationFieldErrors[row.id])}
                        aria-describedby={validationFieldErrors[row.id] ? `qs-${row.id}-value-error` : undefined}
                        value={numberInput.value ?? ""}
                        onChange={(event) =>
                          updateScalarDraft(
                            row.id,
                            parseQsNullableNumber(
                              event.target.value,
                            ),
                          )
                        }
                        className={`mt-2 h-11 w-full min-w-0 rounded-lg border px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${validationFieldErrors[row.id] ? "border-red-400" : "border-slate-300"}`}
                      />
                      {validationFieldErrors[row.id] ? <p id={`qs-${row.id}-value-error`} className="mt-2 text-xs font-medium leading-5 text-red-700">{validationFieldErrors[row.id]}</p> : null}
                    </label>

                    {employmentWarning &&
                    hasEmploymentWarning ? (
                      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                        {language === "tr"
                          ? `${employmentWarning.tr} ${employmentWarning.trValues}: ${display(employmentWarningTotal)}, ${employmentWarning.trDetail}: ${display(numberInput.value)}.`
                          : `${employmentWarning.en} ${employmentWarning.enValues}: ${display(employmentWarningTotal)}, ${employmentWarning.enDetail}: ${display(numberInput.value)}.`}
                      </p>
                    ) : null}
                  </div>
                </Fragment>
              );
            }

            const input =
              draft[row.id];

            const calculated =
              calculatedByRow[row.id];

            const graduateWarningLabel =
              graduateDetailWarningLabels[
                row.id as keyof typeof graduateDetailWarningLabels
              ];

            const overallWarningLabel =
              overallDetailWarningLabels[
                row.id as keyof typeof overallDetailWarningLabels
              ];

            const hasGraduateFullTimeWarning =
              graduateWarningLabel !== undefined &&
              isValidQsCountValue(
                draft.graduatePostgraduateStudents
                  .fullTime,
              ) &&
              isValidQsCountValue(
                input.fullTime,
              ) &&
              input.fullTime >
                draft.graduatePostgraduateStudents
                  .fullTime;

            const hasGraduatePartTimeWarning =
              graduateWarningLabel !== undefined &&
              isValidQsCountValue(
                draft.graduatePostgraduateStudents
                  .partTime,
              ) &&
              isValidQsCountValue(
                input.partTime,
              ) &&
              input.partTime >
                draft.graduatePostgraduateStudents
                  .partTime;

            const hasOverallFullTimeWarning =
              overallWarningLabel !== undefined &&
              isValidQsCountValue(
                draft.overallStudents.fullTime,
              ) &&
              isValidQsCountValue(
                input.fullTime,
              ) &&
              input.fullTime >
                draft.overallStudents.fullTime;

            const hasOverallPartTimeWarning =
              overallWarningLabel !== undefined &&
              isValidQsCountValue(
                draft.overallStudents.partTime,
              ) &&
              isValidQsCountValue(
                input.partTime,
              ) &&
              input.partTime >
                draft.overallStudents.partTime;

            return (
              <Fragment key={row.id}>
                {groupDivider}

              <div
                className={`min-w-0 rounded-xl border p-4 ${row.required ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50/60"}`}
              >
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h3 className={row.required ? "font-bold text-slate-950" : "font-semibold text-slate-700"}>
                    {
                      row.label[
                        language
                      ]
                    }
                  </h3>

                  {row.required ? (
                    <span className="text-xs font-semibold text-blue-700">
                      (
                      {t(
                        "dataEntry.qs.requiredCalculation",
                      )}
                      )
                    </span>
                  ) : row.affectsCalculation ? (
                    <span className="text-xs font-semibold text-blue-700">
                      (
                      {language === "tr"
                        ? "İsteğe bağlı – hesaplamada kullanılır"
                        : "Optional – used in calculation"}
                      )
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500">
                      (
                      {language === "tr"
                        ? "İsteğe bağlı"
                        : "Optional"}
                      )
                    </span>
                  )}
                </div>

                <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
                  {(
                    [
                      "fullTime",
                      "partTime",
                    ] as const
                  ).map((field) => {
                    const subsetError =
                      countSubsetErrors[
                        `${row.id}.${field}` as keyof typeof countSubsetErrors
                      ];
                    const fieldError = subsetError ?? validationFieldErrors[row.id];
                    const errorId = `qs-${row.id}-${field}-subset-error`;
                    return (
                    <label
                      key={field}
                      className="min-w-0 text-sm font-semibold text-slate-700"
                    >
                      {t(
                        `dataEntry.qs.${field}`,
                      )}

                      <input
                        data-testid={
                          row.id ===
                          "academicStaff"
                            ? `qs-${field}`
                            : `qs-${row.id}-${field}`
                        }
                        type="number"
                        min={0}
                        step={1}
                        aria-invalid={Boolean(fieldError)}
                        aria-describedby={fieldError ? errorId : undefined}
                        value={
                          input[field] ??
                          ""
                        }
                        onChange={(
                          event,
                        ) =>
                          updateCountDraft(
                            row.id,
                            field,
                            parseQsNullableNumber(
                              event
                                .target
                                .value,
                            ),
                          )
                        }
                        className={`mt-2 h-11 w-full min-w-0 rounded-lg border px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                          fieldError ? "border-red-400" : "border-slate-300"
                        }`}
                      />
                      {fieldError ? (
                        <p
                          id={errorId}
                          className="mt-2 text-xs font-medium leading-5 text-red-700"
                        >
                          {fieldError}
                        </p>
                      ) : null}
                    </label>
                    );
                  })}
                </div>

                {graduateWarningLabel &&
                hasGraduateFullTimeWarning ? (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                    {language === "tr"
                      ? `${graduateWarningLabel.tr} Full-Time değeri, toplam lisansüstü öğrenci Full-Time değerinden büyük olamaz. Toplam: ${display(draft.graduatePostgraduateStudents.fullTime)}, ${graduateWarningLabel.trValue}: ${display(input.fullTime)}.`
                      : `${graduateWarningLabel.en} Full-Time cannot be greater than total graduate/postgraduate Full-Time. Total: ${display(draft.graduatePostgraduateStudents.fullTime)}, ${graduateWarningLabel.enValue}: ${display(input.fullTime)}.`}
                  </p>
                ) : null}

                {graduateWarningLabel &&
                hasGraduatePartTimeWarning ? (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                    {language === "tr"
                      ? `${graduateWarningLabel.tr} Part-Time değeri, toplam lisansüstü öğrenci Part-Time değerinden büyük olamaz. Toplam: ${display(draft.graduatePostgraduateStudents.partTime)}, ${graduateWarningLabel.trValue}: ${display(input.partTime)}.`
                      : `${graduateWarningLabel.en} Part-Time cannot be greater than total graduate/postgraduate Part-Time. Total: ${display(draft.graduatePostgraduateStudents.partTime)}, ${graduateWarningLabel.enValue}: ${display(input.partTime)}.`}
                  </p>
                ) : null}

                {overallWarningLabel &&
                hasOverallFullTimeWarning ? (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                    {language === "tr"
                      ? `${overallWarningLabel.tr} Full-Time değeri, genel toplam öğrenci Full-Time değerinden büyük olamaz. Toplam: ${display(draft.overallStudents.fullTime)}, alt değer: ${display(input.fullTime)}.`
                      : `${overallWarningLabel.en} Full-Time cannot be greater than overall student Full-Time. Total: ${display(draft.overallStudents.fullTime)}, detail: ${display(input.fullTime)}.`}
                  </p>
                ) : null}

                {overallWarningLabel &&
                hasOverallPartTimeWarning ? (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                    {language === "tr"
                      ? `${overallWarningLabel.tr} Part-Time değeri, genel toplam öğrenci Part-Time değerinden büyük olamaz. Toplam: ${display(draft.overallStudents.partTime)}, alt değer: ${display(input.partTime)}.`
                      : `${overallWarningLabel.en} Part-Time cannot be greater than overall student Part-Time. Total: ${display(draft.overallStudents.partTime)}, detail: ${display(input.partTime)}.`}
                  </p>
                ) : null}

                <dl className="mt-4 grid min-w-0 gap-3 md:grid-cols-3">
                  <Result
                    label={t(
                      "dataEntry.qs.headcount",
                    )}
                    description={t(
                      "dataEntry.qs.headcountHelp",
                    )}
                    value={display(
                      calculated.headcount,
                    )}
                  />

                  <Result
                    label={t(
                      "dataEntry.qs.rawFte",
                    )}
                    description={t(
                      "dataEntry.qs.rawFteHelp",
                    )}
                    value={display(
                      calculated.rawFte,
                    )}
                  />

                  <Result
                    label={t(
                      "dataEntry.qs.roundedFte",
                    )}
                    description={t(
                      "dataEntry.qs.roundedFteHelp",
                    )}
                    value={display(
                      calculated.roundedFte,
                    )}
                  />
                </dl>

                {calculated.hasFraction ? (
                  <p className="mt-3 text-xs leading-5 text-blue-700">
                    {t(
                      "dataEntry.qs.fractionalFte",
                    )}
                  </p>
                ) : null}
              </div>
              </Fragment>
            );
          },
        )}

        {QS_PART_TIME_FTE_COEFFICIENT ===
        null ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
            {t(
              "dataEntry.qs.coefficientMissing",
            )}
          </p>
        ) : null}
      </div>

      {message ? (
        <div
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${validationIssues.length ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}
          aria-live="polite"
        >
          <strong>{message}</strong>
          {validationIssues.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{validationIssues.map((issue, index) => <li key={`${issue}-${index}`}>{issue}</li>)}</ul> : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={save}
          className="rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white"
        >
          {t(
            "dataEntry.save",
          )}
        </button>

        <button
          type="button"
          onClick={discard}
          className="rounded-lg border px-4 py-2.5 font-semibold"
        >
          {t(
            "dataEntry.discard",
          )}
        </button>

        <button
          type="button"
          onClick={clear}
          className="rounded-lg border border-red-200 px-4 py-2.5 font-semibold text-red-700"
        >
          {t(
            "dataEntry.clearYear",
          )}
        </button>
      </div>
    </section>
  );
}

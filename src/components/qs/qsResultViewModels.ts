import { QS_ACTIVE_SCENARIO_PARAMETER_ID_SET } from "@/src/config/qs-active-scenario-parameters";
import { getQsInstitutionalSections } from "@/src/config/qs-institutional-mapping";
import type { QsInstitutionalYearData } from "@/src/contexts/InstitutionDataContext";
import type { AppLanguage } from "@/src/i18n/types";
import type { QsInstitutionalScenarioOverrides } from "@/src/lib/qs/institutional-parameter-view-model";
import type { QsStochasticSimulationResult } from "@/src/types/qs-stochastic";
import { getTranslation } from "@/src/i18n/getTranslation";
import type { QsIndicatorCode } from "@/src/types/qs";

export interface QsChangedInputRow {
  id: string;
  parameterId: string;
  parameter: string;
  field: "Toplam" | "Total" | "Değer" | "Value";
  current: number | null;
  scenario: number;
  difference: number | null;
  impactStatus: string;
  numericScoreEffect: number | null;
}

export type QsIndicatorDisplayStatus =
  | "reference-score"
  | "raw-score-unavailable"
  | "diagnostic-unweighted"
  | "calculated";

const numberOrNull = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const RATIO_CODES = ["FSR", "IFR", "ISR"] as const;
const AGGREGATE_IDS = new Set(["academicStaff", "internationalAcademicStaff", "undergraduateStudents", "undergraduateInternationalStudents", "graduatePostgraduateStudents", "graduatePostgraduateInternationalStudents"]);
const EMPLOYMENT_IDS = new Set(["totalGraduateStudents2023", "totalEmploymentRespondents", "employedGraduates", "unemployedGraduates", "graduatesInFullTimeFurtherStudy", "graduatesUnavailableForWork"]);

const impactStatus = (id: string, language: AppLanguage, hasCurrentBaseline = true) => {
  if (!hasCurrentBaseline) return language === "tr" ? "Kurumsal temel veri eksik" : "Institutional baseline data missing";
  if (EMPLOYMENT_IDS.has(id)) return getTranslation(language, "qsEmploymentUi.analysis");
  if (AGGREGATE_IDS.has(id)) return language === "tr" ? "Ham oran değişiminden yaklaşık skor etkisi hesaplandı" : "Approximate score impact calculated from the raw-ratio change";
  if (id === "totalStudentNationalities") return language === "tr" ? "ISD tanısı — genel skor ağırlığı %0" : "ISD diagnostic — overall score weight is 0%";
  return language === "tr" ? "Sayısal skor etkisi hesaplandı" : "Numeric score effect calculated";
};

export function resolveQsAggregateCurrentTotal(
  value: { fullTime?: number | null; partTime?: number | null } | undefined,
): number | null {
  const parts = [value?.fullTime, value?.partTime].filter(
    (part): part is number => typeof part === "number" && Number.isFinite(part),
  );
  return parts.length === 0 ? null : parts.reduce((total, part) => total + part, 0);
}

export function resolveQsAggregateScenarioTotal(
  override: { fullTime?: number | null; partTime?: number | null },
  baseline: { fullTime?: number | null; partTime?: number | null } | undefined,
): number {
  return (["fullTime", "partTime"] as const).reduce((total, part) => {
    const value = numberOrNull(override[part]) ?? numberOrNull(baseline?.[part]);
    return total + (value ?? 0);
  }, 0);
}

export function resolveQsIndicatorDisplayStatus({ code, simulation, language }: {
  code: QsIndicatorCode;
  simulation: QsStochasticSimulationResult;
  language: AppLanguage;
}) {
  const scenarioSummary = simulation.scenario.indicators[code];
  if (code === ("ISD" as QsIndicatorCode)) return {
    status: "diagnostic-unweighted" as const,
    label: language === "tr" ? "Skora katkısı yok (%0 ağırlık)" : "No score contribution (0% weight)",
    description: language === "tr" ? "ISD ham değeri değişebilir; QS genel skorundaki ağırlığı %0'dır." : "The ISD raw value may change, but its weight in the overall QS score is 0%.",
  };
  if (scenarioSummary.source === "held-constant-no-calibration") return {
    status: "raw-score-unavailable" as const,
    label: language === "tr" ? "Ham oran değişti" : "Raw ratio changed",
    description: language === "tr" ? "Ham oran değişti; eşlenmiş kalibrasyon olmadığı için mevcut gösterge skoru korundu." : "The raw ratio changed; the current indicator score was held because paired calibration is unavailable.",
  };
  if (scenarioSummary.source === "unavailable-no-calibration") return {
    status: "raw-score-unavailable" as const,
    label: language === "tr" ? "Ham oran değişti" : "Raw ratio changed",
    description: language === "tr" ? "Gösterge skoru için yeterli eşlenmiş kalibrasyon verisi bulunmuyor." : "Sufficient paired calibration data is unavailable for the indicator score.",
  };
  if (scenarioSummary.code === ("ISD" as QsIndicatorCode)) return {
    status: "diagnostic-unweighted" as const,
    label: language === "tr" ? "Tanısal gösterge" : "Diagnostic indicator",
    description: language === "tr" ? "Genel QS skorundaki ağırlığı %0’dır." : "Its weight in the overall QS score is 0%.",
  };
  if ((RATIO_CODES as readonly string[]).includes(code)) {
    const currentRaw = simulation.diagnostics.currentRawIndicators[code].rawValue;
    const scenarioRaw = simulation.diagnostics.scenarioRawIndicators[code].rawValue;
    if (currentRaw !== scenarioRaw && scenarioSummary.sampleSource === "estimated") return {
      status: "calculated" as const,
      label: language === "tr" ? "Yaklaşık hesaplandı" : "Approximately calculated",
      description: language === "tr" ? "Gösterge skoru, mevcut skor ile kurumsal ham oran değişiminden yaklaşık olarak hesaplandı." : "The indicator score was estimated from the current score and the institutional raw-ratio change.",
    };
  }
  if (code === "EO" && scenarioSummary.sampleSource !== "estimated") return {
    status: "raw-score-unavailable" as const,
    label: language === "tr" ? "EO skoru üretilemedi" : "EO score unavailable",
    description: language === "tr"
      ? "Ham istihdam oranları hesaplandı; EO skoru için eşlenmiş kalibrasyon verisi bulunmuyor."
      : "Raw employment rates were calculated; paired calibration data for the EO score is unavailable.",
  };
  if (simulation.scenario.indicators[code].sampleSource !== "estimated") return {
    status: "reference-score" as const,
    label: language === "tr" ? "Yayımlanmış referans skoru" : "Published reference score",
    description: language === "tr" ? "Doğrulanmış scenario kalibrasyonu bulunmadığı için QS 2027 referans skoru kullanıldı." : "The QS 2027 reference score was used because verified scenario calibration is unavailable.",
  };
  return {
    status: "calculated" as const,
    label: language === "tr" ? "Hesaplandı" : "Calculated",
    description: language === "tr" ? "Scenario girdilerinden sayısal skor etkisi hesaplandı." : "A numeric score effect was calculated from scenario inputs.",
  };
}

export function hasUncalibratedQsRatioChange(
  simulation: QsStochasticSimulationResult,
) {
  return RATIO_CODES.some((code) => {
    const currentRaw = simulation.diagnostics.currentRawIndicators[code].rawValue;
    const scenarioRaw = simulation.diagnostics.scenarioRawIndicators[code].rawValue;
    return currentRaw !== scenarioRaw
      && simulation.scenario.indicators[code].source ===
        "unavailable-no-calibration";
  });
}

export function createQsChangedInputRows({
  language,
  institutionalBaseline,
  institutionalOverrides,
}: {
  language: AppLanguage;
  institutionalBaseline: QsInstitutionalYearData;
  institutionalOverrides: QsInstitutionalScenarioOverrides;
}): QsChangedInputRow[] {
  const institutionalDefinitions = new Map(
    getQsInstitutionalSections().flatMap((section) =>
      section.rows.map((row) => [row.id, row] as const)),
  );
  return Object.entries(institutionalOverrides).flatMap<QsChangedInputRow>(([id, fields]) => {
    if (!QS_ACTIVE_SCENARIO_PARAMETER_ID_SET.has(id as never)) return [];
    const definition = institutionalDefinitions.get(id as never);
    if (!definition) return [];
    if (Object.keys(fields ?? {}).length === 0) return [];
    if (AGGREGATE_IDS.has(id)) {
      const baseline = institutionalBaseline[id as keyof QsInstitutionalYearData] as {fullTime?:number|null;partTime?:number|null}|undefined;
      const override = fields as {fullTime?:number|null;partTime?:number|null};
      const current = resolveQsAggregateCurrentTotal(baseline);
      const scenario = resolveQsAggregateScenarioTotal(override, baseline);
      return [{ id: `institutional:${id}:total`, parameterId: id, parameter: definition.label[language], field: language === "tr" ? "Toplam" : "Total", current, scenario, difference: current === null ? null : scenario-current, impactStatus: impactStatus(id, language, current !== null), numericScoreEffect: null }];
    }
    return Object.entries(fields ?? {}).flatMap(([field, scenarioValue]) => {
      if (field !== "fullTime" && field !== "partTime" && field !== "value") return [];
      const scenario = numberOrNull(scenarioValue);
      if (scenario === null) return [];
      const current = numberOrNull(
        (institutionalBaseline[id as keyof QsInstitutionalYearData] as
          Record<string, unknown> | undefined)?.[field],
      );
      return [{
        id: `institutional:${id}:${field}`,
        parameterId: id,
        parameter: definition.label[language],
        field: language === "tr" ? "Değer" : "Value",
        current,
        scenario,
        difference: current === null ? null : scenario - current,
        impactStatus: impactStatus(id, language),
        numericScoreEffect: null,
      } satisfies QsChangedInputRow];
    });
  });
}

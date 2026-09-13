import type { QsInstitutionalYearData } from "@/src/contexts/InstitutionDataContext";
import { QS_ACTIVE_SCENARIO_PARAMETER_IDS, type QsActiveScenarioParameterId } from "@/src/config/qs-active-scenario-parameters";
import type { QsInstitutionalFteCountRowId, QsInstitutionalScalarRowId } from "@/src/types/qsInstitutional";
import type { QsInstitutionalScenarioOverrides } from "./institutional-parameter-view-model";
import { getQsEffectiveTotal } from "./qs-effective-value";
import { calculateQsEmploymentAnalysis } from "./qs-employment-analysis";
import { getQsScenarioConstraint } from "@/src/config/qs-scenario-constraints";
import { qsInstitutionalCountRows } from "@/src/types/qsInstitutional";

export type QsActiveScenarioFieldPart = "total" | "value" | "fullTime" | "partTime";
export type QsActiveScenarioValidationIssue = { fieldId: QsActiveScenarioParameterId; part: QsActiveScenarioFieldPart; message: string };
export type QsActiveScenarioValidationResult = { errors: QsActiveScenarioValidationIssue[]; warnings: QsActiveScenarioValidationIssue[]; isValid: boolean };

const fteIds = new Set<QsInstitutionalFteCountRowId>(["academicStaff", "internationalAcademicStaff", "undergraduateStudents", "undergraduateInternationalStudents", "graduatePostgraduateStudents", "graduatePostgraduateInternationalStudents"]);
const total = (values: QsInstitutionalYearData, id: QsInstitutionalFteCountRowId) => getQsEffectiveTotal(undefined, values[id]);
const scalar = (values: QsInstitutionalYearData, id: QsInstitutionalScalarRowId) => values[id]?.value ?? null;
const partFor = (id: QsActiveScenarioParameterId): QsActiveScenarioFieldPart => fteIds.has(id as QsInstitutionalFteCountRowId) ? "total" : "value";
const labels = new Map(qsInstitutionalCountRows.map((row) => [row.id, row.label.tr]));
const relationConstrainedIds = new Set<QsActiveScenarioParameterId>([
  "internationalAcademicStaff", "undergraduateInternationalStudents",
  "graduatePostgraduateInternationalStudents", "totalEmploymentRespondents",
  "employedGraduates", "unemployedGraduates", "graduatesInFullTimeFurtherStudy",
  "graduatesUnavailableForWork", "totalStudentNationalities",
]);
const format = (value: number) => value.toLocaleString("tr-TR", { maximumFractionDigits: 20 });
const namedLimitMessage = (
  child: QsActiveScenarioParameterId,
  childValue: number,
  parent: QsActiveScenarioParameterId,
  parentValue: number,
) => `${labels.get(child) ?? child} (${format(childValue)}), ${labels.get(parent) ?? parent} (${format(parentValue)}) değerini aşamaz.`;

export function validateQsActiveScenarioConsistency(
  values: QsInstitutionalYearData,
  activeOverrides: QsInstitutionalScenarioOverrides = {},
): QsActiveScenarioValidationResult {
  const errors: QsActiveScenarioValidationIssue[] = [];
  const warnings: QsActiveScenarioValidationIssue[] = [];
  for (const id of QS_ACTIVE_SCENARIO_PARAMETER_IDS) {
    const value = fteIds.has(id as QsInstitutionalFteCountRowId)
      ? total(values, id as QsInstitutionalFteCountRowId)
      : scalar(values, id as QsInstitutionalScalarRowId);
    if (value === null) continue;
    if (!Number.isFinite(value)) errors.push({ fieldId: id, part: partFor(id), message: "Geçerli bir sayı girilmelidir." });
    else if (value < 0) errors.push({ fieldId: id, part: partFor(id), message: "Değer negatif olamaz." });
    else if (!Number.isInteger(value)) errors.push({ fieldId: id, part: partFor(id), message: "Tam sayı girilmelidir." });
    else if (!relationConstrainedIds.has(id) && value > getQsScenarioConstraint(id, values).max) errors.push({ fieldId: id, part: partFor(id), message: `${labels.get(id) ?? id} (${format(value)}), izin verilen üst sınır (${format(getQsScenarioConstraint(id, values).max)}) değerini aşamaz.` });
  }

  // Invalid numeric overrides fall back for display, but still remain blocking input errors.
  for (const id of QS_ACTIVE_SCENARIO_PARAMETER_IDS) {
    const row = activeOverrides[id] as Record<string, number | null | undefined> | undefined;
    if (row && Object.values(row).some((value) => value !== null && value !== undefined && !Number.isFinite(value))) {
      errors.push({ fieldId: id, part: partFor(id), message: "Geçerli bir sayı girilmelidir." });
    }
  }

  const addMax = (child: QsActiveScenarioParameterId, childValue: number | null, parent: QsActiveScenarioParameterId, parentValue: number | null) => {
    if (childValue !== null && parentValue !== null && childValue > parentValue) errors.push({ fieldId: child, part: partFor(child), message: namedLimitMessage(child, childValue, parent, parentValue) });
  };
  addMax("internationalAcademicStaff", total(values, "internationalAcademicStaff"), "academicStaff", total(values, "academicStaff"));
  addMax("undergraduateInternationalStudents", total(values, "undergraduateInternationalStudents"), "undergraduateStudents", total(values, "undergraduateStudents"));
  addMax("graduatePostgraduateInternationalStudents", total(values, "graduatePostgraduateInternationalStudents"), "graduatePostgraduateStudents", total(values, "graduatePostgraduateStudents"));

  const graduates = scalar(values, "totalGraduateStudents2023");
  const respondents = scalar(values, "totalEmploymentRespondents");
  const employed = scalar(values, "employedGraduates");
  const unemployed = scalar(values, "unemployedGraduates");
  const furtherStudy = scalar(values, "graduatesInFullTimeFurtherStudy");
  const unavailable = scalar(values, "graduatesUnavailableForWork");
  addMax("totalEmploymentRespondents", respondents, "totalGraduateStudents2023", graduates);
  addMax("employedGraduates", employed, "totalEmploymentRespondents", respondents);
  addMax("unemployedGraduates", unemployed, "totalEmploymentRespondents", respondents);
  addMax("graduatesInFullTimeFurtherStudy", furtherStudy, "totalEmploymentRespondents", respondents);
  addMax("graduatesUnavailableForWork", unavailable, "totalEmploymentRespondents", respondents);
  if (employed !== null && unemployed !== null && respondents !== null && employed + unemployed > respondents) {
    errors.push({ fieldId: "employedGraduates", part: "value", message: `İstihdam Edilen Mezun Sayısı + İşsiz Mezun Sayısı (${format(employed + unemployed)}), ${labels.get("totalEmploymentRespondents")} (${format(respondents)}) değerini aşamaz.` });
  }
  const employmentAnalysis = calculateQsEmploymentAnalysis({ totalGraduates: graduates, surveyParticipants: respondents, employedGraduates: employed, unemployedGraduates: unemployed, furtherStudyGraduates: furtherStudy, unavailableGraduates: unavailable });
  if (employmentAnalysis.unclassifiedRespondents !== null && employmentAnalysis.unclassifiedRespondents < 0) {
    const classifiedTotal = [employed, unemployed, furtherStudy, unavailable]
      .reduce<number>((sum, value) => sum + (value ?? 0), 0);
    errors.push({ fieldId: "employedGraduates", part: "value", message: `Mezun Durum Kategorileri Toplamı (${format(classifiedTotal)}), ${labels.get("totalEmploymentRespondents")} (${format(respondents ?? 0)}) değerini aşamaz.` });
  }
  if (employmentAnalysis.dataSufficiency === "low-response") {
    warnings.push({ fieldId: "totalEmploymentRespondents", part: "value", message: "Düşük yanıt oranı" });
  }

  const internationalUndergraduate = total(values, "undergraduateInternationalStudents");
  const internationalPostgraduate = total(values, "graduatePostgraduateInternationalStudents");
  const internationalStudents = internationalUndergraduate === null && internationalPostgraduate === null
    ? null
    : (internationalUndergraduate ?? 0) + (internationalPostgraduate ?? 0);
  if (internationalStudents !== null) {
    const nationalityCount = scalar(values, "totalStudentNationalities");
    if (nationalityCount !== null && nationalityCount > internationalStudents) {
      errors.push({ fieldId: "totalStudentNationalities", part: "value", message: `${labels.get("totalStudentNationalities")} (${format(nationalityCount)}), Toplam Uluslararası Öğrenci Sayısı (${format(internationalStudents)}) değerini aşamaz.` });
    }
  }
  return { errors, warnings, isValid: errors.length === 0 };
}

export function getQsActiveScenarioFieldError(validation: QsActiveScenarioValidationResult, fieldId: QsActiveScenarioParameterId, part: QsActiveScenarioFieldPart) {
  return validation.errors.find((issue) => issue.fieldId === fieldId && issue.part === part);
}

export function selectQsValidatedScenarioInputs<T>(isValid: boolean, currentInputs: T, scenarioInputs: T) {
  return isValid ? scenarioInputs : currentInputs;
}

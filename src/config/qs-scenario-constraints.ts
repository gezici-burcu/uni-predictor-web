import type { QsInstitutionalYearData } from "@/src/contexts/InstitutionDataContext";
import { getQsEffectiveTotal, getQsEffectiveValue } from "@/src/lib/qs/qs-effective-value";
import type { QsActiveScenarioParameterId } from "./qs-active-scenario-parameters";
import type { QsInstitutionalFteCountRowId, QsInstitutionalScalarRowId } from "@/src/types/qsInstitutional";

export type QsScenarioConstraint = { min: number; max: number; step: number };
const fteIds = new Set<QsInstitutionalFteCountRowId>(["academicStaff", "internationalAcademicStaff", "undergraduateStudents", "undergraduateInternationalStudents", "graduatePostgraduateStudents", "graduatePostgraduateInternationalStudents"]);
const safeIncrease = (baseline: number | null) => baseline === null || !Number.isFinite(baseline) ? 100 : Math.max(100, Math.ceil(baseline * 0.5));
const safeMax = (baseline: number | null) => Math.max(0, (baseline ?? 0) + safeIncrease(baseline));
const stepFor = (value: number | null) => value !== null && value >= 10_000 ? 100 : value !== null && value >= 1_000 ? 10 : 1;
const total = (values: QsInstitutionalYearData, id: QsInstitutionalFteCountRowId) => getQsEffectiveTotal(undefined, values[id]);
const scalar = (values: QsInstitutionalYearData, id: QsInstitutionalScalarRowId) => getQsEffectiveValue(undefined, values[id]?.value);

export function getQsScenarioConstraint(id: QsActiveScenarioParameterId, values: QsInstitutionalYearData): QsScenarioConstraint {
  const current = fteIds.has(id as QsInstitutionalFteCountRowId) ? total(values, id as QsInstitutionalFteCountRowId) : scalar(values, id as QsInstitutionalScalarRowId);
  let max = safeMax(current);
  if (id === "internationalAcademicStaff") max = total(values, "academicStaff") ?? max;
  if (id === "undergraduateInternationalStudents") max = total(values, "undergraduateStudents") ?? max;
  if (id === "graduatePostgraduateInternationalStudents") max = total(values, "graduatePostgraduateStudents") ?? max;
  if (id === "totalEmploymentRespondents") max = scalar(values, "totalGraduateStudents2023") ?? max;
  if (id === "totalStudentNationalities") {
    const international = (total(values, "undergraduateInternationalStudents") ?? 0) + (total(values, "graduatePostgraduateInternationalStudents") ?? 0);
    if (international > 0) max = international;
  }
  const employmentChildren = ["employedGraduates", "unemployedGraduates", "graduatesInFullTimeFurtherStudy", "graduatesUnavailableForWork"] as const;
  if ((employmentChildren as readonly string[]).includes(id)) {
    const respondents = scalar(values, "totalEmploymentRespondents");
    const other = employmentChildren.filter((child) => child !== id).reduce((sum, child) => sum + (scalar(values, child) ?? 0), 0);
    if (respondents !== null) max = Math.max(0, respondents - other);
  }
  return { min: 0, max: Math.max(0, Math.floor(max)), step: stepFor(current) };
}

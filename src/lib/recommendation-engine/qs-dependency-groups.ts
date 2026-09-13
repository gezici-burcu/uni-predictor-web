import type { RecommendationMetricDefinition } from "./types";
import type { AppLanguage } from "@/src/i18n/types";

export type QsRecommendationDependencyGroup = {
  id: string;
  label: string;
  parameterIds: readonly string[];
  helperText: string;
  labelEn: string;
  helperTextEn: string;
  status: "raw-analysis";
};

export const QS_RECOMMENDATION_DEPENDENCY_GROUPS: readonly QsRecommendationDependencyGroup[] = [
  {
    id: "qs-academic-staff-data",
    label: "Akademik Personel Verileri",
    parameterIds: ["academicStaff.total", "internationalAcademicStaff.total"],
    helperText: "Uluslararası akademik personel toplamı, akademik personel toplamını aşamaz.",
    labelEn: "Academic Staff Data",
    helperTextEn: "International academic staff cannot exceed total academic staff.",
    status: "raw-analysis",
  },
  {
    id: "qs-student-data",
    label: "Öğrenci Verileri",
    parameterIds: [
      "undergraduateStudents.total",
      "undergraduateInternationalStudents.total",
      "graduatePostgraduateStudents.total",
      "graduatePostgraduateInternationalStudents.total",
    ],
    helperText: "Uluslararası öğrenci toplamları ilgili lisans veya lisansüstü toplamını aşamaz.",
    labelEn: "Student Data",
    helperTextEn: "International student totals cannot exceed their related undergraduate or postgraduate total.",
    status: "raw-analysis",
  },
  {
    id: "qs-employment-data",
    label: "Mezun İstihdam Verileri",
    parameterIds: [
      "totalGraduateStudents2023",
      "totalEmploymentRespondents",
      "employedGraduates",
      "unemployedGraduates",
      "graduatesInFullTimeFurtherStudy",
      "graduatesUnavailableForWork",
    ],
    helperText: "Alt değerler ilgili üst toplamları aşamaz. Boş bırakılan alanlarda kurumsal mevcut değer kullanılır.",
    labelEn: "Graduate Employment Data",
    helperTextEn: "Sub-values cannot exceed their related totals. Empty fields keep the current institutional value.",
    status: "raw-analysis",
  },
] as const;

export const QS_RECOMMENDATION_DEPENDENCY_PARAMETER_IDS = new Set(
  QS_RECOMMENDATION_DEPENDENCY_GROUPS.flatMap((group) => group.parameterIds),
);

export function getQsRecommendationDependencyGroups(
  definitions: RecommendationMetricDefinition[],
  language: AppLanguage = "tr",
) {
  const byId = new Map(definitions.map((definition) => [definition.metricId, definition]));
  return QS_RECOMMENDATION_DEPENDENCY_GROUPS.map((group) => ({
    ...group,
    label: language === "tr" ? group.label : group.labelEn,
    helperText: language === "tr" ? group.helperText : group.helperTextEn,
    definitions: group.parameterIds.flatMap((id) => byId.get(id) ?? []),
  })).filter((group) => group.definitions.length > 0);
}

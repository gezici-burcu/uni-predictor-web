import type { QsInstitutionalCountRowId } from "@/src/types/qsInstitutional";

export const QS_ACTIVE_SCENARIO_GROUPS = [
  { id: "academicStaff", label: { tr: "Akademik Personel Verileri", en: "Faculty Data" }, rowIds: ["academicStaff", "internationalAcademicStaff"] },
  { id: "undergraduate", label: { tr: "Lisans Öğrenci Verileri", en: "Undergraduate Data" }, rowIds: ["undergraduateStudents", "undergraduateInternationalStudents"] },
  { id: "postgraduate", label: { tr: "Lisansüstü Öğrenci Verileri", en: "Postgraduate Data" }, rowIds: ["graduatePostgraduateStudents", "graduatePostgraduateInternationalStudents"] },
  { id: "employment", label: { tr: "İstihdam Sonuçları Ham Verileri", en: "Employment Outcomes Raw Data" }, rowIds: ["totalGraduateStudents2023", "totalEmploymentRespondents", "employedGraduates", "unemployedGraduates", "graduatesInFullTimeFurtherStudy", "graduatesUnavailableForWork"] },
  { id: "nationality", label: { tr: "Uluslararası Öğrenci Çeşitliliği", en: "International Student Diversity" }, rowIds: ["totalStudentNationalities"] },
] as const satisfies readonly { id: string; label: { tr: string; en: string }; rowIds: readonly QsInstitutionalCountRowId[] }[];

export const QS_ACTIVE_SCENARIO_PARAMETER_IDS = QS_ACTIVE_SCENARIO_GROUPS.flatMap((group) => [...group.rowIds]);
export type QsActiveScenarioParameterId = typeof QS_ACTIVE_SCENARIO_PARAMETER_IDS[number];
export const QS_ACTIVE_SCENARIO_PARAMETER_ID_SET = new Set<QsInstitutionalCountRowId>(QS_ACTIVE_SCENARIO_PARAMETER_IDS);

export const QS_ACTIVE_SCENARIO_SECTIONS = QS_ACTIVE_SCENARIO_GROUPS;
export const QS_ACTIVE_SCENARIO_PARAMETER_HELP: Partial<Record<QsActiveScenarioParameterId, { tr: string; en: string }>> = {};

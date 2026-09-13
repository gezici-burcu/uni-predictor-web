import type { QsIndicatorCode } from "@/src/types/qs";
import type {
  QsDerivedValueKind,
  QsInstitutionalInputRole,
} from "@/src/types/qs-raw";
import {
  qsInstitutionalCountRows,
  type QsInstitutionalCountRowId,
} from "@/src/types/qsInstitutional";

export type QsInstitutionalSectionId =
  | "academicStaff"
  | "undergraduateStudents"
  | "graduatePostgraduateStudents"
  | "overallStudents"
  | "totalStudentNationalities"
  | "totalGraduateStudents2023";

export const qsInstitutionalSectionLabels: Record<
  QsInstitutionalSectionId,
  { tr: string; en: string }
> = {
  academicStaff: { tr: "Akademik Personel", en: "Faculty Staff" },
  undergraduateStudents: { tr: "Lisans Öğrencileri", en: "Undergraduate Students" },
  graduatePostgraduateStudents: { tr: "Lisansüstü Öğrenciler", en: "Graduate/Postgraduate Students" },
  overallStudents: { tr: "Genel Öğrenci Verileri", en: "Students - Overall" },
  totalStudentNationalities: { tr: "Uluslararası Öğrenci Çeşitliliği", en: "International Student Diversity" },
  totalGraduateStudents2023: { tr: "İstihdam İstatistikleri", en: "Employment Statistics" },
};

type MappingDetails = {
  indicatorCodes: readonly QsIndicatorCode[];
  derivedValue: QsDerivedValueKind;
  calculationInputKey: string;
  role: QsInstitutionalInputRole;
};

const mappingDetailsByField: Partial<Record<QsInstitutionalCountRowId, MappingDetails>> = {
  academicStaff: { indicatorCodes: ["FSR", "IFR", "CPF"], derivedValue: "actualFte", calculationInputKey: "institutional.academicStaff", role: "score-affecting" },
  internationalAcademicStaff: { indicatorCodes: ["IFR"], derivedValue: "actualFte", calculationInputKey: "institutional.internationalAcademicStaff", role: "score-affecting" },
  undergraduateStudents: { indicatorCodes: ["FSR", "ISR", "ISD"], derivedValue: "actualFte", calculationInputKey: "institutional.students", role: "score-affecting" },
  undergraduateInternationalStudents: { indicatorCodes: ["ISR", "ISD"], derivedValue: "actualFte", calculationInputKey: "institutional.internationalStudents", role: "score-affecting" },
  graduatePostgraduateStudents: { indicatorCodes: ["FSR", "ISR", "ISD"], derivedValue: "actualFte", calculationInputKey: "institutional.students", role: "score-affecting" },
  graduatePostgraduateInternationalStudents: { indicatorCodes: ["ISR", "ISD"], derivedValue: "actualFte", calculationInputKey: "institutional.internationalStudents", role: "score-affecting" },
  totalStudentNationalities: { indicatorCodes: ["ISD"], derivedValue: "scalar", calculationInputKey: "institutional.studentNationalityCount", role: "indicator-only" },
  totalGraduateStudents2023: { indicatorCodes: ["EO"], derivedValue: "scalar", calculationInputKey: "institutional.employment.totalGraduates", role: "indicator-only" },
  totalEmploymentRespondents: { indicatorCodes: ["EO"], derivedValue: "scalar", calculationInputKey: "institutional.employment.respondents", role: "indicator-only" },
  employedGraduates: { indicatorCodes: ["EO"], derivedValue: "scalar", calculationInputKey: "institutional.employment.employed", role: "indicator-only" },
  unemployedGraduates: { indicatorCodes: ["EO"], derivedValue: "scalar", calculationInputKey: "institutional.employment.unemployed", role: "indicator-only" },
  graduatesInFullTimeFurtherStudy: { indicatorCodes: ["EO"], derivedValue: "scalar", calculationInputKey: "institutional.employment.furtherStudy", role: "indicator-only" },
  graduatesUnavailableForWork: { indicatorCodes: ["EO"], derivedValue: "scalar", calculationInputKey: "institutional.employment.unavailableForWork", role: "indicator-only" },
};

export type QsInstitutionalFieldMapping = {
  fieldId: QsInstitutionalCountRowId;
  indicatorCodes: readonly QsIndicatorCode[];
  derivedValue: QsDerivedValueKind;
  calculationInputKey: string | null;
  role: QsInstitutionalInputRole;
};

/** Kurumsal alan -> QS gösterge ilişkisinin tek metadata kaynağı. */
export const qsInstitutionalFieldMappings: readonly QsInstitutionalFieldMapping[] =
  qsInstitutionalCountRows.map((row) => ({
    fieldId: row.id,
    indicatorCodes: mappingDetailsByField[row.id]?.indicatorCodes ?? [],
    derivedValue: mappingDetailsByField[row.id]?.derivedValue ??
      (row.inputKind === "fte-count" ? "actualFte" : "scalar"),
    calculationInputKey: mappingDetailsByField[row.id]?.calculationInputKey ?? null,
    role: mappingDetailsByField[row.id]?.role ?? "informational",
  }));

export const qsInstitutionalIndicatorCodesByField = new Map(
  qsInstitutionalFieldMappings.map((mapping) => [
    mapping.fieldId,
    mapping.indicatorCodes,
  ]),
);

export const qsInstitutionalFieldMappingById = new Map(
  qsInstitutionalFieldMappings.map((mapping) => [mapping.fieldId, mapping]),
);

export function getQsInstitutionalSections() {
  let currentSection: QsInstitutionalSectionId | null = null;
  const sections: Array<{
    id: QsInstitutionalSectionId;
    label: { tr: string; en: string };
    rows: typeof qsInstitutionalCountRows[number][];
  }> = [];

  for (const row of qsInstitutionalCountRows) {
    if (row.id in qsInstitutionalSectionLabels) {
      currentSection = row.id as QsInstitutionalSectionId;
      sections.push({
        id: currentSection,
        label: qsInstitutionalSectionLabels[currentSection],
        rows: [],
      });
    }
    sections.at(-1)?.rows.push(row);
  }

  return sections;
}

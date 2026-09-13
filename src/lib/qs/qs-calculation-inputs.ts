import { QS_PART_TIME_FTE_COEFFICIENT } from "@/src/config/qs-institutional";
import { createEmptyQsAdditionalInputs } from "@/src/config/qs-additional-inputs";
import type { QsInstitutionalYearData } from "@/src/contexts/InstitutionDataContext";
import {
  calculateQsCount,
  createEmptyQsCountInput,
  type QsCalculatedCount,
  type QsCountInput,
  type QsInstitutionalFteCountRowId,
} from "@/src/types/qsInstitutional";
import type {
  QsAdditionalCalculationInputs,
  QsCalculationInputs,
  QsDerivedCountInput,
} from "@/src/types/qs-raw";

const calculated = (input: QsCountInput): QsDerivedCountInput => {
  const result = calculateQsCount(input, QS_PART_TIME_FTE_COEFFICIENT);
  return {
    headcount: result.headcount,
    actualFte: result.rawFte,
    roundedFte: result.roundedFte,
  };
};

const countInput = (
  values: QsInstitutionalYearData,
  id: QsInstitutionalFteCountRowId,
): QsCountInput => {
  const stored = values[id] as QsCountInput | undefined;
  return stored ?? createEmptyQsCountInput();
};

const sumCounts = (items: readonly QsCalculatedCount[]): QsDerivedCountInput => {
  const sum = (key: "headcount" | "rawFte" | "roundedFte") =>
    items.every((item) => item[key] !== null)
      ? items.reduce((total, item) => total + item[key]!, 0)
      : null;
  return {
    headcount: sum("headcount"),
    actualFte: sum("rawFte"),
    roundedFte: sum("roundedFte"),
  };
};

const scalar = (values: QsInstitutionalYearData, id: keyof QsInstitutionalYearData) => {
  const value = (values[id] as { value?: number | null } | undefined)?.value;
  return value === undefined ? null : value;
};

export function buildQsInstitutionalCalculationInputs(
  values: QsInstitutionalYearData,
) {
  const staff = countInput(values, "academicStaff");
  const students = ["undergraduateStudents", "graduatePostgraduateStudents"] as const;
  const internationalStudents = [
    "undergraduateInternationalStudents",
    "graduatePostgraduateInternationalStudents",
  ] as const;
  return {
    academicStaff: calculated(staff),
    internationalAcademicStaff: calculated(countInput(values, "internationalAcademicStaff")),
    undergraduateStudents: calculated(countInput(values, "undergraduateStudents")),
    internationalUndergraduateStudents: calculated(countInput(values, "undergraduateInternationalStudents")),
    graduatePostgraduateStudents: calculated(countInput(values, "graduatePostgraduateStudents")),
    internationalGraduatePostgraduateStudents: calculated(countInput(values, "graduatePostgraduateInternationalStudents")),
    students: sumCounts(students.map((id) =>
      calculateQsCount(countInput(values, id), QS_PART_TIME_FTE_COEFFICIENT))),
    internationalStudents: sumCounts(internationalStudents.map((id) =>
      calculateQsCount(countInput(values, id), QS_PART_TIME_FTE_COEFFICIENT))),
    studentNationalityCount: scalar(values, "totalStudentNationalities"),
    employment: {
      totalGraduates: scalar(values, "totalGraduateStudents2023"),
      respondents: scalar(values, "totalEmploymentRespondents"),
      employed: scalar(values, "employedGraduates"),
      unemployed: scalar(values, "unemployedGraduates"),
      furtherStudy: scalar(values, "graduatesInFullTimeFurtherStudy"),
      unavailableForWork: scalar(values, "graduatesUnavailableForWork"),
    },
  };
}

export function mergeQsAdditionalInputs(
  baseline: QsAdditionalCalculationInputs,
  overrides: Partial<QsAdditionalCalculationInputs>,
): QsAdditionalCalculationInputs {
  return { ...baseline, ...overrides };
}

export function buildQsCalculationInputs(
  institutional: QsInstitutionalYearData,
  additional: Partial<QsAdditionalCalculationInputs> = {},
): QsCalculationInputs {
  return {
    institutional: buildQsInstitutionalCalculationInputs(institutional),
    additional: mergeQsAdditionalInputs(createEmptyQsAdditionalInputs(), additional),
  };
}

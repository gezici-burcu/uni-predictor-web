import type { QsMetricValues, QsRawIndicators } from "@/src/types/qs";

export const safeDivide = (numerator: number | null, denominator: number | null): number | null => numerator === null || denominator === null || !Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0 ? null : numerator / denominator;
export const calculateIrnFacultyRaw = (collaboratingLocations: number | null, publishingLocations: number | null): number | null => collaboratingLocations === null || publishingLocations === null || !Number.isFinite(collaboratingLocations) || !Number.isFinite(publishingLocations) ? null : publishingLocations <= 1 ? 0 : collaboratingLocations / Math.log(publishingLocations);
export const calculateEmploymentOutcomeRaw = (alumniImpact: number | null, graduateEmploymentIndex: number | null): number | null => alumniImpact === null || graduateEmploymentIndex === null || !Number.isFinite(alumniImpact) || !Number.isFinite(graduateEmploymentIndex) || graduateEmploymentIndex <= 0 ? null : alumniImpact * Math.log(graduateEmploymentIndex);
export const calculateNationalityPercentage = (nationalityCount: number | null): number | null => nationalityCount === null || !Number.isFinite(nationalityCount) || nationalityCount <= 0 ? null : Math.min(nationalityCount, 80) / 80;

export function calculateQsRawIndicators(values: QsMetricValues): QsRawIndicators {
  const students = values["qs.common.studentsFte"] ?? null;
  const internationalStudents = values["qs.common.internationalStudentsFte"] ?? null;
  const faculty = values["qs.common.academicStaffFte"] ?? null;
  const internationalFaculty = values["qs.globalEngagement.internationalFacultyFte"] ?? null;
  const nationalityCount = values["qs.globalEngagement.internationalStudentNationalityCount"] ?? null;
  const validInternationalStudents = internationalStudents !== null && students !== null && internationalStudents > students ? null : internationalStudents;
  const validInternationalFaculty = internationalFaculty !== null && faculty !== null && internationalFaculty > faculty ? null : internationalFaculty;
  const ISR = safeDivide(validInternationalStudents, students);
  const nationalityPercentage = calculateNationalityPercentage(nationalityCount);
  return { IFR: safeDivide(validInternationalFaculty, faculty), ISR, FSR: safeDivide(faculty, students), ISD: ISR === null || nationalityPercentage === null ? null : ISR * nationalityPercentage };
}

import { calculateFte, calculateHeadcount } from "@/src/lib/calculations/qs/rawMath";

export type QsDataYear = "2022" | "2023" | "2024" | "2025";

export interface QsCountInput { fullTime: number | null; partTime: number | null }
export interface QsNumberInput { value: number | null }
export interface QsCalculatedCount { headcount: number | null; rawFte: number | null; roundedFte: number | null; hasFraction: boolean }

export type QsYearlyCountInput = Record<QsDataYear, QsCountInput>;
export type QsYearlyNumberInput = Record<QsDataYear, QsNumberInput>;
export type QsYearlyCalculatedCount = Record<QsDataYear, QsCalculatedCount>;

const emptyCalculation = (): QsCalculatedCount => ({ headcount: null, rawFte: null, roundedFte: null, hasFraction: false });

export function calculateQsCount(input: QsCountInput, partTimeFteCoefficient: number | null): QsCalculatedCount {
  const { fullTime, partTime } = input;
  const hasInvalidInput = fullTime === null || partTime === null || !Number.isFinite(fullTime) || !Number.isFinite(partTime) || fullTime < 0 || partTime < 0;
  if (hasInvalidInput) return emptyCalculation();
  const headcount = calculateHeadcount(fullTime, partTime)!;
  const hasValidCoefficient = partTimeFteCoefficient !== null && Number.isFinite(partTimeFteCoefficient) && partTimeFteCoefficient >= 0;
  if (!hasValidCoefficient) return { headcount, rawFte: null, roundedFte: null, hasFraction: false };
  const rawFte = partTimeFteCoefficient === 1 / 3 ? calculateFte(fullTime, partTime)! : fullTime + partTime * partTimeFteCoefficient;
  return { headcount, rawFte, roundedFte: Math.round(rawFte), hasFraction: !Number.isInteger(rawFte) };
}

export function calculateQsYearlyCounts(inputs: QsYearlyCountInput, partTimeFteCoefficient: number | null): QsYearlyCalculatedCount {
  return { "2022": calculateQsCount(inputs["2022"], partTimeFteCoefficient), "2023": calculateQsCount(inputs["2023"], partTimeFteCoefficient), "2024": calculateQsCount(inputs["2024"], partTimeFteCoefficient), "2025": calculateQsCount(inputs["2025"], partTimeFteCoefficient) };
}

export function createEmptyQsCountInput(): QsCountInput { return { fullTime: null, partTime: null }; }
export function createEmptyQsNumberInput(): QsNumberInput { return { value: null }; }
export function createEmptyQsYearlyCountInput(): QsYearlyCountInput { return { "2022": createEmptyQsCountInput(), "2023": createEmptyQsCountInput(), "2024": createEmptyQsCountInput(), "2025": createEmptyQsCountInput() }; }
export function createEmptyQsYearlyNumberInput(): QsYearlyNumberInput { return { "2022": createEmptyQsNumberInput(), "2023": createEmptyQsNumberInput(), "2024": createEmptyQsNumberInput(), "2025": createEmptyQsNumberInput() }; }

export type QsInstitutionalInputKind = "fte-count" | "number";
export type QsInstitutionalFteCountRowId =
  | "academicStaff" | "maleAcademicStaff" | "femaleAcademicStaff" | "otherAcademicStaff" | "internationalAcademicStaff"
  | "undergraduateStudents" | "undergraduateInternationalStudents" | "undergraduateExchangeStudentsInbound" | "undergraduateExchangeStudentsOutbound"
  | "graduatePostgraduateStudents" | "graduatePostgraduateInternationalStudents" | "graduatePostgraduateExchangeStudentsInbound" | "graduatePostgraduateExchangeStudentsOutbound"
  | "overallStudents" | "overallInternationalStudents" | "distanceStudents" | "distanceInternationalStudents" | "exchangeStudentsInbound" | "exchangeStudentsOutbound";
export type QsInstitutionalScalarRowId =
  | "totalStudentNationalities" | "totalGraduateStudents2023" | "totalEmploymentRespondents" | "employedGraduates" | "unemployedGraduates" | "graduatesInFullTimeFurtherStudy" | "graduatesUnavailableForWork";
export type QsInstitutionalCountRowId = QsInstitutionalFteCountRowId | QsInstitutionalScalarRowId;
export type QsSingleValueRowId = QsInstitutionalScalarRowId;
export type QsInstitutionalInputByRowId = { [Id in QsInstitutionalCountRowId]: Id extends QsInstitutionalFteCountRowId ? QsCountInput : QsNumberInput };
export type QsInstitutionalInputById = QsInstitutionalInputByRowId;

type QsInstitutionalRowBase = { label: { tr: string; en: string }; required: boolean; affectsCalculation: boolean };
export type QsInstitutionalCountRow = QsInstitutionalRowBase & ({ id: QsInstitutionalFteCountRowId; inputKind: "fte-count" } | { id: QsInstitutionalScalarRowId; inputKind: "number" });
export type QsInstitutionalYearlyInputs = { [Id in QsInstitutionalCountRowId]: Id extends QsSingleValueRowId ? QsYearlyNumberInput : QsYearlyCountInput };

const fteRow = (id: QsInstitutionalFteCountRowId, tr: string, en: string, required = false, affectsCalculation = false): QsInstitutionalCountRow => ({ id, label: { tr, en }, inputKind: "fte-count", required, affectsCalculation });
const scalarRow = (id: QsInstitutionalScalarRowId, tr: string, en: string): QsInstitutionalCountRow => ({ id, label: { tr, en }, inputKind: "number", required: false, affectsCalculation: false });

export const academicStaffRow = fteRow("academicStaff", "Akademik Personel Sayısı", "Faculty Staff", true, true);

export const qsInstitutionalCountRows = [
  academicStaffRow,
  fteRow("maleAcademicStaff", "Erkek Akademik Personel Sayısı", "Faculty Staff (Male)"),
  fteRow("femaleAcademicStaff", "Kadın Akademik Personel Sayısı", "Faculty Staff (Female)"),
  fteRow("otherAcademicStaff", "Diğer Akademik Personel Sayısı", "Faculty Staff (Other)"),
  fteRow("internationalAcademicStaff", "Uluslararası Akademik Personel Sayısı", "International Faculty Staff"),
  fteRow("undergraduateStudents", "Lisans Öğrencileri", "Undergraduate Students", true, true),
  fteRow("undergraduateInternationalStudents", "Uluslararası Lisans Öğrencileri", "Undergraduate International Students", false, true),
  fteRow("undergraduateExchangeStudentsInbound", "Gelen Lisans Değişim Öğrencileri", "Undergraduate Exchange Students Inbound"),
  fteRow("undergraduateExchangeStudentsOutbound", "Giden Lisans Değişim Öğrencileri", "Undergraduate Exchange Students - Outbound"),
  fteRow("graduatePostgraduateStudents", "Lisansüstü Öğrenciler", "Graduate/Postgraduate Students", true, true),
  fteRow("graduatePostgraduateInternationalStudents", "Uluslararası Lisansüstü Öğrenciler", "Graduate/Postgraduate International Students", false, true),
  fteRow("graduatePostgraduateExchangeStudentsInbound", "Gelen Lisansüstü Değişim Öğrencileri", "Graduate/Postgraduate Exchange Students - Inbound"),
  fteRow("graduatePostgraduateExchangeStudentsOutbound", "Giden Lisansüstü Değişim Öğrencileri", "Graduate/Postgraduate Exchange Students - Outbound"),
  fteRow("overallStudents", "Toplam Öğrenciler", "Students - Overall"),
  fteRow("overallInternationalStudents", "Toplam Uluslararası Öğrenciler", "International Students - Overall"),
  fteRow("distanceStudents", "Uzaktan Eğitim Öğrencileri", "Students - Distance"),
  fteRow("distanceInternationalStudents", "Uluslararası Uzaktan Eğitim Öğrencileri", "International Students - Distance"),
  fteRow("exchangeStudentsInbound", "Gelen Değişim Öğrencileri", "Exchange Students - Inbound"),
  fteRow("exchangeStudentsOutbound", "Giden Değişim Öğrencileri", "Exchange Students - Outbound"),
  scalarRow("totalStudentNationalities", "Uluslararası Öğrencilerin Temsil Ettiği Ülke/Uyruk Sayısı", "Countries/Nationalities Represented by International Students"),
  scalarRow("totalGraduateStudents2023", "Toplam Mezun Öğrenci Sayısı (2023)", "Total Grad Students 2023"),
  scalarRow("totalEmploymentRespondents", "Toplam Katılımcı Sayısı", "Total Respondents"),
  scalarRow("employedGraduates", "İstihdam Edilen Mezun Sayısı", "Employed Grads"),
  scalarRow("unemployedGraduates", "İşsiz Mezun Sayısı", "Unemployed"),
  scalarRow("graduatesInFullTimeFurtherStudy", "İleri Eğitime Devam Eden Mezun Sayısı", "Graduates Continuing Further Study"),
  scalarRow("graduatesUnavailableForWork", "Çalışmaya Uygun Olmayan Mezun Sayısı", "Graduates Unavailable for Work"),
] as const satisfies readonly QsInstitutionalCountRow[];

export function createEmptyQsInstitutionalYearlyInputs(): QsInstitutionalYearlyInputs {
  return Object.fromEntries(qsInstitutionalCountRows.map((row) => [row.id, row.inputKind === "fte-count" ? createEmptyQsYearlyCountInput() : createEmptyQsYearlyNumberInput()])) as QsInstitutionalYearlyInputs;
}

import type { QsIndicatorCode } from "@/src/types/qs";
import {
  QS_FACULTY_AREA_CODES,
  type QsAdditionalCalculationInputs,
  type QsAdditionalInputKey,
  type QsFacultyAreaCode,
} from "@/src/types/qs-raw";

export const QS_FACULTY_AREAS: ReadonlyArray<{
  code: QsFacultyAreaCode;
  label: { tr: string; en: string };
}> = [
  { code: "artsHumanities", label: { tr: "Sanat ve Beşeri Bilimler", en: "Arts & Humanities" } },
  { code: "engineeringTechnology", label: { tr: "Mühendislik ve Teknoloji", en: "Engineering & Technology" } },
  { code: "lifeSciencesMedicine", label: { tr: "Yaşam Bilimleri ve Tıp", en: "Life Sciences & Medicine" } },
  { code: "naturalSciences", label: { tr: "Doğa Bilimleri", en: "Natural Sciences" } },
  { code: "socialSciencesManagement", label: { tr: "Sosyal Bilimler ve Yönetim", en: "Social Sciences & Management" } },
];

export type QsAdditionalInputDefinition = {
  key: QsAdditionalInputKey;
  indicatorCode: QsIndicatorCode;
  label: { tr: string; en: string };
  inputType: "integer" | "decimal" | "year" | "external-indicator";
  unit: string;
  min: number;
  max?: number;
  required: boolean;
  scoreUsage: "raw-calculation" | "external-raw-indicator" | "provenance";
  dataSourceType: "qs-survey" | "scopus" | "qs-database" | "institutional-survey" | "qs-sustainability";
  sourceOrder: number;
  affectedRawCalculation: string;
  facultyArea?: QsFacultyAreaCode;
};

const areaLabel = (area: QsFacultyAreaCode) =>
  QS_FACULTY_AREAS.find((item) => item.code === area)!.label;

const academicReputation = QS_FACULTY_AREA_CODES.flatMap((area, index): QsAdditionalInputDefinition[] => [
  {
    key: `academicReputation.${area}.domesticWeightedNominations`,
    indicatorCode: "AR",
    label: { tr: `${areaLabel(area).tr} · Ağırlıklı yurt içi adaylık`, en: `${areaLabel(area).en} · Weighted domestic nominations` },
    inputType: "decimal", unit: "adaylık", min: 0, required: true,
    scoreUsage: "raw-calculation", dataSourceType: "qs-survey", sourceOrder: index * 2,
    affectedRawCalculation: "AR domestic weighted nomination component", facultyArea: area,
  },
  {
    key: `academicReputation.${area}.internationalWeightedNominations`,
    indicatorCode: "AR",
    label: { tr: `${areaLabel(area).tr} · Ağırlıklı uluslararası adaylık`, en: `${areaLabel(area).en} · Weighted international nominations` },
    inputType: "decimal", unit: "adaylık", min: 0, required: true,
    scoreUsage: "raw-calculation", dataSourceType: "qs-survey", sourceOrder: index * 2 + 1,
    affectedRawCalculation: "AR international weighted nomination component", facultyArea: area,
  },
]);

const citations = QS_FACULTY_AREA_CODES.map((area, index): QsAdditionalInputDefinition => ({
  key: `citationsPerFaculty.${area}.fieldNormalizedCitations`,
  indicatorCode: "CPF",
  label: { tr: `${areaLabel(area).tr} · Alan-normalize atıf`, en: `${areaLabel(area).en} · Faculty-area-normalized citations` },
  inputType: "decimal", unit: "normalize atıf", min: 0, required: true,
  scoreUsage: "raw-calculation", dataSourceType: "scopus", sourceOrder: index,
  affectedRawCalculation: "CPF field-normalized citation numerator", facultyArea: area,
}));

const fixed: QsAdditionalInputDefinition[] = [
  { key: "employerReputation.domesticWeightedNominations", indicatorCode: "ER", label: { tr: "Ağırlıklı yurt içi işveren adaylığı", en: "Weighted domestic employer nominations" }, inputType: "decimal", unit: "adaylık", min: 0, required: true, scoreUsage: "raw-calculation", dataSourceType: "qs-survey", sourceOrder: 0, affectedRawCalculation: "ER domestic nomination component" },
  { key: "employerReputation.internationalWeightedNominations", indicatorCode: "ER", label: { tr: "Ağırlıklı uluslararası işveren adaylığı", en: "Weighted international employer nominations" }, inputType: "decimal", unit: "adaylık", min: 0, required: true, scoreUsage: "raw-calculation", dataSourceType: "qs-survey", sourceOrder: 1, affectedRawCalculation: "ER international nomination component" },
  { key: "employmentOutcomes.alumniImpactIndex", indicatorCode: "EO", label: { tr: "Mezun Etkisi İndeksi", en: "Alumni Impact Index" }, inputType: "decimal", unit: "indeks", min: 0, required: true, scoreUsage: "raw-calculation", dataSourceType: "qs-database", sourceOrder: 0, affectedRawCalculation: "EO Alumni Impact multiplier" },
  { key: "employmentOutcomes.graduateEmploymentIndex", indicatorCode: "EO", label: { tr: "Mezun İstihdam İndeksi", en: "Graduate Employment Index" }, inputType: "decimal", unit: "indeks", min: 0, required: true, scoreUsage: "raw-calculation", dataSourceType: "institutional-survey", sourceOrder: 1, affectedRawCalculation: "EO logarithmic employment component" },
  ...QS_FACULTY_AREA_CODES.flatMap((area, index): QsAdditionalInputDefinition[] => [
    { key: `internationalResearchNetwork.${area}.distinctCountries`, indicatorCode: "IRN", label: { tr: `${areaLabel(area).tr} · Farklı ülke/bölge`, en: `${areaLabel(area).en} · Distinct countries/territories` }, inputType: "integer", unit: "ülke/bölge", min: 0, required: true, scoreUsage: "raw-calculation", dataSourceType: "scopus", sourceOrder: index * 2, affectedRawCalculation: "IRN faculty-area numerator", facultyArea: area },
    { key: `internationalResearchNetwork.${area}.distinctInternationalPartners`, indicatorCode: "IRN", label: { tr: `${areaLabel(area).tr} · Farklı uluslararası ortak`, en: `${areaLabel(area).en} · Distinct international partners` }, inputType: "integer", unit: "ortak", min: 0, required: true, scoreUsage: "raw-calculation", dataSourceType: "scopus", sourceOrder: index * 2 + 1, affectedRawCalculation: "IRN faculty-area logarithmic denominator", facultyArea: area },
  ]),
  { key: "sustainability.qsIndicatorValue", indicatorCode: "SUS", label: { tr: "QS Sürdürülebilirlik gösterge değeri", en: "QS Sustainability indicator value" }, inputType: "external-indicator", unit: "QS gösterge değeri", min: 0, max: 100, required: true, scoreUsage: "external-raw-indicator", dataSourceType: "qs-sustainability", sourceOrder: 0, affectedRawCalculation: "SUS external indicator value" },
  { key: "sustainability.sourceYear", indicatorCode: "SUS", label: { tr: "QS Sürdürülebilirlik kaynak yılı", en: "QS Sustainability source year" }, inputType: "year", unit: "yıl", min: 2000, max: 2100, required: true, scoreUsage: "provenance", dataSourceType: "qs-sustainability", sourceOrder: 1, affectedRawCalculation: "SUS source provenance" },
];

export const QS_ADDITIONAL_INPUT_DEFINITIONS: readonly QsAdditionalInputDefinition[] = [
  ...academicReputation,
  ...citations,
  ...fixed,
];

export const QS_ADDITIONAL_INDICATOR_ORDER: readonly QsIndicatorCode[] =
  ["AR", "CPF", "ER", "EO", "IRN", "SUS"];

export function createEmptyQsAdditionalInputs(): QsAdditionalCalculationInputs {
  return Object.fromEntries(
    QS_ADDITIONAL_INPUT_DEFINITIONS.map((definition) => [definition.key, null]),
  ) as QsAdditionalCalculationInputs;
}


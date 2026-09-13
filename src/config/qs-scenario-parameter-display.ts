import type { QsInstitutionalFteCountRowId, QsInstitutionalScalarRowId } from "@/src/types/qsInstitutional";
import type { QsAdditionalInputKey, QsFacultyAreaCode } from "@/src/types/qs-raw";

type LocalizedLabel = { tr: string; en: string };

export type QsScenarioDisplayParameter = {
  id: QsInstitutionalFteCountRowId | QsInstitutionalScalarRowId | QsAdditionalInputKey;
  label: LocalizedLabel;
  inputKind: "full-time-part-time" | "scalar";
  requirement?: LocalizedLabel;
  facultyArea?: QsFacultyAreaCode;
};

export type QsScenarioDisplaySection = {
  id: string;
  label: LocalizedLabel;
  initiallyOpen: boolean;
  parameters: readonly QsScenarioDisplayParameter[];
};

const facultyAreas: ReadonlyArray<{
  code: QsFacultyAreaCode;
  label: LocalizedLabel;
}> = [
  { code: "artsHumanities", label: { tr: "Sanat ve Beşerî Bilimler", en: "Arts & Humanities" } },
  { code: "engineeringTechnology", label: { tr: "Mühendislik ve Teknoloji", en: "Engineering & Technology" } },
  { code: "lifeSciencesMedicine", label: { tr: "Yaşam Bilimleri ve Tıp", en: "Life Sciences & Medicine" } },
  { code: "naturalSciences", label: { tr: "Doğa Bilimleri", en: "Natural Sciences" } },
  { code: "socialSciencesManagement", label: { tr: "Sosyal Bilimler ve Yönetim", en: "Social Sciences & Management" } },
];

const basicInstitutionalParameters: readonly QsScenarioDisplayParameter[] = [
  { id: "academicStaff", label: { tr: "Akademik Personel Sayısı", en: "Academic Staff" }, inputKind: "full-time-part-time", requirement: { tr: "Zorunlu", en: "Required" } },
  { id: "undergraduateStudents", label: { tr: "Lisans Öğrencileri", en: "Undergraduate Students" }, inputKind: "full-time-part-time", requirement: { tr: "Zorunlu", en: "Required" } },
  { id: "graduatePostgraduateStudents", label: { tr: "Lisansüstü Öğrenciler", en: "Postgraduate Students" }, inputKind: "full-time-part-time", requirement: { tr: "Zorunlu", en: "Required" } },
  { id: "internationalAcademicStaff", label: { tr: "Uluslararası Akademik Personel Sayısı", en: "International Academic Staff" }, inputKind: "full-time-part-time", requirement: { tr: "İsteğe bağlı", en: "Optional" } },
  { id: "undergraduateInternationalStudents", label: { tr: "Uluslararası Lisans Öğrencileri", en: "International Undergraduate Students" }, inputKind: "full-time-part-time", requirement: { tr: "İsteğe bağlı", en: "Optional" } },
  { id: "graduatePostgraduateInternationalStudents", label: { tr: "Uluslararası Lisansüstü Öğrenciler", en: "International Postgraduate Students" }, inputKind: "full-time-part-time", requirement: { tr: "İsteğe bağlı", en: "Optional" } },
];

const academicReputationParameters = facultyAreas.flatMap(({ code }): QsScenarioDisplayParameter[] => [
  {
    id: `academicReputation.${code}.domesticWeightedNominations`,
    label: { tr: "Yurt İçi Akademik Adaylık Sayısı", en: "Domestic Academic Nominations" },
    inputKind: "scalar",
    facultyArea: code,
  },
  {
    id: `academicReputation.${code}.internationalWeightedNominations`,
    label: { tr: "Uluslararası Akademik Adaylık Sayısı", en: "International Academic Nominations" },
    inputKind: "scalar",
    facultyArea: code,
  },
]);

const citationParameters = facultyAreas.map(({ code, label }): QsScenarioDisplayParameter => ({
  id: `citationsPerFaculty.${code}.fieldNormalizedCitations`,
  label: {
    tr: `${label.tr} – Alan-Normalize Atıf Sayısı`,
    en: `${label.en} – Field-Normalized Citations`,
  },
  inputKind: "scalar",
}));

const employerParameters: readonly QsScenarioDisplayParameter[] = [
  { id: "employerReputation.domesticWeightedNominations", label: { tr: "Yurt İçi İşveren Adaylık Sayısı", en: "Domestic Employer Nominations" }, inputKind: "scalar" },
  { id: "employerReputation.internationalWeightedNominations", label: { tr: "Uluslararası İşveren Adaylık Sayısı", en: "International Employer Nominations" }, inputKind: "scalar" },
];

const employmentParameters: readonly QsScenarioDisplayParameter[] = [
  { id: "totalGraduateStudents2023", label: { tr: "Toplam Mezun Sayısı", en: "Total Graduates" }, inputKind: "scalar" },
  { id: "totalEmploymentRespondents", label: { tr: "Mezun Anketine Katılan Kişi Sayısı", en: "Graduate Survey Participants" }, inputKind: "scalar" },
  { id: "employedGraduates", label: { tr: "İstihdam Edilen Mezun Sayısı", en: "Employed Graduates" }, inputKind: "scalar" },
  { id: "unemployedGraduates", label: { tr: "İşsiz Mezun Sayısı", en: "Unemployed Graduates" }, inputKind: "scalar" },
  { id: "employmentOutcomes.alumniImpactIndex", label: { tr: "Alumni Impact İndeksi", en: "Alumni Impact Index" }, inputKind: "scalar" },
];

const internationalResearchNetworkParameters = facultyAreas.flatMap(({ code }): QsScenarioDisplayParameter[] => [
  {
    id: `internationalResearchNetwork.${code}.distinctCountries`,
    label: { tr: "Farklı Ülke/Bölge Sayısı", en: "Distinct Countries/Territories" },
    inputKind: "scalar",
    facultyArea: code,
  },
  {
    id: `internationalResearchNetwork.${code}.distinctInternationalPartners`,
    label: { tr: "Uluslararası Ortak Kurum Sayısı", en: "International Partner Institutions" },
    inputKind: "scalar",
    facultyArea: code,
  },
]);

export const QS_SCENARIO_DISPLAY_FACULTY_AREAS = facultyAreas;

export const QS_SCENARIO_DISPLAY_SECTIONS: readonly QsScenarioDisplaySection[] = [
  { id: "basicInstitutional", label: { tr: "Kurumsal Temel Veriler", en: "Core Institutional Data" }, initiallyOpen: true, parameters: basicInstitutionalParameters },
  { id: "academicReputation", label: { tr: "Akademik İtibar Verileri", en: "Academic Reputation Data" }, initiallyOpen: false, parameters: academicReputationParameters },
  { id: "citationsPerFaculty", label: { tr: "Akademisyen Başına Atıf Verileri", en: "Citations per Faculty Data" }, initiallyOpen: false, parameters: citationParameters },
  { id: "employerReputation", label: { tr: "İşveren İtibarı Verileri", en: "Employer Reputation Data" }, initiallyOpen: false, parameters: employerParameters },
  { id: "employmentOutcomes", label: { tr: "İstihdam Sonuçları Verileri", en: "Employment Outcomes Data" }, initiallyOpen: false, parameters: employmentParameters },
  { id: "internationalResearchNetwork", label: { tr: "Uluslararası Araştırma Ağı Verileri", en: "International Research Network Data" }, initiallyOpen: false, parameters: internationalResearchNetworkParameters },
  {
    id: "sustainability",
    label: { tr: "Sürdürülebilirlik Verisi", en: "Sustainability Data" },
    initiallyOpen: false,
    parameters: [{
      id: "sustainability.qsIndicatorValue",
      label: { tr: "QS Sustainability Haricî Referans Skoru", en: "QS Sustainability External Reference Score" },
      inputKind: "scalar",
    }],
  },
] as const;

export const QS_SCENARIO_DISPLAY_PARAMETER_COUNT =
  QS_SCENARIO_DISPLAY_SECTIONS.reduce((total, section) => total + section.parameters.length, 0);

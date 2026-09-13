import { THE_INSTITUTION_DATA_FIELDS, type TheInstitutionFieldDefinition } from "@/src/config/data-entry/the-institution-fields";
import { theCategories } from "@/src/config/the.metrics";
import { getTheInstitutionalScenarioKey, THE_INSTITUTIONAL_TO_SCENARIO_MAPPING } from "@/src/lib/the/institutional-scenario";
import type { TheMetricDefinition } from "@/src/types/the";

export type TheSimulatorParameterGroupId = "teaching" | "researchEnvironment" | "researchQuality" | "internationalOutlook" | "industry";
export type TheSimulatorParameterDefinition = {
  id: string;
  label: { tr: string; en: string };
  required: true;
  visibleInSimulator: true;
  visibleInRecommendationEngine: boolean;
  editableInRecommendationEngine: boolean;
  selectableForRecommendation: boolean;
  sourceType: "institutional" | "external-the-data";
  source: "institutional" | "metric";
  /** Backwards-compatible presentation discriminator used by existing UI tests. */
  group: "institutional" | "additional";
  metric?: TheMetricDefinition;
  institutionalField?: TheInstitutionFieldDefinition;
  scenarioKey: string;
  groupId: TheSimulatorParameterGroupId;
};

export type TheParameterDisplayMetadata = {
  unit: { tr: string; en: string };
  format: "number" | "income";
};

export const THE_PARAMETER_DISPLAY_METADATA: Readonly<Record<string, TheParameterDisplayMetadata>> = {
  "the.common.academicStaffFte": { unit: { tr: "FTE", en: "FTE" }, format: "number" },
  "the.researchEnvironment.academicResearchStaffFte": { unit: { tr: "FTE", en: "FTE" }, format: "number" },
  "the.common.studentsFte": { unit: { tr: "FTE", en: "FTE" }, format: "number" },
  "the.internationalOutlook.internationalAcademicStaffFte": { unit: { tr: "FTE", en: "FTE" }, format: "number" },
  "the.internationalOutlook.internationalStudentsFte": { unit: { tr: "FTE", en: "FTE" }, format: "number" },
  "the.teaching.bachelorGraduates": { unit: { tr: "derece", en: "degrees" }, format: "number" },
  "the.teaching.doctorateGraduates": { unit: { tr: "derece", en: "degrees" }, format: "number" },
  "the.researchEnvironment.publicationCount": { unit: { tr: "yayın", en: "publications" }, format: "number" },
  "the.internationalOutlook.internationalCoauthoredPublications": { unit: { tr: "yayın", en: "publications" }, format: "number" },
  "the.industry.citingPatentCount": { unit: { tr: "patent", en: "patents" }, format: "number" },
  "the.researchQuality.fwci": { unit: { tr: "FWCI", en: "FWCI" }, format: "number" },
  "the.researchQuality.researchStrengthScore": { unit: { tr: "FWCI", en: "FWCI" }, format: "number" },
  "the.teaching.reputationScore": { unit: { tr: "puan", en: "points" }, format: "number" },
  "the.researchEnvironment.reputationScore": { unit: { tr: "puan", en: "points" }, format: "number" },
  "the.researchQuality.researchExcellenceScore": { unit: { tr: "yayın", en: "publications" }, format: "number" },
  "the.researchQuality.researchInfluenceScore": { unit: { tr: "puan", en: "points" }, format: "number" },
  "the.teaching.institutionalIncomePpp": { unit: { tr: "", en: "" }, format: "income" },
  "the.researchEnvironment.researchIncomePpp": { unit: { tr: "", en: "" }, format: "income" },
  "the.industry.industryResearchIncomePpp": { unit: { tr: "", en: "" }, format: "income" },
};

export const THE_UNVERIFIED_RESEARCH_QUALITY_RAW_PARAMETER_IDS = new Set([
  "the.researchQuality.researchStrengthScore",
  "the.researchQuality.researchExcellenceScore",
  "the.researchQuality.researchInfluenceScore",
]);

export const THE_UNVERIFIED_RAW_TO_SCORE_PARAMETER_IDS = new Set([
  ...THE_UNVERIFIED_RESEARCH_QUALITY_RAW_PARAMETER_IDS,
  "the.researchQuality.fwci",
  "the.industry.citingPatentCount",
]);

export const getTheSimulatorBaselineValue = (
  parameterId: string,
  engineBaselineValue: number | null,
) => THE_UNVERIFIED_RESEARCH_QUALITY_RAW_PARAMETER_IDS.has(parameterId)
  ? null
  : engineBaselineValue;

const metricsById = new Map<string, TheMetricDefinition>();
for (const metric of theCategories.flatMap((category) => category.metrics)) {
  if (!metricsById.has(metric.id)) metricsById.set(metric.id, metric);
}

const institutionalParameters = [
  ["academicStaffFte", "teaching", "Akademik Personel Sayısı (FTE)", "Academic Staff FTE"],
  ["internationalAcademicStaffFte", "internationalOutlook", "Uluslararası/Yurt Dışı Kökenli Akademik Personel Sayısı (FTE)", "International Academic Staff FTE"],
  ["researchStaffFte", "researchEnvironment", "Araştırma Personeli Sayısı (FTE)", "Research Staff FTE"],
  ["studentsFte", "teaching", "Öğrenci Sayısı (FTE)", "Student FTE"],
  ["internationalStudentsFte", "internationalOutlook", "Uluslararası/Yurt Dışı Kökenli Öğrenci Sayısı (FTE)", "International Student FTE"],
  ["undergraduateDegreesAwarded", "teaching", "Verilen Lisans Derecesi Sayısı", "Undergraduate Degrees Awarded"],
  ["doctoratesAwarded", "teaching", "Verilen Doktora Derecesi Sayısı", "Doctoral Degrees Awarded"],
  ["institutionalIncome", "teaching", "Toplam Kurumsal Gelir", "Institutional Income"],
  ["researchIncome", "researchEnvironment", "Araştırma Geliri", "Research Income"],
  ["industryCommerceResearchIncome", "industry", "Endüstri Kaynaklı Araştırma Geliri", "Industry Research Income"],
] as const;

const metricParameters = [
  ["the.teaching.reputationScore", "teaching", "Öğretim İtibarı Ham Değeri", "Teaching Reputation Raw Value"],
  ["the.researchEnvironment.reputationScore", "researchEnvironment", "Araştırma İtibarı Ham Değeri", "Research Reputation Raw Value"],
  ["the.researchEnvironment.publicationCount", "researchEnvironment", "Toplam Uygun Yayın Sayısı", "Total Eligible Publications"],
  ["the.researchQuality.fwci", "researchQuality", "Kurumsal Atıf Etkisi / Ortalama FWCI Değeri", "Institutional Citation Impact / Mean FWCI"],
  ["the.researchQuality.researchStrengthScore", "researchQuality", "75. Yüzdelik FWCI Değeri", "75th Percentile FWCI"],
  ["the.researchQuality.researchExcellenceScore", "researchQuality", "Dünya En İyi %10’luk Dilimindeki Yayın Sayısı", "Publications in the Global Top 10%"],
  ["the.researchQuality.researchInfluenceScore", "researchQuality", "Araştırma Etkisi Ham Bibliyometrik Değeri", "Research Influence Raw Bibliometric Value"],
  ["the.internationalOutlook.internationalCoauthoredPublications", "internationalOutlook", "Uluslararası Ortak Yazarlı Yayın Sayısı", "International Co-authored Publications"],
  ["the.industry.citingPatentCount", "industry", "Patentler Tarafından Atıf Yapılan Yayın Sayısı", "Publications Cited by Patents"],
] as const;

export const THE_SIMULATOR_PARAMETER_GROUPS = [
  { id: "teaching", label: { tr: "Öğretim", en: "Teaching" } },
  { id: "researchEnvironment", label: { tr: "Araştırma Ortamı", en: "Research Environment" } },
  { id: "researchQuality", label: { tr: "Araştırma Kalitesi", en: "Research Quality" } },
  { id: "internationalOutlook", label: { tr: "Uluslararası Görünüm", en: "International Outlook" } },
  { id: "industry", label: { tr: "Sanayi", en: "Industry" } },
] as const;

export const THE_FLAT_PARAMETER_DEFINITIONS: readonly TheSimulatorParameterDefinition[] = [
  ...institutionalParameters.flatMap(([fieldId, groupId, turkishLabel, englishLabel]) => {
    const field = THE_INSTITUTION_DATA_FIELDS.find((item) => item.id === fieldId);
    if (!field) return [];
    const metricId = THE_INSTITUTIONAL_TO_SCENARIO_MAPPING[field.id as keyof typeof THE_INSTITUTIONAL_TO_SCENARIO_MAPPING];
    return [{ id: field.id, label: { tr: turkishLabel, en: englishLabel }, required: true as const, visibleInSimulator: true as const, visibleInRecommendationEngine: true, editableInRecommendationEngine: true, selectableForRecommendation: true, sourceType: "institutional" as const, source: "institutional" as const, group: "institutional" as const, metric: metricId ? metricsById.get(metricId) : undefined, institutionalField: field, scenarioKey: getTheInstitutionalScenarioKey(field.id), groupId }];
  }),
  ...metricParameters.flatMap(([id, groupId, tr, en]) => {
    const metric = metricsById.get(id);
    return metric ? [{ id, label: { tr, en }, required: true as const, visibleInSimulator: true as const, visibleInRecommendationEngine: false, editableInRecommendationEngine: false, selectableForRecommendation: false, sourceType: "external-the-data" as const, source: "metric" as const, group: "additional" as const, metric, scenarioKey: id, groupId }] : [];
  }),
];

export const THE_RECOMMENDATION_PARAMETER_DEFINITIONS =
  THE_FLAT_PARAMETER_DEFINITIONS.filter((parameter) =>
    parameter.required &&
    parameter.visibleInRecommendationEngine &&
    parameter.editableInRecommendationEngine &&
    parameter.selectableForRecommendation &&
    parameter.sourceType === "institutional" &&
    Boolean(parameter.metric),
  );

const THE_UNIT_LABELS_EN: Record<string, string> = {
  "FTE personel": "staff FTE",
  "FTE öğrenci": "student FTE",
  "mezun": "graduates",
  "puan": "points",
  "yayın": "publications",
  "patent": "patents",
};

export function getTheParameterUnitLabel(unit: string, language: "tr" | "en") {
  return language === "tr" ? unit : THE_UNIT_LABELS_EN[unit] ?? unit;
}

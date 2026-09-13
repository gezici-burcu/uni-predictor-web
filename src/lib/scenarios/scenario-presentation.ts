import type { SavedScenarioMethodology } from "@/src/types/saved-scenario";
import { THE_INSTITUTION_DATA_FIELDS } from "@/src/config/data-entry/the-institution-fields";
import { theCategories } from "@/src/config/the.metrics";
import { THE_INSTITUTIONAL_TO_SCENARIO_MAPPING } from "@/src/lib/the/institutional-scenario";
import type { SavedScenarioMetricChange } from "@/src/types/saved-scenario";
import { greenMetricRawMetricDefinitions } from "@/src/data/greenmetric.baseline";
import { GREEN_METRIC_INSTITUTION_FIELDS, getGreenMetricInstitutionUnit } from "@/src/config/data-entry/greenmetric-institution-fields";

const METHODOLOGY_ROUTES: Record<SavedScenarioMethodology, string> = {
  THE: "/the",
  QS: "/qs",
  GREENMETRIC: "/greenmetric",
  CROSS_ANALYSIS: "/cross-analysis",
};

const CATEGORY_LABELS: Record<string, { tr: string; en: string }> = {
  teaching: { tr: "Öğretim", en: "Teaching" },
  researchEnvironment: { tr: "Araştırma Ortamı", en: "Research Environment" },
  researchQuality: { tr: "Araştırma Kalitesi", en: "Research Quality" },
  internationalOutlook: { tr: "Uluslararası Görünüm", en: "International Outlook" },
  industry: { tr: "Sanayi", en: "Industry" },
};

const PARAMETER_LABELS = new Map<string, string>();
for (const field of THE_INSTITUTION_DATA_FIELDS) {
  PARAMETER_LABELS.set(field.id, field.label.tr);
  const scenarioId = THE_INSTITUTIONAL_TO_SCENARIO_MAPPING[field.id as keyof typeof THE_INSTITUTIONAL_TO_SCENARIO_MAPPING];
  if (scenarioId) PARAMETER_LABELS.set(scenarioId, field.label.tr);
}
for (const category of theCategories) {
  for (const metric of category.metrics) {
    if (!PARAMETER_LABELS.has(metric.id)) PARAMETER_LABELS.set(metric.id, metric.label);
  }
}
PARAMETER_LABELS.set("the.internationalOutlook.internationalAcademicStaffFte", "Uluslararası Akademik Personel Sayısı (FTE)");
PARAMETER_LABELS.set("the.internationalOutlook.internationalStudentsFte", "Uluslararası Öğrenci Sayısı (FTE)");
const QS_PARAMETER_LABELS: Record<string, string> = {
  graduatesUnavailableForWork: "Çalışmaya Uygun Olmayan Mezun Sayısı",
  graduatesInFullTimeFurtherStudy: "İleri Eğitime Devam Eden Mezun Sayısı",
  totalStudentNationalities: "Uluslararası Öğrencilerin Temsil Ettiği Ülke/Uyruk Sayısı",
};
const LEGACY_QS_LABELS = new Set(["Engelli Mezun Sayısı", "Tam Zamanlı Yüksek Lisansa Devam Eden Mezun Sayısı", "Toplam Öğrenci Uyruğu Sayısı"]);
const QS_AGGREGATE_IDS = new Set(["academicStaff", "internationalAcademicStaff", "undergraduateStudents", "undergraduateInternationalStudents", "graduatePostgraduateStudents", "graduatePostgraduateInternationalStudents"]);

const PARAMETER_AREAS = new Map<string, string>();
for (const category of theCategories) {
  for (const metric of category.metrics) {
    if (!PARAMETER_AREAS.has(metric.id)) PARAMETER_AREAS.set(metric.id, category.title);
  }
}

const INTEGER_PARAMETER_IDS = new Set([
  "the.common.academicStaffFte", "the.common.studentsFte",
  "the.researchEnvironment.academicResearchStaffFte",
  "the.internationalOutlook.internationalAcademicStaffFte",
  "the.internationalOutlook.internationalStudentsFte",
  "the.teaching.bachelorGraduates", "the.teaching.doctorateGraduates",
  "the.researchEnvironment.publicationCount",
  "the.internationalOutlook.internationalCoauthoredPublications",
  "the.industry.citingPatentCount", "femaleAcademicStaffFte",
]);

const GREEN_METRIC_METRICS = new Map(greenMetricRawMetricDefinitions.map((metric) => [metric.id, metric]));
const GREEN_METRIC_INSTITUTION_LABELS = new Map(
  GREEN_METRIC_INSTITUTION_FIELDS.map((metric) => [metric.id, metric.localizedLabel]),
);

export const getMethodologyRoute = (methodology: SavedScenarioMethodology) =>
  METHODOLOGY_ROUTES[methodology] ?? null;

export const getScenarioReviewHref = (methodology: SavedScenarioMethodology, scenarioId: string) => {
  const route = getMethodologyRoute(methodology);
  const parameter = methodology === "CROSS_ANALYSIS" ? "savedAnalysisId" : "scenarioId";
  return route ? `${route}?${parameter}=${encodeURIComponent(scenarioId)}` : null;
};

export const getMethodologyCategoryLabel = (
  methodology: SavedScenarioMethodology,
  categoryId: string,
  locale: "tr" | "en" | "tr-TR" | "en-US" = "tr",
) => methodology === "THE" && CATEGORY_LABELS[categoryId]
  ? CATEGORY_LABELS[categoryId][locale.startsWith("en") ? "en" : "tr"]
  : readableFallback(categoryId);

export const getScenarioCategoryLabel = (categoryId: string) =>
  getMethodologyCategoryLabel("THE", categoryId, "tr");

export function getScenarioParameterLabel(parameterId: string, snapshotLabel?: string | null) {
  const qsId = getQsSnapshotParameterPart(parameterId)?.id ?? parameterId;
  if (QS_PARAMETER_LABELS[qsId]) return QS_PARAMETER_LABELS[qsId];
  const savedLabel = snapshotLabel?.trim();
  if (savedLabel && !LEGACY_QS_LABELS.has(savedLabel) && savedLabel !== parameterId && !looksTechnical(savedLabel)) return savedLabel.replace(/ · (Full-Time|Part-Time)$/, "");
  return PARAMETER_LABELS.get(parameterId) ?? readableFallback(parameterId.split(".").at(-1) ?? parameterId);
}

export function presentQsLegacyMetricChanges(changes: readonly SavedScenarioMetricChange[]) {
  const output: SavedScenarioMetricChange[] = [];
  const warnings: string[] = [];
  const aggregate = new Map<string, Partial<Record<"fullTime" | "partTime", SavedScenarioMetricChange>>>();
  for (const change of changes) {
    const parsed = getQsSnapshotParameterPart(change.parameterId, change.field);
    if (parsed && QS_AGGREGATE_IDS.has(parsed.id) && parsed.part) {
      const parts = aggregate.get(parsed.id) ?? {};
      parts[parsed.part] = change;
      aggregate.set(parsed.id, parts);
    } else output.push({ ...change, label: getScenarioParameterLabel(change.parameterId, change.label) });
  }
  for (const [id, parts] of aggregate) {
    if (parts.fullTime && parts.partTime && typeof parts.fullTime.currentValue === "number" && typeof parts.partTime.currentValue === "number" && typeof parts.fullTime.scenarioValue === "number" && typeof parts.partTime.scenarioValue === "number") {
      const currentValue = parts.fullTime.currentValue + parts.partTime.currentValue;
      const scenarioValue = parts.fullTime.scenarioValue + parts.partTime.scenarioValue;
      output.push({ parameterId: id, label: getScenarioParameterLabel(id, parts.fullTime.label), field: "Toplam", currentValue, scenarioValue, difference: scenarioValue - currentValue });
    } else {
      for (const part of [parts.fullTime, parts.partTime]) if (part) output.push({ ...part, label: getScenarioParameterLabel(part.parameterId, part.label) });
      warnings.push(`${getScenarioParameterLabel(id)} için eski snapshot'ta FT/PT çiftinin yalnız bir parçası bulundu; toplam üretilmedi.`);
    }
  }
  return { metrics: output, warnings };
}

function getQsSnapshotParameterPart(parameterId: string, field?: string | null) {
  const match = parameterId.match(/^institutional:([^:.]+):(fullTime|partTime)(?:\.(?:Full-Time|Part-Time))?$/);
  if (match) return { id: match[1], part: match[2] as "fullTime" | "partTime" };
  if (QS_AGGREGATE_IDS.has(parameterId) && (field === "Full-Time" || field === "Part-Time")) return { id: parameterId, part: field === "Full-Time" ? "fullTime" as const : "partTime" as const };
  return null;
}

export const getScenarioParameterArea = (parameterId: string) => PARAMETER_AREAS.get(parameterId) ?? null;

export function formatScenarioParameterValue(parameterId: string, value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return value == null ? "—" : String(value);
  return value.toLocaleString("tr-TR", INTEGER_PARAMETER_IDS.has(parameterId)
    ? { maximumFractionDigits: 0 }
    : { maximumFractionDigits: 4 });
}

export function getGreenMetricScenarioParameterLabel(
  parameterId: string,
  snapshotLabel: string | null | undefined,
  language: "tr" | "en",
) {
  const localizedInstitutionLabel = GREEN_METRIC_INSTITUTION_LABELS.get(parameterId)?.[language];
  if (localizedInstitutionLabel) return localizedInstitutionLabel;
  const savedLabel = snapshotLabel?.trim();
  if (savedLabel && savedLabel !== parameterId && !looksTechnical(savedLabel)) return savedLabel;
  return GREEN_METRIC_METRICS.get(parameterId)?.label ?? getScenarioParameterLabel(parameterId, snapshotLabel);
}

export function formatGreenMetricScenarioValue(
  parameterId: string,
  value: unknown,
  language: "tr" | "en",
  locale: string,
) {
  const metric = GREEN_METRIC_METRICS.get(parameterId);
  if (value === null || value === undefined) return "—";
  if (metric?.inputType === "select") {
    return metric.options?.find((option) => option.value === String(value))?.label ?? String(value);
  }
  if (metric?.inputType === "multi-select" && Array.isArray(value)) {
    if (!value.length) return "—";
    return value.map((item) => metric.options?.find((option) => option.value === String(item))?.label ?? String(item)).join(", ");
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const formatted = value.toLocaleString(locale, metric?.integerOnly
      ? { maximumFractionDigits: 0 }
      : { maximumFractionDigits: 4 });
    const unit = getGreenMetricInstitutionUnit(metric?.unit, language);
    return unit ? `${formatted} ${unit}` : formatted;
  }
  return String(value);
}

const looksTechnical = (label: string) => /^[a-z]+(?:\.[A-Za-z][\w]*)+$/.test(label);
const readableFallback = (value: string) => value
  .replace(/([a-zçğıöşü])([A-ZÇĞİÖŞÜ])/g, "$1 $2")
  .replace(/[._-]+/g, " ")
  .replace(/^./, (character) => character.toLocaleUpperCase("tr-TR"));

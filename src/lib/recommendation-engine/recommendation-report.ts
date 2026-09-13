import type { AppLanguage } from "@/src/i18n/types";
import { createTextPdf, sanitizePdfFilename } from "@/src/lib/scenarios/scenario-pdf";
import type { RecommendationEngineResult, RecommendationMetricDefinition, RecommendationParameterInput, RecommendationRankRange, RecommendationTargetMode } from "./types";
import type { QsCalculationResult } from "@/src/types/qs";
import { formatRecommendationRankEstimate } from "./rank-target";

export type RecommendationReportModel = {
  methodology: "the" | "qs";
  title: string;
  generatedAt: string;
  validationWarnings: string[];
  institutionalDataYear: string | null;
  scoreReferenceEdition: string | null;
  currentScore: number | null;
  constrainedStartScore: number | null;
  recommendedScore: number | null;
  targetScore: number | null;
  targetMode: RecommendationTargetMode;
  targetRankRange: RecommendationRankRange | null;
  currentRankEstimate: string;
  recommendedRankEstimate: string;
  status: string;
  warnings: string[];
  limitations: string[];
  fixedInputs: RecommendationParameterInput[];
  rangeInputs: RecommendationParameterInput[];
  allowedParameterIds: string[];
  allowedParameterLabels: string[];
  fixedInputDetails: Array<{ label: string; currentValue: unknown; userValue: unknown; difference: number | null }>;
  rangeInputDetails: Array<{ label: string; minimum: unknown; maximum: unknown }>;
  changes: NonNullable<RecommendationEngineResult["primaryPlan"]>["changes"];
  currentCategories: Record<string, number | null>;
  constrainedCategories: Record<string, number | null>;
  recommendedCategories: Record<string, number | null>;
  qs?: {
    current: QsCalculationResult;
    scenario: QsCalculationResult;
    currentEmployment: { graduateEmploymentRate: number | null; surveyResponseRate: number | null };
    scenarioEmployment: { graduateEmploymentRate: number | null; surveyResponseRate: number | null };
  };
};

export function createRecommendationReportModel({
  result,
  methodology,
  language,
  inputs,
  allowedParameterIds,
  definitions,
  institutionalDataYear,
  scoreReferenceEdition,
  generatedAt = new Date().toISOString(),
  qsData,
  baselineValues,
  validationWarnings = [],
}: {
  result: RecommendationEngineResult;
  methodology: "the" | "qs";
  language: AppLanguage;
  inputs: RecommendationParameterInput[];
  allowedParameterIds: string[];
  definitions: RecommendationMetricDefinition[];
  institutionalDataYear: string | null;
  scoreReferenceEdition: string | null;
  baselineValues: Record<string, unknown>;
  generatedAt?: string;
  qsData?: RecommendationReportModel["qs"];
  validationWarnings?: string[];
}): RecommendationReportModel {
  const plan = result.primaryPlan;
  const title = methodology === "qs"
    ? (language === "tr" ? "QS Ham Veri İyileştirme Planı" : "QS Raw Data Improvement Plan")
    : (language === "tr" ? "THE Öneri Planı" : "THE Recommendation Plan");
  const status = methodology === "qs"
    ? (language === "tr" ? "Ham analiz - sayısal skor etkisi hesaplanamadı" : "Raw analysis - numeric score effect unavailable")
    : result.reachability.reachable
    ? (language === "tr" ? "Hedefe ulaşıldı" : "Target reached")
    : plan && plan.recommendedScore > result.constrainedStartScore + 0.0001
      ? (language === "tr" ? "Sınırlı iyileşme sağlandı, hedefe ulaşılamadı" : "Limited improvement; target not reached")
      : (language === "tr" ? "Pozitif iyileşme üretilemedi" : "No positive improvement");
  return {
    methodology, title, generatedAt, institutionalDataYear, scoreReferenceEdition,
    validationWarnings,
    currentScore: result.currentScore,
    constrainedStartScore: result.constrainedStartScore,
    recommendedScore: methodology === "qs" ? null : plan?.recommendedScore ?? result.reachability.maximumReachableScore,
    targetScore: result.targetScore,
    targetMode: result.targetMode ?? "score",
    targetRankRange: result.targetRankRange ?? null,
    currentRankEstimate: formatRecommendationRankEstimate(result.rankTarget?.currentEvaluation.estimate ?? null),
    recommendedRankEstimate: formatRecommendationRankEstimate(
      result.rankTarget?.recommendedEvaluation?.estimate ??
      result.rankTarget?.constrainedStartEvaluation.estimate ?? null,
    ),
    status,
    warnings: [...validationWarnings, ...result.warnings],
    limitations: methodology === "qs"
      ? [language === "tr"
        ? "QS’nin kamuya açık raw-to-score kalibrasyonu bulunmadığından ham kurumsal veri değişikliklerinin gösterge ve genel skora sayısal etkisi hesaplanamamaktadır."
        : "Because QS public raw-to-score calibration is unavailable, numeric indicator and overall-score effects of raw institutional changes cannot be calculated."]
      : [],
    fixedInputs: inputs.filter((input) => input.selected && input.inputMode === "value"),
    rangeInputs: inputs.filter((input) => input.selected && input.inputMode === "range"),
    allowedParameterIds,
    allowedParameterLabels: allowedParameterIds.map((id) => definitions.find((definition) => definition.metricId === id)?.label ?? "—"),
    fixedInputDetails: inputs.filter((input) => input.selected && input.inputMode === "value").map((input) => {
      const definition = definitions.find((item) => item.metricId === input.parameterId);
      const currentValue = baselineValues[definition?.engineField ?? input.parameterId];
      return { label: definition?.label ?? "—", currentValue, userValue: input.value, difference: typeof currentValue === "number" && typeof input.value === "number" ? input.value - currentValue : null };
    }),
    rangeInputDetails: inputs.filter((input) => input.selected && input.inputMode === "range").map((input) => ({ label: definitions.find((item) => item.metricId === input.parameterId)?.label ?? "—", minimum: input.min, maximum: input.max })),
    changes: plan?.changes ?? [],
    currentCategories: plan?.currentCategoryScores ?? {},
    constrainedCategories: plan?.constrainedCategoryScores ?? {},
    recommendedCategories: plan?.resultingCategoryScores ?? {},
    qs: qsData,
  };
}

export function renderRecommendationReport(model: RecommendationReportModel, language: AppLanguage) {
  const tr = language === "tr";
  const show = (value: unknown) => value === null || value === undefined || value === "" ? "—" : typeof value === "number" ? value.toLocaleString(language === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: 2 }) : String(value);
  const lines = [
    "Üniversite Sıralama Simülatörü", model.title, "",
    `${tr ? "Metodoloji" : "Methodology"}: ${model.methodology.toUpperCase()}`,
    `${tr ? "Oluşturulma" : "Created"}: ${model.generatedAt}`,
    `${tr ? "Kurumsal veri yılı" : "Institutional data year"}: ${show(model.institutionalDataYear)}`,
    `${tr ? "Skor referans edisyonu" : "Score reference edition"}: ${show(model.scoreReferenceEdition)}`,
    `${tr ? "Hesaplama durumu" : "Calculation status"}: ${model.status}`,
    `${tr ? "Mevcut skor" : "Current score"}: ${show(model.currentScore)}`,
    ...(model.methodology === "the" ? [
      `${tr ? "Kısıtlı başlangıç skoru" : "Constrained start score"}: ${show(model.constrainedStartScore)}`,
      `${tr ? "Önerilen skor" : "Recommended score"}: ${show(model.recommendedScore)}`,
    ] : []),
    `${tr ? "Hedef türü" : "Target type"}: ${model.targetMode === "rankRange" ? (tr ? "Hedef sıralama" : "Target ranking") : (tr ? "Hedef skor" : "Target score")}`,
    ...(model.targetMode === "rankRange" && model.targetRankRange ? [
      `${tr ? "Hedef sıralama aralığı" : "Target ranking range"}: ${show(model.targetRankRange.bestRank)}-${show(model.targetRankRange.worstRank)}`,
      `${tr ? "Mevcut tahmini sıralama" : "Current estimated ranking"}: ${model.currentRankEstimate}`,
      `${tr ? "Öneri sonrası tahmini sıralama" : "Estimated ranking after recommendation"}: ${model.recommendedRankEstimate}`,
    ] : [`${tr ? "Hedef skor" : "Target score"}: ${show(model.targetScore)}`]),
    ...(model.methodology === "the" ? [
      "", tr ? "Sıralama özeti" : "Ranking summary",
      `${tr ? "Mevcut yayımlanmış sıralama bandı" : "Current published ranking band"}: ${model.currentRankEstimate}`,
      `${tr ? "Önerilen tahmini sıralama bandı" : "Recommended estimated ranking band"}: ${model.recommendedRankEstimate}`,
    ] : []),
    "",
    tr ? "Kullanıcı girdileri ve kısıtlar" : "User inputs and constraints",
    ...(model.fixedInputDetails.length ? model.fixedInputDetails.map((input) => `${input.label}: ${show(input.currentValue)} -> ${show(input.userValue)} | ${tr ? "Fark" : "Difference"}: ${show(input.difference)}`) : ["—"]),
    ...(model.rangeInputDetails.length ? model.rangeInputDetails.map((input) => `${input.label}: ${show(input.minimum)} - ${show(input.maximum)}`) : []),
    `${tr ? "İzin verilen öneri parametreleri" : "Permitted recommendation parameters"}: ${model.allowedParameterLabels.join(", ") || "—"}`,
    "", tr ? "Öneri adımları" : "Recommendation steps",
    ...(model.methodology === "qs" ? [tr ? "Gerekli skor artışı mevcut skor ile kullanıcı hedefi arasındaki aritmetik farktır." : "Required score increase is the arithmetic difference between the current score and the user target."] : []),
    ...(model.changes.length ? model.changes.map((change, index) => `${index + 1}. ${change.label[language]}: ${show(change.currentValue)} -> ${show(change.recommendedValue)} | +${show(change.incrementalScoreImpact)} | ${show(change.scoreAfterChange)}`) : ["—"]),
    "", tr ? "Kategori sonuçları" : "Category results",
    ...Object.keys({ ...model.currentCategories, ...model.recommendedCategories }).map((key) => `${categoryLabel(key, language)}: ${show(model.currentCategories[key])} -> ${show(model.recommendedCategories[key])}`),
    "", tr ? "Uyarılar ve metodoloji sınırlamaları" : "Warnings and methodology limitations",
    ...(model.warnings.length ? model.warnings : ["—"]),
    ...(model.limitations.length ? model.limitations : ["—"]),
    ...(model.qs ? ["", tr ? "Ham oran analizi" : "Raw ratio analysis", ...(["FSR", "IFR", "ISR"] as const).map((code) => `${code}: ${show(model.qs!.current.rawIndicators[code])} -> ${show(model.qs!.scenario.rawIndicators[code])}`), `${tr ? "Anket yanıt oranı" : "Survey response rate"}: ${show(model.qs.scenarioEmployment.surveyResponseRate)}`, `${tr ? "Ham mezun istihdam oranı" : "Raw graduate employment rate"}: ${show(model.qs.scenarioEmployment.graduateEmploymentRate)}`, "", tr ? "QS gösterge durumları" : "QS indicator statuses", ...(["FSR", "IFR", "ISR", "EO"] as const).map((code) => `${code}: ${show(model.qs!.current.indicatorScores[code])} -> ${show(model.qs!.scenario.indicatorScores[code])} | ${model.qs!.scenario.indicatorScores[code] === model.qs!.current.indicatorScores[code] ? (tr ? "Referans skorunda sabit tutuldu" : "Held at reference score") : (tr ? "Sayısal olarak hesaplandı" : "Calculated numerically")}`)] : []),
    "", tr ? "Bu rapor simülasyon ve karar destek amacıyla hazırlanmıştır; resmî sıralama sonucu değildir." : "This report is for simulation and decision support; it is not an official ranking result.",
  ];
  return lines;
}

function categoryLabel(key: string, language: AppLanguage) {
  const labels: Record<string, [string, string]> = {
    teaching: ["Öğretim", "Teaching"],
    researchEnvironment: ["Araştırma Ortamı", "Research Environment"],
    researchQuality: ["Araştırma Kalitesi", "Research Quality"],
    internationalOutlook: ["Uluslararası Görünüm", "International Outlook"],
    industry: ["Sanayi", "Industry"],
  };
  return labels[key]?.[language === "tr" ? 0 : 1] ?? key;
}

export function createRecommendationPdf(model: RecommendationReportModel, language: AppLanguage, now = new Date()) {
  const date = now.toISOString().slice(0, 10);
  const filename = model.methodology === "qs"
    ? `university-ranking-qs-raw-data-plan-${date}.pdf`
    : `university-ranking-the-recommendation-${date}.pdf`;
  return createTextPdf(renderRecommendationReport(model, language), sanitizePdfFilename(filename));
}

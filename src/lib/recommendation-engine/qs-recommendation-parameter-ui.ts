import type { RecommendationMetricDefinition } from "./types";

export type QsRecommendationParameterUiContext =
  | "scenario-input"
  | "recommendation-selection";

export type QsRecommendationParameterUiStatus = {
  badgeLabel: string;
  badgeTone: "success" | "warning" | "neutral" | "error";
  tooltip: string;
  canUseAsScenarioInput: boolean;
  canProduceNumericRecommendation: boolean;
};

export const QS_RAW_PARAMETER_GROUP_NOTICE =
  "Bu bölümdeki ham değerler senaryo analizinde değiştirilebilir. Doğrulanmış QS kalibrasyonu bulunmayan alanlardan sayısal skor etkisi üretilmez.";

const hasQsRecommendationMetadata = (parameter: RecommendationMetricDefinition) =>
  parameter.selectableForScenarioInput !== undefined ||
  parameter.eligibleForNumericRecommendation !== undefined ||
  parameter.recommendationStatus !== undefined;

export function getQsRecommendationParameterUiStatus(
  parameter: RecommendationMetricDefinition,
  options: {
    context: QsRecommendationParameterUiContext;
    baselineMissing?: boolean;
  },
): QsRecommendationParameterUiStatus | null {
  if (!hasQsRecommendationMetadata(parameter)) return null;

  const common = {
    canUseAsScenarioInput: parameter.selectableForScenarioInput === true,
    canProduceNumericRecommendation:
      parameter.eligibleForNumericRecommendation === true,
  };

  if (options.baselineMissing) {
    return {
      ...common,
      badgeLabel: "Mevcut veri eksik",
      badgeTone: "error",
      tooltip:
        "Bu parametrenin seçili kurumsal veri yılı için mevcut değeri bulunmuyor.",
    };
  }

  if (parameter.eligibleForNumericRecommendation === true) {
    return {
      ...common,
      badgeLabel: "Sayısal öneriye uygun",
      badgeTone: "success",
      tooltip:
        "Bu parametrenin doğrulanmış hesaplama etkisi öneri planında kullanılabilir.",
    };
  }

  if (parameter.recommendationStatus === "external-data-required") {
    return {
      ...common,
      badgeLabel: "Haricî veri gerekli",
      badgeTone: "neutral",
      tooltip:
        "Sayısal etki üretilebilmesi için doğrulanmış haricî veri gereklidir.",
    };
  }

  if (parameter.recommendationStatus === "calibration-required") {
    return {
      ...common,
      badgeLabel:
        options.context === "scenario-input"
          ? "Ham analiz"
          : "Sayısal öneriye uygun değil",
      badgeTone: "warning",
      tooltip:
        options.context === "scenario-input"
          ? "Ham değer değiştirilebilir; doğrulanmış QS kalibrasyonu bulunmadığı için sayısal skor etkisi üretilemez."
          : "Bu parametre ham senaryoda değiştirilebilir; ancak doğrulanmış kalibrasyon bulunmadığı için öneri motoru sayısal QS puan artışı üretemez.",
    };
  }

  return null;
}

export function getQsRecommendationParameterGroupNotice(
  parameters: RecommendationMetricDefinition[],
): string | null {
  if (parameters.length === 0 || !parameters.every(hasQsRecommendationMetadata)) {
    return null;
  }

  const isCalibrationOnlyGroup = parameters.every(
    (parameter) =>
      parameter.eligibleForNumericRecommendation !== true &&
      parameter.recommendationStatus === "calibration-required",
  );

  return isCalibrationOnlyGroup ? QS_RAW_PARAMETER_GROUP_NOTICE : null;
}

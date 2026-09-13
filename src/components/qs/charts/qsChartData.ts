import { QS_STOCHASTIC_INDICATOR_DEFINITIONS } from "@/src/config/qs.stochastic";
import type { QsIndicatorCode, QsLensCode, QsLensScores } from "@/src/types/qs";
import type { QsStochasticSimulationResult } from "@/src/types/qs-stochastic";
import type { AppLanguage } from "@/src/i18n/types";

export interface QsLensChartDatum {
  key: QsLensCode; label: string; shortLabel: string;
  current: number | null; scenario: number | null;
  availableCurrent: boolean; availableScenario: boolean;
}
export interface QsIndicatorChartDatum {
  key: QsIndicatorCode;
  label: string;
  shortLabel: string;
  weight: number;
  current: number | null;
  scenario: number | null;
  difference: number | null;
  availableCurrent: boolean;
  availableScenario: boolean;
}

export const createQsLensChartData = ({ current, scenario, language = "tr" }: { current: QsLensScores; scenario: QsLensScores; language?: AppLanguage }): QsLensChartDatum[] => [
  ["researchDiscovery", language === "tr" ? "Araştırma ve Keşif" : "Research and Discovery", language === "tr" ? "Araştırma" : "Research"],
  ["employabilityOutcomes", language === "tr" ? "İstihdam ve Sonuçlar" : "Employability and Outcomes", language === "tr" ? "İstihdam" : "Employability"],
  ["globalEngagement", language === "tr" ? "Küresel Katılım" : "Global Engagement", language === "tr" ? "Küresel Katılım" : "Global"],
  ["learningExperience", language === "tr" ? "Öğrenme Deneyimi" : "Learning Experience", language === "tr" ? "Öğrenme" : "Learning"],
  ["sustainability", language === "tr" ? "Sürdürülebilirlik" : "Sustainability", language === "tr" ? "Sürdürülebilirlik" : "Sustainability"],
].map(([key, label, shortLabel]) => {
  const lens = key as QsLensCode;
  return { key: lens, label, shortLabel, current: current[lens], scenario: scenario[lens],
    availableCurrent: current[lens] !== null, availableScenario: scenario[lens] !== null };
});

const englishIndicatorLabels: Partial<Record<QsIndicatorCode, [string, string]>> = { AR:["Academic Reputation","Academic Rep."], CPF:["Citations per Faculty","Citations"], ER:["Employer Reputation","Employer Rep."], EO:["Employment Outcomes","Employment"], IFR:["International Faculty Ratio","Intl Faculty"], IRN:["International Research Network","Research Network"], ISD:["International Student Diversity","Student Diversity"], ISR:["International Student Ratio","Intl Students"], FSR:["Faculty Student Ratio","Faculty / Student"], SUS:["Sustainability","Sustainability"] };
export const getQsIndicatorDisplayLabel = (code: QsIndicatorCode, language: AppLanguage) => {
  const definition = QS_STOCHASTIC_INDICATOR_DEFINITIONS.find((item) => item.code === code);
  return language === "tr" ? definition?.label ?? code : englishIndicatorLabels[code]?.[0] ?? code;
};

export const createQsIndicatorChartData = ({ current, scenario, language = "tr" }: { current: Record<QsIndicatorCode, number | null>; scenario: Record<QsIndicatorCode, number | null>; language?: AppLanguage }): QsIndicatorChartDatum[] =>
  QS_STOCHASTIC_INDICATOR_DEFINITIONS.map((definition) => {
    const currentScore = current[definition.code];
    const scenarioScore = scenario[definition.code];
    return {
      key: definition.code,
      label: language === "tr" ? definition.label : englishIndicatorLabels[definition.code]?.[0] ?? definition.code,
      shortLabel: language === "tr" ? definition.shortLabel : englishIndicatorLabels[definition.code]?.[1] ?? definition.code,
      weight: definition.officialWeight,
      current: currentScore,
      scenario: scenarioScore,
      difference: currentScore === null || scenarioScore === null
        ? null
        : scenarioScore - currentScore,
      availableCurrent: currentScore !== null,
      availableScenario: scenarioScore !== null,
    };
  });

export const createQsStochasticChartData = (simulation: QsStochasticSimulationResult, language: AppLanguage = "tr"): QsIndicatorChartDatum[] =>
  createQsIndicatorChartData({
    current: Object.fromEntries(QS_STOCHASTIC_INDICATOR_DEFINITIONS.map(({ code }) => [
      code,
      simulation.current.indicators[code].median,
    ])) as Record<QsIndicatorCode, number | null>,
    language,
    scenario: Object.fromEntries(QS_STOCHASTIC_INDICATOR_DEFINITIONS.map(({ code }) => [
      code,
      simulation.scenario.indicators[code].median,
    ])) as Record<QsIndicatorCode, number | null>,
  });

export const createQsStochasticLensChartData = (simulation: QsStochasticSimulationResult, language: AppLanguage = "tr") =>
  createQsLensChartData({
    current: simulation.current.lensScores,
    scenario: simulation.scenario.lensScores,
    language,
  });

export const hasRenderableQsChartData = (data: QsIndicatorChartDatum[]) =>
  data.some((item) => item.weight > 0 && (item.availableCurrent || item.availableScenario));

export const getRenderableQsChartData = (data: QsIndicatorChartDatum[]) =>
  data.filter((item) => item.availableCurrent || item.availableScenario);

export const hasMissingQsChartData = (data: QsIndicatorChartDatum[]) =>
  data.some((item) => !item.availableCurrent || !item.availableScenario);
export const getRenderableQsLensChartData = (data: QsLensChartDatum[]) =>
  data.filter((item) => item.availableCurrent || item.availableScenario);
export const hasRenderableQsLensChartData = (data: QsLensChartDatum[]) =>
  data.some((item) => item.availableCurrent || item.availableScenario);
export const hasMissingQsLensChartData = (data: QsLensChartDatum[]) =>
  data.some((item) => !item.availableCurrent || !item.availableScenario);
export const formatQsChartScore = (value: number | null | undefined, locale = "tr-TR") =>
  value === null || value === undefined || !Number.isFinite(value) ? "—" :
    new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);

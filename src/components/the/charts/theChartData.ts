import type { TheCategoryScores } from "@/src/types/the-calculation";
import type { AppLanguage } from "@/src/i18n/types";
import { getMethodologyCategoryLabel } from "@/src/lib/scenarios/scenario-presentation";

export interface TheCategoryChartDatum {
  key: "teaching" | "researchEnvironment" | "researchQuality" | "internationalOutlook" | "industry";
  label: string;
  shortLabel: string;
  current: number | null;
  scenario: number | null;
}

export const createTheCategoryChartData = ({ current, scenario, language = "tr" }: { current: TheCategoryScores; scenario: TheCategoryScores; language?: AppLanguage }): TheCategoryChartDatum[] => [
  { key: "teaching", label: getMethodologyCategoryLabel("THE", "teaching", language), shortLabel: getMethodologyCategoryLabel("THE", "teaching", language), current: current.teaching, scenario: scenario.teaching },
  { key: "researchEnvironment", label: getMethodologyCategoryLabel("THE", "researchEnvironment", language), shortLabel: language === "tr" ? "Araştırma Ort." : "Research Env.", current: current.researchEnvironment, scenario: scenario.researchEnvironment },
  { key: "researchQuality", label: getMethodologyCategoryLabel("THE", "researchQuality", language), shortLabel: language === "tr" ? "Araştırma Kal." : "Research Qual.", current: current.researchQuality, scenario: scenario.researchQuality },
  { key: "internationalOutlook", label: getMethodologyCategoryLabel("THE", "internationalOutlook", language), shortLabel: language === "tr" ? "Uluslararası" : "International", current: current.internationalOutlook, scenario: scenario.internationalOutlook },
  { key: "industry", label: getMethodologyCategoryLabel("THE", "industry", language), shortLabel: getMethodologyCategoryLabel("THE", "industry", language), current: current.industry, scenario: scenario.industry },
];

export const hasCompleteTheCategoryChartData = (data: TheCategoryChartDatum[]): boolean =>
  data.every(({ current, scenario }) => current !== null && scenario !== null && Number.isFinite(current) && Number.isFinite(scenario));

export const formatChartScore = (value: number | null | undefined, locale = "tr-TR"): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? "—"
    : new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);

import type {
  TheAggregateResult,
  TheCategoryScores,
  TheIndicatorCode,
  TheIndicatorScoreResult,
} from "@/src/types/the-calculation";

type WeightedIndicator = {
  code: TheIndicatorCode;
  weight: number;
};

const categoryIndicators: Record<keyof TheCategoryScores, WeightedIndicator[]> = {
  teaching: [
    { code: "TREP", weight: 15 },
    { code: "SSR", weight: 4.5 },
    { code: "DBR", weight: 2 },
    { code: "DSR", weight: 5.5 },
    { code: "II", weight: 2.5 },
  ],
  researchEnvironment: [
    { code: "RREP", weight: 18 },
    { code: "RI", weight: 5.5 },
    { code: "RP", weight: 5.5 },
  ],
  researchQuality: [
    { code: "CI", weight: 15 },
    { code: "RS", weight: 5 },
    { code: "RE", weight: 5 },
    { code: "RINF", weight: 5 },
  ],
  industry: [
    { code: "IND", weight: 2 },
    { code: "PAT", weight: 2 },
  ],
  internationalOutlook: [
    { code: "IS", weight: 2.5 },
    { code: "IF", weight: 2.5 },
    { code: "IC", weight: 2.5 },
  ],
};

const categoryWeights: Record<keyof TheCategoryScores, number> = {
  teaching: 29.5,
  researchEnvironment: 29,
  researchQuality: 30,
  industry: 4,
  internationalOutlook: 7.5,
};

const totalIndicators: WeightedIndicator[] = [
  ...categoryIndicators.teaching,
  ...categoryIndicators.researchEnvironment,
  ...categoryIndicators.researchQuality,
  ...categoryIndicators.internationalOutlook,
  { code: "SA", weight: 0 },
  ...categoryIndicators.industry,
];

const isUsableScore = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value >= 0 && value <= 100;

export const calculateWeightedCategoryScore = (
  items: Array<{ score: number | null; weight: number }>,
  categoryWeight: number,
): number | null => {
  if (categoryWeight <= 0 || items.some((item) => !isUsableScore(item.score))) {
    return null;
  }

  return items.reduce((sum, item) => sum + (item.score as number) * item.weight, 0) /
    categoryWeight;
};

export function calculateTheAggregateScores(
  indicatorScores: Record<TheIndicatorCode, TheIndicatorScoreResult>,
): TheAggregateResult {
  const categoryScores = Object.fromEntries(
    (Object.keys(categoryIndicators) as Array<keyof TheCategoryScores>).map((category) => [
      category,
      calculateWeightedCategoryScore(
        categoryIndicators[category].map(({ code, weight }) => ({
          score: indicatorScores[code].score,
          weight,
        })),
        categoryWeights[category],
      ),
    ]),
  ) as unknown as TheCategoryScores;

  const requiredIndicators = totalIndicators.filter(({ weight }) => weight > 0);
  const missingIndicators = requiredIndicators
    .filter(({ code }) => !isUsableScore(indicatorScores[code].score))
    .map(({ code }) => code);

  const totalScore =
    missingIndicators.length === 0
      ? requiredIndicators.reduce(
          (sum, { code, weight }) =>
            sum + (indicatorScores[code].score as number) * (weight / 100),
          0,
        )
      : null;

  return {
    totalScore,
    categoryScores,
    complete: missingIndicators.length === 0,
    missingIndicators,
    warnings:
      missingIndicators.length === 0
        ? []
        : [
            `Genel skor için normalize edilmemiş göstergeler: ${missingIndicators.join(", ")}.`,
          ],
  };
}

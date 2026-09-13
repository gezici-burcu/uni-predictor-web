import type { GreenMetricCategoryDefinition } from "@/src/types/greenmetric";

export const greenMetricCategoryMeta = [
  { code: "SI", title: "Yerleşim ve Altyapı", weight: 11, indicatorCount: 8, maxScore: 1100 },
  { code: "EC", title: "Enerji ve İklim Değişikliği", weight: 20, indicatorCount: 10, maxScore: 2000 },
  { code: "WS", title: "Atık", weight: 17, indicatorCount: 6, maxScore: 1700 },
  { code: "WR", title: "Su", weight: 11, indicatorCount: 6, maxScore: 1100 },
  { code: "TR", title: "Ulaşım", weight: 17, indicatorCount: 8, maxScore: 1700 },
  { code: "ED", title: "Eğitim ve Araştırma", weight: 13, indicatorCount: 10, maxScore: 1300 },
  { code: "GD", title: "Yönetişim ve Dijitalleşme", weight: 11, indicatorCount: 12, maxScore: 1100 },
] as const;

const categoryDetails = {
  SI: { id: "site-infrastructure", description: "Kampüsün fiziksel yapısı, açık alanları ve altyapısı" },
  EC: { id: "energy-climate", description: "Enerji kullanımı, yenilenebilir enerji ve iklim çalışmaları" },
  WS: { id: "waste", description: "Atık azaltımı, geri dönüşüm ve atık işleme uygulamaları" },
  WR: { id: "water", description: "Su tasarrufu, geri dönüşüm ve su yönetimi" },
  TR: { id: "transportation", description: "Kampüs ulaşımı, araç kullanımı ve yaya erişimi" },
  ED: { id: "education-research", description: "Sürdürülebilirlik eğitimi, araştırmaları ve toplumsal faaliyetler" },
  GD: { id: "governance-digitalization", description: "Sürdürülebilirlik yönetişimi, etik, raporlama ve dijitalleşme" },
} as const;

export const greenMetricCategories: GreenMetricCategoryDefinition[] =
  greenMetricCategoryMeta.map((category) => ({
    ...category,
    ...categoryDetails[category.code],
  }));

export const TOTAL_CATEGORY_COUNT = greenMetricCategoryMeta.length;
export const TOTAL_INDICATOR_COUNT = greenMetricCategoryMeta.reduce(
  (total, category) => total + category.indicatorCount,
  0,
);

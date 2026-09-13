import { RECOMMENDATION_SCORE_EPSILON } from "./presentation";

export interface RecommendationCategoryImpact {
  categoryId: string;
  label: string;
  difference: number;
}

export function buildUserChangeImpactExplanation({
  metricId,
  parameterLabel,
  categoryImpacts,
  valueDifference,
}: {
  metricId: string;
  parameterLabel: string;
  categoryImpacts: RecommendationCategoryImpact[];
  valueDifference?: number;
}) {
  const changed = categoryImpacts.filter(
    (impact) => Math.abs(impact.difference) > RECOMMENDATION_SCORE_EPSILON,
  );
  if (!changed.length) {
    return "Bu değişiklik hesaplama motorunda ölçülebilir bir kategori skoru farkı oluşturmadı.";
  }

  const categoryNames = joinTurkishList(changed.map((impact) => impact.label));
  const only = changed.length === 1 ? changed[0] : null;
  const direction = only
    ? only.difference > RECOMMENDATION_SCORE_EPSILON ? "artırmıştır" : "azaltmıştır"
    : null;

  if (
    metricId === "the.internationalOutlook.internationalAcademicStaffFte" &&
    only?.categoryId === "internationalOutlook"
  ) {
    const quantityDirection = (valueDifference ?? only.difference) > 0 ? "artış" : "azalış";
    const ratioDirection = only.difference > 0 ? "yükselterek" : "düşürerek";
    return `Uluslararası akademik personel sayısındaki ${quantityDirection}, uluslararası akademik personel oranını ${ratioDirection} ${only.label} kategori skorunu ${direction}.`;
  }

  if (
    metricId === "the.teaching.bachelorGraduates" &&
    only?.categoryId === "teaching"
  ) {
    return `Lisans mezunu sayısındaki değişiklik, mevcut THE hesaplama motorundaki öğretim göstergelerini etkileyerek ${only.label} kategori skorunu ${direction}.`;
  }

  if (metricId === "the.common.academicStaffFte") {
    return changed.length === 1
      ? `Akademik personel sayısındaki değişiklik, mevcut THE hesaplama motorundaki kurumsal göstergeleri etkileyerek ${categoryNames} kategori skorunu ${direction}.`
      : `Akademik personel sayısındaki değişiklik, mevcut THE hesaplama motorundaki kurumsal göstergeleri etkileyerek ${categoryNames} kategori skorlarını değiştirmiştir.`;
  }

  return changed.length === 1
    ? `${parameterLabel} değişikliği, ${categoryNames} kategori skorunu ${direction}.`
    : `${parameterLabel} değişikliği; ${categoryNames} kategori skorlarını etkilemiştir.`;
}

function joinTurkishList(items: string[]) {
  if (items.length < 2) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ve ${items.at(-1)}`;
}

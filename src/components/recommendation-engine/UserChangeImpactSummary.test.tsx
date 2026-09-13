import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RecommendationAdapter } from "@/src/lib/recommendation-engine";
import { UserChangeImpactSummary } from "./UserChangeImpactSummary";
import { createRecommendationAdapters } from "@/src/lib/recommendation-engine";
import { methodologyRegistry } from "@/src/lib/baseline/methodologyRegistry";

const adapter: RecommendationAdapter = {
  id: "the",
  scoreMinimum: 0,
  scoreMaximum: 100,
  initialValues: { staff: 100 },
  definitions: [{
    metricId: "staff",
    engineField: "staff",
    parameterKind: "institutionalInput",
    isEditableInput: true,
    isRecommendationCandidate: true,
    label: "Akademik Personel Sayısı",
    categoryId: "teaching",
    kind: "headcount",
    direction: "increase-only",
    effort: "medium",
    risk: "low",
    confidence: "high",
    controllability: "high",
    evidenceRequired: false,
    affectsTotalScore: true,
    defaultLocked: false,
    technicalMinimum: 0,
    technicalMaximum: 1_000,
    step: 1,
  }],
  calculate: (values) => {
    const staff = values.staff as number;
    return { score: staff / 10, categories: { teaching: staff / 10, industry: 5 } };
  },
  getDisplayedScore: (result) => (result as { score: number }).score,
  getCategoryScores: (result) =>
    (result as { categories: Record<string, number> }).categories,
};

describe("UserChangeImpactSummary", () => {
  it("shows only fixed user changes and only categories that actually changed", () => {
    const html = renderToStaticMarkup(
      <UserChangeImpactSummary
        adapter={adapter}
        language="tr"
        inputs={[
          { parameterId: "staff", selected: true, inputMode: "value", value: 80 },
          { parameterId: "range", selected: true, inputMode: "range", min: 400, max: 450 },
          { parameterId: "unused", selected: false, inputMode: "value", value: 1 },
        ]}
      />,
    );
    expect(html).toContain("Kullanıcı Değişikliğinin Etkisi");
    expect(html).toContain("Akademik Personel Sayısı");
    expect(html).toContain("Öğretim");
    expect(html).not.toContain("industry");
    expect(html).toContain("-2,00");
    expect(html).toContain("Öneri Arama Kısıtları");
    expect(html).toContain("400–450");
  });

  it("shows QS raw-ratio precision and calculation-engine score impact", () => {
    const qsValues = {
      ...methodologyRegistry.qs.defaults,
      "academicStaff.fullTime": 1_061,
      "academicStaff.partTime": 624,
      "academicStaff.total": 1_685,
      "undergraduateStudents.fullTime": 22_648,
      "undergraduateStudents.partTime": 3_363,
      "undergraduateStudents.total": 26_011,
      "graduatePostgraduateStudents.fullTime": 6_242,
      "graduatePostgraduateStudents.partTime": 1_839,
      "graduatePostgraduateStudents.total": 8_081,
      "internationalAcademicStaff.fullTime": 68,
      "internationalAcademicStaff.partTime": 0,
      "internationalAcademicStaff.total": 68,
      "undergraduateInternationalStudents.fullTime": 0,
      "undergraduateInternationalStudents.partTime": 0,
      "undergraduateInternationalStudents.total": 0,
      "graduatePostgraduateInternationalStudents.fullTime": 0,
      "graduatePostgraduateInternationalStudents.partTime": 0,
      "graduatePostgraduateInternationalStudents.total": 0,
    };
    const qsAdapter = createRecommendationAdapters({
      the: methodologyRegistry.the.defaults,
      qs: qsValues,
      "ui-greenmetric": methodologyRegistry["ui-greenmetric"].defaults,
    }).qs;
    const html = renderToStaticMarkup(
      <UserChangeImpactSummary
        adapter={qsAdapter}
        language="tr"
        inputs={[{
          parameterId: "academicStaff.total",
          selected: true,
          inputMode: "value",
          value: 1_800,
        }]}
      />,
    );
    expect(html).toContain("Toplam skor etkisi");
    expect(html).toContain("—");
    expect(html).not.toContain("normalize edilmiş");
    expect(html).toMatch(/FSR[\s\S]*\d,\d{6}/);
    expect(html).toMatch(/IFR[\s\S]*\d,\d{6}/);
    expect(html).toContain("Fark:");
  });
});

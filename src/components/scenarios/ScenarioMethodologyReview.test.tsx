import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createScenarioReviewCopy, ScenarioSnapshotReview } from "./ScenarioMethodologyReview";
import type { SavedScenarioSnapshot } from "@/src/types/saved-scenario";

const scenario: SavedScenarioSnapshot = {
  id: "source", name: "Akademik Personel Artışı", methodology: "THE", source: "manual-scenario",
  institutionalDataYear: "2024", scoreReferenceEdition: "2026", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  currentScore: 30, scenarioScore: 34.05, scoreDifference: 4.05, currentRankBand: null, scenarioRankBand: "501–600", calculationStatus: "complete",
  warnings: ["Snapshot uyarısı"], changedMetrics: [{ parameterId: "the.common.academicStaffFte", label: "the.common.academicStaffFte", currentValue: 10, scenarioValue: 12 }],
  currentCategoryScores: { teaching: 20 }, scenarioCategoryScores: { teaching: 22 }, currentIndicatorScores: { TREP: 10 }, scenarioIndicatorScores: { TREP: 11 }, rawCalculationDetails: null, recommendationContext: null,
};

describe("scenario methodology review", () => {
  it("renders stored snapshot results without invoking a calculation engine", () => {
    const html = renderToStaticMarkup(<ScenarioSnapshotReview scenario={scenario} />);
    expect(html).toContain("Kayıtlı senaryo inceleniyor: Akademik Personel Artışı");
    expect(html).toContain("34,05");
    expect(html).toContain("Öğretim");
    expect(html).toContain("Akademik Personel Sayısı (FTE)");
    expect(html).not.toContain("the.common.academicStaffFte");
  });
  it("creates an independent new snapshot without mutating or overwriting the source", () => {
    const before = structuredClone(scenario);
    const copy = createScenarioReviewCopy(scenario, "Yeni Kopya", "copy", "2026-02-01T00:00:00.000Z");
    copy.changedMetrics[0].scenarioValue = 999;
    expect(scenario).toEqual(before);
    expect(copy.id).toBe("copy");
    expect(copy.name).toBe("Yeni Kopya");
    expect(copy.updatedAt).not.toBe(scenario.updatedAt);
  });
  it("renders GreenMetric snapshot parameters with localized labels and units", () => {
    const greenMetricScenario: SavedScenarioSnapshot = {
      ...scenario,
      id: "greenmetric",
      name: "Yeşil Kampüs",
      methodology: "GREENMETRIC",
      scoreReferenceEdition: "UI GreenMetric 2026",
      changedMetrics: [{
        parameterId: "greenmetric.common.totalCampusAreaM2",
        label: "greenmetric.common.totalCampusAreaM2",
        currentValue: 100_000,
        scenarioValue: 110_000,
      }],
      currentCategoryScores: { SI: null, EC: null, WS: null, WR: null, TR: null, ED: null, GD: null },
      scenarioCategoryScores: { SI: null, EC: null, WS: null, WR: null, TR: null, ED: null, GD: null },
    };

    const html = renderToStaticMarkup(<ScenarioSnapshotReview scenario={greenMetricScenario} />);
    expect(html).toContain("Toplam Kampüs Alanı");
    expect(html).toContain("100.000 m²");
    expect(html).toContain("110.000 m²");
    expect(html).not.toContain("Total Campus Area M2");
    expect(html).not.toContain("greenmetric.common.totalCampusAreaM2");
  });
});

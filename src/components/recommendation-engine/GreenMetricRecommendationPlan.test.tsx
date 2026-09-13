import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppProviders } from "@/src/contexts/AppProviders";
import { methodologyRegistry } from "@/src/lib/baseline/methodologyRegistry";
import { createRecommendationAdapters } from "@/src/lib/recommendation-engine";
import type {
  RecommendationEngineResult,
  RecommendationMetricChange,
  RecommendationPlan,
} from "@/src/lib/recommendation-engine";
import { RecommendationMetricScope } from "./RecommendationMetricScope";
import {
  GreenMetricRecommendationEmptyState,
  GreenMetricRecommendationPlan,
  formatGreenMetricRecommendationValue,
} from "./GreenMetricRecommendationPlan";

const adapter = createRecommendationAdapters({
  the: methodologyRegistry.the.defaults,
  qs: methodologyRegistry.qs.defaults,
  "ui-greenmetric": methodologyRegistry["ui-greenmetric"].defaults,
})["ui-greenmetric"];

function change(overrides: Partial<RecommendationMetricChange>): RecommendationMetricChange {
  return {
    metricId: "greenmetric.tr.dailyIncomingCombustionCars",
    metricName: "Günlük Gelen İçten Yanmalı Otomobil",
    label: { tr: "Günlük Gelen İçten Yanmalı Otomobil", en: "Daily incoming combustion cars" },
    categoryId: "TR",
    currentValue: 31_000_000,
    recommendedValue: 24_000_000,
    proposedValue: 24_000_000,
    absoluteChange: -7_000_000,
    percentageChange: -22.58,
    scoreBeforeChange: 6_000,
    scoreAfterChange: 6_050,
    incrementalScoreImpact: 50,
    normalizedChange: 0.2,
    changeCost: 0.2,
    effort: "medium",
    risk: "low",
    confidence: "medium",
    direction: "decrease-only",
    evidenceRequired: true,
    indicatorCode: "TR1",
    currentIndicatorScore: 100,
    proposedIndicatorScore: 150,
    scoreGain: 50,
    currentCategoryScore: 900,
    proposedCategoryScore: 950,
    currentTotalScore: 6_000,
    proposedTotalScore: 6_050,
    targetThreshold: 0.15,
    thresholdDirection: "decrease",
    changedSourceMetricIds: ["greenmetric.tr.dailyIncomingCombustionCars"],
    ...overrides,
  };
}

const changes = [
  change({}),
  change({
    metricId: "greenmetric.ed.sustainabilityEventCount",
    metricName: "Sürdürülebilirlik Etkinliği Sayısı",
    label: { tr: "Sürdürülebilirlik Etkinliği Sayısı", en: "Sustainability event count" },
    categoryId: "ED",
    indicatorCode: "ED4",
    currentValue: 18,
    recommendedValue: 21,
    proposedValue: 21,
    targetThreshold: 21,
    thresholdDirection: "increase",
    changedSourceMetricIds: ["greenmetric.ed.sustainabilityEventCount"],
  }),
  change({
    metricId: "greenmetric.gd.sustainabilityReportStatus",
    metricName: "Sürdürülebilirlik Raporu Durumu",
    label: { tr: "Sürdürülebilirlik Raporu Durumu", en: "Sustainability report status" },
    categoryId: "GD",
    indicatorCode: "GD3",
    currentValue: "2",
    recommendedValue: "4",
    proposedValue: "4",
    absoluteChange: null,
    percentageChange: null,
    targetThreshold: "4",
    thresholdDirection: "ordered-level",
    changedSourceMetricIds: ["greenmetric.gd.sustainabilityReportStatus"],
  }),
];

const plan: RecommendationPlan = {
  strategy: "balanced",
  currentScore: 6_000,
  constrainedStartScore: 6_000,
  targetScore: 6_500,
  recommendedScore: 6_150,
  reachedTarget: false,
  changes,
  totalChangeCost: 1,
  resultingValues: {},
  currentCategoryScores: {},
  constrainedCategoryScores: {},
  resultingCategoryScores: {},
  verified: true,
};

describe("GreenMetric recommendation UI", () => {
  it("keeps the two parameter scopes separate and groups raw fields by category", () => {
    const html = renderToStaticMarkup(
      <AppProviders>
        <RecommendationMetricScope
          definitions={adapter.definitions}
          currentValues={adapter.initialValues}
          inputs={{}}
          errors={{}}
          onChange={() => undefined}
          recommendationParameterIds={[]}
          onRecommendationParameterIdsChange={() => undefined}
        />
      </AppProviders>,
    );
    expect(html).toContain('aria-controls="greenmetric-value-parameters-content"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-controls="greenmetric-recommendation-parameters-content"');
    expect(html).toContain('aria-expanded="false"');
    for (const category of ["SI", "EC", "WS", "WR", "TR", "ED", "GD"]) {
      expect(html).toContain(`>${category}<`);
    }
    expect(html).not.toMatch(/score[^<]*type="checkbox"/i);
  });

  it("renders reverse numeric, integer count, semantic ordered-level, threshold and score result data", () => {
    const html = renderToStaticMarkup(
      <AppProviders>
        <GreenMetricRecommendationPlan
          plan={plan}
          definitions={adapter.definitions}
          locale="tr-TR"
          language="tr"
          t={(key) => key}
        />
      </AppProviders>,
    );
    expect(html).toContain("31.000.000 araç");
    expect(html).toContain("24.000.000 araç");
    expect(html).toContain("18 etkinlik");
    expect(html).toContain("21 etkinlik");
    expect(html).toContain("Hazırlık aşamasında");
    expect(html).toContain("Kamuya açık ve zaman zaman yayımlanıyor");
    expect(html).toContain("↓ 0,15");
    expect(html).toContain("+50");
    expect(html).toContain("100 / 200");
    expect(html).toContain("6.000");
    expect(html).toContain("6.050");
  });

  it("formats integer-count values without decimals", () => {
    const definition = adapter.definitions.find((item) => item.metricId === "greenmetric.ed.sustainabilityEventCount");
    expect(formatGreenMetricRecommendationValue({ value: 21, definition, locale: "tr-TR" })).toBe("21 etkinlik");
  });

  it("uses result diagnostics for missing baseline and does not invent a recommendation", () => {
    const result = {
      methodology: "ui-greenmetric",
      currentScore: 0,
      constrainedStartScore: 0,
      targetScore: 100,
      planningHorizon: "6-months",
      strategy: "balanced",
      reachability: { currentScore: 0, constrainedStartScore: 0, targetScore: 100, maximumReachableScore: 0, reachable: false, remainingGap: 100, limitingFactors: [], searchLimitReached: false },
      primaryPlan: null,
      alternativePlans: [],
      warnings: [],
      candidateDiagnostics: [{ metricId: "greenmetric.ed.sustainabilityEventCount", status: "missing-baseline-data" }],
      evaluationCount: 0,
      durationMs: 0,
    } satisfies RecommendationEngineResult;
    const html = renderToStaticMarkup(
      <GreenMetricRecommendationEmptyState
        result={result}
        inputs={[{ parameterId: "greenmetric.ed.sustainabilityEventCount", selected: true, inputMode: "range", min: 0, max: 100 }]}
        recommendationParameterIds={[]}
        t={(key) => key}
      />,
    );
    expect(html).toContain("recommendationUi.greenMetricEmptyMissingBaseline");
    expect(html).not.toContain("data-greenmetric-recommendation-card");
  });
});

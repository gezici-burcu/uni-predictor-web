import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RecommendationEngineResult } from "@/src/lib/recommendation-engine";
import { RecommendationSummary } from "./RecommendationSummary";

function makeResult(constrainedStartScore: number, recommendedScore: number) {
  return {
    methodology: "the",
    currentScore: 36.27,
    constrainedStartScore,
    targetScore: 39.9,
    planningHorizon: "6-months",
    strategy: "balanced",
    reachability: {
      currentScore: 36.27,
      constrainedStartScore,
      targetScore: 39.9,
      maximumReachableScore: recommendedScore,
      reachable: recommendedScore >= 39.9,
      remainingGap: Math.max(0, 39.9 - recommendedScore),
      limitingFactors: [],
      searchLimitReached: false,
    },
    primaryPlan: null,
    alternativePlans: [],
    warnings: [],
    evaluationCount: 0,
    durationMs: 0,
  } satisfies RecommendationEngineResult;
}

describe("RecommendationSummary outcome labels", () => {
  it("renders the limited-improvement label without the legacy partial wording", () => {
    const html = renderToStaticMarkup(
      <RecommendationSummary
        result={makeResult(28.1, 28.99)}
        locale="tr-TR"
        t={(key) => key}
      />,
    );
    expect(html).toContain("Sınırlı iyileşme sağlandı, hedefe ulaşılamadı");
    expect(html).not.toContain("Hedefe kısmen yaklaşıldı");
    expect(html).toContain("28,99");
    expect(html).toContain("10,91");
  });

  it("renders the no-positive and reached labels", () => {
    expect(renderToStaticMarkup(
      <RecommendationSummary result={makeResult(30, 30)} locale="tr-TR" t={(key) => key} />,
    )).toContain("Pozitif iyileşme üretilemedi");
    expect(renderToStaticMarkup(
      <RecommendationSummary result={makeResult(30, 40)} locale="tr-TR" t={(key) => key} />,
    )).toContain("Hedefe ulaşıldı");
  });

  it("separates unavailable QS projected score from an unchanged numeric score", () => {
    const result = {
      ...makeResult(36.27, 36.27),
      methodology: "qs" as const,
      currentScore: 11.8077670323,
      constrainedStartScore: 11.8077670323,
      targetScore: 14,
      qsCapability: {
        status: "raw-impact-only" as const,
        constrainedStartScoreAvailable: true,
        projectedScoreAvailable: false,
        rawChanges: [{
          metricId: "academicStaff.total",
          label: "Akademik Personel Sayısı",
          currentValue: 1685,
          candidateValue: 1727,
          indicatorChanges: [],
        }],
        resultingValues: {},
      },
    } satisfies RecommendationEngineResult;
    const html = renderToStaticMarkup(
      <RecommendationSummary
        result={result}
        locale="tr-TR"
        t={(key) => key === "recommendationUi.qsRawImpactOnlyMessage"
          ? "Ham etki hesaplanıyor; genel skor hesaplanamıyor."
          : key}
        rawAnalysisOnly
      />,
    );
    expect(html).toContain("11,81");
    expect(html).toContain("Öneriler Sonrası Tahmini Skor");
    expect(html).toContain("Hedefe kalan fark");
    expect(html.match(/>—</g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain("Ham etki hesaplanıyor; genel skor hesaplanamıyor.");
    expect(html).not.toContain("Tahmini ulaşılabilir en yüksek skor");
  });

  it("renders a controlled QS message instead of a synthetic zero score", () => {
    const result = {
      ...makeResult(0, 0),
      methodology: "qs" as const,
      calculationAvailability: "score-unavailable" as const,
      calculationUnavailableReason: "constrained-score-unavailable" as const,
    } satisfies RecommendationEngineResult;
    const html = renderToStaticMarkup(
      <RecommendationSummary
        result={result}
        locale="tr-TR"
        t={(key) => key === "recommendationUi.analysisUnavailable"
          ? "Öneri üretilemedi"
          : key === "recommendationUi.qsScoreUnavailableControlled"
            ? "QS için yeterli kalibrasyon bulunmadığından öneri üretilemedi."
            : key}
      />,
    );

    expect(html).toContain("Öneri üretilemedi");
    expect(html).toContain("QS için yeterli kalibrasyon bulunmadığından öneri üretilemedi.");
    expect(html).not.toContain("0,00");
  });

  it("separates indicators excluded from a partial QS starting score", () => {
    const result = {
      ...makeResult(11.9, 12.1),
      methodology: "qs" as const,
      qsCapability: {
        status: "score-computable" as const,
        constrainedStartScoreAvailable: true,
        projectedScoreAvailable: true,
        startScoreCoverage: {
          isPartial: true,
          includedIndicatorCodes: ["AR", "CPF", "ER", "FSR"],
          excludedIndicatorCodes: ["EO", "IFR"],
          includedWeight: 0.9,
          excludedWeight: 0.1,
        },
        rawChanges: [],
        resultingValues: {},
      },
    } satisfies RecommendationEngineResult;
    const html = renderToStaticMarkup(
      <RecommendationSummary
        result={result}
        locale="tr-TR"
        t={(key) => key === "recommendationUi.qsPartialStartScoreTitle"
          ? "Kısmi başlangıç skoru kapsamı"
          : key === "recommendationUi.qsPartialStartScoreDescription"
            ? "Başlangıç skoru %{coverage} kapsamındadır. Ayrıştırılan: {excluded}."
            : key}
      />,
    );

    expect(html).toContain("Kısmi başlangıç skoru kapsamı");
    expect(html).toContain("%90");
    expect(html).toContain("EO, IFR");
  });

  it("renders rank-target score and band data from the engine result", () => {
    const estimate = { exactRank: null, band: "601–800", available: true, approximate: true };
    const result = {
      ...makeResult(36.27, 40),
      targetMode: "rankRange" as const,
      targetScore: null,
      targetRankRange: { bestRank: 601, worstRank: 800 },
      rankTarget: {
        currentEvaluation: {
          status: "notReached" as const,
          match: "none" as const,
          estimate: { ...estimate, band: "801–1000" },
          targetRange: { bestRank: 601, worstRank: 800 },
        },
        constrainedStartEvaluation: {
          status: "notReached" as const,
          match: "none" as const,
          estimate: { ...estimate, band: "801–1000" },
          targetRange: { bestRank: 601, worstRank: 800 },
        },
        recommendedEvaluation: {
          status: "reached" as const,
          match: "inside" as const,
          estimate,
          targetRange: { bestRank: 601, worstRank: 800 },
        },
        alreadySatisfied: false,
      },
    } satisfies RecommendationEngineResult;
    const html = renderToStaticMarkup(
      <RecommendationSummary result={result} locale="tr-TR" t={(key) => key} />,
    );
    expect(html).toContain("801–1000");
    expect(html).toContain("601–800");
    expect(html).toContain("36,27 → 40,00");
    expect(html).toContain("recommendationUi.rankResultTitle");
    expect(html).toContain("recommendationUi.scoreChange");
    expect(html).toContain("recommendationUi.changedParameterCount");
    expect(html).toContain("recommendationUi.rankReached");
  });

  it("shows a nearest-rank warning instead of claiming success for overlap or no solution", () => {
    const estimate = { exactRank: null, band: "801–1000", available: true, approximate: true };
    const result = {
      ...makeResult(36.27, 37.04),
      targetMode: "rankRange" as const,
      targetScore: null,
      targetRankRange: { bestRank: 601, worstRank: 800 },
      rankTarget: {
        currentEvaluation: { status: "notReached" as const, match: "none" as const, estimate, targetRange: { bestRank: 601, worstRank: 800 } },
        constrainedStartEvaluation: { status: "notReached" as const, match: "none" as const, estimate, targetRange: { bestRank: 601, worstRank: 800 } },
        recommendedEvaluation: { status: "notReached" as const, match: "none" as const, estimate, targetRange: { bestRank: 601, worstRank: 800 } },
        alreadySatisfied: false,
      },
    } satisfies RecommendationEngineResult;
    const html = renderToStaticMarkup(
      <RecommendationSummary result={result} locale="tr-TR" t={(key) => key} />,
    );
    expect(html).toContain("recommendationUi.closestProjectedRank");
    expect(html).toContain("recommendationUi.rankNotReached");
    expect(html).toContain("text-amber-700");
  });

  it("explains QS raw-only rank unavailability instead of reporting missing baseline rank data", () => {
    const targetRange = { bestRank: 601, worstRank: 800 };
    const unavailable = { exactRank: null, band: null, available: false, approximate: true };
    const baseline = { exactRank: 1300.5, band: "1201–1400", available: true, approximate: true };
    const result = {
      ...makeResult(11.8077670323, 11.8077670323),
      methodology: "qs" as const,
      currentScore: 11.8077670323,
      constrainedStartScore: 11.8077670323,
      targetMode: "rankRange" as const,
      targetScore: null,
      targetRankRange: targetRange,
      rankTarget: {
        currentEvaluation: { status: "notReached" as const, match: "none" as const, estimate: baseline, targetRange },
        constrainedStartEvaluation: { status: "notReached" as const, match: "none" as const, estimate: baseline, targetRange },
        recommendedEvaluation: { status: "unavailable" as const, match: "unavailable" as const, estimate: unavailable, targetRange },
        alreadySatisfied: false,
      },
      qsCapability: {
        status: "raw-impact-only" as const,
        constrainedStartScoreAvailable: true,
        projectedScoreAvailable: false,
        rawChanges: [],
        resultingValues: {},
      },
    } satisfies RecommendationEngineResult;
    const html = renderToStaticMarkup(
      <RecommendationSummary result={result} locale="tr-TR" t={(key) => key} />,
    );
    expect(html).toContain("recommendationUi.qsRankRecommendationUnavailableExplanation");
    expect(html).not.toContain("recommendationUi.rankTargetUnavailable");
  });

  it("distinguishes an already exceeded target without rendering recommendations", () => {
    const estimate = { exactRank: null, band: "401–600", available: true, approximate: true };
    const result = {
      ...makeResult(40, 40),
      targetMode: "rankRange" as const,
      targetScore: null,
      targetRankRange: { bestRank: 601, worstRank: 800 },
      rankTarget: {
        currentEvaluation: { status: "exceeded" as const, match: "better" as const, estimate, targetRange: { bestRank: 601, worstRank: 800 } },
        constrainedStartEvaluation: { status: "exceeded" as const, match: "better" as const, estimate, targetRange: { bestRank: 601, worstRank: 800 } },
        recommendedEvaluation: null,
        alreadySatisfied: true,
      },
    } satisfies RecommendationEngineResult;
    const html = renderToStaticMarkup(
      <RecommendationSummary result={result} locale="tr-TR" t={(key) => key} />,
    );
    expect(html).toContain("recommendationUi.alreadyExceededRankTarget");
    expect(html).toContain("text-emerald-700");
  });

  it("labels a baseline already inside the target range without suggesting a change", () => {
    const estimate = { exactRank: null, band: "601–800", available: true, approximate: true };
    const result = {
      ...makeResult(38, 38),
      targetMode: "rankRange" as const,
      targetScore: null,
      targetRankRange: { bestRank: 601, worstRank: 800 },
      rankTarget: {
        currentEvaluation: { status: "reached" as const, match: "inside" as const, estimate, targetRange: { bestRank: 601, worstRank: 800 } },
        constrainedStartEvaluation: { status: "reached" as const, match: "inside" as const, estimate, targetRange: { bestRank: 601, worstRank: 800 } },
        recommendedEvaluation: null,
        alreadySatisfied: true,
      },
    } satisfies RecommendationEngineResult;
    const html = renderToStaticMarkup(
      <RecommendationSummary result={result} locale="tr-TR" t={(key) => key} />,
    );
    expect(html).toContain("recommendationUi.alreadyMetRankTarget");
    expect(html).toContain("recommendationUi.rankAlreadySatisfiedDescription");
    expect(html).not.toContain("recommendationUi.rankRecommendationDescription");
  });
});

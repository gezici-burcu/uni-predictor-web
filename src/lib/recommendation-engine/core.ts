import {
  RECOMMENDATION_CONTROLLABILITY_FACTORS,
  RECOMMENDATION_EFFORT_FACTORS,
  RECOMMENDATION_REALISM_LIMITS,
  RECOMMENDATION_RISK_FACTORS,
  RECOMMENDATION_SEARCH_LIMITS,
} from "@/src/config/recommendation-engine/realism-limits";
import { RECOMMENDATION_STRATEGY_PROFILES } from "@/src/config/recommendation-engine/strategy-profiles";
import type {
  RecommendationAdapter,
  RecommendationEngineResult,
  RecommendationMetricCandidate,
  RecommendationMetricChange,
  RecommendationMetricConstraint,
  RecommendationMetricDefinition,
  RecommendationPlan,
  RecommendationPlanningHorizon,
  RecommendationRankTargetEvaluation,
  RecommendationStrategy,
  RecommendationTarget,
} from "./types";
import { getGreenMetricRelationErrors } from "@/src/utils/greenmetric-derived";
import type { GreenMetricValues } from "@/src/types/greenmetric";
import {
  evaluateRankTarget,
  getRankTargetDistance,
  UNAVAILABLE_RECOMMENDATION_RANK_ESTIMATE,
} from "./rank-target";

const round = (value: number, step: number) => Math.round(value / step) * step;

export function generateMetricCandidates({
  currentValue,
  metricDefinition: definition,
  planningHorizon,
  constraint,
}: {
  currentValue: unknown;
  metricDefinition: RecommendationMetricDefinition;
  planningHorizon: RecommendationPlanningHorizon;
  constraint?: RecommendationMetricConstraint;
}): RecommendationMetricCandidate[] {
  if (definition.direction === "locked" || definition.defaultLocked || constraint?.locked) return [];
  if (definition.kind === "ordered-level") {
    const options = definition.options ?? [];
    const index = options.findIndex((value) => Object.is(value, currentValue));
    const max = Math.min(
      options.length - 1,
      index + RECOMMENDATION_REALISM_LIMITS["ordered-level"][planningHorizon].maximumLevelIncrease,
    );
    return options.slice(index + 1, max + 1).map((value, optionIndex) => ({
      metricId: definition.metricId,
      value,
      normalizedChange: (optionIndex + 1) / Math.max(1, max - index),
    }));
  }
  if (definition.kind === "boolean") {
    return typeof currentValue === "boolean" && currentValue === false
      ? [{ metricId: definition.metricId, value: true, normalizedChange: 1 }]
      : [];
  }
  if (typeof currentValue !== "number" || !Number.isFinite(currentValue)) return [];
  const limit = RECOMMENDATION_REALISM_LIMITS[definition.kind][planningHorizon] as {
    relativeChange?: number;
    absoluteChange?: number;
  };
  let allowed = limit.absoluteChange ?? Math.abs(currentValue) * (limit.relativeChange ?? 0);
  if (constraint?.maximumAbsoluteChange !== undefined) {
    allowed = Math.min(allowed, constraint.maximumAbsoluteChange);
  }
  if (constraint?.maximumRelativeChange !== undefined) {
    allowed = Math.min(allowed, Math.abs(currentValue) * constraint.maximumRelativeChange);
  }
  if (allowed <= 0) return [];
  const direction = constraint?.direction ?? definition.direction;
  const sign = direction === "decrease-only" ? -1 : 1;
  const step = definition.step || Number.EPSILON;
  const min = Math.max(
    definition.technicalMinimum ?? -Infinity,
    constraint?.minimumValue ?? -Infinity,
  );
  const max = Math.min(
    definition.technicalMaximum ?? Infinity,
    constraint?.maximumValue ?? Infinity,
  );
  const rangeCandidates = constraint?.minimumValue !== undefined &&
    constraint.maximumValue !== undefined
    ? [
        constraint.minimumValue,
        ...[0.25, 0.5, 0.75].map((factor) =>
          round(constraint.minimumValue! +
            (constraint.maximumValue! - constraint.minimumValue!) * factor, step)),
        constraint.maximumValue,
      ]
    : [];
  return [...new Set(
    [...rangeCandidates, ...[0.1, 0.25, 0.5, 0.75, 1].map((factor) =>
      Math.min(max, Math.max(min, round(currentValue + sign * allowed * factor, step))))],
  )]
    .filter((value) =>
      value !== currentValue &&
      Number.isFinite(value) &&
      (direction !== "increase-only" || value > currentValue) &&
      (direction !== "decrease-only" || value < currentValue))
    .map((value) => ({
      metricId: definition.metricId,
      value,
      normalizedChange: Math.min(1, Math.abs(value - currentValue) / allowed),
    }));
}

export function calculateCandidateChangeCost(
  change: number,
  definition: RecommendationMetricDefinition,
) {
  return change *
    RECOMMENDATION_EFFORT_FACTORS[definition.effort] *
    RECOMMENDATION_RISK_FACTORS[definition.risk] *
    RECOMMENDATION_CONTROLLABILITY_FACTORS[definition.controllability];
}

export function isMeaningfulRecommendationScoreIncrease(
  adapter: RecommendationAdapter,
  before: number,
  after: number,
) {
  if (!Number.isFinite(before) || !Number.isFinite(after) || after - before <= 0.0001) {
    return false;
  }
  const minimumDisplayedImpact = adapter.minimumDisplayedScoreImpact ?? 0;
  if (minimumDisplayedImpact <= 0) return true;
  const displayedBefore = Math.round((before + Number.EPSILON) * 100) / 100;
  const displayedAfter = Math.round((after + Number.EPSILON) * 100) / 100;
  return displayedAfter - displayedBefore >= minimumDisplayedImpact - 1e-12;
}

export function createStableRecommendationStateKey(
  values: Record<string, unknown>,
  ids: string[],
) {
  return JSON.stringify([...ids].sort().map((id) => [
    id,
    typeof values[id] === "number"
      ? Number((values[id] as number).toPrecision(12))
      : values[id],
  ]));
}

export function validateMetricRelations(methodology: string, values: Record<string, unknown>) {
  if (methodology === "ui-greenmetric") {
    const errors = getGreenMetricRelationErrors(values as GreenMetricValues);
    return { valid: errors.length === 0, errors: errors.map((error) => error.message) };
  }
  const pairs = methodology === "the"
    ? [
        ["the.internationalOutlook.internationalStudentsFte", "the.common.studentsFte"],
        ["the.internationalOutlook.internationalAcademicStaffFte", "the.common.academicStaffFte"],
      ]
    : methodology === "qs"
      ? [
          ["qs.common.internationalStudentsFte", "qs.common.studentsFte"],
          ["qs.globalEngagement.internationalFacultyFte", "qs.common.academicStaffFte"],
        ]
      : [];
  const errors = pairs.flatMap(([part, total]) =>
    typeof values[part] === "number" &&
    typeof values[total] === "number" &&
    (values[part] as number) > (values[total] as number)
      ? [`${part} cannot exceed ${total}`]
      : []);
  return { valid: errors.length === 0, errors };
}

const objective = (
  score: number,
  target: number,
  cost: number,
  count: number,
  strategy: RecommendationStrategy,
  current: number,
) => {
  const profile = RECOMMENDATION_STRATEGY_PROFILES[strategy];
  return Math.max(0, target - score) * profile.shortfallPenalty +
    Math.max(0, score - target) * profile.overshootPenalty +
    cost * profile.changeCostWeight +
    count * profile.changedMetricCountWeight -
    (score - current) * profile.scoreGainWeight;
};

type SearchState = {
  values: Record<string, unknown>;
  calculationResult: unknown;
  score: number;
  rankEvaluation: RecommendationRankTargetEvaluation | null;
  changes: RecommendationMetricChange[];
  cost: number;
  objective: number;
};

const stableRankStateKey = (state: SearchState) => JSON.stringify(
  state.changes.map((change) => [change.metricId, change.recommendedValue]),
);

const isSuccessfulRankEvaluation = (evaluation: RecommendationRankTargetEvaluation | null) =>
  evaluation?.status === "reached" || evaluation?.status === "exceeded";

const rankObjective = (
  evaluation: RecommendationRankTargetEvaluation,
  score: number,
  cost: number,
  count: number,
  strategy: RecommendationStrategy,
  current: number,
) => {
  const profile = RECOMMENDATION_STRATEGY_PROFILES[strategy];
  return getRankTargetDistance(evaluation) * profile.shortfallPenalty +
    cost * profile.changeCostWeight +
    count * profile.changedMetricCountWeight -
    (score - current) * profile.scoreGainWeight;
};

function compareRankSearchStates(a: SearchState, b: SearchState) {
  const successDifference = Number(!isSuccessfulRankEvaluation(a.rankEvaluation)) -
    Number(!isSuccessfulRankEvaluation(b.rankEvaluation));
  if (successDifference !== 0) return successDifference;

  const distanceDifference = getRankTargetDistance(a.rankEvaluation!) -
    getRankTargetDistance(b.rankEvaluation!);
  if (distanceDifference !== 0) return distanceDifference;

  // When neither candidate reaches the requested band, prefer the strongest
  // verified score inside the allowed limits. Otherwise a tiny low-cost change
  // can win even though a materially better candidate is available in the same band.
  if (!isSuccessfulRankEvaluation(a.rankEvaluation) &&
      !isSuccessfulRankEvaluation(b.rankEvaluation)) {
    const bestEffortScoreDifference = b.score - a.score;
    if (Math.abs(bestEffortScoreDifference) > 1e-12) return bestEffortScoreDifference;
  }

  const parameterCountDifference = a.changes.length - b.changes.length;
  if (parameterCountDifference !== 0) return parameterCountDifference;

  const normalizedCostDifference = a.cost - b.cost;
  if (Math.abs(normalizedCostDifference) > 1e-12) return normalizedCostDifference;

  const strategyDifference = a.objective - b.objective;
  if (Math.abs(strategyDifference) > 1e-12) return strategyDifference;

  const scoreDifference = b.score - a.score;
  if (Math.abs(scoreDifference) > 1e-12) return scoreDifference;

  return stableRankStateKey(a).localeCompare(stableRankStateKey(b));
}

function selectEfficientBestEffortState(
  adapter: RecommendationAdapter,
  states: SearchState[],
  strongest: SearchState | null,
  startingScore: number,
) {
  const retentionRatio = adapter.bestEffortScoreRetentionRatio;
  if (retentionRatio === undefined || strongest === null || states.length === 0) {
    return strongest;
  }
  const maximumGain = strongest.score - startingScore;
  const retainedGain = maximumGain * retentionRatio;
  return states
    .filter((state) => state.score - startingScore >= retainedGain - 1e-12)
    .toSorted((a, b) =>
      a.changes.length - b.changes.length ||
      a.cost - b.cost ||
      b.score - a.score ||
      stableRankStateKey(a).localeCompare(stableRankStateKey(b)))
    .at(0) ?? strongest;
}

export function runRecommendationEngine({
  adapter,
  targetScore,
  target,
  planningHorizon,
  strategy = "balanced",
  lockedMetricIds = [],
  initialValues,
  baselineValues,
  constraints = [],
  preferredMetricIds = [],
}: {
  adapter: RecommendationAdapter;
  targetScore?: number;
  target?: RecommendationTarget;
  planningHorizon: RecommendationPlanningHorizon;
  strategy?: RecommendationStrategy;
  lockedMetricIds?: string[];
  initialValues?: Record<string, unknown>;
  baselineValues?: Record<string, unknown>;
  constraints?: RecommendationMetricConstraint[];
  preferredMetricIds?: string[];
}): RecommendationEngineResult {
  const started = Date.now();
  const resolvedTarget: RecommendationTarget = target ?? {
    mode: "score",
    score: targetScore as number,
  };
  if (resolvedTarget.mode === "score" && !Number.isFinite(resolvedTarget.score)) {
    throw new Error("Target score is unavailable");
  }
  const resolvedTargetScore = resolvedTarget.mode === "score" ? resolvedTarget.score : null;
  const targetRankRange = resolvedTarget.mode === "rankRange" ? resolvedTarget.range : null;
  const initial = { ...(initialValues ?? adapter.initialValues) };
  const baseline = { ...(baselineValues ?? adapter.initialValues) };
  const baselineResult = adapter.calculate(baseline);
  const baselineScore = adapter.getDisplayedScore(baselineResult);
  const initialResult = adapter.calculate(initial);
  const constrainedStartScore = adapter.getDisplayedScore(initialResult);
  const baselineRankEstimate = adapter.getRankEstimate?.(baselineResult) ??
    UNAVAILABLE_RECOMMENDATION_RANK_ESTIMATE;
  const constrainedStartRankEstimate = adapter.getRankEstimate?.(initialResult) ??
    UNAVAILABLE_RECOMMENDATION_RANK_ESTIMATE;
  const baselineRankEvaluation = targetRankRange
    ? evaluateRankTarget(baselineRankEstimate, targetRankRange)
    : null;
  const constrainedStartRankEvaluation = targetRankRange
    ? evaluateRankTarget(constrainedStartRankEstimate, targetRankRange)
    : null;

  if (baselineScore === null || constrainedStartScore === null) {
    const availableScore = baselineScore ?? constrainedStartScore ?? 0;
    const reason = baselineScore === null
      ? "institutional-score-unavailable" as const
      : "constrained-score-unavailable" as const;
    return {
      methodology: adapter.id,
      currentScore: availableScore,
      constrainedStartScore: availableScore,
      targetMode: resolvedTarget.mode,
      targetScore: resolvedTargetScore,
      targetRankRange,
      rankTarget: targetRankRange
        ? {
            currentEvaluation: baselineRankEvaluation!,
            constrainedStartEvaluation: constrainedStartRankEvaluation!,
            recommendedEvaluation: null,
            alreadySatisfied: false,
          }
        : null,
      planningHorizon,
      strategy,
      reachability: {
        currentScore: availableScore,
        constrainedStartScore: availableScore,
        targetScore: resolvedTargetScore,
        maximumReachableScore: availableScore,
        reachable: false,
        remainingGap: null,
        limitingFactors: [reason],
        searchLimitReached: false,
      },
      primaryPlan: null,
      alternativePlans: [],
      warnings: ["Öneri için karşılaştırılabilir başlangıç skoru üretilemedi."],
      calculationAvailability: "score-unavailable",
      calculationUnavailableReason: reason,
      evaluationCount: 0,
      durationMs: Date.now() - started,
    };
  }

  const preferred = new Set(preferredMetricIds);
  const constraintById = new Map(constraints.map((constraint) => [constraint.metricId, constraint]));
  const definitions = adapter.definitions
    .filter((definition) =>
      definition.affectsTotalScore &&
      definition.isRecommendationCandidate &&
      (adapter.id !== "qs" || (
        definition.eligibleForNumericRecommendation === true &&
        definition.recommendationStatus === "eligible"
      )) &&
      !lockedMetricIds.includes(definition.metricId))
    .toSorted((a, b) =>
      Number(preferred.has(b.metricId)) - Number(preferred.has(a.metricId)));
  const candidateGenerations = definitions.map((definition) => {
    const constraint = constraintById.get(definition.metricId);
    const generated = adapter.generateCandidates
      ? adapter.generateCandidates({ values: initial, definition, planningHorizon, constraint })
      : {
          candidates: generateMetricCandidates({
            currentValue: initial[definition.engineField],
            metricDefinition: definition,
            planningHorizon,
            constraint,
          }),
          status: "candidate-found" as const,
        };
    return [definition, generated] as const;
  });
  const candidateMap = new Map(candidateGenerations.map(([definition, generated]) => [
    definition.metricId,
    generated.candidates,
  ]));
  const candidateDiagnostics = candidateGenerations.map(([definition, generated]) => ({
    metricId: definition.metricId,
    status: generated.status,
    message: generated.message,
  }));

  if (
    targetRankRange &&
    (constrainedStartRankEvaluation?.status === "unavailable" ||
      isSuccessfulRankEvaluation(constrainedStartRankEvaluation))
  ) {
    const alreadySatisfied = isSuccessfulRankEvaluation(constrainedStartRankEvaluation);
    return {
      methodology: adapter.id,
      currentScore: baselineScore,
      constrainedStartScore,
      targetMode: "rankRange",
      targetScore: null,
      targetRankRange,
      rankTarget: {
        currentEvaluation: baselineRankEvaluation!,
        constrainedStartEvaluation: constrainedStartRankEvaluation!,
        recommendedEvaluation: null,
        alreadySatisfied,
      },
      planningHorizon,
      strategy,
      reachability: {
        currentScore: baselineScore,
        constrainedStartScore,
        targetScore: null,
        maximumReachableScore: constrainedStartScore,
        reachable: alreadySatisfied,
        remainingGap: null,
        limitingFactors: alreadySatisfied ? [] : ["rank-estimate-unavailable"],
        searchLimitReached: false,
      },
      primaryPlan: null,
      alternativePlans: [],
      warnings: [],
      candidateDiagnostics,
      evaluationCount: 0,
      durationMs: Date.now() - started,
    };
  }

  let beam: SearchState[] = [{
    values: initial,
    calculationResult: initialResult,
    score: constrainedStartScore,
    rankEvaluation: constrainedStartRankEvaluation,
    changes: [],
    cost: 0,
    objective: resolvedTargetScore === null
      ? rankObjective(
          constrainedStartRankEvaluation!,
          constrainedStartScore,
          0,
          0,
          strategy,
          constrainedStartScore,
        )
      : objective(
          constrainedStartScore,
          resolvedTargetScore,
          0,
          0,
          strategy,
          constrainedStartScore,
        ),
  }];
  let evaluations = 0;
  let searchLimitReached = false;
  let bestEffort: SearchState | null = null;
  const bestEffortStates: SearchState[] = [];
  const completed: SearchState[] = [];
  const seen = new Set<string>();

  for (
    let depth = 0;
    depth < Math.min(
      RECOMMENDATION_SEARCH_LIMITS.maximumDepth[planningHorizon],
      adapter.maximumRecommendedChanges ?? Infinity,
    ) && beam.length;
    depth += 1
  ) {
    const next: SearchState[] = [];
    for (const state of beam) {
      for (const definition of definitions) {
        if (state.changes.some((change) => change.metricId === definition.metricId)) continue;
        const originalValue = initial[definition.engineField];
        for (const candidate of candidateMap.get(definition.metricId) ?? []) {
          if (Object.is(state.values[definition.engineField], candidate.value)) continue;
          const values = { ...state.values, [definition.engineField]: candidate.value };
          if (!validateMetricRelations(adapter.id, values).valid) continue;
          const key = createStableRecommendationStateKey(
            values,
            definitions.map((item) => item.engineField),
          );
          if (seen.has(key)) continue;
          seen.add(key);

          const result = adapter.calculate(values);
          const score = adapter.getDisplayedScore(result);
          evaluations += 1;
          if (score === null || !isMeaningfulRecommendationScoreIncrease(
            adapter,
            state.score,
            score,
          )) continue;

          const rankEvaluation = targetRankRange
            ? evaluateRankTarget(
                adapter.getRankEstimate?.(result) ?? UNAVAILABLE_RECOMMENDATION_RANK_ESTIMATE,
                targetRankRange,
              )
            : null;
          if (targetRankRange && rankEvaluation?.status === "unavailable") continue;

          const currentCategories = adapter.getCategoryScores(state.calculationResult);
          const proposedCategories = adapter.getCategoryScores(result);
          const currentIndicators = adapter.getIndicatorScores?.(state.calculationResult);
          const proposedIndicators = adapter.getIndicatorScores?.(result);
          const indicatorCode = candidate.indicatorCode;
          const candidateCategoryId = indicatorCode?.slice(0, 2) ?? definition.categoryId;

          const changeCost = calculateCandidateChangeCost(
            candidate.normalizedChange,
            definition,
          );
          const priorChanges = state.changes.filter(
            (change) => change.metricId !== definition.metricId,
          );
          const change: RecommendationMetricChange = {
            metricId: definition.metricId,
            metricName: definition.label,
            label: { tr: definition.label, en: definition.label },
            categoryId: candidateCategoryId,
            currentValue: originalValue,
            recommendedValue: candidate.value,
            proposedValue: candidate.value,
            absoluteChange:
              typeof originalValue === "number" && typeof candidate.value === "number"
                ? candidate.value - originalValue
                : null,
            percentageChange:
              typeof originalValue === "number" &&
              originalValue !== 0 &&
              typeof candidate.value === "number"
                ? (candidate.value - originalValue) / originalValue * 100
                : null,
            scoreBeforeChange: state.score,
            scoreAfterChange: score,
            incrementalScoreImpact: score - state.score,
            normalizedChange: candidate.normalizedChange,
            changeCost,
            effort: definition.effort,
            risk: definition.risk,
            confidence: definition.confidence,
            direction: definition.direction,
            evidenceRequired: definition.evidenceRequired,
            indicatorCode,
            currentIndicatorScore: indicatorCode ? currentIndicators?.[indicatorCode] ?? null : undefined,
            proposedIndicatorScore: indicatorCode ? proposedIndicators?.[indicatorCode] ?? null : undefined,
            currentScore: indicatorCode ? currentIndicators?.[indicatorCode] ?? null : state.score,
            proposedScore: indicatorCode ? proposedIndicators?.[indicatorCode] ?? null : score,
            scoreGain: indicatorCode
              ? (proposedIndicators?.[indicatorCode] ?? 0) - (currentIndicators?.[indicatorCode] ?? 0)
              : score - state.score,
            currentCategoryScore: candidateCategoryId ? currentCategories[candidateCategoryId] ?? null : undefined,
            proposedCategoryScore: candidateCategoryId ? proposedCategories[candidateCategoryId] ?? null : undefined,
            currentTotalScore: state.score,
            proposedTotalScore: score,
            targetThreshold: candidate.targetThreshold,
            thresholdDirection: candidate.thresholdDirection,
            changedSourceMetricIds: candidate.changedSourceMetricIds ?? [definition.engineField],
          };
          const changes = [...priorChanges, change];
          const totalCost = state.cost + changeCost;
          const nextState: SearchState = {
            values,
            calculationResult: result,
            score,
            rankEvaluation,
            changes,
            cost: totalCost,
            objective: resolvedTargetScore === null
              ? rankObjective(
                  rankEvaluation!,
                  score,
                  totalCost,
                  changes.length,
                  strategy,
                  constrainedStartScore,
                )
              : objective(
                  score,
                  resolvedTargetScore,
                  totalCost,
                  changes.length,
                  strategy,
                  constrainedStartScore,
                ),
          };
          next.push(nextState);
          bestEffortStates.push(nextState);
          if (
            bestEffort === null ||
            (resolvedTargetScore === null
              ? compareRankSearchStates(nextState, bestEffort) < 0
              : nextState.score > bestEffort.score)
          ) {
            bestEffort = nextState;
          }
          if (
            resolvedTargetScore === null
              ? isSuccessfulRankEvaluation(rankEvaluation)
              : score >= resolvedTargetScore
          ) completed.push(nextState);
          if (evaluations >= RECOMMENDATION_SEARCH_LIMITS.maximumTotalEvaluations) {
            searchLimitReached = true;
            break;
          }
        }
        if (searchLimitReached) break;
      }
      if (searchLimitReached) break;
    }
    beam = next
      .toSorted((a, b) => resolvedTargetScore === null
        ? compareRankSearchStates(a, b)
        : a.objective - b.objective || b.score - a.score)
      .slice(0, RECOMMENDATION_SEARCH_LIMITS.beamWidth[strategy]);
    if (searchLimitReached) break;
  }

  const best = completed.length
    ? completed.toSorted((a, b) => resolvedTargetScore === null
        ? compareRankSearchStates(a, b)
        : a.objective - b.objective)[0]
    : selectEfficientBestEffortState(
        adapter,
        bestEffortStates,
        bestEffort,
        constrainedStartScore,
      );
  const maximum = Math.max(
    constrainedStartScore,
    bestEffort?.score ?? constrainedStartScore,
    ...completed.map((state) => state.score),
  );
  let plan: RecommendationPlan | null = null;
  if (
    best &&
    ((resolvedTargetScore === null
      ? isSuccessfulRankEvaluation(best.rankEvaluation)
      : best.score >= resolvedTargetScore) ||
      (adapter.returnBestEffortPlan === true && isMeaningfulRecommendationScoreIncrease(
        adapter,
        constrainedStartScore,
        best.score,
      )))
  ) {
    const verifiedResult = best.calculationResult;
    const verifiedScore = adapter.getDisplayedScore(verifiedResult);
    if (verifiedScore !== null && Math.abs(verifiedScore - best.score) < 1e-9) {
      const verifiedRankEstimate = adapter.getRankEstimate?.(verifiedResult) ??
        UNAVAILABLE_RECOMMENDATION_RANK_ESTIMATE;
      const verifiedRankEvaluation = targetRankRange
        ? evaluateRankTarget(verifiedRankEstimate, targetRankRange)
        : null;
      plan = {
        strategy,
        currentScore: baselineScore,
        constrainedStartScore,
        targetScore: resolvedTargetScore,
        targetMode: resolvedTarget.mode,
        targetRankRange,
        recommendedScore: verifiedScore,
        reachedTarget: resolvedTargetScore === null
          ? isSuccessfulRankEvaluation(verifiedRankEvaluation)
          : verifiedScore >= resolvedTargetScore,
        currentRankEstimate: resolvedTarget.mode === "rankRange" ? baselineRankEstimate : null,
        constrainedStartRankEstimate: resolvedTarget.mode === "rankRange"
          ? constrainedStartRankEstimate
          : null,
        recommendedRankEstimate: resolvedTarget.mode === "rankRange" ? verifiedRankEstimate : null,
        rankTargetEvaluation: verifiedRankEvaluation,
        changes: best.changes,
        totalChangeCost: best.cost,
        resultingValues: best.values,
        currentCategoryScores: adapter.getCategoryScores(baselineResult),
        constrainedCategoryScores: adapter.getCategoryScores(initialResult),
        resultingCategoryScores: adapter.getCategoryScores(verifiedResult),
        verified: true,
      };
    }
  }

  const alreadySatisfied = isSuccessfulRankEvaluation(constrainedStartRankEvaluation);
  const reachedTarget = resolvedTarget.mode === "rankRange"
    ? alreadySatisfied || plan?.reachedTarget === true
    : plan?.reachedTarget === true;
  return {
    methodology: adapter.id,
    currentScore: baselineScore,
    constrainedStartScore,
    targetMode: resolvedTarget.mode,
    targetScore: resolvedTargetScore,
    targetRankRange,
    rankTarget: targetRankRange
      ? {
          currentEvaluation: baselineRankEvaluation!,
          constrainedStartEvaluation: constrainedStartRankEvaluation!,
          recommendedEvaluation: plan?.rankTargetEvaluation ?? null,
          alreadySatisfied,
        }
      : null,
    planningHorizon,
    strategy,
    reachability: {
      currentScore: baselineScore,
      constrainedStartScore,
      targetScore: resolvedTargetScore,
      maximumReachableScore: maximum,
      reachable: reachedTarget,
      remainingGap: resolvedTargetScore === null
        ? null
        : Math.max(0, resolvedTargetScore - maximum),
      limitingFactors: reachedTarget
        ? []
        : [definitions.length
            ? "Planlama süresi ve seçili metrik sınırları hedef için yetersiz."
            : "Değiştirilebilir uygun metrik bulunmuyor."],
      searchLimitReached,
    },
    primaryPlan: plan,
    alternativePlans: [],
    warnings: searchLimitReached
      ? ["Arama performans sınırında tamamlandı; daha iyi bir kombinasyon bulunabilir."]
      : [],
    candidateDiagnostics,
    evaluationCount: evaluations,
    durationMs: Date.now() - started,
  };
}

import type {
  RecommendationMetricConstraint,
  RecommendationMetricDefinition,
  RecommendationMethodologyId,
  RecommendationParameterInput,
  RecommendationRequestValidation,
  RecommendationParameterSelection,
  RecommendationRankRange,
  RecommendationTargetMode,
} from "./types";

export function filterRecommendationSelectionsToDefinitions(
  inputs: Record<string, RecommendationParameterInput>,
  recommendationParameterIds: string[],
  definitions: RecommendationMetricDefinition[],
) {
  const activeIds = new Set(definitions.map((definition) => definition.metricId));
  return {
    inputs: Object.fromEntries(Object.entries(inputs).filter(([parameterId]) => activeIds.has(parameterId))),
    recommendationParameterIds: recommendationParameterIds.filter((parameterId) => activeIds.has(parameterId)),
  };
}

export function classifyRecommendationParameterSelections(
  parameters: RecommendationParameterInput[],
): RecommendationParameterSelection[] {
  return parameters.flatMap<RecommendationParameterSelection>((input) => {
    if (!input.selected) return [];
    if (input.inputMode === "value") {
      return [{ parameterId: input.parameterId, kind: "fixed-value" as const, value: input.value }];
    }
    if (input.inputMode === "range") {
      return [{
        parameterId: input.parameterId,
        kind: "range-constraint" as const,
        min: input.min,
        max: input.max,
      }];
    }
    return [{ parameterId: input.parameterId, kind: "hold-current" as const }];
  });
}

export function summarizeRecommendationSelections(
  parameters: RecommendationParameterInput[],
  appliedRecommendationMetricIds: string[] = [],
) {
  const selections = classifyRecommendationParameterSelections(parameters);
  return {
    selections,
    fixedValueCount: selections.filter((item) => item.kind === "fixed-value").length,
    rangeConstraintCount: selections.filter((item) => item.kind === "range-constraint").length,
    holdCurrentCount: selections.filter((item) => item.kind === "hold-current").length,
    appliedRecommendationCount: new Set(appliedRecommendationMetricIds).size,
  };
}

export function prepareRecommendationSimulation(
  currentValues: Record<string, unknown>,
  parameters: RecommendationParameterInput[],
  definitions: RecommendationMetricDefinition[] = [],
) {
  const simulatedValues = { ...currentValues };
  const constraints: RecommendationMetricConstraint[] = [];
  const preferredMetricIds: string[] = [];
  const definitionsById = new Map(
    definitions.map((definition) => [definition.metricId, definition]),
  );

  for (const input of parameters) {
    if (!input.selected) continue;
    preferredMetricIds.push(input.parameterId);

    if (input.inputMode === "value" && input.value !== undefined) {
      const definition = definitionsById.get(input.parameterId);
      simulatedValues[definition?.engineField ?? input.parameterId] = input.value;
    }
    if (
      input.inputMode === "range" &&
      input.min !== undefined &&
      input.max !== undefined
    ) {
      constraints.push({
        metricId: input.parameterId,
        minimumValue: input.min,
        maximumValue: input.max,
      });
    }
  }

  return { simulatedValues, constraints, preferredMetricIds };
}

export function resolveRecommendationCandidateParameterIds(
  allEligibleParameterIds: string[],
  selectedParameterIds: string[],
) {
  const eligible = new Set(allEligibleParameterIds);
  if (selectedParameterIds.length === 0) return [...allEligibleParameterIds];
  return selectedParameterIds.filter((parameterId) => eligible.has(parameterId));
}

export function resolveExplicitRecommendationCandidateParameterIds(
  allEligibleParameterIds: string[],
  selectedParameterIds: string[],
) {
  const eligible = new Set(allEligibleParameterIds);
  if (selectedParameterIds.length === 0) return [];
  return selectedParameterIds.filter((parameterId) => eligible.has(parameterId));
}

export function hasRequiredQsRecommendationSelection(
  methodology: "the" | "qs" | "ui-greenmetric",
  selectedParameterIds: string[],
) {
  return hasRequiredRecommendationSelection(methodology, selectedParameterIds);
}

export function hasRequiredRecommendationSelection(
  methodology: "the" | "qs" | "ui-greenmetric",
  selectedParameterIds: string[],
) {
  void methodology;
  void selectedParameterIds;
  return true;
}

export function resolveGreenMetricCandidateParameterIds(
  allEligibleParameterIds: string[],
  parameters: RecommendationParameterInput[],
  recommendationParameterIds: string[],
) {
  const eligible = new Set(allEligibleParameterIds);
  const recommendationContext = new Set(recommendationParameterIds);
  return parameters
    .filter((input) => input.selected && input.inputMode === "range")
    .map((input) => input.parameterId)
    .filter((id) => eligible.has(id) &&
      (recommendationContext.size === 0 || recommendationContext.has(id)));
}

export function validateRecommendationRequest({
  methodology = "the",
  currentScore,
  targetScore,
  targetMode = "score",
  targetRankRange,
  rankEstimateAvailable = true,
  availableTargetRankRanges,
  scoreMaximum,
  parameters,
  definitions,
  currentValues,
}: {
  methodology?: RecommendationMethodologyId;
  currentScore: number | null;
  targetScore: number | null;
  targetMode?: RecommendationTargetMode;
  targetRankRange?: Partial<RecommendationRankRange> | null;
  rankEstimateAvailable?: boolean;
  availableTargetRankRanges?: RecommendationRankRange[];
  scoreMaximum: number;
  parameters: RecommendationParameterInput[];
  definitions: RecommendationMetricDefinition[];
  currentValues?: Record<string, unknown>;
}): RecommendationRequestValidation {
  const errors: Record<string, string> = {};

  if (targetMode === "score") {
    if (targetScore === null || !Number.isFinite(targetScore)) {
      errors.targetScore = "Hedef skor boş bırakılamaz.";
    } else if (currentScore === null || targetScore <= currentScore) {
      errors.targetScore = "Hedef skor mevcut skorunuzdan yüksek olmalıdır.";
    } else if (targetScore > scoreMaximum) {
      errors.targetScore = `Hedef skor ${scoreMaximum} değerini geçemez.`;
    }
  } else {
    const bestRank = targetRankRange?.bestRank;
    const worstRank = targetRankRange?.worstRank;
    if (!rankEstimateAvailable) {
      errors.targetRankRange = "rank-estimate-unavailable";
    } else if (!Number.isFinite(bestRank) || !Number.isFinite(worstRank)) {
      errors.targetRankRange = "rank-range-required";
    } else if (
      bestRank! <= 0 ||
      worstRank! <= 0 ||
      !Number.isInteger(bestRank) ||
      !Number.isInteger(worstRank)
    ) {
      errors.targetRankRange = "rank-range-positive";
    } else if (bestRank! > worstRank!) {
      errors.targetRankRange = "rank-range-order";
    } else if (availableTargetRankRanges && !availableTargetRankRanges.some((range) =>
      range.bestRank === bestRank && range.worstRank === worstRank)) {
      errors.targetRankRange = "rank-range-reference-unavailable";
    }
  }

  const definitionsById = new Map(
    definitions.map((definition) => [definition.metricId, definition]),
  );
  for (const input of parameters) {
    if (!input.selected) continue;
    const definition = definitionsById.get(input.parameterId);
    const technicalMinimum = definition?.technicalMinimum;
    const technicalMaximum = definition?.technicalMaximum;
    const rejectsNegative = (technicalMinimum ?? 0) >= 0;

    if (input.inputMode === "value") {
      if (input.value === undefined || !Number.isFinite(input.value)) {
        errors[input.parameterId] = "Tek değer girilmelidir.";
      } else if (rejectsNegative && input.value < 0) {
        errors[input.parameterId] = "Negatif değer girilemez.";
      } else if (
        (technicalMinimum !== null && technicalMinimum !== undefined &&
          input.value < technicalMinimum) ||
        (technicalMaximum !== null && technicalMaximum !== undefined &&
          input.value > technicalMaximum)
      ) {
        errors[input.parameterId] = "Değer, parametrenin izin verilen sınırları dışındadır.";
      }
    }

    if (input.inputMode === "range") {
      if (
        input.min === undefined ||
        input.max === undefined ||
        !Number.isFinite(input.min) ||
        !Number.isFinite(input.max)
      ) {
        errors[input.parameterId] = "Minimum ve maksimum birlikte girilmelidir.";
      } else if (input.min > input.max) {
        errors[input.parameterId] = "Minimum değer maksimum değerden büyük olamaz.";
      } else if (rejectsNegative && (input.min < 0 || input.max < 0)) {
        errors[input.parameterId] = "Negatif değer girilemez.";
      } else if (
        (technicalMinimum !== null && technicalMinimum !== undefined &&
          input.min < technicalMinimum) ||
        (technicalMaximum !== null && technicalMaximum !== undefined &&
          input.max > technicalMaximum)
      ) {
        errors[input.parameterId] = "Aralık, parametrenin izin verilen sınırları dışındadır.";
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

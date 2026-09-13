import {
  calculateTheAggregateScores,
  calculateTheIndicatorEngine,
  calculateTheRawIndicators,
  createTheInputData,
  createThePublicSimulationReferences,
} from "@/src/lib/calculations/the";
import { estimateCompleteTheCategoryScores } from "@/src/lib/the/estimate-complete-category-scores";

/** @deprecated Diagnostic-only deterministic calculation. Live THE UI uses the stochastic engine. */
export function calculateTheSimulation({
  values,
  normalizationBaselineValues = values,
}: {
  values: Record<string, unknown>;
  normalizationBaselineValues?: Record<string, unknown>;
}) {
  const input = createTheInputData({ ...values });
  const normalizationInput = createTheInputData({
    ...normalizationBaselineValues,
  });
  const normalizationRawIndicators = calculateTheRawIndicators(
    normalizationInput,
  );
  const normalizationReferences = createThePublicSimulationReferences(
    normalizationRawIndicators,
  );
  const engine = calculateTheIndicatorEngine(input, normalizationReferences);
  const aggregate = calculateTheAggregateScores(engine.indicatorScores);
  const rankEstimate = estimateCompleteTheCategoryScores(
    aggregate.categoryScores,
  );

  return {
    values: { ...values },
    input,
    normalizationReferenceId:
      normalizationReferences.metadata.referenceSetId,
    engine,
    aggregate,
    rankEstimate,
  };
}

export type TheSimulationCalculation = ReturnType<
  typeof calculateTheSimulation
>;

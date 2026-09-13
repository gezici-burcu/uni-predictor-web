import type {
  CrossAnalysisBaselineSnapshot,
  CrossAnalysisInput,
  CrossAnalysisParameterId,
  CrossAnalysisState,
} from "./types";

export const createCrossAnalysisState = (): CrossAnalysisState => ({ inputs: [] });

export function setCrossAnalysisProposedValue(
  state: CrossAnalysisState,
  baseline: CrossAnalysisBaselineSnapshot,
  parameterId: CrossAnalysisParameterId,
  proposedValue: number,
): CrossAnalysisState {
  const baselineValue = baseline.parameters[parameterId];
  if (baselineValue === null) return state;
  const remaining = state.inputs.filter((input) => input.parameterId !== parameterId);
  if (baselineValue === proposedValue) return { inputs: remaining };
  const next: CrossAnalysisInput = { parameterId, baselineValue, proposedValue };
  return { inputs: [...remaining, next] };
}

export const resetCrossAnalysisState = (): CrossAnalysisState => ({ inputs: [] });

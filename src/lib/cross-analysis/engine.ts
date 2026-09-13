import { QS_PART_TIME_FTE_COEFFICIENT } from "@/src/config/qs-institutional";
import { runQsStochasticSimulation } from "@/src/lib/calculations/qs";
import {
  calculateTheRawIndicators,
  createTheInputData,
  THE_INDICATOR_METADATA,
} from "@/src/lib/calculations/the";
import { estimateQsRank } from "@/src/lib/qs/estimate-qs-rank";
import { THE_STOCHASTIC_CALIBRATION_INPUTS } from "@/src/lib/the/stochastic/the-stochastic-model-config";
import { runTheStochasticSimulation } from "@/src/lib/the/stochastic/run-the-stochastic-simulation";
import {
  validateTheScenarioMetricValues,
  validateTheSubsetLimits,
} from "@/src/lib/the/validate-the-subset-limits";
import type { QsCalculationInputs } from "@/src/types/qs-raw";
import { CROSS_ANALYSIS_PARAMETER_BY_ID } from "./registry";
import type {
  CrossAnalysisBaselineSnapshot,
  CrossAnalysisIndicatorDetail,
  CrossAnalysisInput,
  CrossAnalysisMethodologyId,
  CrossAnalysisParameterId,
  CrossAnalysisResult,
  CrossAnalysisStatus,
  CrossAnalysisValidationIssue,
} from "./types";

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const delta = (baseline: number | null, proposed: number | null) => {
  if (baseline === null || proposed === null) return null;
  const difference = proposed - baseline;
  return Object.is(difference, -0) ? 0 : difference;
};

const cloneQsInputs = (inputs: QsCalculationInputs): QsCalculationInputs => ({
  ...inputs,
  institutional: {
    ...inputs.institutional,
    academicStaff: { ...inputs.institutional.academicStaff },
    internationalAcademicStaff: { ...inputs.institutional.internationalAcademicStaff },
    students: { ...inputs.institutional.students },
    internationalStudents: { ...inputs.institutional.internationalStudents },
    employment: { ...inputs.institutional.employment },
  },
  additional: { ...inputs.additional },
});

const actualChanges = (inputs: readonly CrossAnalysisInput[]) =>
  inputs.filter((input) => input.baselineValue !== input.proposedValue);

const metricValuesEqual = (
  left: CrossAnalysisIndicatorDetail["baselineRawValue"],
  right: CrossAnalysisIndicatorDetail["proposedRawValue"],
) => Array.isArray(left) || Array.isArray(right)
  ? JSON.stringify(left) === JSON.stringify(right)
  : Object.is(left, right);

function metricParameterIds(
  inputs: readonly CrossAnalysisInput[],
  methodology: CrossAnalysisMethodologyId,
  metricId: string,
) {
  return Array.from(new Set(actualChanges(inputs).flatMap((input) =>
    CROSS_ANALYSIS_PARAMETER_BY_ID.get(input.parameterId)
      ?.mappings[methodology]?.impactedMetrics.includes(metricId)
      ? [input.parameterId]
      : [])));
}

function changedMetricIds(details: readonly CrossAnalysisIndicatorDetail[], type: "raw" | "score") {
  return details.flatMap((detail) => {
    if (type === "score") return detail.impactType === "score-changed" ? [detail.metricId] : [];
    return metricValuesEqual(detail.baselineRawValue, detail.proposedRawValue) ? [] : [detail.metricId];
  });
}

function impactedMetrics(
  inputs: readonly CrossAnalysisInput[],
  methodology: CrossAnalysisMethodologyId,
) {
  return Array.from(new Set(actualChanges(inputs).flatMap((input) =>
    CROSS_ANALYSIS_PARAMETER_BY_ID.get(input.parameterId)
      ?.mappings[methodology]?.impactedMetrics ?? [])));
}

function isAffected(
  inputs: readonly CrossAnalysisInput[],
  methodology: CrossAnalysisMethodologyId,
) {
  return actualChanges(inputs).some((input) =>
    Boolean(CROSS_ANALYSIS_PARAMETER_BY_ID.get(input.parameterId)
      ?.mappings[methodology]?.scoreImpactingMetrics.length));
}

function affectedMethodologies(parameterId: CrossAnalysisParameterId) {
  return [...(CROSS_ANALYSIS_PARAMETER_BY_ID.get(parameterId)?.affectedMethodologies ?? [])];
}

function validateInputs(
  baseline: CrossAnalysisBaselineSnapshot,
  inputs: readonly CrossAnalysisInput[],
) {
  const issues: CrossAnalysisValidationIssue[] = [];
  const invalid = new Set<CrossAnalysisMethodologyId>();
  const insufficient = new Set<CrossAnalysisMethodologyId>();
  const seen = new Set<CrossAnalysisParameterId>();

  for (const input of inputs) {
    const definition = CROSS_ANALYSIS_PARAMETER_BY_ID.get(input.parameterId);
    const methodologies = affectedMethodologies(input.parameterId);
    if (!definition) continue;
    for (const methodology of methodologies) {
      if (!baseline.methodologyBaselines[methodology].usable) insufficient.add(methodology);
    }
    if (seen.has(input.parameterId)) {
      issues.push({
        parameterIds: [input.parameterId],
        methodologies,
        message: "Aynı Cross Analysis parametresi birden fazla kez değiştirilemez.",
      });
      methodologies.forEach((id) => invalid.add(id));
      continue;
    }
    seen.add(input.parameterId);
    const authoritativeBaseline = baseline.parameters[input.parameterId];
    if (authoritativeBaseline === null) {
      issues.push({
        parameterIds: [input.parameterId],
        methodologies,
        message: "InstitutionDataContext içinde ortak baseline değeri eksik.",
      });
      methodologies.forEach((id) => insufficient.add(id));
      continue;
    }
    if (input.baselineValue !== authoritativeBaseline) {
      issues.push({
        parameterIds: [input.parameterId],
        methodologies,
        message: "Girdi baseline değeri güncel InstitutionDataContext snapshot'ı ile eşleşmiyor.",
      });
      methodologies.forEach((id) => invalid.add(id));
    }
    if (!finite(input.proposedValue) || input.proposedValue < definition.validation.minimum ||
      definition.validation.maximum !== undefined && input.proposedValue > definition.validation.maximum) {
      issues.push({
        parameterIds: [input.parameterId],
        methodologies,
        message: "Önerilen değer sonlu ve negatif olmayan bir sayı olmalıdır.",
      });
      methodologies.forEach((id) => invalid.add(id));
    } else if (definition.validation.integerOnly && !Number.isInteger(input.proposedValue)) {
      issues.push({
        parameterIds: [input.parameterId],
        methodologies,
        message: "Önerilen değer tam sayı olmalıdır.",
      });
      methodologies.forEach((id) => invalid.add(id));
    }
  }

  // Each methodology starts from its own institutional baseline. A value that is
  // invalid against THE's totals must not suppress an otherwise valid QS result
  // (and vice versa).
  for (const methodology of ["the", "qs"] as const) {
    const effective = { ...baseline.methodologyParameterValues[methodology] };
    for (const input of inputs) {
      if (finite(input.proposedValue)) effective[input.parameterId] = input.proposedValue;
    }
    const subsetErrors = validateTheSubsetLimits({
      academicStaffFte: effective.academicStaffFte,
      internationalAcademicStaffFte: effective.internationalAcademicStaffFte,
      studentsFte: effective.studentsFte,
      internationalStudentsFte: effective.internationalStudentsFte,
    });
    for (const error of subsetErrors) {
      const parameterId = error.fieldId as CrossAnalysisParameterId;
      const totalParameterId = CROSS_ANALYSIS_PARAMETER_BY_ID.get(parameterId)
        ?.validation.subsetOf;
      issues.push({
        parameterIds: totalParameterId
          ? [parameterId, totalParameterId]
          : [parameterId],
        methodologies: [methodology],
        message: error.message,
      });
      invalid.add(methodology);
    }
  }

  return { issues, invalid, insufficient };
}

export function createCrossAnalysisTheProjection(
  baseline: Record<string, unknown>,
  inputs: readonly CrossAnalysisInput[],
) {
  const proposed = { ...baseline };
  for (const input of actualChanges(inputs)) {
    const mapping = CROSS_ANALYSIS_PARAMETER_BY_ID.get(input.parameterId)?.mappings.the;
    for (const path of mapping?.inputPaths ?? []) {
      if (!Object.prototype.hasOwnProperty.call(baseline, path)) {
        throw new Error(`Invalid Cross Analysis THE mapping path: ${path}`);
      }
      proposed[path] = input.proposedValue;
    }
  }
  return proposed;
}

export function createCrossAnalysisQsProjection(
  baseline: QsCalculationInputs,
  inputs: readonly CrossAnalysisInput[],
) {
  const proposed = cloneQsInputs(baseline);
  for (const input of actualChanges(inputs)) {
    const mapping = CROSS_ANALYSIS_PARAMETER_BY_ID.get(input.parameterId)?.mappings.qs;
    if (mapping?.qsRawComponent) {
      const target = proposed.institutional[mapping.qsRawComponent.target];
      const rawDelta = input.proposedValue - input.baselineValue;
      const fteDelta = rawDelta * (mapping.qsRawComponent.component === "fullTime" ? 1 : QS_PART_TIME_FTE_COEFFICIENT);
      target.headcount = target.headcount === null ? null : target.headcount + rawDelta;
      target.actualFte = target.actualFte === null ? null : target.actualFte + fteDelta;
      target.roundedFte = target.actualFte === null ? null : Math.round(target.actualFte);
      continue;
    }
    for (const path of mapping?.inputPaths ?? []) {
      setNestedNumber(proposed as unknown as Record<string, unknown>, path, input.proposedValue);
    }
  }
  return proposed;
}

function setNestedNumber(
  target: Record<string, unknown>,
  path: string,
  value: number,
) {
  const parts = path.split(".");
  let current = target;
  for (const part of parts.slice(0, -1)) {
    const next = current[part];
    if (typeof next !== "object" || next === null || Array.isArray(next)) {
      throw new Error(`Invalid Cross Analysis QS mapping path: ${path}`);
    }
    current = next as Record<string, unknown>;
  }
  current[parts.at(-1)!] = value;
}

function statusFor({
  affected,
  invalid,
  insufficient,
  engineInsufficient,
}: {
  affected: boolean;
  invalid: boolean;
  insufficient: boolean;
  engineInsufficient: boolean;
}): CrossAnalysisStatus {
  if (!affected) return "not-affected";
  if (invalid) return "invalid";
  if (insufficient || engineInsufficient) return "insufficient-data";
  return "complete";
}

export function runCrossAnalysis({
  baseline,
  inputs,
}: {
  baseline: CrossAnalysisBaselineSnapshot;
  inputs: readonly CrossAnalysisInput[];
}): CrossAnalysisResult {
  const changes = inputs.map((input) => ({ ...input }));
  const hasActualChanges = actualChanges(changes).length > 0;
  const validation = validateInputs(baseline, changes);

  const theAffected = isAffected(changes, "the");
  const theInvalid = validation.invalid.has("the");
  const proposedTheInputs = theInvalid
    ? { ...baseline.methodologyInputs.the }
    : createCrossAnalysisTheProjection(baseline.methodologyInputs.the, changes);
  const theMetricErrors = validateTheScenarioMetricValues(
    Object.fromEntries(actualChanges(changes).flatMap((input) =>
      (CROSS_ANALYSIS_PARAMETER_BY_ID.get(input.parameterId)?.mappings.the?.inputPaths ?? [])
        .map((path) => [path, input.proposedValue]))),
  );
  if (Object.keys(theMetricErrors).length > 0) validation.invalid.add("the");
  const theSimulation = runTheStochasticSimulation({
    calibrationInputs: THE_STOCHASTIC_CALIBRATION_INPUTS,
    currentInputs: baseline.methodologyInputs.the,
    scenarioInputs: validation.invalid.has("the")
      ? baseline.methodologyInputs.the
      : proposedTheInputs,
  });
  const theRawSides = [baseline.methodologyInputs.the, proposedTheInputs]
    .map((values) => calculateTheRawIndicators(createTheInputData(values)));
  const theEngineInsufficient = theRawSides.some((raw) =>
    Object.values(raw).some((indicator) =>
      THE_INDICATOR_METADATA[indicator.code].officialWeight > 0 && !indicator.valid));
  const theMissingMetrics = Array.from(new Set(theRawSides.flatMap((raw) =>
    Object.values(raw)
      .filter((indicator) => THE_INDICATOR_METADATA[indicator.code].officialWeight > 0 && !indicator.valid)
      .map((indicator) => indicator.code))));
  const theStatus = statusFor({
    affected: theAffected,
    invalid: validation.invalid.has("the"),
    insufficient: validation.insufficient.has("the"),
    engineInsufficient: theEngineInsufficient ||
      theSimulation.current.calculationStatus !== "complete" ||
      theSimulation.scenario.calculationStatus !== "complete",
  });
  const theBaselineScore = baseline.methodologyBaselines.the.usable
    ? theSimulation.current.overallMedian
    : null;
  const theBaselineRankBand = baseline.methodologyBaselines.the.usable
    ? theSimulation.current.predictedRankBand
    : null;
  const theProposedScore = !theAffected
    ? hasActualChanges ? theBaselineScore : null
    : theStatus === "invalid" || theStatus === "insufficient-data"
      ? null
      : theSimulation.scenario.overallMedian;
  const theImpactedMetrics = impactedMetrics(changes, "the");
  const theContributionByCode = new Map(theSimulation.diagnostics.firstRunIndicatorSamples
    .map((item) => [item.code, item]));
  const theIndicatorDetails: CrossAnalysisIndicatorDetail[] = theAffected && theStatus === "complete"
    ? theImpactedMetrics.map((metricId) => {
        const diagnostic = theSimulation.diagnostics.indicatorChanges.find((item) => item.code === metricId);
        const contribution = theContributionByCode.get(metricId as never);
        const baselineContribution = contribution?.currentWeightedContribution ?? null;
        const proposedContribution = contribution?.scenarioWeightedContribution ?? null;
        const contributionDelta = delta(baselineContribution, proposedContribution);
        const rawChanged = !metricValuesEqual(
          diagnostic?.currentRawValue ?? null,
          diagnostic?.scenarioRawValue ?? null,
        );
        return {
          metricId,
          baselineRawValue: diagnostic?.currentRawValue ?? null,
          proposedRawValue: diagnostic?.scenarioRawValue ?? null,
          baselineScore: null,
          proposedScore: null,
          scoreDelta: null,
          baselineContribution,
          proposedContribution,
          contributionDelta,
          scoreValueKind: contributionDelta === null ? "unavailable" : "model-contribution",
          impactType: contributionDelta !== null && contributionDelta !== 0
            ? "score-changed"
            : rawChanged ? "raw-only" : "score-unchanged",
          parameterIds: metricParameterIds(changes, "the", metricId),
        } satisfies CrossAnalysisIndicatorDetail;
      })
    : [];

  const qsAffected = isAffected(changes, "qs");
  const qsInvalid = validation.invalid.has("qs");
  const proposedQsInputs = qsInvalid
    ? cloneQsInputs(baseline.methodologyInputs.qs)
    : createCrossAnalysisQsProjection(baseline.methodologyInputs.qs, changes);
  const qsSimulation = runQsStochasticSimulation({
    currentInputs: baseline.methodologyInputs.qs,
    scenarioInputs: validation.invalid.has("qs")
      ? baseline.methodologyInputs.qs
      : proposedQsInputs,
    selectedInstitutionalYear: baseline.years.qs,
  });
  const qsRank = estimateQsRank(qsSimulation);
  const baseQsStatus = statusFor({
        affected: qsAffected,
        invalid: validation.invalid.has("qs"),
        insufficient: validation.insufficient.has("qs"),
        engineInsufficient: qsSimulation.calculationStatus === "missing-data",
      });
  const qsStatus = baseQsStatus === "complete" && qsSimulation.calculationStatus === "raw-analysis-only"
    ? "raw-impact-only" as const
    : baseQsStatus;
  const qsUsesPartialComparison = qsAffected && qsSimulation.scenario.isPartial;
  const qsBaselineScore = baseline.methodologyBaselines.qs.usable
    ? qsUsesPartialComparison
      ? qsSimulation.current.partialEstimatedOverallScore
      : qsSimulation.current.overallMedian
    : null;
  const qsBaselineRankBand = baseline.methodologyBaselines.qs.usable
    ? qsRank.current.calibrated.predictedBand
    : null;
  const qsProposedScore = !qsAffected
    ? hasActualChanges ? qsBaselineScore : null
    : qsStatus === "invalid" || qsStatus === "insufficient-data"
      ? null
      : qsUsesPartialComparison
        ? qsSimulation.scenario.partialEstimatedOverallScore
        : qsSimulation.scenario.overallMedian;
  const qsRawChangedMetrics = Object.keys(qsSimulation.diagnostics.currentRawIndicators)
    .filter((code) => !Object.is(
      qsSimulation.diagnostics.currentRawIndicators[code as keyof typeof qsSimulation.diagnostics.currentRawIndicators].rawValue,
      qsSimulation.diagnostics.scenarioRawIndicators[code as keyof typeof qsSimulation.diagnostics.scenarioRawIndicators].rawValue,
    ));
  const qsScoreChangedMetrics = Object.keys(qsSimulation.current.indicators)
    .filter((code) => {
      const current = qsSimulation.current.indicators[code as keyof typeof qsSimulation.current.indicators].median;
      const scenario = qsSimulation.scenario.indicators[code as keyof typeof qsSimulation.scenario.indicators].median;
      return current !== null && scenario !== null && !Object.is(current, scenario);
    });
  const qsHeldConstantMetrics: string[] = [];
  const qsImpactedMetrics = impactedMetrics(changes, "qs");
  const qsIndicatorDetails: CrossAnalysisIndicatorDetail[] = qsAffected &&
    (qsStatus === "complete" || qsStatus === "raw-impact-only")
    ? qsImpactedMetrics.map((metricId) => {
        const code = metricId as keyof typeof qsSimulation.current.indicators;
        const baselineRawValue = qsSimulation.diagnostics.currentRawIndicators[code].rawValue;
        const proposedRawValue = qsSimulation.diagnostics.scenarioRawIndicators[code].rawValue;
        const baselineScore = qsSimulation.current.indicators[code].median;
        const proposedScore = qsSimulation.scenario.indicators[code].median;
        const scoreDelta = delta(baselineScore, proposedScore);
        const rawChanged = !Object.is(baselineRawValue, proposedRawValue);
        return {
          metricId,
          baselineRawValue,
          proposedRawValue,
          baselineScore,
          proposedScore,
          scoreDelta,
          baselineContribution: null,
          proposedContribution: null,
          contributionDelta: null,
          scoreValueKind: baselineScore === null || proposedScore === null
            ? "unavailable"
            : "indicator-score",
          impactType: rawChanged && proposedScore === null
            ? "raw-only"
            : scoreDelta !== null && scoreDelta !== 0
              ? "score-changed"
              : rawChanged ? "score-unchanged" : "score-unchanged",
          parameterIds: metricParameterIds(changes, "qs", metricId),
        } satisfies CrossAnalysisIndicatorDetail;
      })
    : [];

  return {
    changes,
    parameterTraces: actualChanges(changes).flatMap((change) =>
      affectedMethodologies(change.parameterId).map((methodology) => ({
        parameterId: change.parameterId,
        methodology,
        baselineYear: baseline.methodologyBaselines[methodology].year,
        baselineValue: baseline.methodologyParameterValues[methodology][change.parameterId] ?? null,
        proposedValue: change.proposedValue,
      }))),
    validationIssues: validation.issues,
    methodologies: {
      the: {
        affected: theAffected,
        status: theStatus,
        baselineScore: theBaselineScore,
        proposedScore: theProposedScore,
        scoreDelta: delta(theBaselineScore, theProposedScore),
        baselineRankBand: theBaselineRankBand,
        proposedRankBand: theProposedScore === null
          ? null
          : theAffected ? theSimulation.scenario.predictedRankBand : theBaselineRankBand,
        impactedMetrics: theImpactedMetrics,
        rawChangedMetrics: changedMetricIds(theIndicatorDetails, "raw"),
        scoreChangedMetrics: changedMetricIds(theIndicatorDetails, "score"),
        indicatorDetails: theIndicatorDetails,
        missingMetrics: theMissingMetrics,
        rankMetadata: {
          baseline: {
            source: theSimulation.current.rankBandSource,
            estimate: theSimulation.current.rankEstimate,
          },
          proposed: {
            source: theSimulation.scenario.rankBandSource,
            estimate: theSimulation.scenario.rankEstimate,
          },
        },
        warnings: [...theSimulation.diagnostics.warnings, ...Object.values(theMetricErrors)],
        baselineContext: { ...baseline.methodologyBaselines.the },
      },
      qs: {
        affected: qsAffected,
        status: qsStatus,
        baselineScore: qsBaselineScore,
        proposedScore: qsProposedScore,
        scoreDelta: delta(qsBaselineScore, qsProposedScore),
        baselineRankBand: qsBaselineRankBand,
        proposedRankBand: qsProposedScore === null
          ? null
          : qsAffected ? qsRank.scenario.calibrated.predictedBand : qsBaselineRankBand,
        impactedMetrics: qsImpactedMetrics,
        rawChangedMetrics: changedMetricIds(qsIndicatorDetails, "raw"),
        scoreChangedMetrics: changedMetricIds(qsIndicatorDetails, "score"),
        indicatorDetails: qsIndicatorDetails,
        missingMetrics: Array.from(new Set([
          ...qsSimulation.current.missingIndicatorCodes,
          ...qsSimulation.scenario.missingIndicatorCodes,
        ])),
        propagation: {
          rawChangedMetrics: qsRawChangedMetrics,
          scoreChangedMetrics: qsScoreChangedMetrics,
          heldConstantMetrics: qsHeldConstantMetrics,
        },
        rankMetadata: {
          approximate: qsSimulation.isApproximate,
          methodologyYear: qsRank.methodologyYear,
          baseline: qsRank.current,
          proposed: qsRank.scenario,
        },
        warnings: [
          ...qsSimulation.warnings,
        ],
        baselineContext: { ...baseline.methodologyBaselines.qs },
      },
    },
  };
}

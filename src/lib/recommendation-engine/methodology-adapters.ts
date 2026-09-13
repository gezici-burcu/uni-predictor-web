import { THE_ACTIVE_DATA_MODE } from "@/src/config/the.data-mode";
import { THE_RECOMMENDATION_PARAMETER_DEFINITIONS, THE_SIMULATOR_PARAMETER_GROUPS } from "@/src/config/the-simulator-parameters";
import type { AppLanguage } from "@/src/i18n/types";
import { UI_GREENMETRIC_ACTIVE_DATA_MODE } from "@/src/config/ui-greenmetric.data-mode";
import { greenMetricCategories } from "@/src/config/greenmetric.categories";
import { greenMetricIndicators } from "@/src/config/greenmetric.metrics";
import { calculateTheAggregateScores, calculateTheIndicatorEngine, calculateThePublicSimulationResult, createTheInputData, createThePublicSimulationReferences } from "@/src/lib/calculations/the";
import type { ThePublicSimulationResult } from "@/src/lib/calculations/the/calculateThePublicSimulationResult";
import { calculateQsRawIndicators, calculateQsResult, createQsPublicSimulationReferences, runQsStochasticSimulation } from "@/src/lib/calculations/qs";
import { QS_STOCHASTIC_MODEL_CONFIG } from "@/src/config/qs.stochastic";
import { calculateUiGreenMetricResult } from "@/src/lib/calculations/ui-greenmetric";
import type { UiGreenMetricCalculationResult } from "@/src/lib/calculations/ui-greenmetric/types";
import type { GreenMetricValues } from "@/src/types/greenmetric";
import type { QsCalculationResult, QsMetricValues } from "@/src/types/qs";
import type { RecommendationAdapter, RecommendationMetricDefinition, RecommendationMetricKind, RecommendationParameterKind } from "./types";
import { applyQsRawRecommendationValuesToMetricValues, createQsRawRecommendationDefinitions } from "./qs-recommendation-parameters";
import { generateGreenMetricThresholdCandidates, getGreenMetricRecommendationDirection } from "./greenmetric-threshold-candidates";
import { QS_MINIMUM_DISPLAYED_RECOMMENDATION_IMPACT } from "./qs-recommendation-impact";
import { UNAVAILABLE_RECOMMENDATION_RANK_ESTIMATE } from "./rank-target";
import { buildQsCalculationInputs } from "@/src/lib/qs/qs-calculation-inputs";
import { estimateQsRank } from "@/src/lib/qs/estimate-qs-rank";
import type { QsInstitutionalYearData } from "@/src/contexts/InstitutionDataContext";
import type { RecommendationRankEstimate } from "./types";

const direct = new Set(["the.teaching.reputationScore","the.researchEnvironment.reputationScore","the.researchQuality.citationImpactScore","the.researchQuality.researchStrengthScore","the.researchQuality.researchExcellenceScore","the.researchQuality.researchInfluenceScore","the.industry.patentScore"]);
const makeDefinition = (metric:{id:string;label:string;min?:number;max?:number;fallbackMax?:number;step?:number;inputType?:string;integerOnly?:boolean;options?:{value:string}[]},categoryId:string,kind:RecommendationMetricKind,direction:"increase-only"|"decrease-only"|"both"|"locked"="increase-only",evidence=false,parameterKind:RecommendationParameterKind="institutionalInput"):RecommendationMetricDefinition => ({ metricId:metric.id,engineField:metric.id,parameterKind,isEditableInput:parameterKind==="institutionalInput"||parameterKind==="externalInput",isRecommendationCandidate:(parameterKind==="institutionalInput"||parameterKind==="externalInput")&&direction!=="locked",label:metric.label,categoryId,kind,direction,effort:direct.has(metric.id)||metric.id.includes("Reputation")?"very-high":"medium",risk:direct.has(metric.id)?"high":"low",confidence:direct.has(metric.id)?"low":"medium",controllability:direct.has(metric.id)?"low":"high",evidenceRequired:evidence,affectsTotalScore:true,defaultLocked:direction==="locked",technicalMinimum:metric.min??null,technicalMaximum:metric.max??metric.fallbackMax??null,step:metric.step??null,options:metric.options?.map(option=>option.value) });
export const createTheRecommendationDefinitions = (language: AppLanguage): RecommendationMetricDefinition[] => {
  const groupLabels = new Map(THE_SIMULATOR_PARAMETER_GROUPS.map((group) => [group.id, group.label[language]]));
  return THE_RECOMMENDATION_PARAMETER_DEFINITIONS
    .map((parameter) => {
      const metric = parameter.metric!;
      const lowerId = metric.id.toLowerCase();
      const definition = makeDefinition(
        { ...metric, label: parameter.label[language] },
        parameter.groupId,
        direct.has(metric.id)
          ? "direct-score"
          : lowerId.includes("income")
            ? "financial"
            : lowerId.includes("staff") || lowerId.includes("student")
              ? "headcount"
              : "output-count",
        "increase-only",
      );
      return { ...definition, groupId: parameter.groupId, groupLabel: groupLabels.get(parameter.groupId) };
    });
};
const greenDefinitions = greenMetricCategories
  .flatMap((category) => greenMetricIndicators
    .filter((indicator) => indicator.categoryCode === category.code)
    .flatMap((indicator) => indicator.metrics
      .filter((metric) => !metric.readonly &&
        (!metric.infoOnly || metric.id.startsWith("greenmetric.ec.renewableProduction.")))
      .map((metric) => ({
        ...makeDefinition(
          metric,
          indicator.categoryCode,
          metric.inputType === "select" ? "ordered-level" :
            metric.inputType === "multi-select" ? "integer-count" :
              metric.inputType === "percentage" ? "percentage" :
                metric.integerOnly ? "integer-count" : "continuous",
          getGreenMetricRecommendationDirection(metric.id),
          indicator.evidenceRequired,
        ),
        technicalMaximum: metric.max ?? null,
        recommendationStrategy: "greenmetric-next-threshold" as const,
        targetIndicatorCodes: [indicator.code],
      }))))
  .reduce<RecommendationMetricDefinition[]>((definitions, definition) => {
    const existing = definitions.find((item) => item.metricId === definition.metricId);
    if (!existing) return [...definitions, definition];
    existing.targetIndicatorCodes = [...new Set([
      ...(existing.targetIndicatorCodes ?? []),
      ...(definition.targetIndicatorCodes ?? []),
    ])];
    if (existing.categoryId !== definition.categoryId) existing.categoryId = null;
    return definitions;
  }, []);

export function createRecommendationAdapters(baselines:{the:Record<string,unknown>;qs:Record<string,unknown>;"ui-greenmetric":Record<string,unknown>}, options: { qsInstitutionalYear?: number; language?: AppLanguage } = {}):Record<"the"|"qs"|"ui-greenmetric",RecommendationAdapter>{
  const theBaseline=baselines.the, theInput=createTheInputData(theBaseline);
  const raw=calculateTheIndicatorEngine(theInput).rawIndicators;
  const references=createThePublicSimulationReferences(raw);
  const baselineAggregate=calculateTheAggregateScores(calculateTheIndicatorEngine(theInput,references).indicatorScores);
  const qsBaseline=baselines.qs as QsMetricValues;
  const qsDefinitions=createQsRawRecommendationDefinitions(options.language ?? "tr");
  const qsBaselineRankEstimate=getQsBaselineRecommendationRankEstimate(
    qsBaseline,
    options.qsInstitutionalYear,
  );
  const uiBaseline=baselines["ui-greenmetric"] as GreenMetricValues;
  return {
    the:{id:"the",scoreMinimum:0,scoreMaximum:100,initialValues:theBaseline,definitions:createTheRecommendationDefinitions(options.language ?? "tr"),returnBestEffortPlan:true,minimumDisplayedScoreImpact:.05,calculate(values){const aggregate=calculateTheAggregateScores(calculateTheIndicatorEngine(createTheInputData(values),references).indicatorScores);return THE_ACTIVE_DATA_MODE==="public-simulation"?calculateThePublicSimulationResult(baselineAggregate,aggregate):{baseline:baselineAggregate,scenario:aggregate,baselineRankBand:"",scenarioRankBand:null}},getDisplayedScore(result){return (result as ThePublicSimulationResult).scenario.totalScore},getCategoryScores(result){return (result as ThePublicSimulationResult).scenario.categoryScores as unknown as Record<string,number|null>},getRankEstimate(result){const band=(result as ThePublicSimulationResult).scenarioRankBand;return band?{exactRank:null,band,available:true,approximate:true}:UNAVAILABLE_RECOMMENDATION_RANK_ESTIMATE}},
    qs:{id:"qs",scoreMinimum:0,scoreMaximum:100,initialValues:qsBaseline,definitions:qsDefinitions,returnBestEffortPlan:true,minimumDisplayedScoreImpact:QS_MINIMUM_DISPLAYED_RECOMMENDATION_IMPACT,maximumRecommendedChanges:3,bestEffortScoreRetentionRatio:.9,calculate(values){return calculateCanonicalQsRecommendationResult(qsBaseline, values as QsMetricValues, qsDefinitions, qsBaselineRankEstimate, options.qsInstitutionalYear)},getDisplayedScore(result){return (result as QsCalculationResult).displayedScore},getCategoryScores(result){return (result as QsCalculationResult).lensScores as unknown as Record<string,number|null>},getRankEstimate(result){return (result as QsRecommendationCalculationResult).recommendationRankEstimate}},
    "ui-greenmetric":{id:"ui-greenmetric",scoreMinimum:0,scoreMaximum:10000,initialValues:uiBaseline,definitions:greenDefinitions,returnBestEffortPlan:true,calculate(values){return calculateUiGreenMetricResult({values:values as GreenMetricValues,mode:UI_GREENMETRIC_ACTIVE_DATA_MODE})},getDisplayedScore(result){return (result as UiGreenMetricCalculationResult).totalScore},getCategoryScores(result){return (result as UiGreenMetricCalculationResult).displayedCategoryScores},getIndicatorScores(result){return Object.fromEntries(Object.entries((result as UiGreenMetricCalculationResult).indicatorResults).map(([code,value])=>[code,value.score]))},getRankEstimate(result){const calculation=result as UiGreenMetricCalculationResult;return calculation.estimatedRank!==null||calculation.estimatedRankBand?{exactRank:calculation.estimatedRank,band:calculation.estimatedRankBand,available:true,approximate:true}:UNAVAILABLE_RECOMMENDATION_RANK_ESTIMATE},generateCandidates({values,definition,constraint}){return generateGreenMetricThresholdCandidates({values:values as GreenMetricValues,definition,constraint})}}
  };
}

function calculateCanonicalQsRecommendationResult(
  baselineValues: QsMetricValues,
  scenarioValues: QsMetricValues,
  definitions: RecommendationMetricDefinition[],
  baselineRankEstimate: RecommendationRankEstimate,
  institutionalYear = 2024,
): QsRecommendationCalculationResult {
  const baselineEffective = applyQsRawRecommendationValuesToMetricValues(baselineValues) as QsMetricValues;
  const scenarioEffective = applyQsRawRecommendationValuesToMetricValues(scenarioValues) as QsMetricValues;
  const references = createQsPublicSimulationReferences(calculateQsRawIndicators(baselineEffective));
  const result = calculateQsResult({
    values: scenarioEffective,
    baselineValues: baselineEffective,
    dataMode: "public-simulation",
    references,
    hasScenarioChanges: true,
  });
  const hasScenarioChanges = definitions.some((definition) =>
    !Object.is(
      baselineValues[definition.engineField],
      scenarioValues[definition.engineField],
    ));
  const simulation = runQsStochasticSimulation({
    currentInputs: buildQsCalculationInputs(toQsInstitutionalYearData(baselineValues)),
    scenarioInputs: buildQsCalculationInputs(toQsInstitutionalYearData(scenarioValues)),
    selectedInstitutionalYear: institutionalYear,
    modelConfig: {
      ...QS_STOCHASTIC_MODEL_CONFIG,
      simulationRunCount: 201,
    },
  });
  const estimatedOverallScore = simulation.scenario.estimatedOverallScore;
  const recommendationDisplayedScore = estimatedOverallScore ??
    simulation.scenario.partialEstimatedOverallScore;
  const estimatedRank = estimateQsRank(simulation).scenario;
  const recommendationRankEstimate = estimatedRank.status === "ready" &&
    estimatedRank.calibrated.predictedBand
    ? {
        exactRank: estimatedRank.calibrated.expectedRank,
        band: estimatedRank.calibrated.predictedBand,
        available: true,
        approximate: true,
      }
    : hasScenarioChanges
      ? UNAVAILABLE_RECOMMENDATION_RANK_ESTIMATE
      : baselineRankEstimate;
  return {
    ...result,
    finalOverallScore: estimatedOverallScore,
    displayedScore: recommendationDisplayedScore,
    scoreKind: recommendationDisplayedScore === null ? "unavailable" : "estimated-overall",
    estimatedScenarioRankBand: recommendationRankEstimate.band,
    recommendationProjectedScoreAvailable: recommendationDisplayedScore !== null,
    recommendationScoreCoverage: {
      isPartial: simulation.scenario.isPartial,
      includedIndicatorCodes: simulation.scenario.includedIndicatorCodes,
      excludedIndicatorCodes: simulation.scenario.excludedIndicatorCodes,
      includedWeight: simulation.scenario.includedWeight,
      excludedWeight: simulation.scenario.excludedWeight,
    },
    recommendationRankEstimate,
  };
}

type QsRecommendationCalculationResult = QsCalculationResult & {
  recommendationProjectedScoreAvailable: boolean;
  recommendationScoreCoverage: import("./types").QsRecommendationScoreCoverage;
  recommendationRankEstimate: RecommendationRankEstimate;
};

const cachedQsBaselineRecommendationRankEstimates = new Map<string, RecommendationRankEstimate>();

function getQsBaselineRecommendationRankEstimate(
  values: QsMetricValues,
  institutionalYear = 2024,
): RecommendationRankEstimate {
  const institutionalData = toQsInstitutionalYearData(values);
  const cacheKey = `${institutionalYear}:${JSON.stringify(institutionalData)}`;
  const cached = cachedQsBaselineRecommendationRankEstimates.get(cacheKey);
  if (cached) return cached;
  const inputs = buildQsCalculationInputs(institutionalData);
  const simulation = runQsStochasticSimulation({
    currentInputs: inputs,
    scenarioInputs: inputs,
    selectedInstitutionalYear: institutionalYear,
  });
  const rank = estimateQsRank(simulation).current;
  const estimate = rank.status === "ready" &&
    rank.calibrated.predictedBand
    ? {
        exactRank: rank.calibrated.expectedRank,
        band: rank.calibrated.predictedBand,
        available: true,
        approximate: true,
      }
    : UNAVAILABLE_RECOMMENDATION_RANK_ESTIMATE;
  cachedQsBaselineRecommendationRankEstimates.set(cacheKey, estimate);
  return estimate;
}

function toQsInstitutionalYearData(values: QsMetricValues): QsInstitutionalYearData {
  const effective = applyQsRawRecommendationValuesToMetricValues(values);
  const fteIds = [
    "academicStaff",
    "internationalAcademicStaff",
    "undergraduateStudents",
    "undergraduateInternationalStudents",
    "graduatePostgraduateStudents",
    "graduatePostgraduateInternationalStudents",
  ] as const;
  const scalarIds = [
    "totalGraduateStudents2023",
    "totalEmploymentRespondents",
    "employedGraduates",
    "unemployedGraduates",
    "graduatesInFullTimeFurtherStudy",
    "graduatesUnavailableForWork",
  ] as const;
  return {
    ...Object.fromEntries(fteIds.map((id) => [id, {
      fullTime: finiteNumberOrNull(effective[`${id}.fullTime`]),
      partTime: finiteNumberOrNull(effective[`${id}.partTime`]),
    }])),
    ...Object.fromEntries(scalarIds.map((id) => [id, {
      value: finiteNumberOrNull(effective[id]),
    }])),
  } as QsInstitutionalYearData;
}

const finiteNumberOrNull = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

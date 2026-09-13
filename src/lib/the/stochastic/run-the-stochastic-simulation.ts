import {
  calculateTheRawIndicators,
  createTheInputData,
  THE_INDICATOR_METADATA,
  THE_INDICATOR_WEIGHTS,
} from "@/src/lib/calculations/the";
import { THE_RANK_ESTIMATION_CATEGORY_WEIGHTS } from "@/src/config/the-rank-estimation";
import { THE_UNVERIFIED_RAW_TO_SCORE_PARAMETER_IDS } from "@/src/config/the-simulator-parameters";
import {
  applyTheRankDominanceGuard,
  compareTheCategoryVectors,
  estimateCalibratedTheRankBand,
  prepareTheRankCalibration,
  type CalibratedTheRankEstimate,
  type TheRankBandSource,
} from "@/src/lib/the/calibrated-rank-band";
import { resolveActiveReferenceDatasetSync } from "@/src/lib/rankings/dataset-resolver";
import { toLegacyTheReferenceDataset } from "@/src/lib/rankings/bundled-datasets";
import scoreCalibrationDatasetJson from "@/src/data/the/reference/the-2026-calibration-reference-dataset.json";
import type {
  TheCategoryScores,
  TheIndicatorCode,
  TheRawIndicatorResult,
} from "@/src/types/the-calculation";
import type { TheReferenceDataset } from "@/src/types/the-reference-dataset";
import {
  empiricalCdf,
  empiricalQuantile,
  inverseNormalCdf,
  percentileToScore,
} from "./empirical-distribution";
import { createMulberry32, sampleTriangular } from "./seeded-prng";
import {
  THE_STOCHASTIC_MODEL_CONFIG,
  type TheStochasticModelConfig,
} from "./the-stochastic-model-config";
import {
  areTheCategoryRawIndicatorsEquivalent,
  compareTheCalibrationRawIndicators,
  isTheCalibrationEquivalent,
  type CalibrationRawDifference,
} from "./calibration-equivalence";

const CATEGORY_KEYS = [
  "teaching",
  "researchEnvironment",
  "researchQuality",
  "internationalOutlook",
  "industry",
] as const;
type CategoryKey = typeof CATEGORY_KEYS[number];
type CategorySamples = Record<CategoryKey, number[]>;
type CachedSideSamples = {
  categories: CategorySamples;
  overall: number[];
  bands: Record<string, number>;
};
const RAW_CATEGORY_TO_KEY = {
  TEACHING: "teaching",
  RESEARCH_ENVIRONMENT: "researchEnvironment",
  RESEARCH_QUALITY: "researchQuality",
  INTERNATIONAL_OUTLOOK: "internationalOutlook",
  INDUSTRY: "industry",
} as const;

export type StochasticCalculationStatus = "complete" | "partial" | "invalid";
export type ScoreSummary = {
  samples: number[];
  median: number;
  mean: number;
  p10: number;
  p90: number;
};
export type IndicatorChangeDiagnostic = {
  code: TheIndicatorCode;
  label: string;
  rawUnit: string | null;
  rawValueMeaning: string;
  category: CategoryKey;
  officialWeight: number;
  configuredDirection: "higherIsBetter" | "lowerIsBetter";
  calibrationRawValue: number | null;
  currentRawValue: number | null;
  scenarioRawValue: number | null;
  currentRelativeChange: number | null;
  scenarioRelativeChange: number | null;
  scenarioRelativeChangeFromCurrent: number | null;
  effect: "increasing" | "decreasing" | "unchanged" | "zero-weight" | "unavailable";
  status: "calculated" | "baseline-preserved" | "invalid";
};
export type StochasticSideResult = {
  categories: Record<CategoryKey, ScoreSummary>;
  categoryMedian: TheCategoryScores;
  overall: ScoreSummary;
  overallMedian: number;
  predictedRankBand: string | null;
  rankBandSource: TheRankBandSource;
  rankEstimate: CalibratedTheRankEstimate | null;
  categorySampleSources: Record<
    CategoryKey,
    "calibration-anchor" | "current-reuse" | "stochastic"
  >;
  rankBandCounts: Record<string, number>;
  calculationStatus: StochasticCalculationStatus;
};
export type TheStochasticSimulationResult = {
  modelVersion: string;
  seed: number;
  runCount: number;
  current: StochasticSideResult;
  scenario: StochasticSideResult;
  change: {
    categoryMedianDifference: Record<CategoryKey, number>;
    overallMedianDifference: number;
    rankBandTransition: string;
  };
  diagnostics: {
    exactInstitutionalInputCount: number;
    stochasticIndicatorCount: number;
    unavailableIndicatorCount: number;
    usedReferenceInstitutionCount: number;
    rankEstimatorExcludedInstitutionId: string;
    indicatorChanges: IndicatorChangeDiagnostic[];
    currentCalibrationEquivalent: boolean;
    scenarioCalibrationEquivalent: boolean;
    currentCalibrationDifferences: CalibrationRawDifference[];
    scenarioCalibrationDifferences: CalibrationRawDifference[];
    currentCategoryCalibrationEquivalent: Record<CategoryKey, boolean>;
    scenarioCategoryCalibrationEquivalent: Record<CategoryKey, boolean>;
    scenarioCategoryCurrentEquivalent: Record<CategoryKey, boolean>;
    heldRawToScoreParameterIds: string[];
    firstRunIndicatorSamples: Array<{
      code: TheIndicatorCode;
      sampledElasticity: number;
      currentWeightedContribution: number | null;
      scenarioWeightedContribution: number | null;
    }>;
    firstRunCategories: Record<CategoryKey, {
      currentDelta: number;
      scenarioDelta: number;
      currentTargetZ: number;
      scenarioTargetZ: number;
      currentScore: number;
      scenarioScore: number;
    }>;
    warnings: string[];
    assumptions: string[];
  };
};

export function compactTheStochasticSimulationForUi(
  result: TheStochasticSimulationResult,
): TheStochasticSimulationResult {
  const compactSide = (side: StochasticSideResult): StochasticSideResult => ({
    ...side,
    categories: CATEGORY_KEYS.reduce<Record<CategoryKey, ScoreSummary>>(
      (categories, category) => {
        categories[category] = {
          ...side.categories[category],
          samples: [],
        };
        return categories;
      },
      {} as Record<CategoryKey, ScoreSummary>,
    ),
    overall: { ...side.overall, samples: [] },
  });
  return {
    ...result,
    current: compactSide(result.current),
    scenario: compactSide(result.scenario),
  };
}
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const referenceScoreCache = new WeakMap<
  TheReferenceDataset,
  Record<CategoryKey, number[]>
>();
const elasticityCache = new Map<string, Record<TheIndicatorCode, number>[]>();
const sideSampleCaches = new WeakMap<
  TheReferenceDataset,
  Map<string, CachedSideSamples>
>();
const MAX_SIDE_CACHE_ENTRIES = 16;

export const THE_STOCHASTIC_CACHE_STATS = {
  referencePreparations: 0,
  elasticityPreparations: 0,
  sideCacheHits: 0,
  sideCacheMisses: 0,
};

const prepareReferenceScores = (dataset: TheReferenceDataset) => {
  const cached = referenceScoreCache.get(dataset);
  if (cached) return cached;
  THE_STOCHASTIC_CACHE_STATS.referencePreparations += 1;
  const prepared = Object.fromEntries(CATEGORY_KEYS.map((category) => [
    category,
    dataset.records.flatMap((record) => {
      const value = record.categoryScores[category];
      return value === null || !Number.isFinite(value) ? [] : [value];
    }).sort((left, right) => left - right),
  ])) as Record<CategoryKey, number[]>;
  referenceScoreCache.set(dataset, prepared);
  return prepared;
};

const prepareElasticities = (
  changes: IndicatorChangeDiagnostic[],
  config: TheStochasticModelConfig,
) => {
  const key = [
    config.modelVersion,
    config.seed,
    config.simulationRunCount,
    config.uncertainty.elasticity.minimum,
    config.uncertainty.elasticity.mode,
    config.uncertainty.elasticity.maximum,
  ].join(":");
  const cached = elasticityCache.get(key);
  if (cached) return cached;
  THE_STOCHASTIC_CACHE_STATS.elasticityPreparations += 1;
  const random = createMulberry32(config.seed);
  const prepared = Array.from(
    { length: config.simulationRunCount },
    () => Object.fromEntries(changes.map(({ code }) => [
      code,
      sampleTriangular(
        random,
        config.uncertainty.elasticity.minimum,
        config.uncertainty.elasticity.mode,
        config.uncertainty.elasticity.maximum,
      ),
    ])) as Record<TheIndicatorCode, number>,
  );
  elasticityCache.set(key, prepared);
  return prepared;
};

const rawVectorKey = (
  raw: Record<TheIndicatorCode, TheRawIndicatorResult>,
  config: TheStochasticModelConfig,
) => JSON.stringify([
  config.modelVersion,
  config.seed,
  config.simulationRunCount,
  ...Object.keys(THE_INDICATOR_METADATA).map(
    (code) => raw[code as TheIndicatorCode].rawValue,
  ),
]);

export function calculateOrientedRelativeChange(
  baseline: number | null,
  target: number | null,
  {
    epsilon,
    minimum,
    maximum,
    higherIsBetter,
  }: {
    epsilon: number;
    minimum: number;
    maximum: number;
    higherIsBetter: boolean;
  },
): number | null {
  if (
    baseline === null ||
    target === null ||
    !Number.isFinite(baseline) ||
    !Number.isFinite(target)
  ) return null;
  const raw = baseline > epsilon && target > epsilon
    ? Math.log(target / baseline)
    : 2 * (target - baseline) /
      (Math.abs(target) + Math.abs(baseline) + epsilon);
  return clamp(higherIsBetter ? raw : -raw, minimum, maximum);
}

/** @deprecated Use calculateOrientedRelativeChange; retained for diagnostic API compatibility. */
export const calculateSymmetricRelativeChange =
  calculateOrientedRelativeChange;

const scoreSummary = (samples: number[]): ScoreSummary => {
  const sorted = [...samples].sort((left, right) => left - right);
  const identical = sorted.every((value) => value === sorted[0]);
  return {
    samples,
    median: empiricalQuantile(sorted, 0.5),
    mean: identical
      ? sorted[0]
      : sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    p10: empiricalQuantile(sorted, 0.1),
    p90: empiricalQuantile(sorted, 0.9),
  };
};

const completeCategoryScores = (
  config: TheStochasticModelConfig,
): Record<CategoryKey, number> => {
  const scores = config.publishedCategoryScores;
  for (const key of CATEGORY_KEYS) {
    if (scores[key] === null || !Number.isFinite(scores[key])) {
      throw new Error(`Kalibrasyon kategori skoru eksik: ${key}`);
    }
  }
  return {
    teaching: scores.teaching!,
    researchEnvironment: scores.researchEnvironment!,
    researchQuality: scores.researchQuality!,
    internationalOutlook: scores.internationalOutlook!,
    industry: scores.industry!,
  };
};

const rawChanges = ({
  calibration,
  current,
  scenario,
  config,
}: {
  calibration: Record<TheIndicatorCode, TheRawIndicatorResult>;
  current: Record<TheIndicatorCode, TheRawIndicatorResult>;
  scenario: Record<TheIndicatorCode, TheRawIndicatorResult>;
  config: TheStochasticModelConfig;
}) => Object.keys(THE_INDICATOR_WEIGHTS).map((rawCode) => {
  const code = rawCode as TheIndicatorCode;
  const calibrationValue = calibration[code].rawValue;
  const currentValue = current[code].rawValue;
  const scenarioValue = scenario[code].rawValue;
  const common = {
    epsilon: config.uncertainty.epsilon,
    minimum: config.uncertainty.relativeChangeMinimum,
    maximum: config.uncertainty.relativeChangeMaximum,
    higherIsBetter: THE_INDICATOR_METADATA[code].beneficialDirection === "higherIsBetter",
  };
  const currentChange = calculateOrientedRelativeChange(
    calibrationValue,
    currentValue,
    common,
  );
  const scenarioChange = calculateOrientedRelativeChange(
    calibrationValue,
    scenarioValue,
    common,
  );
  const scenarioFromCurrent = calculateOrientedRelativeChange(
    currentValue,
    scenarioValue,
    common,
  );
  const unchangedMissing =
    currentValue === null && scenarioValue === null &&
    calibrationValue !== null;
  return {
    code,
    label: calibration[code].label,
    rawUnit: calibration[code].rawUnit,
    rawValueMeaning: THE_INDICATOR_METADATA[code].rawValueMeaning,
    category: RAW_CATEGORY_TO_KEY[calibration[code].category],
    officialWeight: THE_INDICATOR_WEIGHTS[code],
    configuredDirection: THE_INDICATOR_METADATA[code].beneficialDirection,
    calibrationRawValue: calibrationValue,
    currentRawValue: currentValue,
    scenarioRawValue: scenarioValue,
    currentRelativeChange: currentChange,
    scenarioRelativeChange: scenarioChange,
    scenarioRelativeChangeFromCurrent: scenarioFromCurrent,
    effect: THE_INDICATOR_WEIGHTS[code] === 0
      ? "zero-weight" as const
      : scenarioFromCurrent === null
        ? "unavailable" as const
        : Math.abs(scenarioFromCurrent) <= config.uncertainty.epsilon
          ? "unchanged" as const
          : scenarioFromCurrent > 0
            ? "increasing" as const
            : "decreasing" as const,
    status: currentChange !== null && scenarioChange !== null
      ? "calculated" as const
      : unchangedMissing
        ? "baseline-preserved" as const
        : "invalid" as const,
  };
});

export function runTheStochasticSimulation({
  calibrationInputs,
  currentInputs,
  scenarioInputs,
  referenceDataset = toLegacyTheReferenceDataset(resolveActiveReferenceDatasetSync("THE").dataset),
  modelConfig = THE_STOCHASTIC_MODEL_CONFIG,
}: {
  calibrationInputs: Record<string, unknown>;
  currentInputs: Record<string, unknown>;
  scenarioInputs: Record<string, unknown>;
  referenceDataset?: TheReferenceDataset;
  modelConfig?: TheStochasticModelConfig;
}): TheStochasticSimulationResult {
  const scenarioCalculationInputs = { ...scenarioInputs };
  const heldRawToScoreParameterIds: string[] = [];
  const rawParameterToNormalizedScoreInput: Readonly<Record<string, string>> = {
    "the.researchQuality.fwci": "the.researchQuality.citationImpactScore",
    "the.researchQuality.researchStrengthScore": "the.researchQuality.researchStrengthScore",
    "the.researchQuality.researchExcellenceScore": "the.researchQuality.researchExcellenceScore",
    "the.researchQuality.researchInfluenceScore": "the.researchQuality.researchInfluenceScore",
    "the.industry.citingPatentCount": "the.industry.patentScore",
  };
  for (const parameterId of THE_UNVERIFIED_RAW_TO_SCORE_PARAMETER_IDS) {
    if (Object.is(currentInputs[parameterId], scenarioInputs[parameterId])) continue;
    heldRawToScoreParameterIds.push(parameterId);
    const scoreInputId = rawParameterToNormalizedScoreInput[parameterId];
    scenarioCalculationInputs[scoreInputId] = currentInputs[scoreInputId] ?? null;
  }
  const calibrationRaw = calculateTheRawIndicators(createTheInputData({ ...calibrationInputs }));
  const currentRaw = calculateTheRawIndicators(createTheInputData({ ...currentInputs }));
  const scenarioRaw = calculateTheRawIndicators(createTheInputData(scenarioCalculationInputs));
  const calibrationTolerance = {
    absoluteTolerance:
      modelConfig.uncertainty.calibrationAbsoluteTolerance,
    relativeTolerance:
      modelConfig.uncertainty.calibrationRelativeTolerance,
  };
  const currentCalibrationDifferences = compareTheCalibrationRawIndicators({
    calibrationRawIndicators: calibrationRaw,
    targetRawIndicators: currentRaw,
    tolerance: calibrationTolerance,
  });
  const scenarioCalibrationDifferences = compareTheCalibrationRawIndicators({
    calibrationRawIndicators: calibrationRaw,
    targetRawIndicators: scenarioRaw,
    tolerance: calibrationTolerance,
  });
  const currentCalibrationEquivalent = isTheCalibrationEquivalent({
    calibrationRawIndicators: calibrationRaw,
    targetRawIndicators: currentRaw,
    tolerance: calibrationTolerance,
  });
  const scenarioCalibrationEquivalent = isTheCalibrationEquivalent({
    calibrationRawIndicators: calibrationRaw,
    targetRawIndicators: scenarioRaw,
    tolerance: calibrationTolerance,
  });
  const compareCategories = (
    left: Record<TheIndicatorCode, TheRawIndicatorResult>,
    right: Record<TheIndicatorCode, TheRawIndicatorResult>,
  ) => Object.fromEntries(CATEGORY_KEYS.map((category) => {
    const rawCategory = Object.values(calibrationRaw).find(
      (indicator) => RAW_CATEGORY_TO_KEY[indicator.category] === category,
    )?.category;
    if (!rawCategory) {
      throw new Error(`THE kategori metadata bulunamadı: ${category}`);
    }
    return [
      category,
      areTheCategoryRawIndicatorsEquivalent({
        category: rawCategory,
        leftRawIndicators: left,
        rightRawIndicators: right,
        tolerance: calibrationTolerance,
      }),
    ];
  })) as Record<CategoryKey, boolean>;
  const currentCategoryCalibrationEquivalent = compareCategories(
    calibrationRaw,
    currentRaw,
  );
  const scenarioCategoryCalibrationEquivalent = compareCategories(
    calibrationRaw,
    scenarioRaw,
  );
  const scenarioCategoryCurrentEquivalent = compareCategories(
    currentRaw,
    scenarioRaw,
  );
  const changes = rawChanges({
    calibration: calibrationRaw,
    current: currentRaw,
    scenario: scenarioRaw,
    config: modelConfig,
  });
  const published = completeCategoryScores(modelConfig);
  const referenceCoverageSufficient = !referenceDataset.manifest.warnings.includes("insufficient-reference-coverage");
  const rankCalibration = referenceCoverageSufficient ? prepareTheRankCalibration({
    calibrationVector: published,
    publishedBand: modelConfig.publishedRankBand,
    referenceInstitutionId: modelConfig.referenceInstitutionId,
    dataset: referenceDataset,
  }) : null;
  const publishedOverall = Number(
    CATEGORY_KEYS.reduce(
      (sum, category) =>
        sum +
        published[category] *
          THE_RANK_ESTIMATION_CATEGORY_WEIGHTS[category],
      0,
    ).toFixed(12),
  );
  const referenceScores = prepareReferenceScores(scoreCalibrationDatasetJson as TheReferenceDataset);
  const sideCache = sideSampleCaches.get(referenceDataset) ?? new Map();
  sideSampleCaches.set(referenceDataset, sideCache);
  const currentKey = rawVectorKey(currentRaw, modelConfig);
  const scenarioKey = rawVectorKey(scenarioRaw, modelConfig);
  const cachedCurrent = sideCache.get(currentKey);
  const cachedScenario = sideCache.get(scenarioKey);
  THE_STOCHASTIC_CACHE_STATS.sideCacheHits +=
    Number(Boolean(cachedCurrent)) + Number(Boolean(cachedScenario));
  THE_STOCHASTIC_CACHE_STATS.sideCacheMisses +=
    Number(!cachedCurrent) + Number(!cachedScenario);
  const emptyCategorySamples = () =>
    Object.fromEntries(
      CATEGORY_KEYS.map((key) => [key, [] as number[]]),
    ) as CategorySamples;
  const currentSamples = cachedCurrent?.categories ?? emptyCategorySamples();
  const scenarioSamples = cachedScenario?.categories ?? emptyCategorySamples();
  const currentOverall = cachedCurrent?.overall ?? [];
  const scenarioOverall = cachedScenario?.overall ?? [];
  const currentBands = cachedCurrent?.bands ?? {};
  const scenarioBands = cachedScenario?.bands ?? {};
  const firstRunIndicatorSamples: TheStochasticSimulationResult["diagnostics"]["firstRunIndicatorSamples"] = [];
  const firstRunCategories = {} as TheStochasticSimulationResult["diagnostics"]["firstRunCategories"];
  const elasticitySamples = prepareElasticities(changes, modelConfig);

  for (let run = 0; run < modelConfig.simulationRunCount; run += 1) {
    const elasticity = elasticitySamples[run];
    const vectors = { current: {} as Record<CategoryKey, number>, scenario: {} as Record<CategoryKey, number> };
    for (const category of CATEGORY_KEYS) {
      const categoryWeight = THE_RANK_ESTIMATION_CATEGORY_WEIGHTS[category] * 100;
      const categoryChanges = changes.filter(
        (change) => change.category === category && change.officialWeight > 0,
      );
      for (const side of ["current", "scenario"] as const) {
        const sideCached = side === "current"
          ? Boolean(cachedCurrent)
          : Boolean(cachedScenario);
        if (sideCached && run > 0) continue;
        const delta = categoryChanges.reduce((sum, change) => {
          const relative = side === "current"
            ? change.currentRelativeChange
            : change.scenarioRelativeChange;
          return relative === null
            ? sum
            : sum + change.officialWeight / categoryWeight * relative * elasticity[change.code];
        }, 0);
        const calibrationEquivalent = side === "current"
          ? currentCategoryCalibrationEquivalent[category]
          : scenarioCategoryCalibrationEquivalent[category];
        const reuseCurrent =
          side === "scenario" &&
          scenarioCategoryCurrentEquivalent[category];
        const score = reuseCurrent
          ? currentSamples[category][run]
          : calibrationEquivalent
            ? published[category]
            : clamp(
                percentileToScore(
                  referenceScores[category],
                  published[category],
                  modelConfig.uncertainty.latentScale * delta,
                ),
                0,
                100,
              );
        vectors[side][category] = score;
        if (!sideCached) {
          (side === "current"
            ? currentSamples
            : scenarioSamples)[category].push(score);
        }
        if (run === 0) {
          const baseZ = inverseNormalCdf(
            empiricalCdf(referenceScores[category], published[category]),
          );
          const audit = firstRunCategories[category] ?? {
            currentDelta: 0,
            scenarioDelta: 0,
            currentTargetZ: baseZ,
            scenarioTargetZ: baseZ,
            currentScore: published[category],
            scenarioScore: published[category],
          };
          audit[`${side}Delta`] = delta;
          audit[`${side}TargetZ`] =
            baseZ + modelConfig.uncertainty.latentScale * delta;
          audit[`${side}Score`] = score;
          firstRunCategories[category] = audit;
        }
      }
    }
    if (run === 0) {
      for (const change of changes) {
        const categoryWeight =
          THE_RANK_ESTIMATION_CATEGORY_WEIGHTS[change.category] * 100;
        const factor =
          change.officialWeight / categoryWeight * elasticity[change.code];
        firstRunIndicatorSamples.push({
          code: change.code,
          sampledElasticity: elasticity[change.code],
          currentWeightedContribution:
            change.currentRelativeChange === null
              ? null
              : factor * change.currentRelativeChange,
          scenarioWeightedContribution:
            change.scenarioRelativeChange === null
              ? null
              : factor * change.scenarioRelativeChange,
        });
      }
    }
    const currentVector = Object.fromEntries(
      CATEGORY_KEYS.map((category) => [
        category,
        cachedCurrent ? currentSamples[category][run] : vectors.current[category],
      ]),
    ) as Record<CategoryKey, number>;
    const scenarioVector = Object.fromEntries(
      CATEGORY_KEYS.map((category) => [
        category,
        cachedScenario ? scenarioSamples[category][run] : vectors.scenario[category],
      ]),
    ) as Record<CategoryKey, number>;
    const estimateRanksForSample = run === 0;
    const currentBand = currentCalibrationEquivalent
      ? modelConfig.publishedRankBand
      : !rankCalibration || !estimateRanksForSample
        ? null
      : estimateCalibratedTheRankBand({
          categoryScores: currentVector,
          dataset: referenceDataset,
          calibration: rankCalibration,
        }).predictedBand;
    let scenarioBand = scenarioCalibrationEquivalent
      ? modelConfig.publishedRankBand
      : null;
    if (!scenarioCalibrationEquivalent && rankCalibration && estimateRanksForSample) {
      const estimate = estimateCalibratedTheRankBand({
        categoryScores: scenarioVector,
        dataset: referenceDataset,
        calibration: rankCalibration,
      });
      scenarioBand = applyTheRankDominanceGuard({
        currentBand,
        scenarioEstimate: estimate,
        relation: compareTheCategoryVectors(
          currentVector,
          scenarioVector,
          modelConfig.uncertainty.rankDominanceEpsilon,
        ),
      }).predictedBand;
    }
    if (!cachedCurrent) {
      const overall = currentCalibrationEquivalent
        ? publishedOverall
        : CATEGORY_KEYS.reduce(
            (sum, category) =>
              sum + currentVector[category] * THE_RANK_ESTIMATION_CATEGORY_WEIGHTS[category],
            0,
          );
      currentOverall.push(overall);
      if (currentBand) currentBands[currentBand] = (currentBands[currentBand] ?? 0) + 1;
    }
    if (!cachedScenario) {
      const overall = scenarioCalibrationEquivalent
        ? publishedOverall
        : CATEGORY_KEYS.reduce(
            (sum, category) =>
              sum + scenarioVector[category] * THE_RANK_ESTIMATION_CATEGORY_WEIGHTS[category],
            0,
          );
      scenarioOverall.push(overall);
      if (scenarioBand) scenarioBands[scenarioBand] = (scenarioBands[scenarioBand] ?? 0) + 1;
    }
  }

  for (const category of CATEGORY_KEYS) {
    if (scenarioCategoryCurrentEquivalent[category]) {
      scenarioSamples[category] = currentSamples[category];
    }
  }

  if (!cachedCurrent) {
    sideCache.set(currentKey, {
      categories: currentSamples,
      overall: currentOverall,
      bands: currentBands,
    });
  }
  if (!cachedScenario) {
    sideCache.set(scenarioKey, {
      categories: scenarioSamples,
      overall: scenarioOverall,
      bands: scenarioBands,
    });
  }
  while (sideCache.size > MAX_SIDE_CACHE_ENTRIES) {
    const oldestKey = sideCache.keys().next().value;
    if (oldestKey === undefined) break;
    sideCache.delete(oldestKey);
  }

  const currentCategorySampleSources = Object.fromEntries(
    CATEGORY_KEYS.map((category) => [
      category,
      currentCategoryCalibrationEquivalent[category]
        ? "calibration-anchor"
        : "stochastic",
    ]),
  ) as StochasticSideResult["categorySampleSources"];
  const scenarioCategorySampleSources = Object.fromEntries(
    CATEGORY_KEYS.map((category) => [
      category,
      scenarioCategoryCurrentEquivalent[category]
        ? "current-reuse"
        : scenarioCategoryCalibrationEquivalent[category]
          ? "calibration-anchor"
          : "stochastic",
    ]),
  ) as StochasticSideResult["categorySampleSources"];

  const buildSide = (
    categorySamples: Record<CategoryKey, number[]>,
    overallSamples: number[],
    rankBandCounts: Record<string, number>,
    calibrationEquivalent: boolean,
    categorySampleSources: StochasticSideResult["categorySampleSources"],
  ): StochasticSideResult => {
    const categories = Object.fromEntries(CATEGORY_KEYS.map((category) => [
      category,
      scoreSummary(categorySamples[category]),
    ])) as Record<CategoryKey, ScoreSummary>;
    const categoryMedian: TheCategoryScores = {
      teaching: categories.teaching.median,
      researchEnvironment: categories.researchEnvironment.median,
      researchQuality: categories.researchQuality.median,
      internationalOutlook: categories.internationalOutlook.median,
      industry: categories.industry.median,
    };
    const medianEstimate = calibrationEquivalent || !rankCalibration
      ? null
      : estimateCalibratedTheRankBand({
          categoryScores: categoryMedian as Record<CategoryKey, number>,
          dataset: referenceDataset,
          calibration: rankCalibration,
        });
    const predictedRankBand = calibrationEquivalent
      ? modelConfig.publishedRankBand
      : !referenceCoverageSufficient
        ? null
        : medianEstimate?.predictedBand ?? null;
    return {
      categories,
      categoryMedian,
      overall: scoreSummary(overallSamples),
      overallMedian: scoreSummary(overallSamples).median,
      predictedRankBand,
      rankBandSource: !referenceCoverageSufficient && !calibrationEquivalent
        ? "insufficient-reference-coverage"
        : calibrationEquivalent
        ? "calibration-anchor"
        : medianEstimate?.source ?? "raw-stochastic-estimator",
      rankEstimate: medianEstimate,
      categorySampleSources,
      rankBandCounts,
      calculationStatus: changes.some(({ status }) => status === "invalid")
        ? "partial"
        : "complete",
    };
  };
  const current = buildSide(
    currentSamples,
    currentOverall,
    currentBands,
    currentCalibrationEquivalent,
    currentCategorySampleSources,
  );
  const scenario = buildSide(
    scenarioSamples,
    scenarioOverall,
    scenarioBands,
    scenarioCalibrationEquivalent,
    scenarioCategorySampleSources,
  );
  return {
    modelVersion: modelConfig.modelVersion,
    seed: modelConfig.seed,
    runCount: modelConfig.simulationRunCount,
    current,
    scenario,
    change: {
      categoryMedianDifference: Object.fromEntries(CATEGORY_KEYS.map((category) => [
        category,
        scenario.categories[category].median - current.categories[category].median,
      ])) as Record<CategoryKey, number>,
      overallMedianDifference: scenario.overallMedian - current.overallMedian,
      rankBandTransition: `${current.predictedRankBand ?? "—"} → ${scenario.predictedRankBand ?? "—"}`,
    },
    diagnostics: {
      exactInstitutionalInputCount: Object.values(currentInputs).filter(
        (value) => typeof value === "number" && Number.isFinite(value),
      ).length,
      stochasticIndicatorCount: changes.filter(
        ({ officialWeight, status }) => officialWeight > 0 && status === "calculated",
      ).length,
      unavailableIndicatorCount: changes.filter(({ status }) => status === "invalid").length,
      usedReferenceInstitutionCount: referenceDataset.records.length,
      rankEstimatorExcludedInstitutionId: modelConfig.referenceInstitutionId,
      indicatorChanges: changes,
      currentCalibrationEquivalent,
      scenarioCalibrationEquivalent,
      currentCalibrationDifferences,
      scenarioCalibrationDifferences,
      currentCategoryCalibrationEquivalent,
      scenarioCategoryCalibrationEquivalent,
      scenarioCategoryCurrentEquivalent,
      heldRawToScoreParameterIds,
      firstRunIndicatorSamples,
      firstRunCategories,
      warnings: [
        ...(changes.some(({ status }) => status === "invalid")
          ? ["Bazı gösterge değişimleri eksik veya geçersiz girdiler nedeniyle hesaplanamadı."]
          : []),
        ...(heldRawToScoreParameterIds.length
          ? [`${heldRawToScoreParameterIds.join(", ")} için doğrulanmış ham→skor dönüşümü bulunmadığından ilgili normalize gösterge skorları mevcut değerinde sabit tutuldu.`]
          : []),
      ],
      assumptions: [
        `Kurumlar arası dağılım ${referenceDataset.records.length} kayıtlı THE 2026 referans veri seti ile modellenmiştir.`,
        "Gösterge duyarlılığı ortak triangular(0.75, 1.00, 1.25) dağılımından örneklenmiştir.",
        "Sonuç kesin THE skoru değil, seeded stokastik simülasyon tahminidir.",
      ],
    },
  };
}

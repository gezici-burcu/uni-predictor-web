import { QS_RANK_MODEL_CONFIG } from "@/src/config/qs-rank-estimation";
import { QS_2027_INDICATOR_WEIGHTS } from "@/src/config/qs.calculation";
import { normalizeQsRankBand } from "@/src/lib/qs/qs-rank-band";
import type { QsIndicatorCode } from "@/src/types/qs";
import type { QsReferenceInstitutionRecord } from "@/src/types/qs-reference";
import type {
  QsBandProbability,
  QsRankBandDefinition,
  QsRankCrossValidationResult,
  QsRankDistribution,
  QsRankFeatureStatistics,
  QsRankModelArtifact,
  QsRankNeighborSummary,
} from "@/src/types/qs-rank-estimation";

const quantile = (sorted: readonly number[], probability: number) => {
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
};

const standardDeviation = (values: readonly number[]) => {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
};

export function buildQsFeatureStatistics(
  records: readonly QsReferenceInstitutionRecord[],
  featureCodes: readonly QsIndicatorCode[] = QS_RANK_MODEL_CONFIG.featureCodes,
): Partial<Record<QsIndicatorCode, QsRankFeatureStatistics>> {
  return Object.fromEntries(featureCodes.map((code) => {
    const values = records.map((record) => record.indicatorScores[code])
      .filter((value): value is number => typeof value === "number").sort((a, b) => a - b);
    const q1 = quantile(values, 0.25);
    const median = quantile(values, 0.5);
    const q3 = quantile(values, 0.75);
    const iqr = q3 - q1;
    const deviation = standardDeviation(values);
    const scaleSource = iqr > QS_RANK_MODEL_CONFIG.minimumScale
      ? "iqr" : deviation > QS_RANK_MODEL_CONFIG.minimumScale ? "standard-deviation" : "unit";
    return [code, {
      code, median, q1, q3, iqr, standardDeviation: deviation,
      scale: scaleSource === "iqr" ? iqr : scaleSource === "standard-deviation" ? deviation : 1,
      scaleSource,
    } satisfies QsRankFeatureStatistics];
  }));
}

export function buildQsBandTaxonomy(records: readonly QsReferenceInstitutionRecord[]): QsRankBandDefinition[] {
  const exactUpper = Math.max(...records.filter((record) => record.rank !== null).map((record) => record.rank as number));
  const exactBands: QsRankBandDefinition[] = [];
  for (let lower = 1; lower <= exactUpper; lower += lower < 101 ? 10 : 50) {
    const width = lower < 101 ? 10 : 50;
    const upper = Math.min(exactUpper, lower + width - 1);
    exactBands.push({ id: `${lower}-${upper}`, label: `${lower}–${upper}`, lowerBound: lower, upperBound: upper, openEnded: false, order: 0 });
  }
  const sourceBands = new Map<string, QsRankBandDefinition>();
  for (const record of records) {
    if (!record.rankBand) continue;
    const parsed = normalizeQsRankBand(record.rankBand);
    if (parsed) sourceBands.set(parsed.label, {
      id: parsed.label, label: parsed.label, lowerBound: parsed.lowerBound,
      upperBound: parsed.upperBound, openEnded: parsed.openEnded, order: 0,
    });
  }
  return [...exactBands, ...sourceBands.values()]
    .sort((a, b) => a.lowerBound - b.lowerBound)
    .map((band, order) => ({ ...band, order }));
}

export function findQsBandForRank(rank: number, taxonomy: readonly QsRankBandDefinition[]) {
  return taxonomy.find((band) => rank >= band.lowerBound && (band.upperBound === null || rank <= band.upperBound))
    ?? taxonomy.at(-1) ?? null;
}

export function getQsRankProxy(record: QsReferenceInstitutionRecord, taxonomy: readonly QsRankBandDefinition[]) {
  if (record.rank !== null) return { value: record.rank, source: "exact-rank" as const };
  const parsed = record.rankBand ? normalizeQsRankBand(record.rankBand) : null;
  if (!parsed) return null;
  if (parsed.upperBound !== null) return {
    value: (parsed.lowerBound + parsed.upperBound) / 2,
    source: "rank-band-midpoint-proxy" as const,
  };
  const previous = [...taxonomy].reverse().find((band) => band.upperBound !== null && band.upperBound < parsed.lowerBound);
  const width = previous?.upperBound ? previous.upperBound - previous.lowerBound + 1 : 200;
  return { value: parsed.lowerBound + (width - 1) / 2, source: "open-ended-tail-proxy" as const };
}

export function calculateQsWeightedDistance(
  left: Partial<Record<QsIndicatorCode, number>>,
  right: Partial<Record<QsIndicatorCode, number>>,
  statistics: Partial<Record<QsIndicatorCode, QsRankFeatureStatistics>>,
  featureCodes: readonly QsIndicatorCode[] = QS_RANK_MODEL_CONFIG.featureCodes,
) {
  let weightedSquaredDifference = 0;
  let totalWeight = 0;
  for (const code of featureCodes) {
    const leftValue = left[code];
    const rightValue = right[code];
    const stats = statistics[code];
    if (leftValue === undefined || rightValue === undefined || !stats) return null;
    const weight = QS_2027_INDICATOR_WEIGHTS[code];
    const difference = (leftValue - rightValue) / stats.scale;
    weightedSquaredDifference += weight * difference ** 2;
    totalWeight += weight;
  }
  const distance = Math.sqrt(weightedSquaredDifference / totalWeight);
  return Number.isFinite(distance) ? distance : null;
}

interface InternalNeighbor {
  record: QsReferenceInstitutionRecord;
  distance: number;
  rankProxy: number;
  rankProxySource: QsRankNeighborSummary["rankProxySource"];
}

function selectNeighbors(
  target: Partial<Record<QsIndicatorCode, number>>,
  pool: readonly QsReferenceInstitutionRecord[],
  artifact: QsRankModelArtifact,
): InternalNeighbor[] {
  const targetDerivedScore = artifact.featureCodes.reduce(
    (sum, code) => sum + (target[code] ?? 0) * QS_2027_INDICATOR_WEIGHTS[code],
    0,
  );
  return pool.flatMap((record) => {
    const distance = calculateQsWeightedDistance(target, record.indicatorScores, artifact.featureStatistics, artifact.featureCodes);
    const proxy = getQsRankProxy(record, artifact.bandTaxonomy);
    return distance === null || !proxy ? [] : [{ record, distance, rankProxy: proxy.value, rankProxySource: proxy.source }];
  }).sort((a, b) => a.distance - b.distance
    || Math.abs((a.record.derivedWeightedScore ?? 0) - targetDerivedScore)
      - Math.abs((b.record.derivedWeightedScore ?? 0) - targetDerivedScore)
    || a.record.institutionName.localeCompare(b.record.institutionName))
    .slice(0, artifact.selectedK);
}

function normalizeNeighborWeights(neighbors: readonly InternalNeighbor[]) {
  const zeroDistance = neighbors.filter((neighbor) => neighbor.distance <= QS_RANK_MODEL_CONFIG.epsilon);
  if (zeroDistance.length) {
    const weight = 1 / zeroDistance.length;
    return zeroDistance.map((neighbor) => ({ neighbor, weight }));
  }
  const raw = neighbors.map((neighbor) => ({
    neighbor,
    weight: 1 / (neighbor.distance + QS_RANK_MODEL_CONFIG.epsilon) ** QS_RANK_MODEL_CONFIG.inverseDistancePower,
  }));
  const total = raw.reduce((sum, item) => sum + item.weight, 0);
  return raw.map((item) => ({ ...item, weight: item.weight / total }));
}

function weightedQuantile(items: readonly { value: number; weight: number }[], probability: number) {
  const sorted = [...items].sort((a, b) => a.value - b.value);
  let cumulative = 0;
  for (const item of sorted) {
    cumulative += item.weight;
    if (cumulative >= probability) return item.value;
  }
  return sorted.at(-1)?.value ?? 0;
}

export function createQsRankDistribution(
  weighted: readonly { value: number; weight: number }[],
  taxonomy: readonly QsRankBandDefinition[],
): QsRankDistribution {
  if (!weighted.length) return { expectedRank: null, medianRank: null, p10Rank: null, p90Rank: null, predictedBand: null, bandProbabilities: [] };
  const normalized = weighted.map((item) => ({ ...item, value: Math.max(1, item.value) }));
  const probabilities = new Map<string, number>();
  for (const item of normalized) {
    const band = findQsBandForRank(item.value, taxonomy);
    if (band) probabilities.set(band.label, (probabilities.get(band.label) ?? 0) + item.weight);
  }
  const bandProbabilities: QsBandProbability[] = [...probabilities.entries()].map(([band, probability]) => ({
    band, probability, order: taxonomy.find((item) => item.label === band)?.order ?? Number.MAX_SAFE_INTEGER,
  })).sort((a, b) => b.probability - a.probability || a.order - b.order);
  return {
    expectedRank: normalized.reduce((sum, item) => sum + item.value * item.weight, 0),
    medianRank: weightedQuantile(normalized, 0.5),
    p10Rank: weightedQuantile(normalized, 0.1),
    p90Rank: weightedQuantile(normalized, 0.9),
    predictedBand: bandProbabilities[0]?.band ?? null,
    bandProbabilities,
  };
}

export function predictQsRawRank(
  target: Partial<Record<QsIndicatorCode, number>>,
  pool: readonly QsReferenceInstitutionRecord[],
  artifact: QsRankModelArtifact,
) {
  const neighbors = selectNeighbors(target, pool, artifact);
  const weighted = normalizeNeighborWeights(neighbors);
  return {
    distribution: createQsRankDistribution(weighted.map(({ neighbor, weight }) => ({ value: neighbor.rankProxy, weight })), artifact.bandTaxonomy),
    weightedRanks: weighted.map(({ neighbor, weight }) => ({ value: neighbor.rankProxy, weight })),
    neighbors: weighted.map(({ neighbor, weight }): QsRankNeighborSummary => ({
      institutionId: neighbor.record.institutionId,
      institutionName: neighbor.record.institutionName,
      country: neighbor.record.country,
      distance: neighbor.distance,
      similarityWeight: weight,
      rank: neighbor.record.rank,
      rankBand: neighbor.record.rankBand,
      rankProxy: neighbor.rankProxy,
      rankProxySource: neighbor.rankProxySource,
      derivedWeightedScore: neighbor.record.derivedWeightedScore ?? null,
    })),
  };
}

export function evaluateQsCandidateK(
  records: readonly QsReferenceInstitutionRecord[],
  artifact: Omit<QsRankModelArtifact, "selectedK" | "candidateKResults" | "validationSummary">,
  k: number,
): QsRankCrossValidationResult {
  const errors: number[] = [];
  let hits = 0;
  let adjacentHits = 0;
  const bandResults = new Map<string, { total: number; hits: number }>();
  for (const target of records) {
    const actualProxy = getQsRankProxy(target, artifact.bandTaxonomy);
    if (!actualProxy) continue;
    const actualBand = findQsBandForRank(actualProxy.value, artifact.bandTaxonomy);
    const prediction = predictQsRawRank(target.indicatorScores, records.filter((record) => record.institutionId !== target.institutionId), {
      ...artifact, selectedK: k, candidateKResults: [], validationSummary: { bandHitRate: 0, adjacentBandHitRate: 0, medianAbsoluteRankError: 0 },
    });
    const predictedBand = artifact.bandTaxonomy.find((band) => band.label === prediction.distribution.predictedBand);
    if (!actualBand || !predictedBand || prediction.distribution.expectedRank === null) continue;
    const hit = predictedBand.order === actualBand.order;
    hits += Number(hit);
    adjacentHits += Number(Math.abs(predictedBand.order - actualBand.order) <= 1);
    errors.push(Math.abs(prediction.distribution.expectedRank - actualProxy.value));
    const aggregate = bandResults.get(actualBand.label) ?? { total: 0, hits: 0 };
    aggregate.total += 1;
    aggregate.hits += Number(hit);
    bandResults.set(actualBand.label, aggregate);
  }
  const sortedErrors = [...errors].sort((a, b) => a - b);
  return {
    k,
    bandHitRate: hits / errors.length,
    adjacentBandHitRate: adjacentHits / errors.length,
    medianAbsoluteRankError: quantile(sortedErrors, 0.5),
    meanAbsoluteRankError: errors.reduce((sum, value) => sum + value, 0) / errors.length,
    bandAccuracy: Object.fromEntries([...bandResults].map(([band, value]) => [band, value.total ? value.hits / value.total : null])),
    selected: false,
  };
}

export function buildQsRankModelArtifact(records: readonly QsReferenceInstitutionRecord[]): QsRankModelArtifact {
  const featureStatistics = buildQsFeatureStatistics(records);
  const bandTaxonomy = buildQsBandTaxonomy(records);
  const base = {
    schemaVersion: 1 as const,
    modelId: QS_RANK_MODEL_CONFIG.modelId,
    modelVersion: QS_RANK_MODEL_CONFIG.modelVersion,
    methodologyYear: QS_RANK_MODEL_CONFIG.methodologyYear,
    sourceDataset: {
      ...QS_RANK_MODEL_CONFIG.sourceDataset,
      totalRecords: 1504,
      completeRecords: records.length,
    },
    featureCodes: [...QS_RANK_MODEL_CONFIG.featureCodes],
    featureStatistics,
    distanceConfig: {
      metric: "official-weighted-robust-euclidean" as const,
      inverseDistancePower: QS_RANK_MODEL_CONFIG.inverseDistancePower,
      epsilon: QS_RANK_MODEL_CONFIG.epsilon,
    },
    bandTaxonomy,
    generatedAt: QS_RANK_MODEL_CONFIG.artifactGeneratedAt,
  };
  const results = QS_RANK_MODEL_CONFIG.candidateK.map((k) => evaluateQsCandidateK(records, base, k));
  const winner = [...results].sort((a, b) => b.bandHitRate - a.bandHitRate
    || b.adjacentBandHitRate - a.adjacentBandHitRate
    || a.medianAbsoluteRankError - b.medianAbsoluteRankError || a.k - b.k)[0];
  const candidateKResults = results.map((result) => ({ ...result, selected: result.k === winner.k }));
  return {
    ...base,
    selectedK: winner.k,
    candidateKResults,
    validationSummary: {
      bandHitRate: winner.bandHitRate,
      adjacentBandHitRate: winner.adjacentBandHitRate,
      medianAbsoluteRankError: winner.medianAbsoluteRankError,
    },
  };
}

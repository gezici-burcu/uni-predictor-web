import type { RankingCoverageResult, RankingMethodology, RankingReferenceDataset } from "./types";

export const REQUIRED_RANKING_NEIGHBORS: Record<RankingMethodology, number> = { QS: 21, THE: 5 };

export function analyzeReferenceCoverage(dataset: RankingReferenceDataset, options?: { availableNeighborCount?: number; outOfDistribution?: boolean }): RankingCoverageResult {
  const requiredNeighborCount = REQUIRED_RANKING_NEIGHBORS[dataset.metadata.methodology];
  const availableNeighborCount = options?.availableNeighborCount ?? dataset.metadata.usableRecordCount;
  const coveredRankBands = dataset.metadata.coverage.rankBands;
  const outOfDistribution = options?.outOfDistribution ?? false;
  const reasons: string[] = [];
  if (dataset.metadata.usableRecordCount < requiredNeighborCount) reasons.push("insufficient-usable-records");
  if (availableNeighborCount < requiredNeighborCount) reasons.push("insufficient-neighbors");
  if (coveredRankBands.length < 2) reasons.push("insufficient-rank-band-diversity");
  if (dataset.metadata.coverage.bestRank === null || dataset.metadata.coverage.worstRank === null) reasons.push("missing-rank-range");
  if (outOfDistribution) reasons.push("out-of-distribution");
  return { isSufficient: reasons.length === 0, usableRecordCount: dataset.metadata.usableRecordCount, requiredNeighborCount, availableNeighborCount, coveredRankBands, outOfDistribution, reasons };
}

export const INSUFFICIENT_REFERENCE_COVERAGE_MESSAGE = "Bu sonuç için yeterli karşılaştırılabilir referans kaydı bulunmadığından güvenilir bir sıralama bandı üretilemedi.";

import type { QsIndicatorCode } from "@/src/types/qs";
import type { QsHistoricalRecord } from "@/src/types/qs-history";
import type { QsIndicatorScoreSource } from "@/src/types/qs-stochastic";

const RATIO_INDICATOR_CODES = new Set<QsIndicatorCode>(["FSR", "IFR", "ISR"]);

export interface QsPublishedIndicatorReference {
  year: number;
  scores: Partial<Record<QsIndicatorCode, number>>;
  rawValues?: Partial<Record<QsIndicatorCode, number | null>>;
}

export interface QsResolvedCurrentIndicatorScore {
  score: number | null;
  source: QsIndicatorScoreSource;
  sourceYear: number | null;
  isApproximate: boolean;
  referenceRaw: number | null;
  referenceScore: number | null;
  warning?: string;
}

export function isValidQsIndicatorScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 100;
}

export function getQsIndicatorScoreForYear(
  records: readonly QsHistoricalRecord[],
  year: number,
  code: QsIndicatorCode,
): { score: number; source: "history" | "previousYear"; sourceYear: number } | null {
  const candidates = records
    .filter((record) => record.dataYear <= year)
    .sort((left, right) => right.dataYear - left.dataYear);
  for (const record of candidates) {
    const score = record.indicatorScores?.[code];
    if (isValidQsIndicatorScore(score)) {
      return {
        score,
        source: record.dataYear === year ? "history" : "previousYear",
        sourceYear: record.dataYear,
      };
    }
  }
  return null;
}

function missing(warning: string): QsResolvedCurrentIndicatorScore {
  return {
    score: null,
    source: "missing",
    sourceYear: null,
    isApproximate: true,
    referenceRaw: null,
    referenceScore: null,
    warning,
  };
}

export function resolveQsCurrentIndicatorScore({
  indicatorCode,
  selectedYear,
  currentRawValue,
  indicatorHistory,
  publishedReference,
}: {
  indicatorCode: QsIndicatorCode;
  selectedYear: number;
  currentRawValue: number | null;
  indicatorHistory: readonly QsHistoricalRecord[];
  publishedReference: QsPublishedIndicatorReference;
}): QsResolvedCurrentIndicatorScore {
  const historical = getQsIndicatorScoreForYear(indicatorHistory, selectedYear, indicatorCode);
  if (historical?.source === "history") {
    return {
      score: historical.score,
      source: "same-year-official",
      sourceYear: historical.sourceYear,
      isApproximate: false,
      referenceRaw: indicatorHistory.find((record) => record.dataYear === selectedYear)
        ?.rawIndicatorValues?.[indicatorCode] ?? null,
      referenceScore: historical.score,
    };
  }

  if (RATIO_INDICATOR_CODES.has(indicatorCode)) {
    void currentRawValue;
    return missing("missing-ratio-public-normalization");
  }

  if (historical) {
    return {
      score: historical.score,
      source: "previous-year-official",
      sourceYear: historical.sourceYear,
      isApproximate: true,
      referenceRaw: null,
      referenceScore: historical.score,
      warning: `previous-year-score-fallback-${historical.sourceYear}`,
    };
  }

  const publishedScore = publishedReference.scores[indicatorCode];
  if (selectedYear === publishedReference.year && isValidQsIndicatorScore(publishedScore)) {
    return {
      score: publishedScore,
      source: "published-reference",
      sourceYear: publishedReference.year,
      isApproximate: false,
      referenceRaw: publishedReference.rawValues?.[indicatorCode] ?? null,
      referenceScore: publishedScore,
    };
  }
  return missing("missing-current-indicator-score");
}

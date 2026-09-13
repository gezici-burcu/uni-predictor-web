export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const clampNonNegative = (value: number): number =>
  Math.max(0, value);

const validCount = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export function calculateFte(
  fullTime: number | null | undefined,
  partTime: number | null | undefined,
): number | null {
  if (!validCount(fullTime) || !validCount(partTime)) return null;
  return fullTime + partTime / 3;
}

export function calculateHeadcount(
  fullTime: number | null | undefined,
  partTime: number | null | undefined,
): number | null {
  if (!validCount(fullTime) || !validCount(partTime)) return null;
  return fullTime + partTime;
}

export type SafeMathResult =
  | { value: number; status: "calculated" }
  | { value: null; status: "missing-input" | "invalid-input" | "zero-denominator" };

export function safeDivideDetailed(
  numerator: number | null,
  denominator: number | null,
): SafeMathResult {
  if (denominator === null) return { value: null, status: "zero-denominator" };
  if (!isFiniteNumber(denominator) || denominator < 0) return { value: null, status: "invalid-input" };
  if (denominator === 0) return { value: null, status: "zero-denominator" };
  if (numerator === null) return { value: null, status: "missing-input" };
  if (!isFiniteNumber(numerator) || numerator < 0) return { value: null, status: "invalid-input" };
  return { value: numerator / denominator, status: "calculated" };
}

export function safeLog(value: number | null): SafeMathResult {
  if (value === null) return { value: null, status: "missing-input" };
  if (!isFiniteNumber(value) || value < 0) return { value: null, status: "invalid-input" };
  if (value <= 1) return { value: null, status: "zero-denominator" };
  return { value: Math.log(value), status: "calculated" };
}

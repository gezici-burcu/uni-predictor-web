import { normalCdf } from "@/src/lib/normalization/normalCdf";

const clampProbability = (value: number) =>
  Math.min(1 - 1e-6, Math.max(1e-6, value));

export function empiricalCdf(values: readonly number[], target: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 0) return Number.NaN;
  const below = sorted.filter((value) => value < target).length;
  const equal = sorted.filter((value) => value === target).length;
  return clampProbability((below + equal * 0.5) / sorted.length);
}

export function empiricalQuantile(values: readonly number[], probability: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 0) return Number.NaN;
  if (sorted.length === 1) return sorted[0];
  const position = Math.min(1, Math.max(0, probability)) * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const fraction = position - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * fraction;
}

/** Acklam inverse-normal approximation. */
export function inverseNormalCdf(probability: number): number {
  const p = clampProbability(probability);
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const low = 0.02425;
  const high = 1 - low;
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > high) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

export const percentileToScore = (
  values: readonly number[],
  baseScore: number,
  latentDelta: number,
) => {
  if (Math.abs(latentDelta) <= 1e-12) return baseScore;
  const baseZ = inverseNormalCdf(empiricalCdf(values, baseScore));
  return empiricalQuantile(values, normalCdf(baseZ + latentDelta));
};

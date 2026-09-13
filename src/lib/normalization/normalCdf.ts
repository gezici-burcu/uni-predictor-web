const erf = (value: number): number => {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const [a1, a2, a3, a4, a5, p] = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429, 0.3275911];
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
  return sign * y;
};

export const normalCdf = (zScore: number): number => 0.5 * (1 + erf(zScore / Math.sqrt(2)));

/** THE'nin kapalı formülü değil, simülatörün Z-score/CDF yaklaşımıdır. */
export const zScoreToSimulationScore = (zScore: number): number => {
  if (!Number.isFinite(zScore)) return Number.NaN;
  return Math.min(100, Math.max(0, 100 * normalCdf(zScore)));
};

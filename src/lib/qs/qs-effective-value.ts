export type QsNumericOverride = number | "" | null | undefined;

export function getQsEffectiveValue(
  override: QsNumericOverride,
  baseline: number | null | undefined,
): number | null {
  if (override === 0) return 0;
  if (override !== "" && override !== null && override !== undefined && Number.isFinite(override)) {
    return override;
  }
  if (baseline !== null && baseline !== undefined && Number.isFinite(baseline)) return baseline;
  return null;
}

export function getQsEffectiveTotal(
  override: { fullTime?: QsNumericOverride; partTime?: QsNumericOverride } | undefined,
  baseline: { fullTime?: number | null; partTime?: number | null } | undefined,
): number | null {
  const fullTime = getQsEffectiveValue(override?.fullTime, baseline?.fullTime);
  const partTime = getQsEffectiveValue(override?.partTime, baseline?.partTime);
  if (fullTime === null && partTime === null) return null;
  return (fullTime ?? 0) + (partTime ?? 0);
}

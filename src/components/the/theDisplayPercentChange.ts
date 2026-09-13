export function calculateDisplayPercentChange(
  currentValue: number | null,
  scenarioValue: number | null,
): number | null {
  if (
    currentValue === null
    || scenarioValue === null
    || !Number.isFinite(currentValue)
    || !Number.isFinite(scenarioValue)
  ) return null;
  if (currentValue === 0) return scenarioValue === 0 ? 0 : null;
  const change = ((scenarioValue - currentValue) / Math.abs(currentValue)) * 100;
  return Number.isFinite(change) ? change : null;
}

const percentFormatter = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatDisplayPercentChange(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  const prefix = value > 0 ? "+%" : value < 0 ? "-%" : "%";
  return `${prefix}${percentFormatter.format(Math.abs(value))}`;
}

export function describeDisplayPercentChange(
  label: string,
  currentValue: number | null,
  scenarioValue: number | null,
) {
  const change = calculateDisplayPercentChange(currentValue, scenarioValue);
  if (change === null) {
    return currentValue === 0 && scenarioValue !== null && scenarioValue !== 0
      ? `${label}: başlangıç değeri sıfır olduğu için yüzde değişim hesaplanamadı.`
      : `${label}: yüzde değişim hesaplanamadı.`;
  }
  if (change === 0) return `${label}: senaryo ham değeri mevcut değere göre değişmedi.`;
  return `${label}: senaryo ham değeri mevcut değere göre yüzde ${percentFormatter.format(Math.abs(change))} ${change > 0 ? "arttı" : "azaldı"}.`;
}

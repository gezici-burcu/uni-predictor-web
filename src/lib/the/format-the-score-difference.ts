const roundScore = (value: number) => Math.round((value + 1e-9) * 100) / 100;

export function formatTheScoreDifference(value: number, locale: string): string {
  const rounded = roundScore(value);
  if (Object.is(rounded, -0) || rounded === 0) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(0);
  }
  const magnitude = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded < 0 ? -rounded : rounded);
  return `${rounded > 0 ? "+" : "−"}${magnitude}`;
}

export function toggleGreenMetricCategoryId(current: string | null, selected: string): string | null {
  return current === selected ? null : selected;
}

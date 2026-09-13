export type GreenMetricCategoryCode = "SI" | "EC" | "WS" | "WR" | "TR" | "ED" | "GD";
export type GreenMetricViewMode = "basic" | "detailed";
export type GreenMetricInputType = "number-range" | "percentage" | "select" | "multi-select" | "readonly";
export type GreenMetricValue = number | string | string[] | null;
export type GreenMetricValues = Record<string, GreenMetricValue>;

export interface GreenMetricOption { value: string; label: string }

export interface GreenMetricMetricDefinition {
  id: string;
  label: string;
  description?: string;
  inputType: GreenMetricInputType;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: GreenMetricOption[];
  shared?: boolean;
  infoOnly?: boolean;
  required?: boolean;
  warning?: string;
  basic?: boolean;
  readonly?: boolean;
  derivedFrom?: string[];
  formulaLabel?: string;
  fallbackMax?: number;
  sliderStep?: number;
  integerOnly?: boolean;
}

export interface GreenMetricIndicatorDefinition {
  id: string;
  code: string;
  categoryCode: GreenMetricCategoryCode;
  title: string;
  description?: string;
  maxScore: number;
  basic?: boolean;
  evidenceRequired?: boolean;
  metrics: GreenMetricMetricDefinition[];
}

export interface GreenMetricCategoryDefinition {
  id: string;
  code: GreenMetricCategoryCode;
  title: string;
  description: string;
  weight: number;
  maxScore: number;
  indicatorCount: number;
}

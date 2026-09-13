export type MetricInputType =
  | "number-range"
  | "percentage"
  | "score"
  | "select";

export type MetricSelectOption = {
  label: string;
  value: string;
};

export type MetricDefinition = {
  id: string;
  label: string;
  description?: string;
  inputType: MetricInputType;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: MetricSelectOption[];
  warning?: string;
  disabled?: boolean;
};

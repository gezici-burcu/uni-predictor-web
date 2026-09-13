import type { MetricDefinition } from "./metric";

export type TheCategoryId =
  | "teaching"
  | "researchEnvironment"
  | "researchQuality"
  | "internationalOutlook"
  | "industry";

export type TheMetricDefinition = MetricDefinition & {
  min: number;
  max: number;
  step: number;
  baselineValue: number;
  shared?: boolean;
  subgroup?: string;
};

export type TheNotice = {
  title: string;
  text: string;
};

export type TheCategoryDefinition = {
  id: TheCategoryId;
  title: string;
  weight: string;
  description: string;
  metrics: TheMetricDefinition[];
  calculatedIndicators?: string[];
  notice?: TheNotice;
};

export type TheMetricValues = Record<string, number>;

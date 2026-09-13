import type { UiGreenMetricDataMode } from "@/src/config/ui-greenmetric.data-mode";
import type { GreenMetricValue, GreenMetricValues } from "@/src/types/greenmetric";
import type { UiGreenMetricRankEstimate } from "@/src/types/greenmetric-rank";

export type UiGreenMetricCategoryCode = "SI" | "EC" | "WS" | "WR" | "TR" | "ED" | "GD";
export type UiGreenMetricIndicatorCode =
  | "SI1"|"SI2"|"SI3"|"SI4"|"SI5"|"SI6"|"SI7"|"SI8"
  | "EC1"|"EC2"|"EC3"|"EC4"|"EC5"|"EC6"|"EC7"|"EC8"|"EC9"|"EC10"
  | "WS1"|"WS2"|"WS3"|"WS4"|"WS5"|"WS6"
  | "WR1"|"WR2"|"WR3"|"WR4"|"WR5"|"WR6"
  | "TR1"|"TR2"|"TR3"|"TR4"|"TR5"|"TR6"|"TR7"|"TR8"
  | "ED1"|"ED2"|"ED3"|"ED4"|"ED5"|"ED6"|"ED7"|"ED8"|"ED9"|"ED10"
  | "GD1"|"GD2"|"GD3"|"GD4"|"GD5"|"GD6"|"GD7"|"GD8"|"GD9"|"GD10"|"GD11"|"GD12";
export type UiGreenMetricCalculationStatus = "scored" | "missing-input" | "invalid-input" | "manual-review";
export interface UiGreenMetricIndicatorResult { code:UiGreenMetricIndicatorCode; category:UiGreenMetricCategoryCode; rawValue:GreenMetricValue; score:number|null; maximumScore:number; status:UiGreenMetricCalculationStatus; sourceMetricIds:string[]; warnings:string[] }
export type UiGreenMetricCategoryScores = Record<UiGreenMetricCategoryCode, number|null>;
export interface UiGreenMetricCalculationResult { indicatorResults:Record<UiGreenMetricIndicatorCode,UiGreenMetricIndicatorResult>; internalCategoryScores:UiGreenMetricCategoryScores; displayedCategoryScores:UiGreenMetricCategoryScores; radarScores:UiGreenMetricCategoryScores; totalScore:number|null; worldRank:number|null; estimatedRank:number|null; estimatedRankBand:string|null; rankEstimate:UiGreenMetricRankEstimate; dataMode:UiGreenMetricDataMode; complete:boolean; missingIndicators:UiGreenMetricIndicatorCode[]; manualReviewIndicators:UiGreenMetricIndicatorCode[]; warnings:string[] }
export type UiGreenMetricInputValues = GreenMetricValues;

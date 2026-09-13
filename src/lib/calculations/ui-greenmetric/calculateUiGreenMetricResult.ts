import { greenMetricCategoryMeta } from "@/src/config/greenmetric.categories";
import type { UiGreenMetricDataMode } from "@/src/config/ui-greenmetric.data-mode";
import type { GreenMetricValues } from "@/src/types/greenmetric";
import { estimateUiGreenMetricRankBand } from "@/src/lib/rankings/estimate-ui-greenmetric-rank";
import * as calculators from "./calculators";
import type { UiGreenMetricCalculationResult, UiGreenMetricCategoryScores, UiGreenMetricIndicatorCode, UiGreenMetricIndicatorResult } from "./types";

export const UI_GREENMETRIC_INDICATOR_CODES = greenMetricCategoryMeta.flatMap(category =>
  Array.from({length:category.indicatorCount},(_,index)=>`${category.code}${index+1}` as UiGreenMetricIndicatorCode),
);

export function calculateUiGreenMetricIndicators(values:GreenMetricValues):Record<UiGreenMetricIndicatorCode,UiGreenMetricIndicatorResult>{
  return Object.fromEntries(UI_GREENMETRIC_INDICATOR_CODES.map(code=>{
    const fn=calculators[`calculate${code}` as keyof typeof calculators] as ((values:GreenMetricValues)=>UiGreenMetricIndicatorResult);
    return [code,fn(values)];
  })) as Record<UiGreenMetricIndicatorCode,UiGreenMetricIndicatorResult>;
}

export function calculateUiGreenMetricCategories(results:Record<UiGreenMetricIndicatorCode,UiGreenMetricIndicatorResult>):UiGreenMetricCategoryScores{
  return Object.fromEntries(greenMetricCategoryMeta.map(category=>{
    const categoryResults=UI_GREENMETRIC_INDICATOR_CODES.filter(code=>code.startsWith(category.code)).map(code=>results[code]);
    const score=categoryResults.some(item=>item.score===null)?null:categoryResults.reduce((sum,item)=>sum+item.score!,0);
    return [category.code,score===null?null:Math.min(category.maxScore,Math.max(0,score))];
  })) as UiGreenMetricCategoryScores;
}

export function calculateUiGreenMetricTotal(scores:UiGreenMetricCategoryScores){const values=Object.values(scores);return values.some(value=>value===null||!Number.isFinite(value))?null:Math.min(10000,Math.max(0,values.reduce<number>((sum,value)=>sum+value!,0)))}
export function calculateCategoryRadarScore(score:number|null,maximum:number){return score===null||!Number.isFinite(score)||maximum<=0?null:Math.min(100,Math.max(0,score/maximum*100))}

type CalculateUiGreenMetricResultOptions = {
  values: GreenMetricValues;
  mode: UiGreenMetricDataMode;
};

export function calculateUiGreenMetricResult({values,mode}:CalculateUiGreenMetricResultOptions):UiGreenMetricCalculationResult{
  const indicatorResults=calculateUiGreenMetricIndicators(values);
  const internalCategoryScores=calculateUiGreenMetricCategories(indicatorResults);
  const displayedCategoryScores=internalCategoryScores;
  const radarScores=Object.fromEntries(greenMetricCategoryMeta.map(category=>[category.code,calculateCategoryRadarScore(displayedCategoryScores[category.code],category.maxScore)])) as UiGreenMetricCategoryScores;
  const totalScore=calculateUiGreenMetricTotal(displayedCategoryScores);
  const rankEstimate=estimateUiGreenMetricRankBand(totalScore);
  const missingIndicators=UI_GREENMETRIC_INDICATOR_CODES.filter(code=>indicatorResults[code].status==="missing-input"||indicatorResults[code].status==="invalid-input");
  const manualReviewIndicators=UI_GREENMETRIC_INDICATOR_CODES.filter(code=>indicatorResults[code].status==="manual-review");
  return {indicatorResults,internalCategoryScores,displayedCategoryScores,radarScores,totalScore,worldRank:null,estimatedRank:rankEstimate.estimatedRank,estimatedRankBand:rankEstimate.estimatedRankBand,rankEstimate,dataMode:mode,complete:missingIndicators.length===0&&manualReviewIndicators.length===0,missingIndicators,manualReviewIndicators,warnings:[]};
}

export function compareUiGreenMetricTieBreak(first:UiGreenMetricCategoryScores,second:UiGreenMetricCategoryScores){if(Object.values(first).some(v=>v===null)||Object.values(second).some(v=>v===null))return null;for(const get of [(x:UiGreenMetricCategoryScores)=>x.EC!,(x:UiGreenMetricCategoryScores)=>x.WS!+x.TR!,(x:UiGreenMetricCategoryScores)=>x.ED!,(x:UiGreenMetricCategoryScores)=>x.SI!+x.WR!+x.GD!]){const difference=get(second)-get(first);if(difference!==0)return difference;}return 0}

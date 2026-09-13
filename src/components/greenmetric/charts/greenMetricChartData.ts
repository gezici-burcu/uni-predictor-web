import { greenMetricCategoryMeta } from "@/src/config/greenmetric.categories";
import type { UiGreenMetricCategoryCode, UiGreenMetricCategoryScores } from "@/src/lib/calculations/ui-greenmetric";
export interface UiGreenMetricRadarDatum {key:UiGreenMetricCategoryCode;label:string;shortLabel:string;current:number|null;scenario:number|null;currentRawScore:number|null;scenarioRawScore:number|null;maximumScore:number}
export interface UiGreenMetricCategoryBarDatum {key:UiGreenMetricCategoryCode;label:string;shortLabel:string;current:number|null;scenario:number|null;maximumScore:number}
const short:Record<UiGreenMetricCategoryCode,string>={SI:"Altyapı",EC:"Enerji",WS:"Atık",WR:"Su",TR:"Ulaşım",ED:"Eğitim",GD:"Yönetişim"};
export function createUiGreenMetricRadarData(current:UiGreenMetricCategoryScores,scenario:UiGreenMetricCategoryScores,currentRaw:UiGreenMetricCategoryScores,scenarioRaw:UiGreenMetricCategoryScores):UiGreenMetricRadarDatum[]{return greenMetricCategoryMeta.map(c=>({key:c.code,label:c.title,shortLabel:short[c.code],current:current[c.code],scenario:scenario[c.code],currentRawScore:currentRaw[c.code],scenarioRawScore:scenarioRaw[c.code],maximumScore:c.maxScore}))}
export function createUiGreenMetricBarData(current:UiGreenMetricCategoryScores,scenario:UiGreenMetricCategoryScores):UiGreenMetricCategoryBarDatum[]{return greenMetricCategoryMeta.map(c=>({key:c.code,label:c.title,shortLabel:c.code,current:current[c.code],scenario:scenario[c.code],maximumScore:c.maxScore}))}
export const hasAnyGreenMetricChartData = (
  data: { current: number | null; scenario: number | null }[],
) => data.some((datum) => datum.current !== null || datum.scenario !== null);

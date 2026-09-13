import { QS_INDICATOR_ORDER } from "@/src/config/qs.calculation";
import { QS_WEIGHTED_INDICATOR_DEFINITIONS } from "@/src/config/qs.stochastic";
import { normalizeQsRankBand } from "@/src/lib/qs/qs-rank-band";
import type { QsIndicatorCode } from "@/src/types/qs";
import type { QsReferenceInstitutionRecord } from "@/src/types/qs-reference";

export type QsReferenceInput = Omit<QsReferenceInstitutionRecord, "completeness">;
export interface QsInvalidReferenceRecord { index:number; input:QsReferenceInput; errors:string[] }
export interface QsReferenceValidationResult {
  records: QsReferenceInstitutionRecord[];
  validRecords: QsReferenceInstitutionRecord[];
  invalidRecords: QsInvalidReferenceRecord[];
  errors: string[];
  warnings: string[];
  duplicateKeys: string[];
  methodologyYears: number[];
  completenessSummary: {complete:number;partial:number;rankOnly:number;invalid:number};
}

const normalizedId = (id:string) => id.trim().toLocaleLowerCase("en-US");
const validScore = (value:number) => Number.isFinite(value) && value >= 0 && value <= 100;

export function classifyQsReferenceCompleteness(input: QsReferenceInput, invalid=false): QsReferenceInstitutionRecord["completeness"] {
  const availableIndicatorCodes = QS_INDICATOR_ORDER.filter((code) => input.indicatorScores[code] !== undefined);
  const missingWeightedIndicatorCodes = QS_WEIGHTED_INDICATOR_DEFINITIONS.filter((definition) => input.indicatorScores[definition.code] === undefined).map((definition) => definition.code);
  const weightedIndicatorCount = QS_WEIGHTED_INDICATOR_DEFINITIONS.length - missingWeightedIndicatorCodes.length;
  const sourceVerified = Boolean(input.sourceMetadata.sourceName.trim() && input.sourceMetadata.sourceReference?.trim() && input.sourceMetadata.methodologyYearVerified);
  const classification = invalid ? "invalid" : weightedIndicatorCount === QS_WEIGHTED_INDICATOR_DEFINITIONS.length && sourceVerified ? "complete" : weightedIndicatorCount > 0 ? "partial" : "rank-only";
  return {
    availableIndicatorCodes, missingWeightedIndicatorCodes, weightedIndicatorCount,
    totalWeightedIndicatorCount:QS_WEIGHTED_INDICATOR_DEFINITIONS.length,
    completenessRatio:weightedIndicatorCount / QS_WEIGHTED_INDICATOR_DEFINITIONS.length,
    classification,
    completeForDistanceModel:classification === "complete",
  };
}

export function validateQsReferenceDataset(inputs: readonly QsReferenceInput[]): QsReferenceValidationResult {
  const errors:string[] = [], warnings:string[] = [], duplicateKeys:string[] = [];
  const seen = new Map<string,number>();
  const perRecord = inputs.map((input,index) => {
    const prefix=`Kayıt ${index+1}`, local:string[]=[];
    if (!input.institutionId?.trim()) local.push(`${prefix}: institutionId boş`);
    if (!input.institutionName?.trim()) local.push(`${prefix}: institutionName boş`);
    if (!Number.isInteger(input.methodologyYear) || input.methodologyYear <= 0) local.push(`${prefix}: methodologyYear geçersiz`);
    const key=`${normalizedId(input.institutionId ?? "")}:${input.methodologyYear}`;
    if (seen.has(key)) {
      const firstIndex=seen.get(key)!;
      local.push(`${prefix}: duplicate institution/year`);
      errors.push(`Duplicate ${key}: kayıt ${firstIndex+1} (${inputs[firstIndex].sourceMetadata?.sourceName??"kaynak yok"}) ve kayıt ${index+1} (${input.sourceMetadata?.sourceName??"kaynak yok"})`);
      duplicateKeys.push(key);
    }
    else seen.set(key,index);
    if (input.rank !== null && (!Number.isInteger(input.rank) || input.rank <= 0)) local.push(`${prefix}: rank geçersiz`);
    if (input.rankBand !== null && !normalizeQsRankBand(input.rankBand)) local.push(`${prefix}: rankBand geçersiz`);
    if (input.overallScore !== null && !validScore(input.overallScore)) local.push(`${prefix}: overallScore 0–100 dışında`);
    for (const [code,score] of Object.entries(input.indicatorScores)) {
      if (!QS_INDICATOR_ORDER.includes(code as QsIndicatorCode)) local.push(`${prefix}: bilinmeyen gösterge ${code}`);
      if (!validScore(score)) local.push(`${prefix}: ${code} skoru 0–100 dışında`);
    }
    if (!input.sourceMetadata?.sourceName?.trim()) local.push(`${prefix}: sourceName gerekli`);
    if (!input.sourceMetadata?.sourceReference?.trim()) local.push(`${prefix}: sourceReference gerekli`);
    if (input.sourceMetadata?.accessedAt !== null && typeof input.sourceMetadata?.accessedAt !== "string") local.push(`${prefix}: accessedAt string veya null olmalı`);
    if (typeof input.sourceMetadata?.methodologyYearVerified !== "boolean") local.push(`${prefix}: methodologyYearVerified boolean olmalı`);
    if (input.rank === null && input.rankBand === null && input.overallScore === null && Object.keys(input.indicatorScores).length === 0) local.push(`${prefix}: sonuç bilgisi yok`);
    if (!input.sourceMetadata?.methodologyYearVerified) warnings.push(`${prefix}: methodology year doğrulanmamış`);
    errors.push(...local);
    const normalizedBand=input.rankBand===null?null:normalizeQsRankBand(input.rankBand)?.label??input.rankBand;
    const record={...input,rankBand:normalizedBand,indicatorScores:{...input.indicatorScores},sourceMetadata:{...input.sourceMetadata},completeness:classifyQsReferenceCompleteness(input,local.length>0)};
    return {record,local,index};
  });
  const duplicateSet=new Set(duplicateKeys);
  for (const {record,local,index} of perRecord) {
    const key=`${normalizedId(record.institutionId)}:${record.methodologyYear}`;
    if (duplicateSet.has(key) && !local.some((error)=>error.includes("duplicate"))) local.push(`Kayıt ${index+1}: duplicate institution/year`);
    if (local.length) record.completeness=classifyQsReferenceCompleteness(record,true);
  }
  const validRecords=perRecord.filter((item)=>item.local.length===0).map((item)=>item.record);
  const invalidRecords=perRecord.filter((item)=>item.local.length>0).map((item)=>({index:item.index,input:inputs[item.index],errors:[...item.local]}));
  return {
    records:perRecord.map((item)=>item.record),validRecords,invalidRecords,errors,warnings,
    duplicateKeys:[...new Set(duplicateKeys)],
    methodologyYears:[...new Set(inputs.map((input)=>input.methodologyYear).filter(Number.isFinite))].sort((a,b)=>a-b),
    completenessSummary:{
      complete:validRecords.filter((r)=>r.completeness.classification==="complete").length,
      partial:validRecords.filter((r)=>r.completeness.classification==="partial").length,
      rankOnly:validRecords.filter((r)=>r.completeness.classification==="rank-only").length,
      invalid:invalidRecords.length,
    },
  };
}

export function groupQsReferencesByMethodologyYear(records:readonly QsReferenceInstitutionRecord[]) {
  const result=new Map<number,QsReferenceInstitutionRecord[]>();
  for (const record of records) result.set(record.methodologyYear,[...(result.get(record.methodologyYear)??[]),record]);
  return result;
}

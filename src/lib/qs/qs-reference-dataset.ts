import rawDataset from "@/src/data/qs/reference/qs-reference-dataset.json";
import { QS_INDICATOR_ORDER } from "@/src/config/qs.calculation";
import { getQsReferenceReadinessStatus } from "@/src/config/qs-reference";
import { validateQsReferenceDataset, type QsReferenceInput } from "@/src/lib/qs/qs-reference-validator";
import type { QsIndicatorCode } from "@/src/types/qs";
import type { QsReferenceDatasetSummary, QsReferenceInstitutionRecord } from "@/src/types/qs-reference";

export function loadQsReferenceDataset():QsReferenceInstitutionRecord[] {
  if (rawDataset.schemaVersion !== 1 || !Array.isArray(rawDataset.records)) {
    throw new Error("QS reference dataset manifest geçersiz");
  }
  const records=structuredClone(rawDataset.records) as QsReferenceInput[];
  const result=validateQsReferenceDataset(records);
  if(result.errors.length)throw new Error(`QS reference dataset geçersiz: ${result.errors.join("; ")}`);
  return result.validRecords;
}
export function getQsReferenceRecordsByMethodologyYear(year:number,records=loadQsReferenceDataset()) {
  return records.filter((record)=>record.methodologyYear===year);
}
export function getCompleteQsReferenceRecordsByMethodologyYear(year:number,records=loadQsReferenceDataset()) {
  return getQsReferenceRecordsByMethodologyYear(year,records).filter((record)=>record.completeness.completeForDistanceModel);
}
export function summarizeQsReferenceDataset(records:readonly QsReferenceInstitutionRecord[],invalidRecordCount=0,duplicateCount=0):QsReferenceDatasetSummary {
  const indicatorAvailability=Object.fromEntries(QS_INDICATOR_ORDER.map((code)=>[code,records.filter((r)=>r.indicatorScores[code]!==undefined).length])) as Record<QsIndicatorCode,number>;
  return {
    totalRecordCount:records.length+invalidRecordCount,methodologyYears:[...new Set(records.map((r)=>r.methodologyYear))].sort((a,b)=>a-b),
    completeRecordCount:records.filter((r)=>r.completeness.classification==="complete").length,
    partialRecordCount:records.filter((r)=>r.completeness.classification==="partial").length,
    rankOnlyRecordCount:records.filter((r)=>r.completeness.classification==="rank-only").length,
    invalidRecordCount,exactRankCount:records.filter((r)=>r.rank!==null).length,rankBandCount:records.filter((r)=>r.rankBand!==null).length,
    overallScoreCount:records.filter((r)=>r.overallScore!==null).length,indicatorAvailability,
    countryCount:new Set(records.map((r)=>r.country).filter(Boolean)).size,duplicateCount,
    sourceVerifiedCount:records.filter((r)=>r.sourceMetadata.methodologyYearVerified&&r.sourceMetadata.sourceName&&r.sourceMetadata.sourceReference).length,
    modelReadyRecordCount:records.filter((r)=>r.completeness.completeForDistanceModel).length,
  };
}
export function getQsReferenceDatasetReadiness(records=loadQsReferenceDataset()) {
  return getQsReferenceReadinessStatus(records.filter((r)=>r.completeness.completeForDistanceModel).length);
}

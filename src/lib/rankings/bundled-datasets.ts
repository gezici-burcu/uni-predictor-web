import manifestJson from "@/src/data/rankings/manifest.json";
import qsJson from "@/src/data/qs/reference/qs-reference-dataset.json";
import theJson from "@/src/data/the/reference/the-2026-reference-dataset.json";
import { QS_INDICATOR_ORDER } from "@/src/config/qs.calculation";
import type { RankingMethodology, RankingReferenceDataset, RankingReferenceManifest } from "./types";
import type { QsReferenceInstitutionRecord } from "@/src/types/qs-reference";
import type { TheReferenceDataset } from "@/src/types/the-reference-dataset";
import { validateRankingManifest } from "./schema";
import { analyzeReferenceCoverage } from "./coverage-analyzer";
import { getThePublishedRankBand } from "@/src/config/the-rank-estimation";

const parsedManifest = validateRankingManifest(manifestJson);
if (!parsedManifest.valid || !parsedManifest.manifest) throw new Error(`Bundled ranking manifest is invalid: ${parsedManifest.errors.join("; ")}`);
export const BUNDLED_RANKING_MANIFEST = parsedManifest.manifest as RankingReferenceManifest;
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function coverage(records: RankingReferenceDataset["records"], methodology: RankingMethodology) {
  const usable = records.filter((record) => "indicators" in record
    ? record.completeness.hasWeightedIndicatorVector && record.completeness.hasRank
    : record.completeness.hasCategoryVector && record.completeness.hasRank);
  const ranks = records.map((record) => record.publishedRank).filter(finite);
  const rankBands = [...new Set(records.flatMap((record) => {
    if (typeof record.publishedRankBand === "string") return [record.publishedRankBand];
    if (methodology === "THE" && typeof record.publishedRank === "number") {
      return [getThePublishedRankBand(record.publishedRank)].filter((band): band is string => band !== null);
    }
    return [];
  }))];
  const bandBounds = methodology === "THE" ? rankBands.flatMap((band) => [...band.matchAll(/\d+/g)].map((match) => Number(match[0]))).filter(finite) : [];
  return { rankBands, bestRank:ranks.length ? Math.min(...ranks) : null, worstRank:[...ranks,...bandBounds].length ? Math.max(...ranks,...bandBounds) : null, completeVectorCount:usable.length, incompleteRecordCount:records.length-usable.length };
}

function createBundled(methodology: RankingMethodology): RankingReferenceDataset {
  const entry = BUNDLED_RANKING_MANIFEST.methodologies[methodology];
  const records: RankingReferenceDataset["records"] = methodology === "QS"
    ? qsJson.records.map((record) => ({ institutionId:record.institutionId,institutionName:record.institutionName,country:record.country,edition:record.methodologyYear,publishedRank:record.rank,publishedRankBand:record.rankBand,overallScore:record.overallScore,indicators:{...record.indicatorScores},completeness:{hasRank:record.rank!==null||record.rankBand!==null,hasWeightedIndicatorVector:QS_INDICATOR_ORDER.filter((code)=>code!=="ISD").every((code)=>finite(record.indicatorScores[code])),hasOverallScore:finite(record.overallScore)} }))
    : theJson.records.map((record) => ({ institutionId:record.id,institutionName:record.universityName,country:record.countryCode,edition:record.methodologyYear,publishedRank:record.rank,publishedRankBand:record.rankBand,overallScore:record.overallScore,categories:{...record.categoryScores},completeness:{hasRank:record.rank!==null||record.rankBand!==null,hasCategoryVector:Object.values(record.categoryScores).every(finite),hasOverallScore:finite(record.overallScore)} }));
  return { metadata:{datasetId:entry.datasetId,methodology,edition:entry.activeEdition,datasetVersion:entry.datasetVersion,schemaVersion:BUNDLED_RANKING_MANIFEST.schemaVersion,sourceLabel:entry.sourceLabel,sourceType:"bundled",publishedAt:entry.publishedAt,generatedAt:BUNDLED_RANKING_MANIFEST.generatedAt,recordCount:records.length,usableRecordCount:records.filter((r)=>r.completeness.hasRank && (methodology==="QS" ? "hasWeightedIndicatorVector" in r.completeness && r.completeness.hasWeightedIndicatorVector : "hasCategoryVector" in r.completeness && r.completeness.hasCategoryVector)).length,coverage:coverage(records,methodology),checksum:entry.checksum??null},records };
}

const bundled = { QS:createBundled("QS"), THE:createBundled("THE") };
export const getBundledReferenceDataset = (methodology: RankingMethodology) => bundled[methodology];

export function toLegacyQsReferenceRecords(dataset:RankingReferenceDataset):QsReferenceInstitutionRecord[]{return dataset.records.flatMap((record)=>"indicators" in record?[{institutionId:record.institutionId,institutionName:record.institutionName,country:record.country,methodologyYear:record.edition,rank:record.publishedRank,rankBand:record.publishedRankBand,overallScore:record.overallScore,indicatorScores:{...record.indicators},sourceMetadata:{sourceName:dataset.metadata.sourceLabel,sourceReference:null,accessedAt:null,methodologyYearVerified:true},completeness:{availableIndicatorCodes:Object.keys(record.indicators) as QsReferenceInstitutionRecord["completeness"]["availableIndicatorCodes"],missingWeightedIndicatorCodes:QS_INDICATOR_ORDER.filter((code)=>code!=="ISD"&&record.indicators[code]===undefined),weightedIndicatorCount:QS_INDICATOR_ORDER.filter((code)=>code!=="ISD"&&record.indicators[code]!==undefined).length,totalWeightedIndicatorCount:9,completenessRatio:QS_INDICATOR_ORDER.filter((code)=>code!=="ISD"&&record.indicators[code]!==undefined).length/9,classification:record.completeness.hasWeightedIndicatorVector?"complete":"partial",completeForDistanceModel:record.completeness.hasWeightedIndicatorVector}}]:[]);}
const legacyTheCache=new WeakMap<RankingReferenceDataset,TheReferenceDataset>();
export function toLegacyTheReferenceDataset(dataset:RankingReferenceDataset):TheReferenceDataset{const cached=legacyTheCache.get(dataset);if(cached)return cached;const coverage=analyzeReferenceCoverage(dataset);const converted={manifest:{datasetId:dataset.metadata.datasetId,methodology:"the" as const,methodologyYear:dataset.metadata.edition,version:dataset.metadata.datasetVersion,updatedAt:dataset.metadata.generatedAt,recordCount:dataset.records.length,description:dataset.metadata.sourceLabel,sourceSummary:dataset.metadata.sourceLabel,warnings:coverage.isSufficient?[]:["insufficient-reference-coverage"]},records:dataset.records.flatMap((record)=>"categories" in record?[{id:record.institutionId,universityName:record.institutionName,countryCode:record.country,methodologyYear:record.edition,categoryScores:{teaching:record.categories.teaching??null,researchEnvironment:record.categories.researchEnvironment??null,researchQuality:record.categories.researchQuality??null,internationalOutlook:record.categories.internationalOutlook??null,industry:record.categories.industry??null},overallScore:record.overallScore,rank:record.publishedRank,rankBand:record.publishedRankBand,sourceType:"manual-verified" as const,sourceNote:dataset.metadata.sourceLabel}]:[])};legacyTheCache.set(dataset,converted);return converted;}

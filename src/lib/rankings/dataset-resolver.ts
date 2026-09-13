import { getBundledReferenceDataset } from "./bundled-datasets";
import { getActiveRankingDatasetKeys, loadStoredRankingReferenceDataset, setActiveRankingDatasetKey, storeRankingReferenceDataset } from "./dataset-storage";
import { validateRankingReferenceDataset } from "./dataset-validator";
import type { RankingMethodology, RankingReferenceDataset, RankingDatasetResolution } from "./types";

const activeMemory:Partial<Record<RankingMethodology,RankingReferenceDataset>>={};
export function resolveActiveReferenceDatasetSync(methodology:RankingMethodology):RankingDatasetResolution {const dataset=activeMemory[methodology]??getBundledReferenceDataset(methodology);return{dataset,metadata:dataset.metadata,sourceType:dataset.metadata.sourceType,fallbackUsed:false,warnings:[]};}
export async function resolveActiveReferenceDataset(methodology:RankingMethodology):Promise<RankingDatasetResolution>{
  const key=getActiveRankingDatasetKeys()[methodology];
  if(key){const stored=await loadStoredRankingReferenceDataset(key);if(stored){const validated=validateRankingReferenceDataset(stored,{methodology});if(validated.dataset){activeMemory[methodology]=validated.dataset;return{dataset:validated.dataset,metadata:validated.dataset.metadata,sourceType:validated.dataset.metadata.sourceType,fallbackUsed:false,warnings:validated.report.warnings};}}
    setActiveRankingDatasetKey(methodology,null);delete activeMemory[methodology];const fallback=getBundledReferenceDataset(methodology);return{dataset:fallback,metadata:fallback.metadata,sourceType:"bundled",fallbackUsed:true,warnings:["Etkin yerel referans veri seti kullanılamadı; paketlenmiş veri setine dönüldü."]};}
  return resolveActiveReferenceDatasetSync(methodology);
}
export async function activateReferenceDataset(dataset:RankingReferenceDataset){const key=await storeRankingReferenceDataset(dataset);setActiveRankingDatasetKey(dataset.metadata.methodology,key);activeMemory[dataset.metadata.methodology]=dataset;return resolveActiveReferenceDatasetSync(dataset.metadata.methodology);}
export function restoreBundledReferenceDataset(methodology:RankingMethodology){setActiveRankingDatasetKey(methodology,null);delete activeMemory[methodology];return resolveActiveReferenceDatasetSync(methodology);}
export function createRankingReferenceSnapshotMetadata(methodology:RankingMethodology){const metadata=resolveActiveReferenceDatasetSync(methodology).metadata;return{datasetId:metadata.datasetId,methodology,edition:metadata.edition,datasetVersion:metadata.datasetVersion,schemaVersion:metadata.schemaVersion,sourceType:metadata.sourceType,usableRecordCount:metadata.usableRecordCount,generatedAt:metadata.generatedAt};}

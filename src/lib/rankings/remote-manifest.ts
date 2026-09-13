import { activateReferenceDataset } from "./dataset-resolver";
import { validateRankingReferenceDataset, verifyDatasetChecksum } from "./dataset-validator";
import { isRemoteEntryNewer, validateRankingManifest } from "./schema";
import type { RankingManifestEntry, RankingMethodology, RankingReferenceDataset, RankingReferenceSourceType } from "./types";
import { resolveActiveReferenceDatasetSync } from "./dataset-resolver";

export const MAX_RANKING_DATASET_BYTES = 25 * 1024 * 1024;
export const RANKING_DATA_MANIFEST_URL = process.env.NEXT_PUBLIC_RANKING_DATA_MANIFEST_URL?.trim() || null;

async function responseText(response:Response){if(!response.ok)throw new Error(`HTTP ${response.status}`);const contentType=response.headers.get("content-type")?.toLowerCase();if(contentType?.includes("text/html"))throw new Error("HTML content is not accepted as a reference dataset.");const length=Number(response.headers.get("content-length"));if(Number.isFinite(length)&&length>MAX_RANKING_DATASET_BYTES)throw new Error("Reference dataset exceeds the size limit.");const text=await response.text();if(new TextEncoder().encode(text).byteLength>MAX_RANKING_DATASET_BYTES)throw new Error("Reference dataset exceeds the size limit.");return text;}

export async function checkForReferenceDatasetUpdates(fetcher:typeof fetch=fetch){
  if(!RANKING_DATA_MANIFEST_URL)return{status:"not-configured" as const,manifest:null,updates:{QS:false,THE:false},warnings:[]};
  try{const parsed=JSON.parse(await responseText(await fetcher(RANKING_DATA_MANIFEST_URL,{cache:"no-store"})));const result=validateRankingManifest(parsed);if(!result.manifest)throw new Error(result.errors.join("; "));const local=(methodology:RankingMethodology):RankingManifestEntry=>{const metadata=resolveActiveReferenceDatasetSync(methodology).metadata;return{activeEdition:metadata.edition,datasetId:metadata.datasetId,datasetVersion:metadata.datasetVersion,file:"local",publishedAt:metadata.publishedAt,addedToProjectAt:null,sourceLabel:metadata.sourceLabel,recordCount:metadata.recordCount,usableRecordCount:metadata.usableRecordCount,checksum:metadata.checksum};};return{status:"checked" as const,manifest:result.manifest,updates:{QS:isRemoteEntryNewer(local("QS"),result.manifest.methodologies.QS),THE:isRemoteEntryNewer(local("THE"),result.manifest.methodologies.THE)},warnings:[]};}catch(error){return{status:"unavailable" as const,manifest:null,updates:{QS:false,THE:false},warnings:["Güncelleme denetlenemedi. Mevcut yerel referans veri seti kullanılıyor.",error instanceof Error?error.message:String(error)]};}
}

export async function downloadReferenceDataset(methodology:RankingMethodology,entry:RankingManifestEntry,fetcher:typeof fetch=fetch){
  if(!entry.url)throw new Error("Manifest dataset URL is missing.");
  const text=await responseText(await fetcher(entry.url,{cache:"no-store"}));
  if(!(await verifyDatasetChecksum(text,entry.checksum)))throw new Error("Reference dataset checksum validation failed.");
  let parsed:unknown;try{parsed=JSON.parse(text);}catch{throw new Error("Downloaded content is not valid JSON.");}
  const validated=validateRankingReferenceDataset(parsed,{methodology,edition:entry.activeEdition,datasetVersion:entry.datasetVersion});
  if(!validated.dataset)throw new Error(validated.report.errors.join("; "));
  return activateReferenceDataset({...validated.dataset,metadata:{...validated.dataset.metadata,sourceType:"downloaded"}});
}

async function readImportInput(file:Blob|string){if(typeof file==="string"){if(new TextEncoder().encode(file).byteLength>MAX_RANKING_DATASET_BYTES)throw new Error("Reference dataset exceeds the size limit.");return file;}if(file.size>MAX_RANKING_DATASET_BYTES)throw new Error("Reference dataset exceeds the size limit.");if(file.type&&file.type!=="application/json"&&!file.type.endsWith("+json"))throw new Error("Imported file must be JSON.");return file.text();}
export async function importReferenceDataset(file:Blob|string){const text=await readImportInput(file);let parsed:unknown;try{parsed=JSON.parse(text);}catch{throw new Error("Imported file must be valid JSON.");}const result=validateRankingReferenceDataset(parsed);if(!result.dataset)throw new Error(result.report.errors.join("; "));const dataset:RankingReferenceDataset={...result.dataset,metadata:{...result.dataset.metadata,sourceType:"manually-imported" satisfies RankingReferenceSourceType}};return activateReferenceDataset(dataset);}

import type { RankingMethodology, RankingReferenceDataset, RankingReferenceDatasetMetadata } from "./types";

const DB_NAME = "rankingReferenceDatasets";
const DB_VERSION = 1;
const DATASETS = "rankingReferenceDatasets";
const METADATA = "rankingReferenceMetadata";
const ACTIVE_KEY = "ranking-reference-active-v1";
const keyOf = (metadata: Pick<RankingReferenceDatasetMetadata,"datasetId"|"datasetVersion">) => `${metadata.datasetId}@${metadata.datasetVersion}`;
const browser = () => typeof window !== "undefined" && typeof indexedDB !== "undefined";

function openDatabase(): Promise<IDBDatabase> {
  if (!browser()) return Promise.reject(new Error("IndexedDB is unavailable."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => { const db=request.result; if(!db.objectStoreNames.contains(DATASETS))db.createObjectStore(DATASETS); if(!db.objectStoreNames.contains(METADATA))db.createObjectStore(METADATA); };
    request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error);
  });
}

async function transaction<T>(storeName:string, mode:IDBTransactionMode, action:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T> {
  const db=await openDatabase();
  try { return await new Promise<T>((resolve,reject)=>{const tx=db.transaction(storeName,mode);const request=action(tx.objectStore(storeName));request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);tx.onabort=()=>reject(tx.error);}); } finally { db.close(); }
}

export async function storeRankingReferenceDataset(dataset: RankingReferenceDataset) {
  const key=keyOf(dataset.metadata);
  await transaction(DATASETS,"readwrite",store=>store.put(structuredClone(dataset),key));
  await transaction(METADATA,"readwrite",store=>store.put(structuredClone(dataset.metadata),key));
  const verified=await loadStoredRankingReferenceDataset(key);
  if(!verified)throw new Error("Dataset write verification failed.");
  return key;
}
export const loadStoredRankingReferenceDataset=(key:string)=>transaction<RankingReferenceDataset|undefined>(DATASETS,"readonly",store=>store.get(key)).then((value)=>value??null).catch(()=>null);
export const getStoredDatasetKey=keyOf;

export function getActiveRankingDatasetKeys():Partial<Record<RankingMethodology,string>> {
  if(typeof window==="undefined")return {};
  try{return JSON.parse(localStorage.getItem(ACTIVE_KEY)??"{}") as Partial<Record<RankingMethodology,string>>;}catch{return {};}
}
export function setActiveRankingDatasetKey(methodology:RankingMethodology,key:string|null){if(typeof window==="undefined")return;const active=getActiveRankingDatasetKeys();if(key)active[methodology]=key;else delete active[methodology];localStorage.setItem(ACTIVE_KEY,JSON.stringify(active));}
export const isRankingStorageAvailable=browser;

export async function listStoredRankingReferenceMetadata(){
  if(!browser())return [] as RankingReferenceDatasetMetadata[];
  return transaction<RankingReferenceDatasetMetadata[]>(METADATA,"readonly",store=>store.getAll()).catch(()=>[]);
}

export async function clearStoredRankingReferenceDatasets(){
  if(!browser())return 0;
  const existing=await listStoredRankingReferenceMetadata();
  const db=await openDatabase();
  try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction([DATASETS,METADATA],"readwrite");tx.objectStore(DATASETS).clear();tx.objectStore(METADATA).clear();tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
  setActiveRankingDatasetKey("QS",null);setActiveRankingDatasetKey("THE",null);
  return existing.length;
}

export async function getRankingReferenceStorageDiagnostics(){if(!browser())return{indexedDb:[],stores:[]};const databases=typeof indexedDB.databases==="function"?await indexedDB.databases():[];return{indexedDb:databases.map(item=>item.name).filter((name):name is string=>Boolean(name)),stores:[DATASETS,METADATA]};}

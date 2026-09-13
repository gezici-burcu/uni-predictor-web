import { RANKING_DATA_MANIFEST_URL } from "./remote-manifest";
import { getActiveRankingDatasetKeys } from "./dataset-storage";

export type ReferenceUpdateCheckStatus="unchecked"|"checked-current"|"update-available"|"unavailable";
export type ReferenceHeaderStatus="bundled"|"current"|"update-available"|"unavailable"|"local-current";
const KEY="ranking-reference-update-status-v1",EVENT="ranking-reference-update-status-change";
export const isRemoteRankingManifestConfigured=()=>Boolean(RANKING_DATA_MANIFEST_URL);
export function getReferenceUpdateCheckStatus():ReferenceUpdateCheckStatus{if(typeof window==="undefined")return"unchecked";const value=localStorage.getItem(KEY);return value==="checked-current"||value==="update-available"||value==="unavailable"?value:"unchecked";}
export function setReferenceUpdateCheckStatus(status:ReferenceUpdateCheckStatus){if(typeof window==="undefined")return;if(status==="unchecked")localStorage.removeItem(KEY);else localStorage.setItem(KEY,status);window.dispatchEvent(new Event(EVENT));}
export function getReferenceHeaderStatus():ReferenceHeaderStatus{if(Object.keys(getActiveRankingDatasetKeys()).length>0)return"local-current";if(!isRemoteRankingManifestConfigured())return"bundled";const checked=getReferenceUpdateCheckStatus();return checked==="checked-current"?"current":checked==="update-available"?"update-available":checked==="unavailable"?"unavailable":"bundled";}
export const subscribeReferenceHeaderStatus=(callback:()=>void)=>{if(typeof window==="undefined")return()=>undefined;window.addEventListener(EVENT,callback);window.addEventListener("storage",callback);return()=>{window.removeEventListener(EVENT,callback);window.removeEventListener("storage",callback);};};

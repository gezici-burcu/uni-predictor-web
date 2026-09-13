import { QS_INDICATOR_ORDER } from "@/src/config/qs.calculation";
import type { RankingDatasetValidationReport, RankingMethodology, RankingReferenceDataset, RankingReferenceDatasetMetadata } from "./types";

const THE_KEYS = ["teaching", "researchEnvironment", "researchQuality", "internationalOutlook", "industry"] as const;
const finiteScore = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export function validateRankingReferenceDataset(value: unknown, expected?: { methodology?: RankingMethodology; edition?: number; datasetVersion?: string }): { dataset: RankingReferenceDataset | null; report: RankingDatasetValidationReport } {
  const errors: string[] = [], warnings: string[] = [], duplicates: string[] = [];
  if (!object(value) || !object(value.metadata) || !Array.isArray(value.records)) {
    return { dataset: null, report: { valid:false,totalRecords:0,usableRecords:0,duplicateInstitutions:[],invalidRecords:0,missingRankRecords:0,incompleteVectorRecords:0,coveredRankBands:[],warnings,errors:["Dataset must contain metadata and records."] } };
  }
  const metadata = value.metadata as unknown as RankingReferenceDatasetMetadata;
  if (metadata.schemaVersion !== 1) errors.push("Unsupported dataset schemaVersion.");
  if (metadata.methodology !== "QS" && metadata.methodology !== "THE") errors.push("Unknown methodology.");
  if(typeof metadata.datasetId!=="string"||!metadata.datasetId.trim()||typeof metadata.datasetVersion!=="string"||!/^\d+(\.\d+)*$/.test(metadata.datasetVersion))errors.push("Dataset identity or version is invalid.");
  if(!Number.isInteger(metadata.edition)||metadata.edition<1)errors.push("Dataset edition is invalid.");
  if(!["bundled","downloaded","manually-imported"].includes(metadata.sourceType))errors.push("Dataset sourceType is invalid.");
  if (expected?.methodology && metadata.methodology !== expected.methodology) errors.push("Dataset methodology does not match manifest.");
  if (expected?.edition && metadata.edition !== expected.edition) errors.push("Dataset edition does not match manifest.");
  if (expected?.datasetVersion && metadata.datasetVersion !== expected.datasetVersion) errors.push("Dataset version does not match manifest.");
  const ids = new Set<string>(), bands = new Set<string>();
  let usable = 0, invalid = 0, missingRank = 0, incomplete = 0;
  for (const raw of value.records) {
    if (!object(raw) || typeof raw.institutionId !== "string" || typeof raw.institutionName !== "string" || raw.edition !== metadata.edition) { invalid += 1; continue; }
    if (ids.has(raw.institutionId)) duplicates.push(raw.institutionId); else ids.add(raw.institutionId);
    const hasRank = (typeof raw.publishedRank === "number" && Number.isInteger(raw.publishedRank) && raw.publishedRank > 0) || (typeof raw.publishedRankBand === "string" && raw.publishedRankBand.length > 0);
    if (!hasRank) missingRank += 1;
    if (typeof raw.publishedRankBand === "string") bands.add(raw.publishedRankBand);
    const vector = metadata.methodology === "QS" ? raw.indicators : raw.categories;
    const keys = metadata.methodology === "QS" ? QS_INDICATOR_ORDER.filter((code) => code !== "ISD") : THE_KEYS;
    const complete = object(vector) && keys.every((key) => finiteScore(vector[key]));
    if (!complete) incomplete += 1;
    if (hasRank && complete) usable += 1;
  }
  if (duplicates.length) warnings.push(`${duplicates.length} duplicate institution id(s) found.`);
  if (usable === 0) errors.push("Dataset has no usable records.");
  if (metadata.recordCount !== value.records.length) errors.push("metadata.recordCount does not match records length.");
  if (metadata.usableRecordCount !== usable) errors.push("metadata.usableRecordCount does not match validation result.");
  const report = { valid: errors.length === 0, totalRecords:value.records.length, usableRecords:usable, duplicateInstitutions:duplicates, invalidRecords:invalid, missingRankRecords:missingRank, incompleteVectorRecords:incomplete, coveredRankBands:[...bands], warnings, errors };
  return { dataset: report.valid ? value as RankingReferenceDataset : null, report };
}

export async function verifyDatasetChecksum(text: string, checksum: string | null | undefined) {
  if (!checksum) return true;
  if (!globalThis.crypto?.subtle) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return actual.toLowerCase() === checksum.replace(/^sha256:/i, "").toLowerCase();
}

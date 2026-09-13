import type { RankingManifestEntry, RankingMethodology, RankingReferenceManifest } from "./types";

const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const string = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const integer = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value > 0;

export function validateRankingManifest(value: unknown): { valid: boolean; manifest: RankingReferenceManifest | null; errors: string[] } {
  const errors: string[] = [];
  if (!object(value)) return { valid: false, manifest: null, errors: ["Manifest must be an object."] };
  if (value.schemaVersion !== 1) errors.push("Unsupported manifest schemaVersion.");
  if (!string(value.generatedAt)) errors.push("generatedAt is required.");
  if (!object(value.methodologies)) errors.push("methodologies is required.");
  for (const methodology of ["QS", "THE"] as const) {
    const entry = object(value.methodologies) ? value.methodologies[methodology] : null;
    if (!object(entry)) { errors.push(`${methodology} manifest entry is required.`); continue; }
    if (!integer(entry.activeEdition)) errors.push(`${methodology}.activeEdition is invalid.`);
    if (!string(entry.datasetId) || !string(entry.datasetVersion) || !string(entry.file) || !string(entry.sourceLabel)) errors.push(`${methodology} dataset identity is invalid.`);
    if (!Number.isInteger(entry.recordCount) || (entry.recordCount as number) < 0 || !Number.isInteger(entry.usableRecordCount) || (entry.usableRecordCount as number) < 0) errors.push(`${methodology} record counts are invalid.`);
    if (entry.url !== undefined && entry.url !== null) {
      if (!string(entry.url)) errors.push(`${methodology}.url is invalid.`);
      else { try { const url=new URL(entry.url); if(url.protocol!=="https:"&&url.protocol!=="http:")errors.push(`${methodology}.url protocol is invalid.`); } catch { errors.push(`${methodology}.url is invalid.`); } }
    }
  }
  return errors.length ? { valid: false, manifest: null, errors } : { valid: true, manifest: value as RankingReferenceManifest, errors: [] };
}

export function compareNumericVersions(left: string, right: string): number {
  const parse = (value: string) => value.split(".").map((part) => /^\d+$/.test(part) ? Number(part) : Number.NaN);
  const a = parse(left), b = parse(right);
  if (a.some(Number.isNaN) || b.some(Number.isNaN)) throw new TypeError("Dataset versions must contain numeric dot-separated segments.");
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference > 0 ? 1 : -1;
  }
  return 0;
}

export function isRemoteEntryNewer(local: RankingManifestEntry, remote: RankingManifestEntry) {
  if (remote.activeEdition !== local.activeEdition) return remote.activeEdition > local.activeEdition;
  return compareNumericVersions(remote.datasetVersion, local.datasetVersion) > 0;
}

export const isRankingMethodology = (value: unknown): value is RankingMethodology => value === "QS" || value === "THE";

export const QS_REFERENCE_READINESS_CONFIG = {
  minimumCompleteRecords: 10,
  recommendedCompleteRecords: 25,
} as const;

export type QsReferenceReadinessStatus = "empty" | "insufficient" | "usable" | "recommended";

export function getQsReferenceReadinessStatus(completeRecordCount:number): QsReferenceReadinessStatus {
  if (completeRecordCount === 0) return "empty";
  if (completeRecordCount < QS_REFERENCE_READINESS_CONFIG.minimumCompleteRecords) return "insufficient";
  if (completeRecordCount < QS_REFERENCE_READINESS_CONFIG.recommendedCompleteRecords) return "usable";
  return "recommended";
}

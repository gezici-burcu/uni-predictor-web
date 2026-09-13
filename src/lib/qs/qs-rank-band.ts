export interface NormalizedQsRankBand {
  label: string;
  lowerBound: number;
  upperBound: number | null;
  openEnded: boolean;
}

export function normalizeQsRankBand(value: string): NormalizedQsRankBand | null {
  const normalized = value.trim().replace(/[—–]/g, "-").replace(/\s+/g, "");
  const open = /^([1-9]\d*)\+$/.exec(normalized);
  if (open) {
    const lowerBound = Number(open[1]);
    return { label:`${lowerBound}+`, lowerBound, upperBound:null, openEnded:true };
  }
  const closed = /^([1-9]\d*)-([1-9]\d*)$/.exec(normalized);
  if (!closed) return null;
  const lowerBound = Number(closed[1]), upperBound = Number(closed[2]);
  if (lowerBound > upperBound) return null;
  return { label:`${lowerBound}–${upperBound}`, lowerBound, upperBound, openEnded:false };
}

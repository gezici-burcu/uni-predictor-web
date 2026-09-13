export interface ZScoreResult { value: number | null; valid: boolean; warning?: string }

export const calculateZScore = (rawValue: number | null, mean: number | null, standardDeviation: number | null): ZScoreResult => {
  if (rawValue === null || mean === null || standardDeviation === null) return { value: null, valid: false, warning: "Normalizasyon referansı eksik." };
  if (![rawValue, mean, standardDeviation].every(Number.isFinite)) return { value: null, valid: false, warning: "Normalizasyon verisi geçersiz." };
  if (standardDeviation <= 0) return { value: null, valid: false, warning: "Standart sapma sıfırdan büyük olmalıdır." };
  return { value: (rawValue - mean) / standardDeviation, valid: true };
};

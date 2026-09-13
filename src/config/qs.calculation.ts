import type { QsIndicatorCode, QsOverallNormalizationReference } from "@/src/types/qs";

export const QS_2027_INDICATOR_WEIGHTS: Record<QsIndicatorCode, number> = { AR: .30, CPF: .20, ER: .15, EO: .05, IFR: .05, IRN: .05, ISD: 0, ISR: .05, FSR: .10, SUS: .05 };
export const QS_INDICATOR_ORDER: QsIndicatorCode[] = ["AR", "CPF", "ER", "EO", "IFR", "IRN", "ISD", "ISR", "FSR", "SUS"];
export const QS_PRODUCTION_OVERALL_REFERENCE: QsOverallNormalizationReference = { weightedMin: null, weightedMax: null, sourceYear: null, sourceDescription: "Doğrulanmış QS overall referansları bekleniyor" };

import { QS_2027_INDICATOR_WEIGHTS, QS_INDICATOR_ORDER } from "./qs.calculation";
import type { QsIndicatorCode } from "@/src/types/qs";
import type { QsStochasticIndicatorDefinition } from "@/src/types/qs-stochastic";

export interface QsStochasticModelConfig {
  methodology: "QS World University Rankings";
  methodologyYear: 2027;
  modelVersion: "qs-wur-2027-stochastic-v1";
  simulationRunCount: number;
  seed: number;
  uncertainty: {
    elasticity: { minimum: number; mode: number; maximum: number };
    latentScale: number;
    relativeChangeMinimum: number;
    relativeChangeMaximum: number;
    epsilon: number;
    probabilityEpsilon: number;
    calibrationAbsoluteTolerance: number;
    calibrationRelativeTolerance: number;
  };
}

const modes: Record<QsIndicatorCode, QsStochasticIndicatorDefinition["normalizationMode"]> = {
  AR: "stochastic-anchor", CPF: "stochastic-anchor", ER: "stochastic-anchor",
  EO: "stochastic-anchor", IFR: "stochastic-anchor", IRN: "stochastic-anchor",
  ISD: "indicator-only", ISR: "stochastic-anchor", FSR: "stochastic-anchor",
  SUS: "external-score-direct",
};
const labels: Record<QsIndicatorCode, string> = {
  AR: "Akademik İtibar", CPF: "Akademisyen Başına Atıf",
  ER: "İşveren İtibarı", EO: "İstihdam Sonuçları",
  IFR: "Uluslararası Akademik Personel Oranı", IRN: "Uluslararası Araştırma Ağı",
  ISD: "Uluslararası Öğrenci Çeşitliliği", ISR: "Uluslararası Öğrenci Oranı",
  FSR: "Akademik Personel / Öğrenci Oranı", SUS: "Sürdürülebilirlik",
};
const shortLabels: Record<QsIndicatorCode, string> = {
  AR: "Akademik İtibar", CPF: "Atıf", ER: "İşveren İtibarı", EO: "İstihdam",
  IFR: "Uluslararası Personel", IRN: "Araştırma Ağı", ISD: "Öğrenci Çeşitliliği",
  ISR: "Uluslararası Öğrenci", FSR: "Personel / Öğrenci", SUS: "Sürdürülebilirlik",
};
const englishLabels: Record<QsIndicatorCode, string> = {
  AR: "Academic Reputation", CPF: "Citations per Faculty",
  ER: "Employer Reputation", EO: "Employment Outcomes",
  IFR: "International Faculty Ratio", IRN: "International Research Network",
  ISD: "International Student Diversity", ISR: "International Student Ratio",
  FSR: "Faculty-Student Ratio", SUS: "Sustainability",
};
const sources: Record<QsIndicatorCode, QsStochasticIndicatorDefinition["sourceType"]> = {
  AR: "external", CPF: "institutional-and-external", ER: "external",
  EO: "institutional-and-external", IFR: "institutional", IRN: "external",
  ISD: "institutional", ISR: "institutional", FSR: "institutional", SUS: "external",
};

export const QS_STOCHASTIC_INDICATOR_DEFINITIONS: readonly QsStochasticIndicatorDefinition[] =
  QS_INDICATOR_ORDER.map((code) => ({
    code,
    label: labels[code],
    shortLabel: shortLabels[code],
    englishLabel: englishLabels[code],
    officialWeight: QS_2027_INDICATOR_WEIGHTS[code],
    beneficialDirection: "higherIsBetter",
    scoreUsage: QS_2027_INDICATOR_WEIGHTS[code] === 0 ? "indicator-only" : "weighted",
    sourceType: sources[code],
    normalizationMode: modes[code],
  }));

export const QS_WEIGHTED_INDICATOR_DEFINITIONS =
  QS_STOCHASTIC_INDICATOR_DEFINITIONS.filter((definition) => definition.officialWeight > 0);

export const QS_STOCHASTIC_MODEL_CONFIG: QsStochasticModelConfig = {
  methodology: "QS World University Rankings",
  methodologyYear: 2027,
  modelVersion: "qs-wur-2027-stochastic-v1",
  simulationRunCount: 5000,
  seed: 20270727,
  uncertainty: {
    elasticity: { minimum: .75, mode: 1, maximum: 1.25 },
    latentScale: 1,
    relativeChangeMinimum: -2,
    relativeChangeMaximum: 2,
    epsilon: 1e-9,
    probabilityEpsilon: 1e-6,
    calibrationAbsoluteTolerance: 1e-10,
    calibrationRelativeTolerance: 1e-9,
  },
};

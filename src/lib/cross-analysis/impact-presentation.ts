import {
  THE_RAW_INDICATOR_DEFINITIONS,
  THE_RAW_INDICATOR_LEGACY_CODE_MAP,
} from "@/src/config/the-raw-indicators";
import { QS_STOCHASTIC_INDICATOR_DEFINITIONS } from "@/src/config/qs.stochastic";
import { CROSS_ANALYSIS_PARAMETER_BY_ID } from "./registry";
import type {
  CrossAnalysisImpactRole,
  CrossAnalysisMethodologyId,
  CrossAnalysisParameterDefinition,
  CrossAnalysisUnaffectedReason,
} from "./types";

export type CrossAnalysisImpactLanguage = "tr" | "en";

export type CrossAnalysisMetricPresentation = {
  code: string;
  label: string;
  category: string | null;
  scoreUsage: "weighted" | "indicator-only";
};

export type CrossAnalysisMethodologyImpactPresentation = {
  methodology: CrossAnalysisMethodologyId;
  affected: boolean;
  impactRole: CrossAnalysisImpactRole | null;
  unaffectedReason: CrossAnalysisUnaffectedReason | null;
  metrics: CrossAnalysisMetricPresentation[];
};

const theByCode = new Map<string, typeof THE_RAW_INDICATOR_DEFINITIONS[number]>(THE_RAW_INDICATOR_DEFINITIONS.map((definition) => [
  THE_RAW_INDICATOR_LEGACY_CODE_MAP[definition.id],
  definition,
]));
const qsByCode = new Map<string, typeof QS_STOCHASTIC_INDICATOR_DEFINITIONS[number]>(QS_STOCHASTIC_INDICATOR_DEFINITIONS.map((definition) => [definition.code, definition]));

const theCategoryLabels = {
  tr: {
    teaching: "Öğretim",
    researchEnvironment: "Araştırma Ortamı",
    researchQuality: "Araştırma Kalitesi",
    internationalOutlook: "Uluslararası Görünüm",
    industry: "Sanayi",
  },
  en: {
    teaching: "Teaching",
    researchEnvironment: "Research Environment",
    researchQuality: "Research Quality",
    internationalOutlook: "International Outlook",
    industry: "Industry",
  },
} as const;

export function getCrossAnalysisMetricPresentations(
  methodology: CrossAnalysisMethodologyId,
  codes: readonly string[],
  language: CrossAnalysisImpactLanguage,
): CrossAnalysisMetricPresentation[] {
  return Array.from(new Set(codes)).map((code) => {
    if (methodology === "the") {
      const definition = theByCode.get(code);
      return {
        code,
        label: definition?.officialName ?? code,
        category: definition ? theCategoryLabels[language][definition.category] : null,
        scoreUsage: definition?.weight === 0 ? "indicator-only" : "weighted",
      };
    }
    if (methodology === "qs") {
      const definition = qsByCode.get(code);
      return {
        code,
        label: definition ? language === "tr" ? definition.label : definition.englishLabel : code,
        category: null,
        scoreUsage: definition?.scoreUsage === "indicator-only" ? "indicator-only" : "weighted",
      };
    }
    throw new Error(`Unsupported Cross Analysis methodology: ${methodology satisfies never}`);
  });
}

export function getCrossAnalysisParameterImpactPresentations(
  parameter: CrossAnalysisParameterDefinition,
  language: CrossAnalysisImpactLanguage,
): CrossAnalysisMethodologyImpactPresentation[] {
  return (["the", "qs"] as const).map((methodology) => {
    const mapping = parameter.mappings[methodology];
    const affected = Boolean(mapping?.scoreImpactingMetrics.length);
    return {
      methodology,
      affected,
      impactRole: affected ? mapping?.impactRole ?? null : null,
      unaffectedReason: affected ? null : parameter.unaffectedReasons[methodology] ?? "notMapped",
      metrics: affected
        ? getCrossAnalysisMetricPresentations(methodology, mapping?.impactedMetrics ?? [], language)
        : [],
    };
  });
}

export function getCrossAnalysisUnaffectedReason(
  parameterIds: readonly string[],
  methodology: CrossAnalysisMethodologyId,
) {
  const reasons = new Set<CrossAnalysisUnaffectedReason>();
  for (const parameterId of parameterIds) {
    const parameter = CROSS_ANALYSIS_PARAMETER_BY_ID.get(parameterId as never);
    if (!parameter?.mappings[methodology]?.scoreImpactingMetrics.length) {
      reasons.add(parameter?.unaffectedReasons[methodology] ?? "notMapped");
    }
  }
  return reasons.size === 1 ? [...reasons][0] : "notMapped";
}

import { THE_INSTITUTION_DATA_FIELDS } from "@/src/config/data-entry/the-institution-fields";
import { THE_INSTITUTIONAL_TO_SCENARIO_MAPPING } from "@/src/lib/the/institutional-scenario";
import {
  CROSS_ANALYSIS_FIELD_DISCOVERY_BY_ID,
  getQsDerivedFteAggregateForTheField,
} from "./discovery";
import type {
  CrossAnalysisMethodologyId,
  CrossAnalysisParameterDefinition,
  CrossAnalysisParameterId,
  CrossAnalysisParameterMapping,
} from "./types";

function mapping(
  inputPaths: readonly string[],
  impactedMetrics: readonly string[],
  scoreImpactingMetrics: readonly string[],
  impactRole: "numerator" | "denominator" | "mixed",
): CrossAnalysisParameterMapping {
  return { inputPaths, impactedMetrics, scoreImpactingMetrics, impactRole };
}

const theParameters: CrossAnalysisParameterDefinition[] = THE_INSTITUTION_DATA_FIELDS.flatMap((field) => {
  const discovery = CROSS_ANALYSIS_FIELD_DISCOVERY_BY_ID.get(field.id);
  const scenarioPath = THE_INSTITUTIONAL_TO_SCENARIO_MAPPING[
    field.id as keyof typeof THE_INSTITUTIONAL_TO_SCENARIO_MAPPING
  ];
  const theImpact = discovery?.impacts.the;
  if (!scenarioPath || !theImpact?.metrics.length) return [];
  const qsAggregate = getQsDerivedFteAggregateForTheField(field.id);
  const qsMapping = qsAggregate
    ? mapping(
        [`institutional.${qsAggregate.target}.actualFte`, `institutional.${qsAggregate.target}.roundedFte`],
        qsAggregate.metrics,
        qsAggregate.weighted,
        qsAggregate.role,
      )
    : null;
  const mappings = {
    the: mapping(
      [scenarioPath],
      theImpact.metrics,
      theImpact.scoreImpactingMetrics,
      field.id.includes("international") ? "numerator" : "mixed",
    ),
    ...(qsMapping ? { qs: qsMapping } : {}),
  };
  const affectedMethodologies = Object.keys(mappings) as CrossAnalysisMethodologyId[];
  return [{
    id: field.id,
    labelKey: field.id,
    labels: field.label,
    semanticType: discovery?.semanticType ?? "count",
    semanticFamily: discovery?.semanticFamily ?? field.id,
    unit: field.id.endsWith("Fte") ? "FTE" : field.unit.en,
    valueType: field.inputType,
    editable: true,
    required: field.required,
    sourceSection: discovery?.sourceSection ?? "studentsAndStaff",
    validation: {
      minimum: field.minimum,
      integerOnly: true,
      ...(field.id === "internationalAcademicStaffFte" ? { subsetOf: "academicStaffFte" } : {}),
      ...(field.id === "internationalStudentsFte" ? { subsetOf: "studentsFte" } : {}),
    },
    baselineSource: `institutionData.the.${field.id}`,
    baselineSources: [
      `institutionData.the.${field.id}`,
      ...(qsAggregate ? [`institutionData.qs.${qsAggregate.rows.join("+")}.derivedActualFte`] : []),
    ],
    semanticNotes: "Canonical institutional FTE shared semantically by THE and QS.",
    mappings,
    affectedMethodologies,
    unaffectedReasons: { ...(qsMapping ? {} : { qs: "notMapped" as const }) },
  }];
});

const CROSS_ANALYSIS_SHARED_PARAMETER_IDS = [
  "academicStaffFte",
  "studentsFte",
  "internationalAcademicStaffFte",
  "internationalStudentsFte",
] as const;

const CROSS_ANALYSIS_PARAMETER_LABELS = {
  academicStaffFte: { tr: "Akademik Personel Sayısı (FTE)", en: "Academic Staff (FTE)" },
  studentsFte: { tr: "Öğrenci Sayısı (FTE)", en: "Students (FTE)" },
  internationalAcademicStaffFte: {
    tr: "Uluslararası / Yurt Dışı Kökenli Akademik Personel Sayısı (FTE)",
    en: "International Academic Staff (FTE)",
  },
  internationalStudentsFte: {
    tr: "Uluslararası / Yurt Dışı Kökenli Öğrenci Sayısı (FTE)",
    en: "International Students (FTE)",
  },
} as const;

const theParameterById = new Map(theParameters.map((parameter) => [parameter.id, parameter]));

// Shared means the same canonical institutional raw FTE in THE and QS;
// similar scores or indicators do not make a parameter shared.
export const CROSS_ANALYSIS_PARAMETER_REGISTRY: readonly CrossAnalysisParameterDefinition[] =
  CROSS_ANALYSIS_SHARED_PARAMETER_IDS.map((id) => {
    const parameter = theParameterById.get(id);
    if (!parameter?.mappings.the || !parameter.mappings.qs) {
      throw new Error(`Missing verified THE/QS Cross Analysis mapping: ${id}`);
    }
    return { ...parameter, labels: CROSS_ANALYSIS_PARAMETER_LABELS[id] };
  });

// API alias retained so legacy snapshots can be normalized without a migration.
export const CROSS_ANALYSIS_ARCHIVED_PARAMETER_REGISTRY = CROSS_ANALYSIS_PARAMETER_REGISTRY;

for (const parameter of CROSS_ANALYSIS_PARAMETER_REGISTRY) {
  const mappedMethodologies = Object.keys(parameter.mappings).sort();
  const affectedMethodologies = [...parameter.affectedMethodologies].sort();
  if (affectedMethodologies.join(",") !== "qs,the") {
    throw new Error(`Cross Analysis parameter must affect THE and QS: ${parameter.id}`);
  }
  if (mappedMethodologies.join(",") !== affectedMethodologies.join(",")) {
    throw new Error(`Cross Analysis impact metadata does not match mappings: ${parameter.id}`);
  }
  for (const [methodology, item] of Object.entries(parameter.mappings)) {
    if (!item?.impactedMetrics.length || !item.scoreImpactingMetrics.length) {
      throw new Error(`Cross Analysis mapping must have a score-impacting dependency: ${parameter.id}/${methodology}`);
    }
    if (item.scoreImpactingMetrics.some((metric) => !item.impactedMetrics.includes(metric))) {
      throw new Error(`Cross Analysis score dependency must also be impacted: ${parameter.id}/${methodology}`);
    }
  }
}

export const CROSS_ANALYSIS_PARAMETER_BY_ID = new Map<CrossAnalysisParameterId, CrossAnalysisParameterDefinition>(
  CROSS_ANALYSIS_PARAMETER_REGISTRY.map((parameter) => [parameter.id, parameter]),
);

export const CROSS_ANALYSIS_ARCHIVED_PARAMETER_BY_ID = new Map<CrossAnalysisParameterId, CrossAnalysisParameterDefinition>(
  CROSS_ANALYSIS_ARCHIVED_PARAMETER_REGISTRY.map((parameter) => [parameter.id, parameter]),
);

export function getCrossAnalysisParameterLabel(
  parameter: CrossAnalysisParameterDefinition,
  language: "tr" | "en",
) {
  return parameter.labels[language];
}

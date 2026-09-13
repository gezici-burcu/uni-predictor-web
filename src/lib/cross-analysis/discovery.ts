import { THE_INSTITUTION_DATA_FIELDS } from "@/src/config/data-entry/the-institution-fields";
import { calculateTheRawIndicators } from "@/src/lib/calculations/the/calculateTheRawIndicators";
import { createTheInputData } from "@/src/lib/calculations/the/createTheInputData";
import { THE_INDICATOR_METADATA } from "@/src/lib/calculations/the/calculateTheRawIndicators";
import { THE_INSTITUTIONAL_TO_SCENARIO_MAPPING } from "@/src/lib/the/institutional-scenario";
import { qsInstitutionalCountRows } from "@/src/types/qsInstitutional";
import type {
  CrossAnalysisImpactRole,
  CrossAnalysisMethodologyId,
  CrossAnalysisParameterSemanticType,
  CrossAnalysisParameterValueType,
} from "./types";

export type CrossAnalysisDependencyKind = "direct" | "derived" | "direct-and-derived";
export type CrossAnalysisDiscoveryExclusionReason =
  | "no-calculation-dependency"
  | "indicator-only"
  | "single-methodology"
  | "semantic-mismatch";

export type CrossAnalysisDiscoveredImpact = {
  kind: CrossAnalysisDependencyKind;
  metrics: readonly string[];
  scoreImpactingMetrics: readonly string[];
};

export type CrossAnalysisFieldDiscovery = {
  id: string;
  labels: { tr: string; en: string };
  sourceMethodology: CrossAnalysisMethodologyId;
  sourceSection: string;
  unit: string;
  valueType: CrossAnalysisParameterValueType;
  semanticType: CrossAnalysisParameterSemanticType;
  semanticFamily: string;
  semanticBasis: string;
  editable: true;
  rawInput: true;
  required: boolean;
  yearScope: "methodology-specific";
  impacts: Partial<Record<CrossAnalysisMethodologyId, CrossAnalysisDiscoveredImpact>>;
  eligible: boolean;
  exclusionReason: CrossAnalysisDiscoveryExclusionReason | null;
  exclusionDetail: string | null;
};

export type CrossAnalysisSemanticCandidateAudit = {
  family: string;
  sourceIds: readonly string[];
  methodologies: readonly CrossAnalysisMethodologyId[];
  compatible: boolean;
  decision: string;
};

export const CROSS_ANALYSIS_SEMANTIC_CANDIDATE_AUDIT: readonly CrossAnalysisSemanticCandidateAudit[] = [
  {
    family: "students",
    sourceIds: ["studentsFte", "qs.institutional.students.actualFte"],
    methodologies: ["the", "qs"],
    compatible: true,
    decision: "THE and QS calculators both consume total student FTE. Cross Analysis treats it as one canonical target while retaining methodology-specific baseline values.",
  },
  {
    family: "academic-staff",
    sourceIds: ["academicStaffFte", "qs.institutional.academicStaff.actualFte"],
    methodologies: ["the", "qs"],
    compatible: true,
    decision: "THE and QS calculators both consume academic/faculty staff FTE. Cross Analysis preserves separate baselines and applies the same proposed canonical FTE to each calculator mapping.",
  },
  {
    family: "international-academic-staff",
    sourceIds: ["internationalAcademicStaffFte", "qs.institutional.internationalAcademicStaff.actualFte"],
    methodologies: ["the", "qs"],
    compatible: true,
    decision: "Both calculators consume international academic/faculty staff FTE for their respective international ratios.",
  },
  {
    family: "international-students",
    sourceIds: ["internationalStudentsFte", "qs.institutional.internationalStudents.actualFte"],
    methodologies: ["the", "qs"],
    compatible: true,
    decision: "Both calculators consume international student FTE for their respective international-student ratios.",
  },
  {
    family: "research-income",
    sourceIds: ["researchIncome", "qs.researchIncome"],
    methodologies: ["the", "qs"],
    compatible: false,
    decision: "THE uses institutional research income; the QS World University Rankings calculator has no equivalent weighted institutional raw input.",
  },
  {
    family: "doctorates",
    sourceIds: ["doctorateStudentsFte", "doctoratesAwarded", "qs.doctorates"],
    methodologies: ["the", "qs"],
    compatible: false,
    decision: "THE doctorate indicators have no matching weighted raw field in the QS calculator.",
  },
  {
    family: "citations",
    sourceIds: ["the.external.fieldWeightedCitationImpact", "qs.external.adjustedCitations"],
    methodologies: ["the", "qs"],
    compatible: false,
    decision: "THE Research Quality and QS Citations per Faculty are distinct indicators; no shared editable institutional raw citation field is verified.",
  },
  {
    family: "employment",
    sourceIds: ["qs.totalEmploymentRespondents", "qs.employedGraduates", "the.employment"],
    methodologies: ["the", "qs"],
    compatible: false,
    decision: "QS Employment Outcomes inputs are indicator-only in this calculator and have no identical THE institutional source.",
  },
  {
    family: "reputation",
    sourceIds: ["the.external.reputation", "qs.external.academicReputation", "qs.external.employerReputation"],
    methodologies: ["the", "qs"],
    compatible: false,
    decision: "Reputation scores are external methodology-specific scores, not shared institutional parameters.",
  },
];

const theCalculatorDependencyGraph = calculateTheRawIndicators(createTheInputData({}));

export const THE_SCORE_DEPENDENCIES: Record<string, readonly string[]> = Object.fromEntries(
  THE_INSTITUTION_DATA_FIELDS.map((field) => {
    const inputPath = THE_INSTITUTIONAL_TO_SCENARIO_MAPPING[
      field.id as keyof typeof THE_INSTITUTIONAL_TO_SCENARIO_MAPPING
    ];
    const indicatorCodes = inputPath
      ? Object.values(theCalculatorDependencyGraph)
          .filter((indicator) => indicator.dependencies.includes(inputPath))
          .map((indicator) => indicator.code)
      : [];
    return [field.id, indicatorCodes];
  }),
);

type QsScoreDependency = {
  row: "academicStaff" | "internationalAcademicStaff" | "undergraduateStudents" | "undergraduateInternationalStudents" | "graduatePostgraduateStudents" | "graduatePostgraduateInternationalStudents";
  target: "academicStaff" | "internationalAcademicStaff" | "students" | "internationalStudents";
  semanticFamily: string;
  labels: { tr: string; en: string };
  metrics: readonly string[];
  weighted: readonly string[];
  role: CrossAnalysisImpactRole;
  section: string;
};

export const QS_DATA_ENTRY_SCORE_DEPENDENCIES: readonly QsScoreDependency[] = [
  { row: "academicStaff", target: "academicStaff", semanticFamily: "academic-staff", labels: { tr: "Akademik personel", en: "Faculty staff" }, metrics: ["FSR", "IFR", "CPF"], weighted: ["FSR", "IFR", "CPF"], role: "mixed", section: "studentsAndStaff" },
  { row: "internationalAcademicStaff", target: "internationalAcademicStaff", semanticFamily: "international-academic-staff", labels: { tr: "Uluslararası akademik personel", en: "International faculty staff" }, metrics: ["IFR"], weighted: ["IFR"], role: "numerator", section: "internationalization" },
  { row: "undergraduateStudents", target: "students", semanticFamily: "undergraduate-students", labels: { tr: "Lisans öğrencileri", en: "Undergraduate students" }, metrics: ["FSR", "ISR", "ISD"], weighted: ["FSR", "ISR"], role: "denominator", section: "studentsAndStaff" },
  { row: "undergraduateInternationalStudents", target: "internationalStudents", semanticFamily: "international-undergraduate-students", labels: { tr: "Uluslararası lisans öğrencileri", en: "International undergraduate students" }, metrics: ["ISR", "ISD"], weighted: ["ISR"], role: "numerator", section: "internationalization" },
  { row: "graduatePostgraduateStudents", target: "students", semanticFamily: "graduate-students", labels: { tr: "Lisansüstü öğrenciler", en: "Graduate/postgraduate students" }, metrics: ["FSR", "ISR", "ISD"], weighted: ["FSR", "ISR"], role: "denominator", section: "studentsAndStaff" },
  { row: "graduatePostgraduateInternationalStudents", target: "internationalStudents", semanticFamily: "international-graduate-students", labels: { tr: "Uluslararası lisansüstü öğrenciler", en: "International graduate/postgraduate students" }, metrics: ["ISR", "ISD"], weighted: ["ISR"], role: "numerator", section: "internationalization" },
];

export const QS_DERIVED_FTE_AGGREGATES = [
  { semanticFamily: "academic-staff", target: "academicStaff", rows: ["academicStaff"], metrics: ["FSR", "IFR", "CPF"], weighted: ["FSR", "IFR", "CPF"], role: "mixed" },
  { semanticFamily: "international-academic-staff", target: "internationalAcademicStaff", rows: ["internationalAcademicStaff"], metrics: ["IFR"], weighted: ["IFR"], role: "numerator" },
  { semanticFamily: "students", target: "students", rows: ["undergraduateStudents", "graduatePostgraduateStudents"], metrics: ["FSR", "ISR", "ISD"], weighted: ["FSR", "ISR"], role: "denominator" },
  { semanticFamily: "international-students", target: "internationalStudents", rows: ["undergraduateInternationalStudents", "graduatePostgraduateInternationalStudents"], metrics: ["ISR", "ISD"], weighted: ["ISR"], role: "numerator" },
  { semanticFamily: "undergraduate-students", target: "undergraduateStudents", rows: ["undergraduateStudents"], metrics: ["FSR", "ISR", "ISD"], weighted: ["FSR", "ISR"], role: "denominator" },
] as const;

const THE_SEMANTICS: Record<string, { family: string; basis: string; semanticType: CrossAnalysisParameterSemanticType; section: string }> = {
  academicStaffFte: { family: "academic-staff", basis: "fte", semanticType: "fte", section: "staff" },
  internationalAcademicStaffFte: { family: "international-academic-staff", basis: "fte", semanticType: "fte", section: "internationalization" },
  researchStaffFte: { family: "research-staff", basis: "fte", semanticType: "fte", section: "researchAndPublications" },
  studentsFte: { family: "students", basis: "fte", semanticType: "fte", section: "students" },
  internationalStudentsFte: { family: "international-students", basis: "fte", semanticType: "fte", section: "internationalization" },
  femaleAcademicStaffFte: { family: "female-academic-staff", basis: "fte", semanticType: "fte", section: "staff" },
  femaleStudentsFte: { family: "female-students", basis: "fte", semanticType: "fte", section: "students" },
  bachelorsStudentsFte: { family: "undergraduate-students", basis: "fte", semanticType: "fte", section: "students" },
  mastersStudentsFte: { family: "masters-students", basis: "fte", semanticType: "fte", section: "students" },
  doctorateStudentsFte: { family: "doctoral-students", basis: "fte", semanticType: "fte", section: "students" },
  undergraduateDegreesAwarded: { family: "undergraduate-graduates", basis: "annual-count", semanticType: "count", section: "students" },
  doctoratesAwarded: { family: "doctoral-graduates", basis: "annual-count", semanticType: "count", section: "researchAndPublications" },
  institutionalIncome: { family: "institutional-income", basis: "annual-currency", semanticType: "currency", section: "financeAndBudget" },
  researchIncome: { family: "research-income", basis: "annual-currency", semanticType: "currency", section: "financeAndBudget" },
  industryCommerceResearchIncome: { family: "industry-research-income", basis: "annual-currency", semanticType: "currency", section: "financeAndBudget" },
};

export function getQsDerivedFteAggregateForTheField(fieldId: string) {
  const semantics = THE_SEMANTICS[fieldId];
  if (!semantics || semantics.basis !== "fte") return null;
  return QS_DERIVED_FTE_AGGREGATES.find((aggregate) =>
    aggregate.semanticFamily === semantics.family) ?? null;
}

const semanticMismatchDetail = (fieldId: string) =>
  CROSS_ANALYSIS_SEMANTIC_CANDIDATE_AUDIT.find((candidate) =>
    !candidate.compatible && candidate.sourceIds.includes(fieldId))?.decision ?? null;

function impactCount(impacts: CrossAnalysisFieldDiscovery["impacts"]) {
  return Object.values(impacts).filter((impact) => impact.scoreImpactingMetrics.length > 0).length;
}

function finalize(
  entry: Omit<CrossAnalysisFieldDiscovery, "eligible" | "exclusionReason" | "exclusionDetail">,
  semanticMismatchDetail: string | null = null,
): CrossAnalysisFieldDiscovery {
  const scoreImpactCount = impactCount(entry.impacts);
  const hasIndicatorOnly = Object.values(entry.impacts).some((impact) =>
    impact.metrics.length > 0 && impact.scoreImpactingMetrics.length === 0);
  return {
    ...entry,
    eligible: scoreImpactCount >= 2,
    exclusionReason: scoreImpactCount >= 2
      ? null
      : semanticMismatchDetail
        ? "semantic-mismatch"
        : scoreImpactCount === 1
        ? "single-methodology"
        : hasIndicatorOnly
          ? "indicator-only"
          : "no-calculation-dependency",
    exclusionDetail: scoreImpactCount >= 2
      ? null
      : semanticMismatchDetail ?? (scoreImpactCount === 1
        ? "The field has a verified weighted-score dependency in only one methodology."
        : hasIndicatorOnly
          ? "The field changes a raw/diagnostic indicator but has no weighted-score dependency."
          : "No calculator dependency was found for this editable Data Entry control."),
  };
}

const theDiscovery = THE_INSTITUTION_DATA_FIELDS.map((field) => {
  const semantics = THE_SEMANTICS[field.id];
  const theMetrics = THE_SCORE_DEPENDENCIES[field.id] ?? [];
  const qsAggregate = getQsDerivedFteAggregateForTheField(field.id);
  const impacts: CrossAnalysisFieldDiscovery["impacts"] = {};
  if (THE_INSTITUTIONAL_TO_SCENARIO_MAPPING[field.id as keyof typeof THE_INSTITUTIONAL_TO_SCENARIO_MAPPING] && theMetrics.length) {
    impacts.the = {
      kind: "direct",
      metrics: theMetrics,
      scoreImpactingMetrics: theMetrics.filter((code) =>
        THE_INDICATOR_METADATA[code as keyof typeof THE_INDICATOR_METADATA].officialWeight > 0),
    };
  }
  if (qsAggregate) {
    impacts.qs = { kind: "derived", metrics: qsAggregate.metrics, scoreImpactingMetrics: qsAggregate.weighted };
  }
  return finalize({
    id: field.id,
    labels: field.label,
    sourceMethodology: "the",
    sourceSection: semantics.section,
    unit: field.inputType === "currency" ? field.unit.en : field.id.endsWith("Fte") ? "FTE" : "count",
    valueType: field.inputType,
    semanticType: semantics.semanticType,
    semanticFamily: semantics.family,
    semanticBasis: semantics.basis,
    editable: true,
    rawInput: true,
    required: field.required,
    yearScope: "methodology-specific",
    impacts,
  }, semanticMismatchDetail(field.id));
});

const qsDependencyByRow = new Map(QS_DATA_ENTRY_SCORE_DEPENDENCIES.map((item) => [item.row, item]));
const QS_INDICATOR_ONLY_DEPENDENCIES: Readonly<Record<string, readonly string[]>> = {
  totalStudentNationalities: ["ISD"],
  totalGraduateStudents2023: ["EO"],
  totalEmploymentRespondents: ["EO"],
  employedGraduates: ["EO"],
  unemployedGraduates: ["EO"],
  graduatesInFullTimeFurtherStudy: ["EO"],
  graduatesUnavailableForWork: ["EO"],
};
const qsDiscovery = qsInstitutionalCountRows.flatMap((row) => {
  const dependency = qsDependencyByRow.get(row.id as never);
  const components = row.inputKind === "fte-count" ? ["fullTime", "partTime"] as const : ["value"] as const;
  return components.map((component) => {
    const impacts: CrossAnalysisFieldDiscovery["impacts"] = {};
    if (dependency) impacts.qs = { kind: "derived", metrics: dependency.metrics, scoreImpactingMetrics: dependency.weighted };
    const indicatorOnlyMetrics = QS_INDICATOR_ONLY_DEPENDENCIES[row.id];
    if (indicatorOnlyMetrics) impacts.qs = { kind: "derived", metrics: indicatorOnlyMetrics, scoreImpactingMetrics: [] };
    return finalize({
      id: `qs.${row.id}.${component}`,
      labels: { tr: `${row.label.tr} - ${component}`, en: `${row.label.en} - ${component}` },
      sourceMethodology: "qs",
      sourceSection: dependency?.section ?? "studentsAndStaff",
      unit: "count",
      valueType: "integer",
      semanticType: "headcount",
      semanticFamily: dependency?.semanticFamily ?? row.id,
      semanticBasis: component === "value" ? "count" : `headcount-${component}`,
      editable: true,
      rawInput: true,
      required: row.required,
      yearScope: "methodology-specific",
      impacts,
    }, dependency
      ? "QS stores full-time and part-time headcount components; these components are not themselves the same raw field as THE total FTE."
      : null);
  });
});

export const CROSS_ANALYSIS_FIELD_IMPACT_MATRIX: readonly CrossAnalysisFieldDiscovery[] = [
  ...theDiscovery,
  ...qsDiscovery,
];

export const CROSS_ANALYSIS_FIELD_DISCOVERY_BY_ID = new Map(
  CROSS_ANALYSIS_FIELD_IMPACT_MATRIX.map((field) => [field.id, field]),
);

export function getCrossAnalysisExclusionReason(fieldId: string) {
  return CROSS_ANALYSIS_FIELD_DISCOVERY_BY_ID.get(fieldId)?.exclusionReason ?? null;
}

export function createCrossAnalysisImpactMatrixReport() {
  return CROSS_ANALYSIS_FIELD_IMPACT_MATRIX.map((field) => ({
    parameter: field.id,
    theDirect: field.impacts.the?.kind === "direct" || field.impacts.the?.kind === "direct-and-derived",
    theDerived: field.impacts.the?.kind === "derived" || field.impacts.the?.kind === "direct-and-derived",
    qsDirect: field.impacts.qs?.kind === "direct" || field.impacts.qs?.kind === "direct-and-derived",
    qsDerived: field.impacts.qs?.kind === "derived" || field.impacts.qs?.kind === "direct-and-derived",
    eligible: field.eligible,
    reason: field.exclusionReason,
    detail: field.exclusionDetail,
  }));
}

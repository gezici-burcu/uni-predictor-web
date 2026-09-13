import { INSTITUTION_DATA_YEARS } from "@/src/config/institution-data-years";
import { THE_ACTIVE_DATA_MODE } from "@/src/config/the.data-mode";
import { theInitialValues } from "@/src/config/the.metrics";
import { THE_MODEL_BASELINE_ASSUMPTIONS } from "@/src/config/the.public-simulation";
import { getQsAdditionalBaselineForYear } from "@/src/config/qs-additional-baselines";
import type { StoredInstitutionData } from "@/src/contexts/InstitutionDataContext";
import { getTheInstitutionDataForYear, type TheInstitutionData } from "@/src/data/data-entry/the-institution-data";
import { buildQsCalculationInputs } from "@/src/lib/qs/qs-calculation-inputs";
import {
  DEFAULT_QS_INSTITUTIONAL_DATA_YEAR,
  getEffectiveQsInstitutionYearData,
} from "@/src/lib/qs/qs-institution-year-data";
import { normalizeQsInstitutionalYearData } from "@/src/lib/qs/qs-institutional-normalization";
import {
  createTheInstitutionalMetricBaseline,
  THE_INSTITUTIONAL_TO_SCENARIO_MAPPING,
} from "@/src/lib/the/institutional-scenario";
import type { QsCalculationInputs } from "@/src/types/qs-raw";
import type { QsDataYear, QsInstitutionalInputByRowId } from "@/src/types/qsInstitutional";
import type {
  CrossAnalysisBaselineSnapshot,
  CrossAnalysisParameterId,
} from "./types";
import { CROSS_ANALYSIS_PARAMETER_REGISTRY } from "./registry";

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const cloneQsInputs = (inputs: QsCalculationInputs): QsCalculationInputs => ({
  ...inputs,
  institutional: {
    ...inputs.institutional,
    academicStaff: { ...inputs.institutional.academicStaff },
    internationalAcademicStaff: { ...inputs.institutional.internationalAcademicStaff },
    students: { ...inputs.institutional.students },
    internationalStudents: { ...inputs.institutional.internationalStudents },
    employment: { ...inputs.institutional.employment },
  },
  additional: { ...inputs.additional },
});

const descendingYears = [...INSTITUTION_DATA_YEARS].sort((left, right) => right - left);

function isUsableTheRecord(record: Partial<TheInstitutionData>) {
  return Object.keys(THE_INSTITUTIONAL_TO_SCENARIO_MAPPING)
    .every((field) => finite(record[field as keyof TheInstitutionData]));
}

export function resolveLatestUsableTheBaseline(stored: StoredInstitutionData) {
  for (const year of descendingYears) {
    const saved = stored.data.the[year];
    if (saved && Object.keys(saved).length > 0) {
      if (isUsableTheRecord(saved)) {
        return { year, values: { ...saved } as TheInstitutionData, source: "saved-institutional-record" };
      }
      continue;
    }
    const repositoryRecord = getTheInstitutionDataForYear(year);
    if (isUsableTheRecord(repositoryRecord)) {
      return { year, values: repositoryRecord, source: "repository-institutional-history" };
    }
  }
  return { year: null, values: null, source: "no-usable-institutional-record" };
}

const QS_SCORE_DEPENDENCY_ROWS = [
  "academicStaff",
  "internationalAcademicStaff",
  "undergraduateStudents",
  "undergraduateInternationalStudents",
  "graduatePostgraduateStudents",
  "graduatePostgraduateInternationalStudents",
] as const;

function isUsableQsRecord(record: Partial<QsInstitutionalInputByRowId>) {
  return QS_SCORE_DEPENDENCY_ROWS.every((row) => {
    const value = record[row];
    if (!value || !("fullTime" in value)) return false;
    const required = row === "academicStaff" || row === "undergraduateStudents" || row === "graduatePostgraduateStudents";
    return required
      ? finite(value.fullTime) && finite(value.partTime)
      : finite(value.fullTime) || finite(value.partTime);
  });
}

export function resolveLatestUsableQsBaseline(stored: StoredInstitutionData) {
  const activeYear = stored.activeYears.qs;
  const candidateYears = activeYear === null
    ? descendingYears
    : [activeYear, ...descendingYears.filter((year) => year !== activeYear)];
  for (const numericYear of candidateYears) {
    const year = String(numericYear) as QsDataYear;
    const saved = stored.data.qs[year];
    const effective = getEffectiveQsInstitutionYearData(year, saved);
    if (effective.source !== "empty" && isUsableQsRecord(effective.values)) {
      return {
        year: numericYear,
        values: effective.values,
        source: effective.source === "saved-user-record"
          ? "saved-institutional-record"
          : "repository-institutional-history",
      };
    }
  }
  return { year: null, values: normalizeQsInstitutionalYearData({}), source: "no-usable-institutional-record" };
}

export function createCrossAnalysisBaselineSnapshot(
  stored: StoredInstitutionData,
): CrossAnalysisBaselineSnapshot {
  const resolvedThe = resolveLatestUsableTheBaseline(stored);
  const resolvedQs = resolveLatestUsableQsBaseline(stored);
  const theDefaults = THE_ACTIVE_DATA_MODE === "public-simulation"
    ? THE_MODEL_BASELINE_ASSUMPTIONS
    : theInitialValues;
  const theValues: Record<string, unknown> = resolvedThe.values
    ? createTheInstitutionalMetricBaseline(theDefaults, resolvedThe.values)
    : { ...theDefaults };
  if (!resolvedThe.values) {
    for (const metricId of Object.values(THE_INSTITUTIONAL_TO_SCENARIO_MAPPING)) theValues[metricId] = null;
  }

  const qsYear = resolvedQs.year;
  const qsInputs = cloneQsInputs(buildQsCalculationInputs(
    resolvedQs.values,
    getQsAdditionalBaselineForYear(String(qsYear ?? DEFAULT_QS_INSTITUTIONAL_DATA_YEAR) as QsDataYear),
  ));
  const parameters = {} as Record<CrossAnalysisParameterId, number | null>;
  const methodologyParameterValues = {
    the: {} as Record<CrossAnalysisParameterId, number | null>,
    qs: {} as Record<CrossAnalysisParameterId, number | null>,
  };
  const parameterSources = {} as Record<CrossAnalysisParameterId, string | null>;
  const legacyQsFallback: Record<string, unknown> = {
    academicStaffFte: qsInputs.institutional.academicStaff.actualFte,
    internationalAcademicStaffFte: qsInputs.institutional.internationalAcademicStaff.actualFte,
    studentsFte: qsInputs.institutional.students.actualFte,
    internationalStudentsFte: qsInputs.institutional.internationalStudents.actualFte,
  };
  for (const definition of CROSS_ANALYSIS_PARAMETER_REGISTRY) {
    let candidate: unknown;
    let source: string | null = null;
    if (definition.id.startsWith("qs.")) {
      const [, row, component] = definition.id.split(".");
      candidate = (resolvedQs.values[row as keyof typeof resolvedQs.values] as unknown as Record<string, unknown> | undefined)?.[component];
      source = resolvedQs.source;
    } else {
      candidate = resolvedThe.values?.[definition.id as keyof TheInstitutionData];
      source = resolvedThe.source;
      if (!finite(candidate)) {
        candidate = legacyQsFallback[definition.id];
        source = resolvedQs.source;
      }
    }
    parameters[definition.id] = finite(candidate) ? candidate : null;
    parameterSources[definition.id] = finite(candidate) ? source : null;
    const theCandidate = resolvedThe.values?.[definition.id as keyof TheInstitutionData];
    methodologyParameterValues.the[definition.id] = definition.mappings.the && finite(theCandidate) ? theCandidate : null;
    let qsCandidate: unknown = legacyQsFallback[definition.id];
    if (definition.id.startsWith("qs.")) {
      const [, row, component] = definition.id.split(".");
      qsCandidate = (resolvedQs.values[row as keyof typeof resolvedQs.values] as unknown as Record<string, unknown> | undefined)?.[component];
    }
    methodologyParameterValues.qs[definition.id] = definition.mappings.qs && finite(qsCandidate) ? qsCandidate : null;
  }
  const methodologyBaselines: CrossAnalysisBaselineSnapshot["methodologyBaselines"] = {
    the: { year: resolvedThe.year, source: resolvedThe.source, usable: resolvedThe.year !== null, unavailableReason: null },
    qs: { year: resolvedQs.year, source: resolvedQs.source, usable: resolvedQs.year !== null, unavailableReason: null },
  };
  return {
    source: "InstitutionDataContext",
    institutionDataUpdatedAt: stored.updatedAt || null,
    years: {
      the: resolvedThe.year,
      qs: resolvedQs.year ?? Number(DEFAULT_QS_INSTITUTIONAL_DATA_YEAR),
    },
    methodologyBaselines,
    parameters,
    methodologyParameterValues,
    parameterSources,
    methodologyInputs: { the: theValues, qs: qsInputs },
    sourceSnapshot: stored,
  };
}

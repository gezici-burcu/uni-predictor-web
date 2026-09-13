import type { RecommendationMetricDefinition, RecommendationParameterInput } from "./types";
import {
  QS_SCENARIO_DISPLAY_SECTIONS,
} from "@/src/config/qs-scenario-parameter-display";
import { qsInstitutionalCountRows } from "@/src/types/qsInstitutional";
import { buildQsInstitutionalCalculationInputs } from "@/src/lib/qs/qs-calculation-inputs";
import { getQsEffectiveRecommendationValues } from "./qs-recommendation-impact";
import type { AppLanguage } from "@/src/i18n/types";
import { QS_ACTIVE_SCENARIO_GROUPS, QS_ACTIVE_SCENARIO_PARAMETER_IDS } from "@/src/config/qs-active-scenario-parameters";

export const QS_RECOMMENDATION_INSTITUTIONAL_PARAMETER_IDS =
  QS_ACTIVE_SCENARIO_PARAMETER_IDS.filter((parameterId) =>
    parameterId !== "totalStudentNationalities",
  );

const recommendationLabels: Partial<Record<string, Record<AppLanguage, string>>> = {
  totalGraduateStudents2023: { tr: "Toplam Mezun Sayısı", en: "Total Graduates" },
  totalEmploymentRespondents: { tr: "Toplam Anket Katılımcısı", en: "Total Survey Participants" },
  employedGraduates: { tr: "İstihdam Edilen Mezun Sayısı", en: "Employed Graduates" },
  unemployedGraduates: { tr: "İşsiz Mezun Sayısı", en: "Unemployed Graduates" },
  graduatesInFullTimeFurtherStudy: { tr: "İleri Eğitime Devam Eden Mezun Sayısı", en: "Graduates Continuing Further Study" },
  graduatesUnavailableForWork: { tr: "Çalışmaya Uygun Olmayan Mezun Sayısı", en: "Graduates Unavailable for Work" },
};

export const QS_DIRECT_SCORE_PARAMETER_IDS: ReadonlySet<string> = new Set([
  "qs.researchDiscovery.academicReputationScore",
  "qs.researchDiscovery.citationsPerFacultyScore",
  "qs.employability.employerReputationScore",
  "qs.employability.employmentOutcomesScore",
  "qs.globalEngagement.irnScore",
  "qs.sustainability.sustainabilityScore",
] as const);

export function isQsRecommendationInputDefinition(
  definition: RecommendationMetricDefinition,
) {
  return !QS_DIRECT_SCORE_PARAMETER_IDS.has(definition.metricId) &&
    definition.kind !== "direct-score" &&
    definition.parameterKind !== "externalInput";
}

export function filterQsRecommendationInputDefinitions(
  definitions: RecommendationMetricDefinition[],
) {
  return definitions.filter(isQsRecommendationInputDefinition);
}

const institutionalRowsById = new Map(
  qsInstitutionalCountRows.map((row) => [row.id, row]),
);

const QS_RAW_IMPROVEMENT_DIRECTIONS: Readonly<Record<string, "increase-only" | "decrease-only">> = {
  "academicStaff.total": "increase-only",
  "internationalAcademicStaff.total": "increase-only",
  "undergraduateStudents.total": "decrease-only",
  "undergraduateInternationalStudents.total": "increase-only",
  "graduatePostgraduateStudents.total": "decrease-only",
  "graduatePostgraduateInternationalStudents.total": "increase-only",
};

export function createQsRawRecommendationDefinitions(language: AppLanguage = "tr") {
  return QS_RECOMMENDATION_INSTITUTIONAL_PARAMETER_IDS.flatMap((metricId) => {
    const institutional = institutionalRowsById.get(metricId as never);
    const group = QS_ACTIVE_SCENARIO_GROUPS.find((item) => item.rowIds.includes(metricId as never));
    if (!institutional || !group) return [];
    const aggregate = institutional.inputKind === "fte-count";
    return [createRawDefinition({
      metricId: aggregate ? `${metricId}.total` : metricId,
      label: recommendationLabels[metricId]?.[language] ?? institutional.label[language],
      groupId: group.id,
      groupLabel: group.label[language],
      minimum: 0,
      maximum: null,
      step: 1,
      kind: aggregate ? "headcount" : "integer-count",
      aggregateParts: aggregate ? {
        fullTimeParameterId: `${metricId}.fullTime`,
        partTimeParameterId: `${metricId}.partTime`,
      } : undefined,
    })];
  });
}

function createRawDefinition({
  metricId,
  label,
  groupId,
  groupLabel,
  minimum,
  maximum,
  step,
  kind,
  aggregateParts,
}: {
  metricId: string;
  label: string;
  groupId: string;
  groupLabel: string;
  minimum: number;
  maximum: number | null;
  step: number;
  kind: RecommendationMetricDefinition["kind"];
  aggregateParts?: RecommendationMetricDefinition["aggregateParts"];
}): RecommendationMetricDefinition {
  const rawImprovementDirection = QS_RAW_IMPROVEMENT_DIRECTIONS[metricId];
  const scoreCalculable = false;
  return {
    metricId,
    engineField: metricId,
    parameterKind: "institutionalInput",
    isEditableInput: true,
    isRecommendationCandidate: scoreCalculable,
    selectableForScenarioInput: true,
    eligibleForNumericRecommendation: scoreCalculable,
    recommendationStatus: scoreCalculable ? "eligible" : "calibration-required",
    groupId,
    groupLabel,
    recommendationView: aggregateParts ? "aggregate-total" : undefined,
    aggregateParts,
    distributionStrategy: aggregateParts
      ? "preserve-baseline-ft-pt-share"
      : undefined,
    label,
    categoryId: groupId,
    kind,
    direction: rawImprovementDirection ?? "increase-only",
    effort: "medium",
    risk: "low",
    confidence: "low",
    controllability: "high",
    evidenceRequired: false,
    affectsTotalScore: scoreCalculable,
    defaultLocked: !scoreCalculable,
    technicalMinimum: minimum,
    technicalMaximum: maximum,
    step,
  };
}

export function createQsRawRecommendationBaselineValues({
  institutional,
  additional,
}: {
  institutional: Record<string, unknown>;
  additional: Record<string, number | null>;
}): Record<string, unknown> {
  const canonical = buildQsInstitutionalCalculationInputs(institutional);
  const partValues = Object.fromEntries(
    QS_SCENARIO_DISPLAY_SECTIONS
      .find((section) => section.id === "basicInstitutional")!
      .parameters.flatMap((parameter) => {
        const row = institutional[parameter.id] as {
          fullTime?: number | null;
          partTime?: number | null;
        } | undefined;
        return [
          [`${parameter.id}.fullTime`, row?.fullTime ?? null],
          [`${parameter.id}.partTime`, row?.partTime ?? null],
        ];
      }),
  );
  return {
    ...partValues,
    graduatesInFullTimeFurtherStudy:
      canonical.employment.furtherStudy ?? null,
    graduatesUnavailableForWork:
      canonical.employment.unavailableForWork ?? null,
    ...Object.fromEntries(createQsRawRecommendationDefinitions().map((definition) => {
    if (definition.aggregateParts) {
      const canonicalValue = {
        "academicStaff.total": canonical.academicStaff.headcount,
        "internationalAcademicStaff.total": canonical.internationalAcademicStaff.headcount,
        "undergraduateStudents.total": canonical.undergraduateStudents.headcount,
        "undergraduateInternationalStudents.total": canonical.internationalUndergraduateStudents.headcount,
        "graduatePostgraduateStudents.total": canonical.graduatePostgraduateStudents.headcount,
        "graduatePostgraduateInternationalStudents.total": canonical.internationalGraduatePostgraduateStudents.headcount,
      }[definition.engineField] ?? null;
      return [definition.engineField, canonicalValue];
    }
    const institutionalValue = institutional[definition.metricId] as { value?: number | null } | undefined;
    const canonicalEmploymentValue = canonical.employment[
      definition.metricId as keyof typeof canonical.employment
    ] ?? null;
    return [
      definition.engineField,
      canonicalEmploymentValue ?? institutionalValue?.value ?? additional[definition.metricId] ?? null,
    ];
  })),
  };
}

export type QsFtPtDistributionStatus = "preserved-baseline-share" | "defaulted-to-full-time";

export function distributeQsAggregateTotal({
  scenarioTotal,
  baselineFullTime,
  baselinePartTime,
}: {
  scenarioTotal: number;
  baselineFullTime: number;
  baselinePartTime: number;
}) {
  const baselineTotal = baselineFullTime + baselinePartTime;
  if (baselineTotal === 0) {
    return {
      fullTime: scenarioTotal,
      partTime: 0,
      distributionStatus: "defaulted-to-full-time" as const,
    };
  }
  const fullTime = Math.round(scenarioTotal * (baselineFullTime / baselineTotal));
  return {
    fullTime,
    partTime: scenarioTotal - fullTime,
    distributionStatus: "preserved-baseline-share" as const,
  };
}

export function applyQsRawRecommendationValuesToMetricValues(
  values: Record<string, unknown>,
): Record<string, unknown> {
  const effectiveValues = { ...values };
  for (const definition of createQsRawRecommendationDefinitions()) {
    if (!definition.aggregateParts) continue;
    const scenarioTotal = numericOrNull(values[definition.engineField]);
    if (scenarioTotal === null) continue;
    const baselineFullTime = numericOrZero(values[definition.aggregateParts.fullTimeParameterId]);
    const baselinePartTime = numericOrZero(values[definition.aggregateParts.partTimeParameterId]);
    const distributed = distributeQsAggregateTotal({
      scenarioTotal,
      baselineFullTime,
      baselinePartTime,
    });
    effectiveValues[definition.aggregateParts.fullTimeParameterId] = distributed.fullTime;
    effectiveValues[definition.aggregateParts.partTimeParameterId] = distributed.partTime;
  }
  const institutional = Object.fromEntries(
    QS_SCENARIO_DISPLAY_SECTIONS
      .find((section) => section.id === "basicInstitutional")!
      .parameters.map((parameter) => [
        parameter.id,
        {
          fullTime: numericOrNull(effectiveValues[`${parameter.id}.fullTime`]),
          partTime: numericOrNull(effectiveValues[`${parameter.id}.partTime`]),
        },
      ]),
  );
  const calculated = buildQsInstitutionalCalculationInputs(institutional);
  return {
    ...effectiveValues,
    "qs.common.academicStaffFte":
      calculated.academicStaff.actualFte ?? values["qs.common.academicStaffFte"],
    "qs.common.studentsFte":
      calculated.students.actualFte ?? values["qs.common.studentsFte"],
    "qs.common.internationalStudentsFte":
      calculated.internationalStudents.actualFte ?? values["qs.common.internationalStudentsFte"],
    "qs.globalEngagement.internationalFacultyFte":
      calculated.internationalAcademicStaff.actualFte ??
      values["qs.globalEngagement.internationalFacultyFte"],
  };
}

const numericOrNull = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const numericOrZero = (value: unknown) => numericOrNull(value) ?? 0;

export function sanitizeQsRecommendationSelections(
  inputs: Record<string, RecommendationParameterInput>,
  recommendationParameterIds: string[],
  definitions: RecommendationMetricDefinition[],
  baselineValues: Record<string, unknown> = {},
) {
  const normalizedInputs = { ...inputs };
  const normalizedRecommendationIds = [...recommendationParameterIds];
  for (const definition of definitions) {
    if (!definition.aggregateParts) continue;
    const { fullTimeParameterId, partTimeParameterId } = definition.aggregateParts;
    const fullTimeInput = inputs[fullTimeParameterId];
    const partTimeInput = inputs[partTimeParameterId];
    if (!normalizedInputs[definition.metricId] && (fullTimeInput?.selected || partTimeInput?.selected)) {
      normalizedInputs[definition.metricId] = normalizeLegacyAggregateInput({
        definition,
        fullTimeInput,
        partTimeInput,
        baselineValues,
      });
    }
    delete normalizedInputs[fullTimeParameterId];
    delete normalizedInputs[partTimeParameterId];
    if (
      recommendationParameterIds.includes(fullTimeParameterId) ||
      recommendationParameterIds.includes(partTimeParameterId)
    ) {
      normalizedRecommendationIds.push(definition.metricId);
    }
  }
  const allowed = new Set(
    filterQsRecommendationInputDefinitions(definitions).map((definition) => definition.metricId),
  );
  return {
    inputs: Object.fromEntries(
      Object.entries(normalizedInputs).filter(([parameterId]) => allowed.has(parameterId)),
    ),
    recommendationParameterIds: [...new Set(normalizedRecommendationIds.filter(
      (parameterId) => allowed.has(parameterId),
    ))],
  };
}

export function validateQsAggregateRecommendationInputs(
  inputs: RecommendationParameterInput[],
  definitions: RecommendationMetricDefinition[],
  baselineValues: Record<string, unknown>,
) {
  const errors: Record<string, string> = {};
  const inputById = new Map(inputs.map((input) => [input.parameterId, input]));
  const aggregateDefinitions = definitions.filter((definition) => definition.aggregateParts);
  for (const definition of aggregateDefinitions) {
    const input = inputById.get(definition.metricId);
    if (!input?.selected) continue;
    const entered = input.inputMode === "value" ? [input.value] : [input.min, input.max];
    if (entered.some((value) => value !== undefined && !Number.isInteger(value))) {
      errors[definition.metricId] = "Kişi sayısı tam sayı olmalıdır.";
    }
  }

  const effectiveTotal = (metricId: string) => {
    const input = inputById.get(metricId);
    if (input?.selected && input.inputMode === "value" && input.value !== undefined) {
      return input.value;
    }
    return numericOrNull(baselineValues[metricId]);
  };
  const relationships = [
    ["internationalAcademicStaff.total", "academicStaff.total", "Uluslararası akademik personel sayısı, toplam akademik personel sayısından büyük olamaz."],
    ["undergraduateInternationalStudents.total", "undergraduateStudents.total", "Uluslararası lisans öğrenci sayısı, toplam lisans öğrenci sayısından büyük olamaz."],
    ["graduatePostgraduateInternationalStudents.total", "graduatePostgraduateStudents.total", "Uluslararası lisansüstü öğrenci sayısı, toplam lisansüstü öğrenci sayısından büyük olamaz."],
  ] as const;
  for (const [internationalId, totalId, message] of relationships) {
    const internationalTotal = effectiveTotal(internationalId);
    const total = effectiveTotal(totalId);
    if (internationalTotal !== null && total !== null && internationalTotal > total) {
      errors[internationalId] = message;
    }
  }
  return errors;
}

export function validateQsEmploymentRecommendationInputs(
  inputs: RecommendationParameterInput[],
  baselineValues: Record<string, unknown>,
) {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];
  const effective = getQsEffectiveRecommendationValues(baselineValues, inputs);
  const ids = [
    "totalGraduateStudents2023",
    "totalEmploymentRespondents",
    "employedGraduates",
    "unemployedGraduates",
    "graduatesInFullTimeFurtherStudy",
    "graduatesUnavailableForWork",
  ] as const;
  const values = Object.fromEntries(ids.map((id) => [id, finiteOrNull(effective[id])])) as
    Record<typeof ids[number], number | null>;

  for (const id of ids) {
    const value = effective[id];
    if (value === null || value === undefined) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors[id] = "Geçerli bir sayı girilmelidir.";
    } else if (value < 0) {
      errors[id] = "Negatif değer girilemez.";
    } else if (!Number.isInteger(value)) {
      errors[id] = "Kişi sayısı tam sayı olmalıdır.";
    }
  }

  const respondents = values.totalEmploymentRespondents;
  const totalGraduates = values.totalGraduateStudents2023;
  if (respondents !== null && totalGraduates !== null && respondents > totalGraduates) {
    errors.totalEmploymentRespondents = "Mezun anketine katılan kişi sayısı, toplam mezun sayısından büyük olamaz.";
  }
  const respondentLimits = [
    ["employedGraduates", "İstihdam edilen mezun sayısı"],
    ["unemployedGraduates", "İşsiz mezun sayısı"],
    ["graduatesInFullTimeFurtherStudy", "Tam zamanlı ileri eğitime devam eden mezun sayısı"],
    ["graduatesUnavailableForWork", "Çalışmaya uygun olmayan mezun sayısı"],
  ] as const;
  if (respondents !== null) {
    for (const [id, label] of respondentLimits) {
      if (values[id] !== null && values[id]! > respondents) {
        errors[id] = `${label}, mezun anketine katılan kişi sayısından büyük olamaz.`;
      }
    }
    if (
      values.employedGraduates !== null &&
      values.unemployedGraduates !== null &&
      values.employedGraduates + values.unemployedGraduates > respondents
    ) {
      errors.unemployedGraduates = "İstihdam edilen ve işsiz mezunların toplamı, mezun anketine katılan kişi sayısından büyük olamaz.";
    }
  }
  if (
    respondents !== null && totalGraduates !== null && totalGraduates > 0 &&
    respondents / totalGraduates <= 0.2
  ) {
    warnings.push("Mezun anketi yanıt oranı %20 veya altındadır; veri güvenilirliği düşük olabilir.");
  }
  return { errors, warnings, effectiveValues: effective };
}

const finiteOrNull = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

function normalizeLegacyAggregateInput({
  definition,
  fullTimeInput,
  partTimeInput,
  baselineValues,
}: {
  definition: RecommendationMetricDefinition;
  fullTimeInput?: RecommendationParameterInput;
  partTimeInput?: RecommendationParameterInput;
  baselineValues: Record<string, unknown>;
}): RecommendationParameterInput {
  const parts = definition.aggregateParts!;
  const baselineFullTime = numericOrZero(baselineValues[parts.fullTimeParameterId]);
  const baselinePartTime = numericOrZero(baselineValues[parts.partTimeParameterId]);
  const effectiveValue = (input: RecommendationParameterInput | undefined, baseline: number) =>
    input?.selected && input.inputMode === "value" && input.value !== undefined
      ? input.value
      : baseline;
  const rangeInput = fullTimeInput?.inputMode === "range"
    ? { input: fullTimeInput, other: baselinePartTime }
    : partTimeInput?.inputMode === "range"
      ? { input: partTimeInput, other: baselineFullTime }
      : null;
  if (rangeInput) {
    return {
      parameterId: definition.metricId,
      selected: true,
      inputMode: "range",
      min: rangeInput.input.min === undefined ? undefined : rangeInput.input.min + rangeInput.other,
      max: rangeInput.input.max === undefined ? undefined : rangeInput.input.max + rangeInput.other,
    };
  }
  return {
    parameterId: definition.metricId,
    selected: true,
    inputMode: fullTimeInput?.inputMode === "default" && partTimeInput?.inputMode === "default"
      ? "default"
      : "value",
    value:
      effectiveValue(fullTimeInput, baselineFullTime) +
      effectiveValue(partTimeInput, baselinePartTime),
  };
}

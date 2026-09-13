import { QS_INDICATOR_ORDER } from "@/src/config/qs.calculation";
import { QS_FACULTY_AREA_CODES, type QsCalculationInputs, type QsRawIndicatorResult, type QsRawIndicatorResults, type QsRawIndicatorStatus } from "@/src/types/qs-raw";
import type { QsIndicatorCode } from "@/src/types/qs";
import { isFiniteNumber, safeDivideDetailed, safeLog } from "./rawMath";
import { calculateQsEmploymentAnalysis } from "@/src/lib/qs/qs-employment-analysis";

const result = (
  code: QsIndicatorCode,
  fields: Omit<QsRawIndicatorResult, "code">,
): QsRawIndicatorResult => ({ code, ...fields });

const missingAdditional = (
  inputs: QsCalculationInputs,
  keys: string[],
) => keys.filter((key) => inputs.additional[key as keyof typeof inputs.additional] === null);

const externalMissing = (
  code: QsIndicatorCode,
  inputsUsed: string[],
  missingInputs: string[],
  sourceType: QsRawIndicatorResult["sourceType"] = "external",
  components?: Record<string, number | null>,
) => result(code, {
  rawValue: null,
  status: "external-data-required",
  inputsUsed,
  missingInputs,
  warnings: [],
  sourceType,
  calculationMetadata: { components },
});

function ratioResult(
  code: "FSR" | "IFR" | "ISR",
  numerator: number | null,
  denominator: number | null,
  numeratorKey: string,
  denominatorKey: string,
  scope: string,
): QsRawIndicatorResult {
  const division = safeDivideDetailed(numerator, denominator);
  const cap = code === "FSR" ? .3 : .5;
  const exceedsTotal = numerator !== null && denominator !== null && denominator > 0 &&
    numerator > denominator && code !== "FSR";
  const warnings = [
    ...(exceedsTotal ? [`${numeratorKey} exceeds ${denominatorKey}`] : []),
    ...(division.status === "zero-denominator"
      ? [`${code} ham oranı hesaplanamadı: ${denominatorKey} sıfır.`]
      : []),
  ];
  return result(code, {
    rawValue: exceedsTotal ? null : division.value,
    status: exceedsTotal ? "invalid-input" : division.status,
    inputsUsed: [numeratorKey, denominatorKey],
    missingInputs: [
      ...(numerator === null ? [numeratorKey] : []),
      ...(denominator === null ? [denominatorKey] : []),
    ],
    warnings,
    sourceType: "institutional",
    calculationMetadata: {
      numerator,
      denominator,
      components: { [numeratorKey]: numerator, [denominatorKey]: denominator },
      scope,
      derivedValueKind: "actualFte",
      uncappedRawValue: division.value,
      cappedRawValue: division.value === null ? null : Math.min(division.value, cap),
      cap,
    },
  });
}

function calculateAr(inputs: QsCalculationInputs): QsRawIndicatorResult {
  const keys = QS_FACULTY_AREA_CODES.flatMap((area) => [
    `academicReputation.${area}.domesticWeightedNominations`,
    `academicReputation.${area}.internationalWeightedNominations`,
  ]);
  const missing = missingAdditional(inputs, keys);
  const components = Object.fromEntries(keys.map((key) => [
    key,
    inputs.additional[key as keyof typeof inputs.additional],
  ]));
  if (missing.length) return externalMissing("AR", keys, missing, "external", components);
  const facultyComposites = QS_FACULTY_AREA_CODES.map((area) =>
    .15 * inputs.additional[`academicReputation.${area}.domesticWeightedNominations`]! +
    .85 * inputs.additional[`academicReputation.${area}.internationalWeightedNominations`]!);
  return result("AR", {
    rawValue: facultyComposites.reduce((sum, value) => sum + value, 0) / facultyComposites.length,
    status: "normalization-required",
    inputsUsed: keys,
    missingInputs: [],
    warnings: ["Domestic and international survey counts require separate QS normalization before the 15:85 combination; no /S division is applied."],
    sourceType: "external",
    calculationMetadata: { components },
  });
}

function calculateCpf(inputs: QsCalculationInputs): QsRawIndicatorResult {
  const keys = QS_FACULTY_AREA_CODES.map((area) =>
    `citationsPerFaculty.${area}.fieldNormalizedCitations`);
  const missing = missingAdditional(inputs, keys);
  const faculty = inputs.institutional.academicStaff.actualFte;
  const components = Object.fromEntries(keys.map((key) => [
    key,
    inputs.additional[key as keyof typeof inputs.additional],
  ]));
  if (missing.length) return externalMissing("CPF", [...keys, "institutional.academicStaff.actualFte"], missing, "institutional-and-external", components);
  const citations = Object.values(components).reduce<number>((sum, value) => sum + value!, 0);
  const division = safeDivideDetailed(citations, faculty);
  return result("CPF", {
    rawValue: division.value,
    status: division.status === "calculated" ? "normalization-required" : division.status,
    inputsUsed: [...keys, "institutional.academicStaff.actualFte"],
    missingInputs: faculty === null ? ["institutional.academicStaff.actualFte"] : [],
    warnings: ["Faculty-area normalization must be performed upstream; plain total citations are not accepted."],
    sourceType: "institutional-and-external",
    calculationMetadata: {
      numerator: citations,
      denominator: faculty,
      components: { ...components, totalFieldNormalizedCitations: citations },
      derivedValueKind: "actualFte",
    },
  });
}

function calculateEr(inputs: QsCalculationInputs): QsRawIndicatorResult {
  const keys = [
    "employerReputation.domesticWeightedNominations",
    "employerReputation.internationalWeightedNominations",
  ];
  const missing = missingAdditional(inputs, keys);
  const components = Object.fromEntries(keys.map((key) => [
    key,
    inputs.additional[key as keyof typeof inputs.additional],
  ]));
  if (missing.length) return externalMissing("ER", keys, missing, "external", components);
  return result("ER", {
    rawValue:
      .5 * inputs.additional["employerReputation.domesticWeightedNominations"]! +
      .5 * inputs.additional["employerReputation.internationalWeightedNominations"]!,
    status: "normalization-required",
    inputsUsed: keys,
    missingInputs: [],
    warnings: ["Domestic and international employer counts require separate QS normalization before their 50:50 combination."],
    sourceType: "external",
    calculationMetadata: { components },
  });
}

function calculateEo(inputs: QsCalculationInputs): QsRawIndicatorResult {
  const alumniKey = "employmentOutcomes.alumniImpactIndex";
  const employmentKey = "employmentOutcomes.graduateEmploymentIndex";
  const keys = [alumniKey, employmentKey];
  const missing = missingAdditional(inputs, keys);
  const { employed, unemployed, respondents, totalGraduates, furtherStudy, unavailableForWork } = inputs.institutional.employment;
  const analysis = calculateQsEmploymentAnalysis({ totalGraduates, surveyParticipants: respondents, employedGraduates: employed, unemployedGraduates: unemployed, furtherStudyGraduates: furtherStudy, unavailableGraduates: unavailableForWork });
  const components = {
    alumniImpactIndex: inputs.additional[alumniKey],
    graduateEmploymentIndex: inputs.additional[employmentKey],
    graduateEmploymentRate: analysis.graduateEmploymentRate,
    surveyResponseRate: analysis.surveyResponseRate,
    employedGraduates: employed,
    unemployedGraduates: unemployed,
    respondents,
    totalGraduates,
    furtherStudy,
    unavailableForWork,
    classifiedRespondents: analysis.classifiedRespondents,
    unclassifiedRespondents: analysis.unclassifiedRespondents,
  };
  if (missing.length) return externalMissing("EO", [
    ...keys,
    "institutional.employment.employed",
    "institutional.employment.unemployed",
  ], missing, "institutional-and-external", components);
  const alumni = inputs.additional[alumniKey];
  const log = safeLog(inputs.additional[employmentKey]);
  if (log.value === null || alumni === null || !isFiniteNumber(alumni) || alumni < 0) {
    const status: QsRawIndicatorStatus = log.status === "calculated" ? "invalid-input" : log.status;
    return result("EO", {
      rawValue: null, status, inputsUsed: keys, missingInputs: [], warnings: [],
      sourceType: "institutional-and-external", calculationMetadata: { components },
    });
  }
  return result("EO", {
    rawValue: alumni * log.value,
    status: "calculated",
    inputsUsed: [...keys, "institutional.employment.employed", "institutional.employment.unemployed"],
    missingInputs: [],
    warnings: [
      ...(respondents !== null && employed !== null && unemployed !== null &&
      employed + unemployed > respondents
        ? ["Employed plus unemployed graduates exceed total respondents."]
        : []),
      ...(analysis.surveyResponseRate !== null && analysis.surveyResponseRate <= 20
        ? ["Graduate survey response rate is 20% or lower."]
        : []),
      ...(respondents !== null && totalGraduates !== null && respondents > totalGraduates
        ? ["Survey participants exceed total graduates."]
        : []),
    ],
    sourceType: "institutional-and-external",
    calculationMetadata: { components: { ...components, logGraduateEmploymentIndex: log.value } },
  });
}

function calculateIrn(inputs: QsCalculationInputs): QsRawIndicatorResult {
  const keys = QS_FACULTY_AREA_CODES.flatMap((area) => [
    `internationalResearchNetwork.${area}.distinctCountries`,
    `internationalResearchNetwork.${area}.distinctInternationalPartners`,
  ]);
  const missing = missingAdditional(inputs, keys);
  if (missing.length) return externalMissing("IRN", keys, missing);
  const components: Record<string, number | null> = {};
  let invalidStatus: QsRawIndicatorStatus | null = null;
  for (const area of QS_FACULTY_AREA_CODES) {
    const countryKey = `internationalResearchNetwork.${area}.distinctCountries` as const;
    const partnerKey = `internationalResearchNetwork.${area}.distinctInternationalPartners` as const;
    const countries = inputs.additional[countryKey];
    const partners = inputs.additional[partnerKey];
    const log = safeLog(partners);
    const ratio = safeDivideDetailed(countries, log.value);
    components[`${area}.distinctCountries`] = countries;
    components[`${area}.distinctInternationalPartners`] = partners;
    components[`${area}.rawRatio`] = ratio.value;
    if (ratio.value === null) invalidStatus = ratio.status;
  }
  if (invalidStatus) return result("IRN", {
    rawValue: null, status: invalidStatus, inputsUsed: keys, missingInputs: [], warnings: [],
    sourceType: "external", calculationMetadata: { components },
  });
  const ratios = QS_FACULTY_AREA_CODES.map((area) => components[`${area}.rawRatio`]!);
  return result("IRN", {
    rawValue: ratios.reduce((sum, value) => sum + value, 0) / ratios.length,
    status: "normalization-required",
    inputsUsed: keys,
    missingInputs: [],
    warnings: ["Faculty ratios still require QS min-max normalization, mean aggregation, z-score and rescaling."],
    sourceType: "external",
    calculationMetadata: { components },
  });
}

function calculateSus(inputs: QsCalculationInputs): QsRawIndicatorResult {
  const valueKey = "sustainability.qsIndicatorValue";
  const yearKey = "sustainability.sourceYear";
  const missing = missingAdditional(inputs, [valueKey, yearKey]);
  if (missing.length) return externalMissing("SUS", [valueKey, yearKey], missing);
  const value = inputs.additional[valueKey];
  if (!isFiniteNumber(value) || value < 0 || value > 100) return result("SUS", {
    rawValue: null, status: "invalid-input", inputsUsed: [valueKey, yearKey], missingInputs: [],
    warnings: [], sourceType: "external", calculationMetadata: { components: { value, sourceYear: inputs.additional[yearKey] } },
  });
  return result("SUS", {
    rawValue: value, status: "calculated", inputsUsed: [valueKey, yearKey], missingInputs: [],
    warnings: ["External QS Sustainability indicator value; not UI GreenMetric and not a weighted WUR contribution."],
    sourceType: "external", calculationMetadata: { components: { value, sourceYear: inputs.additional[yearKey] } },
  });
}

function calculateIsd(inputs: QsCalculationInputs, isr: QsRawIndicatorResult): QsRawIndicatorResult {
  const nationality = inputs.institutional.studentNationalityCount;
  const keys = [
    "institutional.internationalStudents.actualFte",
    "institutional.students.actualFte",
    "institutional.studentNationalityCount",
  ];
  if (nationality === null) return result("ISD", {
    rawValue: null, status: "missing-input", inputsUsed: keys,
    missingInputs: ["institutional.studentNationalityCount"], warnings: [],
    sourceType: "institutional", calculationMetadata: { components: { internationalStudentRatio: isr.rawValue, studentNationalityCount: null } },
  });
  if (!isFiniteNumber(nationality) || nationality < 0) return result("ISD", {
    rawValue: null, status: "invalid-input", inputsUsed: keys, missingInputs: [], warnings: [],
    sourceType: "institutional", calculationMetadata: { components: { internationalStudentRatio: isr.rawValue, studentNationalityCount: nationality } },
  });
  if (isr.rawValue === null) return result("ISD", {
    rawValue: null, status: isr.status, inputsUsed: keys, missingInputs: isr.missingInputs, warnings: [],
    sourceType: "institutional", calculationMetadata: { components: { internationalStudentRatio: null, studentNationalityCount: nationality } },
  });
  const nationalityPercentage = Math.min(nationality, 80) / 80;
  return result("ISD", {
    rawValue: isr.rawValue * nationalityPercentage,
    status: "normalization-required",
    inputsUsed: keys,
    missingInputs: [],
    warnings: ["This is adjusted ISR only; QS combines z-scored ISR and adjusted ISR in a 3:1 ratio."],
    sourceType: "institutional",
    calculationMetadata: { components: { internationalStudentRatio: isr.rawValue, studentNationalityCount: nationality, studentNationalityPercentage: nationalityPercentage } },
  });
}

export function calculateQsOfficialRawIndicators(
  inputs: QsCalculationInputs,
): QsRawIndicatorResults {
  const fsr = ratioResult("FSR", inputs.institutional.academicStaff.actualFte, inputs.institutional.students.actualFte, "institutional.academicStaff.actualFte", "institutional.students.actualFte", "Undergraduate + postgraduate on-campus students; distance and exchange rows excluded.");
  const ifr = ratioResult("IFR", inputs.institutional.internationalAcademicStaff.actualFte, inputs.institutional.academicStaff.actualFte, "institutional.internationalAcademicStaff.actualFte", "institutional.academicStaff.actualFte", "QS actual FTE faculty scope.");
  const isr = ratioResult("ISR", inputs.institutional.internationalStudents.actualFte, inputs.institutional.students.actualFte, "institutional.internationalStudents.actualFte", "institutional.students.actualFte", "Undergraduate + postgraduate on-campus students; distance and exchange rows excluded.");
  const results: QsRawIndicatorResults = {
    AR: calculateAr(inputs),
    CPF: calculateCpf(inputs),
    ER: calculateEr(inputs),
    EO: calculateEo(inputs),
    IFR: ifr,
    IRN: calculateIrn(inputs),
    ISD: calculateIsd(inputs, isr),
    ISR: isr,
    FSR: fsr,
    SUS: calculateSus(inputs),
  };
  return Object.fromEntries(QS_INDICATOR_ORDER.map((code) => [code, results[code]])) as QsRawIndicatorResults;
}

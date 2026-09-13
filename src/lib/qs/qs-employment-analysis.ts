export type QsEmploymentAnalysisInputs = {
  totalGraduates: number | null;
  surveyParticipants: number | null;
  employedGraduates: number | null;
  unemployedGraduates: number | null;
  furtherStudyGraduates: number | null;
  unavailableGraduates: number | null;
};

export type QsEmploymentDataSufficiency = "sufficient" | "low-response" | "unavailable";

const percentage = (numerator: number | null, denominator: number | null) =>
  numerator !== null && denominator !== null && denominator > 0
    ? numerator / denominator * 100
    : null;

export function calculateQsEmploymentAnalysis(inputs: QsEmploymentAnalysisInputs) {
  const employmentDenominator = inputs.employedGraduates !== null && inputs.unemployedGraduates !== null
    ? inputs.employedGraduates + inputs.unemployedGraduates
    : null;
  const categories = [inputs.employedGraduates, inputs.unemployedGraduates, inputs.furtherStudyGraduates, inputs.unavailableGraduates];
  const classifiedRespondents = categories.every((value) => value !== null)
    ? categories.reduce<number>((sum, value) => sum + value!, 0)
    : null;
  const unclassifiedRespondents = inputs.surveyParticipants !== null && classifiedRespondents !== null
    ? inputs.surveyParticipants - classifiedRespondents
    : null;
  const surveyResponseRate = percentage(inputs.surveyParticipants, inputs.totalGraduates);
  const graduateEmploymentRate = percentage(inputs.employedGraduates, employmentDenominator);
  const dataSufficiency: QsEmploymentDataSufficiency = surveyResponseRate === null
    ? "unavailable"
    : surveyResponseRate > 20 ? "sufficient" : "low-response";
  return {
    ...inputs,
    employmentDenominator,
    surveyResponseRate,
    graduateEmploymentRate,
    dataSufficiency,
    classifiedRespondents,
    unclassifiedRespondents,
  };
}

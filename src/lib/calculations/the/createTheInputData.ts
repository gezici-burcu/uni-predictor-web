import type { TheCalculationInput } from "@/src/types/the-calculation";

export const toNullableNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const createTheInputData = (values: Record<string, unknown>): TheCalculationInput => ({
  teachingReputationScore: toNullableNumber(values["the.teaching.reputationScore"]),
  studentsFte: toNullableNumber(values["the.common.studentsFte"]),
  academicStaffFte: toNullableNumber(values["the.common.academicStaffFte"]),
  bachelorGraduates: toNullableNumber(values["the.teaching.bachelorGraduates"]),
  doctorateGraduates: toNullableNumber(values["the.teaching.doctorateGraduates"]),
  institutionalIncomePpp: toNullableNumber(values["the.teaching.institutionalIncomePpp"]),
  researchReputationScore: toNullableNumber(values["the.researchEnvironment.reputationScore"]),
  researchIncomePpp: toNullableNumber(values["the.researchEnvironment.researchIncomePpp"]),
  academicResearchStaffFte: toNullableNumber(values["the.researchEnvironment.academicResearchStaffFte"]),
  publicationCount: toNullableNumber(values["the.researchEnvironment.publicationCount"]),
  fieldWeightedResearchIncome: toNullableNumber(values["the.researchEnvironment.fieldWeightedResearchIncome"]),
  fieldWeightedPublications: toNullableNumber(values["the.researchEnvironment.fieldWeightedPublications"]),
  citationImpactScore: toNullableNumber(values["the.researchQuality.citationImpactScore"]),
  researchStrengthScore: toNullableNumber(values["the.researchQuality.researchStrengthScore"]),
  researchExcellenceScore: toNullableNumber(values["the.researchQuality.researchExcellenceScore"]),
  researchInfluenceScore: toNullableNumber(values["the.researchQuality.researchInfluenceScore"]),
  rawCitationCount: toNullableNumber(values["the.researchQuality.rawCitationCount"]),
  fwci: toNullableNumber(values["the.researchQuality.fwci"]),
  highImpactPublicationRatio: toNullableNumber(values["the.researchQuality.highImpactPublicationRatio"]),
  internationalStudentsFte: toNullableNumber(values["the.internationalOutlook.internationalStudentsFte"]),
  internationalAcademicStaffFte: toNullableNumber(values["the.internationalOutlook.internationalAcademicStaffFte"]),
  internationalCoauthoredPublications: toNullableNumber(values["the.internationalOutlook.internationalCoauthoredPublications"]),
  outboundStudents: toNullableNumber(values["the.internationalOutlook.outboundStudents"]),
  industryResearchIncomePpp: toNullableNumber(values["the.industry.industryResearchIncomePpp"]),
  patentScore: toNullableNumber(values["the.industry.patentScore"]),
  citingPatentCount: toNullableNumber(values["the.industry.citingPatentCount"]),
});

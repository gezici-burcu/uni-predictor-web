import type {
  TheAdditionalInputId,
  TheInstitutionalInputId,
  TheRawIndicatorId,
  TheRawInputDefinition,
  TheRawInputUnit,
  TheInputSource,
} from "@/src/types/the-raw-calculation";

type DefinitionOptions = {
  id: TheInstitutionalInputId | TheAdditionalInputId;
  tr: string;
  en: string;
  unit: TheRawInputUnit;
  source: TheInputSource;
  metrics: readonly TheRawIndicatorId[];
  editable?: boolean;
  description?: { tr: string; en: string };
};

const define = ({ id, tr, en, unit, source, metrics, editable = false, description }: DefinitionOptions): TheRawInputDefinition => ({
  id,
  label: { tr, en },
  unit,
  source,
  requiredForMetrics: metrics,
  editableInScenario: editable,
  description: description ?? {
    tr: `${tr}, THE 2026 ham gösterge hesabında kullanılan benzersiz girdidir.`,
    en: `${en} is a unique input used by the THE 2026 raw indicator calculation.`,
  },
});

export const THE_INSTITUTIONAL_INPUT_DEFINITIONS = [
  define({ id: "academicStaffFte", tr: "Akademik personel FTE", en: "Academic staff FTE", unit: "fte", source: "institutional", metrics: ["studentStaffRatio", "institutionalIncome", "internationalStaff", "industryIncome"], editable: true }),
  define({ id: "researchStaffFte", tr: "Araştırma personeli FTE", en: "Research staff FTE", unit: "fte", source: "institutional", metrics: [], editable: true }),
  define({ id: "studentsFte", tr: "Toplam öğrenci FTE", en: "Total students FTE", unit: "fte", source: "institutional", metrics: ["studentStaffRatio", "internationalStudents", "studyAbroad"], editable: true }),
  define({ id: "internationalAcademicStaffFte", tr: "Uluslararası akademik personel FTE", en: "International academic staff FTE", unit: "fte", source: "institutional", metrics: ["internationalStaff"], editable: true }),
  define({ id: "internationalStudentsFte", tr: "Uluslararası öğrenci FTE", en: "International students FTE", unit: "fte", source: "institutional", metrics: ["internationalStudents"], editable: true }),
  define({ id: "undergraduateDegreesAwarded", tr: "Verilen lisans dereceleri", en: "Undergraduate degrees awarded", unit: "count", source: "institutional", metrics: ["doctorateBachelorRatio"], editable: true }),
  define({ id: "doctoratesAwarded", tr: "Verilen doktora dereceleri", en: "Doctorates awarded", unit: "count", source: "institutional", metrics: ["doctorateBachelorRatio"], editable: true }),
  define({ id: "institutionalIncome", tr: "Kurumsal gelir", en: "Institutional income", unit: "currency", source: "institutional", metrics: [], description: { tr: "Kaynak para birimindeki kurumsal gelirdir; PPP-düzeltilmiş gelir yerine kullanılamaz.", en: "Institutional income in the reported currency; it cannot substitute for PPP-adjusted income." } }),
  define({ id: "researchIncome", tr: "Araştırma geliri", en: "Research income", unit: "currency", source: "institutional", metrics: [], description: { tr: "Kaynak para birimindeki araştırma geliridir; subject-weighted PPP girdisi yerine kullanılamaz.", en: "Research income in the reported currency; it cannot substitute for the subject-weighted PPP input." } }),
  define({ id: "industryCommerceResearchIncome", tr: "Sanayi ve ticaret araştırma geliri", en: "Industry and commerce research income", unit: "currency", source: "institutional", metrics: [], description: { tr: "Kaynak para birimindeki sanayi geliridir; PPP-düzeltilmiş gelir yerine kullanılamaz.", en: "Industry income in the reported currency; it cannot substitute for PPP-adjusted income." } }),
] as const satisfies readonly TheRawInputDefinition[];

export const THE_ADDITIONAL_INPUT_DEFINITIONS = [
  define({ id: "teachingReputationVotes", tr: "Öğretim itibarı oyları", en: "Teaching reputation votes", unit: "votes", source: "reputation", metrics: ["teachingReputation"] }),
  define({ id: "researchReputationVotes", tr: "Araştırma itibarı oyları", en: "Research reputation votes", unit: "votes", source: "reputation", metrics: ["researchReputation"] }),
  define({ id: "institutionalIncomePppAdjusted", tr: "PPP-düzeltilmiş kurumsal gelir", en: "PPP-adjusted institutional income", unit: "currency-ppp", source: "financial-preprocessed", metrics: ["institutionalIncome"] }),
  define({ id: "subjectWeightedResearchIncomePppAdjusted", tr: "Alan ağırlıklı PPP araştırma geliri", en: "Subject-weighted PPP-adjusted research income", unit: "currency-ppp", source: "financial-preprocessed", metrics: ["researchIncome"] }),
  define({ id: "industryIncomePppAdjusted", tr: "PPP-düzeltilmiş sanayi geliri", en: "PPP-adjusted industry income", unit: "currency-ppp", source: "financial-preprocessed", metrics: ["industryIncome"] }),
  define({ id: "subjectWeightedDoctorates", tr: "Alan ağırlıklı doktoralar", en: "Subject-weighted doctorates", unit: "count", source: "subject-weighted", metrics: ["doctorateStaffRatio"] }),
  define({ id: "subjectWeightedAcademicStaffForDoctorates", tr: "Doktora metriği alan ağırlıklı akademik personeli", en: "Subject-weighted academic staff for doctorates", unit: "fte", source: "subject-weighted", metrics: ["doctorateStaffRatio"] }),
  define({ id: "subjectWeightedAcademicStaffForResearchIncome", tr: "Araştırma geliri alan ağırlıklı akademik personeli", en: "Subject-weighted academic staff for research income", unit: "fte", source: "subject-weighted", metrics: ["researchIncome"] }),
  define({ id: "subjectWeightedPublicationCount", tr: "Alan ağırlıklı yayın sayısı", en: "Subject-weighted publication count", unit: "count", source: "subject-weighted", metrics: ["researchProductivity"] }),
  define({ id: "subjectWeightedAcademicStaffForProductivity", tr: "Üretkenlik alan ağırlıklı akademik personeli", en: "Subject-weighted academic staff for productivity", unit: "fte", source: "subject-weighted", metrics: ["researchProductivity"] }),
  define({ id: "subjectWeightedResearchStaffForProductivity", tr: "Üretkenlik alan ağırlıklı araştırma personeli", en: "Subject-weighted research staff for productivity", unit: "fte", source: "subject-weighted", metrics: ["researchProductivity"] }),
  define({ id: "citationImpactCountryAdjustedRaw", tr: "Ülke düzeltmeli ham atıf etkisi", en: "Country-adjusted raw citation impact", unit: "raw-index", source: "bibliometric", metrics: ["citationImpact"] }),
  define({ id: "citationImpactNonCountryAdjustedRaw", tr: "Ülke düzeltmesiz ham atıf etkisi", en: "Non-country-adjusted raw citation impact", unit: "raw-index", source: "bibliometric", metrics: ["citationImpact"] }),
  define({ id: "researchStrengthFwci75thPercentile", tr: "FWCI 75. yüzdelik", en: "FWCI 75th percentile", unit: "fwci", source: "bibliometric", metrics: ["researchStrength"] }),
  define({ id: "researchExcellenceAdjustedRaw", tr: "Düzeltilmiş ham araştırma mükemmelliği", en: "Adjusted raw research excellence", unit: "raw-index", source: "bibliometric", metrics: ["researchExcellence"] }),
  define({ id: "researchInfluenceAdjustedRaw", tr: "Düzeltilmiş ham araştırma etkisi", en: "Adjusted raw research influence", unit: "raw-index", source: "bibliometric", metrics: ["researchInfluence"] }),
  define({ id: "subjectWeightedInternationalCoauthoredPublications", tr: "Alan ağırlıklı uluslararası ortak yazarlı yayınlar", en: "Subject-weighted international co-authored publications", unit: "count", source: "subject-weighted", metrics: ["internationalCoauthorship"] }),
  define({ id: "subjectWeightedTotalPublications", tr: "Alan ağırlıklı toplam yayınlar", en: "Subject-weighted total publications", unit: "count", source: "subject-weighted", metrics: ["internationalCoauthorship"] }),
  define({ id: "outboundExchangeStudentsHeadcount", tr: "Giden değişim öğrencisi", en: "Outbound exchange students", unit: "count", source: "additional", metrics: ["studyAbroad"] }),
  define({ id: "subjectWeightedPatentCitationCount", tr: "Alan ağırlıklı patent atıf sayısı", en: "Subject-weighted patent citation count", unit: "count", source: "bibliometric", metrics: ["patents"] }),
  define({ id: "subjectWeightedAcademicStaffForPatents", tr: "Patent metriği alan ağırlıklı akademik personeli", en: "Subject-weighted academic staff for patents", unit: "fte", source: "subject-weighted", metrics: ["patents"] }),
  define({ id: "subjectWeightedResearchStaffForPatents", tr: "Patent metriği alan ağırlıklı araştırma personeli", en: "Subject-weighted research staff for patents", unit: "fte", source: "subject-weighted", metrics: ["patents"] }),
] as const satisfies readonly TheRawInputDefinition[];

export const THE_RAW_INPUT_DEFINITIONS = [
  ...THE_INSTITUTIONAL_INPUT_DEFINITIONS,
  ...THE_ADDITIONAL_INPUT_DEFINITIONS,
] as const;

import type { SafeDivisionResult, TheCalculationInput, TheCategoryCode, TheIndicatorCode, TheIndicatorSource, TheRawIndicatorResult } from "@/src/types/the-calculation";

export type TheIndicatorBeneficialDirection = "higherIsBetter" | "lowerIsBetter";
export const THE_INDICATOR_METADATA: Record<TheIndicatorCode, {
  officialWeight: number;
  rawValueMeaning: string;
  beneficialDirection: TheIndicatorBeneficialDirection;
}> = {
  TREP: { officialWeight: 15, rawValueMeaning: "Öğretim itibar puanı", beneficialDirection: "higherIsBetter" },
  SSR: { officialWeight: 4.5, rawValueMeaning: "Akademik personel FTE / öğrenci FTE", beneficialDirection: "higherIsBetter" },
  DBR: { officialWeight: 2, rawValueMeaning: "Doktora mezunu / lisans mezunu", beneficialDirection: "higherIsBetter" },
  DSR: { officialWeight: 5.5, rawValueMeaning: "Doktora mezunu / akademik personel FTE", beneficialDirection: "higherIsBetter" },
  II: { officialWeight: 2.5, rawValueMeaning: "Kurumsal gelir / akademik personel FTE", beneficialDirection: "higherIsBetter" },
  RREP: { officialWeight: 18, rawValueMeaning: "Araştırma itibarı puanı", beneficialDirection: "higherIsBetter" },
  RI: { officialWeight: 5.5, rawValueMeaning: "Alan ağırlıklı araştırma geliri / araştırma personeli FTE", beneficialDirection: "higherIsBetter" },
  RP: { officialWeight: 5.5, rawValueMeaning: "Alan ağırlıklı yayın / araştırma personeli FTE", beneficialDirection: "higherIsBetter" },
  CI: { officialWeight: 15, rawValueMeaning: "Atıf etkisi puanı", beneficialDirection: "higherIsBetter" },
  RS: { officialWeight: 5, rawValueMeaning: "Araştırma gücü puanı", beneficialDirection: "higherIsBetter" },
  RE: { officialWeight: 5, rawValueMeaning: "Araştırma mükemmelliği puanı", beneficialDirection: "higherIsBetter" },
  RINF: { officialWeight: 5, rawValueMeaning: "Araştırma etkisi puanı", beneficialDirection: "higherIsBetter" },
  IS: { officialWeight: 2.5, rawValueMeaning: "Uluslararası öğrenci FTE / öğrenci FTE", beneficialDirection: "higherIsBetter" },
  IF: { officialWeight: 2.5, rawValueMeaning: "Uluslararası akademik personel FTE / akademik personel FTE", beneficialDirection: "higherIsBetter" },
  IC: { officialWeight: 2.5, rawValueMeaning: "Uluslararası ortak yayın / toplam yayın", beneficialDirection: "higherIsBetter" },
  SA: { officialWeight: 0, rawValueMeaning: "Yurt dışına gönderilen öğrenci / öğrenci FTE", beneficialDirection: "higherIsBetter" },
  IND: { officialWeight: 2, rawValueMeaning: "Sanayi araştırma geliri / akademik personel FTE", beneficialDirection: "higherIsBetter" },
  PAT: { officialWeight: 2, rawValueMeaning: "Haricî patent gösterge puanı", beneficialDirection: "higherIsBetter" },
};
export const THE_INDICATOR_WEIGHTS = Object.fromEntries(
  Object.entries(THE_INDICATOR_METADATA).map(([code, metadata]) => [code, metadata.officialWeight]),
) as Record<TheIndicatorCode, number>;
export const THE_INDICATOR_DIRECTIONS = Object.fromEntries(
  Object.entries(THE_INDICATOR_METADATA).map(([code, metadata]) => [code, metadata.beneficialDirection]),
) as Record<TheIndicatorCode, TheIndicatorBeneficialDirection>;
export const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export const safeDivide = (numerator: number | null, denominator: number | null, denominatorLabel: string): SafeDivisionResult => {
  if (numerator === null || denominator === null) return { value: null, valid: false, warning: "Gerekli giriş verisi eksik." };
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return { value: null, valid: false, warning: "Geçersiz sayısal değer bulundu." };
  if (numerator < 0 || denominator < 0) return { value: null, valid: false, warning: "Negatif değer kullanılamaz." };
  if (denominator === 0) return { value: null, valid: false, warning: `${denominatorLabel} sıfır olamaz.` };
  return { value: numerator / denominator, valid: true };
};

export const validateExternalScore = (value: number | null, label: string) => {
  if (value === null) return { value: null, valid: false, warnings: [`${label} girilmedi.`] };
  if (!Number.isFinite(value)) return { value: null, valid: false, warnings: [`${label} geçerli bir sayı değil.`] };
  if (value < 0 || value > 100) return { value: null, valid: false, warnings: [`${label} 0 ile 100 arasında olmalıdır.`] };
  return { value, valid: true, warnings: [] as string[] };
};

type Base = { code: TheIndicatorCode; category: TheCategoryCode; label: string; unit: string | null; source: TheIndicatorSource; dependencies: string[]; warnings?: string[] };
const external = (base: Base, value: number | null, missingWarning?: string): TheRawIndicatorResult => {
  const checked = validateExternalScore(value, base.label);
  const warnings = [...checked.warnings];
  if (!checked.valid && missingWarning) warnings.push(missingWarning);
  return { code: base.code, category: base.category, label: base.label, rawValue: checked.value, rawUnit: base.unit, source: "external-score", approximation: false, valid: checked.valid, warnings, dependencies: base.dependencies };
};
const divided = (base: Base, numerator: number | null, denominator: number | null, denominatorLabel: string, maxOne = false): TheRawIndicatorResult => {
  const result = safeDivide(numerator, denominator, denominatorLabel);
  const warnings = [...(base.warnings ?? []), ...(result.warning ? [result.warning] : [])];
  let valid = result.valid;
  if (maxOne && result.value !== null && result.value > 1) { valid = false; warnings.push(`${base.label} için pay, toplam değeri aşamaz.`); }
  return { code: base.code, category: base.category, label: base.label, rawValue: valid ? result.value : null, rawUnit: base.unit, source: base.source, approximation: base.source === "simulation-approximation", valid, warnings, dependencies: base.dependencies };
};

const sumStaffFte = (
  academicStaffFte: number | null,
  researchStaffFte: number | null,
): number | null => {
  if (academicStaffFte === null || researchStaffFte === null) return null;
  if (
    !Number.isFinite(academicStaffFte) ||
    !Number.isFinite(researchStaffFte) ||
    academicStaffFte < 0 ||
    researchStaffFte < 0
  ) {
    return Number.NaN;
  }
  return academicStaffFte + researchStaffFte;
};

export function calculateTheRawIndicators(input: TheCalculationInput): Record<TheIndicatorCode, TheRawIndicatorResult> {
  const teaching = "TEACHING" as const; const research = "RESEARCH_ENVIRONMENT" as const; const quality = "RESEARCH_QUALITY" as const; const international = "INTERNATIONAL_OUTLOOK" as const; const industry = "INDUSTRY" as const;
  const fieldIncome = isFiniteNumber(input.fieldWeightedResearchIncome) && input.fieldWeightedResearchIncome > 0 ? input.fieldWeightedResearchIncome : input.researchIncomePpp;
  const fieldPublications = isFiniteNumber(input.fieldWeightedPublications) && input.fieldWeightedPublications > 0 ? input.fieldWeightedPublications : input.publicationCount;
  const academicAndResearchStaffFte = sumStaffFte(
    input.academicStaffFte,
    input.academicResearchStaffFte,
  );
  return {
    TREP: external({ code: "TREP", category: teaching, label: "Öğretim İtibarı", unit: "puan", source: "external-score", dependencies: ["the.teaching.reputationScore"] }, input.teachingReputationScore),
    SSR: divided({ code: "SSR", category: teaching, label: "Akademisyen–Öğrenci Oranı", unit: "FTE akademik personel / FTE öğrenci", source: "raw-calculation", dependencies: ["the.common.academicStaffFte", "the.common.studentsFte"] }, input.academicStaffFte, input.studentsFte, "Toplam öğrenci sayısı"),
    DBR: divided({ code: "DBR", category: teaching, label: "Doktora–Lisans Mezunu Oranı", unit: "oran", source: "raw-calculation", dependencies: ["the.teaching.doctorateGraduates", "the.teaching.bachelorGraduates"] }, input.doctorateGraduates, input.bachelorGraduates, "Lisans mezunu sayısı"),
    DSR: divided({ code: "DSR", category: teaching, label: "Akademisyen Başına Doktora Mezunu", unit: "mezun / FTE akademik personel", source: "simulation-approximation", dependencies: ["the.teaching.doctorateGraduates", "the.common.academicStaffFte"], warnings: ["THE göstergeye özgü konu alanı ağırlıklarını yayımlamadığı için ağırlıksız yaklaşık oran kullanıldı."] }, input.doctorateGraduates, input.academicStaffFte, "Akademik personel sayısı"),
    II: divided({ code: "II", category: teaching, label: "Akademisyen Başına Kurumsal Gelir", unit: "PPP $ / FTE akademik personel", source: "raw-calculation", dependencies: ["the.teaching.institutionalIncomePpp", "the.common.academicStaffFte"] }, input.institutionalIncomePpp, input.academicStaffFte, "Akademik personel sayısı"),
    RREP: external({ code: "RREP", category: research, label: "Araştırma İtibarı", unit: "puan", source: "external-score", dependencies: ["the.researchEnvironment.reputationScore"] }, input.researchReputationScore),
    RI: divided({ code: "RI", category: research, label: "Araştırma Geliri", unit: "PPP $ / FTE akademik ve araştırma personeli", source: "simulation-approximation", dependencies: ["the.researchEnvironment.fieldWeightedResearchIncome", "the.researchEnvironment.researchIncomePpp", "the.common.academicStaffFte", "the.researchEnvironment.academicResearchStaffFte"], warnings: ["THE’nin göstergeye özgü konu alanı ağırlıkları tam olarak yayımlanmadığı için yaklaşık araştırma geliri hesabı kullanıldı."] }, fieldIncome, academicAndResearchStaffFte, "Akademik ve araştırma personeli toplamı"),
    RP: divided({ code: "RP", category: research, label: "Araştırma Üretkenliği", unit: "yayın / FTE akademik ve araştırma personeli", source: "simulation-approximation", dependencies: ["the.researchEnvironment.fieldWeightedPublications", "the.researchEnvironment.publicationCount", "the.common.academicStaffFte", "the.researchEnvironment.academicResearchStaffFte"], warnings: ["Konu alanı ağırlıkları yaklaşık temsil edilmiştir.", "THE’nin en fazla %10 yayın yeniden dağıtım algoritması uygulanmamıştır."] }, fieldPublications, academicAndResearchStaffFte, "Akademik ve araştırma personeli toplamı"),
    CI: external({ code: "CI", category: quality, label: "Atıf Etkisi", unit: "puan", source: "external-score", dependencies: ["the.researchQuality.citationImpactScore"] }, input.citationImpactScore, "Toplam atıf ve tekil FWCI değeri, THE Citation Impact skorunu tek başına üretmez."),
    RS: external({ code: "RS", category: quality, label: "Araştırma Gücü", unit: "puan", source: "external-score", dependencies: ["the.researchQuality.researchStrengthScore"] }, input.researchStrengthScore),
    // These are already normalized external bibliometric scores. The available
    // institutional model has no matching top-10% publication count or raw
    // influence numerator, so applying a second staff-size adjustment here
    // would mix a published score with an invented raw formula.
    RE: external({ code: "RE", category: quality, label: "Araştırma Mükemmelliği", unit: "puan", source: "external-score", dependencies: ["the.researchQuality.researchExcellenceScore"] }, input.researchExcellenceScore),
    RINF: external({ code: "RINF", category: quality, label: "Araştırma Etkisi", unit: "puan", source: "external-score", dependencies: ["the.researchQuality.researchInfluenceScore"] }, input.researchInfluenceScore),
    IS: divided({ code: "IS", category: international, label: "Uluslararası Öğrenci Oranı", unit: "oran", source: "simulation-approximation", dependencies: ["the.internationalOutlook.internationalStudentsFte", "the.common.studentsFte"], warnings: ["THE ülke nüfusu düzeltme fonksiyonunu yayımlamadığı için düzeltilmemiş öğrenci oranı kullanıldı."] }, input.internationalStudentsFte, input.studentsFte, "Toplam öğrenci sayısı", true),
    IF: divided({ code: "IF", category: international, label: "Uluslararası Akademik Personel Oranı", unit: "oran", source: "simulation-approximation", dependencies: ["the.internationalOutlook.internationalAcademicStaffFte", "the.common.academicStaffFte"], warnings: ["THE ülke nüfusu düzeltme fonksiyonunu yayımlamadığı için düzeltilmemiş akademik personel oranı kullanıldı."] }, input.internationalAcademicStaffFte, input.academicStaffFte, "Toplam akademik personel sayısı", true),
    IC: divided({ code: "IC", category: international, label: "Uluslararası Ortak Yazarlık Oranı", unit: "oran", source: "simulation-approximation", dependencies: ["the.internationalOutlook.internationalCoauthoredPublications", "the.researchEnvironment.publicationCount"], warnings: ["Konu alanı ağırlıkları, ülke nüfusu düzeltmesi ve çok yazarlı yayınların kesirli sayımı uygulanmamıştır."] }, input.internationalCoauthoredPublications, input.publicationCount, "Toplam yayın sayısı", true),
    SA: divided({ code: "SA", category: international, label: "Yurt Dışında Eğitim Oranı", unit: "oran", source: "simulation-approximation", dependencies: ["the.internationalOutlook.outboundStudents", "the.common.studentsFte"], warnings: ["THE konu alanı ve ülke nüfusu düzeltmeleri uygulanmamıştır.", "Bu göstergenin THE 2026 toplam skor ağırlığı %0’dır."] }, input.outboundStudents, input.studentsFte, "Toplam öğrenci sayısı", true),
    IND: divided({ code: "IND", category: industry, label: "Akademisyen Başına Sanayi Geliri", unit: "PPP $ / FTE akademik personel", source: "raw-calculation", dependencies: ["the.industry.industryResearchIncomePpp", "the.common.academicStaffFte"] }, input.industryResearchIncomePpp, input.academicStaffFte, "Akademik personel sayısı"),
    PAT: external({ code: "PAT", category: industry, label: "Patentler", unit: "puan", source: "external-score", dependencies: ["the.industry.patentScore"] }, input.patentScore, "Atıf yapan patent sayısı, THE Patentler göstergesini tek başına üretmez."),
  };
}

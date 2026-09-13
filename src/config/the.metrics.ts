import type { TheCategoryDefinition, TheMetricDefinition } from "@/src/types/the";

const metric = (definition: TheMetricDefinition) => definition;

const studentsFte = metric({
  id: "the.common.studentsFte",
  label: "Toplam Öğrenci Sayısı",
  description: "THE metodolojisinde kullanılan tam zamanlı eşdeğer öğrenci sayısıdır.",
  inputType: "number-range",
  min: 100,
  max: 100000,
  step: 100,
  unit: "FTE öğrenci",
  baselineValue: 24500,
  shared: true,
});

const academicStaffFte = metric({
  id: "the.common.academicStaffFte",
  label: "Akademik Personel Sayısı",
  description: "THE tanımına uygun tam zamanlı eşdeğer akademik personel sayısıdır.",
  inputType: "number-range",
  min: 1,
  max: 10000,
  step: 1,
  unit: "FTE personel",
  baselineValue: 1420,
  shared: true,
});

const publicationCount = metric({
  id: "the.researchEnvironment.publicationCount",
  label: "Toplam Yayın Sayısı",
  inputType: "number-range",
  min: 0,
  max: 100000,
  step: 1,
  unit: "yayın",
  baselineValue: 3800,
  shared: true,
});

export const theCategories: TheCategoryDefinition[] = [
  {
    id: "teaching",
    title: "Öğretim",
    weight: "%29,5",
    description: "Öğretim ortamı, akademik kapasite ve kurumsal kaynaklar",
    metrics: [
      metric({ id: "the.teaching.reputationScore", label: "Öğretim İtibarı Ham Değeri", description: "THE akademik itibar anketinden elde edilen haricî gösterge skorudur.", inputType: "score", min: 0, max: 100, step: 0.1, unit: "puan", baselineValue: 45, warning: "Bu değer öğrenci veya personel sayılarından hesaplanmaz." }),
      studentsFte,
      academicStaffFte,
      metric({ id: "the.teaching.bachelorGraduates", label: "Lisans Mezunu Sayısı", inputType: "number-range", min: 0, max: 30000, step: 10, unit: "mezun", baselineValue: 5200 }),
      metric({ id: "the.teaching.doctorateGraduates", label: "Doktora Mezunu Sayısı", inputType: "number-range", min: 0, max: 5000, step: 1, unit: "mezun", baselineValue: 310 }),
      metric({ id: "the.teaching.institutionalIncomePpp", label: "Kurumsal Gelir", description: "Satın alma gücü paritesine göre düzeltilmiş kurumsal gelirdir.", inputType: "number-range", min: 0, max: 10000000000, step: 100000, unit: "PPP $", baselineValue: 1250000000 }),
    ],
    calculatedIndicators: ["Öğrenci–Akademisyen Oranı", "Doktora–Lisans Mezunu Oranı", "Akademisyen Başına Doktora Mezunu", "Akademisyen Başına Kurumsal Gelir"],
  },
  {
    id: "researchEnvironment",
    title: "Araştırma Ortamı",
    weight: "%29",
    description: "Araştırma itibarı, araştırma geliri ve yayın üretkenliği",
    metrics: [
      metric({ id: "the.researchEnvironment.reputationScore", label: "Araştırma İtibarı Ham Değeri", description: "THE akademik itibar anketinden elde edilen haricî araştırma itibarı skorudur.", inputType: "score", min: 0, max: 100, step: 0.1, unit: "puan", baselineValue: 42 }),
      metric({ id: "the.researchEnvironment.researchIncomePpp", label: "Araştırma Geliri", inputType: "number-range", min: 0, max: 5000000000, step: 100000, unit: "PPP $", baselineValue: 680000000 }),
      metric({ id: "the.researchEnvironment.academicResearchStaffFte", label: "Akademik ve Araştırma Personeli Sayısı", inputType: "number-range", min: 1, max: 15000, step: 1, unit: "FTE personel", baselineValue: 1760 }),
      publicationCount,
      metric({ id: "the.researchEnvironment.fieldWeightedResearchIncome", label: "Alan Ağırlıklı Araştırma Geliri", description: "Disiplin farklılıkları dikkate alınarak ağırlıklandırılmış araştırma geliri değeridir.", inputType: "number-range", min: 0, max: 5000000000, step: 100000, unit: "PPP $", baselineValue: 710000000, warning: "Bu veri mevcut değilse ileride yaklaşık simülasyon değeri kullanılabilir." }),
      metric({ id: "the.researchEnvironment.fieldWeightedPublications", label: "Alan Ağırlıklı Yayın Sayısı", inputType: "number-range", min: 0, max: 100000, step: 10, unit: "yayın", baselineValue: 3950, warning: "Bu veri mevcut değilse ileride yaklaşık simülasyon değeri kullanılabilir." }),
    ],
    calculatedIndicators: ["Akademisyen Başına Araştırma Geliri", "Akademik Personel Başına Yayın", "Araştırma Üretkenliği"],
  },
  {
    id: "researchQuality",
    title: "Araştırma Kalitesi",
    weight: "%30",
    description: "Atıf etkisi ve haricî bibliyometrik araştırma performansı",
    notice: { title: "Bibliyometrik veri gereksinimi", text: "THE Araştırma Kalitesi göstergeleri yalnızca toplam atıf sayısından hesaplanmaz. FWCI, yayın dağılımları ve haricî bibliyometrik veriler gerekir." },
    metrics: [
      metric({ id: "the.researchQuality.citationImpactScore", label: "Atıf Etkisi Skoru", inputType: "score", min: 0, max: 100, step: 0.1, unit: "puan", baselineValue: 56 }),
      metric({ id: "the.researchQuality.researchStrengthScore", label: "Araştırma Gücü Skoru", inputType: "score", min: 0, max: 100, step: 0.1, unit: "puan", baselineValue: 51 }),
      metric({ id: "the.researchQuality.researchExcellenceScore", label: "Araştırma Mükemmelliği Skoru", inputType: "score", min: 0, max: 100, step: 0.1, unit: "puan", baselineValue: 48 }),
      metric({ id: "the.researchQuality.researchInfluenceScore", label: "Araştırma Etkisi Skoru", inputType: "score", min: 0, max: 100, step: 0.1, unit: "puan", baselineValue: 53 }),
      metric({ id: "the.researchQuality.rawCitationCount", label: "Toplam Atıf Sayısı", inputType: "number-range", min: 0, max: 10000000, step: 100, unit: "atıf", baselineValue: 87000, subgroup: "Bilgi Amaçlı Bibliyometrik Veriler", warning: "Bu değer THE Research Quality skorlarını tek başına üretmez." }),
      metric({ id: "the.researchQuality.fwci", label: "Alan Ağırlıklı Atıf Etkisi", inputType: "number-range", min: 0, max: 10, step: 0.01, unit: "FWCI", baselineValue: 1.24, subgroup: "Bilgi Amaçlı Bibliyometrik Veriler" }),
      metric({ id: "the.researchQuality.highImpactPublicationRatio", label: "Yüksek Etkili Yayın Oranı", inputType: "percentage", min: 0, max: 100, step: 0.1, unit: "%", baselineValue: 18.6, subgroup: "Bilgi Amaçlı Bibliyometrik Veriler" }),
    ],
  },
  {
    id: "internationalOutlook",
    title: "Uluslararası Görünüm",
    weight: "%7,5",
    description: "Uluslararası öğrenci, akademik personel ve yayın ortaklıkları",
    metrics: [
      studentsFte,
      metric({ id: "the.internationalOutlook.internationalStudentsFte", label: "Uluslararası Öğrenci Sayısı", inputType: "number-range", min: 0, max: 50000, step: 10, unit: "FTE öğrenci", baselineValue: 3060 }),
      { ...academicStaffFte, label: "Toplam Akademik Personel Sayısı" },
      metric({ id: "the.internationalOutlook.internationalAcademicStaffFte", label: "Uluslararası Akademik Personel Sayısı", inputType: "number-range", min: 0, max: 10000, step: 1, unit: "FTE personel", baselineValue: 185 }),
      publicationCount,
      metric({ id: "the.internationalOutlook.internationalCoauthoredPublications", label: "Uluslararası Ortak Yazarlı Yayın Sayısı", inputType: "number-range", min: 0, max: 100000, step: 10, unit: "yayın", baselineValue: 1450 }),
      metric({ id: "the.internationalOutlook.outboundStudents", label: "Yurt Dışına Gönderilen Öğrenci Sayısı", inputType: "number-range", min: 0, max: 20000, step: 10, unit: "öğrenci", baselineValue: 620, warning: "Bu göstergenin mevcut THE 2026 toplam skor ağırlığı %0’dır." }),
    ],
    calculatedIndicators: ["Uluslararası Öğrenci Oranı", "Uluslararası Akademik Personel Oranı", "Uluslararası Ortak Yazarlık Oranı", "Yurt Dışında Eğitim Oranı"],
  },
  {
    id: "industry",
    title: "Sanayi",
    weight: "%4",
    description: "Üniversite–sanayi iş birliği ve patent etkisi",
    metrics: [
      metric({ id: "the.industry.industryResearchIncomePpp", label: "Sanayiden Elde Edilen Araştırma Geliri", inputType: "number-range", min: 0, max: 2000000000, step: 100000, unit: "PPP $", baselineValue: 95000000, subgroup: "Sanayi Geliri (%2)" }),
      { ...academicStaffFte, subgroup: "Sanayi Geliri (%2)" },
      metric({ id: "the.industry.patentScore", label: "Patent Gösterge Skoru", inputType: "score", min: 0, max: 100, step: 0.1, unit: "puan", baselineValue: 38, subgroup: "Patentler (%2)" }),
      metric({ id: "the.industry.citingPatentCount", label: "Üniversite Yayınlarına Atıf Yapan Patent Sayısı", description: "Üniversitenin araştırma yayınlarına atıf yapan patent sayısıdır.", inputType: "number-range", min: 0, max: 100000, step: 1, unit: "patent", baselineValue: 420, subgroup: "Patentler (%2)", warning: "Toplam patent sayısı THE Patentler göstergesini tek başına üretmez." }),
    ],
    calculatedIndicators: ["Akademisyen Başına Sanayi Geliri", "Sanayi Geliri Skoru", "Patent Skoru"],
  },
];

export const theInitialValues = theCategories
  .flatMap((category) => category.metrics)
  .reduce<Record<string, number>>((values, currentMetric) => {
    values[currentMetric.id] = currentMetric.baselineValue;
    return values;
  }, {});

export const THE_DISPLAYED_INDICATOR_COUNT = 18;

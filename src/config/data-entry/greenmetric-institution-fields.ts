import { greenMetricRawMetricDefinitions } from "@/src/data/greenmetric.baseline";
import type { AppLanguage } from "@/src/i18n/types";
import type { GreenMetricMetricDefinition } from "@/src/types/greenmetric";

export type GreenMetricInstitutionSectionId =
  | "campus"
  | "energy"
  | "waste"
  | "water"
  | "transportation"
  | "education"
  | "governance";

type LocalizedText = Record<AppLanguage, string>;

type GreenMetricInstitutionSectionConfig = {
  id: GreenMetricInstitutionSectionId;
  title: LocalizedText;
  description: LocalizedText;
  metricIds: readonly string[];
};

export type GreenMetricInstitutionField = GreenMetricMetricDefinition & {
  localizedLabel: LocalizedText;
};

export type GreenMetricInstitutionSection = Omit<GreenMetricInstitutionSectionConfig, "metricIds"> & {
  fields: GreenMetricInstitutionField[];
};

const SECTION_CONFIG: readonly GreenMetricInstitutionSectionConfig[] = [
  {
    id: "campus",
    title: { tr: "Kampüs ve Altyapı", en: "Campus and Infrastructure" },
    description: { tr: "Alanlar ve GreenMetric kampüs nüfusunu oluşturan kişi sayıları", en: "Areas and headcounts used to derive the GreenMetric campus population" },
    metricIds: [
      "greenmetric.common.totalCampusAreaM2",
      "greenmetric.common.buildingGroundFloorAreaM2",
      "greenmetric.common.totalBuildingFloorAreaM2",
      "greenmetric.si.forestVegetationAreaM2",
      "greenmetric.si.plantedVegetationAreaM2",
      "greenmetric.common.regularStudentCount",
      "greenmetric.common.academicStaffCount",
      "greenmetric.common.administrativeStaffCount",
    ],
  },
  {
    id: "energy",
    title: { tr: "Enerji ve İklim", en: "Energy and Climate" },
    description: { tr: "Tüketim, üretim, bina ve emisyon verileri", en: "Consumption, production, building, and emissions data" },
    metricIds: [
      "greenmetric.ec.energyEfficientApplianceRatio",
      "greenmetric.ec.smartBuildingAreaM2",
      "greenmetric.common.totalAnnualElectricityKwh",
      "greenmetric.common.totalAnnualEnergyUsageKwh",
      "greenmetric.ec.renewableProduction.biodieselKwh",
      "greenmetric.ec.renewableProduction.biomassKwh",
      "greenmetric.ec.renewableProduction.solarKwh",
      "greenmetric.ec.renewableProduction.geothermalKwh",
      "greenmetric.ec.renewableProduction.windKwh",
      "greenmetric.ec.renewableProduction.hydroKwh",
      "greenmetric.ec.renewableProduction.chpKwh",
      "greenmetric.ec.renewableProduction.otherKwh",
      "greenmetric.common.totalCarbonFootprintTons",
      "greenmetric.ec.greenBuildingElementCount",
      "greenmetric.ec.innovativeProgramCount",
    ],
  },
  {
    id: "waste",
    title: { tr: "Atık", en: "Waste" },
    description: { tr: "Üretilen ve işlenen atık miktarları", en: "Generated and treated waste amounts" },
    metricIds: [
      "greenmetric.ws.organicWasteProducedCurrentTons",
      "greenmetric.ws.organicWasteTreatedCurrentTons",
      "greenmetric.ws.inorganicWasteProducedCurrentTons",
      "greenmetric.ws.inorganicWasteTreatedCurrentTons",
      "greenmetric.ws.toxicWasteProducedCurrentTons",
      "greenmetric.ws.toxicWasteTreatedCurrentTons",
      "greenmetric.ws.paperPlasticReductionProgramCount",
    ],
  },
  {
    id: "water",
    title: { tr: "Su", en: "Water" },
    description: { tr: "Su emilimi ve ölçülen kullanım oranları", en: "Water absorption and measured usage ratios" },
    metricIds: [
      "greenmetric.wr.waterAbsorptionAreaM2",
      "greenmetric.wr.waterEfficientApplianceRatio",
      "greenmetric.wr.treatedWaterConsumptionRatio",
    ],
  },
  {
    id: "transportation",
    title: { tr: "Ulaşım", en: "Transportation" },
    description: { tr: "Kampüs araç hareketleri, otopark ve ulaşım girişimleri", en: "Campus vehicle traffic, parking, and transportation initiatives" },
    metricIds: [
      "greenmetric.tr.universityManagedCombustionCars",
      "greenmetric.tr.dailyIncomingCombustionCars",
      "greenmetric.tr.dailyIncomingCombustionMotorcycles",
      "greenmetric.tr.averageDailyZevCount",
      "greenmetric.common.groundParkingAreaM2",
      "greenmetric.tr.privateVehicleReductionInitiativeCount",
    ],
  },
  {
    id: "education",
    title: { tr: "Eğitim ve Araştırma", en: "Education and Research" },
    description: { tr: "Ders, araştırma, yayın, etkinlik ve mezun verileri", en: "Course, research, publication, activity, and graduate data" },
    metricIds: [
      "greenmetric.common.totalCourseCount",
      "greenmetric.common.sustainabilityCourseCount",
      "greenmetric.common.totalResearchFundingUsd",
      "greenmetric.common.sustainabilityResearchFundingUsd",
      "greenmetric.common.lecturerResearcherCount",
      "greenmetric.common.sustainabilityPublicationCount",
      "greenmetric.ed.sustainabilityEventCount",
      "greenmetric.ed.studentOrganizationActivityCount",
      "greenmetric.ed.culturalActivityCount",
      "greenmetric.ed.internationalCollaborationProgramCount",
      "greenmetric.ed.studentCommunityServiceProjectCount",
      "greenmetric.ed.sustainabilityStartupCount",
      "greenmetric.ed.totalGraduateCountLastThreeYears",
      "greenmetric.ed.greenJobGraduateCount",
    ],
  },
  {
    id: "governance",
    title: { tr: "Yönetişim ve Bütçe", en: "Governance and Budget" },
    description: { tr: "Kurumsal bütçe ve liderlik sayıları", en: "Institutional budget and leadership counts" },
    metricIds: [
      "greenmetric.common.totalUniversityBudgetUsd",
      "greenmetric.common.sustainabilityBudgetUsd",
      "greenmetric.common.totalInstitutionalLeaderCount",
      "greenmetric.common.femaleInstitutionalLeaderCount",
    ],
  },
] as const;

const ENGLISH_LABELS: Record<string, string> = {
  "greenmetric.common.totalCampusAreaM2": "Total Campus Area",
  "greenmetric.common.buildingGroundFloorAreaM2": "Total Building Ground Coverage",
  "greenmetric.common.totalBuildingFloorAreaM2": "Total Building Floor Area",
  "greenmetric.si.forestVegetationAreaM2": "Forested Area",
  "greenmetric.si.plantedVegetationAreaM2": "Planted Vegetation Area",
  "greenmetric.common.regularStudentCount": "Regular Student Count",
  "greenmetric.common.academicStaffCount": "Academic Staff Count",
  "greenmetric.common.administrativeStaffCount": "Administrative Staff Count",
  "greenmetric.ec.energyEfficientApplianceRatio": "Energy-Efficient Appliance Ratio",
  "greenmetric.ec.smartBuildingAreaM2": "Total Smart Building Floor Area",
  "greenmetric.common.totalAnnualElectricityKwh": "Total Annual Electricity Consumption",
  "greenmetric.common.totalAnnualEnergyUsageKwh": "Total Annual Energy Use",
  "greenmetric.ec.renewableProduction.biodieselKwh": "Annual Biodiesel Production",
  "greenmetric.ec.renewableProduction.biomassKwh": "Annual Clean Biomass Production",
  "greenmetric.ec.renewableProduction.solarKwh": "Annual Solar Energy Production",
  "greenmetric.ec.renewableProduction.geothermalKwh": "Annual Geothermal Energy Production",
  "greenmetric.ec.renewableProduction.windKwh": "Annual Wind Energy Production",
  "greenmetric.ec.renewableProduction.hydroKwh": "Annual Hydroelectric Production",
  "greenmetric.ec.renewableProduction.chpKwh": "Annual Combined Heat and Power Production",
  "greenmetric.ec.renewableProduction.otherKwh": "Other Annual Renewable Energy Production",
  "greenmetric.common.totalCarbonFootprintTons": "Total Carbon Footprint for the Last 12 Months",
  "greenmetric.ec.greenBuildingElementCount": "Green Building Element Count",
  "greenmetric.ec.innovativeProgramCount": "Innovative Program Count",
  "greenmetric.ws.organicWasteProducedCurrentTons": "Organic Waste Generated — Current Year",
  "greenmetric.ws.organicWasteTreatedCurrentTons": "Organic Waste Treated",
  "greenmetric.ws.inorganicWasteProducedCurrentTons": "Inorganic Waste Generated — Current Year",
  "greenmetric.ws.inorganicWasteTreatedCurrentTons": "Inorganic Waste Treated",
  "greenmetric.ws.toxicWasteProducedCurrentTons": "Toxic Waste Generated — Current Year",
  "greenmetric.ws.toxicWasteTreatedCurrentTons": "Toxic Waste Treated",
  "greenmetric.ws.paperPlasticReductionProgramCount": "Paper and Plastic Reduction Program Count",
  "greenmetric.wr.waterAbsorptionAreaM2": "Water Absorption Area",
  "greenmetric.wr.waterEfficientApplianceRatio": "Water-Efficient Appliance Ratio",
  "greenmetric.wr.treatedWaterConsumptionRatio": "Treated Water Consumption Ratio",
  "greenmetric.tr.universityManagedCombustionCars": "University-Managed Combustion Cars",
  "greenmetric.tr.dailyIncomingCombustionCars": "Daily Incoming Combustion Cars",
  "greenmetric.tr.dailyIncomingCombustionMotorcycles": "Daily Incoming Combustion Motorcycles",
  "greenmetric.tr.averageDailyZevCount": "Average Daily Zero-Emission Vehicles",
  "greenmetric.common.groundParkingAreaM2": "Ground-Level Parking Area",
  "greenmetric.tr.privateVehicleReductionInitiativeCount": "Private Vehicle Reduction Initiative Count",
  "greenmetric.common.totalCourseCount": "Total Course Count",
  "greenmetric.common.sustainabilityCourseCount": "Sustainability Course Count",
  "greenmetric.common.totalResearchFundingUsd": "Total Research Funding",
  "greenmetric.common.sustainabilityResearchFundingUsd": "Sustainability Research Funding",
  "greenmetric.common.lecturerResearcherCount": "Academic and Researcher Count",
  "greenmetric.common.sustainabilityPublicationCount": "Sustainability Publication Count",
  "greenmetric.ed.sustainabilityEventCount": "Sustainability Event Count",
  "greenmetric.ed.studentOrganizationActivityCount": "Student Organization Sustainability Activities",
  "greenmetric.ed.culturalActivityCount": "Cultural Activity Count",
  "greenmetric.ed.internationalCollaborationProgramCount": "International Collaborative Program Count",
  "greenmetric.ed.studentCommunityServiceProjectCount": "Community Service Project Count",
  "greenmetric.ed.sustainabilityStartupCount": "Sustainability Start-up Count",
  "greenmetric.ed.totalGraduateCountLastThreeYears": "Total Graduates in the Last Three Years",
  "greenmetric.ed.greenJobGraduateCount": "Graduates Working in Green Jobs",
  "greenmetric.common.totalUniversityBudgetUsd": "Total University Budget",
  "greenmetric.common.sustainabilityBudgetUsd": "Sustainability Budget",
  "greenmetric.common.totalInstitutionalLeaderCount": "Total Institutional Leader Count",
  "greenmetric.common.femaleInstitutionalLeaderCount": "Female Institutional Leader Count",
};

const definitionsById = new Map(greenMetricRawMetricDefinitions.map((metric) => [metric.id, metric]));

function resolveField(metricId: string): GreenMetricInstitutionField {
  const metric = definitionsById.get(metricId);
  if (!metric) throw new Error(`GreenMetric kurumsal veri alanı bulunamadı: ${metricId}`);
  if (metric.inputType !== "number-range" && metric.inputType !== "percentage") {
    throw new Error(`GreenMetric kurumsal veri alanı sayısal olmalıdır: ${metricId}`);
  }
  const englishLabel = ENGLISH_LABELS[metricId];
  if (!englishLabel) throw new Error(`GreenMetric kurumsal veri İngilizce etiketi bulunamadı: ${metricId}`);
  return { ...metric, localizedLabel: { tr: metric.label, en: englishLabel } };
}

export const GREEN_METRIC_INSTITUTION_SECTIONS: readonly GreenMetricInstitutionSection[] =
  SECTION_CONFIG.map(({ metricIds, ...section }) => ({
    ...section,
    fields: metricIds.map(resolveField),
  }));

export const GREEN_METRIC_INSTITUTION_FIELDS = GREEN_METRIC_INSTITUTION_SECTIONS.flatMap(
  (section) => section.fields,
);

export function getGreenMetricInstitutionUnit(unit: string | undefined, language: AppLanguage) {
  if (!unit || language === "tr") return unit;
  const units: Record<string, string> = {
    öğrenci: "students",
    personel: "staff",
    unsur: "elements",
    program: "programs",
    ton: "tons",
    araç: "vehicles",
    girişim: "initiatives",
    ders: "courses",
    kişi: "people",
    yayın: "publications",
    etkinlik: "events",
    "faaliyet/yıl": "activities/year",
    "etkinlik/yıl": "events/year",
    "program/yıl": "programs/year",
    "proje/yıl": "projects/year",
    mezun: "graduates",
    yönetici: "leaders",
  };
  return units[unit] ?? unit;
}

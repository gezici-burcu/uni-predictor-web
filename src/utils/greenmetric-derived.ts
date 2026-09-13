import type { GreenMetricIndicatorDefinition, GreenMetricValue, GreenMetricValues } from "@/src/types/greenmetric";

export const GREEN_METRIC_POPULATION_METRIC_IDS = [
  "greenmetric.common.regularStudentCount",
  "greenmetric.common.academicStaffCount",
  "greenmetric.common.administrativeStaffCount",
] as const;

export const GREEN_METRIC_RENEWABLE_PRODUCTION_IDS = [
  "biodiesel", "biomass", "solar", "geothermal", "wind", "hydro", "chp", "other",
].map((source) => `greenmetric.ec.renewableProduction.${source}Kwh`);

export type GreenMetricRelationError = {
  metricIds: string[];
  message: string;
};

export const safeRatio = (numerator: number | null, denominator: number | null): number | null => {
  if (numerator === null || denominator === null || denominator <= 0) return null;
  return numerator / denominator;
};

export const safePercentage = (numerator: number | null, denominator: number | null): number | null => {
  const ratio = safeRatio(numerator, denominator);
  return ratio === null ? null : ratio * 100;
};

export const resolveAdaptiveMax = (baselineValue: number | null, currentValue: number | null, fallback: number): number =>
  Math.max(fallback, (baselineValue ?? 0) * 2, (currentValue ?? 0) * 1.25);

export const resolveInitialSliderMax = (
  baselineValue: number | null,
  configuredMax: number | undefined,
  fallbackMax: number,
): number => configuredMax ?? Math.max(fallbackMax, (baselineValue ?? 0) * 2);

export const resolveSliderStep = ({
  min,
  max,
  configuredStep,
  integerOnly = false,
}: {
  min: number;
  max: number;
  configuredStep?: number;
  integerOnly?: boolean;
}): number => {
  const range = Math.max(0, max - min);
  if (range === 0) return integerOnly ? 1 : 0.1;
  const configured = configuredStep ?? 1;
  if (range / configured >= 50) return configured;
  const rawStep = range / 125;
  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = 10 ** exponent;
  const normalized = rawStep / magnitude;
  const niceMultiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const resolved = niceMultiplier * magnitude;
  return integerOnly ? Math.max(1, Math.round(resolved)) : Math.max(0.01, resolved);
};

export const asNumber = (value: GreenMetricValue): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

const n = (values: GreenMetricValues, id: string) => asNumber(values[id]);

const sumRequired = (values: GreenMetricValues, ids: readonly string[]) => {
  const items = ids.map((id) => n(values, id));
  return items.some((item) => item === null)
    ? null
    : items.reduce<number>((total, item) => total + item!, 0);
};

export function calculateGreenMetricCampusPopulation(values: GreenMetricValues): number | null {
  return sumRequired(values, GREEN_METRIC_POPULATION_METRIC_IDS);
}

export function getGreenMetricRelationErrors(values: GreenMetricValues): GreenMetricRelationError[] {
  const errors: GreenMetricRelationError[] = [];
  const subset = (leftId: string, rightId: string, message: string) => {
    const left = n(values, leftId);
    const right = n(values, rightId);
    if (left !== null && right !== null && left > right) {
      errors.push({ metricIds: [leftId, rightId], message });
    }
  };

  subset("greenmetric.common.buildingGroundFloorAreaM2", "greenmetric.common.totalCampusAreaM2", "Bina zemin oturum alanı toplam kampüs alanından büyük olamaz.");
  subset("greenmetric.si.forestVegetationAreaM2", "greenmetric.common.totalCampusAreaM2", "Ormanlık alan toplam kampüs alanından büyük olamaz.");
  subset("greenmetric.si.plantedVegetationAreaM2", "greenmetric.common.totalCampusAreaM2", "Bitkilendirilmiş alan toplam kampüs alanından büyük olamaz.");
  subset("greenmetric.wr.waterAbsorptionAreaM2", "greenmetric.common.totalCampusAreaM2", "Su emilim alanı toplam kampüs alanından büyük olamaz.");
  subset("greenmetric.ec.smartBuildingAreaM2", "greenmetric.common.totalBuildingFloorAreaM2", "Akıllı bina alanı toplam bina kat alanından büyük olamaz.");
  subset("greenmetric.ws.organicWasteTreatedCurrentTons", "greenmetric.ws.organicWasteProducedCurrentTons", "İşlenen organik atık üretilen miktardan büyük olamaz.");
  subset("greenmetric.ws.inorganicWasteTreatedCurrentTons", "greenmetric.ws.inorganicWasteProducedCurrentTons", "İşlenen inorganik atık üretilen miktardan büyük olamaz.");
  subset("greenmetric.ws.toxicWasteTreatedCurrentTons", "greenmetric.ws.toxicWasteProducedCurrentTons", "İşlenen toksik atık üretilen miktardan büyük olamaz.");
  subset("greenmetric.common.groundParkingAreaM2", "greenmetric.common.totalCampusAreaM2", "Otopark alanı toplam kampüs alanından büyük olamaz.");
  subset("greenmetric.common.sustainabilityCourseCount", "greenmetric.common.totalCourseCount", "Sürdürülebilirlik dersi sayısı toplam ders sayısından büyük olamaz.");
  subset("greenmetric.common.sustainabilityResearchFundingUsd", "greenmetric.common.totalResearchFundingUsd", "Sürdürülebilirlik araştırma fonu toplam araştırma fonundan büyük olamaz.");
  subset("greenmetric.common.femaleInstitutionalLeaderCount", "greenmetric.common.totalInstitutionalLeaderCount", "Kadın yönetici sayısı toplam yönetici sayısından büyük olamaz.");
  subset("greenmetric.ed.greenJobGraduateCount", "greenmetric.ed.totalGraduateCountLastThreeYears", "Yeşil işlerde çalışan mezun sayısı toplam mezun sayısından büyük olamaz.");

  const renewableProduction = sumRequired(values, GREEN_METRIC_RENEWABLE_PRODUCTION_IDS);
  const totalEnergy = n(values, "greenmetric.common.totalAnnualEnergyUsageKwh");
  if (renewableProduction !== null && totalEnergy !== null && renewableProduction > totalEnergy) {
    errors.push({
      metricIds: [...GREEN_METRIC_RENEWABLE_PRODUCTION_IDS, "greenmetric.common.totalAnnualEnergyUsageKwh"],
      message: "Toplam yenilenebilir enerji üretimi toplam enerji tüketiminden büyük olamaz.",
    });
  }
  return errors;
}

export function getGreenMetricRelationWarningsForMetrics(values: GreenMetricValues, metricIds: readonly string[]) {
  const ids = new Set(metricIds);
  return getGreenMetricRelationErrors(values)
    .filter((error) => error.metricIds.every((id) => ids.has(id)))
    .map((error) => error.message);
}

const validatedPercentage = (
  values: GreenMetricValues,
  numeratorId: string,
  denominatorId: string,
) => getGreenMetricRelationWarningsForMetrics(values, [numeratorId, denominatorId]).length
  ? null
  : safePercentage(n(values, numeratorId), n(values, denominatorId));

export function calculateGreenMetricDerivedValues(values: GreenMetricValues): Record<string, number | null> {
  const population = calculateGreenMetricCampusPopulation(values);
  const campus = n(values, "greenmetric.common.totalCampusAreaM2");
  const ground = n(values, "greenmetric.common.buildingGroundFloorAreaM2");
  const openSpaceInvalid = getGreenMetricRelationWarningsForMetrics(values, [
    "greenmetric.common.totalCampusAreaM2",
    "greenmetric.common.buildingGroundFloorAreaM2",
  ]).length > 0;
  const open = campus === null || ground === null || openSpaceInvalid ? null : campus - ground;
  const renewableTotal = sumRequired(values, GREEN_METRIC_RENEWABLE_PRODUCTION_IDS);
  const renewableInvalid = getGreenMetricRelationWarningsForMetrics(values, [
    ...GREEN_METRIC_RENEWABLE_PRODUCTION_IDS,
    "greenmetric.common.totalAnnualEnergyUsageKwh",
  ]).length > 0;

  return {
    "greenmetric.derived.campusPopulation": population,
    "greenmetric.derived.openSpaceAreaM2": open,
    "greenmetric.derived.openSpaceRatio": safePercentage(open, campus),
    "greenmetric.derived.forestVegetationRatio": validatedPercentage(values, "greenmetric.si.forestVegetationAreaM2", "greenmetric.common.totalCampusAreaM2"),
    "greenmetric.derived.plantedVegetationRatio": validatedPercentage(values, "greenmetric.si.plantedVegetationAreaM2", "greenmetric.common.totalCampusAreaM2"),
    "greenmetric.derived.openSpacePerPerson": safeRatio(open, population),
    "greenmetric.derived.smartBuildingRatio": validatedPercentage(values, "greenmetric.ec.smartBuildingAreaM2", "greenmetric.common.totalBuildingFloorAreaM2"),
    "greenmetric.derived.renewableEnergySourceCount": Array.isArray(values["greenmetric.ec.renewableEnergySources"]) ? values["greenmetric.ec.renewableEnergySources"].length : null,
    "greenmetric.derived.totalRenewableEnergyProductionKwh": renewableTotal,
    "greenmetric.derived.electricityPerPerson": safeRatio(n(values, "greenmetric.common.totalAnnualElectricityKwh"), population),
    "greenmetric.derived.renewableEnergyRatio": renewableInvalid ? null : safePercentage(renewableTotal, n(values, "greenmetric.common.totalAnnualEnergyUsageKwh")),
    "greenmetric.derived.carbonFootprintPerPerson": safeRatio(n(values, "greenmetric.common.totalCarbonFootprintTons"), population),
    "greenmetric.derived.organicWasteTreatmentRatio": validatedPercentage(values, "greenmetric.ws.organicWasteTreatedCurrentTons", "greenmetric.ws.organicWasteProducedCurrentTons"),
    "greenmetric.derived.inorganicWasteTreatmentRatio": validatedPercentage(values, "greenmetric.ws.inorganicWasteTreatedCurrentTons", "greenmetric.ws.inorganicWasteProducedCurrentTons"),
    "greenmetric.derived.toxicWasteTreatmentRatio": validatedPercentage(values, "greenmetric.ws.toxicWasteTreatedCurrentTons", "greenmetric.ws.toxicWasteProducedCurrentTons"),
    "greenmetric.derived.waterAbsorptionRatio": validatedPercentage(values, "greenmetric.wr.waterAbsorptionAreaM2", "greenmetric.common.totalCampusAreaM2"),
    "greenmetric.derived.combustionVehicleRatio": safeRatio(sumRequired(values, ["greenmetric.tr.universityManagedCombustionCars", "greenmetric.tr.dailyIncomingCombustionCars", "greenmetric.tr.dailyIncomingCombustionMotorcycles"]), population),
    "greenmetric.derived.zevPerCampusPopulation": safeRatio(n(values, "greenmetric.tr.averageDailyZevCount"), population),
    "greenmetric.derived.parkingAreaRatio": validatedPercentage(values, "greenmetric.common.groundParkingAreaM2", "greenmetric.common.totalCampusAreaM2"),
    "greenmetric.derived.sustainabilityCourseRatio": validatedPercentage(values, "greenmetric.common.sustainabilityCourseCount", "greenmetric.common.totalCourseCount"),
    "greenmetric.derived.sustainabilityResearchFundingRatio": validatedPercentage(values, "greenmetric.common.sustainabilityResearchFundingUsd", "greenmetric.common.totalResearchFundingUsd"),
    "greenmetric.derived.sustainabilityPublicationsPerResearcher": safeRatio(n(values, "greenmetric.common.sustainabilityPublicationCount"), n(values, "greenmetric.common.lecturerResearcherCount")),
    "greenmetric.derived.greenJobGraduateRatio": validatedPercentage(values, "greenmetric.ed.greenJobGraduateCount", "greenmetric.ed.totalGraduateCountLastThreeYears"),
    "greenmetric.derived.sustainabilityBudgetRatio": validatedPercentage(values, "greenmetric.common.sustainabilityBudgetUsd", "greenmetric.common.totalUniversityBudgetUsd"),
    "greenmetric.derived.femaleLeaderRatio": validatedPercentage(values, "greenmetric.common.femaleInstitutionalLeaderCount", "greenmetric.common.totalInstitutionalLeaderCount"),
  };
}

export function calculateDerivedValue(id: string, values: GreenMetricValues): number | null {
  return calculateGreenMetricDerivedValues(values)[id] ?? null;
}

const hasValue = (value: GreenMetricValue) => value !== null && value !== "";

export function isIndicatorComplete(indicator: GreenMetricIndicatorDefinition, values: GreenMetricValues): boolean {
  const requiredMetrics = indicator.metrics.filter((metric) => metric.required && !metric.infoOnly && !metric.readonly);
  const directComplete = requiredMetrics.every((metric) => hasValue(values[metric.id]));
  const derivedComplete = indicator.metrics
    .filter((metric) => metric.readonly)
    .every((metric) => calculateDerivedValue(metric.id, values) !== null);
  const sourceMetricIds = indicator.metrics.flatMap((metric) =>
    metric.readonly ? metric.derivedFrom ?? [] : [metric.id]);
  const relationErrors = getGreenMetricRelationWarningsForMetrics(values, sourceMetricIds);
  return directComplete && derivedComplete && relationErrors.length === 0;
}

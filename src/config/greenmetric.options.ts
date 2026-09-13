import type { GreenMetricOption } from "@/src/types/greenmetric";

export const optionList = (...labels: string[]): GreenMetricOption[] =>
  labels.map((label, index) => ({ value: String(index + 1), label }));

export const renewableEnergyOptions: GreenMetricOption[] = [
  ["biodiesel", "Biyodizel"], ["biomass", "Temiz biyokütle"], ["solar", "Güneş enerjisi"], ["geothermal", "Jeotermal enerji"], ["wind", "Rüzgâr enerjisi"], ["hydro", "Hidroelektrik"], ["chp", "Birleşik ısı ve güç — CHP"], ["other", "Diğer"],
].map(([value, label]) => ({ value, label }));

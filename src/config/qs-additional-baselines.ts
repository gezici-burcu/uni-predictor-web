import { createEmptyQsAdditionalInputs } from "./qs-additional-inputs";
import type { QsDataYear } from "@/src/types/qsInstitutional";

/**
 * No canonical additional QS raw dataset is currently stored in the project.
 * Each year intentionally gets an independent empty record; no prior-year or
 * public-score fallback is allowed.
 */
export const getQsAdditionalBaselineForYear = (year: QsDataYear) => {
  void year;
  return createEmptyQsAdditionalInputs();
};

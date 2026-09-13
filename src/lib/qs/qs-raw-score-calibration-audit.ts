import type { QsIndicatorCode } from "@/src/types/qs";

/**
 * Repository audit result: the public QS reference table stores indicator
 * scores, while institutional history stores raw counts in a separate,
 * unpaired record. Therefore no institution/year has both sides of a
 * raw-to-score pair. A monotone interpolator must not be fitted to these data.
 */
export const QS_RAW_SCORE_PAIRED_DATA_POINT_COUNTS: Readonly<Record<QsIndicatorCode, number>> = {
  AR: 0,
  CPF: 0,
  ER: 0,
  EO: 0,
  FSR: 0,
  IRN: 0,
  ISD: 0,
  ISR: 0,
  IFR: 0,
  SUS: 0,
};

// The available Turkish reference cohort has 25 complete score profiles. For
// a future monotone piecewise fit, at least 8 distinct paired x/y observations
// (two boundaries plus six interior observations, 32% of that cohort) are
// required even for low-confidence interpolation. The current count is zero.
export const QS_EMPIRICAL_CALIBRATION_MINIMUM_PAIRED_POINTS = 8;

export function hasSufficientQsEmpiricalCalibrationData(code: QsIndicatorCode) {
  return QS_RAW_SCORE_PAIRED_DATA_POINT_COUNTS[code] >=
    QS_EMPIRICAL_CALIBRATION_MINIMUM_PAIRED_POINTS;
}

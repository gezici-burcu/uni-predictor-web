import { THE_INDICATOR_METADATA } from "@/src/lib/calculations/the";
import type {
  TheCategoryCode,
  TheIndicatorCode,
  TheRawIndicatorResult,
} from "@/src/types/the-calculation";

export type CalibrationTolerance = {
  absoluteTolerance: number;
  relativeTolerance: number;
};

export type CalibrationRawDifference = {
  code: TheIndicatorCode;
  calibrationValue: number | null;
  targetValue: number | null;
  absoluteDifference: number | null;
  relativeDifference: number | null;
  scoreAffecting: boolean;
  equivalent: boolean;
};

export const approximatelyEqual = (
  left: number,
  right: number,
  tolerance: CalibrationTolerance,
) =>
  Math.abs(left - right) <=
  tolerance.absoluteTolerance +
    tolerance.relativeTolerance * Math.max(Math.abs(left), Math.abs(right));

export function compareTheCalibrationRawIndicators({
  calibrationRawIndicators,
  targetRawIndicators,
  tolerance,
}: {
  calibrationRawIndicators: Record<TheIndicatorCode, TheRawIndicatorResult>;
  targetRawIndicators: Record<TheIndicatorCode, TheRawIndicatorResult>;
  tolerance: CalibrationTolerance;
}): CalibrationRawDifference[] {
  return Object.keys(THE_INDICATOR_METADATA).map((rawCode) => {
    const code = rawCode as TheIndicatorCode;
    const calibrationValue = calibrationRawIndicators[code].rawValue;
    const targetValue = targetRawIndicators[code].rawValue;
    const scoreAffecting = THE_INDICATOR_METADATA[code].officialWeight > 0;
    const bothNull = calibrationValue === null && targetValue === null;
    const bothFinite =
      calibrationValue !== null &&
      targetValue !== null &&
      Number.isFinite(calibrationValue) &&
      Number.isFinite(targetValue);
    const absoluteDifference = bothFinite
      ? Math.abs(calibrationValue - targetValue)
      : null;
    const relativeDifference =
      bothFinite && Math.max(Math.abs(calibrationValue), Math.abs(targetValue)) > 0
        ? absoluteDifference! /
          Math.max(Math.abs(calibrationValue), Math.abs(targetValue))
        : bothFinite
          ? 0
          : null;
    return {
      code,
      calibrationValue,
      targetValue,
      absoluteDifference,
      relativeDifference,
      scoreAffecting,
      equivalent:
        !scoreAffecting ||
        bothNull ||
        (bothFinite &&
          approximatelyEqual(calibrationValue, targetValue, tolerance)),
    };
  });
}

export function areTheCategoryRawIndicatorsEquivalent({
  category,
  leftRawIndicators,
  rightRawIndicators,
  tolerance,
}: {
  category: TheCategoryCode;
  leftRawIndicators: Record<TheIndicatorCode, TheRawIndicatorResult>;
  rightRawIndicators: Record<TheIndicatorCode, TheRawIndicatorResult>;
  tolerance: CalibrationTolerance;
}) {
  return Object.keys(THE_INDICATOR_METADATA)
    .map((code) => code as TheIndicatorCode)
    .filter(
      (code) =>
        leftRawIndicators[code].category === category &&
        THE_INDICATOR_METADATA[code].officialWeight > 0,
    )
    .every((code) => {
      const left = leftRawIndicators[code].rawValue;
      const right = rightRawIndicators[code].rawValue;
      if (left === null || right === null) return false;
      if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
      return approximatelyEqual(left, right, tolerance);
    });
}

export function isTheCalibrationEquivalent({
  calibrationRawIndicators,
  targetRawIndicators,
  tolerance,
}: {
  calibrationRawIndicators: Record<TheIndicatorCode, TheRawIndicatorResult>;
  targetRawIndicators: Record<TheIndicatorCode, TheRawIndicatorResult>;
  tolerance: CalibrationTolerance;
}) {
  return compareTheCalibrationRawIndicators({
    calibrationRawIndicators,
    targetRawIndicators,
    tolerance,
  }).every(({ equivalent }) => equivalent);
}

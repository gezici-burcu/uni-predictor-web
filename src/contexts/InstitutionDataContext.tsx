"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import {
  INSTITUTION_DATA_YEARS,
  type InstitutionDataYear,
} from "@/src/config/institution-data-years";
import type { TheInstitutionData } from "@/src/data/data-entry/the-institution-data";
import { validateTheInstitutionData } from "@/src/lib/the/validate-the-subset-limits";
import { validateQsInstitutionalYearData } from "@/src/lib/qs/qs-institutional-normalization";
import { DEFAULT_QS_INSTITUTIONAL_DATA_YEAR, getCanonicalQsYearData, getEffectiveQsInstitutionYearData } from "@/src/lib/qs/qs-institution-year-data";
import type { QsDataYear, QsInstitutionalInputByRowId } from "@/src/types/qsInstitutional";
import type { GreenMetricValues } from "@/src/types/greenmetric";
import {
  createDemoInstitutionData,
  restoreInstitutionDataBeforeDemo,
} from "@/src/data/demo/demo-institution";
import {
  METHODOLOGY_SCENARIO_EVENT,
  METHODOLOGY_SCENARIO_STORAGE_KEY,
} from "./MethodologyScenarioContext";

export type QsInstitutionalYearData = Partial<QsInstitutionalInputByRowId>;
export type GreenMetricInstitutionalDataByYear = Partial<Record<InstitutionDataYear, GreenMetricValues>> & Record<string, unknown>;

export interface DemoInstitutionProfile {
  schemaVersion: 1;
  id: "demo-university-v1";
  displayName: "Demo Üniversitesi";
  displayNameEn: "Demo University";
  dataSource: "synthetic-demo";
  isDemo: true;
  demoVersion: 1;
  activatedAt: string;
  previousInstitutionData: {
    updatedAt: string;
    activeYears: StoredInstitutionData["activeYears"];
    data: StoredInstitutionData["data"];
    scenarioChangesRaw: string | null;
  };
}

export interface StoredInstitutionData {
  version: 2;
  updatedAt: string;
  activeYears: {
    the: InstitutionDataYear | null;
    qs: InstitutionDataYear | null;
    uiGreenMetric: InstitutionDataYear | null;
  };
  data: {
    the: Partial<Record<InstitutionDataYear, Partial<TheInstitutionData>>>;
    qs: Partial<Record<QsDataYear, QsInstitutionalYearData>>;
    uiGreenMetric: GreenMetricInstitutionalDataByYear;
  };
  demoProfile?: DemoInstitutionProfile;
}

export function resolveActiveQsDataYear(
  activeYear: InstitutionDataYear | null,
  storedYears: Partial<Record<QsDataYear, QsInstitutionalYearData>>,
): QsDataYear {
  const selected = activeYear === null ? null : String(activeYear) as QsDataYear;
  const hasData = (year: QsDataYear) =>
    Boolean((storedYears[year] && Object.keys(storedYears[year]!).length > 0) || getCanonicalQsYearData(year));
  if (selected && hasData(selected)) return selected;
  const available = (["2025", "2024", "2023", "2022"] as QsDataYear[]).filter(hasData);
  return available[0] ?? DEFAULT_QS_INSTITUTIONAL_DATA_YEAR;
}

const EMPTY: StoredInstitutionData = {
  version: 2,
  updatedAt: "",
  activeYears: { the: null, qs: null, uiGreenMetric: null },
  data: { the: {}, qs: {}, uiGreenMetric: {} },
};
const KEY = "uni-predictor:institution-data";
const EVENT = "uni-predictor:institution-data-change";
let memorySnapshot: StoredInstitutionData = EMPTY;
let hydrated = false;

function isDemoInstitutionProfile(value: unknown): value is DemoInstitutionProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const profile = value as Partial<DemoInstitutionProfile>;
  const previous = profile.previousInstitutionData;
  return profile.schemaVersion === 1 && profile.id === "demo-university-v1" &&
    profile.dataSource === "synthetic-demo" && profile.isDemo === true &&
    typeof profile.activatedAt === "string" && Boolean(previous) &&
    typeof previous?.updatedAt === "string" && Boolean(previous?.activeYears) &&
    Boolean(previous?.data);
}

export function parseStoredInstitutionData(raw: string | null): StoredInstitutionData | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as StoredInstitutionData;
    return value?.version === 2 && value.data?.the && value.data?.qs && value.activeYears
      ? {
          ...value,
          activeYears: { ...EMPTY.activeYears, ...value.activeYears },
          data: { ...value.data, uiGreenMetric: value.data.uiGreenMetric ?? {} },
          demoProfile: isDemoInstitutionProfile(value.demoProfile)
            ? structuredClone(value.demoProfile)
            : undefined,
        }
      : null;
  } catch {
    return null;
  }
}

function hydrateSnapshotOnce() {
  if (hydrated) return;
  memorySnapshot = parseStoredInstitutionData(window.localStorage.getItem(KEY)) ?? EMPTY;
  hydrated = true;
}

const getSnapshot = () => {
  hydrateSnapshotOnce();
  return memorySnapshot;
};

export const subscribeToInstitutionData = (callback: () => void) => {
  const handleStorage = (event: Event) => {
    if (event instanceof StorageEvent && event.key !== null && event.key !== KEY) return;
    if (event instanceof StorageEvent) {
      memorySnapshot = parseStoredInstitutionData(event.newValue) ?? EMPTY;
      hydrated = true;
    }
    callback();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(EVENT, callback);
  };
};

function persistInstitutionData(
  update: (current: StoredInstitutionData) => StoredInstitutionData,
) {
  hydrateSnapshotOnce();
  const next = update(memorySnapshot);
  memorySnapshot = next;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

export function createQsYearSaveState(
  current: StoredInstitutionData,
  year: QsDataYear,
  values: QsInstitutionalYearData,
  updatedAt: string,
): StoredInstitutionData {
  return {
    ...current,
    updatedAt,
    activeYears: { ...current.activeYears, qs: Number(year) as InstitutionDataYear },
    data: {
      ...current.data,
      qs: {
        ...current.data.qs,
        [year]: Object.fromEntries(
          Object.entries(values).map(([key, value]) => [key, { ...value }]),
        ) as QsInstitutionalYearData,
      },
    },
  };
}

export function createGreenMetricYearSaveState(
  current: StoredInstitutionData,
  year: InstitutionDataYear,
  values: GreenMetricValues,
  updatedAt: string,
): StoredInstitutionData {
  return {
    ...current,
    updatedAt,
    activeYears: { ...current.activeYears, uiGreenMetric: year },
    data: {
      ...current.data,
      uiGreenMetric: {
        ...current.data.uiGreenMetric,
        [year]: Object.fromEntries(
          Object.entries(values).map(([id, value]) => [id, Array.isArray(value) ? [...value] : value]),
        ),
      },
    },
  };
}

export function getStoredGreenMetricYearData(
  storedYears: GreenMetricInstitutionalDataByYear,
  year: InstitutionDataYear,
): GreenMetricValues {
  const value = storedYears[String(year)];
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as GreenMetricValues) };
}

export function resolveActiveGreenMetricDataYear(
  activeYear: InstitutionDataYear | null,
  storedYears: GreenMetricInstitutionalDataByYear,
): InstitutionDataYear | null {
  if (activeYear !== null) return activeYear;
  return INSTITUTION_DATA_YEARS.find((year) => {
    const value = storedYears[String(year)];
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }) ?? null;
}

interface Value {
  institutionDataSnapshot: Readonly<StoredInstitutionData>;
  activeTheYear: InstitutionDataYear | null;
  activeQsYear: InstitutionDataYear | null;
  activeGreenMetricYear: InstitutionDataYear | null;
  updatedAt: string | null;
  selectTheYear: (year: InstitutionDataYear) => void;
  selectQsYear: (year: QsDataYear) => void;
  selectGreenMetricYear: (year: InstitutionDataYear) => void;
  getTheYearOverride: (year: InstitutionDataYear) => Partial<TheInstitutionData>;
  saveTheYear: (year: InstitutionDataYear, values: TheInstitutionData) => boolean;
  clearTheYear: (year: InstitutionDataYear) => void;
  getQsYearData: (year: QsDataYear) => QsInstitutionalYearData;
  getQsYearOverride: (year: QsDataYear) => QsInstitutionalYearData | undefined;
  saveQsYear: (year: QsDataYear, values: QsInstitutionalYearData) => boolean;
  clearQsYear: (year: QsDataYear) => void;
  getGreenMetricYearData: (year: InstitutionDataYear) => GreenMetricValues;
  saveGreenMetricYear: (year: InstitutionDataYear, values: GreenMetricValues) => void;
  clearGreenMetricYear: (year: InstitutionDataYear) => void;
  activateDemoInstitution: () => void;
  deactivateDemoInstitution: () => void;
}

const Context = createContext<Value | null>(null);

export function InstitutionDataProvider({ children }: { children: React.ReactNode }) {
  const stored = useSyncExternalStore(subscribeToInstitutionData, getSnapshot, () => EMPTY);
  const selectTheYear = useCallback((year: InstitutionDataYear) => {
    persistInstitutionData((current) => ({
      ...current,
      activeYears: { ...current.activeYears, the: year },
    }));
  }, []);
  const selectQsYear = useCallback((year: QsDataYear) => {
    persistInstitutionData((current) => ({
      ...current,
      activeYears: { ...current.activeYears, qs: Number(year) as InstitutionDataYear },
    }));
  }, []);
  const selectGreenMetricYear = useCallback((year: InstitutionDataYear) => {
    persistInstitutionData((current) => ({
      ...current,
      activeYears: { ...current.activeYears, uiGreenMetric: year },
    }));
  }, []);
  const saveTheYear = useCallback((year: InstitutionDataYear, values: TheInstitutionData) => {
    if (Object.keys(validateTheInstitutionData(values)).length > 0) return false;
    persistInstitutionData((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      activeYears: { ...current.activeYears, the: year },
      data: {
        ...current.data,
        the: { ...current.data.the, [year]: { ...values } },
      },
    }));
    return true;
  }, []);
  const clearTheYear = useCallback((year: InstitutionDataYear) => {
    persistInstitutionData((current) => {
      const nextYears = { ...current.data.the };
      delete nextYears[year];
      return {
        ...current,
        updatedAt: new Date().toISOString(),
        data: { ...current.data, the: nextYears },
      };
    });
  }, []);
  const saveQsYear = useCallback((year: QsDataYear, values: QsInstitutionalYearData) => {
    if (!validateQsInstitutionalYearData(values).valid) return false;
    persistInstitutionData((current) =>
      createQsYearSaveState(current, year, values, new Date().toISOString()),
    );
    return true;
  }, []);
  const clearQsYear = useCallback((year: QsDataYear) => {
    persistInstitutionData((current) => {
      const nextYears = { ...current.data.qs };
      delete nextYears[year];
      return {
        ...current,
        updatedAt: new Date().toISOString(),
        data: { ...current.data, qs: nextYears },
      };
    });
  }, []);
  const saveGreenMetricYear = useCallback((year: InstitutionDataYear, values: GreenMetricValues) => {
    persistInstitutionData((current) =>
      createGreenMetricYearSaveState(current, year, values, new Date().toISOString()),
    );
  }, []);
  const clearGreenMetricYear = useCallback((year: InstitutionDataYear) => {
    persistInstitutionData((current) => {
      const nextYears = { ...current.data.uiGreenMetric };
      delete nextYears[String(year)];
      return {
        ...current,
        updatedAt: new Date().toISOString(),
        data: { ...current.data, uiGreenMetric: nextYears },
      };
    });
  }, []);
  const activateDemoInstitution = useCallback(() => {
    const previousScenarioChangesRaw = window.localStorage.getItem(
      METHODOLOGY_SCENARIO_STORAGE_KEY,
    );
    persistInstitutionData((current) => createDemoInstitutionData(
      current,
      previousScenarioChangesRaw,
      new Date().toISOString(),
    ));
    window.localStorage.setItem(METHODOLOGY_SCENARIO_STORAGE_KEY, JSON.stringify({
      version: 1,
      data: { the: {}, qs: {}, "ui-greenmetric": {} },
    }));
    window.dispatchEvent(new Event(METHODOLOGY_SCENARIO_EVENT));
  }, []);
  const deactivateDemoInstitution = useCallback(() => {
    hydrateSnapshotOnce();
    const previousScenarioChangesRaw = memorySnapshot.demoProfile
      ?.previousInstitutionData.scenarioChangesRaw ?? null;
    persistInstitutionData((current) => restoreInstitutionDataBeforeDemo(current) ?? current);
    if (previousScenarioChangesRaw === null) {
      window.localStorage.removeItem(METHODOLOGY_SCENARIO_STORAGE_KEY);
    } else {
      window.localStorage.setItem(METHODOLOGY_SCENARIO_STORAGE_KEY, previousScenarioChangesRaw);
    }
    window.dispatchEvent(new Event(METHODOLOGY_SCENARIO_EVENT));
  }, []);
  const value = useMemo<Value>(() => ({
    institutionDataSnapshot: stored,
    activeTheYear: stored.activeYears.the,
    activeQsYear: Number(resolveActiveQsDataYear(stored.activeYears.qs, stored.data.qs)) as InstitutionDataYear,
    activeGreenMetricYear: resolveActiveGreenMetricDataYear(
      stored.activeYears.uiGreenMetric,
      stored.data.uiGreenMetric,
    ),
    updatedAt: stored.updatedAt || null,
    selectTheYear,
    selectQsYear,
    selectGreenMetricYear,
    getTheYearOverride: (year) => stored.data.the[year] ?? {},
    saveTheYear,
    clearTheYear,
    getQsYearData: (year) =>
      getEffectiveQsInstitutionYearData(year, stored.data.qs[year]).values,
    getQsYearOverride: (year) => stored.data.qs[year],
    saveQsYear,
    clearQsYear,
    getGreenMetricYearData: (year) => getStoredGreenMetricYearData(stored.data.uiGreenMetric, year),
    saveGreenMetricYear,
    clearGreenMetricYear,
    activateDemoInstitution,
    deactivateDemoInstitution,
  }), [
    stored,
    selectTheYear,
    selectQsYear,
    selectGreenMetricYear,
    saveTheYear,
    clearTheYear,
    saveQsYear,
    clearQsYear,
    saveGreenMetricYear,
    clearGreenMetricYear,
    activateDemoInstitution,
    deactivateDemoInstitution,
  ]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useInstitutionData() {
  const value = useContext(Context);
  if (!value) throw new Error("useInstitutionData must be used inside provider");
  return value;
}

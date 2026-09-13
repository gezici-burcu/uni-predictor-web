"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import {
  addSavedScenario,
  deleteSavedScenario,
  EMPTY_SAVED_SCENARIO_STATE,
  parseSavedScenarioState,
  renameSavedScenario,
  SAVED_SCENARIOS_STORAGE_KEY,
  type SavedScenarioState,
  updateSavedScenario,
} from "@/src/lib/scenarios/saved-scenario-store";
import type { SavedScenarioSnapshot } from "@/src/types/saved-scenario";

const EVENT = "university-ranking-scenarios-change";
let cachedRaw: string | null | undefined;
let cachedState = EMPTY_SAVED_SCENARIO_STATE;
const snapshot = () => {
  const raw = window.localStorage.getItem(SAVED_SCENARIOS_STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedState = parseSavedScenarioState(raw);
  }
  return cachedState;
};
const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
};

type ContextValue = {
  scenarios: SavedScenarioSnapshot[];
  save: (scenario: SavedScenarioSnapshot) => string | null;
  update: (scenario: SavedScenarioSnapshot) => string | null;
  rename: (id: string, name: string) => string | null;
  remove: (id: string) => void;
};
const Context = createContext<ContextValue | null>(null);

export function SavedScenariosProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, snapshot, () => EMPTY_SAVED_SCENARIO_STATE);
  const persist = useCallback((next: SavedScenarioState) => {
    window.localStorage.setItem(SAVED_SCENARIOS_STORAGE_KEY, JSON.stringify(next));
    cachedRaw = undefined;
    window.dispatchEvent(new Event(EVENT));
  }, []);
  const save = useCallback((scenario: SavedScenarioSnapshot) => {
    const result = addSavedScenario(state, scenario);
    if (!result.error) persist(result.state);
    return result.error;
  }, [persist, state]);
  const rename = useCallback((id: string, name: string) => {
    const result = renameSavedScenario(state, id, name);
    if (!result.error) persist(result.state);
    return result.error;
  }, [persist, state]);
  const update = useCallback((scenario: SavedScenarioSnapshot) => {
    const result = updateSavedScenario(state, scenario);
    if (!result.error) persist(result.state);
    return result.error;
  }, [persist, state]);
  const remove = useCallback((id: string) => persist(deleteSavedScenario(state, id)), [persist, state]);
  const value = useMemo(() => ({ scenarios: state.scenarios, save, update, rename, remove }), [state, save, update, rename, remove]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSavedScenarios() {
  const value = useContext(Context);
  if (!value) throw new Error("useSavedScenarios must be used inside SavedScenariosProvider");
  return value;
}

export function useOptionalSavedScenarios() {
  return useContext(Context);
}

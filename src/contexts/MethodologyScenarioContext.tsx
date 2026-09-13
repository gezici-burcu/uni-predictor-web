"use client";
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { MethodologyId } from "./MethodologyBaselineContext";

type Changes = Record<string, unknown>;
type ChangesUpdate = Changes | ((current: Changes) => Changes);
type Stored = { version: 1; data: Record<MethodologyId, Changes> };

const EMPTY: Stored = { version: 1, data: { the: {}, qs: {}, "ui-greenmetric": {} } };
export const METHODOLOGY_SCENARIO_STORAGE_KEY = "uni-predictor:scenario-changes";
export const METHODOLOGY_SCENARIO_EVENT = "uni-predictor:scenario-change";
const KEY = METHODOLOGY_SCENARIO_STORAGE_KEY;
const EVENT = METHODOLOGY_SCENARIO_EVENT;
let rawCache: string | null | undefined;
let valueCache = EMPTY;

const snapshot = () => {
  const raw = window.localStorage.getItem(KEY);
  if (raw !== rawCache) {
    rawCache = raw;
    try {
      const parsed = raw ? JSON.parse(raw) as Stored : null;
      valueCache = parsed?.version === 1 ? parsed : EMPTY;
    } catch {
      valueCache = EMPTY;
    }
  }
  return valueCache;
};

const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
};

export function resolveMethodologyChanges(
  current: Changes,
  update: ChangesUpdate,
): Changes {
  return typeof update === "function" ? update(current) : update;
}

interface Value {
  getChanges: (id: MethodologyId) => Changes;
  setChanges: (id: MethodologyId, update: ChangesUpdate) => void;
}

const Context = createContext<Value | null>(null);

export function MethodologyScenarioProvider({ children }: { children: React.ReactNode }) {
  const stored = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const setChanges = useCallback((id: MethodologyId, update: ChangesUpdate) => {
    const current = snapshot();
    const changes = resolveMethodologyChanges(current.data[id], update);
    const next: Stored = { version: 1, data: { ...current.data, [id]: changes } };
    const raw = JSON.stringify(next);

    window.localStorage.setItem(KEY, raw);
    rawCache = raw;
    valueCache = next;
    window.dispatchEvent(new Event(EVENT));
  }, []);
  const value = useMemo(() => ({
    getChanges: (id: MethodologyId) => stored.data[id],
    setChanges,
  }), [stored, setChanges]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useMethodologyScenario() {
  const value = useContext(Context);
  if (!value) throw new Error("useMethodologyScenario must be used inside provider");
  return value;
}

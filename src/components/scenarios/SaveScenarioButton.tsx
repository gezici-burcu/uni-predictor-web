"use client";

import { useState } from "react";
import Link from "next/link";
import { useOptionalSavedScenarios } from "@/src/contexts/SavedScenariosContext";
import type { SavedScenarioSnapshot } from "@/src/types/saved-scenario";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";

export function SaveScenarioButton({ createSnapshot, disabled = false }: {
  createSnapshot: (name: string) => SavedScenarioSnapshot;
  disabled?: boolean;
}) {
  const scenarioStore = useOptionalSavedScenarios();
  const { t } = useAppLanguage();
  const [message, setMessage] = useState<string | null>(null);
  const [savedScenario, setSavedScenario] = useState<{ id: string; name: string } | null>(null);
  const handleSave = () => {
    const name = window.prompt(t("actions.scenarioName"));
    if (name === null) return;
    if (!scenarioStore) return;
    const snapshot = createSnapshot(name);
    const error = scenarioStore.save(snapshot);
    if (!error) setSavedScenario({ id: snapshot.id, name: name.trim() });
    setMessage(error ?? t("actions.scenarioSaved"));
  };
  const handleUpdate = () => {
    if (!scenarioStore || !savedScenario) return;
    const snapshot = createSnapshot(savedScenario.name);
    const error = scenarioStore.update({ ...snapshot, id: savedScenario.id });
    setMessage(error ?? t("actions.scenarioUpdated"));
  };
  return <div className="flex flex-wrap items-center gap-2"><button type="button" disabled={disabled} onClick={handleSave} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-sm font-bold text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 4h12l2 2v14H5z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/></svg>{t("actions.saveScenario")}</button>{savedScenario ? <button type="button" disabled={disabled} onClick={handleUpdate} className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm font-bold text-blue-800 transition hover:border-blue-300 disabled:opacity-40">{t("actions.updateScenario")}</button> : null}{message ? <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs text-slate-600 shadow-sm" role="status">{message} {message === t("actions.scenarioSaved") ? <Link href="/scenario-comparison" className="font-bold text-blue-700">{t("actions.viewScenarios")}</Link> : null}</span> : null}</div>;
}

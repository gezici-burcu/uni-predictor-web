"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { useInstitutionData } from "@/src/contexts/InstitutionDataContext";
import { useSavedScenarios } from "@/src/contexts/SavedScenariosContext";
import { getTranslation } from "@/src/i18n/getTranslation";
import {
  CROSS_ANALYSIS_PARAMETER_REGISTRY,
  createCrossAnalysisBaselineSnapshot,
  createCrossAnalysisState,
  resetCrossAnalysisState,
  runCrossAnalysis,
  getCrossAnalysisUnaffectedReason,
  setCrossAnalysisProposedValue,
  type CrossAnalysisBaselineSnapshot,
  type CrossAnalysisMethodologyId,
  type CrossAnalysisMethodologyResult,
  type CrossAnalysisParameterId,
  type CrossAnalysisResult,
} from "@/src/lib/cross-analysis";
import {
  CrossAnalysisImpactDetails,
  CrossAnalysisIndicatorImpactDetails,
} from "./CrossAnalysisImpactDetails";
import {
  createCrossAnalysisBaselineIdentity,
  createSavedCrossAnalysisScenario,
  crossAnalysisBaselineMatches,
} from "@/src/lib/scenarios/cross-analysis-scenario";
import {
  buildCrossAnalysisPdf,
  createCrossAnalysisReportData,
  crossAnalysisPdfFilename,
} from "@/src/lib/scenarios/cross-analysis-pdf";
import {
  isSavedCrossAnalysisScenario,
  type SavedCrossAnalysisScenarioSnapshot,
} from "@/src/types/saved-scenario";
import {
  canDisplayCrossAnalysisResult,
  createCrossAnalysisMethodologyPresentation,
  formatCrossAnalysisScore,
  getCrossAnalysisAffectedIndicatorDetails,
  parseCrossAnalysisNumericInput,
  removeCrossAnalysisParameter,
} from "./crossAnalysisUi";

const methodologyItems = [
  { id: "the", label: "THE", badge: "THE", accent: "border-blue-200 bg-blue-50 text-blue-700" },
  { id: "qs", label: "QS", badge: "QS", accent: "border-violet-200 bg-violet-50 text-violet-700" },
] as const;

function rankDetail(
  result: CrossAnalysisResult,
  methodology: CrossAnalysisMethodologyId,
  t: (key: string) => string,
) {
  let confidence: "high" | "medium" | "low" | "HIGH" | "MEDIUM" | "LOW" | null = null;
  let approximate = false;
  if (methodology === "the") {
    confidence = result.methodologies.the.rankMetadata.proposed.estimate?.rawEstimate.confidence ?? null;
  } else if (methodology === "qs") {
    confidence = result.methodologies.qs.rankMetadata.proposed.modelConfidence.level;
    approximate = result.methodologies.qs.rankMetadata.approximate;
  }
  const parts: string[] = [];
  if (approximate) parts.push(t("approximate"));
  if (confidence) {
    const normalized = confidence.toLowerCase();
    parts.push(t(normalized === "high" ? "confidenceHigh" : normalized === "medium" ? "confidenceMedium" : "confidenceLow"));
  }
  return parts.join(" · ");
}

function MethodologyResultCard({
  methodology,
  result,
  fullResult,
  hasChanges,
  locale,
  language,
  parameterLabels,
  t,
}: {
  methodology: typeof methodologyItems[number];
  result: CrossAnalysisMethodologyResult<unknown>;
  fullResult: CrossAnalysisResult;
  hasChanges: boolean;
  locale: string;
  language: "tr" | "en";
  parameterLabels: Readonly<Record<string, string>>;
  t: (key: string) => string;
}) {
  const rankMetadata = rankDetail(fullResult, methodology.id, t);
  const showResult = canDisplayCrossAnalysisResult(hasChanges, result);
  const presentation = createCrossAnalysisMethodologyPresentation(hasChanges, result);
  const unavailable = t("notAvailable");
  const currentBand = presentation.baselineRankBand ?? unavailable;
  const unaffectedReason = getCrossAnalysisUnaffectedReason(
    fullResult.changes.map((change) => change.parameterId),
    methodology.id,
  );
  const indicatorDetails = getCrossAnalysisAffectedIndicatorDetails(result);
  const indicatorDetailLabels = {
    current: t("current"),
    proposed: t("newValue"),
    difference: t("difference"),
    rawValue: t("rawValue"),
    indicatorScore: t("indicatorScore"),
    modelContribution: t("modelContribution"),
    affectingParameters: t("affectingParameters"),
    statuses: {
      "score-changed": t("impactStatusScoreChanged"),
      "raw-only": t("impactStatusRawOnly"),
      "threshold-unchanged": t("impactStatusThresholdUnchanged"),
      "score-unchanged": t("impactStatusScoreUnchanged"),
      unavailable: t("impactStatusUnavailable"),
    },
  } as const;

  const isUnaffected = !result.affected;
  const isRawImpactOnly = result.status === "raw-impact-only";
  const isUnavailable = result.status === "insufficient-data" || result.status === "invalid";
  const displayedProposedScore = isUnavailable ? null : presentation.proposedScore;
  const displayedDelta = isUnavailable ? null : presentation.scoreDelta;
  const displayedProposedBand = isUnavailable ? null : presentation.proposedRankBand;

  return (
    <article className="flex h-full min-h-[360px] min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-testid={`cross-result-${methodology.id}`}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div><h3 className="text-lg font-bold text-slate-950">{methodology.label}</h3><p className="mt-0.5 text-xs text-slate-500">{t("baselineData").replace("{year}", String(result.baselineContext.year ?? t("notAvailable")))}</p></div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${methodology.accent}`}>{methodology.badge}</span>
      </div>

      {!hasChanges ? (
        <div className="flex flex-1 flex-col justify-center py-8 text-center">
          <p className="text-sm text-slate-500">{t("changeParameter")}</p>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("current")}</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-slate-950">{formatCrossAnalysisScore(presentation.baselineScore, methodology.id, locale)}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("estimatedRank")}</p>
          <p className="mt-1 font-bold text-slate-900">{currentBand}</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("current")}</p>
              <p className="mt-1 break-words text-lg font-bold tabular-nums text-slate-950">{formatCrossAnalysisScore(presentation.baselineScore, methodology.id, locale)}</p>
            </div>
            <span className="text-lg text-slate-300" aria-hidden="true">→</span>
            <div className="min-w-0 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("newValue")}</p>
              <p className="mt-1 break-words text-lg font-bold tabular-nums text-slate-950">{displayedProposedScore === null ? "—" : formatCrossAnalysisScore(displayedProposedScore, methodology.id, locale)}</p>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
            <span className="text-xs font-semibold text-slate-500">{t("difference")}</span>
            <span className={`ml-2 font-bold tabular-nums ${isUnaffected || displayedDelta === null || displayedDelta === 0 ? "text-slate-700" : displayedDelta > 0 ? "text-emerald-700" : "text-red-700"}`}>
              {presentation.differenceKind === "unaffected" ? t("summaryUnaffected") : displayedDelta === null ? "—" : formatCrossAnalysisScore(displayedDelta, methodology.id, locale, true)}
            </span>
          </div>
          {result.scoreDelta === 0 &&
          result.propagation?.rawChangedMetrics.length &&
          result.propagation.scoreChangedMetrics.length === 0 &&
          result.propagation.heldConstantMetrics.length
            ? <p className="mt-2 text-xs leading-5 text-slate-500">{t("dependencyWithoutScoreChange")}</p>
            : null}
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("estimatedRank")}</p>
            <div className="mt-2 flex min-w-0 items-center gap-2 text-sm font-bold text-slate-900">
              <span className="min-w-0 break-words">{currentBand}</span>
              <span className="shrink-0 text-slate-300" aria-hidden="true">→</span>
              <span className="min-w-0 break-words">{displayedProposedBand ?? "—"}</span>
            </div>
            {showResult && rankMetadata ? <p className="mt-1 text-xs text-slate-500">{rankMetadata}</p> : null}
            {showResult && result.scoreDelta !== null && result.scoreDelta !== 0 && result.baselineRankBand !== null && result.baselineRankBand === result.proposedRankBand ? <p className="mt-1 text-xs font-medium text-slate-500">{t("scoreChangedBandSame")}</p> : null}
          </div>

          {isUnaffected ? <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-sm leading-5 text-slate-700"><p className="font-semibold">{t("notAffected")}</p><p className="mt-0.5 text-xs text-slate-500">{t(`unaffectedReason${unaffectedReason[0].toUpperCase()}${unaffectedReason.slice(1)}`)}</p></div> : null}
          {isRawImpactOnly ? <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status"><p className="font-semibold">{t("rawImpactOnly")}</p><p className="mt-0.5 leading-4">{t("rawImpactOnlyDetail")}</p></div> : null}
          {result.status === "insufficient-data" ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-900" role="status">{t("insufficientData")}</div> : null}
          {result.status === "invalid" ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800" role="alert">{t("invalidData")}</div> : null}

          {isUnaffected ? <p className="mt-auto border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">{t("noImpactedMetrics")}</p>
            : result.status === "insufficient-data" ? <CrossAnalysisImpactDetails methodology={methodology.id} metricCodes={result.missingMetrics} language={language} summary={t("missingMetrics")} weightedLabel={t("scoreImpactWeighted")} indicatorOnlyLabel={t("scoreImpactIndicatorOnly")} className="mt-auto border-t border-slate-100 pt-3" />
            : indicatorDetails.length ? <CrossAnalysisIndicatorImpactDetails methodology={methodology.id} details={indicatorDetails} language={language} locale={locale} summary={t("impactedMetrics")} labels={indicatorDetailLabels} parameterLabels={parameterLabels} className="mt-auto border-t border-slate-100 pt-3" />
            : <CrossAnalysisImpactDetails methodology={methodology.id} metricCodes={result.impactedMetrics} language={language} summary={t("impactedMetrics")} weightedLabel={t("scoreImpactWeighted")} indicatorOnlyLabel={t("scoreImpactIndicatorOnly")} className="mt-auto border-t border-slate-100 pt-3" />}
        </div>
      )}
    </article>
  );
}

function CrossAnalysisWorkspace({
  baseline,
  loadedScenario,
  baselineMismatch,
  loadError,
}: {
  baseline: CrossAnalysisBaselineSnapshot;
  loadedScenario?: SavedCrossAnalysisScenarioSnapshot;
  baselineMismatch: boolean;
  loadError: boolean;
}) {
  const { language, locale } = useAppLanguage();
  const { save } = useSavedScenarios();
  const t = (key: string) => getTranslation(language, `crossAnalysisUi.${key}`);
  const labels = Object.fromEntries(
    CROSS_ANALYSIS_PARAMETER_REGISTRY.map((parameter) => [parameter.id, parameter.labels[language]]),
  ) as Record<CrossAnalysisParameterId, string>;
  const [analysisState, setAnalysisState] = useState(() => loadedScenario
    ? { inputs: structuredClone(loadedScenario.crossAnalysis.overrides) }
    : createCrossAnalysisState());
  const [draftValues, setDraftValues] = useState<Partial<Record<CrossAnalysisParameterId, string>>>(() =>
    Object.fromEntries((loadedScenario?.crossAnalysis.overrides ?? []).map((input) =>
      [input.parameterId, String(input.proposedValue)])));
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const changedIds = useMemo(() => new Set(analysisState.inputs.map((input) => input.parameterId)), [analysisState.inputs]);
  const matchesLoadedSnapshot = loadedScenario
    ? crossAnalysisInputsEqual(analysisState.inputs, loadedScenario.crossAnalysis.overrides)
    : false;
  const result = useMemo(() => loadedScenario && matchesLoadedSnapshot
    ? loadedScenario.crossAnalysis.resultSnapshot
    : runCrossAnalysis({ baseline, inputs: analysisState.inputs }),
  [analysisState.inputs, baseline, loadedScenario, matchesLoadedSnapshot]);
  const affectedMethodologyCount = Object.values(result.methodologies)
    .filter((methodology) => methodology.affected).length;
  const hasChanges = analysisState.inputs.length > 0;
  const invalidResult = result.validationIssues.length > 0 ||
    Object.values(result.methodologies).some((methodology) => methodology.status === "invalid");

  const resetParameter = (parameterId: CrossAnalysisParameterId) => {
    setDraftValues((current) => {
      const next = { ...current };
      delete next[parameterId];
      return next;
    });
    setAnalysisState((current) => removeCrossAnalysisParameter(current, parameterId));
  };
  const resetAll = () => {
    setDraftValues({});
    setAnalysisState(resetCrossAnalysisState());
  };
  const saveAnalysis = () => {
    if (!hasChanges) {
      setSaveMessage(t("saveRequiresChange"));
      return;
    }
    const name = window.prompt(t("analysisName"), loadedScenario?.name ?? "");
    if (name === null) return;
    const snapshot = createSavedCrossAnalysisScenario({
      name,
      baseline,
      overrides: analysisState.inputs,
      result,
    });
    const error = save(snapshot);
    setSaveMessage(error ?? t("analysisSaved"));
  };
  const createPdf = async () => {
    if (!hasChanges) {
      setSaveMessage(t("pdfRequiresChange"));
      return;
    }
    if (invalidResult) {
      setSaveMessage(t("pdfInvalid"));
      return;
    }
    setPdfLoading(true);
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const name = loadedScenario?.name ?? t("title");
      const reportData = createCrossAnalysisReportData({
        name,
        createdAt: loadedScenario?.createdAt ?? new Date().toISOString(),
        baseline,
        overrides: analysisState.inputs,
        result,
      }, language);
      const bytes = buildCrossAnalysisPdf(reportData, language);
      downloadPdfBytes(bytes, crossAnalysisPdfFilename(name));
      setSaveMessage(t("pdfCreated"));
    } catch {
      setSaveMessage(t("pdfError"));
    } finally {
      setPdfLoading(false);
    }
  };
  const updateParameter = (parameterId: CrossAnalysisParameterId, rawValue: string) => {
    setDraftValues((current) => ({ ...current, [parameterId]: rawValue }));
    const proposedValue = parseCrossAnalysisNumericInput(rawValue);
    if (proposedValue === null) {
      resetParameter(parameterId);
      return;
    }
    setAnalysisState((current) => setCrossAnalysisProposedValue(current, baseline, parameterId, proposedValue));
  };
  const renderChangedParameter = (input: (typeof analysisState.inputs)[number]) => {
    const parameter = CROSS_ANALYSIS_PARAMETER_REGISTRY.find((candidate) => candidate.id === input.parameterId)!;
    const traces = result.parameterTraces.filter((trace) => trace.parameterId === input.parameterId);
    return <div key={input.parameterId} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold leading-5">{labels[input.parameterId] ?? input.parameterId}</p>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-700">{traces.map((trace) => <span key={trace.methodology} className="font-semibold tabular-nums">{methodologyItems.find((item) => item.id === trace.methodology)?.badge} ({trace.baselineYear ?? t("notAvailable")}): {trace.baselineValue === null ? t("notAvailable") : new Intl.NumberFormat(locale).format(trace.baselineValue)} → {new Intl.NumberFormat(locale).format(trace.proposedValue)} {parameter.unit}</span>)}</div>
      <p className="mt-1 text-[11px] leading-4 text-slate-500">{t("commonTargetBaselineHelp")}</p>
    </div>;
  };

  return (
    <div className="cross-analysis-workspace mx-auto w-full max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50/60 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 h-1 w-10 rounded-full bg-blue-600" aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">{t("title")}</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{t("description")}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={saveAnalysis} className="primary-action rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800">{t("saveAnalysis")}</button>
            <button type="button" disabled={!hasChanges || invalidResult || pdfLoading} aria-busy={pdfLoading} title={!hasChanges ? t("pdfRequiresChange") : invalidResult ? t("pdfInvalid") : undefined} onClick={() => void createPdf()} className="rounded-lg border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40">{pdfLoading ? t("pdfPreparing") : t("createPdf")}</button>
            <button type="button" disabled={!hasChanges} onClick={resetAll} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">{t("resetAll")}</button>
          </div>
        </div>
        <dl className="mt-3 flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5"><dt className="text-slate-500">{t("changedParameters")}</dt><dd className="font-bold tabular-nums text-slate-950">{analysisState.inputs.length}</dd></div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5"><dt className="text-slate-500">{t("affectedMethodologyCount")}</dt><dd className="font-bold tabular-nums text-slate-950">{affectedMethodologyCount}</dd></div>
          <div className="flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5"><dt className="shrink-0 text-slate-500">{t("dataYears")}</dt><dd className="truncate font-bold text-slate-950">THE {baseline.years.the ?? "—"} · QS {baseline.years.qs}</dd></div>
        </dl>
      </header>

      {loadedScenario ? <section className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950" role="status"><strong>{t("savedAnalysisOpened")}:</strong> {loadedScenario.name}{baselineMismatch ? <p className="mt-1 text-xs leading-5 text-blue-800">{t("savedBaselineNotice")}</p> : null}</section> : null}
      {loadError ? <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900" role="alert">{t("savedAnalysisMissing")}</section> : null}
      {saveMessage ? <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700" role="status">{saveMessage} {saveMessage === t("analysisSaved") ? <Link href="/scenario-comparison" className="font-semibold text-blue-700">{t("viewSavedAnalyses")}</Link> : null}</p> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="cross-parameters-title">
        <div>
          <h2 id="cross-parameters-title" className="text-lg font-bold text-slate-950">{t("parameterChanges")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("parameterSectionDescription")}</p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2" data-testid="cross-parameter-grid">
          {CROSS_ANALYSIS_PARAMETER_REGISTRY.map((parameter) => {
            const baselineValue = baseline.parameters[parameter.id] ?? null;
            const theBaseline = baseline.methodologyParameterValues.the[parameter.id] ?? null;
            const qsBaseline = baseline.methodologyParameterValues.qs[parameter.id] ?? null;
            const baselinesMatch = theBaseline !== null && Object.is(theBaseline, qsBaseline);
            const changed = changedIds.has(parameter.id);
            const issues = result.validationIssues.filter((issue) => issue.parameterIds.includes(parameter.id));
            const inputId = `cross-parameter-input-${parameter.id}`;
            const formatBaseline = (value: number | null) => value === null
              ? t("notAvailable")
              : `${new Intl.NumberFormat(locale).format(value)} ${parameter.unit}`;
            return (
              <article
                key={parameter.id}
                className={`min-w-0 rounded-xl border p-3 transition-colors ${changed ? "border-blue-300 bg-blue-50/50" : "border-slate-200 bg-slate-50/60"}`}
                data-testid={`cross-parameter-${parameter.id}`}
              >
                <h3 className="min-h-10 text-sm font-semibold leading-5 text-slate-950">{labels[parameter.id]}</h3>
                <div className="mt-2 text-xs text-slate-600">
                  <p className="font-medium text-slate-500">{t("current")}</p>
                  {baselinesMatch ? (
                    <p className="mt-0.5 font-bold tabular-nums text-slate-900">{formatBaseline(theBaseline)}</p>
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span><strong>THE:</strong> {formatBaseline(theBaseline)}</span>
                      <span><strong>QS:</strong> {formatBaseline(qsBaseline)}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <label htmlFor={inputId} className="min-w-0 flex-1 text-xs font-semibold text-slate-700">
                    <span className="mb-1 block">{t("newTargetValue")}</span>
                    <span className="flex min-w-0 overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                      <input
                        id={inputId}
                        type="number"
                        min={parameter.validation.minimum}
                        max={parameter.validation.maximum}
                        step={parameter.validation.integerOnly ? 1 : "any"}
                        disabled={baselineValue === null}
                        aria-invalid={issues.length > 0}
                        value={draftValues[parameter.id] ?? ""}
                        placeholder={baselineValue === null ? t("baselineMissing") : new Intl.NumberFormat(locale).format(baselineValue)}
                        onChange={(event) => updateParameter(parameter.id, event.currentTarget.value)}
                        className="h-9 min-w-0 flex-1 bg-transparent px-3 text-right font-semibold tabular-nums outline-none disabled:bg-slate-100"
                      />
                      <span className="flex items-center border-l border-slate-200 bg-slate-50 px-2 text-xs font-normal text-slate-500">{parameter.unit}</span>
                    </span>
                  </label>
                  {changed ? (
                    <button type="button" onClick={() => resetParameter(parameter.id)} className="h-9 shrink-0 rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-900 hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{t("resetParameter")}</button>
                  ) : null}
                </div>
                {issues.length ? <p className="mt-1 text-xs font-medium text-red-700" role="alert">{issues[0]?.message}</p> : null}
              </article>
            );
          })}
        </div>
      </section>

      {hasChanges ? (
        <section className="rounded-xl border border-slate-200 bg-white px-4 py-3" aria-label={t("changedParameters")}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <strong className="text-slate-950">{t("changedParameters")}: {analysisState.inputs.length}</strong>
            <div className="flex flex-wrap gap-1.5">
              {methodologyItems.map((methodology) => <span key={methodology.id} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{methodology.badge}: {getCrossAnalysisAffectedIndicatorDetails(result.methodologies[methodology.id]).length} {t("indicatorCountShort")}</span>)}
            </div>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{analysisState.inputs.map(renderChangedParameter)}</div>
        </section>
      ) : null}

      <section aria-labelledby="cross-results-title">
        <h2 id="cross-results-title" className="mb-3 text-lg font-bold text-slate-950">{t("methodologyEffects")}</h2>
        <div className="grid items-stretch gap-4 md:grid-cols-2">
          {methodologyItems.map((methodology) => <MethodologyResultCard key={methodology.id} methodology={methodology} result={result.methodologies[methodology.id]} fullResult={result} hasChanges={hasChanges} locale={locale} language={language} parameterLabels={labels} t={t} />)}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="cross-summary-title">
        <h2 id="cross-summary-title" className="px-4 pt-4 text-lg font-bold text-slate-950 sm:px-5">{t("summary")}</h2>
        <div className="mt-3 overflow-x-auto" tabIndex={0}>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5">{t("methodology")}</th><th className="px-3 py-2.5">{t("current")}</th><th className="px-3 py-2.5">{t("newValue")}</th><th className="px-3 py-2.5">{t("difference")}</th><th className="px-3 py-2.5">{t("currentBand")}</th><th className="px-3 py-2.5">{t("newBand")}</th><th className="px-4 py-2.5">{t("effect")}</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{methodologyItems.map((methodology) => {
              const methodologyResult = result.methodologies[methodology.id];
              const presentation = createCrossAnalysisMethodologyPresentation(hasChanges, methodologyResult);
              const effect = !methodologyResult.affected
                ? t("summaryUnaffected")
                : methodologyResult.status === "raw-impact-only"
                  ? t("summaryRawImpact")
                  : t("summaryIndicatorCount").replace("{count}", String(getCrossAnalysisAffectedIndicatorDetails(methodologyResult).length));
              return <tr key={methodology.id}><th scope="row" className="px-4 py-3 font-bold text-slate-900">{methodology.label}<span className="mt-0.5 block text-[11px] font-normal text-slate-500">{t("baselineData").replace("{year}", String(methodologyResult.baselineContext.year ?? t("notAvailable")))}</span></th><td className="px-3 py-3 tabular-nums">{presentation.baselineAvailable ? formatCrossAnalysisScore(presentation.baselineScore, methodology.id, locale) : "—"}</td><td className="px-3 py-3 tabular-nums">{presentation.proposedAvailable ? formatCrossAnalysisScore(presentation.proposedScore, methodology.id, locale) : "—"}</td><td className="px-3 py-3 font-semibold tabular-nums">{presentation.differenceKind === "unaffected" ? t("summaryUnaffected") : presentation.differenceKind === "numeric" ? formatCrossAnalysisScore(presentation.scoreDelta, methodology.id, locale, true) : "—"}</td><td className="px-3 py-3">{presentation.baselineAvailable ? presentation.baselineRankBand ?? t("notAvailable") : "—"}</td><td className="px-3 py-3">{presentation.proposedAvailable ? presentation.proposedRankBand ?? t("notAvailable") : "—"}</td><td className="px-4 py-3"><span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{effect}</span></td></tr>;
            })}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function downloadPdfBytes(bytes: Uint8Array, filename: string) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CrossAnalysisPage({ savedAnalysisId }: { savedAnalysisId?: string }) {
  const { institutionDataSnapshot } = useInstitutionData();
  const { scenarios } = useSavedScenarios();
  const currentBaseline = useMemo(
    () => createCrossAnalysisBaselineSnapshot(institutionDataSnapshot),
    [institutionDataSnapshot],
  );
  const candidate = savedAnalysisId
    ? scenarios.find((scenario) => scenario.id === savedAnalysisId)
    : undefined;
  const loadedScenario = candidate && isSavedCrossAnalysisScenario(candidate)
    ? candidate
    : undefined;
  const baseline = loadedScenario?.crossAnalysis.baselineSnapshot ?? currentBaseline;
  const baselineMismatch = loadedScenario
    ? !crossAnalysisBaselineMatches(loadedScenario, currentBaseline)
    : false;
  const workspaceIdentity = `${loadedScenario?.id ?? "active"}:${createCrossAnalysisBaselineIdentity(baseline)}`;
  return <CrossAnalysisWorkspace key={workspaceIdentity} baseline={baseline} loadedScenario={loadedScenario} baselineMismatch={baselineMismatch} loadError={Boolean(savedAnalysisId && !loadedScenario)} />;
}

function crossAnalysisInputsEqual(
  left: readonly { parameterId: string; baselineValue: number; proposedValue: number }[],
  right: readonly { parameterId: string; baselineValue: number; proposedValue: number }[],
) {
  if (left.length !== right.length) return false;
  return left.every((input) => right.some((candidate) =>
    candidate.parameterId === input.parameterId &&
    candidate.baselineValue === input.baselineValue &&
    candidate.proposedValue === input.proposedValue));
}

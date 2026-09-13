"use client";

import { useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { useInstitutionData } from "@/src/contexts/InstitutionDataContext";
import { useSavedScenarios } from "@/src/contexts/SavedScenariosContext";
import Link from "next/link";
import { getQsAdditionalBaselineForYear } from "@/src/config/qs-additional-baselines";
import type { QsDataYear } from "@/src/types/qsInstitutional";
import { DEFAULT_QS_INSTITUTIONAL_DATA_YEAR } from "@/src/lib/qs/qs-institution-year-data";
import {
  type MethodologyId,
} from "@/src/contexts/MethodologyBaselineContext";
import { getTheInstitutionDataForYear } from "@/src/data/data-entry/the-institution-data";
import { createTheInstitutionalMetricBaseline } from "@/src/lib/the/institutional-scenario";
import { methodologyRegistry } from "@/src/lib/baseline/methodologyRegistry";
import {
  RECOMMENDATION_HORIZON_MONTHS,
  RECOMMENDATION_PLANNING_HORIZON,
  RECOMMENDATION_STRATEGY,
} from "@/src/config/recommendation-engine/realism-limits";
import {
  createRecommendationAdapters,
  classifyRecommendationOutcome,
  buildRecommendationProgressChartData,
  formatRecommendationScore,
  formatRecommendationValue,
  formatQsRawRatio,
  formatQsRawRatioDifference,
  filterRecommendationSelectionsToDefinitions,
  getRecommendationScoreRelations,
  prepareRecommendationSimulation,
  createQsRawRecommendationAnalysis,
  attachQsCapabilityToRecommendationResult,
  resolveRecommendationCandidateParameterIds,
  resolveGreenMetricCandidateParameterIds,
  runRecommendationEngine,
  summarizeRecommendationSelections,
  sanitizeQsRecommendationSelections,
  createQsRawRecommendationBaselineValues,
  validateRecommendationRequest,
  validateQsAggregateRecommendationInputs,
  validateQsEmploymentRecommendationInputs,
  classifyQsRecommendationDisplayStatus,
  getQsRecommendationDependencyGroups,
  calculateQsEmploymentDiagnostics,
  getQsEffectiveRecommendationValues,
  createQsAlternativeImprovementPlan,
  type AlternativeImprovementPlan,
  type RecommendationEngineResult,
  type RecommendationMetricDefinition,
  type RecommendationParameterInput,
  type RecommendationTargetMode,
  type QsRecommendationCapabilityResult,
  formatRecommendationRankEstimate,
  calculateDisplayedScoreDifference,
} from "@/src/lib/recommendation-engine";
import { createRecommendationReportModel, type RecommendationReportModel } from "@/src/lib/recommendation-engine/recommendation-report";
import { RecommendationMetricScope } from "./RecommendationMetricScope";
import { RecommendationPdfNotice } from "./RecommendationPdfNotice";
import { RecommendationCategoryChart } from "./RecommendationCategoryChart";
import { RecommendationSummary } from "./RecommendationSummary";
import {
  GreenMetricRecommendationEmptyState,
  GreenMetricRecommendationPlan,
} from "./GreenMetricRecommendationPlan";
import { UserChangeImpactSummary } from "./UserChangeImpactSummary";
import type { SavedScenarioSnapshot } from "@/src/types/saved-scenario";
import type { QsCalculationResult } from "@/src/types/qs";
import { SaveScenarioButton } from "@/src/components/scenarios/SaveScenarioButton";
import { translateRecommendationValidationErrors } from "@/src/i18n/recommendation-validation";
import type { AppLanguage } from "@/src/i18n/types";
import { createGreenMetricInstitutionalValues } from "@/src/data/greenmetric.baseline";
import type { TheMetricValues } from "@/src/types/the";
import { getRecommendationCategoryLabel } from "./recommendationCategoryChartData";

export function canRecommendationBeSubmitted(
  currentScore: number | null,
  loading: boolean,
  validationValid: boolean,
) {
  return currentScore !== null && !loading && validationValid;
}

export function RecommendationEnginePage({
  initialMethodology = "the",
  initialTargetMode = "score",
}: {
  initialMethodology?: MethodologyId;
  initialTargetMode?: RecommendationTargetMode;
} = {}) {
  const { t, locale, language } = useAppLanguage();
  const { activeTheYear, getTheYearOverride, activeQsYear, getQsYearData, activeGreenMetricYear, getGreenMetricYearData } = useInstitutionData();
  const { save: saveScenario } = useSavedScenarios();
  const [methodology, setMethodology] = useState<MethodologyId>(
    initialMethodology === "ui-greenmetric" ? "the" : initialMethodology,
  );
  const [target, setTarget] = useState("");
  const [targetMode, setTargetMode] = useState<RecommendationTargetMode>(initialTargetMode);
  const [bestRank, setBestRank] = useState("");
  const [worstRank, setWorstRank] = useState("");
  const [recommendationInputs, setRecommendationInputs] = useState<
    Record<string, RecommendationParameterInput>
  >({});
  const [recommendationParameterIds, setRecommendationParameterIds] = useState<string[]>([]);
  const [result, setResult] = useState<RecommendationEngineResult | null>(null);
  const [alternativePlan, setAlternativePlan] = useState<AlternativeImprovementPlan | null>(null);
  const [recommendationReport, setRecommendationReport] = useState<RecommendationReportModel | null>(null);
  const [submittedErrors, setSubmittedErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioSaveMessage, setScenarioSaveMessage] = useState<string | null>(null);
  const runVersion = useRef(0);

  const baselines = useMemo(() => {
    const qsYear = String(activeQsYear ?? DEFAULT_QS_INSTITUTIONAL_DATA_YEAR) as QsDataYear;
    const qsRawValues = createQsRawRecommendationBaselineValues({
      institutional: getQsYearData(qsYear) as Record<string, unknown>,
      additional: getQsAdditionalBaselineForYear(qsYear),
    });
    return ({
    the: createTheInstitutionalMetricBaseline(
      methodologyRegistry.the.defaults as TheMetricValues,
      activeTheYear === null
        ? null
        : {
            ...getTheInstitutionDataForYear(activeTheYear),
            ...getTheYearOverride(activeTheYear),
          },
    ),
    qs: qsRawValues,
    "ui-greenmetric": createGreenMetricInstitutionalValues(
      activeGreenMetricYear === null ? {} : getGreenMetricYearData(activeGreenMetricYear),
    ),
  });
  }, [activeGreenMetricYear, activeQsYear, activeTheYear, getGreenMetricYearData, getQsYearData, getTheYearOverride]);
  const adapters = useMemo(() => createRecommendationAdapters(baselines, {
    qsInstitutionalYear: Number(activeQsYear ?? DEFAULT_QS_INSTITUTIONAL_DATA_YEAR),
    language,
  }), [activeQsYear, baselines, language]);
  const adapter = adapters[methodology];
  const currentResult = useMemo(
    () => adapter.calculate(adapter.initialValues),
    [adapter],
  );
  const currentScore = adapter.getDisplayedScore(currentResult);
  const currentRankEstimate = adapter.getRankEstimate?.(currentResult) ?? null;
  const numericTarget = target.trim() === "" ? null : Number(target);
  const numericBestRank = bestRank.trim() === "" ? null : Number(bestRank);
  const numericWorstRank = worstRank.trim() === "" ? null : Number(worstRank);
  const scoreGap = calculateRequiredScoreIncrease(currentScore, numericTarget);
  const registryFilteredSelections = filterRecommendationSelectionsToDefinitions(
    recommendationInputs,
    recommendationParameterIds,
    adapter.definitions,
  );
  const sanitizedSelections = methodology === "qs"
    ? sanitizeQsRecommendationSelections(
        registryFilteredSelections.inputs,
        registryFilteredSelections.recommendationParameterIds,
        adapter.definitions,
        adapter.initialValues,
      )
    : registryFilteredSelections;
  const parameterInputs = Object.values(sanitizedSelections.inputs);
  const activeRecommendationParameterIds =
    sanitizedSelections.recommendationParameterIds;
  const selectedRecommendationParameterIds = methodology === "the"
    ? recommendationParameterIds
    : activeRecommendationParameterIds;
  const selectableRecommendationMetricIds = adapter.definitions
    .filter((definition) =>
      definition.affectsTotalScore &&
      definition.isRecommendationCandidate &&
      !definition.defaultLocked &&
      definition.kind !== "direct-score" &&
      definition.eligibleForNumericRecommendation !== false &&
      (methodology !== "qs" || definition.recommendationStatus === "eligible") &&
      isUsableRecommendationBaselineValue(
        adapter.initialValues[definition.engineField] ?? adapter.initialValues[definition.metricId],
      ))
    .map((definition) => definition.metricId);
  const baseValidation = validateRecommendationRequest({
    methodology,
    currentScore,
    targetScore: numericTarget,
    targetMode,
    targetRankRange: {
      bestRank: numericBestRank as number,
      worstRank: numericWorstRank as number,
    },
    rankEstimateAvailable: currentRankEstimate?.available === true,
    scoreMaximum: adapter.scoreMaximum,
    parameters: parameterInputs,
    definitions: adapter.definitions,
    currentValues: adapter.initialValues,
  });
  const qsEmploymentValidation = methodology === "qs"
    ? validateQsEmploymentRecommendationInputs(
        parameterInputs,
        adapter.initialValues,
      )
    : { errors: {}, warnings: [], effectiveValues: adapter.initialValues };
  const qsAggregateValidation = methodology === "qs"
    ? validateQsAggregateRecommendationInputs(
        parameterInputs,
        adapter.definitions,
        adapter.initialValues,
      )
    : {};
  const validation = methodology === "qs"
    ? {
        valid: false,
        errors: {
          ...baseValidation.errors,
          ...qsAggregateValidation,
          ...qsEmploymentValidation.errors,
        },
      }
    : baseValidation;
  validation.valid = Object.keys(validation.errors).length === 0;
  const localizedValidationErrors = translateRecommendationValidationErrors(language, validation.errors);
  const localizedSubmittedErrors = translateRecommendationValidationErrors(language, submittedErrors);
  const rankRangeError = submittedErrors.targetRankRange
    ? t(`recommendationUi.${submittedErrors.targetRankRange}`)
    : null;
  const canSubmit = canRecommendationBeSubmitted(
    currentScore,
    loading,
    validation.valid,
  );

  const resetRecommendationState = () => {
    runVersion.current += 1;
    setTarget("");
    setTargetMode("score");
    setBestRank("");
    setWorstRank("");
    setRecommendationInputs({});
    setRecommendationParameterIds([]);
    setResult(null);
    setAlternativePlan(null);
    setRecommendationReport(null);
    setSubmittedErrors({});
    setLoading(false);
    setReview(false);
    setScenarioName("");
    setScenarioSaveMessage(null);
  };

  const changeMethodology = (value: MethodologyId) => {
    setMethodology(value);
    resetRecommendationState();
  };

  const changeTargetMode = (value: RecommendationTargetMode) => {
    runVersion.current += 1;
    setTargetMode(value);
    setResult(null);
    setAlternativePlan(null);
    setRecommendationReport(null);
    setSubmittedErrors({});
  };

  const changeParameterInput = (input: RecommendationParameterInput) => {
    setRecommendationInputs((current) => ({
      ...current,
      [input.parameterId]: input,
    }));
    setSubmittedErrors((current) => {
      if (!(input.parameterId in current)) return current;
      const next = { ...current };
      delete next[input.parameterId];
      return next;
    });
    setResult(null);
    setRecommendationReport(null);
    if (methodology === "qs") {
      setAlternativePlan(null);
      setReview(false);
    }
  };

  const changeRecommendationParameterIds = (parameterIds: string[]) => {
    setRecommendationParameterIds(parameterIds);
    setResult(null);
    setAlternativePlan(null);
    setRecommendationReport(null);
    setReview(false);
    setSubmittedErrors((current) => {
      if (!("recommendationParameters" in current)) return current;
      const next = { ...current };
      delete next.recommendationParameters;
      return next;
    });
  };

  const run = async () => {
    setSubmittedErrors(validation.errors);
    if (
      !validation.valid ||
      currentScore === null ||
      (targetMode === "score" && numericTarget === null) ||
      (targetMode === "rankRange" && (numericBestRank === null || numericWorstRank === null))
    ) return;

    const version = ++runVersion.current;
    setLoading(true);
    setResult(null);
    setRecommendationReport(null);
    setReview(false);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    try {
      const prepared = prepareRecommendationSimulation(
        adapter.initialValues,
        parameterInputs,
        adapter.definitions,
      );
      const structurallyLockedMetricIds = adapter.definitions
        .filter((definition) =>
          definition.defaultLocked ||
          (methodology !== "ui-greenmetric" && definition.evidenceRequired) ||
          definition.kind === "direct-score")
        .map((definition) => definition.metricId);
      const exactValueMetricIds = parameterInputs
        .filter((input) =>
          input.selected &&
          input.inputMode === "value" &&
          input.value !== undefined)
        .map((input) => input.parameterId);
      const holdCurrentMetricIds = parameterInputs
        .filter((input) => input.selected && input.inputMode === "default")
        .map((input) => input.parameterId);
      const allEligibleParameterIds = adapter.definitions
        .filter((definition) =>
          definition.affectsTotalScore &&
          definition.isRecommendationCandidate &&
          definition.eligibleForNumericRecommendation !== false &&
          (methodology !== "qs" || definition.recommendationStatus === "eligible") &&
          isUsableRecommendationBaselineValue(
            adapter.initialValues[definition.engineField] ?? adapter.initialValues[definition.metricId],
          ) &&
          !structurallyLockedMetricIds.includes(definition.metricId))
        .map((definition) => definition.metricId);
      const resolvedCandidateParameterIds = methodology === "ui-greenmetric"
        ? resolveGreenMetricCandidateParameterIds(
            allEligibleParameterIds,
            parameterInputs,
            activeRecommendationParameterIds,
          )
        : methodology === "qs"
          ? resolveRecommendationCandidateParameterIds(
              allEligibleParameterIds,
              activeRecommendationParameterIds,
            )
          : resolveRecommendationCandidateParameterIds(
              allEligibleParameterIds,
              activeRecommendationParameterIds,
            );
      const userFixedOrHeldMetricIds = new Set([...exactValueMetricIds, ...holdCurrentMetricIds]);
      const candidateParameterIds = excludeUserControlledRecommendationIds(
        resolvedCandidateParameterIds,
        parameterInputs,
      );
      const candidateSet = new Set(candidateParameterIds);
      const lockedMetricIds = adapter.definitions
        .filter((definition) =>
          !candidateSet.has(definition.metricId) ||
          userFixedOrHeldMetricIds.has(definition.metricId))
        .map((definition) => definition.metricId);
      const engineResult = runRecommendationEngine({
        adapter,
        target: targetMode === "score"
          ? { mode: "score", score: numericTarget! }
          : {
              mode: "rankRange",
              range: { bestRank: numericBestRank!, worstRank: numericWorstRank! },
            },
        planningHorizon: RECOMMENDATION_PLANNING_HORIZON,
        strategy: RECOMMENDATION_STRATEGY,
        lockedMetricIds,
        initialValues: prepared.simulatedValues,
        baselineValues: adapter.initialValues,
        constraints: prepared.constraints,
        preferredMetricIds: candidateParameterIds,
      });
      const qsCapability = methodology === "qs"
        ? createQsRawRecommendationAnalysis({
            adapter,
            selectedParameterIds: [...new Set([
              ...candidateParameterIds,
              ...parameterInputs
                .filter((input) => input.selected)
                .map((input) => input.parameterId),
            ])],
            inputs: parameterInputs,
            initialValues: prepared.simulatedValues,
            planningHorizon: RECOMMENDATION_PLANNING_HORIZON,
          })
        : null;
      const resultWithCapability = qsCapability
        ? attachQsCapabilityToRecommendationResult(
            engineResult,
            qsCapability,
            targetMode === "rankRange"
              ? { bestRank: numericBestRank!, worstRank: numericWorstRank! }
              : null,
          )
        : engineResult;
      const alternative = methodology === "qs" && targetMode === "score" &&
        qsCapability?.status === "score-computable"
        ? createQsAlternativeImprovementPlan({
            adapter,
            inputs: parameterInputs,
            recommendationParameterIds: candidateParameterIds,
            targetScore: numericTarget!,
            initialValues: prepared.simulatedValues,
          })
        : null;
      const needsAlternative = alternative?.rangeAssessments.some((assessment) =>
        assessment.scoreImpactInRange <= 0.0001 && assessment.exceedsUserMaximumBy !== null) === true;
      const visibleAlternative = needsAlternative ? alternative : null;
      const alternativeIsBetter = needsAlternative && (alternative?.engineResult.primaryPlan?.recommendedScore ?? -Infinity) >
        (resultWithCapability.primaryPlan?.recommendedScore ?? resultWithCapability.constrainedStartScore) + 0.0001;
      const finalResult = alternativeIsBetter ? alternative!.engineResult : resultWithCapability;
      const qsReportData = methodology === "qs"
        ? (() => {
            const currentCalculation = adapter.calculate(adapter.initialValues) as QsCalculationResult;
            const scenarioValues = finalResult.primaryPlan?.resultingValues ?? prepared.simulatedValues;
            const scenarioCalculation = adapter.calculate(scenarioValues) as QsCalculationResult;
            return {
              current: currentCalculation,
              scenario: {
                ...scenarioCalculation,
                indicatorScores: currentCalculation.indicatorScores,
              },
              currentEmployment: calculateQsEmploymentDiagnostics(adapter.initialValues),
              scenarioEmployment: calculateQsEmploymentDiagnostics(scenarioValues),
            };
          })()
        : undefined;
      const report = methodology === "the" ||
        (methodology === "qs" && finalResult.qsCapability?.projectedScoreAvailable === true)
        ? createRecommendationReportModel({
            result: finalResult,
            methodology,
            language,
            inputs: parameterInputs,
            allowedParameterIds: candidateParameterIds,
            definitions: adapter.definitions,
            institutionalDataYear: methodology === "qs" ? String(activeQsYear ?? DEFAULT_QS_INSTITUTIONAL_DATA_YEAR) : null,
            scoreReferenceEdition: methodology === "qs" ? "QS 2027" : "THE 2026",
            qsData: qsReportData,
            baselineValues: adapter.initialValues,
            validationWarnings: methodology === "qs" ? qsEmploymentValidation.warnings : [],
          })
        : null;
      if (version === runVersion.current) {
        setAlternativePlan(visibleAlternative);
        setResult(finalResult);
        setRecommendationReport(report);
      }
    } finally {
      if (version === runVersion.current) setLoading(false);
    }
  };

  const plan = result?.primaryPlan;
  const hasQsRawChanges = methodology === "qs" && (
    parameterInputs.some((input) =>
      input.selected && input.inputMode === "value" && input.value !== undefined) ||
    (result?.qsCapability?.rawChanges.length ?? 0) > 0
  );
  const qsDisplayStatus = methodology === "qs" && result
    ? classifyQsRecommendationDisplayStatus({
        hasValidationErrors: Object.keys(validation.errors).length > 0,
        currentScore: result.currentScore,
        constrainedStartScore: result.constrainedStartScore,
        recommendedScore: result.primaryPlan?.recommendedScore ?? result.constrainedStartScore,
        targetScore: result.targetScore ?? result.constrainedStartScore,
        hasRawChanges: hasQsRawChanges,
      })
    : null;
  const rawAnalysisOnly = result?.qsCapability?.status === "raw-impact-only" ||
    qsDisplayStatus === "raw-analysis-only";
  const hasFixedQsInputs = methodology === "qs" && parameterInputs.some((input) =>
    input.selected && input.inputMode === "value" && input.value !== undefined);

  const saveRawQsScenario = () => {
    if (!result || methodology !== "qs" || !rawAnalysisOnly || !validation.valid) return;
    const prepared = prepareRecommendationSimulation(adapter.initialValues, parameterInputs, adapter.definitions);
    const baselineCalculation = adapter.calculate(adapter.initialValues) as QsCalculationResult;
    const scenarioCalculation = adapter.calculate(prepared.simulatedValues) as QsCalculationResult;
    const definitionsById = new Map(adapter.definitions.map((definition) => [definition.metricId, definition]));
    const snapshot: SavedScenarioSnapshot = {
      id: crypto.randomUUID(),
      name: scenarioName,
      methodology: "QS",
      source: "raw-analysis",
      institutionalDataYear: String(activeQsYear ?? DEFAULT_QS_INSTITUTIONAL_DATA_YEAR),
      scoreReferenceEdition: "QS 2027",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentScore: result.currentScore,
      scenarioScore: result.constrainedStartScore,
      scoreDifference: result.constrainedStartScore - result.currentScore,
      currentWeightedCompositeScore: baselineCalculation.weightedScore,
      scenarioWeightedCompositeScore: scenarioCalculation.weightedScore,
      currentEstimatedOverallScore: result.currentScore,
      scenarioEstimatedOverallScore: result.constrainedStartScore,
      scoreType: "estimated-overall",
      compositeScoreType: "weighted-indicator-composite",
      currentRankBand: baselineCalculation.publishedRankBand,
      scenarioRankBand: scenarioCalculation.estimatedScenarioRankBand,
      calculationStatus: "raw-analysis-only",
      warnings: [
        "Doğrulanmış QS normalizasyonu bulunmayan gösterge skorları mevcut değerlerinde sabit tutuldu.",
        ...qsEmploymentValidation.warnings,
      ],
      changedMetrics: parameterInputs.flatMap((input) => {
        if (!input.selected || input.inputMode !== "value" || input.value === undefined) return [];
        const definition = definitionsById.get(input.parameterId);
        return [{
          parameterId: input.parameterId,
          label: definition?.label ?? input.parameterId,
          currentValue: adapter.initialValues[definition?.engineField ?? input.parameterId] ?? null,
          scenarioValue: input.value,
        }];
      }),
      currentCategoryScores: adapter.getCategoryScores(baselineCalculation),
      scenarioCategoryScores: adapter.getCategoryScores(scenarioCalculation),
      currentIndicatorScores: baselineCalculation.indicatorScores,
      scenarioIndicatorScores: scenarioCalculation.indicatorScores,
      rawCalculationDetails: {
        currentRawIndicators: baselineCalculation.rawIndicators,
        scenarioRawIndicators: scenarioCalculation.rawIndicators,
        employmentDiagnostics: qsEmploymentValidation.effectiveValues,
        heldConstantIndicators: scenarioCalculation.details.filter((detail) =>
          detail.displayedScenarioScore === detail.publishedBaselineScore).map((detail) => detail.code),
      },
      recommendationContext: {
        fixedValues: parameterInputs.filter((input) => input.selected && input.inputMode === "value"),
        rangeConstraints: parameterInputs.filter((input) => input.selected && input.inputMode === "range"),
        numericPlanCreated: false,
      },
    };
    const error = saveScenario(snapshot);
    setScenarioSaveMessage(error ?? "Senaryo başarıyla kaydedildi.");
  };
  const progress = plan
    ? methodology === "ui-greenmetric" ? [
        { label: t("recommendation.current"), score: plan.currentScore },
        ...plan.changes.map((change, index) => ({ label: String(index + 1), score: change.scoreAfterChange })),
        ...(plan.targetMode === "score" && plan.targetScore !== null
          ? [{ label: t("recommendation.target"), score: plan.targetScore }]
          : []),
      ] : buildRecommendationProgressChartData(result)
    : [];
  return (
    <div className="recommendation-workspace space-y-6 pb-6">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 px-5 py-6 text-white shadow-xl shadow-blue-950/10 sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-cyan-400/15 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-blue-300/10 blur-3xl" aria-hidden="true" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] xl:items-end">
          <div>
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-100 backdrop-blur">
              {t("recommendationUi.workspaceEyebrow")}
            </span>
            <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">{t("recommendation.title")}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
              {targetMode === "rankRange"
                ? t("recommendationUi.rankTargetPageDescription")
                : methodology === "qs"
                  ? t("recommendationUi.qsPageDescription")
                  : t("recommendation.description")}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-2.5">
            <HeroMetric label={t("recommendation.methodology")} value={methodologyLabel(methodology)} />
            <HeroMetric
              label={targetMode === "rankRange" ? t("recommendationUi.currentEstimatedRank") : t("recommendation.currentScore")}
              value={targetMode === "rankRange" ? formatRecommendationRankEstimate(currentRankEstimate) : format(currentScore, locale)}
            />
            <HeroMetric label={t("recommendationUi.targetType")} value={t(targetMode === "score" ? "recommendationUi.targetScoreMode" : "recommendationUi.targetRankMode")} />
            <HeroMetric label={t("recommendationUi.planHorizon")} value={t("recommendationUi.sixMonthHorizon")} />
          </dl>
        </div>
      </header>

      <ol className="grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm" aria-label={t("recommendationUi.workflowSteps")}>
        {[
          { number: "01", label: t("recommendationUi.stepTarget"), active: !result },
          { number: "02", label: t("recommendationUi.stepParameters"), active: !result && activeRecommendationParameterIds.length > 0 },
          { number: "03", label: t("recommendationUi.stepResults"), active: result !== null },
        ].map((step) => <li key={step.number} className={`flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-center text-xs font-semibold sm:text-sm ${step.active ? "bg-blue-50 text-blue-800" : "text-slate-500"}`}>
          <span className={`hidden size-7 shrink-0 items-center justify-center rounded-full text-[11px] sm:flex ${step.active ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-500"}`}>{step.number}</span>
          <span className="truncate">{step.label}</span>
        </li>)}
      </ol>

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-sm font-bold text-white shadow-sm">01</span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">{t("recommendationUi.targetSectionTitle")}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("recommendationUi.targetSectionDescription")}</p>
            </div>
          </div>
        {methodology !== "ui-greenmetric" ? (
          <button
            type="button"
            title={t("recommendationUi.resetHint")}
            onClick={resetRecommendationState}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-white"
          >
            {t("actions.resetAll")}
          </button>
        ) : null}
        </div>
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("recommendation.methodology")}>
              <select
                className="input"
                value={methodology}
                onChange={(event) => changeMethodology(event.target.value as MethodologyId)}
              >
                <option value="the">THE</option>
                <option value="qs">QS</option>
              </select>
            </Field>

            <div className="space-y-2 text-sm font-semibold">
              <p>{t("recommendationUi.targetType")}</p>
              <div className="grid grid-cols-2 rounded-lg border border-slate-300 bg-slate-50 p-1">
                {(["score", "rankRange"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={targetMode === mode}
                    onClick={() => changeTargetMode(mode)}
                    className={`rounded-md px-3 py-2 text-sm ${targetMode === mode ? "bg-white font-semibold text-blue-700 shadow-sm" : "text-slate-600"}`}
                  >
                    {t(mode === "score" ? "recommendationUi.targetScoreMode" : "recommendationUi.targetRankMode")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {targetMode === "score" ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Field label={methodology === "qs" ? t("recommendationUi.currentEstimatedScore") : t("recommendation.currentScore")}>
                <output className="input block bg-slate-50 font-semibold">
                  {format(currentScore, locale)}
                </output>
                <small className="block text-xs font-normal text-slate-500">
                  {t("recommendationUi.calculationSource").replace("{methodology}", methodologyLabel(methodology))}
                </small>
              </Field>
              <Field label={t("recommendation.targetScore")}>
                <input
                  className="input"
                  type="number"
                  value={target}
                  onChange={(event) => {
                    setTarget(event.target.value);
                    setResult(null);
                    setAlternativePlan(null);
                    setRecommendationReport(null);
                    setSubmittedErrors({});
                  }}
                  min={adapter.scoreMinimum}
                  max={adapter.scoreMaximum}
                  step={methodology === "ui-greenmetric" ? 1 : 0.1}
                />
                {methodology === "qs" ? <small className="block text-xs text-slate-500">{t("recommendationUi.targetPlanningHint")}</small> : null}
                {localizedSubmittedErrors.targetScore ? (
                  <small className="block text-xs font-medium text-red-700">{localizedSubmittedErrors.targetScore}</small>
                ) : null}
              </Field>
              <Field label={methodology === "qs" ? t("recommendationUi.qsRequiredIncrease") : t("recommendationUi.requiredIncrease")}>
                <output className="input block bg-slate-50 font-semibold">
                  {format(scoreGap === null ? null : Math.max(0, scoreGap), locale)}
                </output>
              </Field>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <article className="min-w-0 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  {t("recommendationUi.currentEstimatedRank")}
                </p>
                <output className="mt-2 block text-2xl font-bold tracking-tight text-slate-950">
                  {formatRecommendationRankEstimate(currentRankEstimate)}
                </output>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  {t("recommendationUi.rankCalculationSource").replace("{methodology}", methodologyLabel(methodology))}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {t("recommendationUi.currentEstimatedScoreSecondary")}: {format(currentScore, locale)}
                </p>
                {currentRankEstimate?.available !== true ? (
                  <p className="mt-2 text-xs font-medium text-amber-700">
                    {t(methodology === "qs"
                      ? "recommendationUi.qsRankRecommendationUnavailableExplanation"
                      : "recommendationUi.rankTargetUnavailable")}
                  </p>
                ) : null}
              </article>

              <fieldset className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5">
                <legend className="px-1 text-sm font-semibold text-slate-900">
                  {t("recommendationUi.targetRankRange")}
                </legend>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
                  <Field label={t("recommendationUi.bestRank")}>
                    <input
                      className="input"
                      type="number"
                      value={bestRank}
                      placeholder={t("recommendationUi.bestRankPlaceholder")}
                      min={1}
                      step={1}
                      onChange={(event) => {
                        setBestRank(event.target.value);
                        setResult(null);
                        setAlternativePlan(null);
                        setRecommendationReport(null);
                        setSubmittedErrors({});
                      }}
                    />
                  </Field>
                  <span className="hidden pb-2 text-lg text-slate-400 sm:block" aria-hidden="true">—</span>
                  <Field label={t("recommendationUi.worstRank")}>
                    <input
                      className="input"
                      type="number"
                      value={worstRank}
                      placeholder={t("recommendationUi.worstRankPlaceholder")}
                      min={1}
                      step={1}
                      onChange={(event) => {
                        setWorstRank(event.target.value);
                        setResult(null);
                        setAlternativePlan(null);
                        setRecommendationReport(null);
                        setSubmittedErrors({});
                      }}
                    />
                  </Field>
                </div>
                <p className="mt-3 text-xs text-slate-600">{t("recommendationUi.rankDirectionHelp")}</p>
                {rankRangeError ? <p className="mt-2 text-xs font-medium text-red-700">{rankRangeError}</p> : null}
              </fieldset>
            </div>
          )}

        </div>
        {methodology !== "qs" ? (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/60 px-4 py-3 text-amber-950">
            <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">i</span>
            <p className="text-xs leading-5">{t("recommendationUi.assumptions").replace("{count}", String(RECOMMENDATION_HORIZON_MONTHS))}</p>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-start gap-3 px-1">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-600 text-sm font-bold text-white shadow-sm">02</span>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{t("recommendationUi.parameterSectionTitle")}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("recommendationUi.parameterSectionDescription")}</p>
          </div>
        </div>
        <RecommendationMetricScope
          definitions={adapter.definitions}
          currentValues={adapter.initialValues}
          inputs={recommendationInputs}
          errors={{ ...localizedSubmittedErrors, ...localizedValidationErrors }}
          onChange={changeParameterInput}
          recommendationParameterIds={selectedRecommendationParameterIds}
          onRecommendationParameterIdsChange={changeRecommendationParameterIds}
          targetMode={targetMode}
          recommendationSelectableMetricIds={selectableRecommendationMetricIds}
        />
      </section>

      <section className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-slate-700/50 bg-slate-950/95 px-4 py-3.5 text-white shadow-2xl shadow-slate-950/25 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t("recommendationUi.actionTitle")}</p>
          <p className="mt-0.5 truncate text-xs text-slate-300">
            {selectedRecommendationParameterIds.length > 0
              ? t("recommendationUi.actionSelected").replace("{count}", String(selectedRecommendationParameterIds.length))
              : t("recommendationUi.actionAutomatic").replace("{count}", String(selectableRecommendationMetricIds.length))}
          </p>
        </div>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={run}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-blue-950/20 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          <span>{loading ? t("recommendation.loading") : t("recommendation.generate")}</span>
          <span aria-hidden="true">→</span>
        </button>
      </section>
      {(methodology === "the" || methodology === "qs") && localizedSubmittedErrors.recommendationParameters ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {localizedSubmittedErrors.recommendationParameters}
        </p>
      ) : null}
      {methodology === "qs" && (Object.keys(qsEmploymentValidation.errors).length > 0 || Object.keys(qsAggregateValidation).length > 0) ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>QS parametrelerinde birbirine bağlı tutarsız değerler bulunuyor.</p>
          <p className="mt-1">Hata rozeti bulunan bağımlı parametre grubundaki işaretlenen alanları düzeltin.</p>
          <p className="mt-1 font-semibold">Parametre hataları düzeltilmeden QS önerisi oluşturulamaz.</p>
        </section>
      ) : null}
      {methodology === "qs" ? qsEmploymentValidation.warnings.map((warning) => (
        <p key={warning} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warning}
        </p>
      )) : null}

      {targetMode === "score" && target !== "" && currentScore !== null && numericTarget !== null &&
      numericTarget <= currentScore ? (
        <p className="text-sm text-amber-700">
          Hedef skor mevcut skorunuzdan yüksek olmalıdır.
        </p>
      ) : null}

      {result ? (
        <>
          <section className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 px-1 pb-4 pt-2">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-bold text-white shadow-sm">03</span>
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{t("recommendationUi.resultSectionTitle")}</h2>
                <p className="mt-1 text-sm text-slate-500">{t("recommendationUi.resultSectionDescription")}</p>
              </div>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${result.calculationAvailability === "score-unavailable" ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>{t(result.calculationAvailability === "score-unavailable" ? "recommendationUi.analysisUnavailable" : "recommendationUi.analysisReady")}</span>
          </section>
          <RecommendationSummary result={result} locale={locale} t={t} rawAnalysisOnly={rawAnalysisOnly} alternativePlan={methodology === "qs" && alternativePlan !== null} />
          <UserChangeImpactSummary
            adapter={adapter}
            inputs={parameterInputs}
            language={language}
          />
          {methodology === "qs" && alternativePlan ? (
            <AlternativeImprovementPlanCard
              alternative={alternativePlan}
              result={result}
              definitions={adapter.definitions}
              baselineValues={adapter.initialValues}
              locale={locale}
              t={t}
            />
          ) : methodology !== "ui-greenmetric" ? (
            <RangeConstraintNotices
              inputs={parameterInputs}
              plan={plan ?? null}
              definitions={adapter.definitions}
            />
          ) : null}
          {result.targetMode === "score" && methodology !== "ui-greenmetric" && methodology !== "qs" && !rawAnalysisOnly ? <OutcomeNotice result={result} /> : null}
          {methodology !== "ui-greenmetric" &&
          result.constrainedStartScore < result.currentScore - 0.0001 ? (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
              Kullanıcı tarafından girilen sabit değerler mevcut skoru{" "}
              {formatRecommendationScore(result.currentScore - result.constrainedStartScore)} puan düşürüyor.
              Bu sabit değişiklik tahmini {methodologyLabel(methodology)} skorunu düşürüyor.
            </section>
          ) : null}
          {rawAnalysisOnly ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
              <h2 className="font-semibold">{t("recommendationUi.qsRawImprovementPlan")}</h2>
              <p className="mt-2">{t("recommendationUi.qsRawImpactOnlyMessage")}</p>
              <p className="mt-2 font-medium">{t("recommendationUi.qsNoVerifiableOverall")}</p>
              {result.qsCapability ? (
                <QsRawRecommendationImpact
                  capability={result.qsCapability}
                  locale={locale}
                  t={t}
                />
              ) : null}
              <p className="mt-3 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-xs">{t("recommendationUi.qsSixMonthNotice")}</p>
              {hasFixedQsInputs ? <button type="button" onClick={() => setReview((value) => !value)} className="mt-3 rounded-lg border border-amber-700 px-3 py-2 font-semibold">Senaryo Olarak İncele</button> : null}
              {review && hasFixedQsInputs ? <div className="mt-4 rounded-lg bg-white p-4"><ScenarioPreviewDetails inputs={parameterInputs} plan={null} definitions={adapter.definitions} baselineValues={adapter.initialValues} /><label className="mt-3 block font-semibold">Senaryo adı<input value={scenarioName} maxLength={100} onChange={(event) => setScenarioName(event.target.value)} className="input mt-1 w-full" /></label><button type="button" onClick={saveRawQsScenario} className="mt-3 rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white">Kaydet ve Senaryolara Ekle</button>{scenarioSaveMessage ? <p className="mt-2" role="status">{scenarioSaveMessage} {scenarioSaveMessage === "Senaryo başarıyla kaydedildi." ? <Link className="font-semibold text-blue-700" href="/scenario-comparison">Senaryolarda Görüntüle</Link> : null}</p> : null}</div> : null}
            </section>
          ) : plan ? (
            <>
              {methodology === "ui-greenmetric" ? (
                <GreenMetricRecommendationPlan
                  plan={plan}
                  definitions={adapter.definitions}
                  locale={locale}
                  language={language}
                  t={t}
                />
              ) : (
                <PlanTable
                  plan={plan}
                  t={t}
                  baselineValues={adapter.initialValues}
                  definitions={adapter.definitions}
                  enhanced
                  parameterInputs={parameterInputs}
                  language={language}
                  locale={locale}
                  methodology={methodology}
                />
              )}
              {plan.recommendedScore < plan.currentScore - 0.0001 ? (
                <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
                  <p>
                    Öneriler, kullanıcı değerleri sonrasındaki skoru artırdı; ancak sonuç
                    kurumsal mevcut skorun{" "}
                    {formatRecommendationScore(Math.max(0, plan.currentScore - plan.recommendedScore))} puan
                    altında kalıyor.
                  </p>
                </section>
              ) : null}
              <div className="grid gap-5 xl:grid-cols-2">
                <Chart title={t("recommendation.progressChart")}>
                  <LineChart data={progress}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis
                      domain={methodology !== "ui-greenmetric"
                        ? calculateRecommendationChartDomain(progress)
                        : undefined}
                      allowDataOverflow={methodology !== "ui-greenmetric"}
                    />
                    <Tooltip formatter={(value) =>
                      methodology === "ui-greenmetric"
                        ? format(typeof value === "number" ? value : null, locale)
                        : formatRecommendationScore(typeof value === "number" ? value : null)}
                    />
                    {plan.targetMode === "score" && plan.targetScore !== null ? (
                      <ReferenceLine y={plan.targetScore} stroke="#dc2626" />
                    ) : null}
                    <Line dataKey="score" stroke="#059669" isAnimationActive={false} />
                  </LineChart>
                </Chart>
                <RecommendationCategoryChart
                  methodology={methodology}
                  current={plan.currentCategoryScores}
                  constrained={methodology === "ui-greenmetric" ? undefined : plan.constrainedCategoryScores}
                  recommended={plan.resultingCategoryScores}
                  language={language}
                  t={t}
                />
              </div>
              <button
                type="button"
                onClick={() => setReview((value) => !value)}
                className="rounded-xl border border-blue-700 px-4 py-2 font-semibold text-blue-700"
              >
                {t("recommendation.review")}
              </button>
              {review ? (
                <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                  <h2 className="font-semibold">{t("recommendation.applyPreview")}</h2>
                  <ScenarioPreviewDetails
                    inputs={parameterInputs}
                    plan={plan}
                    definitions={adapter.definitions}
                    baselineValues={adapter.initialValues}
                  />
                  <div className="mt-3"><SaveScenarioButton createSnapshot={(name) => ({
                    id: crypto.randomUUID(), name,
                    methodology: methodology === "the" ? "THE" : methodology === "qs" ? "QS" : "GREENMETRIC",
                    source: "recommendation-engine",
                    institutionalDataYear: methodology === "qs" ? String(activeQsYear ?? DEFAULT_QS_INSTITUTIONAL_DATA_YEAR) : null,
                    scoreReferenceEdition: methodology === "the" ? "THE 2026" : methodology === "qs" ? "QS 2027" : "UI GreenMetric 2026",
                    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                    currentScore: plan.currentScore, scenarioScore: plan.recommendedScore,
                    scoreDifference: plan.recommendedScore - plan.currentScore,
                    ...(methodology === "qs" ? {
                      currentWeightedCompositeScore: null,
                      scenarioWeightedCompositeScore: null,
                      currentEstimatedOverallScore: plan.currentScore,
                      scenarioEstimatedOverallScore: plan.recommendedScore,
                      scoreType: "estimated-overall" as const,
                      compositeScoreType: "weighted-indicator-composite" as const,
                    } : {}),
                    currentRankBand: plan.currentRankEstimate?.band ?? null,
                    scenarioRankBand: plan.recommendedRankEstimate?.band ?? null,
                    calculationStatus: "complete", warnings: result.warnings,
                    changedMetrics: plan.changes.map((change) => ({ parameterId: change.metricId, label: change.label.tr, currentValue: change.currentValue, scenarioValue: change.recommendedValue })),
                    currentCategoryScores: plan.currentCategoryScores,
                    scenarioCategoryScores: plan.resultingCategoryScores,
                    currentIndicatorScores: null, scenarioIndicatorScores: null,
                    rawCalculationDetails: null,
                    recommendationContext: {
                      fixedValues: parameterInputs.filter((input) => input.selected && input.inputMode === "value"),
                      rangeConstraints: parameterInputs.filter((input) => input.selected && input.inputMode === "range"),
                      recommendationPlan: plan.changes,
                      targetMode: plan.targetMode,
                      targetScore: plan.targetScore,
                      targetRankRange: plan.targetRankRange,
                      currentRankEstimate: plan.currentRankEstimate,
                      recommendedRankEstimate: plan.recommendedRankEstimate,
                      rankTargetEvaluation: plan.rankTargetEvaluation,
                    },
                  })} /></div>
                  <p className="mt-2 text-xs text-amber-800">
                    {t("recommendation.applyNotice")}
                  </p>
                </section>
              ) : null}
            </>
          ) : result.targetMode === "rankRange" ? null : methodology === "qs" && alternativePlan ? null : methodology === "ui-greenmetric" ? (
            <GreenMetricRecommendationEmptyState
              result={result}
              inputs={parameterInputs}
              recommendationParameterIds={activeRecommendationParameterIds}
              t={t}
            />
          ) : (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-semibold">{t("recommendation.unreachable")}</h2>
              <p className="mt-2 text-sm">
                {methodology === "qs"
                  ? "Hedefe ulaşmak için haricî veya doğrulanmış kalibrasyon verilerinde iyileşme gerekiyor."
                  : parameterInputs.some((input) =>
                      input.selected && input.inputMode === "range")
                    ? "Belirlenen değer aralıkları hedef skora ulaşmak için yeterli değil."
                    : parameterInputs.some((input) =>
                        input.selected && input.inputMode === "value")
                      ? "Kullanıcı tarafından sabitlenen değerlerle hedefe ulaşılamıyor."
                    : activeRecommendationParameterIds.length > 0
                        ? "Seçilen öneri parametrelerinin hesaplanabilir etkisi hedef için yeterli değil."
                        : "Hedefe ulaşmak için haricî bibliyometrik, itibar veya kalibrasyon verilerinde iyileşme gerekiyor."}
              </p>
              <p className="mt-2 text-sm">
                {t("recommendation.maximumReachable")}:{" "}
                {format(result.reachability.maximumReachableScore, locale)}
              </p>
            </section>
          )}
        </>
      ) : null}
      {!result && (methodology === "the" || methodology === "qs") &&
      parameterInputs.some((input) =>
        input.selected && input.inputMode === "value" && input.value !== undefined) ? (
        <UserChangeImpactSummary
          adapter={adapter}
          inputs={parameterInputs}
          language={language}
        />
      ) : null}
      <RecommendationPdfNotice model={recommendationReport} language={language} t={t} />
    </div>
  );
}

export function calculateRequiredScoreIncrease(currentScore: number | null, targetScore: number | null) {
  if (currentScore === null || targetScore === null || !Number.isFinite(currentScore) || !Number.isFinite(targetScore)) return null;
  return Math.max(0, targetScore - currentScore);
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-2xl border border-white/10 bg-white/10 px-3.5 py-3 backdrop-blur-sm">
    <dt className="truncate text-[10px] font-semibold uppercase tracking-wider text-blue-200">{label}</dt>
    <dd className="mt-1 truncate text-sm font-bold text-white sm:text-base">{value}</dd>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="min-w-0 space-y-2 text-sm font-semibold">
      <span>{label}</span>
      {children}
    </label>
  );
}

function methodologyLabel(methodology: MethodologyId) {
  if (methodology === "ui-greenmetric") return "UI GreenMetric";
  return methodology.toUpperCase();
}

function isUsableRecommendationBaselineValue(value: unknown) {
  return typeof value === "number" ? Number.isFinite(value) :
    typeof value === "boolean" || typeof value === "string";
}

function format(value: number | null, locale: string) {
  return value === null || !Number.isFinite(value)
    ? "—"
    : value.toLocaleString(locale, { maximumFractionDigits: 2 });
}

function QsRawRecommendationImpact({
  capability,
  locale,
  t,
}: {
  capability: QsRecommendationCapabilityResult;
  locale: string;
  t: (key: string) => string;
}) {
  if (!capability.rawChanges.length) return null;
  return (
    <section className="mt-4 rounded-xl border border-amber-300 bg-white p-4">
      <h3 className="font-semibold text-slate-950">{t("recommendationUi.qsRawImpactTitle")}</h3>
      <p className="mt-1 text-xs text-slate-600">{t("recommendationUi.qsRawSensitivityNotice")}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {capability.rawChanges.map((change) => (
          <article key={change.metricId} className="rounded-lg border border-slate-200 p-3">
            <p className="font-semibold text-slate-900">{change.label}</p>
            <p className="mt-1 text-sm">
              {change.currentValue.toLocaleString(locale)} → {change.candidateValue.toLocaleString(locale)}
            </p>
            {change.indicatorChanges.length ? (
              <ul className="mt-2 space-y-1 text-xs text-slate-700">
                {change.indicatorChanges.map((indicator) => (
                  <li key={indicator.code}>
                    <strong>{indicator.code}:</strong> {formatQsRawRatio(indicator.current)} → {formatQsRawRatio(indicator.projected)} ({formatQsRawRatioDifference(indicator.difference)})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-slate-600">Doğrulanmış genel skor etkisi üretilemedi.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function AlternativeImprovementPlanCard({
  alternative,
  result,
  definitions,
  baselineValues,
  locale,
  t,
}: {
  alternative: AlternativeImprovementPlan;
  result: RecommendationEngineResult;
  definitions: RecommendationMetricDefinition[];
  baselineValues: Record<string, unknown>;
  locale: string;
  t: (key: string) => string;
}) {
  const definitionById = new Map(definitions.map((definition) => [definition.metricId, definition]));
  const rangeIds = new Set(alternative.rangeAssessments.map((assessment) => assessment.metricId));
  const supportingChanges = result.primaryPlan?.changes.filter((change) => !rangeIds.has(change.metricId)) ?? [];
  const finalScore = result.primaryPlan?.recommendedScore ?? result.reachability.maximumReachableScore;
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
      <h2 className="text-lg font-semibold">{t("recommendationUi.alternativeImprovementPlan")}</h2>
      <div className="mt-4 space-y-4">
        {alternative.rangeAssessments.map((assessment) => {
          const definition = definitionById.get(assessment.metricId);
          const currentValue = baselineValues[definition?.engineField ?? assessment.metricId];
          const finalValue = result.primaryPlan?.resultingValues[definition?.engineField ?? assessment.metricId]
            ?? assessment.positiveThreshold ?? assessment.bestValueInRange;
          return (
            <article key={assessment.metricId} className="rounded-xl border border-amber-200 bg-white p-4">
              <h3 className="font-semibold">{definition?.label ?? assessment.metricId}</h3>
              <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                <PlanValue label={t("recommendationUi.alternativeCurrentValue")} value={formatRecommendationValue(currentValue)} />
                <PlanValue label={t("recommendationUi.alternativeUserRange")} value={`${formatRecommendationValue(assessment.minimumValue)}–${formatRecommendationValue(assessment.maximumValue)}`} />
                <PlanValue label={t("recommendationUi.alternativeBestInRange")} value={formatRecommendationValue(assessment.bestValueInRange)} />
                <PlanValue label={t("recommendationUi.alternativeRangeImpact")} value={signedScore(assessment.scoreImpactInRange)} />
                <PlanValue label={t("recommendationUi.alternativePositiveThreshold")} value={formatRecommendationValue(assessment.positiveThreshold)} />
                <PlanValue label={t("recommendationUi.alternativeFinalValue")} value={formatRecommendationValue(finalValue)} />
                <PlanValue label={t("recommendationUi.alternativeEstimatedImpact")} value={signedScore(assessment.thresholdImpact)} />
              </dl>
              {assessment.exceedsUserMaximumBy !== null ? (
                <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2">
                  {t("recommendationUi.alternativeLimitExceeded")
                    .replace("{maximum}", formatRecommendationValue(assessment.maximumValue))
                    .replace("{required}", formatRecommendationValue(assessment.positiveThreshold))
                    .replace("{difference}", formatRecommendationValue(assessment.exceedsUserMaximumBy))}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
      <h3 className="mt-4 font-semibold">{t("recommendationUi.alternativeSupportingChanges")}</h3>
      {supportingChanges.length ? (
        <ul className="mt-2 space-y-1">
          {supportingChanges.map((change) => (
            <li key={change.metricId}>{change.label[locale.startsWith("tr") ? "tr" : "en"]}: {formatRecommendationValue(change.currentValue)} → {formatRecommendationValue(change.recommendedValue)}</li>
          ))}
        </ul>
      ) : <p className="mt-2">{t("recommendationUi.alternativeNoSupportingChanges")}</p>}
      <h3 className="mt-4 font-semibold">{t("recommendationUi.alternativeResult")}</h3>
      <dl className="mt-2 grid gap-1 sm:grid-cols-2">
        <PlanValue label={t("recommendationUi.alternativeCurrentScore")} value={format(result.currentScore, locale)} />
        <PlanValue label={t("recommendationUi.alternativeEstimatedScore")} value={format(finalScore, locale)} />
        <PlanValue label={t("recommendationUi.alternativeTotalIncrease")} value={signedScore(finalScore - result.currentScore)} />
        <PlanValue label={t("recommendationUi.alternativeRemainingGap")} value={format(Math.max(0, (result.targetScore ?? finalScore) - finalScore), locale)} />
      </dl>
    </section>
  );
}

function PlanValue({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-slate-500">{label}</dt><dd className="font-medium">{value}</dd></div>;
}

function signedScore(value: number | null) {
  return value === null || !Number.isFinite(value) ? "—" : `${value > 0 ? "+" : ""}${formatRecommendationScore(value)}`;
}

export function formatSignedDisplayedScoreImpact(before: number, after: number, approximate = false) {
  const difference = calculateDisplayedScoreDifference(before, after);
  return difference === null
    ? "—"
    : `${approximate ? "≈ " : ""}${difference > 0 ? "+" : ""}${formatRecommendationScore(difference)}`;
}

export function calculateRecommendationChartDomain(
  data: { score: number }[],
): [number, number] | undefined {
  const scores = data.map((item) => item.score).filter(Number.isFinite);
  if (scores.length === 0) return undefined;
  const minimum = Math.min(...scores);
  const maximum = Math.max(...scores);
  const padding = Math.max(0.05, (maximum - minimum) * 0.2);
  return [
    Math.floor((minimum - padding) * 100) / 100,
    Math.ceil((maximum + padding) * 100) / 100,
  ];
}

export const calculateQsRecommendationChartDomain = calculateRecommendationChartDomain;

export function excludeUserControlledRecommendationIds(
  candidateIds: string[],
  inputs: RecommendationParameterInput[],
) {
  const controlledIds = new Set(inputs
    .filter((input) => input.selected &&
      (input.inputMode === "value" || input.inputMode === "default"))
    .map((input) => input.parameterId));
  return candidateIds.filter((metricId) => !controlledIds.has(metricId));
}

function OutcomeNotice({ result }: { result: RecommendationEngineResult }) {
  const status = classifyRecommendationOutcome(result);
  const relations = getRecommendationScoreRelations(result);
  const content = {
    reached: {
      title: "Hedefe ulaşıldı",
      description: "Öneri planı hedef skora ulaşıyor veya hedef skoru aşıyor.",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
    },
    "limited-improvement": {
      title: "Sınırlı iyileşme sağlandı, hedefe ulaşılamadı",
      description: "Öneriler kullanıcı değerleri sonrasındaki skoru artırdı; ancak hedef skor için mevcut parametre ve veri kısıtları yeterli değil.",
      tone: "border-amber-200 bg-amber-50 text-amber-900",
    },
    "no-positive-improvement": {
      title: "Pozitif iyileşme üretilemedi",
      description: "Seçilen parametreler ve belirlenen kısıtlarla skoru artıran uygulanabilir bir öneri oluşturulamadı.",
      tone: "border-slate-300 bg-slate-50 text-slate-900",
    },
  }[status];
  return (
    <section className={`rounded-2xl border p-5 text-sm ${content.tone}`}>
      <h2 className="font-semibold">{content.title}</h2>
      <p className="mt-2">{content.description}</p>
      <p className="mt-2">Hedefe kalan fark: {formatRecommendationScore(relations.remainingTargetGap)}</p>
    </section>
  );
}

function RangeConstraintNotices({
  inputs,
  plan,
  definitions,
}: {
  inputs: RecommendationParameterInput[];
  plan: RecommendationEngineResult["primaryPlan"];
  definitions: { metricId: string; label: string }[];
}) {
  const appliedIds = new Set(plan?.changes.map((change) => change.metricId) ?? []);
  const labelById = new Map(definitions.map((item) => [item.metricId, item.label]));
  const unusedRanges = inputs.filter((input) =>
    input.selected &&
    input.inputMode === "range" &&
    input.min !== undefined &&
    input.max !== undefined &&
    !appliedIds.has(input.parameterId));
  if (!unusedRanges.length) return null;
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      <h2 className="font-semibold">Uygulanamayan öneri aralıkları</h2>
      <ul className="mt-2 space-y-2">
        {unusedRanges.map((input) => (
          <li key={input.parameterId}>
            {labelById.get(input.parameterId) ?? input.parameterId} için{" "}
            {formatRecommendationValue(input.min)}–{formatRecommendationValue(input.max)}{" "}
            aralığı tanımlandı ancak aralık içinde pozitif katkı sağlayan uygulanabilir
            bir öneri bulunamadı.
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlanTable({
  plan,
  t,
  baselineValues,
  definitions,
  enhanced,
  parameterInputs,
  language,
  locale,
  methodology,
}: {
  plan: NonNullable<RecommendationEngineResult["primaryPlan"]>;
  t: (key: string) => string;
  baselineValues: Record<string, unknown>;
  definitions: RecommendationMetricDefinition[];
  enhanced: boolean;
  parameterInputs: RecommendationParameterInput[];
  language: AppLanguage;
  locale: string;
  methodology: MethodologyId;
}) {
  const engineFieldByMetricId = new Map(
    definitions.map((definition) => [definition.metricId, definition.engineField]),
  );
  const rangeMetricIds = new Set(parameterInputs
    .filter((input) => input.selected && input.inputMode === "range")
    .map((input) => input.parameterId));
  if (plan.targetMode === "rankRange") {
    return (
      <RankRecommendationCards
        plan={plan}
        definitions={definitions}
        language={language}
        locale={locale}
        methodology={methodology}
        t={t}
        parameterInputs={parameterInputs}
      />
    );
  }
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold">{t("recommendation.plan")}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-y bg-slate-50">
              {[
                "#",
                t("recommendation.metric"),
                ...(enhanced ? ["Kaynak"] : []),
                t("recommendation.current"),
                ...(enhanced ? ["Kullanıcı sonrası değer"] : []),
                t("recommendation.recommended"),
                t("recommendationUi.recommendedChange"),
                t("recommendation.impact"),
                "Öneri sonrası tahmini skor",
                "Hedefe kalan fark",
                t(methodology === "the" ? "recommendationUi.estimatedEffort" : "recommendation.effort"),
                t(methodology === "the" ? "recommendationUi.estimatedConfidence" : "recommendation.confidence"),
              ].map((title) => (
                <th key={title} className="px-3 py-2">{title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.changes.map((change, index) => (
              <tr key={change.metricId} className="border-b">
                <td className="sticky left-0 bg-white px-3 py-2">{index + 1}</td>
                <th className="sticky left-10 min-w-52 bg-white px-3 py-2">{change.label.tr}</th>
                {enhanced ? (
                  <td className="px-3 py-2">
                    <span className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">
                      {rangeMetricIds.has(change.metricId) ? "Kullanıcı aralığı" : "Motor önerisi"}
                    </span>
                  </td>
                ) : null}
                <td className="px-3 py-2">{enhanced
                  ? formatRecommendationValue(baselineValues[engineFieldByMetricId.get(change.metricId) ?? change.metricId])
                  : String(baselineValues[engineFieldByMetricId.get(change.metricId) ?? change.metricId])}</td>
                {enhanced ? <td className="px-3 py-2">{formatRecommendationValue(change.currentValue)}</td> : null}
                <td className="px-3 py-2">{enhanced ? formatRecommendationValue(change.recommendedValue) : String(change.recommendedValue)}</td>
                <td className="px-3 py-2">
                  {change.absoluteChange === null ? "—" : enhanced ? formatRecommendationValue(change.absoluteChange) : String(change.absoluteChange)}
                </td>
                <td className="px-3 py-2">{enhanced ? formatSignedDisplayedScoreImpact(change.scoreBeforeChange, change.scoreAfterChange, methodology === "qs") : change.incrementalScoreImpact.toFixed(2)}</td>
                <td className="px-3 py-2">{enhanced ? formatRecommendationScore(change.scoreAfterChange) : change.scoreAfterChange.toFixed(2)}</td>
                <td className="px-3 py-2">
                  {enhanced
                    ? formatRecommendationScore(Math.max(0, (plan.targetScore ?? change.scoreAfterChange) - change.scoreAfterChange))
                    : Math.max(0, (plan.targetScore ?? change.scoreAfterChange) - change.scoreAfterChange).toFixed(2)}
                </td>
                <td className="px-3 py-2"><LevelBadge level={change.effort} language={language} tone="effort" /></td>
                <td className="px-3 py-2"><LevelBadge level={change.confidence} language={language} tone="confidence" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {enhanced ? (
        <div className="mt-3 space-y-1 text-xs text-slate-500">
        <p>
          {methodology === "qs"
            ? "≈ işareti, düşük güvenli model etkisinin iki ondalıkta yaklaşık gösterildiğini belirtir; 0,00 etkili adımlar plana alınmaz."
            : "Skor etkileri görüntüleme amacıyla yuvarlanmıştır; final skor hesaplama motorunun tam hassasiyetli sonucudur."}
        </p>
        {methodology === "the" ? <p>{t("recommendationUi.effortConfidenceNotice")}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

export function RankRecommendationCards({
  plan,
  definitions,
  language,
  locale,
  methodology,
  t,
  parameterInputs = [],
}: {
  plan: NonNullable<RecommendationEngineResult["primaryPlan"]>;
  definitions: RecommendationMetricDefinition[];
  language: AppLanguage;
  locale: string;
  methodology: MethodologyId;
  t: (key: string) => string;
  parameterInputs?: RecommendationParameterInput[];
}) {
  const definitionById = new Map(definitions.map((definition) => [definition.metricId, definition]));
  const currentRank = formatRecommendationRankEstimate(plan.currentRankEstimate ?? null);
  const projectedRank = formatRecommendationRankEstimate(plan.recommendedRankEstimate ?? null);
  const rankImpact = t("recommendationUi.totalProjectedRankImpact")
    .replace("{current}", currentRank)
    .replace("{projected}", projectedRank);
  const targetNotReached = plan.reachedTarget === false;
  const inputById = new Map(parameterInputs.map((input) => [input.parameterId, input]));
  return (
    <section className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${targetNotReached ? "border-amber-300 bg-amber-50/60" : "border-slate-200 bg-white"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-950">{t("recommendation.plan")}</h2>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {plan.changes.length} {t("recommendation.changedMetrics")}
          </span>
          {targetNotReached ? <span className="rounded-full bg-amber-200 px-2.5 py-1 text-xs font-bold text-amber-950">{t("recommendationUi.bestEffortRankPlan")}</span> : null}
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {plan.changes.map((change) => {
          const definition = definitionById.get(change.metricId);
          const category = change.categoryId
            ? getRecommendationCategoryLabel(methodology, change.categoryId, language).label
            : null;
          const indicatorCodes = change.indicatorCode ? [change.indicatorCode] : [];
          const input = inputById.get(change.metricId);
          const reachedUserMaximum = input?.inputMode === "range" &&
            typeof input.max === "number" && typeof change.recommendedValue === "number" &&
            Math.abs(input.max - change.recommendedValue) <= Math.max(1e-9, Math.abs(input.max) * 1e-9);
          const displayedImpact = calculateDisplayedScoreDifference(
            change.scoreBeforeChange,
            change.scoreAfterChange,
          );
          return (
            <article key={change.metricId} className={`min-w-0 rounded-xl border p-4 ${targetNotReached ? "border-amber-300 bg-white" : "border-slate-200"}`}>
              <h3 className="break-words text-sm font-semibold text-slate-950 sm:text-base">
                {change.label[language] ?? definition?.label ?? change.metricId}
              </h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <RankChangeValue label={t("recommendation.current")} value={formatRankChangeValue(change.currentValue, definition, locale)} />
                <RankChangeValue label={t("recommendation.recommended")} value={formatRankChangeValue(change.recommendedValue, definition, locale)} emphasis />
                <RankChangeValue label={t("recommendationUi.recommendedChange")} value={formatSignedRankChange(change.absoluteChange, definition, locale)} />
                <RankChangeValue label={t("recommendationUi.calculatedScoreImpact")} value={`${(displayedImpact ?? 0) > 0 ? "+" : ""}${formatRecommendationScore(displayedImpact)}`} />
              </dl>
              <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <div className="mb-3 flex flex-wrap gap-2">
                  <LevelBadge level={change.effort} language={language} tone="effort" prefix={t(methodology === "the" ? "recommendationUi.estimatedEffort" : "recommendation.effort")} />
                  <LevelBadge level={change.risk} language={language} tone="risk" prefix="Risk" />
                  <LevelBadge level={change.confidence} language={language} tone="confidence" prefix={t(methodology === "the" ? "recommendationUi.estimatedConfidence" : "recommendation.confidence")} />
                </div>
                {indicatorCodes.length ? (
                  <div>
                    <p className="font-medium text-slate-700">{t("recommendationUi.affectedIndicators")}</p>
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {indicatorCodes.map((code) => (
                        <li key={code} className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">{code}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p>{t("recommendationUi.noIndicatorMetadata")}</p>
                )}
                {category ? (
                  <p className="mt-2">
                    <span className="font-medium text-slate-700">{t("recommendationUi.affectedScoreArea")}:</span> {category}
                  </p>
                ) : null}
                {targetNotReached ? <p className="mt-2 font-medium text-amber-900">{t(reachedUserMaximum ? "recommendationUi.userMaximumReached" : "recommendationUi.planningLimitBestEffort")}</p> : null}
              </div>
              <div className="mt-3 rounded-lg bg-blue-50/70 p-3 text-xs leading-5 text-blue-950">
                <p className="font-semibold">{t("recommendationUi.whyThisRecommendation")}</p>
                <p className="mt-1">
                  {t("recommendationUi.calculatedScoreImpact")}: {(displayedImpact ?? 0) > 0 ? "+" : ""}{formatRecommendationScore(displayedImpact)}. {rankImpact}
                </p>
              </div>
            </article>
          );
        })}
      </div>
      {methodology === "the" ? <p className="mt-3 text-xs text-slate-500">{t("recommendationUi.effortConfidenceNotice")}</p> : null}
    </section>
  );
}

function RankChangeValue({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className={`mt-1 break-words text-sm font-semibold ${emphasis ? "text-blue-700" : "text-slate-900"}`}>{value}</dd>
    </div>
  );
}

function formatRankChangeValue(
  value: unknown,
  definition: RecommendationMetricDefinition | undefined,
  locale: string,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return String(value ?? "—");
  const formatted = value.toLocaleString(locale, { maximumFractionDigits: 2 });
  return `${formatted}${definition?.unit ? ` ${definition.unit}` : ""}`;
}

function formatSignedRankChange(
  value: number | null,
  definition: RecommendationMetricDefinition | undefined,
  locale: string,
) {
  if (value === null || !Number.isFinite(value)) return "—";
  const formatted = Math.abs(value).toLocaleString(locale, { maximumFractionDigits: 2 });
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatted}${definition?.unit ? ` ${definition.unit}` : ""}`;
}

function translateLevel(level: string, language: AppLanguage) {
  const labels = language === "tr"
    ? { low: "Düşük", medium: "Orta", high: "Yüksek", "very-high": "Çok Yüksek" }
    : { low: "Low", medium: "Medium", high: "High", "very-high": "Very high" };
  return labels[level as keyof typeof labels] ?? level;
}

function LevelBadge({ level, language, tone, prefix }: { level: string; language: AppLanguage; tone: "effort" | "risk" | "confidence"; prefix?: string }) {
  const toneClass = tone === "confidence"
    ? level === "high" ? "bg-emerald-50 text-emerald-700" : level === "medium" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
    : level === "low" ? "bg-emerald-50 text-emerald-700" : level === "medium" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700";
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${toneClass}`}>
    {prefix ? `${prefix}: ` : ""}{translateLevel(level, language)}
  </span>;
}

export function ScenarioPreviewDetails({
  inputs,
  plan,
  definitions,
  baselineValues,
}: {
  inputs: RecommendationParameterInput[];
  plan: RecommendationEngineResult["primaryPlan"];
  definitions: { metricId: string; engineField: string; label: string }[];
  baselineValues: Record<string, unknown>;
}) {
  const summary = summarizeRecommendationSelections(
    inputs,
    plan?.changes.map((change) => change.metricId) ?? [],
  );
  const definitionById = new Map(
    definitions.map((definition) => [definition.metricId, definition]),
  );
  const inputById = new Map(inputs.map((input) => [input.parameterId, input]));
  const appliedIds = new Set(plan?.changes.map((change) => change.metricId) ?? []);
  const fixed = summary.selections.filter((item) => item.kind === "fixed-value");
  const ranges = summary.selections.filter((item) => item.kind === "range-constraint");
  const held = summary.selections.filter((item) => item.kind === "hold-current");
  const dependencyGroups = getQsRecommendationDependencyGroups(definitions as RecommendationMetricDefinition[]);
  const groupedIds = new Set(dependencyGroups.flatMap((group) => group.definitions.map((definition) => definition.metricId)));
  const effectiveValues = getQsEffectiveRecommendationValues(baselineValues, inputs);

  return (
    <div className="mt-3 space-y-3 text-sm">
      <p>Kullanıcı tarafından sabitlenen değerler: {summary.fixedValueCount}</p>
      <p>Kullanıcı tarafından belirlenen değer aralıkları: {summary.rangeConstraintCount}</p>
      {summary.holdCurrentCount > 0 ? (
        <p>Mevcut değerde tutulacak parametreler: {summary.holdCurrentCount}</p>
      ) : null}
      <p>Öneri motorunun uyguladığı değişiklikler: {summary.appliedRecommendationCount}</p>

      <details className="rounded-lg border border-blue-200 bg-white p-3">
        <summary className="cursor-pointer font-semibold">Detayları göster</summary>
        <div className="mt-3 space-y-4">
          {dependencyGroups.map((group) => {
            const groupFixed = fixed.filter((item) => group.parameterIds.includes(item.parameterId));
            if (!groupFixed.length) return null;
            const diagnostics = group.id === "qs-employment-data"
              ? calculateQsEmploymentDiagnostics(effectiveValues)
              : null;
            return <PreviewGroup key={group.id} title={group.label}>
              {groupFixed.map((item) => {
                const definition = definitionById.get(item.parameterId);
                return <li key={item.parameterId}><strong>{definition?.label ?? item.parameterId}</strong><br />{formatRecommendationValue(baselineValues[definition?.engineField ?? item.parameterId])} → {formatRecommendationValue(item.value)}</li>;
              })}
              {diagnostics ? <li>Anket yanıt oranı: {diagnostics.surveyResponseRate === null ? "—" : `%${diagnostics.surveyResponseRate.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`}<br />Ham istihdam oranı: {diagnostics.graduateEmploymentRate === null ? "—" : `%${diagnostics.graduateEmploymentRate.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`}<br />EO skor etkisi: Hesaplanamadı</li> : null}
            </PreviewGroup>;
          })}
          {fixed.length ? (
            <PreviewGroup title="Kullanıcı tarafından sabitlenenler">
              {fixed.filter((item) => !groupedIds.has(item.parameterId)).map((item) => {
                const definition = definitionById.get(item.parameterId);
                return (
                  <li key={item.parameterId}>
                    <strong>{definition?.label ?? item.parameterId}</strong><br />
                    {formatRecommendationValue(baselineValues[definition?.engineField ?? item.parameterId])}
                    {" "}→ {formatRecommendationValue(item.value)}
                  </li>
                );
              })}
            </PreviewGroup>
          ) : null}

          {ranges.length ? (
            <PreviewGroup title="Kullanıcı tarafından belirlenen aralıklar">
              {ranges.map((item) => (
                <li key={item.parameterId}>
                  <strong>{definitionById.get(item.parameterId)?.label ?? item.parameterId}</strong><br />
                  {formatRecommendationValue(item.min)}–{formatRecommendationValue(item.max)}
                </li>
              ))}
            </PreviewGroup>
          ) : null}

          {held.length ? (
            <PreviewGroup title="Mevcut değerde tutulacak parametreler">
              {held.map((item) => (
                <li key={item.parameterId}>
                  {definitionById.get(item.parameterId)?.label ?? item.parameterId}
                </li>
              ))}
            </PreviewGroup>
          ) : null}

          {plan ? <PreviewGroup title="Öneri motorunun uyguladığı değişiklikler">
            {plan.changes.map((change) => {
              const range = inputById.get(change.metricId);
              return (
                <li key={change.metricId}>
                  <strong>{change.label.tr}</strong><br />
                  {formatRecommendationValue(change.currentValue)} →{" "}
                  {formatRecommendationValue(change.recommendedValue)}
                  {range?.inputMode === "range" ? (
                    <span className="block text-xs text-blue-800">
                      Kullanıcı aralığı: {formatRecommendationValue(range.min)}–
                      {formatRecommendationValue(range.max)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </PreviewGroup> : null}

          {ranges.filter((item) => !appliedIds.has(item.parameterId)).length ? (
            <PreviewGroup title="Uygulanamayan aralık kısıtları">
              {ranges.filter((item) => !appliedIds.has(item.parameterId)).map((item) => (
                <li key={item.parameterId} className="text-amber-900">
                  {definitionById.get(item.parameterId)?.label ?? item.parameterId} için{" "}
                  {formatRecommendationValue(item.min)}–{formatRecommendationValue(item.max)}{" "}
                  aralığı tanımlandı ancak aralık içinde pozitif katkı sağlayan
                  uygulanabilir bir öneri bulunamadı.
                </li>
              ))}
            </PreviewGroup>
          ) : null}
        </div>
      </details>
    </div>
  );
}

function PreviewGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</h3>
      <ul className="mt-2 space-y-2">{children}</ul>
    </section>
  );
}

function Chart({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/70 p-4 shadow-sm sm:p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-3 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

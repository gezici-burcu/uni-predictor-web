"use client";

import { QS_STOCHASTIC_INDICATOR_DEFINITIONS } from "@/src/config/qs.stochastic";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import type { QsRankEstimationResult } from "@/src/types/qs-rank-estimation";
import type {
  QsIndicatorScoreSource,
  QsStochasticSimulationResult,
} from "@/src/types/qs-stochastic";
import { QsRankEstimationDetails } from "./QsRankEstimationDetails";
import { resolveQsIndicatorDisplayStatus } from "./qsResultViewModels";

const formatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
const format = (value: number | null) => value === null ? "—" : formatter.format(value);
const range = (low: number | null, high: number | null) =>
  low === null || high === null ? "—" : `${format(low)}–${format(high)}`;

const sourceLabels: Record<QsIndicatorScoreSource, string> = {
  "official-qs-2027-reference": "QS 2027 yayımlanmış gösterge skoru",
  "same-year-official": "Aynı yıl resmî QS skoru",
  "same-year-external": "Aynı yıl doğrulanmış haricî skor",
  "previous-year-official": "Önceki geçerli yıl resmî skoru",
  "published-reference": "Yayımlanmış skor referansı",
  "held-constant-no-calibration": "Gösterge skoru hesaplanamıyor: kalibrasyon yok",
  "held-constant-no-public-calibration": "Gösterge skoru hesaplanamıyor: kalibrasyon yok",
  "held-constant-no-public-normalization": "Gösterge skoru hesaplanamıyor: QS normalizasyon verisi yok",
  "unavailable-no-calibration": "Yeterli eşlenmiş raw-score kalibrasyonu yok",
  "direct-external-score": "Doğrudan haricî skor",
  "estimated-from-current-raw": "Mevcut skor + kurumsal ham oran değişimi (yaklaşık)",
  missing: "Veri eksik",
};

const normalizationLabels = {
  "stochastic-anchor": "Referans skor + kurumsal oran değişimi",
  "external-score-direct": "Doğrudan 1–100 haricî skor",
  "indicator-only": "Bilgi amaçlı diagnostic",
  unsupported: "—",
} as const;

const ratioDetails = {
  FSR: {
    numerator: "Faculty FTE",
    denominator: "Student FTE",
  },
  IFR: {
    numerator: "International Faculty FTE",
    denominator: "Faculty FTE",
  },
  ISR: {
    numerator: "International Student FTE",
    denominator: "Student FTE",
  },
} as const;

export function QsDetailedCalculationDisclosure({
  simulation,
  rankEstimation,
}: {
  simulation: QsStochasticSimulationResult;
  rankEstimation: QsRankEstimationResult;
}) {
  const { t, locale, language } = useAppLanguage();
  const currentEmployment = simulation.diagnostics.currentRawIndicators.EO.calculationMetadata.components ?? {};
  const scenarioEmployment = simulation.diagnostics.scenarioRawIndicators.EO.calculationMetadata.components ?? {};
  const employmentKeys = ["totalGraduates", "respondents", "surveyResponseRate", "graduateEmploymentRate", "employedGraduates", "unemployedGraduates", "furtherStudy", "unavailableForWork"] as const;
  const employmentChanged = employmentKeys.some((key) => currentEmployment[key] !== scenarioEmployment[key]);
  const employmentFormat = (value: number | null) => value === null ? "—" : new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  const employmentPercent = (value: number | null) => value === null ? "—" : `%${employmentFormat(value)}`;
  const sufficiency = scenarioEmployment.surveyResponseRate == null ? "unavailable" : scenarioEmployment.surveyResponseRate > 20 ? "sufficient" : "lowResponse";
  const currentIsd = simulation.diagnostics.currentRawIndicators.ISD.calculationMetadata.components?.studentNationalityCount ?? null;
  const scenarioIsd = simulation.diagnostics.scenarioRawIndicators.ISD.calculationMetadata.components?.studentNationalityCount ?? null;
  return (
    <details
      className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      data-testid="qs-full-width-details"
    >
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
        {t("theUi.showDetails")}
      </summary>
      <div className="space-y-4 border-t border-slate-200 p-4">
        {employmentChanged ? <section className="rounded-xl border border-slate-200 bg-slate-50/40 p-4" data-testid="qs-employment-analysis"><h3 className="font-semibold text-slate-950">{t("qsEmploymentUi.analysis")}</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-3"><div><dt className="text-slate-500">{t("qsEmploymentUi.totalGraduates")}</dt><dd className="mt-1 tabular-nums">{employmentFormat(scenarioEmployment.totalGraduates ?? null)}</dd></div><div><dt className="text-slate-500">{t("qsEmploymentUi.totalParticipants")}</dt><dd className="mt-1 tabular-nums">{employmentFormat(scenarioEmployment.respondents ?? null)}</dd></div><div><dt className="text-slate-500">{t("qsEmploymentUi.surveyResponseRate")}</dt><dd className="mt-1 tabular-nums">{employmentPercent(scenarioEmployment.surveyResponseRate ?? null)}</dd></div><div><dt className="text-slate-500">{t("qsEmploymentUi.dataSufficiency")}</dt><dd className="mt-1">{t(`qsEmploymentUi.${sufficiency}`)}</dd></div><div><dt className="text-slate-500">{t("qsEmploymentUi.employed")}</dt><dd className="mt-1 tabular-nums">{employmentFormat(scenarioEmployment.employedGraduates ?? null)}</dd></div><div><dt className="text-slate-500">{t("qsEmploymentUi.unemployed")}</dt><dd className="mt-1 tabular-nums">{employmentFormat(scenarioEmployment.unemployedGraduates ?? null)}</dd></div><div><dt className="text-slate-500">{t("qsEmploymentUi.rawEmploymentRate")}</dt><dd className="mt-1 tabular-nums">{employmentPercent(scenarioEmployment.graduateEmploymentRate ?? null)}</dd></div><div><dt className="text-slate-500">{t("qsEmploymentUi.furtherStudy")}</dt><dd className="mt-1 tabular-nums">{employmentFormat(scenarioEmployment.furtherStudy ?? null)}</dd></div><div><dt className="text-slate-500">{t("qsEmploymentUi.unavailableGraduates")}</dt><dd className="mt-1 tabular-nums">{employmentFormat(scenarioEmployment.unavailableForWork ?? null)}</dd></div><div><dt className="text-slate-500">{t("qsEmploymentUi.unclassified")}</dt><dd className="mt-1 tabular-nums">{employmentFormat(scenarioEmployment.unclassifiedRespondents ?? null)}</dd></div><div><dt className="text-slate-500">{t("qsEmploymentUi.eoStatus")}</dt><dd className="mt-1 font-medium">{t("qsEmploymentUi.currentScoreHeld")}</dd></div></dl><p className="mt-3 text-sm text-amber-800">{t("qsEmploymentUi.explanation")}</p></section> : null}
        {currentIsd !== scenarioIsd ? <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">Bu parametre ISD tanısını etkiler. ISD genel QS skorunda ağırlıksızdır.</p> : null}
        {(["FSR", "IFR", "ISR"] as const).some((code) =>
          simulation.scenario.indicators[code].source === "unavailable-no-calibration" ||
          simulation.scenario.indicators[code].source === "held-constant-no-calibration") ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              FSR, IFR ve ISR ham oranları kurumsal veriden kesin olarak hesaplanır. Ancak QS’nin
              küresel 0–100 puan normalizasyon parametreleri ve eşlenmiş raw-score örnekleri
              bulunmadığından senaryo skorları kullanılamıyor olarak işaretlenmiştir.
            </p>
          ) : null}
        {QS_STOCHASTIC_INDICATOR_DEFINITIONS.map((definition) => {
          const current = simulation.current.indicators[definition.code];
          const scenario = simulation.scenario.indicators[definition.code];
          const currentRaw = simulation.diagnostics.currentRawIndicators[definition.code];
          const scenarioRaw = simulation.diagnostics.scenarioRawIndicators[definition.code];
          const difference = simulation.change.indicatorMedianDifference[definition.code];
          const missingInputCount = scenarioRaw.missingInputs.length;
          const warnings = scenario.warnings;
          const ratioDetail = definition.code === "FSR" || definition.code === "IFR" || definition.code === "ISR"
            ? ratioDetails[definition.code]
            : null;
          const rawDifference = currentRaw.rawValue === null || scenarioRaw.rawValue === null
            ? null
            : scenarioRaw.rawValue - currentRaw.rawValue;
          const displayStatus = resolveQsIndicatorDisplayStatus({ code: definition.code, simulation, language });
          const approximateScore = scenario.sampleSource === "estimated";
          const scenarioScoreTone = approximateScore
            ? "text-amber-800"
            : displayStatus.status === "reference-score" || displayStatus.status === "raw-score-unavailable"
              ? "text-slate-700"
              : "text-blue-800";
          return (
            <article
              key={definition.code}
              className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/40 p-4"
              data-indicator-detail={definition.code}
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-semibold text-slate-950">
                  {definition.code} · {definition.label}
                </h3>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {displayStatus.label}
                </span>
              </header>
              <p className="mt-2 text-xs text-slate-500">{displayStatus.description}</p>

              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div><dt className="text-xs text-slate-500">Mevcut</dt><dd className="mt-1 font-semibold tabular-nums">{format(current.median)}</dd></div>
                <div><dt className="text-xs text-slate-500">Senaryo</dt><dd className={`mt-1 font-semibold tabular-nums ${scenarioScoreTone}`}>{approximateScore && scenario.median !== null ? "≈" : ""}{format(scenario.median)}</dd></div>
                <div><dt className="text-xs text-slate-500">Fark</dt><dd className="mt-1 font-semibold tabular-nums">{difference !== null && difference > 0 ? "+" : ""}{format(difference)}</dd></div>
                <div><dt className="text-xs text-slate-500">Ağırlık</dt><dd className="mt-1 font-semibold">%{format(definition.officialWeight * 100)}</dd></div>
              </dl>

              {ratioDetail ? (
                <section className="mt-4 rounded-lg bg-white p-3 ring-1 ring-slate-200">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Kurumsal ham oran
                  </h4>
                  <dl className="mt-2 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                    <div><dt className="text-slate-500">Mevcut {ratioDetail.numerator}</dt><dd className="mt-1 tabular-nums">{format(currentRaw.calculationMetadata.numerator ?? null)}</dd></div>
                    <div><dt className="text-slate-500">Senaryo {ratioDetail.numerator}</dt><dd className="mt-1 tabular-nums">{format(scenarioRaw.calculationMetadata.numerator ?? null)}</dd></div>
                    <div><dt className="text-slate-500">Mevcut {ratioDetail.denominator}</dt><dd className="mt-1 tabular-nums">{format(currentRaw.calculationMetadata.denominator ?? null)}</dd></div>
                    <div><dt className="text-slate-500">Senaryo {ratioDetail.denominator}</dt><dd className="mt-1 tabular-nums">{format(scenarioRaw.calculationMetadata.denominator ?? null)}</dd></div>
                    <div><dt className="text-slate-500">Mevcut kurumsal oran</dt><dd className="mt-1 tabular-nums">{format(currentRaw.rawValue)}</dd></div>
                    <div><dt className="text-slate-500">Senaryo kurumsal oranı</dt><dd className="mt-1 tabular-nums">{format(scenarioRaw.rawValue)}</dd></div>
                    <div><dt className="text-slate-500">Mevcut sınırlandırılmış oran</dt><dd className="mt-1 tabular-nums">{format(currentRaw.calculationMetadata.cappedRawValue ?? null)}</dd></div>
                    <div><dt className="text-slate-500">Senaryo sınırlandırılmış oranı</dt><dd className="mt-1 tabular-nums">{format(scenarioRaw.calculationMetadata.cappedRawValue ?? null)}</dd></div>
                    <div><dt className="text-slate-500">Ham oran farkı</dt><dd className="mt-1 tabular-nums">{rawDifference !== null && rawDifference > 0 ? "+" : ""}{format(rawDifference)}</dd></div>
                  </dl>
                  {scenario.source === "unavailable-no-calibration" || scenario.source === "held-constant-no-calibration" ? (
                    <p className="mt-3 text-sm font-medium text-amber-800">
                      {scenario.source === "held-constant-no-calibration"
                        ? "Ham oran değişti; gösterge skoru hesaplanamadı."
                        : "Ham oran değişti; gösterge skoru değişimi hesaplanamadı."}
                    </p>
                  ) : null}
                </section>
              ) : null}

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skor aralığı</h4>
                  <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-slate-500">Mevcut P10–P90</dt><dd className="mt-1 tabular-nums">{range(current.p10, current.p90)}</dd></div>
                    <div><dt className="text-slate-500">Senaryo P10–P90</dt><dd className="mt-1 tabular-nums">{range(scenario.p10, scenario.p90)}</dd></div>
                  </dl>
                </section>
                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kaynak</h4>
                  <p className="mt-2 text-sm text-slate-700">{sourceLabels[scenario.source]}</p>
                </section>
                <section className="min-w-0 rounded-lg bg-white p-3 ring-1 ring-slate-200">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kalibrasyon</h4>
                  <dl className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Referans skor</dt><dd className="tabular-nums">{format(scenario.referenceScore)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Referans ham</dt><dd className="tabular-nums">{format(scenario.referenceRaw)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Kalibrasyon türü</dt><dd>{scenario.calibrationType}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Eşlenmiş veri noktası</dt><dd>{scenario.calibrationDataPointCount}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Güven</dt><dd>{scenario.calibrationConfidence}</dd></div>
                    <div className="grid gap-1"><dt className="text-slate-500">Yöntem</dt><dd className="break-words">{sourceLabels[scenario.source]}</dd></div>
                  </dl>
                </section>
                <section className="min-w-0 rounded-lg bg-white p-3 ring-1 ring-slate-200">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Normalizasyon</h4>
                  <dl className="mt-2 space-y-1 text-sm">
                    <div className="grid gap-1"><dt className="text-slate-500">Yöntem</dt><dd className="break-words">
                      {scenario.source === "unavailable-no-calibration"
                        ? "Yeterli eşlenmiş QS raw-score kalibrasyonu bulunmuyor"
                        : normalizationLabels[definition.normalizationMode]}
                    </dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Cap</dt><dd className="tabular-nums">{format(scenarioRaw.calculationMetadata.cap ?? null)}</dd></div>
                  </dl>
                </section>
              </div>

              <section className="mt-4 min-w-0">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Uyarılar</h4>
                {warnings.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">Uyarı bulunmuyor</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm text-amber-800">
                    {warnings.map((warning, index) => <li key={`${warning}-${index}`} className="break-words">• {warning}</li>)}
                  </ul>
                )}
              </section>

              {missingInputCount > 0 ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Bu gösterge için {missingInputCount} doğrulanmış veri girdisi eksik. Teknik alan adları son kullanıcı görünümünde gizlendi.</p> : null}
            </article>
          );
        })}
        <QsRankEstimationDetails estimation={rankEstimation}/>
      </div>
    </details>
  );
}

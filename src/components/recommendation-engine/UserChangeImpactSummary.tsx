"use client";

import type { AppLanguage } from "@/src/i18n/types";
import {
  buildUserChangeImpactExplanation,
  formatRecommendationScore,
  formatRecommendationValue,
  formatQsRawRatio,
  formatQsRawRatioDifference,
  createHeldConstantQsScoreEffect,
  calculateQsEmploymentDiagnostics,
  calculateDisplayedScoreDifference,
  getQsEffectiveRecommendationValues,
  type RecommendationAdapter,
  type RecommendationParameterInput,
} from "@/src/lib/recommendation-engine";
import type { QsCalculationResult } from "@/src/types/qs";
import { getRecommendationCategoryLabel } from "./recommendationCategoryChartData";

const EPSILON = 0.0001;

export function UserChangeImpactSummary({
  adapter,
  inputs,
  language,
}: {
  adapter: RecommendationAdapter;
  inputs: RecommendationParameterInput[];
  language: AppLanguage;
}) {
  const fixedInputs = inputs.filter((input) =>
    input.selected && input.inputMode === "value" && input.value !== undefined);
  const rangeInputs = inputs.filter((input) =>
    input.selected &&
    input.inputMode === "range" &&
    input.min !== undefined &&
    input.max !== undefined);
  const employmentIds = new Set([
    "totalGraduateStudents2023",
    "totalEmploymentRespondents",
    "employedGraduates",
    "unemployedGraduates",
    "graduatesInFullTimeFurtherStudy",
    "graduatesUnavailableForWork",
  ]);
  const employmentInputs = adapter.id === "qs"
    ? fixedInputs.filter((input) => employmentIds.has(input.parameterId))
    : [];
  const individualFixedInputs = fixedInputs.filter((input) =>
    !employmentIds.has(input.parameterId));
  if (adapter.id === "ui-greenmetric" || (fixedInputs.length === 0 && rangeInputs.length === 0)) return null;

  const baselineResult = adapter.calculate(adapter.initialValues);
  const baselineScore = adapter.getDisplayedScore(baselineResult);
  const baselineCategories = adapter.getCategoryScores(baselineResult);
  const definitions = new Map(
    adapter.definitions.map((definition) => [definition.metricId, definition]),
  );

  return (
    <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer px-5 py-4 font-semibold text-slate-950">
        Kullanıcı Değişikliğinin Etkisi
      </summary>
      <div className="space-y-4 border-t border-slate-200 p-5">
        {fixedInputs.length ? <h2 className="text-sm font-semibold">Doğrudan uygulanan sabit değerler</h2> : null}
        {employmentInputs.length ? (
          <EmploymentImpactGroup adapter={adapter} inputs={inputs} changedInputs={employmentInputs} />
        ) : null}
        {individualFixedInputs.map((input) => {
          const definition = definitions.get(input.parameterId);
          if (!definition || input.value === undefined) return null;
          const currentValue = adapter.initialValues[definition.engineField];
          const scenarioValues = {
            ...adapter.initialValues,
            [definition.engineField]: input.value,
          };
          const scenarioResult = adapter.calculate(scenarioValues);
          const scenarioScore = adapter.getDisplayedScore(scenarioResult);
          const scenarioCategories = adapter.getCategoryScores(scenarioResult);
          const categoryChanges = Object.keys({
            ...baselineCategories,
            ...scenarioCategories,
          }).flatMap((categoryId) => {
            const current = baselineCategories[categoryId];
            const constrained = scenarioCategories[categoryId];
            if (
              current === null || current === undefined ||
              constrained === null || constrained === undefined ||
              Math.abs(constrained - current) <= EPSILON
            ) return [];
            return [{
              categoryId,
              current,
              constrained,
              difference: constrained - current,
            }];
          });
          const qsRatios = adapter.id === "qs"
            ? getChangedQsRatios(
                baselineResult as QsCalculationResult,
                scenarioResult as QsCalculationResult,
              )
            : [];
          const qsScoreEffect = adapter.id === "qs"
              ? createHeldConstantQsScoreEffect(
                  qsRatios.length > 0 || !Object.is(currentValue, input.value),
                )
              : null;
          const employmentDiagnostics = adapter.id === "qs" &&
            input.parameterId === "employedGraduates"
              ? calculateQsEmploymentDiagnostics(scenarioValues)
              : null;
          const explanation = adapter.id === "qs" && categoryChanges.length === 0
            ? "Ham veri değişikliği kaydedildi; doğrulanmış QS skor dönüşümü bulunmadığı için kategori skoru farkı hesaplanamadı."
            : buildUserChangeImpactExplanation({
            metricId: input.parameterId,
            parameterLabel: definition.label,
            valueDifference:
              typeof currentValue === "number" ? input.value - currentValue : undefined,
            categoryImpacts: categoryChanges.map((change) => ({
              categoryId: change.categoryId,
              label: getRecommendationCategoryLabel(
                adapter.id,
                change.categoryId,
                language,
              ).label,
              difference: change.difference,
            })),
          });

          return (
            <article key={input.parameterId} className="rounded-xl border border-slate-200 p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ImpactValue label="Parametre" value={definition.label} />
                <ImpactValue label="Mevcut" value={formatRecommendationValue(currentValue)} />
                <ImpactValue label="Kullanıcı değeri" value={formatRecommendationValue(input.value)} />
                <ImpactValue
                  label="Toplam skor etkisi"
                  value={
                    qsScoreEffect?.numericScoreEffect === null
                      ? "—"
                      : baselineScore === null || scenarioScore === null
                      ? "—"
                      : signed(calculateDisplayedScoreDifference(baselineScore, scenarioScore) ?? 0)
                  }
                />
              </div>

              {categoryChanges.length ? (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold">Etkilenen kategoriler</h3>
                  <ul className="mt-2 grid gap-2 md:grid-cols-2">
                    {categoryChanges.map((change) => {
                      const label = getRecommendationCategoryLabel(
                        adapter.id,
                        change.categoryId,
                        language,
                      ).label;
                      return (
                        <li key={change.categoryId} className="rounded-lg bg-slate-50 p-3 text-sm">
                          <strong>{label}:</strong>{" "}
                          {formatRecommendationScore(change.current)} →{" "}
                          {formatRecommendationScore(change.constrained)}
                          <span className={change.difference < 0 ? "text-red-700" : "text-emerald-700"}>
                            {" "}Fark: {signed(change.difference)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              {qsRatios.length ? (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold">Etkilenen hesaplanabilir ham oranlar</h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {qsRatios.map((ratio) => (
                      <li key={ratio.code} className="rounded-lg bg-slate-50 p-3">
                        <strong>{ratio.code}</strong><br />
                        {formatQsRawRatio(ratio.current)} → {formatQsRawRatio(ratio.constrained)}<br />
                        <span>Fark: {formatQsRawRatioDifference(ratio.difference)}</span>
                        <p className="mt-1 text-xs text-slate-600">
                          {qsRatioExplanation(ratio.code)}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-slate-600">
                    Doğrulanmış QS raw-to-score kalibrasyonu bulunmadığından gösterge skorları,
                    weighted composite ve tahmini overall mevcut referans değerlerinde sabit tutuldu.
                  </p>
                </div>
              ) : null}

              {employmentDiagnostics ? (
                <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                  <p><strong>Doğrulama durumu:</strong> Geçerli</p>
                  <p>
                    Ham mezun istihdam oranı: {formatPercentOrDash(
                      employmentDiagnostics.graduateEmploymentRate,
                    )}
                  </p>
                  <p>
                    Mezun anketi yanıt oranı: {formatPercentOrDash(
                      employmentDiagnostics.surveyResponseRate,
                    )}
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    İstihdam verisi değişti; doğrulanmış EO normalizasyonu ve gerekli haricî
                    veriler bulunmadığı için sayısal QS skor etkisi üretilemedi.
                  </p>
                </div>
              ) : null}

              <p className="mt-4 text-sm text-slate-600">
                {explanation}
              </p>
            </article>
          );
        })}
        {rangeInputs.length ? (
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <h2 className="text-sm font-semibold text-blue-950">Öneri Arama Kısıtları</h2>
            <p className="mt-1 text-xs text-blue-800">
              Bu aralıklar başlangıç skoruna uygulanmaz; yalnız öneri aramasının sınırlarını belirler.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {rangeInputs.map((input) => {
                const definition = definitions.get(input.parameterId);
                return (
                  <li key={input.parameterId}>
                    <strong>{definition?.label ?? input.parameterId}:</strong>{" "}
                    {formatRecommendationValue(input.min)}–{formatRecommendationValue(input.max)}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </details>
  );
}

function EmploymentImpactGroup({ adapter, inputs, changedInputs }: {
  adapter: RecommendationAdapter;
  inputs: RecommendationParameterInput[];
  changedInputs: RecommendationParameterInput[];
}) {
  const effective = getQsEffectiveRecommendationValues(adapter.initialValues, inputs);
  const diagnostics = calculateQsEmploymentDiagnostics(effective);
  const labels: Record<string, string> = {
    totalGraduateStudents2023: "Toplam mezun",
    totalEmploymentRespondents: "Ankete katılan",
    employedGraduates: "İstihdam edilen",
    unemployedGraduates: "İşsiz mezun",
    graduatesInFullTimeFurtherStudy: "İleri eğitime devam eden",
    graduatesUnavailableForWork: "Çalışmaya uygun olmayan",
  };
  return <section className="rounded-xl border border-slate-200 p-4">
    <h3 className="font-semibold">İstihdam Sonuçları Ham Verileri</h3>
    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
      {changedInputs.map((input) => <li key={input.parameterId} className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{labels[input.parameterId] ?? input.parameterId}:</strong> {formatRecommendationValue(adapter.initialValues[input.parameterId])} → {formatRecommendationValue(input.value)}</li>)}
      <li className="rounded-lg bg-slate-50 p-3 text-sm"><strong>Anket yanıt oranı:</strong> {formatPercentOrDash(diagnostics.surveyResponseRate)}</li>
      <li className="rounded-lg bg-slate-50 p-3 text-sm"><strong>Ham mezun istihdam oranı:</strong> {formatPercentOrDash(diagnostics.graduateEmploymentRate)}</li>
      <li className="rounded-lg bg-slate-50 p-3 text-sm"><strong>EO sayısal skor etkisi:</strong> Hesaplanamadı</li>
    </ul>
    <p className="mt-3 text-xs text-amber-800">İstihdam verileri değişti; doğrulanmış EO normalizasyonu ve gerekli haricî Alumni Impact verileri bulunmadığı için sayısal QS skor etkisi üretilmedi.</p>
  </section>;
}

function getChangedQsRatios(current: QsCalculationResult, constrained: QsCalculationResult) {
  return (["FSR", "IFR", "ISR"] as const).flatMap((code) => {
    const before = current.rawIndicators[code];
    const after = constrained.rawIndicators[code];
    return before !== null && after !== null && Math.abs(after - before) > 1e-12
      ? [{ code, current: before, constrained: after, difference: after - before }]
      : [];
  });
}

function qsRatioExplanation(code: "FSR" | "IFR" | "ISR") {
  if (code === "FSR") {
    return "Akademik personel ve öğrenci toplamlarındaki değişiklik FSR ham oranını güncelledi. Doğrulanmış QS raw-to-score kalibrasyonu bulunmadığından FSR gösterge skoru mevcut referans değerinde sabit tutuldu.";
  }
  if (code === "IFR") {
    return "Uluslararası akademik personel ve toplam akademik personel değerlerindeki değişiklik IFR ham oranını güncelledi. Doğrulanmış QS raw-to-score kalibrasyonu bulunmadığından IFR gösterge skoru mevcut referans değerinde sabit tutuldu.";
  }
  return "Uluslararası öğrenci ve toplam öğrenci değerlerindeki değişiklik ISR ham oranını güncelledi. Doğrulanmış QS raw-to-score kalibrasyonu bulunmadığından ISR gösterge skoru mevcut referans değerinde sabit tutuldu.";
}

function formatPercentOrDash(value: number | null) {
  return value === null || !Number.isFinite(value)
    ? "—"
    : `%${value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${formatRecommendationScore(value)}`;
}

function ImpactValue({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppProviders } from "@/src/contexts/AppProviders";
import { calculateQsRecommendationChartDomain, calculateRequiredScoreIncrease, canRecommendationBeSubmitted, excludeUserControlledRecommendationIds, formatSignedDisplayedScoreImpact, RankRecommendationCards, RecommendationEnginePage, ScenarioPreviewDetails } from "./RecommendationEnginePage";
import type { RecommendationPlan } from "@/src/lib/recommendation-engine";
import { createRecommendationAdapters, runRecommendationEngine } from "@/src/lib/recommendation-engine";
import { methodologyRegistry } from "@/src/lib/baseline/methodologyRegistry";
import { RecommendationMetricScope, toggleRecommendationParameterSelection } from "./RecommendationMetricScope";

describe("RecommendationEnginePage", () => {
  it("keeps THE checkbox selection state synchronized for zero, one and multiple selections", () => {
    let selected: string[] = [];
    expect(selected.length === 0).toBe(true);

    selected = toggleRecommendationParameterSelection(selected, "the.common.academicStaffFte", true);
    expect(selected).toEqual(["the.common.academicStaffFte"]);
    expect(selected.length === 0).toBe(false);

    selected = toggleRecommendationParameterSelection(selected, "the.common.studentsFte", true);
    expect(selected).toEqual(["the.common.academicStaffFte", "the.common.studentsFte"]);
    expect(selected.length === 0).toBe(false);

    selected = toggleRecommendationParameterSelection(selected, "the.common.academicStaffFte", false);
    expect(selected).toEqual(["the.common.studentsFte"]);
    selected = toggleRecommendationParameterSelection(selected, "the.common.studentsFte", false);
    expect(selected).toEqual([]);
    expect(selected.length === 0).toBe(true);
  });

  it("renders an engine-derived read-only current score and a single target input", () => {
    const html = renderToStaticMarkup(
      <AppProviders>
        <RecommendationEnginePage />
      </AppProviders>,
    );
    expect(html).toContain("Mevcut Skor");
    expect(html).toContain("Hedef Türü");
    expect(html).toContain("Hedef Sıralama");
    expect(html).toContain("<output");
    expect(html).toContain("THE hesaplama motorundan alınmıştır.");
    expect(html.match(/type="number"/g)).toHaveLength(1);
    expect(html).toContain("Gerekli skor artışı");
    expect(html).not.toContain("Planlama Süresi");
    expect(html).not.toContain("Öneri Yaklaşımı");
    expect(html).not.toContain("Maksimum Etki");
    expect(html).not.toContain("UI GreenMetric");
    expect(html).toContain("en fazla 6 aylık uygulama dönemi");
    expect(html).toContain("Tümünü Sıfırla");
    expect(html).toContain("kurumsal verileri değiştirmez");
    expect(html).toContain("Karar Destek Çalışma Alanı");
    expect(html).toContain("Hedef ve Optimizasyon");
    expect(html).toContain("Planlama Parametreleri");
    expect(html).toContain("Analizi çalıştırmaya hazır mısınız?");
    expect(html).toContain("sticky bottom-4");
    expect(html).toContain("bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700");
  });

  it("renders rank targeting as one compact responsive range section", () => {
    const html = renderToStaticMarkup(
      <AppProviders>
        <RecommendationEnginePage initialTargetMode="rankRange" />
      </AppProviders>,
    );
    expect(html).toContain("Mevcut Tahmini Sıralama");
    expect(html).toContain("801–1000");
    expect(html).toContain("Mevcut tahmini skor");
    expect(html).toContain("Hedef Sıralama Aralığı");
    expect(html).toContain('placeholder="örn. 601"');
    expect(html).toContain('placeholder="örn. 800"');
    expect(html).toContain("Daha düşük sıra değeri daha iyi sıralamayı ifade eder.");
    expect(html).toContain("sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]");
    expect(html.match(/type="number"/g)).toHaveLength(2);
    expect(html).not.toContain("Gerekli skor artışı");
  });

  it("allows automatic parameter evaluation in both target modes", () => {
    for (const initialTargetMode of ["score", "rankRange"] as const) {
      const html = renderToStaticMarkup(
        <AppProviders>
          <RecommendationEnginePage initialTargetMode={initialTargetMode} />
        </AppProviders>,
      );
      expect(html).not.toContain("Öneri üretmek için en az bir parametre seçin.");
      expect(html).toContain("uygun parametre otomatik değerlendirilecek");
      expect(html).toContain("disabled");
    }
    expect(canRecommendationBeSubmitted(36.2, false, true)).toBe(true);
    expect(canRecommendationBeSubmitted(36.2, true, true)).toBe(false);
    expect(canRecommendationBeSubmitted(null, false, true)).toBe(false);
  });

  it("renders engine-derived rank recommendation reasons and parameter impacts", () => {
    const adapter = createRecommendationAdapters({
      the: methodologyRegistry.the.defaults,
      qs: methodologyRegistry.qs.defaults,
      "ui-greenmetric": methodologyRegistry["ui-greenmetric"].defaults,
    }).the;
    const result = runRecommendationEngine({
      adapter,
      target: { mode: "rankRange", range: { bestRank: 601, worstRank: 800 } },
      planningHorizon: 5,
      strategy: "maximum-impact",
    });
    const html = renderToStaticMarkup(
      <RankRecommendationCards
        plan={result.primaryPlan!}
        definitions={adapter.definitions}
        language="tr"
        locale="tr-TR"
        methodology="the"
        t={(key) => key === "recommendationUi.totalProjectedRankImpact"
          ? "{current} → {projected}"
          : key}
      />,
    );
    expect(html).toContain("recommendationUi.whyThisRecommendation");
    expect(html).toContain("recommendationUi.calculatedScoreImpact");
    expect(html).toContain("recommendationUi.noIndicatorMetadata");
    expect(html).toContain("recommendationUi.affectedScoreArea");
    expect(html).toContain("801–1000 → 601–800");
    expect(html).toContain(String(result.primaryPlan!.changes.length));
  });

  it("marks an unreachable THE rank plan as the strongest best-effort result", () => {
    const adapter = createRecommendationAdapters({
      the: methodologyRegistry.the.defaults,
      qs: methodologyRegistry.qs.defaults,
      "ui-greenmetric": methodologyRegistry["ui-greenmetric"].defaults,
    }).the;
    const result = runRecommendationEngine({
      adapter,
      target: { mode: "rankRange", range: { bestRank: 601, worstRank: 800 } },
      planningHorizon: "6-months",
      strategy: "maximum-impact",
    });
    const html = renderToStaticMarkup(
      <RankRecommendationCards
        plan={result.primaryPlan!}
        definitions={adapter.definitions}
        language="tr"
        locale="tr-TR"
        methodology="the"
        t={(key) => key === "recommendationUi.bestEffortRankPlan"
          ? "En iyi bulunabilen sonuç · hedefe ulaştırmıyor"
          : key === "recommendationUi.planningLimitBestEffort"
            ? "6 aylık planlama sınırları içindeki en güçlü doğrulanmış aday seçildi"
            : key}
      />,
    );

    expect(result.primaryPlan?.reachedTarget).toBe(false);
    expect(html).toContain("En iyi bulunabilen sonuç · hedefe ulaştırmıyor");
    expect(html).toContain("6 aylık planlama sınırları içindeki en güçlü doğrulanmış aday seçildi");
    expect(html).toContain("border-amber-300");
  });

  it("reuses the QS baseline rank estimator and renders rank-specific planning copy", () => {
    const html = renderToStaticMarkup(
      <AppProviders>
        <RecommendationEnginePage initialMethodology="qs" initialTargetMode="rankRange" />
      </AppProviders>,
    );
    expect(html).toContain("Mevcut Tahmini Sıralama");
    expect(html).toContain("QS hesaplama ve sıralama tahmin motorundan alınmıştır.");
    expect(html).toContain("1201–1400");
    expect(html).toContain("QS sıralama hedefi planlaması");
    expect(html).not.toContain("Hedef skorunuzu belirleyebilir");
    expect(html).not.toContain("801–1000");
  });

  it("renders editable QS target score controls and the arithmetic gap", () => {
    const html = renderToStaticMarkup(
      <AppProviders>
        <RecommendationEnginePage initialMethodology="qs" />
      </AppProviders>,
    );
    const upperSection = html.slice(0, html.indexOf("QS ham veri planlaması"));
    expect(upperSection).toContain("Mevcut Tahmini Skor");
    expect(upperSection).toContain("11,81");
    expect(upperSection).toContain(">Hedef Skor<");
    expect(upperSection).toContain("Gerekli Skor Artışı");
    expect(upperSection).toContain('type="number"');
    expect(upperSection).not.toContain("en fazla 6 aylık uygulama dönemi");
    expect(html).toContain("FSR, IFR ve ISR oranlarının tahmini QS skoruna etkisini");
    expect(calculateRequiredScoreIncrease(11.81, 14)).toBeCloseTo(2.19, 10);
  });

  it("renders THE-compatible accordion toggles for both QS parameter sections", () => {
    const html = renderToStaticMarkup(
      <AppProviders><RecommendationEnginePage initialMethodology="qs" /></AppProviders>,
    );
    expect(html.match(/aria-controls="value-parameters-content"/g)).toHaveLength(1);
    expect(html.match(/aria-controls="recommendation-parameters-content"/g)).toHaveLength(1);
    expect(html.match(/aria-expanded="true"/g)).toHaveLength(2);
    expect(html).toContain("Değiştirmek İstediğiniz Parametreler bölümünü kapat");
    expect(html).toContain("Öneride Kullanılmasını İstediğiniz Parametreler bölümünü kapat");
    expect(html).not.toContain("Akademik Personel Verileri");
  });

  it("requires recommendation selection while exposing all three input modes", () => {
    const html = renderToStaticMarkup(
      <AppProviders><RecommendationMetricScope
        definitions={[{
          metricId: "students",
          engineField: "students",
          parameterKind: "institutionalInput",
          isEditableInput: true,
          isRecommendationCandidate: true,
          label: "Öğrenci Sayısı",
          categoryId: "test",
          kind: "headcount",
          direction: "increase-only",
          effort: "medium",
          risk: "low",
          confidence: "high",
          controllability: "high",
          evidenceRequired: false,
          affectsTotalScore: true,
          defaultLocked: false,
          technicalMinimum: 0,
          technicalMaximum: 50_000,
          step: 1,
        }]}
        currentValues={{ students: 24_000 }}
        inputs={{
          students: {
            parameterId: "students",
            selected: true,
            inputMode: "default",
          },
        }}
        errors={{}}
        onChange={() => undefined}
        recommendationParameterIds={[]}
        onRecommendationParameterIdsChange={() => undefined}
      /></AppProviders>,
    );
    expect(html).toContain("Parametre Ayarları");
    expect(html).toContain("<details open");
    expect(html).toContain("Değiştirmek İstediğiniz Parametreler");
    expect(html).toContain("Öneride Kullanılmasını İstediğiniz Parametreler");
    expect(html).toContain('aria-expanded="true" aria-controls="value-parameters-content"');
    expect(html).toContain('id="value-parameters-content"');
    expect(html).toContain('aria-expanded="true" aria-controls="recommendation-parameters-content"');
    expect(html).toContain('id="recommendation-parameters-content"');
    expect(html).toContain("Seçim yapmazsanız veri yeterliliği bulunan tüm uygun parametreler otomatik değerlendirilir.");
    expect(html).toContain("Değerini değiştir");
    expect(html).toContain('value="default"');
    expect(html).toContain("Mevcut Değeri Koru");
    expect(html).toContain('value="value"');
    expect(html).toContain("Sabit Değer");
    expect(html).toContain('value="range"');
    expect(html).toContain("Değer Aralığı");
  });

  it("renders recommendation candidate selection without value or range controls", () => {
    const html = renderToStaticMarkup(
      <AppProviders><RecommendationMetricScope
        definitions={[{
          metricId: "students",
          engineField: "students",
          parameterKind: "institutionalInput",
          isEditableInput: true,
          isRecommendationCandidate: true,
          label: "Öğrenci Sayısı",
          categoryId: "test",
          kind: "headcount",
          direction: "increase-only",
          effort: "medium",
          risk: "low",
          confidence: "high",
          controllability: "high",
          evidenceRequired: false,
          affectsTotalScore: true,
          defaultLocked: false,
          technicalMinimum: 0,
          technicalMaximum: 50_000,
          step: 1,
        }]}
        currentValues={{ students: 24_000 }}
        inputs={{}}
        errors={{}}
        onChange={() => undefined}
        recommendationParameterIds={["students"]}
        onRecommendationParameterIdsChange={() => undefined}
      /></AppProviders>,
    );
    const recommendationSection = html.slice(
      html.indexOf("Öneride Kullanılmasını İstediğiniz Parametreler"),
    );
    expect(recommendationSection).toContain('type="checkbox" checked=""');
    expect(recommendationSection).not.toContain('type="number"');
    expect(recommendationSection).not.toContain('type="radio"');
  });

  it("renders only raw QS fields in both recommendation parameter sections", () => {
    const adapter = createRecommendationAdapters({
      the: methodologyRegistry.the.defaults,
      qs: methodologyRegistry.qs.defaults,
      "ui-greenmetric": methodologyRegistry["ui-greenmetric"].defaults,
    }).qs;
    const html = renderToStaticMarkup(
      <AppProviders><RecommendationMetricScope
        definitions={adapter.definitions}
        currentValues={adapter.initialValues}
        inputs={{
          "academicStaff.total": {
            parameterId: "academicStaff.total",
            selected: true,
            inputMode: "default",
          },
        }}
        errors={{}}
        onChange={() => undefined}
        recommendationParameterIds={[]}
        onRecommendationParameterIdsChange={() => undefined}
        recommendationSelectableMetricIds={
          adapter.definitions.map((definition) => definition.metricId)
        }
      /></AppProviders>,
    );
    for (const scoreLabel of [
      "Akademik İtibar Skoru",
      "Akademisyen Başına Atıf Skoru",
      "İşveren İtibarı Skoru",
      "İstihdam Sonuçları Skoru",
      "Uluslararası Araştırma Ağı Skoru",
      "QS Sürdürülebilirlik Skoru",
    ]) {
      expect(html).not.toContain(scoreLabel);
    }
    expect(html).toContain("Akademik Personel Sayısı");
    expect(html).toContain("Uluslararası Akademik Personel Sayısı");
    expect(html).toContain("Sabit değer · motor değiştiremez");
    expect(html).toContain("Değer Aralığı · yalnız ham etki");
    const valueSection = html.slice(html.indexOf('id="value-parameters-content"'), html.indexOf('id="recommendation-parameters-content"'));
    const recommendationSection = html.slice(html.indexOf('id="recommendation-parameters-content"'));
    expect(valueSection.match(/type="checkbox"/g)).toHaveLength(12);
    expect(recommendationSection.match(/type="checkbox"/g)).toBeNull();
    expect(recommendationSection).toContain("Doğrulanmış QS raw-to-score kalibrasyonu bulunan parametre olmadığı için");
    expect(recommendationSection).not.toContain("Toplam Mezun Sayısı");
    expect(valueSection).toContain("md:grid-cols-2 xl:grid-cols-3");
    expect(valueSection).not.toContain("2xl:grid-cols-4");
    expect(valueSection).toContain("min-h-[132px]");
    expect(valueSection).not.toContain("min-h-[190px]");
    for (const excludedLabel of ["Yurt İçi Akademik Adaylık Sayısı", "Yurt İçi İşveren Adaylık Sayısı", "Alan-Normalize Atıf Sayısı", "Farklı Ülke/Bölge Sayısı", "Alumni Impact İndeksi", "QS Sustainability Haricî Referans Skoru", "Uluslararası Öğrencilerin Temsil Ettiği Ülke/Uyruk Sayısı"]) {
      expect(valueSection).not.toContain(excludedLabel);
    }
    expect(valueSection).not.toContain("Akademik Personel Verileri");
    expect(valueSection).not.toContain("Öğrenci Verileri");
    expect(valueSection).not.toContain("Mezun İstihdam Verileri");
    expect(valueSection).not.toContain("Sabit değer belirle");
    expect(valueSection).not.toContain("Planlamada kullan");
    expect(recommendationSection).not.toContain("Planlamada kullan");
  });

  it("uses a tight QS progress-chart domain around the visible score change", () => {
    expect(calculateQsRecommendationChartDomain([
      { score: 11.81 },
      { score: 11.93 },
      { score: 12.04 },
    ])).toEqual([11.76, 12.09]);
  });

  it("never sends fixed or held values back to the engine candidate pool", () => {
    expect(excludeUserControlledRecommendationIds(
      ["fixed", "range", "held", "automatic"],
      [
        { parameterId: "fixed", selected: true, inputMode: "value", value: 120 },
        { parameterId: "range", selected: true, inputMode: "range", min: 110, max: 130 },
        { parameterId: "held", selected: true, inputMode: "default" },
      ],
    )).toEqual(["range", "automatic"]);
  });

  it("marks small QS score effects as approximate instead of presenting false precision", () => {
    expect(formatSignedDisplayedScoreImpact(11.801, 11.811, true)).toBe("≈ +0,01");
  });

  it("keeps both fixed and range entry available while numeric QS optimization is unavailable", () => {
    const adapter = createRecommendationAdapters({
      the: methodologyRegistry.the.defaults,
      qs: methodologyRegistry.qs.defaults,
      "ui-greenmetric": methodologyRegistry["ui-greenmetric"].defaults,
    }).qs;
    const html = renderToStaticMarkup(
      <AppProviders><RecommendationMetricScope
        definitions={adapter.definitions}
        currentValues={adapter.initialValues}
        inputs={{
          "academicStaff.total": {
            parameterId: "academicStaff.total",
            selected: true,
            inputMode: "value",
            value: 1_700,
          },
        }}
        errors={{}}
        onChange={() => undefined}
        recommendationParameterIds={["academicStaff.total"]}
        onRecommendationParameterIdsChange={() => undefined}
      /></AppProviders>,
    );
    const valueSection = html.slice(
      html.indexOf('id="value-parameters-content"'),
      html.indexOf('id="recommendation-parameters-content"'),
    );
    expect(valueSection).toContain("Sabit değer · motor değiştiremez");
    expect(valueSection).toContain("Değer Aralığı · yalnız ham etki");
  });

  it("renders the same 10 institutional THE parameters in both responsive grids", () => {
    const adapter = createRecommendationAdapters({
      the: methodologyRegistry.the.defaults,
      qs: methodologyRegistry.qs.defaults,
      "ui-greenmetric": methodologyRegistry["ui-greenmetric"].defaults,
    }).the;
    const html = renderToStaticMarkup(
      <AppProviders><RecommendationMetricScope
        definitions={adapter.definitions}
        currentValues={adapter.initialValues}
        inputs={{}}
        errors={{}}
        onChange={() => undefined}
        recommendationParameterIds={[]}
        onRecommendationParameterIdsChange={() => undefined}
      /></AppProviders>,
    );
    const valueSection = html.slice(
      html.indexOf('id="value-parameters-content"'),
      html.indexOf("recommendation-parameters-content"),
    );
    expect(valueSection).toContain("md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4");
    expect(valueSection).not.toContain(">Öğretim</h3>");
    expect(valueSection).not.toContain(">Araştırma Ortamı</h3>");
    expect(valueSection.match(/type="checkbox"/g)).toHaveLength(10);
    expect(valueSection.indexOf("Akademik Personel Sayısı (FTE)"))
      .toBeLessThan(valueSection.indexOf("Uluslararası/Yurt Dışı Kökenli Akademik Personel Sayısı (FTE)"));
    expect(valueSection.indexOf("Uluslararası/Yurt Dışı Kökenli Akademik Personel Sayısı (FTE)"))
      .toBeLessThan(valueSection.indexOf("Araştırma Personeli Sayısı (FTE)"));
    const recommendationSection = html.slice(
      html.indexOf('id="recommendation-parameters-content"'),
    );
    expect(recommendationSection).toContain("md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4");
    expect(recommendationSection).not.toContain(">Öğretim</h3>");
    expect(recommendationSection).not.toContain(">Araştırma Ortamı</h3>");
    expect(recommendationSection).not.toContain(">Uluslararası Görünüm</h3>");
    expect(recommendationSection).not.toContain(">Sanayi</h3>");
    expect(recommendationSection).toContain("min-h-[132px]");
    expect(recommendationSection.match(/type="checkbox"/g)).toHaveLength(10);
    for (const externalLabel of [
      "Öğretim İtibarı Ham Değeri",
      "Araştırma İtibarı Ham Değeri",
      "Toplam Uygun Yayın Sayısı",
      "Kurumsal Atıf Etkisi / Ortalama FWCI Değeri",
      "75. Yüzdelik FWCI Değeri",
      "Dünya En İyi %10’luk Dilimindeki Yayın Sayısı",
      "Araştırma Etkisi Ham Bibliyometrik Değeri",
      "Uluslararası Ortak Yazarlı Yayın Sayısı",
      "Patentler Tarafından Atıf Yapılan Yayın Sayısı",
    ]) {
      expect(valueSection).not.toContain(externalLabel);
      expect(recommendationSection).not.toContain(externalLabel);
    }
  });

  it("separates fixed, range, held and unique applied recommendation counts", () => {
    const plan = {
      strategy: "balanced",
      currentScore: 36,
      constrainedStartScore: 35,
      targetScore: 40,
      recommendedScore: 36,
      reachedTarget: false,
      changes: [{
        metricId: "doctoral",
        label: { tr: "Doktora Mezunu Sayısı", en: "Doctoral graduates" },
        categoryId: "teaching",
        currentValue: 396,
        recommendedValue: 416,
        absoluteChange: 20,
        percentageChange: 5,
        scoreBeforeChange: 35,
        scoreAfterChange: 36,
        incrementalScoreImpact: 1,
        normalizedChange: 0.5,
        changeCost: 1,
        effort: "medium",
        risk: "low",
        confidence: "high",
        direction: "increase-only",
        evidenceRequired: false,
      }],
      totalChangeCost: 1,
      resultingValues: {},
      currentCategoryScores: {},
      constrainedCategoryScores: {},
      resultingCategoryScores: {},
      verified: true,
    } satisfies RecommendationPlan;
    const html = renderToStaticMarkup(
      <ScenarioPreviewDetails
        inputs={[
          { parameterId: "faculty", selected: true, inputMode: "value", value: 200 },
          { parameterId: "doctoral", selected: true, inputMode: "range", min: 400, max: 450 },
          { parameterId: "students", selected: true, inputMode: "range", min: 3000, max: 3500 },
          { parameterId: "held", selected: true, inputMode: "default" },
        ]}
        plan={plan}
        definitions={[
          { metricId: "faculty", engineField: "faculty", label: "Uluslararası Akademik Personel Sayısı" },
          { metricId: "doctoral", engineField: "doctoral", label: "Doktora Mezunu Sayısı" },
          { metricId: "students", engineField: "students", label: "Uluslararası Öğrenci Sayısı" },
          { metricId: "held", engineField: "held", label: "Mevcut Parametre" },
        ]}
        baselineValues={{ faculty: 185, doctoral: 396, students: 3391, held: 10 }}
      />,
    );
    expect(html).toContain("sabitlenen değerler: 1");
    expect(html).toContain("değer aralıkları: 2");
    expect(html).toContain("Mevcut değerde tutulacak parametreler: 1");
    expect(html).toContain("uyguladığı değişiklikler: 1");
    expect(html).toContain("Kullanıcı aralığı: 400–450");
    expect(html).not.toContain("Kullanıcı tarafından belirlenen değişiklikler");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getScenarioComparisonCategoryIds, getScenarioSelectionError, ScenarioComparison, ScenarioDetailPanel, ScenarioTable } from "./ScenariosPage";
import type { SavedMethodologyScenarioMethodology, SavedScenarioSnapshot } from "@/src/types/saved-scenario";
import { scenarioComparisonUiTranslations } from "@/src/i18n/scenario-comparison-ui";
import { readFileSync } from "node:fs";

const make = (id: string, methodology: SavedMethodologyScenarioMethodology = "THE"): SavedScenarioSnapshot => ({
  id, name: `Senaryo ${id}`, methodology, source: "manual-scenario",
  institutionalDataYear: "2024", scoreReferenceEdition: null,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  currentScore: 30, scenarioScore: 32, scoreDifference: 2,
  currentRankBand: null, scenarioRankBand: null, calculationStatus: "complete",
  warnings: [], changedMetrics: [{ parameterId: "staff", label: "Personel", currentValue: 10, scenarioValue: 12 }],
  currentCategoryScores: { teaching: 20 }, scenarioCategoryScores: { teaching: 22 },
  currentIndicatorScores: null, scenarioIndicatorScores: null,
  rawCalculationDetails: null, recommendationContext: null,
});

describe("Scenarios page components", () => {
  it("renders null values as dashes and raw-analysis status in the table", () => {
    const html = renderToStaticMarkup(<ScenarioTable scenarios={[make("one", "QS")]} selected={[]} onToggle={() => undefined} onDetail={() => undefined} onRename={() => undefined} onDelete={() => undefined} />);
    expect(html).toContain("—");
    expect(html).toContain("Senaryo one");
    expect(html).toContain('/qs?scenarioId=one');
    expect(html).not.toContain('disabled="" class="opacity-50"');
  });
  it("renders snapshot detail without recalculation", () => {
    const snapshot = make("one");
    snapshot.currentScore = 36.32;
    snapshot.scenarioScore = 34.53;
    snapshot.scoreDifference = -1.79;
    snapshot.currentRankBand = "1001–1200";
    snapshot.scenarioRankBand = "1001–1200";
    const before = structuredClone(snapshot);
    const html = renderToStaticMarkup(<ScenarioDetailPanel scenario={snapshot} onClose={() => undefined} />);
    for (const text of ["Senaryo: Senaryo one", "Senaryo Bilgileri", "Tarih Bilgileri", "Sonuç Özeti", "Senaryo uygulanmadan önceki kayıtlı skor", "Kaydedilen değişikliklerden sonraki tahmini skor", "Senaryo skoru − mevcut skor", "Snapshot başarıyla kaydedildi.", "Bu senaryoda kurumsal mevcut değerden farklı girilen parametreler.", "36,32", "34,53", "−1,79", "1001–1200"]) expect(html).toContain(text);
    expect(snapshot).toEqual(before);
  });
  it("resolves technical labels, areas and integer formatting in snapshot detail", () => {
    const snapshot = make("detail");
    snapshot.changedMetrics = [{ parameterId: "the.common.academicStaffFte", label: "the.common.academicStaffFte", currentValue: 1373, scenarioValue: 5244 }];
    const before = structuredClone(snapshot);
    const html = renderToStaticMarkup(<ScenarioDetailPanel scenario={snapshot} onClose={() => undefined} />);
    expect(html).toContain("Akademik Personel Sayısı (FTE)");
    expect(html).toContain("Öğretim");
    expect(html).toContain("1.373");
    expect(html).toContain("5.244");
    expect(html).not.toContain("the.common.academicStaffFte");
    expect(snapshot).toEqual(before);
  });
  it("builds comparison cards, charts and a unique parameter matrix from snapshots", () => {
    const first = make("one");
    const second = make("two");
    second.changedMetrics = [{ parameterId: "students", label: "Öğrenci", currentValue: 20, scenarioValue: 22 }];
    const before = structuredClone([first, second]);
    const html = renderToStaticMarkup(<ScenarioComparison scenarios={[first, second]} />);
    expect(html).toContain("Seçili Senaryoların Karşılaştırması");
    expect(html).toContain("Genel skor");
    expect(html).toContain("Skor değişimi");
    expect(html).toContain("Kategori karşılaştırması");
    expect(html).toContain("Radar karşılaştırması");
    expect((html.match(/Personel/g) ?? [])).toHaveLength(1);
    expect(html).toContain("height:260px");
    expect(html).toContain("height:300px");
    expect(html).toContain("height:320px");
    expect(html).toContain("Senaryo one");
    expect(html).toContain("Senaryo two");
    expect(html).toContain("Karşılaştırma kayıtlı snapshot değerleri üzerinden yapılır; yeniden hesaplama yapılmaz.");
    expect(html).toContain("Mevcut tahmini skor");
    expect(html).toContain("Senaryo tahmini skoru");
    expect(html).toContain("Skor farkı");
    expect(html).toContain("Kayıtlı temel değer");
    expect((html.match(/Senaryo değeri/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain("Değişmedi");
    expect(html).toContain("Kurumsal mevcut değer kullanıldı.");
    expect([first, second]).toEqual(before);
  });
  it("resolves technical THE parameter ids without exposing registry keys", () => {
    const first = make("Akademik Personel Artışı");
    first.changedMetrics = [{ parameterId: "the.common.academicStaffFte", label: "the.common.academicStaffFte", currentValue: 10, scenarioValue: 12 }];
    const html = renderToStaticMarkup(<ScenarioComparison scenarios={[first, make("Uluslararasılaşma")]} />);
    expect(html).toContain("Akademik Personel Sayısı (FTE)");
    expect(html).not.toContain("the.common.academicStaffFte");
  });
  it("THE snapshot kategori ID'lerini Türkçe etiketlerle ve resmî current bandıyla gösterir", () => {
    const item = make("kategori");
    item.scoreReferenceEdition = "THE 2026";
    item.currentRankBand = "1001–1200";
    item.scenarioRankBand = "1001–1200";
    item.currentCategoryScores = { teaching: 1, researchEnvironment: 2, researchQuality: 3, internationalOutlook: 4, industry: 5 };
    item.scenarioCategoryScores = { ...item.currentCategoryScores };
    const html = renderToStaticMarkup(<ScenarioDetailPanel scenario={item} onClose={() => undefined} />);
    for (const label of ["Öğretim", "Araştırma Ortamı", "Araştırma Kalitesi", "Uluslararası Görünüm", "Sanayi"]) expect(html).toContain(label);
    for (const id of ["teaching", "researchEnvironment", "researchQuality", "internationalOutlook", "industry"]) expect(html).not.toContain(`>${id}<`);
    expect(html).toContain("801–1000");
    expect(html).toContain("Kayıtlı eski mevcut bant: 1001–1200");
    expect(html).toContain("Resmî THE 2026 referans bandı: 801–1000");
  });
  it("rejects mixed methodologies and a fifth comparison selection", () => {
    expect(getScenarioSelectionError([make("the")], make("qs", "QS"))).toContain("aynı metodoloji");
    expect(getScenarioSelectionError([make("1"), make("2"), make("3"), make("4")], make("5"))).toContain("en fazla 4");
    expect(renderToStaticMarkup(<ScenarioComparison scenarios={[make("the"), make("qs", "QS")]} />)).toContain("aynı metodoloji");
  });
  it("eklenen açıklamaların Türkçe ve İngilizce karşılıklarını birlikte sağlar", () => {
    expect(scenarioComparisonUiTranslations.tr.comparisonHint).toContain("yeniden hesaplama yapılmaz");
    expect(scenarioComparisonUiTranslations.en.comparisonHint).toContain("no recalculation");
    expect(scenarioComparisonUiTranslations.tr.unchangedHint).toBe("Kurumsal mevcut değer kullanıldı.");
    expect(scenarioComparisonUiTranslations.en.unchangedHint).toBe("The institutional current value was used.");
  });
  it("karşılaştırma görünümü hesaplama motoru çağırmaz", () => {
    const source = readFileSync("src/components/scenarios/ScenariosPage.tsx", "utf8");
    expect(source).not.toMatch(/runThe|calculateQs|calculateUiGreenMetric/);
  });
  it("GreenMetric detayında 7 kategoriyi metodoloji sırasında ve eski eksik GD kaydını güvenli gösterir", () => {
    const item = make("green", "GREENMETRIC");
    item.currentScore = 7420;
    item.scenarioScore = 7295;
    item.scoreDifference = -125;
    item.currentRankBand = "201–250";
    item.scenarioRankBand = "251–300";
    item.currentCategoryScores = { SI: 900, EC: 1200, WS: 1100, WR: 700, TR: 1300, ED: 1120 };
    item.scenarioCategoryScores = { SI: 900, EC: 1075, WS: 1100, WR: 700, TR: 1300, ED: 1120 };
    item.changedMetrics = [{ parameterId: "greenmetric.common.totalAnnualElectricityKwh", label: "greenmetric.common.totalAnnualElectricityKwh", currentValue: 31_000_000, scenarioValue: 40_000_000 }];
    const html = renderToStaticMarkup(<ScenarioDetailPanel scenario={item} onClose={() => undefined} />);
    const positions = ["SI", "EC", "WS", "WR", "TR", "ED", "GD"].map((code) => html.indexOf(`>${code}<`));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(html).toContain("7.420 / 10.000");
    expect(html).toContain("−125");
    expect(html).toContain("201–250 → 251–300");
    expect(html).toContain("31.000.000 kWh");
    expect(html).toContain("40.000.000 kWh");
    expect(html).toContain("— / 1.100");
  });
  it("GreenMetric select ve multiselect değişikliklerini semantic etiketlerle gösterir", () => {
    const item = make("semantic", "GREENMETRIC");
    item.changedMetrics = [
      { parameterId: "greenmetric.gd.sustainabilityReportStatus", label: "greenmetric.gd.sustainabilityReportStatus", currentValue: "2", scenarioValue: "5" },
      { parameterId: "greenmetric.ec.renewableEnergySources", label: "greenmetric.ec.renewableEnergySources", currentValue: ["solar"], scenarioValue: ["solar", "wind"] },
    ];
    const html = renderToStaticMarkup(<ScenarioDetailPanel scenario={item} onClose={() => undefined} />);
    expect(html).toContain("Hazırlık aşamasında");
    expect(html).toContain("Kamuya açık ve yıllık yayımlanıyor");
    expect(html).toContain("Güneş enerjisi");
    expect(html).toContain("Güneş enerjisi, Rüzgâr enerjisi");
    expect(html).not.toContain(">solar<");
  });
  it("GreenMetric karşılaştırmasında eski snapshot dahil daima 7 kategori ve 10.000 ölçeğini kullanır", () => {
    const first = make("gm-one", "GREENMETRIC");
    const second = make("gm-two", "GREENMETRIC");
    first.currentCategoryScores = { SI: 100 };
    first.scenarioCategoryScores = { SI: 200 };
    second.currentCategoryScores = { SI: 100 };
    second.scenarioCategoryScores = { SI: 300 };
    const html = renderToStaticMarkup(<ScenarioComparison scenarios={[first, second]} />);
    expect(getScenarioComparisonCategoryIds([first, second])).toEqual(["SI", "EC", "WS", "WR", "TR", "ED", "GD"]);
    expect(html).toContain("30,00 / 10.000");
    expect(html).toContain("32,00 / 10.000");
  });
});

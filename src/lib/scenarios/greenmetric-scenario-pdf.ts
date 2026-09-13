import { greenMetricCategoryMeta } from "@/src/config/greenmetric.categories";
import { greenMetricPdfTranslations } from "@/src/i18n/greenmetric-pdf";
import {
  formatGreenMetricScenarioValue,
  getGreenMetricScenarioParameterLabel,
} from "@/src/lib/scenarios/scenario-presentation";
import type { SavedScenarioSnapshot } from "@/src/types/saved-scenario";
import {
  buildPdfDocument,
  pdfLine as line,
  pdfRect as rect,
  pdfRectStroke as rectStroke,
  pdfText as text,
  wrapPdfText as wrapText,
} from "@/src/lib/scenarios/pdf-report-document";

export type GreenMetricPdfLanguage = "tr" | "en";

type CategoryRow = {
  code: string;
  label: string;
  baseline: number | null;
  scenario: number | null;
  difference: number | null;
  maximum: number;
};

type ParameterRow = { label: string; current: string; scenario: string };
type IndicatorRow = { code: string; baseline: number; scenario: number; difference: number };

export type GreenMetricPdfScenarioModel = {
  name: string;
  institutionYear: string | null;
  currentScore: number | null;
  scenarioScore: number | null;
  scoreDifference: number | null;
  currentRankBand: string | null;
  scenarioRankBand: string | null;
  categories: CategoryRow[];
  changedParameters: ParameterRow[];
  changedIndicators: IndicatorRow[];
  warnings: string[];
};

const CATEGORY_LABELS = {
  SI: { tr: "Yerleşim ve Altyapı", en: "Setting and Infrastructure" },
  EC: { tr: "Enerji ve İklim Değişikliği", en: "Energy and Climate Change" },
  WS: { tr: "Atık", en: "Waste" },
  WR: { tr: "Su", en: "Water" },
  TR: { tr: "Ulaşım", en: "Transportation" },
  ED: { tr: "Eğitim ve Araştırma", en: "Education and Research" },
  GD: { tr: "Yönetişim ve Dijitalleşme", en: "Governance and Digitalization" },
} as const;

export function createGreenMetricPdfReportModel(
  scenario: SavedScenarioSnapshot,
  language: GreenMetricPdfLanguage,
): GreenMetricPdfScenarioModel {
  const locale = language === "tr" ? "tr-TR" : "en-US";
  return {
    name: scenario.name,
    institutionYear: scenario.institutionalDataYear,
    currentScore: finiteOrNull(scenario.currentScore),
    scenarioScore: finiteOrNull(scenario.scenarioScore),
    scoreDifference: finiteOrNull(scenario.scoreDifference),
    currentRankBand: scenario.currentRankBand,
    scenarioRankBand: scenario.scenarioRankBand,
    categories: greenMetricCategoryMeta.map((category) => {
      const baseline = finiteOrNull(scenario.currentCategoryScores?.[category.code]);
      const proposed = finiteOrNull(scenario.scenarioCategoryScores?.[category.code]);
      return {
        code: category.code,
        label: CATEGORY_LABELS[category.code][language],
        baseline,
        scenario: proposed,
        difference: baseline === null || proposed === null ? null : proposed - baseline,
        maximum: category.maxScore,
      };
    }),
    changedParameters: uniqueChanges(scenario.changedMetrics).map((change) => ({
      label: getGreenMetricScenarioParameterLabel(change.parameterId, change.label, language),
      current: formatGreenMetricScenarioValue(change.parameterId, change.currentValue, language, locale),
      scenario: formatGreenMetricScenarioValue(change.parameterId, change.scenarioValue, language, locale),
    })),
    changedIndicators: changedIndicatorRows(scenario),
    warnings: [...scenario.warnings],
  };
}

export function buildGreenMetricScenarioPdf(
  scenarios: readonly SavedScenarioSnapshot[],
  language: GreenMetricPdfLanguage,
  now: Date,
) {
  const models = scenarios.map((scenario) => createGreenMetricPdfReportModel(scenario, language));
  const renderer = new GreenMetricPdfRenderer(language, now);
  models.forEach((model, index) => renderer.addScenario(model, index > 0));
  return renderer.finish();
}

function changedIndicatorRows(scenario: SavedScenarioSnapshot): IndicatorRow[] {
  if (!scenario.currentIndicatorScores || !scenario.scenarioIndicatorScores) return [];
  const codes = [...new Set([
    ...Object.keys(scenario.currentIndicatorScores),
    ...Object.keys(scenario.scenarioIndicatorScores),
  ])];
  return codes.flatMap((code) => {
    const baseline = finiteOrNull(scenario.currentIndicatorScores?.[code]);
    const proposed = finiteOrNull(scenario.scenarioIndicatorScores?.[code]);
    if (baseline === null || proposed === null || baseline === proposed) return [];
    return [{ code, baseline, scenario: proposed, difference: proposed - baseline }];
  });
}

class GreenMetricPdfRenderer {
  private readonly pages: string[][] = [];
  private page: string[] = [];
  private y = 0;
  private readonly t;
  private readonly locale: string;
  private readonly now: Date;

  constructor(language: GreenMetricPdfLanguage, now: Date) {
    this.now = now;
    this.t = greenMetricPdfTranslations[language];
    this.locale = language === "tr" ? "tr-TR" : "en-US";
  }

  addScenario(model: GreenMetricPdfScenarioModel, forcePageBreak: boolean) {
    if (!this.pages.length || forcePageBreak) this.startPage();
    this.title(this.t.title, this.t.subtitle);
    this.meta(model);
    this.sectionTitle(this.t.scoreSummary);
    this.summaryCards([
      [this.t.baselineScore, this.score(model.currentScore)],
      [this.t.scenarioScore, this.score(model.scenarioScore)],
      [this.t.scoreDifference, this.signed(model.scoreDifference)],
    ]);
    this.sectionTitle(this.t.rankSummary);
    this.summaryCards([
      [this.t.baselineRank, model.currentRankBand ?? this.t.missing],
      [this.t.scenarioRank, model.scenarioRankBand ?? this.t.missing],
    ]);
    this.paragraph(this.t.rankNote, 8, "muted");
    this.sectionTitle(this.t.categorySummary);
    this.table(
      [this.t.category, this.t.baseline, this.t.scenarioColumn, this.t.difference, this.t.maximum],
      [190, 78, 78, 72, 72],
      model.categories.map((row) => [
        `${row.code} - ${row.label}`,
        this.number(row.baseline),
        this.number(row.scenario),
        this.signed(row.difference),
        this.number(row.maximum),
      ]),
    );
    this.sectionTitle(this.t.changedParameters);
    if (model.changedParameters.length) {
      this.table(
        [this.t.parameter, this.t.currentValue, this.t.scenarioValue],
        [220, 135, 135],
        model.changedParameters.map((row) => [row.label, row.current, row.scenario]),
      );
    } else this.empty(this.t.noChangedParameters);
    this.sectionTitle(this.t.changedIndicators);
    if (model.changedIndicators.length) {
      this.table(
        [this.t.indicator, this.t.baseline, this.t.scenarioColumn, this.t.difference],
        [190, 100, 100, 100],
        model.changedIndicators.map((row) => [row.code, this.number(row.baseline), this.number(row.scenario), this.signed(row.difference)]),
      );
    } else this.empty(this.t.noChangedIndicators);
    if (model.warnings.length) {
      this.sectionTitle(this.t.warnings);
      model.warnings.forEach((warning) => this.paragraph(`- ${warning}`, 8, "warning"));
    }
  }

  finish() {
    this.flushPage();
    const pageCount = this.pages.length;
    this.pages.forEach((commands, index) => {
      commands.push(line(42, 34, 553, 34, "0.82 0.85 0.89"));
      commands.push(text(42, 20, 7, this.t.simulationReport, "F1", "0.38 0.43 0.50"));
      commands.push(text(248, 20, 7, this.now.toLocaleDateString(this.locale), "F1", "0.38 0.43 0.50"));
      commands.push(text(500, 20, 7, `${this.t.page} ${index + 1} / ${pageCount}`, "F1", "0.38 0.43 0.50"));
    });
    return buildPdfDocument(this.pages);
  }

  private startPage() {
    this.flushPage();
    this.page = [];
    this.pages.push(this.page);
    this.y = 800;
    this.page.push(rect(0, 818, 595, 24, "0.04 0.34 0.22"));
    this.page.push(text(42, 826, 8, "UI GREENMETRIC 2026", "F2", "1 1 1"));
  }

  private flushPage() {
    if (this.page.length && this.pages.at(-1) !== this.page) this.pages.push(this.page);
  }

  private ensure(height: number, tableHeader?: () => void) {
    if (this.y - height >= 48) return;
    this.startPage();
    tableHeader?.();
  }

  private title(titleValue: string, subtitle: string) {
    this.ensure(58);
    this.page.push(text(42, this.y, 18, titleValue, "F2", "0.06 0.10 0.18"));
    this.y -= 22;
    this.page.push(text(42, this.y, 9, subtitle, "F1", "0.38 0.43 0.50"));
    this.y -= 22;
  }

  private meta(model: GreenMetricPdfScenarioModel) {
    this.ensure(36);
    this.page.push(rect(42, this.y - 26, 511, 34, "0.96 0.98 0.97"));
    this.page.push(text(52, this.y - 3, 8, `${this.t.scenario}: ${model.name}`, "F2", "0.06 0.10 0.18"));
    this.page.push(text(300, this.y - 3, 8, `${this.t.institutionYear}: ${model.institutionYear ?? this.t.missing}`, "F1", "0.25 0.30 0.36"));
    this.page.push(text(52, this.y - 17, 8, `${this.t.reportDate}: ${this.now.toLocaleDateString(this.locale)}`, "F1", "0.25 0.30 0.36"));
    this.y -= 42;
  }

  private sectionTitle(value: string) {
    this.ensure(30);
    this.y -= 6;
    this.page.push(text(42, this.y, 11, value, "F2", "0.04 0.34 0.22"));
    this.y -= 16;
  }

  private summaryCards(cards: [string, string][]) {
    const gap = 8;
    const width = (511 - gap * (cards.length - 1)) / cards.length;
    this.ensure(52);
    cards.forEach(([label, value], index) => {
      const x = 42 + index * (width + gap);
      this.page.push(rectStroke(x, this.y - 42, width, 46, "0.96 0.98 0.97", "0.82 0.85 0.89"));
      this.page.push(text(x + 9, this.y - 10, 7, label, "F1", "0.38 0.43 0.50"));
      this.page.push(text(x + 9, this.y - 29, 12, value, "F2", "0.06 0.10 0.18"));
    });
    this.y -= 54;
  }

  private paragraph(value: string, fontSize: number, tone: "muted" | "warning") {
    const lines = wrapText(value, 95);
    this.ensure(lines.length * 11 + 6);
    const color = tone === "warning" ? "0.55 0.30 0.02" : "0.38 0.43 0.50";
    lines.forEach((part) => {
      this.page.push(text(42, this.y, fontSize, part, "F1", color));
      this.y -= 11;
    });
    this.y -= 4;
  }

  private empty(value: string) {
    this.ensure(28);
    this.page.push(rectStroke(42, this.y - 20, 511, 25, "0.98 0.98 0.98", "0.87 0.89 0.91"));
    this.page.push(text(51, this.y - 11, 8, value, "F1", "0.38 0.43 0.50"));
    this.y -= 32;
  }

  private table(headers: string[], widths: number[], rows: string[][]) {
    const drawHeader = () => {
      const height = 22;
      let x = 42;
      this.page.push(rect(42, this.y - height, widths.reduce((sum, width) => sum + width, 0), height, "0.91 0.95 0.93"));
      headers.forEach((header, index) => {
        this.page.push(text(x + 6, this.y - 14, 7, header, "F2", "0.12 0.22 0.18"));
        x += widths[index];
      });
      this.y -= height;
    };
    this.ensure(24);
    drawHeader();
    rows.forEach((row, rowIndex) => {
      const wrapped = row.map((cell, index) => wrapText(cell, Math.max(8, Math.floor(widths[index] / 5.3))));
      const height = Math.max(22, Math.max(...wrapped.map((parts) => parts.length)) * 10 + 8);
      this.ensure(height, drawHeader);
      const fill = rowIndex % 2 === 0 ? "1 1 1" : "0.98 0.99 0.98";
      const bottom = this.y - height;
      this.page.push(rectStroke(42, bottom, widths.reduce((sum, width) => sum + width, 0), height, fill, "0.89 0.91 0.92"));
      let x = 42;
      wrapped.forEach((parts, columnIndex) => {
        parts.forEach((part, lineIndex) => this.page.push(text(x + 6, this.y - 14 - lineIndex * 10, 7.5, part, columnIndex === 0 ? "F2" : "F1", "0.16 0.20 0.25")));
        x += widths[columnIndex];
      });
      this.y = bottom;
    });
    this.y -= 8;
  }

  private number(value: number | null) {
    return value === null ? this.t.missing : value.toLocaleString(this.locale, { maximumFractionDigits: 2 });
  }

  private score(value: number | null) {
    return `${this.number(value)} / ${10_000..toLocaleString(this.locale)}`;
  }

  private signed(value: number | null) {
    if (value === null) return this.t.missing;
    if (value === 0) return "0";
    return `${value > 0 ? "+" : "-"}${Math.abs(value).toLocaleString(this.locale, { maximumFractionDigits: 2 })}`;
  }
}

const finiteOrNull = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;
const metricKey = (change: SavedScenarioSnapshot["changedMetrics"][number]) => `${change.parameterId}::${change.field ?? ""}`;
const uniqueChanges = (changes: SavedScenarioSnapshot["changedMetrics"]) => [...new Map(changes.map((change) => [metricKey(change), change])).values()];

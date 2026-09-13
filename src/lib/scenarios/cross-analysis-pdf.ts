import { crossAnalysisPdfTranslations } from "@/src/i18n/cross-analysis-pdf";
import { crossAnalysisUiTranslations } from "@/src/i18n/cross-analysis-ui";
import { formatCrossAnalysisScore } from "@/src/components/cross-analysis/crossAnalysisUi";
import {
  CROSS_ANALYSIS_PARAMETER_BY_ID,
  CROSS_ANALYSIS_ARCHIVED_PARAMETER_BY_ID,
  getCrossAnalysisMetricPresentations,
  type CrossAnalysisBaselineSnapshot,
  type CrossAnalysisInput,
  type CrossAnalysisMethodologyId,
  type CrossAnalysisMethodologyResult,
  type CrossAnalysisResult,
} from "@/src/lib/cross-analysis";
import {
  buildPdfDocument,
  pdfLine,
  pdfRect,
  pdfRectStroke,
  pdfText,
  wrapPdfText,
} from "@/src/lib/scenarios/pdf-report-document";
import type { SavedCrossAnalysisScenarioSnapshot } from "@/src/types/saved-scenario";

export type CrossAnalysisPdfLanguage = "tr" | "en";

export type CrossAnalysisReportParameter = {
  parameterId: CrossAnalysisInput["parameterId"];
  label: string;
  currentValue: string;
  proposedValue: string;
  unit: string;
  affectedMethodologies: string[];
};

export type CrossAnalysisReportMethodology = {
  id: CrossAnalysisMethodologyId;
  label: string;
  affected: boolean;
  status: CrossAnalysisMethodologyResult<unknown>["status"];
  baselineScore: string;
  proposedScore: string;
  scoreDelta: string;
  baselineRankBand: string;
  proposedRankBand: string;
  impactedMetrics: string[];
  rankMetadata: string[];
  warnings: string[];
  baselineYear: number | null;
  baselineSource: string;
};

export type CrossAnalysisReportData = {
  name: string;
  createdAt: string;
  dataYears: string;
  parameters: CrossAnalysisReportParameter[];
  methodologies: CrossAnalysisReportMethodology[];
  invalid: boolean;
};

type ReportInput = {
  name: string;
  createdAt: string;
  baseline: CrossAnalysisBaselineSnapshot;
  overrides: readonly CrossAnalysisInput[];
  result: CrossAnalysisResult;
};

const methodologyLabels: Record<CrossAnalysisMethodologyId, string> = {
  the: "THE",
  qs: "QS",
};

export function createCrossAnalysisReportData(
  input: ReportInput,
  language: CrossAnalysisPdfLanguage,
): CrossAnalysisReportData {
  const locale = language === "tr" ? "tr-TR" : "en-US";
  const result = input.result;
  return {
    name: input.name,
    createdAt: input.createdAt,
    dataYears: formatDataYears(input.baseline),
    parameters: input.overrides
      .filter((change) => change.baselineValue !== change.proposedValue)
      .flatMap((change) => {
        const definition = CROSS_ANALYSIS_PARAMETER_BY_ID.get(change.parameterId) ??
          CROSS_ANALYSIS_ARCHIVED_PARAMETER_BY_ID.get(change.parameterId);
        if (!definition) return [];
        return [{
          parameterId: change.parameterId,
          label: definition.labels[language],
          currentValue: formatParameterValue(change.baselineValue, locale),
          proposedValue: formatParameterValue(change.proposedValue, locale),
          unit: definition.unit,
          affectedMethodologies: definition.affectedMethodologies.map((id) => methodologyLabels[id]),
        }];
      }),
    methodologies: (Object.keys(methodologyLabels) as CrossAnalysisMethodologyId[]).map((id) =>
      methodologyReport(id, result.methodologies[id], locale, language)),
    invalid: result.validationIssues.length > 0 ||
      Object.values(result.methodologies).some((methodology) => methodology.status === "invalid"),
  };
}

export function createSavedCrossAnalysisReportData(
  scenario: SavedCrossAnalysisScenarioSnapshot,
  language: CrossAnalysisPdfLanguage,
) {
  return createCrossAnalysisReportData({
    name: scenario.name,
    createdAt: scenario.createdAt,
    baseline: scenario.crossAnalysis.baselineSnapshot,
    overrides: scenario.crossAnalysis.overrides,
    result: scenario.crossAnalysis.resultSnapshot,
  }, language);
}

export function validateCrossAnalysisReportData(data: CrossAnalysisReportData) {
  if (!data.parameters.length) return "empty" as const;
  if (data.invalid) return "invalid" as const;
  return null;
}

export function buildCrossAnalysisPdf(
  data: CrossAnalysisReportData,
  language: CrossAnalysisPdfLanguage,
  now = new Date(),
) {
  const error = validateCrossAnalysisReportData(data);
  if (error) throw new Error(error);
  return new CrossAnalysisPdfRenderer(language, now).render(data);
}

export function crossAnalysisPdfFilename(name: string, now = new Date()) {
  const safeName = name
    .replace(/[ıİ]/g, (character) => character === "ı" ? "i" : "I")
    .replace(/[şŞ]/g, (character) => character === "ş" ? "s" : "S")
    .replace(/[ğĞ]/g, (character) => character === "ğ" ? "g" : "G")
    .replace(/[çÇ]/g, (character) => character === "ç" ? "c" : "C")
    .replace(/[öÖ]/g, (character) => character === "ö" ? "o" : "O")
    .replace(/[üÜ]/g, (character) => character === "ü" ? "u" : "U")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "analysis";
  return `university-ranking-cross-analysis-${safeName}-${now.toISOString().slice(0, 10)}.pdf`;
}

function methodologyReport(
  id: CrossAnalysisMethodologyId,
  result: CrossAnalysisMethodologyResult<unknown>,
  locale: string,
  language: CrossAnalysisPdfLanguage,
): CrossAnalysisReportMethodology {
  const displayValues = result.affected && result.status === "complete";
  const displayBaseline = result.baselineScore !== null;
  const displayUnaffectedBaseline = !result.affected && displayBaseline && result.baselineContext.usable;
  const missing = crossAnalysisPdfTranslations[language].missing;
  return {
    id,
    label: methodologyLabels[id],
    affected: result.affected,
    status: result.status,
    baselineScore: displayBaseline ? formatCrossAnalysisScore(result.baselineScore, id, locale) : missing,
    proposedScore: displayValues
      ? formatCrossAnalysisScore(result.proposedScore, id, locale)
      : displayUnaffectedBaseline
        ? formatCrossAnalysisScore(result.proposedScore ?? result.baselineScore, id, locale)
        : missing,
    scoreDelta: displayValues
      ? formatCrossAnalysisScore(result.scoreDelta, id, locale, true)
      : displayUnaffectedBaseline
        ? formatCrossAnalysisScore(result.scoreDelta ?? 0, id, locale, true)
        : missing,
    baselineRankBand: displayBaseline ? result.baselineRankBand ?? missing : missing,
    proposedRankBand: displayValues
      ? result.proposedRankBand ?? missing
      : displayUnaffectedBaseline
        ? result.proposedRankBand ?? result.baselineRankBand ?? missing
        : missing,
    impactedMetrics: getCrossAnalysisMetricPresentations(id, result.impactedMetrics, language)
      .map((metric) => `${metric.code} — ${metric.label}${metric.scoreUsage === "indicator-only" ? ` (${crossAnalysisUiTranslations[language].scoreImpactIndicatorOnly})` : ""}`),
    rankMetadata: rankMetadata(id, result, language),
    warnings: [...result.warnings],
    baselineYear: result.baselineContext.year,
    baselineSource: result.baselineContext.source,
  };
}

function rankMetadata(
  id: CrossAnalysisMethodologyId,
  result: CrossAnalysisMethodologyResult<unknown>,
  language: CrossAnalysisPdfLanguage,
) {
  const t = crossAnalysisPdfTranslations[language];
  const metadata = result.rankMetadata as CrossAnalysisResult["methodologies"][typeof id]["rankMetadata"];
  const parts: string[] = [];
  if (id === "the") {
    const typed = metadata as CrossAnalysisResult["methodologies"]["the"]["rankMetadata"];
    const confidence = typed.proposed.estimate?.rawEstimate.confidence;
    if (confidence) parts.push(confidenceLabel(confidence, t));
  } else if (id === "qs") {
    const typed = metadata as CrossAnalysisResult["methodologies"]["qs"]["rankMetadata"];
    if (typed.approximate) parts.push(t.approximate);
    if (typed.proposed.modelConfidence.level) parts.push(confidenceLabel(typed.proposed.modelConfidence.level, t));
    parts.push(`${t.methodologyYear}: ${typed.methodologyYear}`);
  }
  return parts;
}

function confidenceLabel(value: string, t: typeof crossAnalysisPdfTranslations.tr | typeof crossAnalysisPdfTranslations.en) {
  const normalized = value.toLowerCase();
  if (normalized === "high") return t.confidenceHigh;
  if (normalized === "medium") return t.confidenceMedium;
  return t.confidenceLow;
}

function formatDataYears(baseline: CrossAnalysisBaselineSnapshot) {
  return `THE ${baseline.years.the ?? "N/A"} · QS ${baseline.years.qs}`;
}

const formatParameterValue = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);

class CrossAnalysisPdfRenderer {
  private readonly pages: string[][] = [];
  private page: string[] = [];
  private y = 0;
  private readonly t;
  private readonly locale: string;

  constructor(language: CrossAnalysisPdfLanguage, private readonly now: Date) {
    this.t = crossAnalysisPdfTranslations[language];
    this.locale = language === "tr" ? "tr-TR" : "en-US";
  }

  render(data: CrossAnalysisReportData) {
    this.startPage();
    this.title();
    this.meta(data);
    this.section(this.t.changedParameters);
    this.table(
      [this.t.parameter, this.t.currentValue, this.t.newValue, this.t.unit, this.t.affectedMethodologies],
      [150, 76, 76, 50, 159],
      data.parameters.map((item) => [item.label, item.currentValue, item.proposedValue, item.unit, item.affectedMethodologies.join(" · ")]),
    );
    this.section(this.t.methodologySummary);
    this.table(
      [this.t.methodology, this.t.currentScore, this.t.newScore, this.t.difference, this.t.currentBand, this.t.newBand],
      [74, 86, 86, 58, 103, 104],
      data.methodologies.map((item) => [item.label, item.baselineScore, item.proposedScore, !item.affected || item.status === "complete" ? item.scoreDelta : this.shortStatusText(item), item.baselineRankBand, item.proposedRankBand]),
    );
    data.methodologies.forEach((item) => this.methodologySection(item));
    this.finishPages();
    return buildPdfDocument(this.pages);
  }

  private startPage() {
    this.page = [];
    this.pages.push(this.page);
    this.y = 796;
    this.page.push(pdfRect(0, 818, 595, 24, "0.10 0.24 0.46"));
    this.page.push(pdfText(42, 826, 8, "CROSS ANALYSIS", "F2", "1 1 1"));
  }

  private ensure(height: number, header?: () => void) {
    if (this.y - height >= 48) return;
    this.startPage();
    header?.();
  }

  private title() {
    this.page.push(pdfText(42, this.y, 19, this.t.title, "F2", "0.06 0.10 0.18"));
    this.y -= 23;
    for (const line of wrapPdfText(this.t.subtitle, 92)) {
      this.page.push(pdfText(42, this.y, 9, line, "F1", "0.38 0.43 0.50"));
      this.y -= 12;
    }
    this.y -= 8;
  }

  private meta(data: CrossAnalysisReportData) {
    this.ensure(62);
    this.page.push(pdfRectStroke(42, this.y - 52, 511, 58, "0.95 0.97 1", "0.80 0.85 0.92"));
    this.page.push(pdfText(52, this.y - 9, 8, `${this.t.analysis}: ${data.name}`, "F2", "0.06 0.10 0.18"));
    this.page.push(pdfText(52, this.y - 25, 8, `${this.t.dataYears}: ${data.dataYears}`, "F1", "0.25 0.30 0.36"));
    this.page.push(pdfText(52, this.y - 41, 8, `${this.t.createdAt}: ${new Date(data.createdAt).toLocaleDateString(this.locale)}`, "F1", "0.25 0.30 0.36"));
    this.page.push(pdfText(360, this.y - 41, 8, `${this.t.reportDate}: ${this.now.toLocaleDateString(this.locale)}`, "F1", "0.25 0.30 0.36"));
    this.y -= 68;
  }

  private section(value: string) {
    this.ensure(30);
    this.y -= 5;
    this.page.push(pdfText(42, this.y, 11, value, "F2", "0.10 0.24 0.46"));
    this.y -= 17;
  }

  private table(headers: string[], widths: number[], rows: string[][]) {
    const drawHeader = () => {
      this.page.push(pdfRect(42, this.y - 22, 511, 22, "0.91 0.94 0.98"));
      let x = 42;
      headers.forEach((header, index) => {
        this.page.push(pdfText(x + 5, this.y - 14, 6.8, header, "F2", "0.10 0.20 0.36"));
        x += widths[index];
      });
      this.y -= 22;
    };
    this.ensure(24);
    drawHeader();
    rows.forEach((row, rowIndex) => {
      const wrapped = row.map((cell, index) => wrapPdfText(cell, Math.max(7, Math.floor(widths[index] / 5.2))));
      const height = Math.max(23, Math.max(...wrapped.map((cell) => cell.length)) * 10 + 8);
      this.ensure(height, drawHeader);
      const bottom = this.y - height;
      this.page.push(pdfRectStroke(42, bottom, 511, height, rowIndex % 2 ? "0.98 0.99 1" : "1 1 1", "0.87 0.89 0.93"));
      let x = 42;
      wrapped.forEach((cell, column) => {
        cell.forEach((line, lineIndex) => this.page.push(pdfText(x + 5, this.y - 14 - lineIndex * 10, 7.2, line, column === 0 ? "F2" : "F1", "0.16 0.20 0.25")));
        x += widths[column];
      });
      this.y = bottom;
    });
    this.y -= 8;
  }

  private methodologySection(item: CrossAnalysisReportMethodology) {
    this.section(item.label);
    this.paragraph(`${this.t.baselineData}: ${item.baselineYear ?? this.t.missing} (${item.baselineSource})`, "muted");
    if (!item.affected || item.status !== "complete") {
      this.table(
        [this.t.currentScore, this.t.newScore, this.t.difference, this.t.currentBand, this.t.newBand],
        [102, 102, 74, 116, 117],
        [[item.baselineScore, item.proposedScore, !item.affected ? item.scoreDelta : this.t.missing, item.baselineRankBand, item.proposedRankBand]],
      );
      this.notice(this.statusText(item));
      return;
    }
    this.table(
      [this.t.currentScore, this.t.newScore, this.t.difference, this.t.currentBand, this.t.newBand],
      [102, 102, 74, 116, 117],
      [[item.baselineScore, item.proposedScore, item.scoreDelta, item.baselineRankBand, item.proposedRankBand]],
    );
    if (item.rankMetadata.length) this.paragraph(`${this.t.estimatedRankBand}: ${item.rankMetadata.join(" · ")}`, "muted");
    this.paragraph(`${this.t.impactedMetrics}: ${item.impactedMetrics.length ? item.impactedMetrics.join(", ") : this.t.noImpactedMetrics}`, "normal");
    item.warnings.forEach((warning) => this.paragraph(warning, "warning"));
  }

  private statusText(item: CrossAnalysisReportMethodology) {
    if (!item.affected || item.status === "not-affected") return this.t.notAffected;
    if (item.status === "raw-impact-only") return this.t.rawImpactOnly;
    if (item.status === "insufficient-data") return this.t.insufficientData;
    return this.t.invalidData;
  }

  private shortStatusText(item: CrossAnalysisReportMethodology) {
    if (!item.affected || item.status === "not-affected") return this.t.notAffectedShort;
    if (item.status === "raw-impact-only") return this.t.rawImpactOnlyShort;
    if (item.status === "insufficient-data") return this.t.insufficientDataShort;
    return this.t.invalidDataShort;
  }

  private notice(value: string) {
    const lines = wrapPdfText(value, 92);
    this.ensure(lines.length * 11 + 18);
    this.page.push(pdfRectStroke(42, this.y - lines.length * 11 - 8, 511, lines.length * 11 + 12, "0.98 0.98 0.98", "0.87 0.89 0.91"));
    lines.forEach((line, index) => this.page.push(pdfText(51, this.y - 10 - index * 11, 8, line, "F1", "0.35 0.39 0.45")));
    this.y -= lines.length * 11 + 18;
  }

  private paragraph(value: string, tone: "normal" | "muted" | "warning") {
    const lines = wrapPdfText(value, 94);
    this.ensure(lines.length * 11 + 6);
    const color = tone === "warning" ? "0.58 0.30 0.02" : tone === "muted" ? "0.38 0.43 0.50" : "0.16 0.20 0.25";
    lines.forEach((line) => {
      this.page.push(pdfText(42, this.y, 8, line, "F1", color));
      this.y -= 11;
    });
    this.y -= 5;
  }

  private finishPages() {
    const pageCount = this.pages.length;
    this.pages.forEach((page, index) => {
      page.push(pdfLine(42, 34, 553, 34, "0.82 0.85 0.89"));
      page.push(pdfText(42, 20, 7, this.t.simulationFooter, "F1", "0.38 0.43 0.50"));
      page.push(pdfText(508, 20, 7, `${this.t.page} ${index + 1}/${pageCount}`, "F1", "0.38 0.43 0.50"));
    });
  }
}

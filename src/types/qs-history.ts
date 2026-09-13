import type { QsInstitutionalInputByRowId } from "@/src/types/qsInstitutional";
import type { QsIndicatorCode } from "./qs";

export type QsHistoricalInstitutionalInputs =
  QsInstitutionalInputByRowId;

export interface QsPublishedResult {
  overallScore: number | null;
  exactRank: number | null;
  rankBand: string | null;
}

export interface QsHistoricalDataSource {
  name: string | null;
  description: string | null;

  /**
   * YYYY-MM-DD formatında tutulur.
   */
  collectedAt: string | null;
}

export interface QsHistoricalRecord {
  id: string;

  /**
   * Kurumsal verinin ait olduğu raporlama yılıdır.
   * QS sıralama baskısı yılıyla aynı olmak zorunda değildir.
   */
  dataYear: number;

  /**
   * Örnek: "QS World University Rankings 2025"
   * Eşleşme bilinmiyorsa null bırakılır.
   */
  rankingEdition: string | null;

  institutionalInputs: QsHistoricalInstitutionalInputs;

  /**
   * Yalnızca QS tarafından yayımlanan resmî sonuçlar burada tutulur.
   * Simülatörün tahmini skorları buraya yazılmaz.
   */
  publishedResult: QsPublishedResult;
  indicatorScores?: Partial<Record<QsIndicatorCode, number | null>>;
  /**
   * Aynı kaydın resmî gösterge skoruyla eşleştirilebilen ham oranlarıdır.
   * Yalnızca oran göstergelerinin seçili-yıl kalibrasyonunda kullanılır.
   */
  rawIndicatorValues?: Partial<Record<QsIndicatorCode, number | null>>;

  source: QsHistoricalDataSource;
}

export interface QsHistoricalDataset {
  schemaVersion: 1;
  methodology: "QS";

  institution: {
    id: string;
    name: string;
  };

  records: QsHistoricalRecord[];
}

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecommendationPdfNotice } from "./RecommendationPdfNotice";

const t = (key: string) => ({
  "recommendationUi.pdfReview": "PDF Olarak İncele",
  "recommendationUi.pdfDescription": "Mevcut öneri planını rapor önizlemesinde görüntüleyin ve PDF olarak indirin.",
  "recommendationUi.pdfNeedsAnalysis": "PDF raporu oluşturmak için önce geçerli bir analiz çalıştırın.",
  "recommendationUi.pdfPreview": "Öneri Planı PDF Önizlemesi",
  "recommendationUi.pdfDownload": "PDF İndir",
  "recommendationUi.pdfClose": "Kapat",
  "recommendationUi.pdfPreparing": "PDF hazırlanıyor…",
  "recommendationUi.pdfSuccess": "PDF raporu oluşturuldu.",
  "recommendationUi.pdfError": "PDF raporu oluşturulamadı.",
}[key] ?? key);

describe("RecommendationPdfNotice", () => {
  it("is disabled and does not render an empty preview without a report", () => {
    const html = renderToStaticMarkup(<RecommendationPdfNotice model={null} language="tr" t={t} />);
    expect(html).toContain("disabled");
    expect(html).toContain("PDF raporu oluşturmak için önce geçerli bir analiz çalıştırın.");
    expect(html).not.toContain("Yakında");
  });
});

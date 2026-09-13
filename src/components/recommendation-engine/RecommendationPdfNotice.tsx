"use client";

import { useEffect, useRef, useState } from "react";
import type { AppLanguage } from "@/src/i18n/types";
import { createRecommendationPdf, renderRecommendationReport, type RecommendationReportModel } from "@/src/lib/recommendation-engine/recommendation-report";

export function RecommendationPdfNotice({
  model,
  language,
  t,
}: {
  model: RecommendationReportModel | null;
  language: AppLanguage;
  t: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const inFlight = useRef(false);
  const labels = {
    review: t("recommendationUi.pdfReview"), description: t("recommendationUi.pdfDescription"), empty: t("recommendationUi.pdfNeedsAnalysis"),
    preview: t("recommendationUi.pdfPreview"), download: t("recommendationUi.pdfDownload"), close: t("recommendationUi.pdfClose"), preparing: t("recommendationUi.pdfPreparing"), success: t("recommendationUi.pdfSuccess"), error: t("recommendationUi.pdfError"),
  };
  const disabled = !model || loading;

  useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab") {
        const dialog = document.querySelector<HTMLElement>("[role=dialog]");
        const focusable = dialog ? [...dialog.querySelectorAll<HTMLElement>("button:not(:disabled), [tabindex='0']")] : [];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) triggerRef.current?.focus();
  }, [open]);

  const download = async () => {
    if (!model || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setMessage(null);
    try {
      const report = createRecommendationPdf(model, language);
      const blob = new Blob([report.bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = report.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(labels.success);
    } catch {
      setMessage(labels.error);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-describedby="recommendation-pdf-status"
        onClick={() => { setMessage(null); setOpen(true); }}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
      >{labels.review}</button>
      <p id="recommendation-pdf-status" className="max-w-md text-xs leading-5 text-slate-500">{model ? labels.description : labels.empty}</p>
      {message ? <p className="text-xs text-slate-600" role="status">{message}</p> : null}
      {open && model ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-busy={loading} aria-labelledby="recommendation-pdf-title">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-slate-100 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b bg-white px-5 py-4">
              <h2 id="recommendation-pdf-title" ref={titleRef} tabIndex={-1} className="text-lg font-semibold text-slate-950">{labels.preview}</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-3 py-2 text-sm font-semibold">{labels.close}</button>
            </div>
            <div className="overflow-y-auto p-5" aria-busy={loading}>
              <pre className="mx-auto min-h-[600px] max-w-3xl whitespace-pre-wrap rounded-sm bg-white p-8 font-sans text-sm leading-6 shadow-sm">{renderRecommendationReport(model, language).join("\n")}</pre>
            </div>
            <div className="flex items-center justify-end gap-3 border-t bg-white px-5 py-4">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-semibold">{labels.close}</button>
              <button type="button" disabled={loading} aria-busy={loading} onClick={() => void download()} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? labels.preparing : labels.download}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { AppLanguage } from "@/src/i18n/types";
import { formatRecommendationScore, type RecommendationMethodologyId } from "@/src/lib/recommendation-engine";
import { createRecommendationCategoryChartData, type RecommendationCategoryChartDatum } from "./recommendationCategoryChartData";

const isDatum = (value: unknown): value is RecommendationCategoryChartDatum => typeof value === "object" && value !== null && "label" in value && "current" in value && "constrained" in value && "recommended" in value;

function CategoryTooltip({ active, payload, language, t, showConstrained }: TooltipContentProps & { language: AppLanguage; t: (key: string) => string; showConstrained: boolean }) {
  const datum = payload?.[0]?.payload;
  if (!active || !isDatum(datum)) return null;
  const locale = language === "tr" ? "tr-TR" : "en-US";
  const format = (value: number | null) => showConstrained ? formatRecommendationScore(value) : value === null ? "—" : new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  const difference = datum.current === null || datum.recommended === null ? null : datum.recommended - datum.current;
  return <div className="rounded-2xl border border-white/80 bg-slate-950/95 px-4 py-3 text-sm text-slate-200 shadow-2xl backdrop-blur-xl"><p className="font-bold text-white">{datum.label}</p><p className="mt-2">{t("recommendation.current")}: {format(datum.current)}</p>{showConstrained ? <p>Kullanıcı Değerleri Sonrası: {format(datum.constrained)}</p> : null}<p>{t("recommendation.recommended")}: {format(datum.recommended)}</p><p className="mt-1 font-semibold text-emerald-300">{t("recommendation.increase")}: {difference !== null && difference > 0 ? "+" : ""}{format(difference)}</p></div>;
}

export function RecommendationCategoryChart({ methodology, current, constrained = current, recommended, language, t }: { methodology: RecommendationMethodologyId; current: Record<string, number | null>; constrained?: Record<string, number | null>; recommended: Record<string, number | null>; language: AppLanguage; t: (key: string) => string }) {
  const data = createRecommendationCategoryChartData({ methodology, current, constrained, recommended, language });
  const showConstrained = methodology !== "ui-greenmetric";
  return <section className="chart-card relative min-w-0 overflow-hidden rounded-3xl border border-white/80 bg-white p-4 shadow-sm sm:p-5">
    <div aria-hidden="true" className="chart-card-orb"/>
    <div className="relative flex items-start gap-3"><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg shadow-indigo-500/20"><svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V9m5 10V5m5 14v-7m5 7V3"/></svg></span><div><h2 className="font-bold text-slate-950">{t("recommendation.categoryChart")}</h2><p className="mt-1 text-sm text-slate-500">{t("recommendation.current")} / {showConstrained ? "Kullanıcı Değerleri Sonrası / " : ""}{t("recommendation.recommended")}</p></div></div>
    <div className="relative mt-3 h-[320px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} barCategoryGap="36%" barGap={4} margin={{top:20,right:18,bottom:30,left:0}}><defs><linearGradient id="recommendationCurrent" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#2563eb"/></linearGradient><linearGradient id="recommendationConstrained" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#f97316"/></linearGradient><linearGradient id="recommendationTarget" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient></defs><CartesianGrid strokeDasharray="4 6" vertical={false} stroke="#dbe4f0"/><XAxis dataKey="shortLabel" interval={0} height={48} tickMargin={10} tick={{fontSize:11,fill:"#475569"}} axisLine={{stroke:"#cbd5e1"}} tickLine={false}/><YAxis tick={{fontSize:10,fill:"#64748b"}} axisLine={false} tickLine={false}/><Tooltip content={props => <CategoryTooltip {...props} language={language} t={t} showConstrained={showConstrained}/>}/><Legend/><Bar name={t("recommendation.current")} dataKey="current" fill="url(#recommendationCurrent)" maxBarSize={18} radius={[8,8,2,2]} isAnimationActive={false}/>{showConstrained ? <Bar name="Kullanıcı Değerleri Sonrası" dataKey="constrained" fill="url(#recommendationConstrained)" maxBarSize={18} radius={[8,8,2,2]} isAnimationActive={false}/> : null}<Bar name={t("recommendation.recommended")} dataKey="recommended" fill="url(#recommendationTarget)" maxBarSize={18} radius={[8,8,2,2]} isAnimationActive={false}/></BarChart></ResponsiveContainer></div>
  </section>;
}

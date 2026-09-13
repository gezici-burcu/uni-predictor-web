"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { UiGreenMetricChartTooltip } from "./UiGreenMetricChartTooltip";
import { hasAnyGreenMetricChartData, type UiGreenMetricCategoryBarDatum } from "./greenMetricChartData";

export function UiGreenMetricCategoryBarChart({ data }: { data: UiGreenMetricCategoryBarDatum[] }) {
  const hasData = hasAnyGreenMetricChartData(data);
  return <section className="chart-card relative min-w-0 overflow-hidden rounded-3xl border border-white/80 bg-white p-4 shadow-sm sm:p-5">
    <div aria-hidden="true" className="chart-card-orb"/>
    <div className="relative flex min-h-11 items-start gap-3"><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20"><svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V9m5 10V5m5 14v-7m5 7V3"/></svg></span><div><h2 className="text-sm font-bold text-slate-950">Puan Değişimi</h2><p className="mt-0.5 text-xs leading-4 text-slate-500">Mevcut ve senaryo kategori puanları</p></div></div>
    {hasData ? <div className="relative h-[280px] w-full sm:h-[310px]" role="img" aria-label="UI GreenMetric kategori puanı değişimi"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{top:18,right:8,bottom:8,left:0}}><defs><linearGradient id="greenCurrentBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#2563eb"/></linearGradient><linearGradient id="greenScenarioBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient></defs><CartesianGrid strokeDasharray="4 6" vertical={false} stroke="#dbe4f0"/><XAxis dataKey="shortLabel" tick={{fontSize:10,fill:"#475569"}}/><YAxis domain={[0,2000]} width={40} tick={{fontSize:10,fill:"#64748b"}}/><Tooltip content={(props)=><UiGreenMetricChartTooltip {...props}/>} /><Legend/><Bar name="Mevcut" dataKey="current" fill="url(#greenCurrentBar)" radius={[9,9,2,2]} maxBarSize={30} isAnimationActive={false}/><Bar name="Senaryo" dataKey="scenario" fill="url(#greenScenarioBar)" radius={[9,9,2,2]} maxBarSize={30} isAnimationActive={false}/></BarChart></ResponsiveContainer></div> : <div className="mt-3 flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 text-center text-xs leading-5 text-slate-500">Kategori puanları tamamlanınca bar grafik görüntülenecektir.</div>}
  </section>;
}

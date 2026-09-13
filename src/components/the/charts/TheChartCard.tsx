import type { ReactNode } from "react";

export function TheChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="chart-card relative min-w-0 overflow-hidden rounded-3xl border border-white/80 bg-white p-4 shadow-sm sm:p-5">
      <div aria-hidden="true" className="chart-card-orb"/>
      <div className="relative mb-3 flex items-center gap-3">
        <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V9m5 10V5m5 14v-7m5 7V3"/></svg></span>
        <h2 className="text-base font-bold text-slate-950">{title}</h2>
      </div>
      <div className="chart-plot relative rounded-2xl border border-slate-100 bg-gradient-to-b from-white/70 to-slate-50/80 px-1 pt-2">{children}</div>
    </section>
  );
}

export function TheChartLegend({ current, scenario }: { current: string; scenario: string }) {
  return <div aria-hidden="true" className="mx-auto flex w-fit items-center gap-4 rounded-full border border-slate-200/80 bg-white/90 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm backdrop-blur"><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-indigo-500"/>{current}</span><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-teal-500"/>{scenario}</span></div>;
}

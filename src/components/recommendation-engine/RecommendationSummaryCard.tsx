import type { ReactNode } from "react";

export function RecommendationSummaryCard({ label, value, variant = "number", tone = "neutral" }: { label: string; value: ReactNode; variant?: "number" | "status"; tone?: "neutral" | "positive" | "warning" | "negative" }) {
  const toneClass = { neutral: "text-slate-950", positive: "text-emerald-700", warning: "text-amber-700", negative: "text-red-700" }[tone];
  const gradientClass = { neutral: "from-indigo-500 to-blue-500", positive: "from-emerald-400 to-teal-500", warning: "from-amber-400 to-orange-500", negative: "from-rose-400 to-red-500" }[tone];
  return <article className="metric-card group relative min-h-[128px] min-w-0 overflow-hidden rounded-3xl border border-white/80 bg-white px-4 py-4 shadow-sm sm:px-5">
    <span aria-hidden="true" className={`absolute inset-x-5 top-0 h-1 rounded-b-full bg-gradient-to-r ${gradientClass}`}/>
    <span aria-hidden="true" className={`absolute -right-8 -top-8 size-24 rounded-full bg-gradient-to-br opacity-10 ${gradientClass}`}/>
    <span aria-hidden="true" className="absolute bottom-4 right-4 flex h-8 items-end gap-1 opacity-20"><i className={`h-3 w-1.5 rounded-full bg-gradient-to-t ${gradientClass}`}/><i className={`h-5 w-1.5 rounded-full bg-gradient-to-t ${gradientClass}`}/><i className={`h-8 w-1.5 rounded-full bg-gradient-to-t ${gradientClass}`}/></span>
    <div className="relative flex h-full min-h-0 flex-col"><div className="flex items-center gap-2"><span className={`size-2 rounded-full bg-gradient-to-br ${gradientClass}`} aria-hidden="true"/><p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p></div><div className="mt-4">{variant === "status" ? <p className={`max-w-full text-sm font-bold leading-5 sm:text-[15px] ${toneClass}`}>{value}</p> : <p className={`text-2xl font-extrabold leading-none tracking-[-0.04em] ${toneClass}`}>{value}</p>}</div></div>
  </article>;
}

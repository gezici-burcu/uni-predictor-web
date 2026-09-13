type Props = { title: string; value: string; subtitle: string; status?: "default" | "positive" | "negative" | "warning"; valueClassName?: string };

export function TheSummaryCard({ title, value, subtitle, status = "default", valueClassName = "" }: Props) {
  const valueColor = status === "positive" ? "text-emerald-700" : status === "negative" ? "text-red-700" : status === "warning" ? "text-amber-700" : "text-slate-950";
  const accentClass = status === "positive" ? "from-emerald-400 to-teal-500" : status === "negative" ? "from-rose-400 to-red-500" : status === "warning" ? "from-amber-400 to-orange-500" : "from-blue-500 to-indigo-500";
  return (
    <article className="metric-card group relative min-h-[136px] overflow-hidden rounded-3xl border border-white/80 bg-white p-4 shadow-sm sm:p-5">
      <span aria-hidden="true" className={`absolute inset-x-5 top-0 h-1 rounded-b-full bg-gradient-to-r ${accentClass}`}/>
      <span aria-hidden="true" className={`absolute -right-7 -top-7 size-24 rounded-full bg-gradient-to-br opacity-[0.09] ${accentClass}`}/>
      <span aria-hidden="true" className="absolute bottom-4 right-4 flex h-8 items-end gap-1 opacity-20"><i className={`h-3 w-1.5 rounded-full bg-gradient-to-t ${accentClass}`}/><i className={`h-5 w-1.5 rounded-full bg-gradient-to-t ${accentClass}`}/><i className={`h-8 w-1.5 rounded-full bg-gradient-to-t ${accentClass}`}/><i className={`h-6 w-1.5 rounded-full bg-gradient-to-t ${accentClass}`}/></span>
      <div className="relative flex h-full flex-col">
        <div className="flex items-center gap-2"><span aria-hidden="true" className={`size-2 rounded-full bg-gradient-to-br ${accentClass}`}/><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{title}</p></div>
        <p className={`mt-3 max-w-full break-words text-[1.7rem] font-extrabold leading-none tracking-[-0.04em] ${valueColor} ${valueClassName}`}>{value}</p>
        <p className="mt-auto max-w-[85%] pt-3 text-xs leading-5 text-slate-500">{subtitle}</p>
      </div>
    </article>
  );
}

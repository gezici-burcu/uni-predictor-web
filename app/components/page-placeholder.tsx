type PagePlaceholderProps = {
  title: string;
};

export function PagePlaceholder({ title }: PagePlaceholderProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-10 sm:py-14">
      <div className="max-w-2xl">
        <div className="mb-5 h-1 w-12 rounded-full bg-blue-600" aria-hidden="true" />
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
          Bu bölüm daha sonra geliştirilecektir.
        </p>
      </div>
    </section>
  );
}

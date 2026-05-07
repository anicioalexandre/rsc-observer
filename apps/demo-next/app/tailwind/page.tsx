async function getStats() {
  const r = await fetch("http://localhost:3000/api/delay?ms=200&step=stats", {
    cache: "no-store",
  });
  return r.json();
}

export default async function TailwindPage() {
  const stats = await getStats();
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Tailwind page
          </h1>
          <p className="mt-2 text-slate-600">
            Pure Tailwind v4 utility classes. The overlay's visual preview
            should adopt the compiled stylesheet and render this with the same
            colors, spacing, and typography you see live.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-8">
          {[
            { label: "Requests", value: 142, color: "bg-blue-500" },
            { label: "Errors", value: 3, color: "bg-rose-500" },
            { label: "p99 latency", value: "230ms", color: "bg-emerald-500" },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="text-xs uppercase tracking-wider text-slate-500">
                {card.label}
              </div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {card.value}
              </div>
              <div
                className={`mt-3 h-1 w-full rounded-full ${card.color}`}
                aria-hidden
              />
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Mocked stats from /api/delay
          </h2>
          <pre className="overflow-x-auto rounded bg-slate-900 p-4 text-xs text-slate-100">
            {JSON.stringify(stats, null, 2)}
          </pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
              tailwind v4
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
              server component
            </span>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              200 ms fetch
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}

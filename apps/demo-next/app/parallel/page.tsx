async function fetchAt(ms: number, step: string) {
  const r = await fetch(
    `http://localhost:3000/api/delay?ms=${ms}&step=${step}`,
    { cache: "no-store" },
  );
  return r.json();
}

export default async function ParallelPage() {
  // Three fetches kicked off concurrently — should finish within ~max(ms),
  // not the sum. The DATA FETCH lane should show three bars starting at
  // roughly the same time, ending at staggered times based on their delay.
  const [a, b, c] = await Promise.all([
    fetchAt(800, "parallel-1"),
    fetchAt(500, "parallel-2"),
    fetchAt(1200, "parallel-3"),
  ]);

  return (
    <main className="mx-auto max-w-3xl p-8 font-sans">
      <h1 className="text-3xl font-bold text-slate-900">Parallel</h1>
      <p className="text-slate-600 mt-1 mb-6">
        Three fetches running concurrently via <code>Promise.all</code>. Total
        wall time should be ~1.2 s, not 2.5 s.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[a, b, c].map((entry, i) => (
          <pre
            key={i}
            className="rounded bg-slate-900 p-3 text-xs text-slate-100 overflow-x-auto"
          >
            {JSON.stringify(entry, null, 2)}
          </pre>
        ))}
      </div>
    </main>
  );
}

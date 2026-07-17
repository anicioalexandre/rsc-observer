import { Suspense } from "react";

async function Slot({ ms, label }: { ms: number; label: string }) {
  const r = await fetch(
    `http://localhost:3000/api/delay?ms=${ms}&step=${label}`,
    { cache: "no-store" },
  );
  const data = await r.json();
  return (
    <div className="rounded border border-emerald-300 bg-emerald-50 p-4">
      <div className="text-sm font-semibold text-emerald-900">{label}</div>
      <pre className="mt-2 text-xs text-emerald-900/80">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function Fallback({ label }: { label: string }) {
  return (
    <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-4">
      <div className="text-sm font-medium text-slate-500">
        loading {label}…
      </div>
    </div>
  );
}

export default function NestedSuspensePage() {
  // Three Suspense boundaries with different fetch delays. Each resolves
  // independently. The overlay's RSC chunk timeline should show three
  // separate "$@<id>" -> resolved transitions at 500/1500/3000 ms.
  return (
    <main className="mx-auto max-w-3xl p-8 font-sans space-y-4">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Nested Suspense</h1>
        <p className="text-slate-600 mt-1">
          Three independent Suspense boundaries that resolve at staggered times.
          Scrub through the timeline to watch them swap from fallback to
          resolved one by one.
        </p>
      </header>
      <Suspense fallback={<Fallback label="fast" />}>
        <Slot ms={500} label="fast" />
      </Suspense>
      <Suspense fallback={<Fallback label="medium" />}>
        <Slot ms={1500} label="medium" />
      </Suspense>
      <Suspense fallback={<Fallback label="slow" />}>
        <Slot ms={3000} label="slow" />
      </Suspense>
    </main>
  );
}

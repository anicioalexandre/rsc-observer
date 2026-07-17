import { Suspense } from "react";

// The page Server Component does NO fetch — it returns immediately. The slow
// work (a 3s api/delay) is in a child Server Component wrapped in Suspense.
//
// What you should see in the overlay:
//   - Initial RSC chunks land within tens of ms with the page shell + the
//     Suspense fallback. Preview becomes useful almost immediately.
//   - The DATA FETCH lane shows the 3s call.
//   - Around +3s a final chunk lands carrying the resolved Slow subtree;
//     scrubbing past it swaps the fallback for the resolved content.
//
// This is the "fast initial / deferred slow content" pattern that Suspense
// is meant to enable — and a good test that the overlay surfaces both
// states across the timeline.

async function Slow() {
  const r = await fetch(
    "http://localhost:3000/api/delay?ms=3000&step=deferred",
    { cache: "no-store" },
  );
  const data = await r.json();
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 8,
        border: "1px solid #93c5fd",
        background: "#eff6ff",
        marginTop: 16,
      }}
    >
      <strong style={{ color: "#1e40af" }}>Slow subtree resolved</strong>
      <pre style={{ margin: "8px 0 0 0", fontSize: 12 }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function Skeleton() {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 8,
        border: "1px dashed #cbd5e1",
        background: "#f8fafc",
        marginTop: 16,
        color: "#64748b",
      }}
    >
      loading slow subtree…
    </div>
  );
}

export default function DeferredFetchPage() {
  // No await at this level — the page's flight chunks flush before Slow's
  // fetch even starts.
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "#f5f5f5",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 28 }}>Deferred fetch</h1>
      <p style={{ color: "#555" }}>
        Page renders immediately. The 3-second fetch lives in a child Server
        Component behind <code>&lt;Suspense&gt;</code>; the rest of the page is
        already on screen by the time the fetch has even started.
      </p>
      <Suspense fallback={<Skeleton />}>
        <Slow />
      </Suspense>
      <footer style={{ marginTop: 24, color: "#777" }}>
        Footer renders alongside the skeleton — proves the page didn't block
        on the slow subtree.
      </footer>
    </main>
  );
}

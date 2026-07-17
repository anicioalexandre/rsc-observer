// Three-deep Server Component nesting where the deepest component is the
// one that calls fetch(). React 19's `captureOwnerStack()` (called in our
// server-side fetch-wrap before the await) should resolve to a stack like:
//
//   in InnerCard
//   in MiddleSection
//   in OwnerStackPage
//
// The DetailsPane's OwnerStackView (DetailsPane/index.tsx:323+) parses that
// into one row per frame. Hovering the DATA FETCH bar should show the
// chain.

async function getStats() {
  const r = await fetch(
    "http://localhost:3000/api/delay?ms=250&step=owner-stack",
    { cache: "no-store" },
  );
  return r.json();
}

async function InnerCard() {
  // Deepest level — this is the one that calls fetch.
  const stats = await getStats();
  return (
    <div
      style={{
        padding: 12,
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: 6,
      }}
    >
      <strong>InnerCard</strong>
      <pre style={{ margin: "6px 0 0 0", fontSize: 12 }}>
        {JSON.stringify(stats, null, 2)}
      </pre>
    </div>
  );
}

async function MiddleSection() {
  return (
    <section
      style={{
        padding: 12,
        background: "#f5f5f5",
        borderRadius: 6,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 16 }}>MiddleSection</h2>
      <p style={{ color: "#666", marginTop: 4 }}>
        Wraps InnerCard. No own fetch.
      </p>
      <InnerCard />
    </section>
  );
}

export default function OwnerStackPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "#fafafa",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 28 }}>Owner stack</h1>
      <p style={{ color: "#555", marginTop: 8 }}>
        Three-deep Server Component nest. The deepest one calls fetch — its
        DATA FETCH bar should show an owner chain in the DetailsPane.
      </p>
      <MiddleSection />
    </main>
  );
}

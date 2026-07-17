// Pure Server Component — every JSX element here is a host tag rendered on
// the server. No "use client" anywhere down the tree. The flight wire for
// this page should be plain element rows like ["$","main",null,{...}],
// readable in the overlay's preview without any CLIENT placeholders.

async function getStats() {
  const r = await fetch(
    "http://localhost:3000/api/delay?ms=200&step=server-only",
    { cache: "no-store" },
  );
  return r.json();
}

export default async function ServerOnlyPage() {
  const stats = await getStats();
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "#f5f5f5",
      }}
    >
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>
          Server-only page
        </h1>
        <p style={{ color: "#666", marginTop: 4 }}>
          No client components anywhere. Every node here lives in the RSC wire
          as a host element row — overlay preview should mirror it 1:1 with no
          CLIENT placeholders.
        </p>
      </header>

      <section
        style={{
          background: "#fff",
          padding: 16,
          borderRadius: 8,
          border: "1px solid #e5e5e5",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Stats from /api/delay</h2>
        <pre
          style={{
            background: "#0f0f0f",
            color: "#f5f5f5",
            padding: 12,
            borderRadius: 6,
            fontSize: 12,
            overflowX: "auto",
            margin: 0,
          }}
        >
          {JSON.stringify(stats, null, 2)}
        </pre>
        <ul style={{ marginTop: 16 }}>
          <li>fetch resolved at {stats.at}</li>
          <li>step: {stats.step}</li>
          <li>simulated latency: {stats.ms}ms</li>
        </ul>
      </section>
    </main>
  );
}

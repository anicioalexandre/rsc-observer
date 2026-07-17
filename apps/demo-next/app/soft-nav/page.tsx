import Link from "next/link";

// Page exists to drive client-side soft-navigation through Next's <Link>.
// Hovering a Link triggers Next's RSC prefetch (a `?_rsc=…` fetch). Clicking
// it executes a soft-nav, which streams a fresh RSC payload over fetch().
//
// What this exercises in the observer:
//   - browser-side fetch wrap teeing the RSC response (fetch-wrap.ts)
//   - the synthetic `client-rsc-<url>-…` request id
//   - dedupRequests preferring the server-side capture for the same URL
//     (the inline-html capture wins; client-rsc-* gets hidden)
//   - the CFETCH (FETCH) lane row labelling the prefetch with method=GET

export default function SoftNavPage() {
  const targets = ["/baseline", "/server-only", "/tailwind", "/parallel"];
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
      <h1 style={{ margin: 0, fontSize: 28 }}>Soft nav</h1>
      <p style={{ color: "#555", marginTop: 8 }}>
        Hover a link to trigger a Next RSC prefetch; click to soft-navigate.
        Both should appear in the observer's CLIENT lane as FETCH rows
        (method GET, URL ending in <code>?_rsc=…</code>) and the
        corresponding SERVER lane should show the RSC capture.
      </p>
      <ul style={{ marginTop: 16, padding: 0, listStyle: "none" }}>
        {targets.map((href) => (
          <li key={href} style={{ marginBottom: 6 }}>
            <Link
              href={href}
              style={{
                display: "inline-block",
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
                background: "#fff",
                color: "#0b57d0",
                textDecoration: "none",
              }}
            >
              {href}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

// Ground-state Server Component. Three host elements, no fetch, no Suspense,
// no client components. Useful as the cleanest possible reference for the
// observer's RSC capture: timeline should show one HTML lane plus a single
// inline-html-* RSC lane, with chunks landing in one quick burst.

export default function BaselinePage() {
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
      <h1 style={{ margin: 0, fontSize: 28 }}>Baseline</h1>
      <p style={{ color: "#555", marginTop: 8 }}>
        Bare-minimum Server Component. No fetch, no Suspense, no client
        components. The flight wire here is the simplest possible — useful as
        a reference for what the observer captures in the absence of any
        capture-able activity.
      </p>
    </main>
  );
}

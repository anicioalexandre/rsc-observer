import { FetchButton } from "./FetchButton";

// Page is a Server Component (no fetch). The action is in the client
// component below — clicking the button issues a browser-side fetch().
// Our client-side fetch-wrap should pick it up and surface it as a
// `client_fetch` event with method=GET in the CLIENT lane.

export default function BrowserFetchPage() {
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
      <h1 style={{ margin: 0, fontSize: 28 }}>Browser fetch</h1>
      <p style={{ color: "#555", marginTop: 8 }}>
        The button is a client component that calls
        <code> fetch()</code> directly from the browser. The observer should
        show this as a FETCH row in the CLIENT lane group, with no matching
        SERVER lane request once the self-bounce dedup runs.
      </p>
      <FetchButton />
    </main>
  );
}

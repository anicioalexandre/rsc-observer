import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";

// This page is a Server Component that uses a few MUI client components
// (Container, Card, CardContent), but the *children* it passes into them
// are host elements — <main>, <h1>, <p>, <pre>. Those host elements get
// embedded directly inside the client-ref's `children` prop in the flight
// wire, so the overlay preview should show:
//
//   CLIENT · Container
//     CLIENT · Card
//       CLIENT · CardContent
//         <main>
//           <h1>…</h1>
//           <p>…</p>
//           <pre>…</pre>
//
// Compare with /mui where the *whole* tree is client refs all the way down.

async function getStats() {
  const r = await fetch(
    "http://localhost:3000/api/delay?ms=200&step=server-children",
    { cache: "no-store" },
  );
  return r.json();
}

export default async function ServerChildrenPage() {
  const stats = await getStats();
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Card>
        <CardContent>
          {/* Everything below is rendered by the Server Component. The MUI
              card just frames it. The flight wire records these as host
              element rows nested inside the Card's children prop. */}
          <main>
            <h1 style={{ marginTop: 0, fontSize: 28 }}>
              Server children inside MUI
            </h1>
            <p style={{ color: "#555" }}>
              The Container/Card/CardContent are MUI (client). The{" "}
              <code>&lt;main&gt;</code>, <code>&lt;h1&gt;</code>, and{" "}
              <code>&lt;pre&gt;</code> below are host elements rendered by the
              Server Component — they live as plain element rows inside the
              Card's <code>children</code> prop in the flight wire.
            </p>
            <pre
              style={{
                background: "#0f0f0f",
                color: "#f5f5f5",
                padding: 12,
                borderRadius: 6,
                fontSize: 12,
                overflowX: "auto",
              }}
            >
              {JSON.stringify(stats, null, 2)}
            </pre>
          </main>
        </CardContent>
      </Card>
    </Container>
  );
}

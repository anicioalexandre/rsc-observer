import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

async function getStats() {
  const r = await fetch("http://localhost:3000/api/delay?ms=300&step=mixed", {
    cache: "no-store",
  });
  return r.json();
}

export default async function MixedPage() {
  const stats = await getStats();
  return (
    <main className="min-h-screen bg-gradient-to-r from-indigo-50 to-amber-50 p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-slate-900">Mixed page</h1>
          <p className="mt-1 text-slate-600">
            Tailwind utilities for the layout, MUI components for the controls —
            both styling systems active in one tree.
          </p>
        </header>

        <Card sx={{ borderRadius: 3, boxShadow: 4 }}>
          <CardContent>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              MUI card with Tailwind padding around it
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              The card chrome (border-radius, shadow, typography) comes from
              MUI's emotion-injected styles. The page background and outer
              spacing come from Tailwind classes on the &lt;main&gt; and
              &lt;div&gt;.
            </Typography>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800">
                tailwind chip
              </span>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                another tailwind chip
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="contained" color="primary">
                MUI Primary
              </Button>
              <Button variant="outlined" color="success">
                MUI Outlined
              </Button>
            </div>
          </CardContent>
        </Card>

        <pre className="rounded-md bg-slate-900 p-4 text-xs text-slate-100 overflow-x-auto">
          {JSON.stringify(stats, null, 2)}
        </pre>
      </div>
    </main>
  );
}

import Test from "./Test";
import TestTwo from "./TestTwo";

async function step1() {
  const r = await fetch("http://localhost:3000/api/delay?ms=300&step=1", {
    cache: "no-store",
  });
  return r.json();
}

async function step2(_seed: unknown) {
  const r = await fetch("http://localhost:3000/api/delay?ms=200&step=2", {
    cache: "no-store",
  });
  return r.json();
}

export default async function WaterfallPage() {
  const a = await step1();
  const b = await step2(a);
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem" }}>
      <h1>Waterfall</h1>
      <p style={{ color: "red" }}>
        Two chained server fetches. Should be parallel instead of sequential.
      </p>
      <pre>{JSON.stringify({ a, b }, null, 2)}</pre>
      <Test>
        <TestTwo />
      </Test>
    </main>
  );
}

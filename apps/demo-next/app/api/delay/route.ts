export async function GET(request: Request) {
  const url = new URL(request.url);
  const ms = Math.min(5000, Number(url.searchParams.get("ms") ?? "100"));
  const step = url.searchParams.get("step") ?? "?";
  await new Promise((r) => setTimeout(r, ms));
  return Response.json({ ok: true, step, ms, at: Date.now() });
}

// Dev gate. Instrumentation turns on automatically in development and is a
// hard no-op in production (NODE_ENV=production). No marker file, no config:
// if you're running `next dev`, it's on. Opt out in dev by setting
// RSC_OBSERVER=0 (also accepts "off" / "false" / "no").

const DISABLE_VALUES = new Set(["0", "off", "false", "no"]);

export function isDevEnabled(): { ok: boolean; reason?: string } {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, reason: "NODE_ENV=production" };
  }
  const flag = process.env.RSC_OBSERVER?.trim().toLowerCase();
  if (flag && DISABLE_VALUES.has(flag)) {
    return { ok: false, reason: "disabled via RSC_OBSERVER" };
  }
  return { ok: true };
}

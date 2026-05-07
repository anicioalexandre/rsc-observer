import { existsSync } from "node:fs";
import { join } from "node:path";

const MARKER = ".rsc-observer";

export function isDevEnabled(): { ok: boolean; reason?: string } {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, reason: "NODE_ENV=production" };
  }
  const markerPath = join(process.cwd(), MARKER);
  if (!existsSync(markerPath)) {
    return { ok: false, reason: `missing ${markerPath}` };
  }
  return { ok: true };
}

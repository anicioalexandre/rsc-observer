import type { IncomingMessage, ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// The overlay IIFE is emitted by this same package's build into dist/client.iife.js.
// This module lives in dist/ alongside it, so a URL relative to import.meta.url
// resolves to the bundle in both ESM and CJS output.
const BUNDLE_URL = new URL("./client.iife.js", import.meta.url);

let cached: Buffer | null = null;
let cacheError: string | null = null;

function loadBundle(): Buffer | null {
  if (cached) return cached;
  try {
    cached = readFileSync(fileURLToPath(BUNDLE_URL));
    return cached;
  } catch (e) {
    cacheError = (e as Error).message;
    return null;
  }
}

export function tryServeStatic(req: IncomingMessage, res: ServerResponse): boolean {
  const url = (req.url ?? "").split("?")[0];
  if (url !== "/rsc-observer/client.js") return false;

  const bytes = loadBundle();
  if (!bytes) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(
      "rsc-observer client bundle not found.\n" +
        "Rebuild rsc-observer: pnpm --filter rsc-observer build\n" +
        (cacheError ? `Reason: ${cacheError}\n` : ""),
    );
    return true;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Length", String(bytes.length));
  res.end(bytes);
  return true;
}

export function isRscObserverUpgradeTarget(url: string | undefined): boolean {
  if (!url) return false;
  const path = url.split("?")[0];
  return path === "/rsc-observer/ingest";
}

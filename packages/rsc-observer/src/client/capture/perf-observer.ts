import { ingestEvent } from "../store";

let installed = false;

// Each entry type is observed independently; if one isn't supported the others
// still apply. The literal union mirrors PerformanceEntryType but is declared
// inline because that lib type isn't always in scope under tsconfig "bundler"
// resolution.
const TYPES: { type: "paint" | "largest-contentful-paint" | "longtask"; buffered?: boolean }[] = [
  { type: "paint", buffered: true },
  { type: "largest-contentful-paint", buffered: true },
  { type: "longtask", buffered: true },
];

// Pattern for "this resource is a Next.js client-component / runtime chunk".
// Matches both prod (`/_next/static/chunks/...`) and Turbopack dev
// (`/_next/static/chunks/[...]` or `/chunks/...`).
const CHUNK_RE = /\/(_next\/)?static\/chunks\/|\/_next\/static\/.*\.(js|css)$|\/chunks\//;

interface ResourcePerfEntry extends PerformanceEntry {
  initiatorType?: string;
  transferSize?: number;
}

export function installPerfObserver(): void {
  if (installed) return;
  installed = true;
  if (typeof PerformanceObserver === "undefined") return;

  const origin = performance.timeOrigin;

  for (const cfg of TYPES) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          ingestEvent({
            kind: "client_perf",
            entryType: entry.entryType,
            name: entry.name,
            t: origin + entry.startTime,
            duration: entry.duration > 0 ? entry.duration : undefined,
          });
        }
      });
      observer.observe({ type: cfg.type, buffered: cfg.buffered });
    } catch {
      // entry type not supported — skip silently
    }
  }

  // Resource entries: every JS / CSS bundle the browser fetches gets one.
  // Filter for Next's chunk paths so we only surface client-component
  // bundles + the framework runtime — that's what the user wants to see
  // for "when can this subtree hydrate?".
  try {
    const observer = new PerformanceObserver((list) => {
      for (const raw of list.getEntries()) {
        const e = raw as ResourcePerfEntry;
        if (e.entryType !== "resource") continue;
        const url = e.name;
        if (!CHUNK_RE.test(url)) continue;
        const isCss = url.endsWith(".css");
        if (
          e.initiatorType !== "script" &&
          e.initiatorType !== "link" &&
          e.initiatorType !== "css"
        )
          continue;
        const start = origin + e.startTime;
        const end = start + (e.duration > 0 ? e.duration : 0);
        ingestEvent({
          kind: "client_chunk",
          url,
          chunkType: isCss ? "css" : "script",
          start,
          end,
          sizeBytes: typeof e.transferSize === "number" ? e.transferSize : 0,
        });
      }
    });
    observer.observe({ type: "resource", buffered: true });
  } catch {
    // resource entries not supported — skip silently
  }
}

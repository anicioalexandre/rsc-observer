import { wallNow } from "../../shared/time";
import { ingestEvent } from "../store";

// Capture the inlined RSC payload that Next.js streams during a hard navigation.
//
// The payload arrives as a sequence of:
//   <script>(self.__next_f=self.__next_f||[]).push([0])</script>
//   <script>self.__next_f.push([1,"<flight-rows>"])</script>
//   <script>self.__next_f.push([1,"<more-flight-rows>"])</script>
//
// Patching __next_f.push doesn't reliably catch them because Next's client
// runtime can replace the push handler or drain entries before our hook
// installs. So we read the script tags' textContent directly — the source
// text is in the DOM regardless of execution order or runtime takeover.

let installed = false;
let syntheticRequestId: string | null = null;
let chunkIndex = 0;
const scrapedScripts = new WeakSet<HTMLScriptElement>();

function ensureRequest(t: number): string {
  if (syntheticRequestId) return syntheticRequestId;
  syntheticRequestId = `inline-${location.pathname}-${Math.floor(t)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  // Anchor startTime to performance.timeOrigin (the wall-clock moment the
  // document started loading) rather than scrape time. On a slow streaming
  // page — e.g. /waterfall with a 3s Suspense — the overlay bundle can
  // finish loading well into the stream, so the first scrape lands at
  // t≈3s. Using that as startTime makes the synthetic span [3s, end],
  // which excludes earlier scrubber positions and the preview reads
  // "No RSC render active". Anchoring at timeOrigin makes the synthetic
  // cover the whole page lifetime, matching the HTML lane bar.
  ingestEvent({
    kind: "request_start",
    requestId: syntheticRequestId,
    url: location.pathname + location.search,
    method: "GET",
    isRSC: true,
    t: performance.timeOrigin,
  });
  return syntheticRequestId;
}

function emitChunk(data: string, t: number): void {
  if (data.length === 0) return;
  const requestId = ensureRequest(t);
  ingestEvent({
    kind: "rsc_chunk",
    requestId,
    index: chunkIndex++,
    bytes: data.length,
    data,
    t,
  });
}

function finalize(): void {
  if (!syntheticRequestId) return;
  ingestEvent({
    kind: "request_end",
    requestId: syntheticRequestId,
    status: 200,
    t: wallNow(),
  });
}

// Match: .push([<digit>,"<json-string-literal>"])
// We tolerate whitespace and a few code variants Next emits.
const PUSH_RE = /\.push\(\s*\[\s*(\d+)\s*,\s*("(?:\\.|[^"\\])*")\s*\]\s*\)/g;

function scrapeScript(script: HTMLScriptElement, t: number): void {
  if (scrapedScripts.has(script)) return;
  scrapedScripts.add(script);
  const text = script.textContent;
  if (!text || !text.includes("__next_f")) return;

  PUSH_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PUSH_RE.exec(text)) !== null) {
    const code = parseInt(m[1]!, 10);
    if (code !== 0 && code !== 1) continue;
    let data: string;
    try {
      data = JSON.parse(m[2]!);
    } catch {
      continue;
    }
    if (typeof data !== "string") continue;
    emitChunk(data, t);
  }
}

// Initial DOM scrape: chunks already inlined by the time the overlay loaded.
// We don't know when each one was actually streamed (the browser saw them at
// different times, but we missed those events). Anchoring all of them to
// performance.timeOrigin makes them eligible for any scrubber position from
// page-start onwards — pickSnapshot then picks the latest accumulated batch
// snapshot, instead of falling back to the chunk-0-only "shell" view that
// rendered as a blank preview.
function scrapeAllExisting(t: number): void {
  const scripts = document.getElementsByTagName("script");
  for (let i = 0; i < scripts.length; i++) {
    scrapeScript(scripts[i]!, t);
  }
}

export function installNextFlightHook(): void {
  if (installed) return;
  installed = true;

  // Attach the observer FIRST. Any flight chunks that land while we're still
  // setting up will be caught with their actual insertion time, preserving
  // suspense-state fidelity across the streaming window. If we did the
  // initial scrape first, chunks inserted between the scrape and the
  // observer attaching would be missed entirely or batched into the next
  // scrape pass with the wrong timestamp.
  const observer = new MutationObserver((records) => {
    const t = wallNow();
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (node instanceof HTMLScriptElement) {
          scrapeScript(node, t);
        } else if (node instanceof Element) {
          // A wrapping element may have nested scripts (rare but possible).
          const inner = node.getElementsByTagName?.("script");
          if (inner) {
            for (let i = 0; i < inner.length; i++) scrapeScript(inner[i]!, t);
          }
        }
      });
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Then sweep up everything already in the DOM at install time. These are
  // chunks the browser inserted before we got a chance to attach — we don't
  // know their real insertion times, so we anchor them at performance
  // .timeOrigin (page-load start) so they're considered "present from the
  // beginning". pickSnapshot then surfaces the latest accumulated batch
  // snapshot for any scrubber position from page-start onward.
  scrapeAllExisting(performance.timeOrigin);

  // Final cleanup on document load: catch anything we missed (rare —
  // observer should have it covered), then mark the synthetic request as
  // ended.
  const onLoaded = (): void => {
    scrapeAllExisting(performance.timeOrigin);
    observer.disconnect();
    finalize();
  };
  if (document.readyState === "complete") {
    queueMicrotask(onLoaded);
  } else {
    window.addEventListener("load", onLoaded, { once: true });
  }
}

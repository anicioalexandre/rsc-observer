const LOADER_ID = "rsc-observer-loader";

function install(): void {
  if (document.getElementById(LOADER_ID)) return;
  const script = document.createElement("script");
  script.id = LOADER_ID;
  script.src = "/rsc-observer/client.js";
  // Don't defer or async — we want this executing as close to the head-parse
  // as possible so our flight-script observer is installed *before* the
  // browser inserts the body's __next_f.push scripts. Otherwise streaming
  // pages (Suspense, etc.) get all their chunks batch-scraped after the
  // stream is done, which collapses the timeline fidelity.
  script.defer = false;
  script.async = false;
  (document.head ?? document.body ?? document.documentElement).appendChild(script);
}

// Don't wait for DOMContentLoaded — for a streaming-SSR page DOMContentLoaded
// only fires after the whole stream finishes, which can be seconds after
// useful suspense-state chunks have already landed in the DOM. Run as soon as
// instrumentation-client imports us; document.head almost always exists by
// then because Next loads instrumentation-client right after the head.
if (typeof document !== "undefined" && process.env.NODE_ENV !== "production") {
  install();
}

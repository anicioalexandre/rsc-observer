import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { wallNow } from "../../shared/time";
import { emit } from "../transport/emit";
import { als } from "./async-context";

const WRAP_FLAG = Symbol.for("rsc-observer.fetch-wrapped");

type FetchFn = typeof globalThis.fetch;

// Tracks whether we're already inside a wrapped-fetch call. Next.js's
// per-request fetch wrapper captures `globalThis.fetch` at setup time (which
// is *our* wrapper) and calls back into it from inside its own implementation.
// Without this re-entrancy flag we'd loop: wrapper → next-wrap → wrapper → …
// When the flag is set we know we're being called recursively from inside a
// Next-style wrap, so we skip our event emission and delegate straight to the
// bare original to break the cycle.
const inWrap = new AsyncLocalStorage<boolean>();

// Lazily resolve React.captureOwnerStack from the user's React install.
// React 19 only — feature-detected.
let captureOwnerStackImpl: (() => string | null | undefined) | null = null;
let captureChecked = false;

function getCaptureOwnerStack(): (() => string | null | undefined) | null {
  if (captureChecked) return captureOwnerStackImpl;
  captureChecked = true;
  try {
    const localRequire = createRequire(import.meta.url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const react = localRequire("react") as any;
    if (typeof react?.captureOwnerStack === "function") {
      captureOwnerStackImpl = react.captureOwnerStack as () =>
        | string
        | null
        | undefined;
    }
  } catch {
    // react not resolvable from our module path; ownerStack disabled
  }
  return captureOwnerStackImpl;
}

function tryCaptureOwnerStack(): string | undefined {
  const fn = getCaptureOwnerStack();
  if (!fn) return undefined;
  try {
    const stack = fn();
    if (typeof stack === "string" && stack.length > 0) return stack;
  } catch {
    // not in a render context, or React threw — ignore
  }
  return undefined;
}

export function installFetchWrap(): void {
  const g = globalThis as typeof globalThis & { [WRAP_FLAG]?: true };
  if (g[WRAP_FLAG]) return;
  g[WRAP_FLAG] = true;

  // The bare fetch at install time. Used as a hard escape if Next.js's wrap
  // ever calls back into us (re-entrancy) so we don't loop.
  const realOriginal = globalThis.fetch as FetchFn;

  // The fetch we should actually call out to. Initially the bare fetch.
  // Next.js may replace globalThis.fetch later with its caching wrapper —
  // when it does, our setter captures that wrapper here. Subsequent fetches
  // go through our `wrapped` first (so we capture them) and then through
  // Next's caching layer (so the user app still gets revalidation /
  // request-deduping).
  let underlying: FetchFn = realOriginal;

  const urlOf = (input: RequestInfo | URL): string =>
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input instanceof Request
          ? input.url
          : String(input);

  const wrapped: FetchFn = async (input, init) => {
    // If Next's wrapper called back into us via its captured "original"
    // reference (which is *our* wrapper), bail straight to the bare fetch to
    // avoid an infinite loop. We also skip event emission here — the outer
    // call already did it.
    if (inWrap.getStore()) {
      return realOriginal(input, init);
    }

    const ctx = als.getStore();
    if (!ctx) {
      // Outside any captured request scope (Next telemetry, dev-server
      // bookkeeping, etc.). Don't emit; just delegate.
      return inWrap.run(true, () => underlying(input, init));
    }

    const start = wallNow();
    const id = randomUUID();
    const url = urlOf(input);
    const method =
      init?.method ?? (input instanceof Request ? input.method : "GET");

    // Capture owner stack BEFORE awaiting — after `await` we may have lost
    // the React render context that gives the owner walk meaning.
    const ownerStack = tryCaptureOwnerStack();

    try {
      const response = await inWrap.run(true, () => underlying(input, init));
      const end = wallNow();
      const contentLength = Number(response.headers.get("content-length") ?? 0);
      emit({
        kind: "server_fetch",
        requestId: ctx.requestId,
        id,
        url,
        method,
        start,
        end,
        status: response.status,
        sizeBytes: Number.isFinite(contentLength) ? contentLength : 0,
        ownerStack,
      });
      return response;
    } catch (err) {
      const end = wallNow();
      emit({
        kind: "server_fetch",
        requestId: ctx.requestId,
        id,
        url,
        method,
        start,
        end,
        status: 0,
        sizeBytes: 0,
        ownerStack,
      });
      throw err;
    }
  };

  // Install as an accessor so any `globalThis.fetch = X` assignment by Next
  // (or anyone else) goes through our setter and updates `underlying`
  // instead of clobbering our wrap. Reads always return `wrapped`, so we
  // stay on the fetch path no matter how many times Next swaps its wrapper.
  try {
    Object.defineProperty(globalThis, "fetch", {
      get() {
        return wrapped;
      },
      set(newFetch: FetchFn) {
        underlying = newFetch;
      },
      configurable: true,
    });
  } catch {
    // Some host froze the property — fall back to a plain assignment, which
    // is the pre-accessor behaviour (Next will still clobber us, but at least
    // we capture the early phase).
    globalThis.fetch = wrapped;
  }
}

import { wallNow } from "../../shared/time";
import { ingestEvent } from "../store";

let installed = false;

function uuid(): string {
  // crypto.randomUUID is widely available; fall back to a tiny PRNG id otherwise.
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return (
    Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e9).toString(36)
  );
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  if (input instanceof Request) return input.url;
  return String(input);
}

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  return (
    init?.method ??
    (input instanceof Request ? input.method : "GET")
  ).toUpperCase();
}

function isOurOwnUrl(url: string): boolean {
  try {
    const u = new URL(url, location.href);
    return u.pathname.startsWith("/rsc-observer/");
  } catch {
    return false;
  }
}

export function installClientFetchWrap(): void {
  if (installed) return;
  installed = true;
  if (typeof window === "undefined") return;

  const original = window.fetch.bind(window);

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = urlOf(input);
    if (isOurOwnUrl(url)) return original(input, init);

    const start = wallNow();
    const id = uuid();
    const method = methodOf(input, init);

    let response: Response;
    try {
      response = await original(input, init);
    } catch (err) {
      ingestEvent({
        kind: "client_fetch",
        id,
        url,
        method,
        start,
        end: wallNow(),
        status: 0,
        sizeBytes: 0,
      });
      throw err;
    }

    const ct = response.headers.get("content-type") ?? "";
    const isRsc = ct.includes("text/x-component");

    if (isRsc) {
      // Tee body to capture per-chunk arrival timing.
      teeRscResponseBody(response, id, url, start, method);
      // Don't emit client_fetch yet — teeRscResponseBody finalises after the body drains.
      return response;
    }

    const end = wallNow();
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    ingestEvent({
      kind: "client_fetch",
      id,
      url,
      method,
      start,
      end,
      status: response.status,
      sizeBytes: Number.isFinite(contentLength) ? contentLength : 0,
    });
    return response;
  };
}

function teeRscResponseBody(
  response: Response,
  id: string,
  url: string,
  start: number,
  method: string,
): void {
  if (!response.body) return;
  const cloned = response.clone();
  const reader = cloned.body!.getReader();

  // Synthesise a request-id for client-received chunks. The store can't yet
  // correlate this with the server-side request that emitted them; we treat
  // them as a parallel inline-style RSC capture. URL+timestamp keeps it unique.
  const syntheticReq = `client-rsc-${url}-${Math.floor(start)}-${id.slice(0, 8)}`;
  ingestEvent({
    kind: "request_start",
    requestId: syntheticReq,
    url,
    method: "GET",
    isRSC: true,
    t: start,
  });

  const decoder = new TextDecoder();
  let chunkIndex = 0;
  let totalBytes = 0;

  (async () => {
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value || value.byteLength === 0) continue;
        totalBytes += value.byteLength;
        const text = decoder.decode(value, { stream: true });
        const t = wallNow();
        // Receive timing on its own track…
        ingestEvent({
          kind: "rsc_chunk_received",
          requestId: syntheticReq,
          index: chunkIndex,
          bytes: value.byteLength,
          t,
        });
        // …and the actual decoded content so the parser can build a tree.
        ingestEvent({
          kind: "rsc_chunk",
          requestId: syntheticReq,
          index: chunkIndex,
          bytes: text.length,
          data: text,
          t,
        });
        chunkIndex++;
      }
    } catch {
      // tee read errored; nothing actionable
    }
    const end = wallNow();
    ingestEvent({
      kind: "request_end",
      requestId: syntheticReq,
      status: response.status,
      t: end,
    });
    ingestEvent({
      kind: "client_fetch",
      id,
      url,
      method,
      start,
      end,
      status: response.status,
      sizeBytes: totalBytes,
    });
  })();
}

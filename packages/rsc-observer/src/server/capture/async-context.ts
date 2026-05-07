import http from "node:http";
import type { Duplex, Transform } from "node:stream";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import {
  createGunzip,
  createBrotliDecompress,
  createInflate,
} from "node:zlib";
import { wallNow } from "../../shared/time";
import { emit } from "../transport/emit";
import { isNextActionRequest, isRSCRequest, isRSCResponse } from "./rsc-detect";
import {
  tryServeStatic,
  isRscObserverUpgradeTarget,
} from "../transport/static-serve";
import { handleIngestUpgrade } from "../transport/ws-server";
import { HtmlInjector, shouldInjectShell } from "../transport/html-inject";
import { shouldCaptureRequest } from "./request-filter";

export interface RequestContext {
  requestId: string;
  t0: number;
  url: string;
  method: string;
  isRSC: boolean;
}

export const als = new AsyncLocalStorage<RequestContext>();

const PATCH_FLAG = Symbol.for("rsc-observer.http-patched");
const RES_FLAG = Symbol.for("rsc-observer.res-wrapped");

export function installServerPatch(): void {
  const proto = http.Server.prototype as unknown as {
    emit: (...a: unknown[]) => boolean;
    [PATCH_FLAG]?: true;
  };
  if (proto[PATCH_FLAG]) return;
  proto[PATCH_FLAG] = true;

  const origEmit = proto.emit;
  // The wider signature matches Node's ambient EventEmitter.emit shape so the
  // assignment back to proto.emit doesn't trip its variance checks.
  proto.emit = function patchedEmit(
    this: http.Server,
    ...rest: unknown[]
  ): boolean {
    const event = rest[0] as string | symbol;
    const args = rest.slice(1);
    if (event === "request") {
      const req = args[0] as http.IncomingMessage | undefined;
      const res = args[1] as http.ServerResponse | undefined;
      if (req && res) {
        if (tryServeStatic(req, res)) return true;
        if (!shouldCaptureRequest(req.url)) {
          return origEmit.apply(this, [event, ...args]);
        }
        return handleRequest(
          this,
          origEmit,
          event,
          args,
          req,
          res,
        );
      }
    }

    if (event === "upgrade") {
      const req = args[0] as http.IncomingMessage | undefined;
      const socket = args[1] as Duplex | undefined;
      const head = args[2] as Buffer | undefined;
      if (req && socket && head && isRscObserverUpgradeTarget(req.url)) {
        handleIngestUpgrade(req, socket, head);
        return true;
      }
    }

    return origEmit.apply(this, [event, ...args]);
  };
}

function handleRequest(
  server: http.Server,
  origEmit: (...a: unknown[]) => boolean,
  event: string | symbol,
  args: unknown[],
  req: http.IncomingMessage,
  res: http.ServerResponse,
): boolean {
  const ctx: RequestContext = {
    requestId: randomUUID(),
    t0: wallNow(),
    url: req.url ?? "",
    method: req.method ?? "GET",
    isRSC: isRSCRequest(req),
  };

  emit({
    kind: "request_start",
    requestId: ctx.requestId,
    url: ctx.url,
    method: ctx.method,
    isRSC: ctx.isRSC,
    t: ctx.t0,
  });

  // If this is a Server Action POST, snapshot its name now (header is read-only
  // here, no streams touched). Body capture is deferred to Phase 12 polish —
  // attaching a 'data' listener would put the request in flowing mode and break
  // Next's body reader (async-iterator-based).
  const actionName = isNextActionRequest(req)
    ? String(req.headers["next-action"])
    : null;

  wrapResponse(res, ctx.requestId, ctx.t0, actionName);

  return als.run(ctx, () => origEmit.apply(server, [event, ...args]));
}

function wrapResponse(
  res: http.ServerResponse,
  requestId: string,
  startT: number,
  actionName: string | null,
): void {
  const tagged = res as http.ServerResponse & { [RES_FLAG]?: true };
  if (tagged[RES_FLAG]) return;
  tagged[RES_FLAG] = true;

  const origWrite = res.write.bind(res) as (...a: unknown[]) => boolean;
  const origEnd = res.end.bind(res) as (...a: unknown[]) => http.ServerResponse;

  let chunkIndex = 0;
  let endEmitted = false;

  // Decompressor state. Lazily created on the first captured chunk so we have
  // visibility into res.getHeader('content-encoding') after the framework set
  // it. Used for BOTH content-types: RSC responses pipe their decoded bytes
  // into emitChunk; HTML responses pipe theirs into the inline-flight scanner.
  let decompressor: Transform | null = null;
  let decompressorChecked = false;

  const emitChunk = (buf: Buffer): void => {
    if (buf.length === 0) return;
    emit({
      kind: "rsc_chunk",
      requestId,
      index: chunkIndex++,
      bytes: buf.length,
      data: buf.toString("utf8"),
      t: wallNow(),
    });
  };

  // Dispatches a *decoded* (post-decompression) byte chunk based on the
  // response's content-type. The decompressor's 'data' event lands here, and
  // the raw-bytes-no-decompression path also calls this directly.
  const handleDecoded = (buf: Buffer): void => {
    if (buf.length === 0) return;
    if (isRSCResponse(res)) {
      emitChunk(buf);
      return;
    }
    const ct = res.getHeader("content-type");
    if (typeof ct === "string" && ct.includes("text/html")) {
      htmlBuffer += buf.toString("utf8");
      scanHtmlForInlineFlight(wallNow());
    }
  };

  const ensureDecompressor = (): Transform | null => {
    if (decompressorChecked) return decompressor;
    decompressorChecked = true;
    const enc = res.getHeader("content-encoding");
    if (typeof enc !== "string") return null;
    decompressor = pickDecompressor(enc);
    if (!decompressor) return null;
    decompressor.on("data", (decoded: Buffer) => handleDecoded(decoded));
    decompressor.on("error", () => {
      // Decompression broke mid-stream. Stop feeding it; subsequent chunks fall
      // through to the raw-bytes path so we at least see *something*.
      decompressor = null;
    });
    return decompressor;
  };

  // Inline-flight extraction state: when the response is text/html (i.e. a
  // hard-refresh page load), Next embeds the RSC payload inside
  // `<script>self.__next_f.push([1,"<wire>"])</script>` blocks streamed in
  // chunks of HTML. We mirror those into a synthetic RSC request, but with
  // *server-side* write timestamps — that's the only way to preserve
  // suspense progression across hard reloads, since the browser overlay
  // can't load until DOMContentLoaded which is well after the stream ends.
  let htmlBuffer = "";
  let htmlScanFrom = 0;
  let inlineRequestId: string | null = null;
  let inlineChunkIndex = 0;
  const reqUrl = (res.req?.url ?? "/") as string;

  const ensureInlineRequest = (firstChunkT: number): string => {
    if (inlineRequestId) return inlineRequestId;
    inlineRequestId = `inline-html-${requestId}`;
    emit({
      kind: "request_start",
      requestId: inlineRequestId,
      url: reqUrl,
      method: "GET",
      isRSC: true,
      // Anchor at the same start as the parent HTML request — the inline
      // RSC payload is part of the same response, conceptually.
      t: startT,
    });
    void firstChunkT;
    return inlineRequestId;
  };

  const emitInlineChunk = (data: string, t: number): void => {
    if (data.length === 0) return;
    const id = ensureInlineRequest(t);
    emit({
      kind: "rsc_chunk",
      requestId: id,
      index: inlineChunkIndex++,
      bytes: data.length,
      data,
      t,
    });
  };

  const SCRIPT_RE = /<script[^>]*>([\s\S]*?)<\/script>/g;
  const PUSH_RE = /\.push\(\s*\[\s*(\d+)\s*,\s*("(?:\\.|[^"\\])*")\s*\]\s*\)/g;

  const scanHtmlForInlineFlight = (writeT: number): void => {
    SCRIPT_RE.lastIndex = htmlScanFrom;
    let m: RegExpExecArray | null;
    while ((m = SCRIPT_RE.exec(htmlBuffer)) !== null) {
      const text = m[1] ?? "";
      htmlScanFrom = m.index + m[0].length;
      if (!text.includes("__next_f")) continue;
      PUSH_RE.lastIndex = 0;
      let p: RegExpExecArray | null;
      while ((p = PUSH_RE.exec(text)) !== null) {
        const code = parseInt(p[1] ?? "", 10);
        if (code !== 0 && code !== 1) continue;
        try {
          const data = JSON.parse(p[2] ?? "");
          if (typeof data === "string") emitInlineChunk(data, writeT);
        } catch {
          // skip malformed
        }
      }
    }
  };

  const captureChunk = (chunk: unknown): void => {
    if (chunk == null || typeof chunk === "function") return;
    const buf = toBuffer(chunk);
    if (!buf || buf.length === 0) return;

    // Skip non-RSC, non-HTML responses. Saves the cost of decompressor
    // setup for things like /favicon.ico, image responses, etc.
    if (!isRSCResponse(res)) {
      const ct = res.getHeader("content-type");
      if (typeof ct !== "string" || !ct.includes("text/html")) return;
    }

    const dc = ensureDecompressor();
    if (dc) dc.write(buf);
    else handleDecoded(buf);
  };

  // SSR shell injection state. Lazily initialized on the first chunk so
  // we have visibility into the framework-set content-type / encoding
  // headers. Only set for plain text/html GET responses; once non-null,
  // every outgoing chunk passes through `injector.next` until done.
  let injector: HtmlInjector | null = null;
  let injectorChecked = false;
  const ensureInjector = (): HtmlInjector | null => {
    if (injectorChecked) return injector;
    injectorChecked = true;
    if (res.req && shouldInjectShell(res.req, res)) {
      injector = new HtmlInjector();
    }
    return injector;
  };

  // Forward bytes to the underlying response, threading them through the
  // injector if active. Returns the boolean origWrite would return; when
  // we hold bytes (no </body> seen yet) we report `true` to the caller —
  // backpressure for the held bytes is bounded (TAIL_BYTES, see
  // html-inject.ts).
  const forward = (chunk: unknown, rest: unknown[]): boolean => {
    const inj = ensureInjector();
    if (!inj) return origWrite(chunk, ...rest);
    const buf = toBuffer(chunk);
    if (!buf) return origWrite(chunk, ...rest);
    const out = inj.next(buf);
    if (out.length === 0) return true;
    return origWrite(out, ...rest);
  };

  res.write = function patchedWrite(...args: unknown[]): boolean {
    captureChunk(args[0]);
    return forward(args[0], args.slice(1));
  } as http.ServerResponse["write"];

  res.end = function patchedEnd(...args: unknown[]): http.ServerResponse {
    if (args.length > 0) captureChunk(args[0]);
    if (decompressor) {
      // Flush any buffered decompressed bytes; emission is async via 'data'.
      decompressor.end();
    }
    if (!endEmitted) {
      endEmitted = true;
      const endT = wallNow();
      emit({
        kind: "request_end",
        requestId,
        status: res.statusCode,
        t: endT,
      });
      // Close out the synthetic inline-RSC request (if we opened one) so its
      // bar finishes alongside the parent HTML lane.
      if (inlineRequestId) {
        emit({
          kind: "request_end",
          requestId: inlineRequestId,
          status: res.statusCode,
          t: endT,
        });
      }
      if (actionName) {
        emit({
          kind: "server_action",
          requestId,
          name: actionName,
          start: startT,
          end: endT,
          // Args + result preview capture deferred to Phase 12 polish.
          // Args would require a non-invasive request-body tee that doesn't
          // disturb Next's async-iterator body reader; result would parse the
          // RSC response payload for the action's return value. Both fragile;
          // shipping the lane + name + timing is enough to make actions visible.
          argsPreview: "",
          resultPreview: "",
        });
      }
    }
    // Inject path: forward the final chunk through the injector, then
    // drain any held tail before signalling end. Original signature is
    // (chunk?, encoding?, callback?) — we keep the callback if present
    // and skip the chunk arg since we've already written it.
    const inj = ensureInjector();
    if (inj) {
      if (args[0] != null && typeof args[0] !== "function") {
        const buf = toBuffer(args[0]);
        if (buf) {
          const out = inj.next(buf);
          if (out.length > 0) origWrite(out);
        }
      }
      const tail = inj.flush();
      if (tail.length > 0) origWrite(tail);
      const cb = args.find((a) => typeof a === "function");
      return cb ? origEnd(cb) : origEnd();
    }
    return origEnd(...args);
  } as http.ServerResponse["end"];
}

function pickDecompressor(encodingHeader: string): Transform | null {
  // Content-Encoding can be a list ("gzip, br") in theory; in practice it's
  // single-valued for HTTP responses. Take the first non-identity token.
  const enc = encodingHeader.toLowerCase().split(",")[0]?.trim() ?? "";
  if (enc === "" || enc === "identity") return null;
  if (enc === "gzip" || enc === "x-gzip") return createGunzip();
  if (enc === "br" || enc === "brotli") return createBrotliDecompress();
  if (enc === "deflate") return createInflate();
  return null;
}

function toBuffer(chunk: unknown): Buffer | null {
  if (Buffer.isBuffer(chunk)) return chunk;
  if (typeof chunk === "string") return Buffer.from(chunk, "utf8");
  if (chunk instanceof Uint8Array) return Buffer.from(chunk);
  return null;
}

export function currentContext(): RequestContext | undefined {
  return als.getStore();
}

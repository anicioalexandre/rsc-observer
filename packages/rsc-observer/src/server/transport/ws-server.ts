import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import type { Event } from "../../shared/protocol";
import { wallNow } from "../../shared/time";
import { onEvent } from "./emit";

const WSS_FLAG = Symbol.for("rsc-observer.wss");
const BACKLOG_SIZE = 4096;
// Default replay window for clients that don't advertise their page-load
// time. The browser-side WS client passes ?since=<performance.timeOrigin>
// on connect, which lets us replay everything from the current page load
// forward — the right behaviour for streaming Suspense pages that take
// longer than this default.
const BACKLOG_REPLAY_MS = 1500;

interface WssState {
  wss: WebSocketServer;
  backlog: { seq: number; event: Event }[];
  nextSeq: number;
  unsubscribe: () => void;
}

function getState(): WssState {
  const g = globalThis as typeof globalThis & { [WSS_FLAG]?: WssState };
  if (g[WSS_FLAG]) return g[WSS_FLAG];

  const wss = new WebSocketServer({ noServer: true });
  const state: WssState = {
    wss,
    backlog: [],
    nextSeq: 0,
    unsubscribe: () => {},
  };

  state.unsubscribe = onEvent((event) => {
    const msg = { seq: state.nextSeq++, event };
    if (state.backlog.length >= BACKLOG_SIZE) state.backlog.shift();
    state.backlog.push(msg);
    const data = JSON.stringify(msg);
    for (const ws of wss.clients) {
      if (ws.readyState === ws.OPEN) ws.send(data);
    }
  });

  g[WSS_FLAG] = state;
  return state;
}

// Pull an event's primary timestamp for the replay-window cutoff.
function eventT(event: Event): number | null {
  switch (event.kind) {
    case "request_start":
    case "request_end":
    case "rsc_chunk":
    case "rsc_chunk_received":
    case "client_nav_start":
    case "client_perf":
      return event.t;
    case "server_fetch":
    case "server_action":
    case "client_fetch":
    case "client_chunk":
      return event.start;
    case "request_error":
      return null;
  }
}

export function handleIngestUpgrade(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
): void {
  const state = getState();
  state.wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
    // Caller may pass `?since=<wallNow>` to replay everything from a
    // browser-side anchor (typically performance.timeOrigin) forward. Falls
    // back to the default short window if absent or unparsable.
    const url = req.url ?? "";
    const queryStart = url.indexOf("?");
    const sinceMs = queryStart >= 0 ? readSinceParam(url.slice(queryStart + 1)) : null;
    // Subtract a small backward buffer when the caller anchors via timeOrigin.
    // Server clocks can be ~tens of ms behind the browser (especially under
    // load), and the event for the very first request_start fires within ms
    // of navigation start. Without a buffer those events occasionally land
    // with t slightly < timeOrigin and get dropped from replay.
    const cutoff =
      sinceMs !== null ? sinceMs - 100 : wallNow() - BACKLOG_REPLAY_MS;

    for (const msg of state.backlog) {
      const t = eventT(msg.event);
      // Replay when we can't date the event (request_error) OR it's within the window.
      if (t === null || t >= cutoff) {
        ws.send(JSON.stringify(msg));
      }
    }
  });
}

function readSinceParam(query: string): number | null {
  for (const part of query.split("&")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq) !== "since") continue;
    const n = Number(part.slice(eq + 1));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export function installWsServer(): void {
  getState();
}

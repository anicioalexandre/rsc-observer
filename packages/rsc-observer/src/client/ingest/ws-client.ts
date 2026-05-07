import { ingestEvent } from "../store/events";
import type { Event } from "../../shared/protocol";

const RECONNECT_MS = 1000;

let started = false;

export function startIngest(): void {
  if (started) return;
  started = true;
  connect();
}

function connect(): void {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  // performance.timeOrigin is the wall-clock time this document started
  // loading. Slow streaming pages (e.g. a Suspense that takes 3s to resolve)
  // generate events well before our overlay's WS even opens; the server uses
  // this value as the replay cutoff so we get everything from the current
  // page load forward, regardless of how long it took.
  const since = Math.floor(performance.timeOrigin);
  const url = `${proto}//${location.host}/rsc-observer/ingest?since=${since}`;

  let ws: WebSocket;
  try {
    ws = new WebSocket(url);
  } catch {
    setTimeout(connect, RECONNECT_MS);
    return;
  }

  ws.addEventListener("message", (ev) => {
    try {
      const msg = JSON.parse(typeof ev.data === "string" ? ev.data : "") as {
        seq: number;
        event: Event;
      };
      if (msg && msg.event) ingestEvent(msg.event);
    } catch {
      // ignore malformed messages
    }
  });

  ws.addEventListener("close", () => {
    setTimeout(connect, RECONNECT_MS);
  });

  ws.addEventListener("error", () => {
    try {
      ws.close();
    } catch {
      // socket already closed
    }
  });
}

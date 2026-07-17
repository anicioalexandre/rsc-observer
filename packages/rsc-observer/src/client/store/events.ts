import type { Event } from "../../shared/protocol";
import type {
  ClientChunk,
  ClientFetch,
  ClientNav,
  ClientPerfEntry,
  EventRef,
  FilterState,
  Request,
  ViewMode,
} from "./types";
import { parseRsc } from "../parser";

const VIEW_MODE_KEY = "__rsc_observer_view_mode";

function readPersistedViewMode(): ViewMode {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === "structural"
      ? "structural"
      : "visual";
  } catch {
    return "visual";
  }
}

const TRACKING_KEY = "__rsc_observer_tracking";

// Tracking is on by default. The user can pause via the title-bar power
// button; while paused, ingestEvent drops incoming events so the store
// (and therefore every lane / preview) stays frozen at its current view.
function readPersistedTracking(): boolean {
  try {
    return localStorage.getItem(TRACKING_KEY) !== "off";
  } catch {
    return true;
  }
}

export interface Viewport {
  start: number;
  end: number;
}

type State = {
  requests: Map<string, Request>;
  order: string[]; // insertion order of requestIds
  // Earliest event time seen this session. Set on first ingest, cleared by clearAll.
  sessionZero: number | null;
  // Absolute wallNow() time the scrubber is parked at. null = "end of session".
  currentT: number | null;
  // What DetailsPane should stick to (click-driven). null = follow hover/scrubber.
  pinnedEventRef: EventRef | null;
  filter: FilterState;
  viewMode: ViewMode;
  // Drag-selected zoom range on the timeline. null = full session view.
  viewport: Viewport | null;
  // Client-side events (Phase 9): not tied to a Request the way fetches/chunks are.
  clientNavs: ClientNav[];
  clientPerf: ClientPerfEntry[];
  clientFetches: ClientFetch[];
  clientChunks: ClientChunk[];
  // false = ignore incoming events at ingestEvent so the timeline freezes.
  trackingEnabled: boolean;
  version: number;
};

const state: State = {
  requests: new Map(),
  order: [],
  sessionZero: null,
  currentT: null,
  pinnedEventRef: null,
  filter: { hidden: new Set(), urlSubstring: "" },
  viewMode: readPersistedViewMode(),
  viewport: null,
  clientNavs: [],
  clientPerf: [],
  clientFetches: [],
  clientChunks: [],
  trackingEnabled: readPersistedTracking(),
  version: 0,
};

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  state.version++;
  for (const l of listeners) l();
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function getVersion(): number {
  return state.version;
}

export function getState(): Readonly<State> {
  return state;
}

export function getRequests(): Request[] {
  return state.order.map((id) => state.requests.get(id)!).filter(Boolean);
}

export function getRequestById(id: string): Request | null {
  return state.requests.get(id) ?? null;
}

export function getSessionZero(): number | null {
  return state.sessionZero;
}

// Upper bound for the timeline axis: last observed event time (+ small margin).
export function getSessionEnd(): number | null {
  if (state.sessionZero === null) return null;
  let max = state.sessionZero;
  for (const r of state.requests.values()) {
    const tail = r.endTime ?? r.lastEventAt;
    if (tail > max) max = tail;
  }
  return max;
}

export function getCurrentT(): number | null {
  return state.currentT;
}

// Caller passes ABSOLUTE time (performance.now domain). Pass null to "unparked".
export function setCurrentT(t: number | null): void {
  if (state.currentT === t) return;
  state.currentT = t;
  notify();
}

export function getPinnedEventRef(): EventRef | null {
  return state.pinnedEventRef;
}

export function setPinnedEventRef(ref: EventRef | null): void {
  state.pinnedEventRef = ref;
  notify();
}

export function getFilter(): FilterState {
  return state.filter;
}

export function toggleFilterType(
  key: FilterState["hidden"] extends Set<infer U> ? U : never,
): void {
  const next = new Set(state.filter.hidden);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  state.filter = { ...state.filter, hidden: next };
  notify();
}

export function setFilterUrl(url: string): void {
  if (state.filter.urlSubstring === url) return;
  state.filter = { ...state.filter, urlSubstring: url };
  notify();
}

export function getViewport(): Viewport | null {
  return state.viewport;
}

export function setViewport(v: Viewport | null): void {
  if (
    state.viewport === v ||
    (v && state.viewport && v.start === state.viewport.start && v.end === state.viewport.end)
  ) {
    return;
  }
  state.viewport = v;
  notify();
}

export function getViewMode(): ViewMode {
  return state.viewMode;
}

export function setViewMode(mode: ViewMode): void {
  if (state.viewMode === mode) return;
  state.viewMode = mode;
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    // ignore
  }
  notify();
}

export function getTracking(): boolean {
  return state.trackingEnabled;
}

export function setTracking(enabled: boolean): void {
  if (state.trackingEnabled === enabled) return;
  state.trackingEnabled = enabled;
  try {
    localStorage.setItem(TRACKING_KEY, enabled ? "on" : "off");
  } catch {
    // ignore
  }
  notify();
}

export function clearAll(): void {
  state.requests.clear();
  state.order = [];
  state.sessionZero = null;
  state.currentT = null;
  state.pinnedEventRef = null;
  state.viewport = null;
  state.clientNavs = [];
  state.clientPerf = [];
  state.clientFetches = [];
  state.clientChunks = [];
  notify();
}

export function getClientNavs(): readonly ClientNav[] {
  return state.clientNavs;
}

export function getClientPerf(): readonly ClientPerfEntry[] {
  return state.clientPerf;
}

export function getClientFetches(): readonly ClientFetch[] {
  return state.clientFetches;
}

export function getClientChunks(): readonly ClientChunk[] {
  return state.clientChunks;
}

function observeT(t: number): void {
  if (state.sessionZero === null || t < state.sessionZero) {
    state.sessionZero = t;
  }
}

function ensureRequest(
  requestId: string,
  seed: Partial<Request> & { url?: string },
): Request {
  const existing = state.requests.get(requestId);
  if (existing) return existing;
  const r: Request = {
    requestId,
    url: seed.url ?? "",
    method: seed.method ?? "GET",
    isRSC: seed.isRSC ?? false,
    startTime: seed.startTime ?? 0,
    fetches: [],
    chunks: [],
    chunksReceived: [],
    actions: [],
    lastEventAt: 0,
    snapshots: [],
  };
  state.requests.set(requestId, r);
  state.order.push(requestId);
  return r;
}

// Per-request parse chain so snapshots push in chunk order even though parses are async.
const parseChains = new Map<string, Promise<void>>();

function enqueueParse(r: Request): void {
  const chunkIndex = r.chunks.length - 1;
  if (chunkIndex < 0) return;
  const t = r.chunks[chunkIndex]!.t;
  const accumulated = r.chunks.map((c) => c.data).join("");

  const prev = parseChains.get(r.requestId) ?? Promise.resolve();
  const next = prev.then(async () => {
    try {
      const result = await parseRsc(accumulated);
      r.snapshots.push({ chunkIndex, t, result });
      notify();
    } catch {
      // swallow parser errors; tier3 should be infallible on well-formed wire
    }
  });
  parseChains.set(r.requestId, next);
}

export function ingestEvent(event: Event): void {
  // Tracking gate: while paused we drop incoming events at the door so
  // the entire store (sessionZero, requests, lanes, preview) stays
  // frozen at whatever the user was looking at when they paused. The
  // user can still scrub / click / zoom the existing data; only NEW
  // events are ignored. Re-enabling resumes ingestion immediately.
  if (!state.trackingEnabled) return;

  // Pull an absolute timestamp out of every event so sessionZero tracks correctly.
  const t = eventTimestamp(event);
  if (t !== null) observeT(t);

  switch (event.kind) {
    case "request_start": {
      const r = ensureRequest(event.requestId, {
        url: event.url,
        method: event.method,
        isRSC: event.isRSC,
        startTime: event.t,
      });
      r.url = event.url;
      r.method = event.method;
      r.isRSC = event.isRSC;
      r.startTime = event.t;
      r.lastEventAt = event.t;
      break;
    }
    case "request_end": {
      const r = ensureRequest(event.requestId, {});
      r.endTime = event.t;
      r.status = event.status;
      r.lastEventAt = event.t;
      break;
    }
    case "server_fetch": {
      const r = ensureRequest(event.requestId, {});
      // Dedup: hot-refresh + WS backlog can re-deliver the same event.
      if (r.fetches.some((f) => f.id === event.id)) break;
      r.fetches.push({
        id: event.id,
        url: event.url,
        method: event.method,
        start: event.start,
        end: event.end,
        status: event.status,
        sizeBytes: event.sizeBytes,
        ownerStack: event.ownerStack,
      });
      r.lastEventAt = Math.max(r.lastEventAt, event.end);
      break;
    }
    case "rsc_chunk": {
      const r = ensureRequest(event.requestId, {});
      if (r.chunks.some((c) => c.index === event.index)) break;
      r.chunks.push({
        index: event.index,
        bytes: event.bytes,
        data: event.data,
        t: event.t,
      });
      r.lastEventAt = Math.max(r.lastEventAt, event.t);
      enqueueParse(r);
      break;
    }
    case "rsc_chunk_received": {
      const r = ensureRequest(event.requestId, {});
      if (r.chunksReceived.some((c) => c.index === event.index)) break;
      r.chunksReceived.push({
        index: event.index,
        bytes: event.bytes,
        t: event.t,
      });
      r.lastEventAt = Math.max(r.lastEventAt, event.t);
      break;
    }
    case "server_action": {
      const r = ensureRequest(event.requestId, {});
      // Server Actions don't carry an id; (name, start) is unique enough.
      if (
        r.actions.some((a) => a.name === event.name && a.start === event.start)
      )
        break;
      r.actions.push({
        name: event.name,
        start: event.start,
        end: event.end,
        argsPreview: event.argsPreview,
        resultPreview: event.resultPreview,
      });
      r.lastEventAt = Math.max(r.lastEventAt, event.end);
      break;
    }
    case "request_error": {
      const r = ensureRequest(event.requestId, {});
      r.error = { message: event.message, digest: event.digest };
      break;
    }
    case "client_nav_start": {
      state.clientNavs.push({
        url: event.url,
        navigationType: event.navigationType,
        t: event.t,
      });
      break;
    }
    case "client_perf": {
      // Dedup paint/LCP entries: PerformanceObserver replay can re-yield the
      // same buffered entry across page reloads.
      if (
        state.clientPerf.some(
          (p) =>
            p.entryType === event.entryType &&
            p.name === event.name &&
            p.t === event.t,
        )
      )
        break;
      state.clientPerf.push({
        entryType: event.entryType,
        name: event.name,
        t: event.t,
        duration: event.duration,
      });
      break;
    }
    case "client_fetch": {
      if (state.clientFetches.some((f) => f.id === event.id)) break;
      state.clientFetches.push({
        id: event.id,
        url: event.url,
        method: event.method,
        start: event.start,
        end: event.end,
        status: event.status,
        sizeBytes: event.sizeBytes,
      });
      break;
    }
    case "client_chunk": {
      // PerformanceObserver replay can re-yield buffered entries on
      // reconnect. Dedup by url + start.
      if (
        state.clientChunks.some(
          (c) => c.url === event.url && c.start === event.start,
        )
      )
        break;
      state.clientChunks.push({
        url: event.url,
        chunkType: event.chunkType,
        start: event.start,
        end: event.end,
        sizeBytes: event.sizeBytes,
      });
      break;
    }
  }
  notify();
}

function eventTimestamp(event: Event): number | null {
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

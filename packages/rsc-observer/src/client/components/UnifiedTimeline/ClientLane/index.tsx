import type {
  ClientChunk,
  ClientFetch,
  ClientNav,
  ClientPerfEntry,
  EventRef,
} from "../../../store/types";
import { setPinnedEventRef } from "../../../store";
import { classifyDuration, pct } from "../utils";

interface NavRowProps {
  navs: readonly ClientNav[];
  sessionZero: number;
  duration: number;
  onHover: (ref: EventRef | null) => void;
}

export function NavRow({ navs, sessionZero, duration, onHover }: NavRowProps) {
  if (navs.length === 0) return null;
  return (
    <div className="lane-row">
      <div className="lane-label">
        <span className="lane-method">NAV</span>
        <span className="lane-url dim">{navs.length}</span>
      </div>
      <div className="lane-content">
        {navs.map((n, i) => {
          const ref: EventRef = { kind: "client-nav", t: n.t };
          return (
            <div
              key={`${n.t}-${i}`}
              className="client-marker client-marker-nav"
              style={{ left: `${pct(n.t - sessionZero, duration)}%` }}
              title={`${n.navigationType} → ${n.url}`}
              onPointerEnter={() => onHover(ref)}
              onPointerLeave={() => onHover(null)}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setPinnedEventRef(ref);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

interface PerfRowProps {
  perf: readonly ClientPerfEntry[];
  sessionZero: number;
  duration: number;
  onHover: (ref: EventRef | null) => void;
}

export function PerfRow({ perf, sessionZero, duration, onHover }: PerfRowProps) {
  if (perf.length === 0) return null;
  return (
    <div className="lane-row">
      <div className="lane-label">
        <span className="lane-method">PERF</span>
        <span className="lane-url dim">{perf.length}</span>
      </div>
      <div className="lane-content">
        {perf.map((p, i) => {
          const ref: EventRef = { kind: "client-perf", name: p.name, t: p.t };
          const startLeft = pct(p.t - sessionZero, duration);
          if (p.entryType === "longtask" && p.duration && p.duration > 0) {
            const endLeft = pct(p.t - sessionZero + p.duration, duration);
            const w = Math.max(0.2, endLeft - startLeft);
            return (
              <div
                key={`${p.t}-${i}`}
                className="client-bar client-bar-longtask"
                style={{ left: `${startLeft}%`, width: `${w}%` }}
                title={`longtask · ${p.duration.toFixed(0)}ms`}
                onPointerEnter={() => onHover(ref)}
                onPointerLeave={() => onHover(null)}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setPinnedEventRef(ref);
                }}
              />
            );
          }
          const cls = `client-marker client-marker-${perfClassFor(p.entryType, p.name)}`;
          return (
            <div
              key={`${p.t}-${i}`}
              className={cls}
              style={{ left: `${startLeft}%` }}
              title={`${p.name} · ${p.t.toFixed(0)}ms`}
              onPointerEnter={() => onHover(ref)}
              onPointerLeave={() => onHover(null)}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setPinnedEventRef(ref);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function perfClassFor(entryType: string, name: string): string {
  if (entryType === "largest-contentful-paint") return "lcp";
  if (entryType === "paint" && name.includes("contentful")) return "fcp";
  if (entryType === "paint") return "paint";
  return "other";
}

interface ClientFetchRowProps {
  fetch: ClientFetch;
  sessionZero: number;
  duration: number;
  onHover: (ref: EventRef | null) => void;
}

export function ClientFetchRow({
  fetch: f,
  sessionZero,
  duration,
  onHover,
}: ClientFetchRowProps) {
  const start = pct(f.start - sessionZero, duration);
  const end = pct(f.end - sessionZero, duration);
  const w = Math.max(0.2, end - start);
  const dur = f.end - f.start;
  const ref: EventRef = { kind: "client-fetch", fetchId: f.id };
  return (
    <div
      className="lane-row"
      onPointerEnter={() => onHover(ref)}
      onPointerLeave={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        setPinnedEventRef(ref);
      }}
    >
      <div className="lane-label">
        <span className="lane-method">{f.method ?? "FETCH"}</span>
        <span className="lane-url" title={f.url}>
          {shortPath(f.url)}
        </span>
      </div>
      <div className="lane-content">
        <div
          className={`client-fetch-bar fetch-bar-${classifyDuration(dur)}`}
          style={{ left: `${start}%`, width: `${w}%` }}
          title={`${f.url} · ${dur.toFixed(0)}ms · ${f.status}`}
        />
      </div>
    </div>
  );
}

function shortPath(url: string): string {
  try {
    const u = new URL(url, location.href);
    return u.pathname + (u.search || "");
  } catch {
    return url;
  }
}

interface ChunksRowProps {
  chunks: readonly ClientChunk[];
  sessionZero: number;
  duration: number;
  onHover: (ref: EventRef | null) => void;
}

// One thin row aggregating every JS / CSS chunk Next loaded for the page.
// These are the bundles that gate hydration of each client component:
// once a chunk lands the corresponding subtree can run its render fn and
// attach event listeners. Useful as a visible proxy for "when did
// hydration become possible".
export function ChunksRow({
  chunks,
  sessionZero,
  duration,
  onHover,
}: ChunksRowProps) {
  if (chunks.length === 0) return null;
  return (
    <div className="lane-row">
      <div className="lane-label">
        <span className="lane-method">CHUNKS</span>
        <span className="lane-url dim">{chunks.length}</span>
      </div>
      <div className="lane-content">
        {chunks.map((c, i) => {
          const start = pct(c.start - sessionZero, duration);
          const end = pct(c.end - sessionZero, duration);
          const w = Math.max(0.2, end - start);
          const ref: EventRef = {
            kind: "client-chunk",
            url: c.url,
            start: c.start,
          };
          return (
            <div
              key={`${c.url}-${i}`}
              className={`client-bar client-bar-chunk client-bar-chunk-${c.chunkType}`}
              style={{ left: `${start}%`, width: `${w}%` }}
              title={`${c.chunkType.toUpperCase()} ${shortPath(c.url)} · ${(c.end - c.start).toFixed(0)}ms`}
              onPointerEnter={() => onHover(ref)}
              onPointerLeave={() => onHover(null)}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setPinnedEventRef(ref);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

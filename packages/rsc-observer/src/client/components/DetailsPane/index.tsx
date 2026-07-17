import { useEffect } from "react";
import type {
  ClientChunk,
  ClientFetch,
  ClientNav,
  ClientPerfEntry,
  EventRef,
  Request,
  ServerFetch,
  ServerAction,
  RSCChunk,
} from "../../store/types";
import {
  getClientChunks,
  getClientFetches,
  getClientNavs,
  getClientPerf,
  getCurrentT,
  getPinnedEventRef,
  getRequestById,
  getRequests,
  getSessionEnd,
  getSessionZero,
  setPinnedEventRef,
  useStoreVersion,
} from "../../store";
import { pickActiveRscRequest } from "../TreePreview/utils";
import { classifyDuration } from "../UnifiedTimeline/utils";

interface Props {
  hoveredRef: EventRef | null;
}

export function DetailsPane({ hoveredRef }: Props) {
  useStoreVersion();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinnedEventRef(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const pinned = getPinnedEventRef();
  const ref = pinned ?? hoveredRef;

  if (ref) {
    return <DetailsForRef ref={ref} />;
  }

  const currentT = getCurrentT() ?? getSessionEnd();
  const active = pickActiveRscRequest(getRequests(), currentT);
  if (active) {
    return (
      <div className="details">
        <div className="dim details-hint">
          Scrub position · {formatFromZero(currentT)} — showing{" "}
          <code>{active.url}</code>
        </div>
        <RequestDetails request={active} />
      </div>
    );
  }

  return (
    <div className="details-empty dim">
      Hover a lane for a peek · click to pin · Esc to unpin.
    </div>
  );
}

function DetailsForRef({ ref }: { ref: EventRef }) {
  switch (ref.kind) {
    case "request": {
      const r = getRequestById(ref.requestId);
      if (!r) return <div className="details-empty dim">Request gone.</div>;
      return (
        <div className="details">
          <RequestDetails request={r} />
        </div>
      );
    }
    case "server-fetch": {
      const r = getRequestById(ref.requestId);
      const f = r?.fetches.find((x) => x.id === ref.fetchId);
      if (!r || !f) return <div className="details-empty dim">Fetch gone.</div>;
      return (
        <div className="details">
          <FetchDetails fetch={f} parent={r} />
        </div>
      );
    }
    case "rsc-chunk": {
      const r = getRequestById(ref.requestId);
      const c = r?.chunks[ref.chunkIndex];
      if (!r || !c) return <div className="details-empty dim">Chunk gone.</div>;
      return (
        <div className="details">
          <ChunkDetails chunk={c} parent={r} />
        </div>
      );
    }
    case "server-action": {
      const r = getRequestById(ref.requestId);
      const a = r?.actions[ref.actionIndex];
      if (!r || !a) return <div className="details-empty dim">Action gone.</div>;
      return (
        <div className="details">
          <ActionDetails action={a} parent={r} />
        </div>
      );
    }
    case "client-nav": {
      const nav = getClientNavs().find((n) => n.t === ref.t);
      if (!nav)
        return <div className="details-empty dim">Navigation gone.</div>;
      return (
        <div className="details">
          <NavDetails nav={nav} />
        </div>
      );
    }
    case "client-perf": {
      const entry = getClientPerf().find(
        (p) => p.t === ref.t && p.name === ref.name,
      );
      if (!entry)
        return <div className="details-empty dim">Perf entry gone.</div>;
      return (
        <div className="details">
          <PerfDetails entry={entry} />
        </div>
      );
    }
    case "client-fetch": {
      const f = getClientFetches().find((x) => x.id === ref.fetchId);
      if (!f)
        return <div className="details-empty dim">Fetch gone.</div>;
      return (
        <div className="details">
          <ClientFetchDetails fetch={f} />
        </div>
      );
    }
    case "client-chunk": {
      const c = getClientChunks().find(
        (x) => x.url === ref.url && x.start === ref.start,
      );
      if (!c) return <div className="details-empty dim">Chunk gone.</div>;
      return (
        <div className="details">
          <ChunkDetailsView chunk={c} />
        </div>
      );
    }
  }
}

function RequestDetails({ request: r }: { request: Request }) {
  const end = r.endTime ?? r.lastEventAt;
  const dur = Math.max(0, end - r.startTime);
  const kind = r.actions.length > 0 ? "ACT" : r.isRSC ? "RSC" : "HTML";
  const bytes = r.chunks.reduce((a, c) => a + c.bytes, 0);
  return (
    <>
      <div className="details-header">
        <span className={`badge badge-${kind.toLowerCase()}`}>{kind}</span>
        <span className="details-method">{r.method}</span>
        <span className="details-url">{r.url}</span>
      </div>
      <div className="details-summary">
        <span>status {r.status ?? "?"}</span>
        <span>·</span>
        <span>{Math.round(dur)}ms</span>
        {r.chunks.length > 0 ? (
          <>
            <span>·</span>
            <span>
              {r.chunks.length} chunks, {formatBytes(bytes)}
            </span>
          </>
        ) : null}
        {r.fetches.length > 0 ? (
          <>
            <span>·</span>
            <span>{r.fetches.length} server fetch</span>
          </>
        ) : null}
      </div>
      {r.error ? (
        <div className="details-section details-error">
          <strong>error:</strong> {r.error.message}
          {r.error.digest ? (
            <span className="dim"> · digest {r.error.digest}</span>
          ) : null}
        </div>
      ) : null}
      {r.fetches.length > 0 ? (
        <div className="details-section">
          <div className="details-section-label">fetches</div>
          <ul className="flat-list">
            {r.fetches.map((f) => (
              <li key={f.id}>
                <span className="dim">{f.method}</span>{" "}
                <span>{shortPath(f.url)}</span>{" "}
                <span className="dim">→ {f.status}</span>{" "}
                <span className="dim">({Math.round(f.end - f.start)}ms)</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function FetchDetails({
  fetch: f,
  parent,
}: {
  fetch: ServerFetch;
  parent: Request;
}) {
  const dur = f.end - f.start;
  const cls = classifyDuration(dur);
  return (
    <>
      <div className="details-header">
        <span className={`fetch-chip fetch-chip-${cls}`}>FETCH</span>
        <span className="details-method">{f.method}</span>
        <span className="details-url">{f.url}</span>
      </div>
      <div className="details-summary">
        <span>status {f.status}</span>
        <span>·</span>
        <span>{Math.round(dur)}ms</span>
        {f.sizeBytes > 0 ? (
          <>
            <span>·</span>
            <span>{formatBytes(f.sizeBytes)}</span>
          </>
        ) : null}
        <span>·</span>
        <span>
          parent <code>{parent.url}</code>
        </span>
      </div>
      {f.ownerStack ? <OwnerStackView raw={f.ownerStack} /> : null}
    </>
  );
}

interface OwnerFrame {
  component?: string;
  file?: string;
  line?: number;
  column?: number;
}

function parseOwnerStack(raw: string): OwnerFrame[] {
  const frames: OwnerFrame[] = [];
  for (const rawLine of raw.split("\n")) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    // V8-style: "at Component (file.tsx:23:45)" or "at file.tsx:23:45"
    let m = line.match(/^at\s+(\S+)\s+\((.+?):(\d+):(\d+)\)\s*$/);
    if (m) {
      frames.push({
        component: m[1],
        file: m[2],
        line: parseInt(m[3]!, 10),
        column: parseInt(m[4]!, 10),
      });
      continue;
    }
    m = line.match(/^at\s+(.+?):(\d+):(\d+)\s*$/);
    if (m) {
      frames.push({
        file: m[1],
        line: parseInt(m[2]!, 10),
        column: parseInt(m[3]!, 10),
      });
      continue;
    }
    m = line.match(/^at\s+(\S+)\s*$/);
    if (m) {
      frames.push({ component: m[1] });
      continue;
    }
    // React's "in Component (at file.tsx:N:N)" form.
    m = line.match(/^in\s+(\S+)\s+\(at\s+(.+?):(\d+):(\d+)\)\s*$/);
    if (m) {
      frames.push({
        component: m[1],
        file: m[2],
        line: parseInt(m[3]!, 10),
        column: parseInt(m[4]!, 10),
      });
      continue;
    }
    m = line.match(/^in\s+(\S+)\s*$/);
    if (m) {
      frames.push({ component: m[1] });
      continue;
    }
  }
  return frames;
}

function shortenFile(path: string): string {
  // Trim noisy webpack/turbopack prefixes ("[project]/", "(rsc)/" etc.) and
  // node_modules paths down to the final package + filename.
  let s = path;
  const proj = s.indexOf("[project]/");
  if (proj >= 0) s = s.slice(proj + "[project]/".length);
  const nm = s.lastIndexOf("/node_modules/");
  if (nm >= 0) s = "node_modules/…" + s.slice(nm);
  if (s.length > 60) s = "…" + s.slice(-58);
  return s;
}

function OwnerStackView({ raw }: { raw: string }) {
  const frames = parseOwnerStack(raw);
  if (frames.length === 0) {
    return (
      <div className="details-section">
        <div className="details-section-label">owner stack</div>
        <pre className="details-stack">{raw}</pre>
      </div>
    );
  }
  return (
    <div className="details-section">
      <div className="details-section-label">owner stack</div>
      <ul className="flat-list">
        {frames.map((f, i) => (
          <li key={i}>
            <span className="details-method">
              {f.component ?? "(anonymous)"}
            </span>
            {f.file ? (
              <>
                {" "}
                <span className="dim">
                  {shortenFile(f.file)}
                  {f.line ? `:${f.line}` : ""}
                </span>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChunkDetails({ chunk: c, parent }: { chunk: RSCChunk; parent: Request }) {
  return (
    <>
      <div className="details-header">
        <span className="badge badge-rsc">CHUNK</span>
        <span className="details-method">#{c.index}</span>
        <span className="details-url">{parent.url}</span>
      </div>
      <div className="details-summary">
        <span>{formatBytes(c.bytes)}</span>
        <span>·</span>
        <span>t = {Math.round(c.t - parent.startTime)}ms (since request start)</span>
      </div>
      <div className="details-section">
        <div className="details-section-label">wire excerpt</div>
        <pre className="details-stack">{c.data.slice(0, 600)}{c.data.length > 600 ? "…" : ""}</pre>
      </div>
    </>
  );
}

function ActionDetails({
  action: a,
  parent,
}: {
  action: ServerAction;
  parent: Request;
}) {
  // Result preview is derived from the captured RSC chunks on the client side.
  // Server-side capture would require teeing the response stream synchronously
  // before the decompressor fires (since action responses can be gzipped) and
  // adds non-trivial complexity for a polish-tier feature. The chunks are in
  // the store anyway, so we extract here.
  const result = a.resultPreview || extractActionResult(parent);

  return (
    <>
      <div className="details-header">
        <span className="badge badge-act">ACT</span>
        <span className="details-method">{a.name.slice(0, 12)}</span>
        <span className="details-url">{parent.url}</span>
      </div>
      <div className="details-summary">
        <span>{Math.round(a.end - a.start)}ms</span>
      </div>
      <div className="details-section">
        <div className="details-section-label">args</div>
        <pre className="details-stack dim">
          {a.argsPreview ||
            "(args capture deferred — read at action call site in your code)"}
        </pre>
      </div>
      <div className="details-section">
        <div className="details-section-label">result</div>
        <pre className="details-stack">{result || "(none)"}</pre>
      </div>
    </>
  );
}

// Extract the action's return value from the captured RSC response. Server
// Actions emit a small wire payload of the form:
//   0:{"a":"$@1"}   ← metadata pointing at the resolution
//   1:{"actual":"return value"}   ← the body
// We pick the row whose id !== "0" (or fall back to id "0" if it's the only
// row), and return its rawData truncated for display. Best-effort: malformed
// payloads just yield an empty string.
function extractActionResult(parent: Request): string {
  if (parent.chunks.length === 0) return "";
  const accumulated = parent.chunks.map((c) => c.data).join("");
  if (!accumulated) return "";

  const lines = accumulated.split("\n");
  let firstRow: string | null = null;
  let nonZeroRow: string | null = null;
  for (const line of lines) {
    const m = /^([0-9a-f]*):(.*)$/.exec(line);
    if (!m) continue;
    const id = m[1] ?? "";
    const data = m[2] ?? "";
    if (firstRow === null) firstRow = data;
    if (id !== "0" && id !== "" && data) {
      nonZeroRow = data;
      break;
    }
  }

  const picked = nonZeroRow ?? firstRow ?? "";
  return picked.length > 400 ? picked.slice(0, 400) + "…" : picked;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

function shortPath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + (u.search || "");
  } catch {
    return url;
  }
}

function formatFromZero(t: number | null): string {
  const z = getSessionZero();
  if (t === null || z === null) return "—";
  return `${Math.round(t - z)}ms`;
}

// ─── Client-side event details ────────────────────────────────────────────

function NavDetails({ nav }: { nav: ClientNav }) {
  const NAV_DESC: Record<ClientNav["navigationType"], string> = {
    push: "new history entry",
    replace: "history entry overwritten",
    traverse: "back / forward / popstate",
  };
  return (
    <>
      <div className="details-header">
        <span className="badge badge-html">NAV</span>
        <span className="details-method">{nav.navigationType}</span>
        <span className="details-url">{nav.url}</span>
      </div>
      <div className="details-summary">
        <span>+{formatFromZero(nav.t)}</span>
        <span>· {NAV_DESC[nav.navigationType]}</span>
      </div>
      {(() => {
        const all = getClientNavs();
        if (all.length <= 1) return null;
        return (
          <div className="details-section">
            <div className="details-section-label">all navs ({all.length})</div>
            <ol className="details-stack" style={{ paddingLeft: 16 }}>
              {all.map((n, i) => (
                <li
                  key={i}
                  style={{ fontWeight: n.t === nav.t ? 600 : 400 }}
                >
                  +{formatFromZero(n.t)} · {n.navigationType} → {n.url}
                </li>
              ))}
            </ol>
          </div>
        );
      })()}
    </>
  );
}

function PerfDetails({ entry }: { entry: ClientPerfEntry }) {
  const PERF_DESC: Record<string, string> = {
    "first-paint": "first pixels painted",
    "first-contentful-paint": "first text/image painted (FCP, Core Web Vital)",
    "largest-contentful-paint": "largest visible element rendered (LCP)",
    longtask: "main-thread task >50 ms — blocks input",
  };
  const desc =
    PERF_DESC[entry.entryType === "paint" ? entry.name : entry.entryType] ??
    "browser performance entry";
  return (
    <>
      <div className="details-header">
        <span className="badge badge-html">PERF</span>
        <span className="details-method">{entry.entryType}</span>
        <span className="details-url">{entry.name}</span>
      </div>
      <div className="details-summary">
        <span>+{formatFromZero(entry.t)}</span>
        {entry.duration && entry.duration > 0 ? (
          <span>· {Math.round(entry.duration)}ms</span>
        ) : null}
        <span>· {desc}</span>
      </div>
      {(() => {
        const all = getClientPerf();
        if (all.length <= 1) return null;
        return (
          <div className="details-section">
            <div className="details-section-label">all perf entries ({all.length})</div>
            <ol className="details-stack" style={{ paddingLeft: 16 }}>
              {all.map((p, i) => (
                <li
                  key={i}
                  style={{
                    fontWeight:
                      p.t === entry.t && p.name === entry.name ? 600 : 400,
                  }}
                >
                  +{formatFromZero(p.t)} · {p.entryType} {p.name}
                  {p.duration && p.duration > 0
                    ? ` (${Math.round(p.duration)}ms)`
                    : ""}
                </li>
              ))}
            </ol>
          </div>
        );
      })()}
    </>
  );
}

function ClientFetchDetails({ fetch: f }: { fetch: ClientFetch }) {
  const dur = f.end - f.start;
  return (
    <>
      <div className="details-header">
        <span className="badge badge-html">FETCH</span>
        <span className="details-method">{f.method}</span>
        <span className="details-url" title={f.url}>
          {shortPath(f.url)}
        </span>
      </div>
      <div className="details-summary">
        <span>{f.status}</span>
        <span>· {Math.round(dur)}ms</span>
        <span>· {formatBytes(f.sizeBytes)}</span>
        <span>· +{formatFromZero(f.start)} → +{formatFromZero(f.end)}</span>
      </div>
      <div className="details-section">
        <div className="details-section-label">url</div>
        <pre className="details-stack">{f.url}</pre>
      </div>
    </>
  );
}

function ChunkDetailsView({ chunk: c }: { chunk: ClientChunk }) {
  const dur = c.end - c.start;
  const filename = chunkFilename(c.url);
  return (
    <>
      <div className="details-header">
        <span className="badge badge-html">CHUNK</span>
        <span className="details-method">{c.chunkType.toUpperCase()}</span>
        <span className="details-url" title={c.url}>
          {filename}
        </span>
      </div>
      <div className="details-summary">
        <span>{Math.round(dur)}ms</span>
        <span>· {formatBytes(c.sizeBytes)}</span>
        <span>· +{formatFromZero(c.start)} → +{formatFromZero(c.end)}</span>
      </div>
      <div className="details-section">
        <div className="details-section-label">url</div>
        <pre className="details-stack">{c.url}</pre>
      </div>
      {(() => {
        const all = getClientChunks();
        if (all.length <= 1) return null;
        const sorted = [...all].sort((a, b) => a.start - b.start);
        return (
          <div className="details-section">
            <div
              className="details-section-label"
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <span>all chunks ({sorted.length})</span>
              <span>
                Σ {formatBytes(sorted.reduce((s, x) => s + x.sizeBytes, 0))}
              </span>
            </div>
            <div
              className="details-stack"
              style={{ maxHeight: 200, overflow: "auto" }}
            >
              {sorted.map((x, i) => (
                <div
                  key={i}
                  style={{
                    fontWeight:
                      x.url === c.url && x.start === c.start ? 600 : 400,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span>
                    +{formatFromZero(x.start)} · {x.chunkType}{" "}
                    {chunkFilename(x.url)}
                  </span>
                  <span className="dim">
                    {Math.round(x.end - x.start)}ms ·{" "}
                    {formatBytes(x.sizeBytes)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </>
  );
}

// Last segment of a chunk URL, with query stripped — readable label like
// "main-app.js" or "page-abc123.js". Falls back to the full URL if parsing
// fails (e.g. data URLs).
function chunkFilename(url: string): string {
  try {
    const u = new URL(url, location.href);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? url;
  } catch {
    const q = url.indexOf("?");
    return (q >= 0 ? url.slice(0, q) : url).split("/").pop() ?? url;
  }
}

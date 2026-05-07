import { useEffect, useState } from "react";
import {
  getCurrentT,
  getRequests,
  getSessionEnd,
  getViewMode,
  useStoreVersion,
} from "../../store";
import type { Forest, ForestEntry } from "../../parser";
import type { Request } from "../../store/types";
import { TreeNode } from "./TreeNode";
import { VisualTree } from "./VisualTree";
import { pickActiveRscRequest, pickSnapshot } from "./utils";
import { dedupRequests } from "../UnifiedTimeline/utils";

const ASIDE_OPEN_KEY = "__rsc_observer_aside_open";

function readAsideOpen(): boolean {
  try {
    return localStorage.getItem(ASIDE_OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

function writeAsideOpen(open: boolean): void {
  try {
    localStorage.setItem(ASIDE_OPEN_KEY, open ? "1" : "0");
  } catch {
    // storage disabled or full; ignore
  }
}

export function TreePreview() {
  useStoreVersion();
  const currentT = getCurrentT();
  const sessionEnd = getSessionEnd();
  const requests = dedupRequests(getRequests());
  const viewMode = getViewMode();
  const [asideOpen, setAsideOpen] = useState(readAsideOpen);

  useEffect(() => {
    writeAsideOpen(asideOpen);
  }, [asideOpen]);

  const effectiveT = currentT ?? sessionEnd;
  const active = pickActiveRscRequest(requests, effectiveT);

  if (!active) {
    return (
      <div className="tree-preview-empty dim">
        No RSC render active at this moment.
      </div>
    );
  }

  const snapshot = pickSnapshot(active, effectiveT);

  if (!snapshot) {
    return (
      <div className="tree-preview-empty dim">
        Waiting for the first chunk of {active.url}…
      </div>
    );
  }

  const { result } = snapshot;

  if (result.tier === 3 || !("forest" in result)) {
    if (result.rows.length === 0) return <ZeroRowDebug request={active} />;
    // The wire parsed cleanly but couldn't be reassembled into a tree —
    // typical for server-action responses (which carry just a result
    // payload, not a layout) and for snapshots taken mid-stream before
    // row 0 has arrived. Showing the parsed rows is more useful than a
    // blanket error: the user can still see what's on the wire.
    return (
      <div className="tree-preview-fallback">
        <div className="dim tree-preview-fallback-msg">
          {result.rows.length} parsed row
          {result.rows.length === 1 ? "" : "s"} · no tree assembled yet
        </div>
        <ol className="tree-preview-fallback-rows">
          {result.rows.map((row, i) => (
            <li key={i}>
              <span className="tree-preview-fallback-id">
                {row.id || "—"}
              </span>
              <span className="tree-preview-fallback-type dim">
                {row.type || "·"}
              </span>
              <code className="tree-preview-fallback-raw">
                {row.rawData.length > 200
                  ? row.rawData.slice(0, 200) + "…"
                  : row.rawData}
              </code>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (result.forest.length === 0) return <ZeroRowDebug request={active} />;

  // Page goes full-width with no chrome label; everything else stacks into a
  // collapsed sidebar on the right. The first "page" entry wins; if there
  // are multiple pages (unusual) the rest fall through to extras.
  const pageIndex = result.forest.findIndex((f) => f.kind === "page");
  const page = pageIndex >= 0 ? result.forest[pageIndex]! : result.forest[0]!;
  const others = result.forest.filter((_, i) => i !== (pageIndex >= 0 ? pageIndex : 0));

  return (
    <div
      className={`tree-preview-layout${others.length > 0 && asideOpen ? " aside-open" : ""}`}
    >
      <div className="tree-preview-main">
        {viewMode === "visual" ? (
          <VisualTree forest={[page]} onFallback={() => renderTree(page)} />
        ) : (
          <div className="tree-preview tree-preview-structural">
            {renderTree(page)}
          </div>
        )}
      </div>
      {others.length > 0 ? (
        <aside className={`tree-preview-aside${asideOpen ? " open" : ""}`}>
          <button
            type="button"
            className="tree-aside-toggle"
            onClick={() => setAsideOpen((v) => !v)}
            aria-label={asideOpen ? "Hide other subtrees" : "Show other subtrees"}
            title={asideOpen ? "Hide other subtrees" : `${others.length} other subtree${others.length === 1 ? "" : "s"}`}
          >
            {asideOpen ? "›" : `‹  ${others.length}`}
          </button>
          {asideOpen ? (
            <div className="tree-aside-content">
              <div className="tree-aside-heading dim">other subtrees</div>
              {others.map(({ rootId, tree, kind }) => (
                <details key={rootId} className="tree-aside-entry">
                  <summary className="tree-aside-summary dim">
                    {asideLabel(kind, rootId)}
                  </summary>
                  <div className="tree-aside-body">
                    <TreeNode node={tree} depth={0} compact />
                  </div>
                </details>
              ))}
            </div>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}

function renderTree(entry: ForestEntry) {
  return <TreeNode node={entry.tree} depth={0} />;
}

function asideLabel(kind: Forest[number]["kind"], rootId: string): string {
  if (kind === "shell") return "document shell";
  if (kind === "page") return "additional page subtree";
  return `subtree · row ${rootId}`;
}

function ZeroRowDebug({ request }: { request: Request }) {
  const raw = request.chunks.map((c) => c.data).join("");
  const totalBytes = request.chunks.reduce((a, c) => a + c.bytes, 0);
  const printable = raw.slice(0, 400);
  const looksBinary = /[\x00-\x08\x0e-\x1f]/.test(printable.slice(0, 64));

  return (
    <div className="tree-preview-empty">
      <div className="dim">
        {request.url} · {request.chunks.length} chunk
        {request.chunks.length === 1 ? "" : "s"} · {totalBytes}B captured
      </div>
      <div className="dim" style={{ marginTop: 4 }}>
        Parser found no Flight-format rows (
        {looksBinary ? "body looks binary/compressed" : "format unrecognised"}
        ).
      </div>
      <details className="tree-preview-raw">
        <summary className="dim">raw chunk data preview</summary>
        <pre>{printable}{raw.length > 400 ? "…" : ""}</pre>
      </details>
    </div>
  );
}

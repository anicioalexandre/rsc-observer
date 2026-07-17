import { useEffect, useRef, useState } from "react";
import type { EventRef } from "../../store/types";
import {
  getClientChunks,
  getClientFetches,
  getClientNavs,
  getClientPerf,
  getCurrentT,
  getFilter,
  getRequests,
  getSessionEnd,
  getSessionZero,
  getViewport,
  setCurrentT,
  setPinnedEventRef,
  setViewport,
  useStoreVersion,
} from "../../store";
import { Scale } from "./Scale";
import { Scrubber } from "./Scrubber";
import { LaneGroup } from "./LaneGroup";
import { RequestLane } from "./RequestLane";
import { FetchLane } from "./FetchLane";
import { ChunksRow, ClientFetchRow, NavRow, PerfRow } from "./ClientLane";
import {
  dedupRequests,
  fetchMatchesFilter,
  fracToTime,
  requestMatchesFilter,
  sessionDuration,
} from "./utils";

interface Props {
  onHover: (ref: EventRef | null) => void;
}

export function UnifiedTimeline({ onHover }: Props) {
  useStoreVersion();
  const sessionZero = getSessionZero();
  const sessionEnd = getSessionEnd();
  const currentT = getCurrentT();
  const filter = getFilter();
  const requests = getRequests();
  const viewport = getViewport();

  const scaleRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [scrubDragging, setScrubDragging] = useState(false);
  const [zoomSelection, setZoomSelection] = useState<{ a: number; b: number } | null>(null);
  const zoomStateRef = useRef<{
    startX: number;
    movedTo: number;
  } | null>(null);
  const justZoomedRef = useRef(false);

  // ESC clears the time-range zoom. Listens at window so the user doesn't
  // have to give the timeline focus to undo a zoom selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && getViewport()) setViewport(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (sessionZero === null) {
    return (
      <div className="unified-timeline unified-timeline-empty dim">
        No events captured yet. Navigate in the app to start.
      </div>
    );
  }

  // Window over the captured session: full session by default, drag-selected
  // range when the user has zoomed in. The selected window drives every
  // pixel-conversion below — both the ruler ticks and the per-lane bar
  // positions.
  const viewStart = viewport ? viewport.start : sessionZero;
  const viewEnd = viewport ? viewport.end : sessionEnd ?? sessionZero;
  const duration = sessionDuration(viewStart, viewEnd);

  const updateScrubFromPointer = (clientX: number): void => {
    const rect = scaleRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    // fracToTime reverses the TIMELINE_PAD_PCT inset, so a click at the
    // visual left edge of the scale maps to viewStart even though pct(0)
    // renders at 1%. Keeps the scrubber sticky to the click point.
    setCurrentT(viewStart + fracToTime(x / rect.width, duration));
  };

  // Drag X is measured against the lane-content area (i.e. relative to the
  // right edge of the 170px sticky gutter), since that's the strip whose
  // width maps linearly to time.
  const GUTTER_PX = 170;
  const contentX = (clientX: number, rect: DOMRect): number => {
    return Math.max(
      0,
      Math.min(rect.width - GUTTER_PX, clientX - rect.left - GUTTER_PX),
    );
  };

  const onSurfacePointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (e.button !== 0) return;
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= GUTTER_PX) return;
    if (e.clientX - rect.left < GUTTER_PX) return; // skip the sticky gutter
    const x = contentX(e.clientX, rect);
    zoomStateRef.current = { startX: x, movedTo: x };
    // NOTE: deliberately NOT calling setPointerCapture here. If we capture
    // immediately, every click on a lane row gets re-targeted to the
    // surface (because the click target is the LCA of pointerdown and
    // pointerup, and capture forces pointerup onto the surface). That
    // breaks click-to-pin on lane rows. Instead we defer the capture
    // until pointermove crosses the 4px drag threshold (below) — a click
    // without movement keeps its real target and the row's onClick fires.
  };

  const onSurfacePointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    const drag = zoomStateRef.current;
    if (!drag) return;
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = contentX(e.clientX, rect);
    drag.movedTo = x;
    if (Math.abs(x - drag.startX) > 4) {
      setZoomSelection({ a: drag.startX, b: x });
      // Now we know the user is dragging — capture the pointer so we keep
      // getting move/up events even if the cursor leaves the surface.
      // setPointerCapture is idempotent for the same pointerId.
      surfaceRef.current?.setPointerCapture(e.pointerId);
    }
  };

  const onSurfacePointerUp = (e: React.PointerEvent<HTMLDivElement>): void => {
    const drag = zoomStateRef.current;
    zoomStateRef.current = null;
    if (surfaceRef.current?.hasPointerCapture(e.pointerId)) {
      surfaceRef.current.releasePointerCapture(e.pointerId);
    }
    if (!drag) {
      setZoomSelection(null);
      return;
    }
    const moved = Math.abs(drag.movedTo - drag.startX);
    if (moved > 4) {
      const rect = surfaceRef.current?.getBoundingClientRect();
      const contentWidth = rect ? rect.width - GUTTER_PX : 0;
      if (contentWidth > 0) {
        const lo = Math.min(drag.startX, drag.movedTo) / contentWidth;
        const hi = Math.max(drag.startX, drag.movedTo) / contentWidth;
        // Same inverse-inset mapping as the scrubber — bars are inset
        // by TIMELINE_PAD_PCT, so the user's pixel drag needs adjusting
        // before being converted to a time range.
        const startT = viewStart + fracToTime(lo, duration);
        const endT = viewStart + fracToTime(hi, duration);
        if (endT - startT > 1) {
          setViewport({ start: startT, end: endT });
          setCurrentT(startT);
          justZoomedRef.current = true;
        }
      }
    }
    setZoomSelection(null);
  };

  // Suppress lane-row clicks (which would pin the details popover) when the
  // pointer-up that triggered the click was the end of a zoom drag.
  const onSurfaceClickCapture = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (justZoomedRef.current) {
      justZoomedRef.current = false;
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const inWindow = (t: number): boolean => t >= viewStart && t <= viewEnd;
  const overlapsWindow = (start: number, end: number): boolean =>
    end >= viewStart && start <= viewEnd;

  const collapsed = dedupRequests(requests);
  const visibleRequests = collapsed
    .filter((r) => requestMatchesFilter(r, filter))
    .filter((r) => overlapsWindow(r.startTime, r.endTime ?? r.lastEventAt));
  const visibleFetches = collapsed.flatMap((r) =>
    r.fetches
      .filter((f) => fetchMatchesFilter(f.url, filter))
      .filter((f) => overlapsWindow(f.start, f.end))
      .map((f) => ({ fetch: f, parent: r })),
  );

  const showClient = !filter.hidden.has("client");
  const navs = showClient ? getClientNavs().filter((n) => inWindow(n.t)) : [];
  const perf = showClient ? getClientPerf().filter((p) => inWindow(p.t)) : [];
  const cFetches =
    showClient && !filter.hidden.has("fetch")
      ? getClientFetches().filter((f) => overlapsWindow(f.start, f.end))
      : [];
  const cChunks = showClient
    ? getClientChunks().filter((c) => overlapsWindow(c.start, c.end))
    : [];
  const clientLaneCount =
    (navs.length > 0 ? 1 : 0) +
    (perf.length > 0 ? 1 : 0) +
    (cChunks.length > 0 ? 1 : 0) +
    cFetches.length;

  const scrubRelativeT =
    (currentT ?? sessionEnd ?? viewStart) - viewStart;

  return (
    <div className="unified-timeline">
      <div className="unified-timeline-ruler">
        <div className="unified-timeline-gutter">
          {viewport ? (
            <button
              type="button"
              className="zoom-reset"
              onClick={() => setViewport(null)}
              title="Reset zoom (Esc)"
            >
              ↺ reset zoom
            </button>
          ) : null}
        </div>
        <div
          ref={scaleRef}
          className="unified-timeline-scale-host"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setScrubDragging(true);
            updateScrubFromPointer(e.clientX);
          }}
          onPointerMove={(e) => {
            if (scrubDragging) updateScrubFromPointer(e.clientX);
          }}
          onPointerUp={(e) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            setScrubDragging(false);
          }}
          onPointerCancel={() => setScrubDragging(false)}
        >
          <Scale duration={duration} offset={viewStart - sessionZero} />
        </div>
      </div>
      <div
        ref={surfaceRef}
        className="unified-timeline-surface"
        onPointerDown={onSurfacePointerDown}
        onPointerMove={onSurfacePointerMove}
        onPointerUp={onSurfacePointerUp}
        onPointerCancel={() => {
          zoomStateRef.current = null;
          setZoomSelection(null);
        }}
        onClickCapture={onSurfaceClickCapture}
      >
        <LaneGroup label="SERVER" count={visibleRequests.length}>
          {visibleRequests.map((r) => (
            <RequestLane
              key={r.requestId}
              request={r}
              sessionZero={viewStart}
              duration={duration}
              onHover={onHover}
            />
          ))}
        </LaneGroup>
        <LaneGroup label="DATA FETCH" count={visibleFetches.length}>
          {visibleFetches.map(({ fetch, parent }) => (
            <FetchLane
              key={`${parent.requestId}-${fetch.id}`}
              fetch={fetch}
              parentRequest={parent}
              sessionZero={viewStart}
              duration={duration}
              onHover={onHover}
            />
          ))}
        </LaneGroup>
        <LaneGroup label="CLIENT" count={clientLaneCount}>
          <NavRow
            navs={navs}
            sessionZero={viewStart}
            duration={duration}
            onHover={onHover}
          />
          <PerfRow
            perf={perf}
            sessionZero={viewStart}
            duration={duration}
            onHover={onHover}
          />
          <ChunksRow
            chunks={cChunks}
            sessionZero={viewStart}
            duration={duration}
            onHover={onHover}
          />
          {cFetches.map((f) => (
            <ClientFetchRow
              key={f.id}
              fetch={f}
              sessionZero={viewStart}
              duration={duration}
              onHover={onHover}
            />
          ))}
        </LaneGroup>

        {zoomSelection ? (
          <div
            className="zoom-selection"
            style={{
              left: GUTTER_PX + Math.min(zoomSelection.a, zoomSelection.b),
              width: Math.abs(zoomSelection.b - zoomSelection.a),
            }}
          />
        ) : null}

        <div className="scrubber-overlay">
          <Scrubber t={scrubRelativeT} duration={duration} />
        </div>
      </div>
    </div>
  );
}

export { setPinnedEventRef };

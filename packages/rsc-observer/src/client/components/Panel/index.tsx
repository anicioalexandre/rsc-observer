import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { EventRef } from "../../store/types";
import {
  clearAll,
  getPinnedEventRef,
  getTracking,
  getViewMode,
  setPinnedEventRef,
  setTracking,
  setViewMode,
  useStoreVersion,
} from "../../store";
import { UnifiedTimeline } from "../UnifiedTimeline";
import { FilterBar } from "../UnifiedTimeline/FilterBar";
import { TreePreview } from "../TreePreview";
import { DetailsPane } from "../DetailsPane";
import { RecordingDot } from "../RecordingDot";
import {
  defaultPosition,
  defaultSize,
  readMinSize,
  readPosition,
  readSize,
  writePosition,
  writeSize,
  type Direction,
  type Position,
  type Size,
} from "./layout";
import { useDraggable } from "./useDraggable";
import { useResizable } from "./useResizable";
import { useFullscreenOnMobile } from "./useFullscreenOnMobile";

interface Props {
  onClose: () => void;
}

const DIRECTIONS: Direction[] = ["n", "s", "e", "w", "nw", "ne", "sw", "se"];

// Title bar collapses to a "▾ menu + ×" pair below this panel width — the
// inline FilterBar + view-mode toggle + clear button stop fitting cleanly
// somewhere around here. The threshold is panel-width, not viewport-width,
// so resizing the panel narrow triggers the same compact mode.
const COMPACT_THRESHOLD_PX = 800;

export function Panel({ onClose }: Props) {
  useStoreVersion();
  const panelRef = useRef<HTMLDivElement>(null);
  const chromeButtonRef = useRef<HTMLButtonElement>(null);
  const chromePopoverRef = useRef<HTMLDivElement>(null);
  const [hoveredRef, setHoveredRef] = useState<EventRef | null>(null);
  const [chromeOpen, setChromeOpen] = useState(false);
  // Transient view state — when true the panel covers the viewport,
  // ignoring the saved size + position. Toggling off restores from the
  // already-persisted localStorage values (no extra preMax bookkeeping
  // needed). Not persisted — reload returns to "windowed".
  const [isMaximized, setIsMaximized] = useState(false);
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < COMPACT_THRESHOLD_PX;
  });
  const pinned = getPinnedEventRef();
  const tracking = getTracking();

  // Window-style chrome: size + position persisted in localStorage.
  const [size, setSize] = useState<Size>(() => readSize() ?? defaultSize());
  const [position, setPosition] = useState<Position>(() => {
    const initialSize = readSize() ?? defaultSize();
    return readPosition() ?? defaultPosition(initialSize);
  });
  const [minSize, setMinSize] = useState<Size>({ width: 375, height: 667 });
  const isMobile = useFullscreenOnMobile(640, 700);

  // Read min-size from CSS tokens once the panel is in the DOM.
  useLayoutEffect(() => {
    setMinSize(readMinSize(panelRef.current));
  }, []);

  // Watch the panel itself, not the viewport — resizing the panel narrow
  // is the trigger users actually feel. Falls back to viewport width
  // before the ref attaches.
  useLayoutEffect(() => {
    if (!panelRef.current) return;
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setIsCompact(entry.contentRect.width < COMPACT_THRESHOLD_PX);
    });
    ro.observe(panelRef.current);
    return () => ro.disconnect();
  }, []);

  // Close the chrome popover automatically when we leave compact mode —
  // otherwise it'd stay open over the now-visible inline items.
  useEffect(() => {
    if (!isCompact && chromeOpen) setChromeOpen(false);
  }, [isCompact, chromeOpen]);

  // ESC: close popover first, then unpin.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") return;
      if (chromeOpen) setChromeOpen(false);
      else if (pinned) setPinnedEventRef(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pinned, chromeOpen]);

  // Click outside the chrome popover closes it.
  useEffect(() => {
    if (!chromeOpen) return;
    const onPointer = (e: Event): void => {
      const target = e.target as Element | null;
      if (!target) return;
      if (chromePopoverRef.current?.contains(target)) return;
      if (chromeButtonRef.current?.contains(target)) return;
      setChromeOpen(false);
    };
    const root = panelRef.current;
    root?.addEventListener("pointerdown", onPointer, true);
    return () => root?.removeEventListener("pointerdown", onPointer, true);
  }, [chromeOpen]);

  const drag = useDraggable({
    // Drag + resize disabled while maximized (and on mobile fullscreen);
    // the user must restore the panel before nudging it.
    enabled: !isMobile && !isMaximized,
    position,
    size,
    onChange: setPosition,
    onCommit: (final) => {
      setPosition(final);
      writePosition(final);
    },
  });

  const resize = useResizable({
    enabled: !isMobile && !isMaximized,
    position,
    size,
    minSize,
    onChange: ({ position: p, size: s }) => {
      setPosition(p);
      setSize(s);
    },
    onCommit: ({ position: p, size: s }) => {
      setPosition(p);
      setSize(s);
      writePosition(p);
      writeSize(s);
    },
  });

  // Pointer-down handler that stops drag from starting.
  const stopDrag = (e: React.PointerEvent): void => {
    e.stopPropagation();
  };

  // Header containers use this instead of stopDrag so only presses on
  // actual controls are excluded — the title, chip gaps and empty flex
  // space all stay draggable. (The chrome popover has its own stopDrag.)
  const stopDragOnControls = (e: React.PointerEvent): void => {
    if ((e.target as Element).closest("button, input")) {
      e.stopPropagation();
    }
  };

  // Single hide affordance — the "×" close button. Transient state
  // (pinned ref, scrub time, zoom viewport) is preserved across hides
  // so reopening returns the user to where they were.
  const onHide = (): void => {
    setChromeOpen(false);
    onClose();
  };

  const showDetails = hoveredRef !== null || pinned !== null;

  const panelStyle: React.CSSProperties =
    isMobile || isMaximized
      ? { top: 0, left: 0, width: "100vw", height: "100vh" }
      : {
          top: position.top,
          left: position.left,
          width: size.width,
          height: size.height,
        };

  // The inline group + the chrome popover both render unconditionally;
  // CSS container queries on `.panel` pick which one is visible based
  // on panel width. This avoids a JS-driven layout flip on reload (the
  // ResizeObserver below still tracks compact state, but only to
  // auto-close the popover when the panel resizes wide).

  return (
    <div
      ref={panelRef}
      className={`panel${isMobile ? " panel-mobile" : ""}${isMaximized && !isMobile ? " panel-maximized" : ""}`}
      role="dialog"
      aria-label="rsc-observer panel"
      style={panelStyle}
    >
      <div
        className="panel-header"
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
      >
        <div className="panel-title-group">
          <RecordingDot active={tracking} />
          <span className="panel-title">rsc-observer</span>
        </div>

        <div className="panel-header-inline" onPointerDown={stopDragOnControls}>
          <FilterBar variant="row" />
          <ViewModeToggle />
          <button
            type="button"
            className="panel-action"
            onClick={clearAll}
            title="Clear captured events"
          >
            clear
          </button>
        </div>

        <div className="panel-header-actions" onPointerDown={stopDragOnControls}>
          <button
            ref={chromeButtonRef}
            type="button"
            className={`panel-action panel-chrome-trigger${chromeOpen ? " open" : ""}`}
            onClick={() => setChromeOpen((v) => !v)}
            aria-label="More controls"
            aria-expanded={chromeOpen}
            title="Filters · view mode · clear"
          >
            ▾
          </button>
          <button
            type="button"
            className={`panel-action panel-tracking${tracking ? " on" : " off"}`}
            onClick={() => setTracking(!tracking)}
            aria-label={tracking ? "Pause tracking" : "Resume tracking"}
            aria-pressed={!tracking}
            title={tracking ? "Pause tracking" : "Resume tracking"}
          >
            ⏻
          </button>
          {!isMobile ? (
            <button
              type="button"
              className="panel-action panel-maximize"
              onClick={() => setIsMaximized((v) => !v)}
              aria-label={isMaximized ? "Restore" : "Maximize"}
              aria-pressed={isMaximized}
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? "⧉" : "□"}
            </button>
          ) : null}
          <button
            type="button"
            className="panel-action panel-close"
            onClick={onHide}
            aria-label="Close"
            title="Close"
          >
            ×
          </button>
          {chromeOpen ? (
            <div
              ref={chromePopoverRef}
              className="panel-chrome-popover"
              onPointerDown={stopDrag}
            >
              <div className="panel-chrome-section">
                <div className="panel-chrome-label">filters</div>
                <FilterBar variant="stacked" />
              </div>
              <div className="panel-chrome-divider" />
              <div className="panel-chrome-section">
                <div className="panel-chrome-label">preview render</div>
                <ViewModeToggle />
              </div>
              <div className="panel-chrome-divider" />
              <div className="panel-chrome-section panel-chrome-actions">
                <button
                  type="button"
                  className="panel-action panel-chrome-action"
                  onClick={() => {
                    clearAll();
                    setChromeOpen(false);
                  }}
                  title="Clear captured events"
                >
                  clear events
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="panel-region panel-region-timeline">
        <UnifiedTimeline onHover={setHoveredRef} />
      </div>

      <div className="panel-region panel-region-preview">
        <TreePreview />
      </div>

      {showDetails ? (
        <div
          className={`details-popover${pinned ? " pinned" : ""}`}
          role="dialog"
          aria-label="Event details"
        >
          <div className="details-popover-header">
            <span className="details-popover-title">
              DETAILS
              {pinned ? (
                <span className="details-popover-pinned">
                  · pinned <span className="dim">(Esc to unpin)</span>
                </span>
              ) : null}
            </span>
            {pinned ? (
              <button
                type="button"
                className="panel-action details-popover-close"
                onClick={() => setPinnedEventRef(null)}
                title="Unpin (Esc)"
              >
                ×
              </button>
            ) : null}
          </div>
          <div className="details-popover-body">
            <DetailsPane hoveredRef={hoveredRef} />
          </div>
        </div>
      ) : null}

      {!isMobile && !isMaximized
        ? DIRECTIONS.map((dir) => (
            <div
              key={dir}
              className={`panel-resize panel-resize-${dir}`}
              data-resize={dir}
              onPointerDown={resize.onPointerDown}
              onPointerMove={resize.onPointerMove}
              onPointerUp={resize.onPointerUp}
            />
          ))
        : null}
    </div>
  );
}

function ViewModeToggle() {
  useStoreVersion();
  const mode = getViewMode();
  return (
    <div
      className="view-mode-toggle"
      role="tablist"
      aria-label="Preview render mode"
    >
      <button
        type="button"
        className={`view-mode-btn${mode === "visual" ? " active" : ""}`}
        onClick={() => setViewMode("visual")}
        title="Render Server Components as real DOM with host CSS"
      >
        visual
      </button>
      <button
        type="button"
        className={`view-mode-btn${mode === "structural" ? " active" : ""}`}
        onClick={() => setViewMode("structural")}
        title="Render the tree as labelled fieldsets"
      >
        structural
      </button>
    </div>
  );
}

export const css = `
.unified-timeline {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  user-select: none;
  background: var(--color-surface);
}

.unified-timeline-empty {
  padding: var(--space-6);
  font-family: var(--font-mono);
  font-size: var(--font-sm);
  color: var(--color-text-dim);
}

/* Top ruler row: left gutter + right scale. Stays fixed while surface scrolls. */
.unified-timeline-ruler {
  display: flex;
  height: 22px;
  border-bottom: var(--border-soft);
  flex-shrink: 0;
  background: var(--color-elevated);
}

.unified-timeline-gutter {
  width: var(--gutter-width);
  flex-shrink: 0;
  border-right: var(--border-soft);
  display: flex;
  align-items: center;
  padding: 0 var(--space-3);
}

.zoom-reset {
  background: transparent;
  border: var(--border-soft);
  color: var(--color-text-dim);
  font-family: var(--font-mono);
  font-size: var(--font-xxs);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-2);
  cursor: pointer;
  letter-spacing: 0.3px;
  transition: color var(--transition-fast), border-color var(--transition-fast),
              background var(--transition-fast);
}

.zoom-reset:hover {
  border-color: var(--color-border-strong);
  color: var(--color-text-primary);
  background: var(--color-recessed);
}

.zoom-selection {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--color-zoom-selection);
  border-left: 1px solid var(--color-zoom-selection-border);
  border-right: 1px solid var(--color-zoom-selection-border);
  pointer-events: none;
  z-index: var(--z-zoom-selection);
}

.unified-timeline-scale-host {
  flex: 1;
  position: relative;
  height: 22px;
  cursor: ew-resize;
}

.unified-timeline-ruler .timeline-scale {
  flex: 1;
  position: relative;
  height: 22px;
  border-bottom: none;
  pointer-events: none;
}

.timeline-tick {
  position: absolute;
  top: 0;
  width: 1px;
  height: 100%;
  background: var(--color-border-soft);
}

.timeline-tick-label {
  position: absolute;
  top: 4px;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: var(--font-xxs);
  color: var(--color-text-mute);
  padding: 0 var(--space-1);
  background: var(--color-elevated);
}

.timeline-tick-label.first {
  transform: translateX(0);
}
.timeline-tick-label.last {
  transform: translateX(-100%);
}

/* Scrolling surface holds all lane groups and the scrubber overlay. The
 * horizontal axis is fixed: bars/marks that fall outside the current
 * viewport (e.g. when zoomed) get clipped by the lane-content overflow
 * rule below — never produce horizontal scroll. */
.unified-timeline-surface {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

/* Lane groups */
.lane-group {
  display: flex;
  flex-direction: column;
}

.lane-group-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--space-5);
  height: 18px;
  font-family: var(--font-mono);
  font-size: var(--font-xxs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--color-text-dim);
  background: var(--color-elevated);
  border-bottom: var(--border-soft);
  border-top: var(--border-soft);
  position: sticky;
  top: 0;
  z-index: 2;
}

.lane-group-count {
  color: var(--color-text-mute);
  font-weight: 400;
}

.lane-group-empty {
  height: 20px;
  display: flex;
  align-items: center;
  padding: 0 calc(var(--gutter-width) + var(--space-5));
  color: var(--color-text-mute);
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  font-style: italic;
}

/* Lane row: label gutter + content strip */
.lane-row {
  display: flex;
  height: 22px;
  align-items: center;
  border-bottom: var(--border-soft);
  cursor: pointer;
  flex-shrink: 0;
}

.lane-row:hover {
  background: var(--color-recessed);
}

.lane-row.pinned {
  background: color-mix(in srgb, var(--color-pinned) 8%, var(--color-elevated));
  outline: 1px solid var(--color-pinned);
  outline-offset: -1px;
}

.lane-label {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: var(--gutter-width);
  flex-shrink: 0;
  padding: 0 var(--space-4);
  border-right: var(--border-soft);
  white-space: nowrap;
  overflow: hidden;
  background: var(--color-surface);
  position: sticky;
  left: 0;
  z-index: 1;
}

.lane-method {
  color: var(--color-text-dim);
  font-family: var(--font-mono);
  font-size: var(--font-xxs);
  flex-shrink: 0;
}

.lane-url {
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.lane-content {
  flex: 1;
  position: relative;
  height: 100%;
  min-width: 0;
  /* Bars positioned at left<0% or right>100% (events outside the zoom
   * window) get clipped instead of bleeding into the gutter or the next
   * lane. */
  overflow: hidden;
}

/* Request duration bar (under chunk ticks) */
.request-bar {
  position: absolute;
  top: 4px;
  height: 14px;
  min-width: 2px;
  border-radius: var(--radius-1);
  pointer-events: none;
}

.request-bar-rsc  { background: color-mix(in srgb, var(--color-badge-rsc)  60%, var(--color-elevated)); }
.request-bar-html { background: color-mix(in srgb, var(--color-badge-html) 60%, var(--color-elevated)); }
.request-bar-act  { background: color-mix(in srgb, var(--color-badge-act)  60%, var(--color-elevated)); }

.request-bar-fast     { outline: 1px solid var(--color-fast); }
.request-bar-medium   { outline: 1px solid var(--color-medium); }
.request-bar-slow     { outline: 1px solid var(--color-slow); }
.request-bar-critical { outline: 1px solid var(--color-critical); }

/* FetchBar (server_fetch) — existing primitive; now sized for thin lanes */
.fetch-bar {
  position: absolute;
  top: 4px;
  height: 14px;
  min-width: 2px;
  border-radius: var(--radius-1);
  color: var(--color-text-inverse);
  font-family: var(--font-mono);
  font-size: var(--font-xxs);
  line-height: 14px;
  padding: 0 var(--space-2);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  pointer-events: none;
}

.fetch-bar-fast     { background: var(--color-fast); }
.fetch-bar-medium   { background: var(--color-medium); }
.fetch-bar-slow     { background: var(--color-slow); }
.fetch-bar-critical { background: var(--color-critical); }

/* Client lane primitives */
.client-marker {
  position: absolute;
  top: 9px;
  width: 6px;
  height: 6px;
  margin-left: -3px;
  border-radius: 50%;
  cursor: default;
}
.client-marker-nav   { background: var(--color-nav); }
.client-marker-paint { background: var(--color-perf-paint); }
.client-marker-fcp   { background: var(--color-perf-fcp); }
.client-marker-lcp   { background: var(--color-perf-lcp); }
.client-marker-other { background: var(--color-perf-other); }

.client-bar {
  position: absolute;
  top: 6px;
  height: 12px;
  min-width: 2px;
  border-radius: var(--radius-1);
  cursor: default;
}
.client-bar-longtask {
  background: var(--color-perf-longtask);
  opacity: 0.7;
}

/* Client-component bundles loaded by the browser. Distinct color from
 * fetches and longtasks because semantically these gate hydration, not
 * data. Script chunks vs CSS chunks get slightly different shading so
 * heavily-styled apps (MUI/Tailwind compiled CSS) are visually obvious. */
.client-bar-chunk {
  height: 4px;
  top: 9px;
  border-radius: var(--radius-1);
  opacity: 0.85;
}

.client-bar-chunk-script { background: var(--color-chunk-script); }
.client-bar-chunk-css    { background: var(--color-chunk-css); }

.client-fetch-bar {
  position: absolute;
  top: 6px;
  height: 12px;
  min-width: 2px;
  border-radius: var(--radius-1);
  border: 1px dashed var(--color-border-strong);
  background: color-mix(in srgb, var(--color-badge-fetch) 30%, var(--color-elevated));
  cursor: default;
}

/* Chunk tick (RSC chunk) */
.chunk-mark {
  position: absolute;
  top: 2px;
  width: 5px;
  height: 18px;
  margin-left: -2px;
  pointer-events: none;
}

.chunk-mark-dot {
  position: absolute;
  top: 0;
  left: 1px;
  width: 3px;
  height: 3px;
  border-radius: var(--radius-1);
  background: var(--color-badge-rsc);
}

.chunk-mark-line {
  position: absolute;
  top: 3px;
  left: 2px;
  width: 1px;
  height: 15px;
  background: color-mix(in srgb, var(--color-badge-rsc) 50%, transparent);
}

/* Scrubber overlay — visual only, so clicks pass through to lane rows */
.scrubber-overlay {
  position: absolute;
  top: 0;
  left: var(--gutter-width);
  right: 0;
  bottom: 0;
  z-index: var(--z-scrubber);
  pointer-events: none;
}

.scrubber {
  position: absolute;
  top: 0;
  width: 1px;
  height: 100%;
  background: var(--color-scrubber);
  pointer-events: none;
  transform: translateX(-0.5px);
}

.scrubber-handle {
  position: sticky;
  top: 2px;
  left: -3px;
  width: 7px;
  height: 7px;
  background: var(--color-scrubber);
  border-radius: var(--radius-2);
  display: block;
  margin-left: -3px;
}

.scrubber-label {
  position: sticky;
  top: 2px;
  left: 6px;
  font-family: var(--font-mono);
  font-size: var(--font-xxs);
  color: var(--color-text-inverse);
  background: var(--color-scrubber);
  padding: 1px var(--space-2);
  border-radius: var(--radius-1);
  white-space: nowrap;
  display: inline-block;
  margin-left: var(--space-3);
}
`;

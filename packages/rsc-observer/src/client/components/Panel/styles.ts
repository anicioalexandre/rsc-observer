export const css = `
.panel {
  position: fixed;
  /* top / left / width / height come from inline style — the panel
     persists position + size between sessions and the values are read
     synchronously on first render. */
  z-index: var(--z-panel);
  background: var(--color-surface);
  border: var(--border-strong);
  border-radius: var(--radius-0);
  box-shadow: var(--shadow-none);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: var(--panel-min-width);
  min-height: var(--panel-min-height);
  /* container query anchor — child rules below resolve against the panel
     width itself, not the viewport, so resizing the panel narrow flips
     the layout without a flash on first render. */
  container-type: inline-size;
  container-name: panel;
}

/* Default (narrow / compact) — only the title, "▾" trigger and "×"
   close are visible. Inline filters live behind the popover.
   Specificity here matches the container-query block below (0,1,0)
   so the later @container rules win when their condition matches.
   Container queries resolve at layout time, so no flash on reload. */
.panel-header-inline {
  display: none;
}
.panel-chrome-trigger {
  display: inline-flex;
}

/* Wide — show inline filters + view-mode + clear; hide the trigger.
   The popover never renders in wide mode (the chrome-open state
   auto-closes when the panel resizes wide; safety belt rule below). */
@container panel (min-width: 800px) {
  .panel-header-inline {
    display: flex;
  }
  .panel-chrome-trigger {
    display: none;
  }
  .panel-chrome-popover {
    display: none;
  }
}

/* Mobile fullscreen path takes precedence — keep the trigger visible
   regardless of container width since the inline group is too crowded
   for any phone-sized layout. */
.panel-mobile .panel-header-inline {
  display: none !important;
}
.panel-mobile .panel-chrome-trigger {
  display: inline-flex !important;
}

.panel-mobile {
  /* Forced fullscreen at <=639px — drag and resize handles are hidden
     by the React tree itself. The min sizes don't apply here because
     the inline style wins via 100vw / 100vh. */
  border: none;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding: var(--space-3) var(--space-5);
  background: var(--color-elevated);
  border-bottom: var(--border-strong);
  flex-shrink: 0;
  height: calc(var(--titlebar-height) + var(--space-3) * 2);
  cursor: grab;
  user-select: none;
}

.panel-header:active {
  cursor: grabbing;
}

.panel-mobile .panel-header,
.panel-maximized .panel-header {
  cursor: default;
}

.panel-maximized {
  border: none;
}

/* The maximize / restore glyph cell — same shape as panel-close so the
   "□ ×" pair reads as a single browser-window button group. */
.panel-maximize {
  font-family: var(--font-mono);
  font-size: var(--font-md);
  line-height: 1;
  padding: var(--space-1) var(--space-3);
  min-width: 22px;
  text-align: center;
}

/* Power button — same single-glyph cell. The active background tints
   pale red so the live state reads even without looking at the title-bar
   dot; the off state goes neutral. */
.panel-tracking {
  font-family: var(--font-mono);
  font-size: var(--font-md);
  line-height: 1;
  padding: var(--space-1) var(--space-3);
  min-width: 22px;
  text-align: center;
}

.panel-tracking.on {
  color: var(--color-rec);
}

.panel-tracking.off {
  color: var(--color-text-mute);
}

/* Hover when paused previews the "back to live" state — the icon shifts
   to the same red the active dot uses, hinting that clicking resumes
   tracking. The default .panel-action:hover rule changes color to
   text-primary; this rule overrides it for the off variant only. */
.panel-tracking.off:hover {
  color: var(--color-rec);
}

/* Title + recording-status pip live together at the start of the title
   bar. Stops the dot from drifting if a future change adds elements
   between them. */
.panel-title-group {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.panel-title {
  font-family: var(--font-mono);
  font-size: var(--font-base);
  font-weight: 600;
  letter-spacing: 0.3px;
  color: var(--color-text-primary);
  flex-shrink: 0;
}

.panel-header-spacer {
  flex: 1;
  min-width: 0;
}

/* Wide-mode title bar: filters + view-mode + clear live inline. The
   inline group occupies the middle of the title bar, between the
   "rsc-observer" title and the always-visible header actions.
   Display is controlled by the container-query block at the top — this
   rule must NOT set the display property, or it would win over both
   the narrow default and the wide-mode @container override (same
   specificity, later in source). */
.panel-header-inline {
  align-items: center;
  gap: var(--space-3);
  flex: 1;
  min-width: 0;
}

.panel-header-actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-shrink: 0;
  position: relative;
  /* margin-left: auto pins the actions to the right edge of the title
     bar in BOTH modes — when the inline group is hidden (compact) the
     auto margin eats the empty space; when the inline group is visible
     (wide), it has flex:1 and naturally pushes us right anyway. */
  margin-left: auto;
}

.panel-chrome-trigger {
  font-family: var(--font-mono);
  font-size: var(--font-md);
  line-height: 1;
  padding: var(--space-1) var(--space-3);
  min-width: 22px;
  text-align: center;
}

.panel-chrome-trigger.open {
  background: var(--color-recessed);
  border-color: var(--color-border-strong);
  color: var(--color-text-primary);
}

/* The chrome popover is anchored to the title bar; absolute positioning
   from the title bar's right edge keeps it visually attached to the V
   button while the title bar handles drag. */
.panel-chrome-popover {
  position: absolute;
  top: calc(100% + var(--space-2));
  right: var(--space-3);
  width: 240px;
  background: var(--color-elevated);
  border: var(--border-strong);
  border-radius: var(--radius-0);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  z-index: var(--z-popover);
  cursor: default;
}

.panel-chrome-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.panel-chrome-label {
  font-family: var(--font-mono);
  font-size: var(--font-xxs);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--color-text-mute);
  font-weight: 700;
}

.panel-chrome-divider {
  height: 1px;
  background: var(--color-border-soft);
  margin: 0;
}

.panel-chrome-actions {
  gap: var(--space-2);
}

.panel-chrome-action {
  text-align: left;
  width: 100%;
  padding: var(--space-2) var(--space-4);
  border: var(--border-soft);
}

/* Inside the popover the view-mode toggle should fill its row. */
.panel-chrome-popover .view-mode-toggle {
  width: 100%;
  margin-right: 0;
}

.panel-chrome-popover .view-mode-btn {
  flex: 1;
  text-align: center;
}

.panel-action {
  background: transparent;
  border: 1px solid transparent;
  color: var(--color-text-dim);
  font-family: var(--font-mono);
  font-size: var(--font-sm);
  cursor: pointer;
  padding: var(--space-1) var(--space-4);
  border-radius: var(--radius-2);
  letter-spacing: 0.3px;
  transition: color var(--transition-fast), border-color var(--transition-fast),
              background var(--transition-fast);
}

.panel-action:hover {
  color: var(--color-text-primary);
  border-color: var(--color-border-strong);
  background: var(--color-recessed);
}

/* The "×" close lives in the title bar — single-glyph cell sized to read
   as a button rather than a stray character. */
.panel-close {
  font-family: var(--font-mono);
  font-size: var(--font-md);
  line-height: 1;
  padding: var(--space-1) var(--space-3);
  min-width: 22px;
  text-align: center;
}

.panel-close:hover {
  background: var(--color-danger);
  color: var(--color-text-inverse);
  border-color: var(--color-danger);
}

/*
 * Two stacked regions: timeline takes a fixed-feeling chunk, preview soaks up
 * the rest. Pinning the timeline ratio (~38%) keeps the preview area roughly
 * 5/8 of the panel — enough to see real page content without it feeling
 * cramped. Details renders as a floating popover (see .details-popover) so
 * hovering events doesn't steal vertical space from the preview.
 */
.panel-region {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* The timeline gets a fixed strip — clamp keeps it readable in tall
   panels (cap 280px) while still feeling proportional in small ones
   (floor 160px, target 30%). Anything taller scrolls vertically inside
   the surface, so the preview region always has room. */
.panel-region-timeline {
  flex: 0 0 clamp(160px, 30%, 280px);
  min-height: 0;
  border-bottom: var(--border-strong);
}

/* Preview soaks up all remaining space. min-height: 0 lets it shrink
   below its content (the inner aside scrolls). */
.panel-region-preview {
  flex: 1 1 auto;
  min-height: 0;
}

.panel-region-label {
  padding: var(--space-2) var(--space-5);
  background: var(--color-elevated);
  color: var(--color-text-dim);
  font-family: var(--font-mono);
  font-size: var(--font-xxs);
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  border-bottom: var(--border-soft);
  flex-shrink: 0;
}

.panel-region-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

/* Floating details popover. Sized as a fraction of the panel on wide
   layouts; on mobile / very compact panels it drops to the bottom edge
   as a sheet so it doesn't cover the preview. */
.details-popover {
  position: absolute;
  right: var(--space-5);
  bottom: var(--space-5);
  width: clamp(280px, 36%, 420px);
  max-width: calc(100% - var(--space-7));
  max-height: 60%;
  background: var(--color-elevated);
  border: var(--border-strong);
  border-radius: var(--radius-0);
  box-shadow: var(--shadow-none);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
  font-family: var(--font-mono);
  font-size: var(--font-sm);
  line-height: var(--line-normal);
  z-index: var(--z-popover);
}

/* Mobile / fullscreen panel: details are a bottom sheet spanning the
   full panel width. Half the height max so the preview underneath
   stays browsable. */
.panel-mobile .details-popover {
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 100%;
  max-height: 50%;
  border-left: none;
  border-right: none;
  border-bottom: none;
}

.details-popover.pinned {
  border-color: var(--color-pinned);
  border-width: 1px;
  outline: 1px solid var(--color-pinned);
  outline-offset: -2px;
}

.details-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-5);
  background: var(--color-recessed);
  border-bottom: var(--border-soft);
  flex-shrink: 0;
}

.details-popover-title {
  color: var(--color-text-dim);
  font-family: var(--font-mono);
  font-size: var(--font-xxs);
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}

.details-popover-pinned {
  color: var(--color-text-primary);
  margin-left: var(--space-3);
}

.details-popover-pinned .dim {
  margin-left: var(--space-2);
  letter-spacing: 0.4px;
  text-transform: none;
  font-weight: 400;
}

.details-popover-close {
  font-family: var(--font-mono);
  font-size: var(--font-md);
  padding: 0 var(--space-3);
  line-height: 1;
}

.details-popover-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: var(--space-4) var(--space-5);
}

.view-mode-toggle {
  display: inline-flex;
  border: var(--border-soft);
  border-radius: var(--radius-2);
  overflow: hidden;
  margin-right: var(--space-2);
}

.view-mode-btn {
  background: transparent;
  border: 0;
  border-right: var(--border-soft);
  color: var(--color-text-dim);
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  padding: var(--space-1) var(--space-3);
  cursor: pointer;
  letter-spacing: 0.3px;
  transition: color var(--transition-fast), background var(--transition-fast);
}

.view-mode-btn:last-child {
  border-right: 0;
}

.view-mode-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-recessed);
}

.view-mode-btn.active {
  background: var(--color-accent);
  color: var(--color-text-inverse);
}

/* ─── Resize handles ─────────────────────────────────────────────────
   Eight invisible-by-default catchers around the panel border. Edges are
   thin strips, corners are 10×10 squares overlapping the edges so a
   clumsy grab still hits something. Cursors expose intent on hover. */

.panel-resize {
  position: absolute;
  z-index: var(--z-resize-handle);
  background: transparent;
}

.panel-resize-n,
.panel-resize-s {
  left: 0;
  right: 0;
  height: var(--resize-handle-thickness);
  cursor: ns-resize;
}

.panel-resize-n {
  top: calc(var(--resize-handle-thickness) * -0.5);
}

.panel-resize-s {
  bottom: calc(var(--resize-handle-thickness) * -0.5);
}

.panel-resize-e,
.panel-resize-w {
  top: 0;
  bottom: 0;
  width: var(--resize-handle-thickness);
  cursor: ew-resize;
}

.panel-resize-e {
  right: calc(var(--resize-handle-thickness) * -0.5);
}

.panel-resize-w {
  left: calc(var(--resize-handle-thickness) * -0.5);
}

.panel-resize-nw,
.panel-resize-se {
  width: calc(var(--resize-handle-thickness) * 1.8);
  height: calc(var(--resize-handle-thickness) * 1.8);
  cursor: nwse-resize;
  z-index: calc(var(--z-resize-handle) + 1);
}

.panel-resize-ne,
.panel-resize-sw {
  width: calc(var(--resize-handle-thickness) * 1.8);
  height: calc(var(--resize-handle-thickness) * 1.8);
  cursor: nesw-resize;
  z-index: calc(var(--z-resize-handle) + 1);
}

.panel-resize-nw {
  top: calc(var(--resize-handle-thickness) * -0.5);
  left: calc(var(--resize-handle-thickness) * -0.5);
}

.panel-resize-ne {
  top: calc(var(--resize-handle-thickness) * -0.5);
  right: calc(var(--resize-handle-thickness) * -0.5);
}

.panel-resize-sw {
  bottom: calc(var(--resize-handle-thickness) * -0.5);
  left: calc(var(--resize-handle-thickness) * -0.5);
}

.panel-resize-se {
  bottom: calc(var(--resize-handle-thickness) * -0.5);
  right: calc(var(--resize-handle-thickness) * -0.5);
}
`;

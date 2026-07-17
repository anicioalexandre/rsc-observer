// Design tokens — single source of truth for the overlay's visual language.
//
// All variables are scoped to `:host` so they live inside the closed shadow
// root, alongside every component style. Phase 5 will additionally export
// the same palette under a light-DOM selector for the SSR toggle button.
//
// Palette: Mono off-white. Cream surface, ink-black accents, mono fonts
// everywhere, 0px radius on containers, 1–2px on inputs, no shadows.

export const css = `
:host {
  /* ─── Colour ──────────────────────────────────────────────────────── */

  --color-surface: #fafaf7;
  --color-elevated: #ffffff;
  --color-recessed: #f1f1ec;

  --color-border-strong: #18181b;
  --color-border-soft: #d4d4d8;

  --color-text-primary: #18181b;
  --color-text-dim: #52525b;
  --color-text-mute: #71717a;
  --color-text-inverse: #fafaf7;

  --color-accent: #18181b;
  --color-accent-hover: #2a2a2e;
  --color-link: #1f3aa6;
  --color-focus-ring: #18181b;

  --color-success: #15803d;
  --color-warn: #a16207;
  --color-danger: #b91c1c;
  /* "Live recording" red — slightly brighter than danger so it reads as
     a status pulse, not an error. Used by the RecordingDot when tracking
     is active. */
  --color-rec: #dc2626;

  /* Per-kind badge colours (request lane). Picked for readable contrast on
     the cream surface — darker / more saturated than the dark-theme
     originals, but still recognisably the same hue family. */
  --color-badge-rsc: #075985;        /* deep cyan/blue — RSC */
  --color-badge-html: #166534;       /* deep green — HTML */
  --color-badge-act: #92400e;        /* burnt amber — server action */
  --color-badge-fetch: #1e3a8a;      /* indigo — DATA FETCH */

  /* Per-duration band (used by request-bar, fetch-bar, fetch-chip). */
  --color-fast: #15803d;
  --color-medium: #a16207;
  --color-slow: #c2410c;
  --color-critical: #b91c1c;

  /* Per-client-perf marker. */
  --color-perf-paint: #6d28d9;       /* paint dot */
  --color-perf-fcp: #1d4ed8;         /* FCP */
  --color-perf-lcp: #047857;         /* LCP */
  --color-perf-other: #71717a;
  --color-perf-longtask: #b91c1c;

  --color-nav: #6d28d9;              /* NAV marker */

  --color-chunk-script: #1e3a8a;
  --color-chunk-css: #6d28d9;

  /* Suspense fieldsets. */
  --color-suspense-pending: #a16207;
  --color-suspense-resolved: #15803d;

  /* Highlights / overlays. */
  --color-zoom-selection: rgba(24, 24, 27, 0.10);
  --color-zoom-selection-border: #18181b;
  --color-scrubber: #18181b;
  --color-pinned: #18181b;

  /* ─── Spacing ─────────────────────────────────────────────────────── */

  --space-1: 2px;
  --space-2: 4px;
  --space-3: 6px;
  --space-4: 8px;
  --space-5: 12px;
  --space-6: 16px;
  --space-7: 24px;
  --space-8: 32px;

  /* ─── Radius (kept tiny by design) ────────────────────────────────── */

  --radius-0: 0px;
  --radius-1: 1px;
  --radius-2: 2px;

  /* ─── Typography ──────────────────────────────────────────────────── */

  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono",
               monospace;

  --font-min: 8px;
  --font-xxs: 9px;
  --font-xs: 10px;
  --font-sm: 11px;
  --font-base: 12px;
  --font-md: 13px;
  --font-lg: 14px;
  --font-xl: 16px;

  --line-snug: 1.25;
  --line-normal: 1.4;
  --line-loose: 1.6;

  /* ─── Borders (preset combinations) ───────────────────────────────── */

  --border-soft: 1px solid var(--color-border-soft);
  --border-strong: 1px solid var(--color-border-strong);
  --border-dashed-soft: 1px dashed var(--color-border-soft);

  /* ─── Shadows (kept for symmetry — the design uses 1px borders to
        carry the role of "elevated") ────────────────────────────────── */

  --shadow-none: none;

  /* ─── Z-index stack ───────────────────────────────────────────────── */

  /* Panel sits ABOVE the corner toggle — when both are present the open
     panel should cover the toggle button rather than sit below it. */
  --z-panel: 2147483647;
  --z-popover: 2147483646;
  --z-resize-handle: 2147483645;
  --z-toggle: 2147483644;
  --z-zoom-selection: 4;
  --z-scrubber: 3;

  /* ─── Sizing ──────────────────────────────────────────────────────── */

  --panel-default-width: 880px;
  --panel-default-height: 640px;
  /* Minimum sizes match the iPhone SE viewport — the smallest screen the
     panel must remain functional on. Below this, useFullscreenOnMobile
     forces the panel to 100vw/100vh so usability isn't sacrificed. */
  --panel-min-width: 375px;
  --panel-min-height: 667px;
  --panel-margin: 16px;
  --panel-mobile-breakpoint-w: 640px;
  --panel-mobile-breakpoint-h: 700px;

  --gutter-width: 170px;
  --toggle-height: 28px;
  --resize-handle-thickness: 6px;
  --titlebar-height: 28px;

  /* ─── Motion ──────────────────────────────────────────────────────── */

  --transition-fast: 75ms ease-out;
  --transition-base: 120ms ease-out;
  --rec-pulse-duration: 2s;
}
`;

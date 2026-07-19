// Design tokens — single source of truth for the overlay's visual language.
//
// All variables are scoped to `:host` so they live inside the closed shadow
// root, alongside every component style.
//
// Palette: paper & ink with amber chrome. Warm paper surfaces, hard ink
// borders, a single amber accent for chrome/interaction (title bar, active
// chips, pinned, scrubber), hard offset shadows, 0px radius everywhere,
// mono fonts everywhere. Data colours (badges, durations, perf, chunks)
// stay multi-hue but are warm-tuned to sit on paper.
//
// Dark-ready: the Colour section is the only theme-dependent block. A dark
// theme lands later as a second :host block (inside a media query or a
// host attribute selector) that overrides ONLY the Colour section.

export const css = `
:host {
  /* ─── Colour ──────────────────────────────────────────────────────── */

  /* Surfaces — warm paper. */
  --color-surface: #f5f4ec;
  --color-elevated: #fbfaf3;
  --color-recessed: #e7e5d9;

  --color-border-strong: #151515;
  --color-border-soft: #c8c5b8;

  /* Text — warm ink. */
  --color-text-primary: #151515;
  --color-text-dim: #5d5a50;
  --color-text-mute: #9b978a;
  /* Light text for dark/saturated fills (danger hover, duration bars,
     scrubber label). NOT for accent fills — amber needs ink text; use
     --color-on-accent there. */
  --color-text-inverse: #f5f4ec;

  /* Accent — amber. Owns chrome/interaction only: title bar, active
     chips, pinned, scrubber, selection. Never used for data encoding. */
  --color-accent: #fca311;
  --color-accent-hover: #ffc764;
  --color-accent-overlay: #ffe6b3;
  --color-on-accent: #151515;
  /* Text-safe amber — dark enough to read on paper. Links, scrubber,
     pinned outlines. */
  --color-link: #8a5407;
  --color-focus-ring: #151515;

  --color-success: #4c7a34;
  --color-warn: #96660a;
  --color-danger: #a32c21;
  /* "Live recording" red — slightly brighter than danger so it reads as
     a status pulse, not an error. Used by the RecordingDot when tracking
     is active. */
  --color-rec: #e0432d;

  /* Per-kind badge colours (request lane). Same hue families as before,
     warm-tuned for the paper surface — earthier, a touch desaturated. */
  --color-badge-rsc: #1d5f73;        /* petrol blue — RSC */
  --color-badge-html: #2e6b34;       /* forest green — HTML */
  --color-badge-act: #8c4a10;        /* saddle brown — server action */
  --color-badge-fetch: #3a4e86;      /* indigo slate — DATA FETCH */

  /* Per-duration band (used by request-bar, fetch-bar, fetch-chip). */
  --color-fast: #4c7a34;
  --color-medium: #96660a;
  --color-slow: #b24a16;
  --color-critical: #a32c21;

  /* Per-client-perf marker. */
  --color-perf-paint: #6e4196;       /* plum — paint dot */
  --color-perf-fcp: #35509e;         /* FCP */
  --color-perf-lcp: #1f6e5b;         /* LCP */
  --color-perf-other: #85816f;
  --color-perf-longtask: #a32c21;

  --color-nav: #6e4196;              /* NAV marker */

  --color-chunk-script: #3a4e86;
  --color-chunk-css: #6e4196;

  /* Suspense fieldsets. */
  --color-suspense-pending: #96660a;
  --color-suspense-resolved: #4c7a34;

  /* Highlights / overlays — amber interaction states. The scrubber line
     and pinned outlines use text-safe amber for contrast; bright amber
     is reserved for fills. */
  --color-zoom-selection: rgba(252, 163, 17, 0.16);
  --color-zoom-selection-border: #fca311;
  --color-scrubber: #8a5407;
  --color-pinned: #8a5407;

  /* Win98 bevel set (raised/sunken chrome — close button, sunken input). */
  --bevel-face: #dfdccf;
  --bevel-light: #ffffff;
  --bevel-dark: #8a867a;
  --bevel-darker: #151515;

  /* ─── Spacing ─────────────────────────────────────────────────────── */

  --space-1: 2px;
  --space-2: 4px;
  --space-3: 6px;
  --space-4: 8px;
  --space-5: 12px;
  --space-6: 16px;
  --space-7: 24px;
  --space-8: 32px;

  /* ─── Radius (square by design — rounded-none everywhere) ─────────── */

  /* radius-1/-2 kept as tokens so component CSS stays stable, but the
     paper-and-ink system is hard-cornered: all three resolve to 0. */
  --radius-0: 0px;
  --radius-1: 0px;
  --radius-2: 0px;

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

  /* ─── Shadows — hard offset, no blur ──────────────────────────────── */

  --color-shadow-hard: #151515;
  --shadow-none: none;
  /* Window-scale surfaces (panel, popovers). */
  --shadow-retro: 4px 4px 0 0 var(--color-shadow-hard);
  /* Control-scale surfaces (keys, chips, toggle). */
  --shadow-retro-sm: 2px 2px 0 0 var(--color-shadow-hard);

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

  /* ─── Motion — paper eases, chrome snaps ──────────────────────────── */

  --transition-fast: 75ms ease-out;
  --transition-base: 150ms ease-out;
  --rec-pulse-duration: 2s;
}
`;

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

`rsc-observer` is a dev-time devtool for **React Server Components in Next.js
App Router**. The published artifact is one npm package; this monorepo bundles
the package, a demo Next.js app that exercises every capture path, and a
Playwright catalogue that doubles as the feature spec.

```
packages/rsc-observer  ← the published package (instrumentation + overlay UI)
apps/demo-next         ← demo app, links rsc-observer via `workspace:*`
apps/e2e               ← Playwright suite that drives demo-next
```

`pnpm@9` + `turbo`. `apps/*` and `packages/*` are workspaces.

## Commands

```bash
# bootstrap once
pnpm install

# typecheck everything (turbo cached)
pnpm check-types

# rebuild the package — run this whenever you touch src/client/** or
# src/server/**. The demo's dev server reads dist/client.iife.js into
# memory ON FIRST HIT and caches forever, so after a rebuild you must
# also bounce the dev server for new bundles to ship.
pnpm --filter rsc-observer build

# start the demo on :3000 (Next.js dev mode)
pnpm --filter demo-next dev

# Playwright (auto-starts a build+dev pair via the playwright.config webServer)
pnpm --filter e2e exec playwright test                            # full suite
pnpm --filter e2e exec playwright test 04-timeline-server         # single spec file
pnpm --filter e2e exec playwright test --grep "#04\\.6"           # single test by tag
pnpm --filter e2e exec playwright test --headed                   # see the browser
pnpm --filter e2e exec playwright test --ui                       # Playwright UI
CI=true pnpm --filter e2e exec playwright test                    # serial mode (workers=1, fresh dev server)

# format
pnpm format
```

## Architecture

Two halves talking over a WebSocket. Wire format = `Event` discriminated
union in `packages/rsc-observer/src/shared/protocol.ts`. **The protocol is
the contract** — event kinds are additive; renaming or removing required
fields breaks WS replay across browser tabs that opened before the change.

### Server side (Node, lives in the user's `next dev` process)

Entry: `src/server/instrument.ts`. The user's `instrumentation.ts` does
`export { register } from "rsc-observer/instrumentation"`. That `register`
(`src/server/register.ts`) lazily imports `instrument-server` in the Node.js
runtime, which calls `registerServerInstrumentation()`. Keeping the Node code
behind a runtime-guarded dynamic import is what makes the one-line re-export
safe to evaluate in the Edge runtime too.
Gated by `src/server/dev-gate.ts` — on by default under `next dev`, a hard
no-op when `NODE_ENV=production` or `RSC_OBSERVER` is set to
`0`/`off`/`false`/`no`.

Three things install on activate:

1. `src/server/capture/async-context.ts` patches `http.Server.prototype.emit`.
   On every `request` event it spins up an `AsyncLocalStorage` request
   context, emits `request_start`, wraps `res.write`/`res.end` to (a) capture
   chunks for observability, (b) thread the response through `HtmlInjector`
   (Phase-5 SSR shell — splices a pre-paint toggle button before `</body>`),
   and (c) scan inline `<script>self.__next_f.push(...)</script>` blocks in
   text/html responses, mirroring those into a synthetic `inline-html-*`
   request so suspense progression is preserved across hard reloads.
   `tryServeStatic` short-circuits the `/rsc-observer/client.js` route here
   before any capture machinery runs.
2. `src/server/capture/fetch-wrap.ts` patches `globalThis.fetch`. Inside
   the active ALS request context, every fetch emits `server_fetch` with
   `captureOwnerStack()` (React 19) for owner-component attribution.
3. `src/server/transport/ws-server.ts` registers a noServer `WebSocketServer`
   that the patched `emit` upgrades when the URL is `/rsc-observer/ingest`.
   Holds a 4096-event ring buffer; new clients pass
   `?since=<performance.timeOrigin>` and the server replays everything ≥
   `since − 100ms` (the small backward buffer compensates for clock skew
   between Node and the browser, which otherwise drops the very first
   `request_start` event on fast routes like `/baseline`).

### Client side (the IIFE bundle, served at `/rsc-observer/client.js`)

Loader (`src/client/loader.ts`) is what the user's
`instrumentation-client.ts` imports. It synchronously injects
`<script src="/rsc-observer/client.js">` into `<head>` — `defer:false`,
`async:false`, deliberate, so the MutationObserver in
`capture/next-flight.ts` catches `__next_f.push` script insertions before
Next's runtime drains them.

The IIFE entry (`src/client/entry.ts`):

- defines the `<rsc-observer-overlay>` custom element
- removes the SSR-shell button (`#rsc-observer-ssr-toggle`) once the
  custom element upgrades
- mounts a closed shadow root and renders `<App>` (React 19)
- starts the WS ingest loop via `client/ingest/ws-client.ts`

The closed shadow root is intentional — host-page CSS can't bleed in,
overlay CSS can't leak out. **Tests work around this** with an
`addInitScript` in `apps/e2e/tests/_fixtures.ts` that monkey-patches
`Element.prototype.attachShadow` to force `mode: "open"` for the test
process only.

### Store + UI

`src/client/store/events.ts` is the only mutator. `ingestEvent(e)` switches
on `e.kind` and updates `state` (a Map of requestId → Request, plus arrays
for client-side captures). It uses `useSyncExternalStore` (`useStoreVersion`).
**Every handler is idempotent** — WS replay re-sends the backlog, so adding
a new event kind requires the same dedup discipline (chunks by `index`,
fetches by `id`, server-actions by `(name, start)`).

Components under `src/client/components/`:

- `App` — toggle button + panel mount
- `Panel` — window-style chrome (drag · resize · compact-mode chrome menu),
  hosts UnifiedTimeline + TreePreview + DetailsPane
- `UnifiedTimeline` — three lane groups (SERVER / DATA FETCH / CLIENT),
  shared time axis, scrubber, zoom-drag, filter bar
- `TreePreview` — renders the active RSC tree at the current scrubber
  position; "visual" mode mounts the tree into an inner closed shadow root
  with host-page CSS adopted
- `DetailsPane` — popover wired to the hovered/pinned `EventRef`

`src/client/components/UnifiedTimeline/utils.ts` has the dedup logic worth
internalising:

- `dedupRequests` hides synthetic client peers (`inline-/…`,
  `client-rsc-…`) when an authoritative server RSC for the same canonical
  URL exists. Canonical URL strips `?_rsc=…`.
- `isSelfBounceRequest` hides top-level HTTP requests that match a parent
  request's `server_fetch` within 100 ms (otherwise a Server Component
  fetching its own host shows up twice — once on SERVER, once on DATA FETCH).

### Build pipeline (`packages/rsc-observer/tsdown.config.ts`)

Three concurrent builds:

1. Node entries (`instrument-server`, `instrumentation` — the `register`
   re-export, `cli`) — ESM + CJS.
2. Browser loader (`instrument-client`, just injects the script tag) — ESM + CJS.
3. Overlay IIFE (`client.iife.js`) — minified, `noExternal: [/.*/]`,
   defines `process.env.NODE_ENV` as `"production"` (so React's prod build
   is used inside the bundle even though the dev server is in dev mode).

The IIFE is **not** loaded as a module by the user's app — it's served as a
static asset by `src/server/transport/static-serve.ts`, which reads it from
`dist/client.iife.js` once and caches in memory. Bundle changes require a
rebuild AND a dev-server restart to surface.

## Design system

`src/client/styles/tokens.ts` is the single source of truth — colour,
spacing, radius, font, z-index, motion. The palette is a "mono off-white"
scheme: cream surface, ink-black text + accent, `ui-monospace` everywhere,
0px radius on containers (1–2px on inputs), no shadows. Component CSS
modules consume `var(--token)` exclusively — no hex literals in
`components/**/styles.ts`.

The panel is responsive via **CSS container queries**, not React state.
`.panel { container-type: inline-size; container-name: panel; }` and a
`@container panel (min-width: 800px)` block decides whether the inline
filter group or the `▾` chrome popover shows. Default rules and the
container-query overrides MUST keep matching specificity (both bare
`.classname`) — adding `.panel .classname` to the default raises specificity
and silently disables the wide-mode override.

## E2E suite

Specs in `apps/e2e/tests/` are numbered (`00-smoke` … `17-chrome`); each
test is tagged `[#NN.M]` so failures map back to the master inventory.
Class-name selectors (`.panel`, `.lane-row`, `.badge-rsc`, `.fetch-bar`,
`.tree-fieldset`, …) are the **public test contract** — rename freely but
update `tests/_helpers/{overlay,timeline,store}.ts` in lockstep.

`playwright.config.ts` auto-starts the dev server with
`pnpm --filter rsc-observer build && pnpm --filter demo-next dev`. Local
runs use `workers: 2` + `retries: 2`; CI uses `workers: 1` (the dev server
gets stressed by parallel routes — DATA FETCH lane assertions flake when
many specs hit `/waterfall`/`/mui` simultaneously).

`.mcp.json` at the repo root wires Playwright MCP for interactive test
authoring (Zed Agent Panel and Claude Code both pick it up). The runtime
test runner stays plain `pnpm exec playwright test`.

## Things to know that aren't obvious from the code

- **Don't add backticks inside CSS template-literal comments** in
  `src/client/components/**/styles.ts` — the CSS lives inside a
  JS-template-string and a stray backtick will close the literal and break
  the build with a misleading "expected semicolon" error.
- **The IIFE static cache means CSS-only changes don't hot-reload.** The
  user's dev server caches `client.iife.js` in memory on first hit. After
  rebuilding, you must restart the dev server to surface bundle changes.
- **The dev gate is on by default in dev.** Instrumentation activates
  automatically under `next dev` and no-ops when `NODE_ENV=production`. If the
  toggle never appears, confirm you're not in a `next start`/production build
  and that `RSC_OBSERVER` isn't set to `0`/`off`/`false`/`no`. (There is no
  longer a marker file — the old `.rsc-observer` opt-in was removed.)
- **Server-action arg/result preview is intentionally empty.** Capturing
  request bodies without disturbing Next's async-iterator body reader is
  fragile; we ship lane + name + timing only. See `wrapResponse` in
  `async-context.ts`.
- **Request `r.url` can briefly be empty** when a `request_end` event
  arrives but the matching `request_start` was dropped (a clock-drift
  race the WS cutoff buffer mostly fixes but doesn't eliminate). UI code
  shows `(unknown)` in the lane label and tests handle this with
  duration-class / badge-class filters instead of URL substrings.

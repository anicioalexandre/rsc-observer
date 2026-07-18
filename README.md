# rsc-observer

`rsc-observer` is a devtool for **React Server Components** in the Next.js App
Router. Server Components render on the server and stream to the browser, so most
of what they do — when each one rendered, how its payload streamed in, which
`fetch()` a given component issued, when a Suspense boundary resolved — never
shows up in the browser's own devtools. Running inside `next dev`, it records all
of that — plus the client-side view of navigations, paint/LCP, and chunk
arrivals — and lays everything on one shared time axis, so the server and the
browser line up side by side. From there you can
trace a slow waterfall back to the fetch that caused it, watch how a page streams
in, and scrub to any moment to see the component tree exactly as it was then.

```
┌────────────────────────────────────────────────────────────────────┐
│ rsc-observer                                         clear   □   × │
│ RSC   HTML   Actions   Fetches   Client         [ filter by URL… ] │
├────────────────────────────────────────────────────────────────────┤
│ SERVER · 3                                                         │
│   [HTML] /              ░░░░░ · ·                                  │
│   [RSC]  /waterfall       ░░░░░░░░░░ · · · ·                       │
│   [ACT]  /actions                   ▆                              │
│ DATA FETCH · 2                                                     │
│   GET /api/delay?step=1  ════════                                  │
│   GET /api/delay?step=2         ═════                              │
│ CLIENT · 3                                                         │
│   NAV /  ●    PERF LCP  ●    CHUNKS · · ·  · ·                     │
│   ───────────────────────▲──────────────  scrubber                 │
├────────────────────────────────────────────────────────────────────┤
│ PREVIEW · tree at the scrubbed instant         visual · structural │
│   <RootLayout>                        ┌─ DETAILS ────────────────┐ │
│     <Page>                            │ GET /api/delay?step=1    │ │
│       <Suspense> … pending            │ 312 ms · 200 · 1.2 KB    │ │
│         <ProductGrid>                 │ owner <ProductGrid>      │ │
│           <Card> <Card> <Card>        └──────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
     drag the scrubber → the PREVIEW rebuilds the tree at that moment
```

## What it captures

Three lane groups, one time axis:

- **SERVER** — every HTTP request your app handles, tagged `RSC`, `HTML`, or
  `ACT` (server action). RSC responses show a tick for each payload chunk as the
  server flushes it, so you can see streaming progress.
- **DATA FETCH** — every `fetch()` made from inside a Server Component, drawn as
  a timed bar and — on React 19, where `captureOwnerStack` is available —
  labelled with the owner component that issued it.
- **CLIENT** — navigations (`pushState` / `replaceState` / back-forward), paint
  and LCP, long tasks, browser-side `fetch()`s, and the arrival timing of RSC
  chunks as the browser streams them in.

The **PREVIEW** pane renders that reconstructed tree two ways — as real DOM with
your app's own CSS (**visual**), or as a labelled node tree (**structural**).
Hover or pin any timeline row to open the **DETAILS** pane with its timing and
status, plus the owning component for fetches (press <kbd>Esc</kbd> to unpin).

## Install

```bash
npm i -D rsc-observer
npx rsc-observer init
```

`init` is idempotent — safe to re-run after upgrades. It creates (or appends to)
two one-line Next.js convention files:

- `instrumentation.ts` — `export { register } from "rsc-observer/instrumentation"`
  (server-side capture)
- `instrumentation-client.ts` — `import "rsc-observer/instrument-client"`
  (browser-side capture)

That's the whole setup — no `middleware.ts`, no marker file, no `next.config`
changes. Instrumentation turns on automatically under `next dev` and is a hard
no-op in production (`NODE_ENV=production`). Opt out in dev any time with
`RSC_OBSERVER=0`.

Restart your dev server, then open the app. A small toggle appears bottom-right —
click it, or press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>O</kbd> /
<kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>O</kbd>, to open the panel.

## Try it in one minute

1. **Hard-refresh your home page.** The SERVER lane shows `/` as one or two bars
   (an HTML route and/or its RSC payload, depending on Next's behaviour). Hover a
   bar to populate the DETAILS pane.

2. **Click around.** Each soft navigation fires a `?_rsc=…` request that the
   overlay tees as it streams; chunk-arrival ticks appear on the CLIENT lane,
   lining up under the server-emit ticks above.

3. **Trigger a render that fetches.** The DATA FETCH lane draws each server-side
   `fetch()` as a bar, labelled with its owner Server Component when React
   exposes it.

4. **Drag the scrubber.** The PREVIEW pane shows the tree at that exact moment —
   handy for watching what the user saw mid-stream, just before a Suspense
   boundary resolved.

5. **Filter.** Toggle the **RSC**, **HTML**, **Actions**, **Fetches**, or
   **Client** chips to hide a category, or type a substring into the URL filter.

## How it stays out of the way

- **The overlay renders in a closed shadow root.** Host-page CSS can't reach in,
  and the overlay's CSS can't leak out.
- **Everything is same-origin.** The bundle is served by your own dev server at
  `/rsc-observer/client.js`, and events arrive over a WebSocket to the same host.
  Nothing is sent to a third party.
- **Capture is in-memory and dev-only.** Events live in the browser tab — no disk
  writes, no storage quota. Because the overlay usually loads after your page has
  already begun streaming, the dev server replays the events it missed from a
  small in-process buffer, so the timeline is complete from the very first
  request — even after a hard refresh. **clear** empties it; restarting the dev
  server drops the buffer.
- **It's off in production.** Instrumentation no-ops under
  `NODE_ENV=production`, so nothing is patched or served in a prod build.

## Troubleshooting

**The toggle doesn't appear.** Restart the dev server after `init` — the client
bundle is read into memory once and cached — and confirm `instrumentation-client.ts`
imports `rsc-observer/instrument-client`.

**No `[rsc-observer] server instrumentation active` log.** You're either in a
production build (`NODE_ENV=production`) or `RSC_OBSERVER` is set to a disabling
value (`0` / `off` / `false` / `no`). Confirm `instrumentation.ts` re-exports
`register` from `rsc-observer/instrumentation`.

**PREVIEW says "No RSC render active" or "Parser found no Flight-format rows".**
The first means nothing was captured at the scrubbed instant — drag the scrubber
onto a bar. The second means the payload wasn't Flight-decodable, usually an
unfamiliar content-type or encoding.

## License

MIT.

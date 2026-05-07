# rsc-observer

Dev-time observability for **React Server Components** in Next.js App Router.
A single npm package — drops a debug overlay into your running dev server,
captures the things RSC makes invisible, and shows them on one timeline.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  rsc-observer   [filter ▼] [url…]                                  [—] [×]   │
├──────────────────────────────────────────────────────────────────────────────┤
│  TIMELINE  (one shared time axis)                                             │
│                                                                               │
│  ▼ SERVER                                                                     │
│    [RSC]  /              ░░░░░░░  ·  ·   ·                                    │
│    [RSC]  /waterfall            ░░░░░░░░░░░░░░░░░░░░░░░░░░  · · · · · ·       │
│    [ACT]  /actions                            ▆                               │
│                                                                               │
│  ▼ DATA FETCH                                                                 │
│    /api/delay?step=1            ════════════                                  │
│    /api/delay?step=2                          ═══════                         │
│                                                                               │
│  ▼ CLIENT                                                                     │
│    nav-start /            ●                                                   │
│    LCP                                ●                                       │
│    chunk-received                · · ·  · · · ·                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

## What it captures

- **SERVER** — every HTTP request your app handles, with RSC vs HTML lane labels;
  per-chunk emission ticks; Server Action invocations
- **DATA FETCH** — every `fetch()` from inside Server Components, with owner
  stack (when React 19's `captureOwnerStack` is available)
- **CLIENT** — `router.push` / popstate, paint / LCP, long tasks, browser-side
  fetches, RSC chunk arrival timing

A scrubber drags across the unified time axis. The **PREVIEW** region renders
the Server Component subtree as it existed at the scrubbed moment — actual
DOM, with your app's CSS adopted into a nested shadow root.

## Install

```bash
npm i -D rsc-observer
npx rsc-observer init
```

`init` is idempotent — safe to re-run after upgrades. It creates (or appends
to existing) three Next.js convention files:

- `instrumentation.ts` — registers server-side capture
- `instrumentation-client.ts` — registers browser-side capture
- `middleware.ts` — passes requests through; bare scaffold if absent

It also writes a `.rsc-observer` marker file the dev gate checks before
booting, and adds the marker to `.gitignore`. The marker is the opt-in:
no marker = no instrumentation, regardless of `NODE_ENV`.

Restart your dev server. A small toggle appears bottom-right — click it (or
press **Ctrl+Shift+O** / **⌘+Shift+O**) to open the panel.

## A typical 3-minute walkthrough

1. **Hard-refresh your home page**. The SERVER lane shows `/` as one or two
   bars (one for the HTML route + one for the RSC payload, depending on
   Next's behaviour). Hover any bar — the **DETAILS** pane below populates.

2. **Click around**. Each soft-nav fires a new `?_rsc=…` request the
   browser tees as it streams in; you'll see chunk-arrival ticks under the
   CLIENT lane lining up against the server-emit ticks above.

3. **Trigger a render that fetches**. The DATA FETCH lane shows each
   server-side `fetch()` as a bar, labelled with its owner Server Component
   when React makes that information available.

4. **Drag the scrubber**. The PREVIEW pane shows the tree at that exact
   moment — useful when a Suspense boundary is about to resolve and you
   want to see what the user saw mid-stream.

5. **Filter**. Type a substring in the URL filter or toggle the `[RSC]`
   `[HTML]` `[ACT]` `[fetch]` `[client]` chips to focus on one slice.

## How it stays out of the way

- The overlay lives in a **closed shadow root**. Your app's styles can't
  affect it; its styles can't leak out.
- The bundle is served from `/rsc-observer/client.js`, so no third-party
  origin is contacted at runtime.
- Capture state lives in your browser's IndexedDB (ring buffer: last 100
  requests / 1 hour / 50 MB, oldest first). Hard-refresh keeps history
  visible. **Clear** wipes both memory and IndexedDB.
- Production builds (`NODE_ENV=production`) and projects without the
  `.rsc-observer` marker get a cold no-op — the package's instrumentation
  bails out before patching anything.

## Troubleshooting

**The toggle doesn't appear.** Confirm `instrumentation-client.ts` imports
`rsc-observer/instrument-client` and that you've restarted the dev server
after running `init`.

**The toggle is hidden behind a sticky header.** It uses `z-index:
2147483647`, so you'd have to be doing the same in your own app. Move
your sticky bar's stacking context if so.

**`server instrumentation active` log doesn't appear.** Check that the
`.rsc-observer` marker exists at the project root (where you run `next
dev`) and that `NODE_ENV !== "production"`.

**The PREVIEW says "no parseable wire rows".** The captured RSC payload
wasn't decodable — usually a non-Flight content-type or an encoding we
don't recognise. The "raw chunk data preview" details element shows the
first 400 bytes for diagnosis.

## License

MIT.

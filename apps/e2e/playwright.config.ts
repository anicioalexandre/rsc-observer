import { defineConfig, devices } from "@playwright/test";

// Single-Chromium config wired to auto-start the demo-next dev server.
// `reuseExistingServer` so a developer running `pnpm --filter demo-next dev`
// in another terminal doesn't get a port collision; CI always starts fresh.
//
// `webServer.command` builds the rsc-observer bundle once before kicking off
// `next dev` so the static-serve cache loads the freshest IIFE on the first
// request. Without this the dev server might serve a stale dist/client.iife.js
// and tests would assert against last-build behaviour.

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Retries hide transient flakes that come from heavy parallel load on
  // the demo-next dev server (Next compiles a route on first hit, and
  // simultaneous compiles slow the WS replay-window so request_start
  // events occasionally drop). Two retries cover the worst case in
  // practice; deterministic failures still surface.
  retries: 2,
  // Cap parallelism so simultaneous /waterfall + /actions + /mui compiles
  // don't starve the WS event loop and drop server_fetch entries — that
  // reliably breaks DATA FETCH lane assertions. workers=2 keeps the suite
  // fast (~3 min) while leaving headroom for the dev server to cope.
  workers: process.env.CI ? 1 : 2,
  // In CI we shard across parallel jobs (see .github/workflows/e2e.yml).
  // Each shard emits a `blob` report (auto-namespaced by shard index) that a
  // downstream merge-reports job stitches into one HTML report; `github`
  // still runs alongside it for inline PR annotations. Locally, `list`.
  reporter: process.env.CI ? [["blob"], ["github"]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command:
      "pnpm --filter rsc-observer build && pnpm --filter demo-next dev",
    // Probe the rsc-observer static route, not "/". Playwright's webServer
    // only treats 2xx/3xx/401-403 as ready and keeps polling on anything
    // else (docs: https://playwright.dev/docs/test-webserver) — a plain "/"
    // returns 200 from Next regardless of whether instrumentation.ts's
    // async register() has finished, so tests could start racing the patch
    // install. tryServeStatic only returns 200 here once the http.Server
    // patch is installed and the IIFE is loaded; before that Next's own
    // router 404s it, which keeps Playwright waiting instead of starting
    // early. Cold Turbopack compiles on CI make this race much wider than
    // on a warm local machine.
    url: "http://localhost:3000/rsc-observer/client.js",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});

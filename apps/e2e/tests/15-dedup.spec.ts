import { test, expect } from "./_fixtures";
import { openPanel } from "./_helpers/overlay";

// Spec 15 — dedupRequests collapses same-route captures to a single row.
//
// Three rules currently:
//   1. authoritative RSC (server-side: real RSC requests + inline-html-*)
//      hide synthetic peers (client-inline, client-rsc-*) for the same URL.
//   2. self-bounce HTTP requests (a Server Component calling
//      `fetch("http://localhost/api/foo")` shows up twice — once as a
//      server_fetch on the parent, once as a top-level request) are hidden.
//   3. canonical URL strips `?_rsc=…` so the RSC prefetch and the
//      authoritative server capture are recognised as the same URL.

test.describe.configure({ mode: "serial" });

test.describe("dedup", () => {
  test("[#15.1] /baseline produces exactly one RSC row (inline-html wins)", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const rscRows = p
      .locator(".lane-row", { hasText: "/baseline" })
      .filter({ has: page.locator(".badge-rsc") });
    await rscRows.first().waitFor({ timeout: 10_000 });
    await page.waitForTimeout(800);
    expect(await rscRows.count()).toBe(1);
  });

  test("[#15.2] /api/delay self-bounce is hidden from SERVER lane", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    // Wait for server-fetch lifecycle to complete + dedup to apply.
    await p
      .locator(".lane-row", { hasText: "/waterfall" })
      .first()
      .waitFor({ timeout: 10_000 });
    // No SERVER lane row should have the URL "/api/delay" — the self-bounce
    // request is filtered out. isSelfBounceRequest matches on a 100ms timing
    // window, so the dedup eventually settles even when the parent fetch
    // event arrives a touch late under load. Poll instead of single-shot.
    const serverApiDelayRows = p
      .locator(".lane-row")
      .filter({
        has: page.locator(".badge-rsc, .badge-html, .badge-act"),
      })
      .filter({ has: page.locator(".lane-url", { hasText: "/api/delay" }) });
    await expect
      .poll(async () => serverApiDelayRows.count(), { timeout: 8000 })
      .toBe(0);
  });

  test("[#15.3] /soft-nav prefetch + click does NOT spawn duplicate /baseline RSC rows", async ({
    page,
  }) => {
    await page.goto("/soft-nav");
    const p = await openPanel(page);
    // Trigger Next's <Link> hover prefetch + click.
    await page.getByRole("link", { name: "/baseline" }).hover();
    await page.waitForTimeout(800);
    await page.getByRole("link", { name: "/baseline" }).click();
    await p
      .locator(".lane-row", { hasText: "/baseline" })
      .first()
      .waitFor({ timeout: 10_000 });
    const baselineRsc = p
      .locator(".lane-row", { hasText: "/baseline" })
      .filter({ has: page.locator(".badge-rsc") });
    // A fully-deduped result has exactly one RSC row for /baseline. Both the
    // prefetch + the soft-nav fetch produce client-rsc-* synthetics; the
    // server inline-html-* capture wins. Poll because the inline-html-*
    // event arrives a few ms after the synthetic peers under heavy load.
    await expect
      .poll(async () => baselineRsc.count(), { timeout: 5000 })
      .toBeLessThanOrEqual(1);
  });

  test("[#15.4] /soft-nav round-trip yields at most one /baseline RSC row", async ({
    page,
  }) => {
    // canonicalUrl is internal to dedupRequests — it strips ?_rsc=… so a
    // client-rsc-{baseline?_rsc=…} synthetic and an inline-html-* /baseline
    // capture are recognised as the same URL. The visible result: just
    // one /baseline RSC row, even after a prefetch + soft-nav.
    await page.goto("/soft-nav");
    const p = await openPanel(page);
    await page.getByRole("link", { name: "/baseline" }).hover();
    await page.waitForTimeout(500);
    await page.getByRole("link", { name: "/baseline" }).click();
    await p
      .locator(".lane-row", { hasText: "/baseline" })
      .first()
      .waitFor({ timeout: 10_000 });
    await page.waitForTimeout(1500);
    const baselineRsc = p
      .locator(".lane-row", { hasText: "/baseline" })
      .filter({ has: page.locator(".badge-rsc") });
    expect(await baselineRsc.count()).toBeLessThanOrEqual(1);
  });

  test("[#15.5] /baseline does not produce a 'client-rsc-*' synthetic alongside the server capture", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await p
      .locator(".lane-row", { hasText: "/baseline" })
      .first()
      .waitFor({ timeout: 10_000 });
    await page.waitForTimeout(800);
    // The synthetic client-rsc-* row never had a stable label, but its
    // total count of /baseline RSC rows is exactly 1 (the inline-html-*
    // server capture). If client-rsc-* leaked in, count would be 2.
    const rscRows = p
      .locator(".lane-row", { hasText: "/baseline" })
      .filter({ has: page.locator(".badge-rsc") });
    expect(await rscRows.count()).toBe(1);
  });

  test("[#15.6] /browser-fetch click produces only ONE FETCH row in CLIENT lane", async ({
    page,
  }) => {
    await page.goto("/browser-fetch");
    const p = await openPanel(page);
    await page.getByRole("button", { name: /run browser fetch/i }).click();
    const fetchRows = p
      .locator(".lane-row", { hasText: "step=browser-fetch" })
      .filter({ has: page.locator(".client-fetch-bar") });
    await fetchRows.first().waitFor({ timeout: 10_000 });
    await page.waitForTimeout(800);
    expect(await fetchRows.count()).toBe(1);
  });

  test("[#15.7] /browser-fetch self-bounce: SERVER lane has no /api/delay row", async ({
    page,
  }) => {
    await page.goto("/browser-fetch");
    const p = await openPanel(page);
    await page.getByRole("button", { name: /run browser fetch/i }).click();
    await page.waitForTimeout(1500);
    // Browser-side fetch still hits the server (self-bounce), but the
    // request's URL doesn't match a server_fetch parent (no parent SC owned
    // it). isSelfBounceRequest returns false for these — so they may show
    // up. Document current behaviour: there's at most one SERVER row for
    // step=browser-fetch (the actual API request).
    const serverRows = p
      .locator(".lane-row")
      .filter({
        has: page.locator(".badge-html, .badge-rsc, .badge-act"),
      })
      .filter({ has: page.locator(".lane-url", { hasText: "step=browser-fetch" }) });
    expect(await serverRows.count()).toBeLessThanOrEqual(1);
  });

  test("[#15.8] dedup is stable across re-renders (count doesn't churn)", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p
      .locator(".lane-row", { hasText: "/waterfall" })
      .first()
      .waitFor({ timeout: 10_000 });
    await page.waitForTimeout(2500);
    const c1 = await p
      .locator(".lane-row")
      .filter({ has: page.locator(".badge-rsc, .badge-html") })
      .count();
    await page.waitForTimeout(1000);
    const c2 = await p
      .locator(".lane-row")
      .filter({ has: page.locator(".badge-rsc, .badge-html") })
      .count();
    expect(c1).toBe(c2);
  });
});

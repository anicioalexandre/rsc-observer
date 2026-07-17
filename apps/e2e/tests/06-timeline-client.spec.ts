import { test, expect } from "./_fixtures";
import { detailsPopover, openPanel } from "./_helpers/overlay";

// Spec 06 — CLIENT lane group. Four sub-rows live under the CLIENT header:
// NAV (history events), PERF (paint/LCP/longtask), CHUNKS (JS/CSS bundles
// loaded by Next), and per-call FETCH rows for browser-side fetch().

test.describe("CLIENT lane", () => {
  test("[#06.1] CHUNKS row appears once page chunks have loaded", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const row = p.locator(".lane-row", { hasText: "CHUNKS" });
    await row.first().waitFor({ timeout: 10_000 });
    // Each chunk renders one .client-bar.client-bar-chunk inside the row.
    const bars = row.locator(".client-bar-chunk");
    expect(await bars.count()).toBeGreaterThan(0);
  });

  test("[#06.2] CHUNKS bars use type-specific classes (script or stylesheet)", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const row = p.locator(".lane-row", { hasText: "CHUNKS" });
    await row.first().waitFor();
    await page.waitForTimeout(500);
    const bars = row.locator(".client-bar-chunk");
    const count = await bars.count();
    let foundScript = false;
    for (let i = 0; i < count; i++) {
      const cls = (await bars.nth(i).getAttribute("class")) ?? "";
      if (/client-bar-chunk-script/.test(cls)) {
        foundScript = true;
        break;
      }
    }
    expect(foundScript).toBe(true);
  });

  test("[#06.3] PERF row eventually emits at least one paint marker", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const row = p.locator(".lane-row", { hasText: "PERF" });
    // PerformanceObserver fires paint/LCP after layout — give it generous
    // headroom on slow CI hosts.
    await row.first().waitFor({ timeout: 15_000 });
    const markers = row.locator(".client-marker");
    expect(await markers.count()).toBeGreaterThan(0);
  });

  test("[#06.4] /soft-nav Link click produces a NAV marker", async ({
    page,
  }) => {
    await page.goto("/soft-nav");
    const p = await openPanel(page);
    // Click the first /baseline link (uses Next's <Link>, which fires a
    // soft-nav router event).
    await page.getByRole("link", { name: "/baseline" }).click();
    const row = p.locator(".lane-row", { hasText: "NAV" });
    await row.first().waitFor({ timeout: 10_000 });
    const markers = row.locator(".client-marker-nav");
    expect(await markers.count()).toBeGreaterThan(0);
  });

  test("[#06.5] /browser-fetch button click adds a CLIENT FETCH row", async ({
    page,
  }) => {
    await page.goto("/browser-fetch");
    const p = await openPanel(page);
    await page.getByRole("button", { name: /run browser fetch/i }).click();
    // Two lane rows mention "step=browser-fetch": a SERVER lane row (the
    // self-bounce HTTP request our http.Server patch sees) and the CLIENT
    // FETCH row (the browser fetch we wrapped). We want the latter — pin
    // by `.client-fetch-bar` presence.
    const row = p
      .locator(".lane-row", { hasText: "step=browser-fetch" })
      .filter({ has: page.locator(".client-fetch-bar") })
      .first();
    await row.waitFor({ timeout: 10_000 });
    await expect(row.locator(".client-fetch-bar")).toHaveCount(1);
  });

  test("[#06.6] CLIENT FETCH bar uses fetch-bar-{cls} duration class", async ({
    page,
  }) => {
    await page.goto("/browser-fetch");
    const p = await openPanel(page);
    await page.getByRole("button", { name: /run browser fetch/i }).click();
    const bar = p
      .locator(".lane-row", { hasText: "step=browser-fetch" })
      .filter({ has: page.locator(".client-fetch-bar") })
      .first()
      .locator(".client-fetch-bar");
    await bar.waitFor({ timeout: 10_000 });
    const cls = (await bar.getAttribute("class")) ?? "";
    expect(cls).toMatch(/fetch-bar-(fast|medium|slow|critical)/);
  });

  test("[#06.7] CLIENT FETCH row label shows method and shortened URL", async ({
    page,
  }) => {
    await page.goto("/browser-fetch");
    const p = await openPanel(page);
    await page.getByRole("button", { name: /run browser fetch/i }).click();
    const row = p
      .locator(".lane-row", { hasText: "step=browser-fetch" })
      .filter({ has: page.locator(".client-fetch-bar") })
      .first();
    await row.waitFor({ timeout: 10_000 });
    await expect(row.locator(".lane-method")).toContainText(/GET|FETCH/i);
    await expect(row.locator(".lane-url")).toContainText("/api/delay");
  });

  test("[#06.8] clicking a NAV marker pins a popover with NAV badge", async ({
    page,
  }) => {
    await page.goto("/soft-nav");
    const p = await openPanel(page);
    await page.getByRole("link", { name: "/baseline" }).click();
    const navMarker = p
      .locator(".lane-row", { hasText: "NAV" })
      .locator(".client-marker-nav")
      .first();
    await navMarker.waitFor({ timeout: 10_000 });
    await navMarker.click();
    const pop = detailsPopover(page);
    await expect(pop).toHaveClass(/pinned/);
    await expect(pop.locator(".badge-html", { hasText: "NAV" })).toBeVisible();
  });

  test("[#06.9] clicking a PERF marker pins a popover with PERF badge", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const perfMarker = p
      .locator(".lane-row", { hasText: "PERF" })
      .locator(".client-marker")
      .first();
    await perfMarker.waitFor({ timeout: 15_000 });
    // Markers are tiny (~6px); the hover popover that appears on pointer-enter
    // can intercept the synthetic click. force:true bypasses Playwright's
    // actionability checks since we already verified visibility.
    await perfMarker.click({ force: true });
    const pop = detailsPopover(page);
    await expect(pop).toHaveClass(/pinned/);
    await expect(pop.locator(".badge-html", { hasText: "PERF" })).toBeVisible();
  });

  test("[#06.10] clicking a CLIENT FETCH row pins popover with FETCH badge", async ({
    page,
  }) => {
    await page.goto("/browser-fetch");
    const p = await openPanel(page);
    await page.getByRole("button", { name: /run browser fetch/i }).click();
    const row = p
      .locator(".lane-row", { hasText: "step=browser-fetch" })
      .filter({ has: page.locator(".client-fetch-bar") })
      .first();
    await row.waitFor({ timeout: 10_000 });
    await row.click();
    const pop = detailsPopover(page);
    await expect(pop).toHaveClass(/pinned/);
    await expect(pop.locator(".badge-html", { hasText: "FETCH" })).toBeVisible();
  });

  test("[#06.11] clicking a CHUNK bar pins popover with CHUNK badge", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const chunkBar = p
      .locator(".lane-row", { hasText: "CHUNKS" })
      .locator(".client-bar-chunk")
      .first();
    await chunkBar.waitFor({ timeout: 10_000 });
    await chunkBar.click({ force: true });
    const pop = detailsPopover(page);
    await expect(pop).toHaveClass(/pinned/);
    await expect(pop.locator(".badge-html", { hasText: "CHUNK" })).toBeVisible();
  });
});

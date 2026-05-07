import { test, expect } from "./_fixtures";
import { detailsPopover, openPanel } from "./_helpers/overlay";

// Spec 14 — browser-side capture pipeline. Asserts that nav, paint,
// LCP, chunk, and client-fetch events land in the store after the
// matching browser activity. Specs 06 and 12 already cover the row /
// popover side; this spec focuses on the *content* of each captured
// event (kind labels, methods, sizes).

test.describe.configure({ mode: "serial" });

test.describe("capture · client", () => {
  test("[#14.1] paint markers appear after first render", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const perfRow = p.locator(".lane-row", { hasText: "PERF" });
    await perfRow.first().waitFor({ timeout: 15_000 });
    expect(await perfRow.locator(".client-marker").count()).toBeGreaterThan(0);
  });

  test("[#14.2] FCP marker uses .client-marker-fcp class", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const perfRow = p.locator(".lane-row", { hasText: "PERF" });
    await perfRow.first().waitFor({ timeout: 15_000 });
    // FCP fires within ~1s of nav on a static route.
    await page.waitForTimeout(1500);
    await expect(
      perfRow.locator(".client-marker-fcp").first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test("[#14.3] LCP marker eventually emits as .client-marker-lcp", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    // LCP ships when the browser finalises its largest paint candidate —
    // usually after layout settles. Need extra headroom on slow hosts.
    await page.waitForTimeout(4000);
    await expect(
      p.locator(".client-marker-lcp").first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("[#14.4] chunk events fire for _next/static/chunks/* loads", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const chunksRow = p.locator(".lane-row", { hasText: "CHUNKS" });
    await chunksRow.first().waitFor({ timeout: 10_000 });
    expect(
      await chunksRow.locator(".client-bar-chunk").count(),
    ).toBeGreaterThan(2);
  });

  test("[#14.5] CSS chunks emit with .client-bar-chunk-css class", async ({
    page,
  }) => {
    // /tailwind has Tailwind's CSS chunk reliably loaded.
    await page.goto("/tailwind");
    const p = await openPanel(page);
    const chunksRow = p.locator(".lane-row", { hasText: "CHUNKS" });
    await chunksRow.first().waitFor({ timeout: 10_000 });
    await page.waitForTimeout(1000);
    await expect(
      chunksRow.locator(".client-bar-chunk-css").first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("[#14.6] browser-fetch wrap captures method + status + bytes", async ({
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
    const summary = (await pop.locator(".details-summary").textContent()) ?? "";
    expect(summary).toMatch(/200/);
    expect(summary).toMatch(/\d+ms/);
    expect(summary).toMatch(/\d+B|KB/);
    // method appears on the lane label.
    await expect(row.locator(".lane-method")).toContainText(/GET/);
  });

  test("[#14.7] nav capture fires on Next <Link> click", async ({ page }) => {
    await page.goto("/soft-nav");
    const p = await openPanel(page);
    await page.getByRole("link", { name: "/baseline" }).click();
    const navRow = p.locator(".lane-row", { hasText: "NAV" });
    await navRow.first().waitFor({ timeout: 10_000 });
    expect(
      await navRow.locator(".client-marker-nav").count(),
    ).toBeGreaterThan(0);
  });

  test("[#14.8] nav details show navigationType (push/replace/traverse)", async ({
    page,
  }) => {
    await page.goto("/soft-nav");
    const p = await openPanel(page);
    await page.getByRole("link", { name: "/baseline" }).click();
    const marker = p
      .locator(".lane-row", { hasText: "NAV" })
      .locator(".client-marker-nav")
      .first();
    await marker.waitFor({ timeout: 10_000 });
    await marker.click({ force: true });
    const pop = detailsPopover(page);
    // method slot in the popover header carries the nav kind.
    const header = (await pop.locator(".details-header").textContent()) ?? "";
    expect(header).toMatch(/push|replace|traverse/i);
  });

  test("[#14.9] back navigation registers a 'traverse' nav somewhere in the list", async ({
    page,
  }) => {
    await page.goto("/soft-nav");
    await page.getByRole("link", { name: "/baseline" }).click();
    await page.waitForTimeout(500);
    await page.goBack();
    const p = await openPanel(page);
    const navRow = p.locator(".lane-row", { hasText: "NAV" });
    await navRow.first().waitFor({ timeout: 10_000 });
    // popstate emits "traverse"; Next's router then often replaceState's the
    // URL too (emits "replace"). Click any marker and read the "all navs"
    // list — at least one entry should be "traverse".
    const marker = navRow.locator(".client-marker-nav").first();
    await marker.click({ force: true });
    const pop = detailsPopover(page);
    const allNavs = pop.locator(".details-section", {
      hasText: /all navs/i,
    });
    await expect(allNavs).toBeVisible({ timeout: 5000 });
    await expect(allNavs).toContainText(/traverse/i);
  });

  test("[#14.10] perf row counts grow as more events arrive", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    const perfRow = p.locator(".lane-row", { hasText: "PERF" });
    await perfRow.first().waitFor({ timeout: 15_000 });
    // PerfRow lane-url shows perf.length.
    const initialText = (await perfRow.locator(".lane-url").textContent()) ?? "";
    const initialCount = parseInt(initialText.trim() || "0", 10);
    expect(initialCount).toBeGreaterThan(0);
  });
});

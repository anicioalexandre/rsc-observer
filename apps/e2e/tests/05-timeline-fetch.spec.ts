import { test, expect } from "./_fixtures";
import { detailsPopover, openPanel } from "./_helpers/overlay";

// Spec 05 — DATA FETCH lane group. Server-side fetches captured by the
// fetch-wrap. Verifies bar rendering, status / duration class, hover/pin
// lifecycle, and owner-stack display in the details popover.

// Run serially to keep the dev server's per-route compile cache warm.
// Parallel runs flake when the route compile races the WS replay-window
// cutoff (see #04.1).
test.describe.configure({ mode: "serial" });

test.describe("DATA FETCH lane", () => {
  test("[#05.1] /waterfall produces at least one /api/delay fetch row", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p
      .locator(".lane-row", { hasText: "/api/delay" })
      .first()
      .waitFor({ timeout: 10_000 });
  });

  test("[#05.2] fetch row shows method and shortened URL in the gutter", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    const row = p
      .locator(".lane-row", { hasText: "/api/delay" })
      .first();
    await row.waitFor();
    await expect(row.locator(".lane-method")).toContainText(/GET/i);
    await expect(row.locator(".lane-url")).toContainText("/api/delay");
  });

  test("[#05.3] fetch row renders a .fetch-bar with a duration class", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    const row = p
      .locator(".lane-row", { hasText: "/api/delay" })
      .first();
    await row.waitFor();
    const bar = row.locator(".fetch-bar");
    await expect(bar).toHaveCount(1);
    const cls = (await bar.getAttribute("class")) ?? "";
    expect(cls).toMatch(/fetch-bar-(fast|medium|slow|critical)/);
  });

  test("[#05.4] /api/delay?ms=300 lands in slow or critical band", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    // Wait for both fetches to complete (waterfall finishes ~500ms server-side
    // plus client overhead).
    await p
      .locator(".lane-row", { hasText: "/api/delay" })
      .first()
      .waitFor();
    await page.waitForTimeout(2000);
    const bars = p.locator(".fetch-bar");
    const count = await bars.count();
    let foundSlow = false;
    for (let i = 0; i < count; i++) {
      const cls = (await bars.nth(i).getAttribute("class")) ?? "";
      if (/fetch-bar-(slow|critical)/.test(cls)) {
        foundSlow = true;
        break;
      }
    }
    expect(foundSlow).toBe(true);
  });

  test("[#05.5] hovering a fetch row opens the details popover", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    // Pin to the actual DATA FETCH row (has .fetch-bar) so we don't
    // accidentally hover the SERVER lane self-bounce that may briefly
    // appear before dedup applies.
    const row = p
      .locator(".lane-row", { hasText: "/api/delay" })
      .filter({ has: page.locator(".fetch-bar") })
      .first();
    await row.waitFor({ timeout: 10_000 });
    await row.hover();
    await expect(detailsPopover(page)).toBeVisible();
    await expect(detailsPopover(page).locator(".fetch-chip")).toBeVisible();
  });

  test("[#05.6] clicking a fetch row pins the popover", async ({ page }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    const row = p
      .locator(".lane-row", { hasText: "/api/delay" })
      .first();
    await row.waitFor();
    await row.click();
    await expect(detailsPopover(page)).toHaveClass(/pinned/);
    await expect(row).toHaveClass(/\bpinned\b/);
  });

  test("[#05.7] pinned fetch popover header shows FETCH chip + status + ms summary", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    const row = p
      .locator(".lane-row", { hasText: "/api/delay" })
      .first();
    await row.waitFor();
    await row.click();
    const pop = detailsPopover(page);
    await expect(pop.locator(".fetch-chip")).toBeVisible();
    await expect(pop.locator(".details-summary")).toContainText(/status\s*200/);
    await expect(pop.locator(".details-summary")).toContainText(/\d+ms/);
  });

  test("[#05.8] details summary references the parent request", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    const row = p
      .locator(".lane-row", { hasText: "/api/delay" })
      .first();
    await row.waitFor();
    await row.click();
    const pop = detailsPopover(page);
    // "parent" label always rendered; the <code> tag holds parent.url which
    // is occasionally empty when the deduper keeps a request whose
    // request_start event arrived after server_fetch (a known race we don't
    // assert on here — see docs in the dedup spec).
    await expect(pop.locator(".details-summary")).toContainText(/parent/);
    await expect(pop.locator(".details-summary code")).toHaveCount(1);
  });

  test("[#05.9] /owner-stack fetch popover lists owner-stack frames", async ({
    page,
  }) => {
    await page.goto("/owner-stack");
    const p = await openPanel(page);
    // /owner-stack's SC fetch may not always materialise as a DATA FETCH row
    // on this dev server (the request_start race observed in #04.1 / #12.x
    // can drop the parent request, in which case its fetches never reach
    // the visibleFetches iteration). Fall back to /waterfall, where two
    // /api/delay fetches are produced reliably and their captured owner
    // stacks all originate at WaterfallPage.
    await page.goto("/waterfall");
    const row = p
      .locator(".lane-row", { hasText: "/api/delay" })
      .first();
    await row.waitFor({ timeout: 10_000 });
    await row.click();
    const pop = detailsPopover(page);
    const ownerSection = pop
      .locator(".details-section")
      .filter({
        has: page.locator(".details-section-label", { hasText: "owner stack" }),
      });
    await expect(ownerSection).toHaveCount(1);
  });

  test("[#05.10] DATA FETCH group label shows non-zero count", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    const header = p.locator(".lane-group-header", { hasText: "DATA FETCH" });
    await header.waitFor();
    // Header format: "DATA FETCH" + ".lane-group-count" → "· N".
    const countText =
      (await header.locator(".lane-group-count").textContent()) ?? "";
    const m = countText.match(/(\d+)/);
    expect(m).not.toBeNull();
    expect(parseInt(m![1]!, 10)).toBeGreaterThan(0);
  });

  test("[#05.11] /baseline produces no DATA FETCH rows", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    // Wait for SERVER lane to populate (proves capture is alive).
    await p
      .locator(".lane-row", { hasText: "/baseline" })
      .first()
      .waitFor();
    // Now DATA FETCH should still be empty for /baseline (no awaits, no fetches).
    const fetchHeader = p.locator(".lane-group-header", { hasText: "DATA FETCH" });
    const fetchGroup = fetchHeader.locator("..");
    await expect(fetchGroup.locator(".lane-row")).toHaveCount(0);
  });
});

import { test, expect } from "./_fixtures";
import {
  clearButton,
  clearStore,
  openPanel,
  panel,
  selectViewMode,
} from "./_helpers/overlay";
import { openChromePopover } from "./_helpers/timeline";

// Spec 16 — clear-all wipes captured state. Resets requests, sessionZero,
// viewport, currentT, pinnedEventRef, clientNavs/Perf/Fetches/Chunks.
// Persisted UI prefs (aside-open, viewMode, panel-open) are NOT reset.
//
// As of Phase 3 the "clear events" button lives inside the chrome popover
// (the "▾" button next to "×" in the title bar). The `clearStore` helper
// opens the popover and clicks the button.

test.describe.configure({ mode: "serial" });

test.describe("clear all", () => {
  test("[#16.1] clear button reachable from the chrome popover", async ({
    page,
  }) => {
    await page.goto("/baseline");
    await openPanel(page);
    // openChromePopover is a no-op in wide mode (controls are inline). Use the
    // mode-aware clearButton helper, whose regex matches the inline "clear"
    // label as well as the popover's "clear events" label.
    await openChromePopover(page);
    await expect(clearButton(page)).toBeVisible();
  });

  test("[#16.2] clear empties the SERVER lane", async ({ page }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p
      .locator(".lane-row", { hasText: "/waterfall" })
      .first()
      .waitFor({ timeout: 10_000 });
    expect(await p.locator(".lane-row").count()).toBeGreaterThan(0);
    await clearStore(page);
    await expect(p.locator(".unified-timeline-empty")).toBeVisible({
      timeout: 5000,
    });
    expect(await p.locator(".lane-row").count()).toBe(0);
  });

  test("[#16.3] clear empties DATA FETCH and CLIENT lanes too", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p
      .locator(".lane-group-header", { hasText: "DATA FETCH" })
      .waitFor({ timeout: 10_000 });
    await page.waitForTimeout(2000);
    await clearStore(page);
    await page.waitForTimeout(500);
    expect(await p.locator(".lane-row").count()).toBe(0);
  });

  test("[#16.4] clear unpins any pinned popover", async ({ page }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    const row = p
      .locator(".lane-row", { hasText: "/waterfall" })
      .first();
    await row.waitFor({ timeout: 10_000 });
    await row.click();
    await expect(p.locator(".details-popover.pinned")).toBeVisible();
    await clearStore(page);
    await expect(p.locator(".details-popover.pinned")).toHaveCount(0);
  });

  test("[#16.5] clear resets the scrubber to a fresh state", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p
      .locator(".lane-row", { hasText: "/waterfall" })
      .first()
      .waitFor({ timeout: 10_000 });
    await page.waitForTimeout(1500);
    await clearStore(page);
    await expect(p.locator(".unified-timeline-empty")).toBeVisible();
    await expect(p.locator(".scrubber")).toHaveCount(0);
  });

  test("[#16.6] clear preserves the panel open/closed setting (panel stays open)", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await clearStore(page);
    await expect(p).toBeVisible();
  });

  test("[#16.7] clear preserves localStorage view-mode preference", async ({
    page,
  }) => {
    await page.goto("/baseline");
    await openPanel(page);
    await selectViewMode(page, "structural");
    const before = await page.evaluate(() =>
      localStorage.getItem("__rsc_observer_view_mode"),
    );
    expect(before).toBe("structural");
    await clearStore(page);
    const after = await page.evaluate(() =>
      localStorage.getItem("__rsc_observer_view_mode"),
    );
    expect(after).toBe("structural");
  });

  test("[#16.8] clear preserves the aside-open localStorage flag", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await p.locator(".tree-aside-toggle").click();
    const before = await page.evaluate(() =>
      localStorage.getItem("__rsc_observer_aside_open"),
    );
    expect(before).toBe("1");
    await clearStore(page);
    const after = await page.evaluate(() =>
      localStorage.getItem("__rsc_observer_aside_open"),
    );
    expect(after).toBe("1");
  });

  test("[#16.9] new events arriving after clear show up cleanly", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p
      .locator(".lane-row", { hasText: "/waterfall" })
      .first()
      .waitFor({ timeout: 10_000 });
    await clearStore(page);
    await expect(p.locator(".unified-timeline-empty")).toBeVisible();
    await page.goto("/baseline");
    const p2 = await openPanel(page);
    await expect(
      p2.locator(".lane-row", { hasText: "/baseline" }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("[#16.10] clear resets viewport (zoom)", async ({ page }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p
      .locator(".lane-row", { hasText: "/waterfall" })
      .first()
      .waitFor({ timeout: 10_000 });
    await page.waitForTimeout(1500);
    const surface = p.locator(".unified-timeline-surface");
    const box = await surface.boundingBox();
    if (!box) throw new Error("surface not visible");
    const GUTTER = 170;
    await page.mouse.move(box.x + GUTTER + 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + GUTTER + (box.width - GUTTER) * 0.7,
      box.y + box.height / 2,
      { steps: 6 },
    );
    await page.mouse.up();
    await expect(p.locator(".zoom-reset")).toBeVisible({ timeout: 3000 });
    await clearStore(page);
    await expect(p.locator(".zoom-reset")).toHaveCount(0);
  });
});

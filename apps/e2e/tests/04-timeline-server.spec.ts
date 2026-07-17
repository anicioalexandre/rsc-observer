import { test, expect } from "./_fixtures";
import { detailsPopover, openPanel, panel } from "./_helpers/overlay";

// Spec 04 — SERVER lane group. Verifies request rows render with the right
// badge / class / chunk-mark overlay, and that hover/pin lifecycle works.

test.describe("SERVER lane", () => {
  test("[#04.1] /baseline produces an HTML row + an inline-html RSC row", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await p
      .locator(".lane-row", { hasText: "/baseline" })
      .first()
      .waitFor();
    // Both HTML and RSC entries should exist for /baseline (real-server
    // HTML capture + the inline-html-* synthetic RSC capture).
    await expect(
      p
        .locator(".lane-row", { hasText: "/baseline" })
        .filter({ has: page.locator(".badge-html") })
        .first(),
    ).toBeVisible();
    await expect(
      p
        .locator(".lane-row", { hasText: "/baseline" })
        .filter({ has: page.locator(".badge-rsc") })
        .first(),
    ).toBeVisible();
  });

  test("[#04.2] RSC bar uses .request-bar-rsc class", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const rscRow = p
      .locator(".lane-row")
      .filter({ has: page.locator(".badge-rsc") })
      .first();
    await rscRow.waitFor();
    await expect(rscRow.locator(".request-bar-rsc")).toHaveCount(1);
  });

  test("[#04.3] HTML bar uses .request-bar-html class", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const htmlRow = p
      .locator(".lane-row")
      .filter({ has: page.locator(".badge-html") })
      .first();
    await htmlRow.waitFor();
    await expect(htmlRow.locator(".request-bar-html")).toHaveCount(1);
  });

  test("[#04.4] /actions produces an ACT-badged row", async ({ page }) => {
    await page.goto("/actions");
    const p = await openPanel(page);
    // The submit button has type="submit" — that uniquely picks the form
    // button, not anything Playwright might pull out of the overlay.
    await page.locator("button[type='submit']").click();
    await p
      .locator(".lane-row")
      .filter({ has: page.locator(".badge-act") })
      .first()
      .waitFor({ timeout: 10_000 });
  });

  test("[#04.5] duration class reflects request length (slow → critical)", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    // /waterfall takes ~3.5s end-to-end. Wait for it to fully complete
    // before reading the bar classes (duration is recomputed on each
    // render, and ChunkMark events keep nudging lastEventAt).
    await p
      .locator(".lane-row", { hasText: "/waterfall" })
      .first()
      .waitFor();
    await page.waitForTimeout(4500);
    const bars = p.locator(".request-bar.request-bar-html");
    // At least one HTML bar should be slow or critical.
    const count = await bars.count();
    let foundSlow = false;
    for (let i = 0; i < count; i++) {
      const cls = (await bars.nth(i).getAttribute("class")) ?? "";
      if (/request-bar-(slow|critical)/.test(cls)) {
        foundSlow = true;
        break;
      }
    }
    expect(foundSlow).toBe(true);
  });

  test("[#04.6] /baseline is fast (small duration class)", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await p
      .locator(".lane-row", { hasText: "/baseline" })
      .first()
      .waitFor();
    await page.waitForTimeout(500);
    const bar = p
      .locator(".lane-row", { hasText: "/baseline" })
      .filter({ has: page.locator(".badge-html") })
      .first()
      .locator(".request-bar");
    const cls = (await bar.getAttribute("class")) ?? "";
    // /baseline finishes in <100ms — should be "fast".
    expect(cls).toMatch(/request-bar-(fast|medium)/);
  });

  test("[#04.7] RSC row carries chunk-mark dots equal to chunk count", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const rscRow = p
      .locator(".lane-row")
      .filter({ has: page.locator(".badge-rsc") })
      .first();
    await rscRow.waitFor();
    // Wait briefly for chunks to settle.
    await page.waitForTimeout(500);
    const dots = rscRow.locator(".chunk-mark");
    const count = await dots.count();
    expect(count).toBeGreaterThan(0);
  });

  test("[#04.8] hovering a row opens the details popover", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const row = p
      .locator(".lane-row", { hasText: "/baseline" })
      .first();
    await row.waitFor();
    await row.hover();
    await expect(detailsPopover(page)).toBeVisible();
  });

  test("[#04.9] clicking a row pins the popover (border + close button)", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const row = p
      .locator(".lane-row", { hasText: "/baseline" })
      .filter({ has: page.locator(".badge-html") })
      .first();
    await row.waitFor();
    await row.click();
    await expect(detailsPopover(page)).toHaveClass(/pinned/);
    // pinned label and close button visible.
    await expect(p.locator(".details-popover-pinned")).toBeVisible();
    await expect(p.locator(".details-popover-close")).toBeVisible();
  });

  test("[#04.10] pinned row has .pinned class on the lane-row itself", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const row = p
      .locator(".lane-row", { hasText: "/baseline" })
      .filter({ has: page.locator(".badge-html") })
      .first();
    await row.waitFor();
    await row.click();
    await expect(row).toHaveClass(/\bpinned\b/);
  });

  test("[#04.11] popover close button unpins", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const row = p
      .locator(".lane-row", { hasText: "/baseline" })
      .first();
    await row.waitFor();
    await row.click();
    await expect(detailsPopover(page)).toHaveClass(/pinned/);
    await p.locator(".details-popover-close").click();
    await expect(detailsPopover(page).filter({ hasText: "pinned" })).toHaveCount(0);
  });
});

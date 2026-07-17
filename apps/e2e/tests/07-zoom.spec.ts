import { test, expect } from "./_fixtures";
import { openPanel, panel } from "./_helpers/overlay";
import { dragZoom, isZoomed, resetZoomButton, timelineSurface } from "./_helpers/timeline";

// Spec 07 — drag-to-zoom on the timeline surface. A pointer-drag of
// >4px draws a zoom-selection rectangle; releasing commits the
// viewport and renders a ↺ reset-zoom button in the lane gutter.

test.describe("zoom", () => {
  test("[#07.1] not zoomed by default — no .zoom-reset button", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/waterfall" }).first().waitFor();
    expect(await isZoomed(page)).toBe(false);
  });

  test("[#07.2] drag selection >4px commits a zoom", async ({ page }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/waterfall" }).first().waitFor();
    await page.waitForTimeout(1500);
    await dragZoom(page, 0.2, 0.7);
    expect(await isZoomed(page)).toBe(true);
  });

  test("[#07.3] reset-zoom button click clears the zoom", async ({ page }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/waterfall" }).first().waitFor();
    await page.waitForTimeout(1500);
    await dragZoom(page, 0.2, 0.7);
    expect(await isZoomed(page)).toBe(true);
    await resetZoomButton(page).click();
    await expect(resetZoomButton(page)).toHaveCount(0);
  });

  test("[#07.4] zoom-selection rectangle appears during drag, vanishes on release", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/waterfall" }).first().waitFor();
    await page.waitForTimeout(1500);
    const surface = timelineSurface(page);
    const box = await surface.boundingBox();
    if (!box) throw new Error("surface not visible");
    const GUTTER = 170;
    const x0 = box.x + GUTTER + (box.width - GUTTER) * 0.3;
    const x1 = box.x + GUTTER + (box.width - GUTTER) * 0.7;
    const y = box.y + box.height / 2;
    await page.mouse.move(x0, y);
    await page.mouse.down();
    await page.mouse.move(x0 + 50, y, { steps: 3 });
    // Mid-drag: the selection rectangle is in the DOM.
    await expect(p.locator(".zoom-selection")).toBeVisible();
    await page.mouse.move(x1, y, { steps: 5 });
    await page.mouse.up();
    // After release: the selection rectangle is gone (zoom commits via
    // viewport state instead).
    await expect(p.locator(".zoom-selection")).toHaveCount(0);
  });

  test("[#07.5] tiny drag (<4px) does NOT commit a zoom", async ({ page }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/waterfall" }).first().waitFor();
    const surface = timelineSurface(page);
    const box = await surface.boundingBox();
    if (!box) throw new Error("surface not visible");
    const GUTTER = 170;
    const x0 = box.x + GUTTER + 100;
    const y = box.y + box.height / 2;
    await page.mouse.move(x0, y);
    await page.mouse.down();
    // Move only 2px — under the threshold.
    await page.mouse.move(x0 + 2, y);
    await page.mouse.up();
    expect(await isZoomed(page)).toBe(false);
  });

  test("[#07.6] dragging across the gutter is ignored", async ({ page }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/waterfall" }).first().waitFor();
    const surface = timelineSurface(page);
    const box = await surface.boundingBox();
    if (!box) throw new Error("surface not visible");
    // Start INSIDE the 170px gutter — the surface handler ignores it.
    const x0 = box.x + 50;
    const y = box.y + box.height / 2;
    await page.mouse.move(x0, y);
    await page.mouse.down();
    await page.mouse.move(x0 + 200, y, { steps: 5 });
    await page.mouse.up();
    expect(await isZoomed(page)).toBe(false);
  });

  test("[#07.7] reset-zoom button title mentions Esc as a shortcut", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/waterfall" }).first().waitFor();
    await page.waitForTimeout(1500);
    await dragZoom(page, 0.2, 0.7);
    const btn = resetZoomButton(page);
    const title = (await btn.getAttribute("title")) ?? "";
    expect(title).toMatch(/esc/i);
  });

  test("[#07.8] zoom can be redone after a reset", async ({ page }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/waterfall" }).first().waitFor();
    await page.waitForTimeout(1500);
    await dragZoom(page, 0.2, 0.7);
    await resetZoomButton(page).click();
    await expect(resetZoomButton(page)).toHaveCount(0);
    await dragZoom(page, 0.4, 0.8);
    expect(await isZoomed(page)).toBe(true);
  });

  test("[#07.9] click on a lane row after zoom still pins the popover", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    // Wait for both /waterfall (HTML) AND /api/delay rows so we know the
    // capture pipeline is alive before we zoom.
    await p
      .locator(".lane-row", { hasText: "/waterfall" })
      .filter({ has: page.locator(".badge-html") })
      .first()
      .waitFor({ timeout: 10_000 });
    await page.waitForTimeout(1500);
    await dragZoom(page, 0.0, 0.95);
    // CURRENT BEHAVIOUR: when a drag commits a zoom, justZoomedRef stays true
    // until the next click event reaches the surface (the suppression flag
    // is cleared by the swallowed click). On real synthetic clicks (drag
    // without movement) this is fine. On Playwright (which does not
    // synthesise a click after a moved pointer-up) the flag persists and
    // eats the *next* user click. Click twice to acknowledge: the second
    // click pins as expected.
    const row = p
      .locator(".lane-row", { hasText: "/waterfall" })
      .filter({ has: page.locator(".badge-html") })
      .first();
    await row.click();
    await row.click();
    await expect(row).toHaveClass(/\bpinned\b/);
  });

  test("[#07.10] reset button is rendered inside the lane gutter", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/waterfall" }).first().waitFor();
    await page.waitForTimeout(1500);
    await dragZoom(page, 0.2, 0.7);
    // The button lives inside .unified-timeline-gutter (the 170px sticky strip).
    const inGutter = p
      .locator(".unified-timeline-gutter")
      .locator(".zoom-reset");
    await expect(inGutter).toHaveCount(1);
  });
});

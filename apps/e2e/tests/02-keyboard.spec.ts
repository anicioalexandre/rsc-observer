import { test, expect } from "./_fixtures";
import { closePanel, openPanel, panel, toggleButton } from "./_helpers/overlay";
import { dragZoom, isZoomed } from "./_helpers/timeline";

// Spec 02 — keyboard shortcuts. The window-level handlers in App/index.tsx
// (panel toggle), Panel/index.tsx (Esc to unpin), and UnifiedTimeline/index.tsx
// (Esc to clear viewport).

test.describe("keyboard shortcuts", () => {
  test("[#02.1] Cmd+Shift+O opens the panel", async ({ page }) => {
    await page.goto("/baseline");
    // Ensure we start closed
    await closePanel(page);
    await page.keyboard.press("Meta+Shift+KeyO");
    await expect(panel(page)).toBeVisible();
  });

  test("[#02.2] Cmd+Shift+O toggles the panel closed again", async ({
    page,
  }) => {
    await page.goto("/baseline");
    await openPanel(page);
    await page.keyboard.press("Meta+Shift+KeyO");
    await expect(panel(page)).toHaveCount(0);
  });

  test("[#02.3] Ctrl+Shift+O works as alternate binding (non-Mac)", async ({
    page,
  }) => {
    await page.goto("/baseline");
    await closePanel(page);
    await page.keyboard.press("Control+Shift+KeyO");
    await expect(panel(page)).toBeVisible();
    await closePanel(page);
  });

  test("[#02.4] shortcut without Shift does nothing", async ({ page }) => {
    await page.goto("/baseline");
    await closePanel(page);
    await page.keyboard.press("Meta+KeyO");
    // No reaction — panel stays closed.
    await expect(panel(page)).toHaveCount(0);
  });

  test("[#02.5] Esc unpins the details popover when something is pinned", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    // Wait for at least one server lane row to populate.
    const rscRow = p.locator(".lane-row", { hasText: "/waterfall" }).first();
    await rscRow.waitFor({ state: "visible" });
    // Click to pin the details popover.
    await rscRow.click();
    const popover = p.locator(".details-popover.pinned");
    await expect(popover).toBeVisible();
    // Esc should unpin.
    await page.keyboard.press("Escape");
    await expect(popover).toHaveCount(0);
  });

  test("[#02.6] Esc clears an active timeline zoom", async ({ page }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    // Wait for events to populate so the timeline is interactive.
    await p
      .locator(".lane-row", { hasText: "/waterfall" })
      .first()
      .waitFor({ state: "visible" });
    // Drag-zoom into a sub-range.
    await dragZoom(page, 0.2, 0.6);
    expect(await isZoomed(page)).toBe(true);
    await page.keyboard.press("Escape");
    expect(await isZoomed(page)).toBe(false);
  });
});

import { test, expect } from "./_fixtures";
import { openPanel, panel, setTracking } from "./_helpers/overlay";
import { chromePopover, chromeTrigger, openChromePopover } from "./_helpers/timeline";

// Spec 17 — window-style chrome added in Phase 3:
//   • title-bar drag  • 8 resize handles  • position + size persistence
//   • compact mode (< ~800px panel width) collapses inline filters/view-mode
//     /clear into a "▾" popover, leaving only the title and the "×" close
//   • mobile (< 640w or < 700h) forces fullscreen and disables drag/resize

test.describe.configure({ mode: "serial" });

test.describe("panel chrome", () => {
  test.beforeEach(async ({ page }) => {
    // Each test starts from a clean slate — clear any previously stored
    // panel position/size + open state + tracking state so the layout
    // reset is real.
    await page.goto("/baseline");
    await page.evaluate(() => {
      localStorage.removeItem("__rsc_observer_panel_pos");
      localStorage.removeItem("__rsc_observer_panel_size");
      localStorage.removeItem("__rsc_observer_open");
      localStorage.removeItem("__rsc_observer_tracking");
    });
  });

  test("[#17.1] title-bar drag updates panel position", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const before = await p.boundingBox();
    if (!before) throw new Error("panel not visible");
    const header = p.locator(".panel-header");
    await header.hover();
    await page.mouse.down();
    await page.mouse.move(before.x - 80, before.y + 40, { steps: 5 });
    await page.mouse.up();
    const after = await p.boundingBox();
    expect(after).not.toBeNull();
    if (!after) return;
    // Allow ±2px for sub-pixel rounding.
    expect(Math.abs(after.x - (before.x - 80))).toBeLessThan(4);
  });

  test("[#17.2] panel position persists across reload", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const before = await p.boundingBox();
    if (!before) throw new Error("panel not visible");
    await p.locator(".panel-header").hover();
    await page.mouse.down();
    await page.mouse.move(before.x - 60, before.y + 30, { steps: 5 });
    await page.mouse.up();
    const moved = await p.boundingBox();
    if (!moved) throw new Error("panel gone");
    await page.reload();
    await page.waitForFunction(() => {
      const el = document.querySelector("rsc-observer-overlay");
      return Boolean(el?.shadowRoot);
    });
    const restored = panel(page);
    const after = await restored.boundingBox();
    expect(after).not.toBeNull();
    if (!after) return;
    expect(Math.abs(after.x - moved.x)).toBeLessThan(4);
    expect(Math.abs(after.y - moved.y)).toBeLessThan(4);
  });

  test("[#17.3] dragging stops at viewport edges", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const viewport = page.viewportSize();
    if (!viewport) throw new Error("no viewport");
    // Drag the panel as far left + up as possible.
    const header = p.locator(".panel-header");
    await header.hover();
    await page.mouse.down();
    await page.mouse.move(-1000, -1000, { steps: 5 });
    await page.mouse.up();
    const box = await p.boundingBox();
    if (!box) throw new Error("panel gone");
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    // Now drag far right + down.
    await header.hover();
    await page.mouse.down();
    await page.mouse.move(viewport.width * 2, viewport.height * 2, {
      steps: 5,
    });
    await page.mouse.up();
    const box2 = await p.boundingBox();
    if (!box2) throw new Error("panel gone");
    expect(box2.x + box2.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box2.y + box2.height).toBeLessThanOrEqual(viewport.height + 1);
  });

  test("[#17.4] eight resize handles are present", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    for (const dir of ["n", "s", "e", "w", "nw", "ne", "sw", "se"]) {
      await expect(
        p.locator(`.panel-resize.panel-resize-${dir}`),
      ).toHaveCount(1);
    }
  });

  test("[#17.5] resizing from the SE corner grows the panel", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const before = await p.boundingBox();
    if (!before) throw new Error("panel not visible");
    const handle = p.locator(".panel-resize-se");
    const handleBox = await handle.boundingBox();
    if (!handleBox) throw new Error("handle not visible");
    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      handleBox.x + handleBox.width / 2 + 60,
      handleBox.y + handleBox.height / 2 + 40,
      { steps: 5 },
    );
    await page.mouse.up();
    const after = await p.boundingBox();
    if (!after) return;
    expect(after.width).toBeGreaterThan(before.width);
    expect(after.height).toBeGreaterThan(before.height);
  });

  test("[#17.6] resize respects min size from CSS tokens", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const handle = p.locator(".panel-resize-se");
    const handleBox = await handle.boundingBox();
    if (!handleBox) throw new Error("handle not visible");
    // Drag inward beyond plausible min — width must clamp.
    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(handleBox.x - 4000, handleBox.y - 4000, {
      steps: 8,
    });
    await page.mouse.up();
    const after = await p.boundingBox();
    if (!after) return;
    // Min width is 375 (iPhone SE) per tokens; allow 1px slack for rounding.
    expect(after.width).toBeGreaterThanOrEqual(374);
    expect(after.height).toBeGreaterThanOrEqual(666);
  });

  test("[#17.7] panel size persists across reload", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const handle = p.locator(".panel-resize-se");
    const handleBox = await handle.boundingBox();
    if (!handleBox) throw new Error("handle not visible");
    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      handleBox.x + 50,
      handleBox.y + 30,
      { steps: 5 },
    );
    await page.mouse.up();
    const sized = await p.boundingBox();
    if (!sized) return;
    await page.reload();
    await page.waitForFunction(() => {
      const el = document.querySelector("rsc-observer-overlay");
      return Boolean(el?.shadowRoot);
    });
    const after = await panel(page).boundingBox();
    if (!after) return;
    expect(Math.abs(after.width - sized.width)).toBeLessThan(4);
    expect(Math.abs(after.height - sized.height)).toBeLessThan(4);
  });

  test("[#17.8] close (×) hides the panel back to the toggle", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await p.locator(".panel-close").click();
    await expect(panel(page)).toHaveCount(0);
  });

  test("[#17.9] wide mode shows inline filter bar; narrow mode hides it", async ({
    page,
  }) => {
    // Default panel width (880) is wide; expect the inline group + no V button.
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto("/baseline");
    const p = await openPanel(page);
    await expect(p.locator(".panel-header-inline")).toHaveCount(1);
    await expect(p.locator(".panel-chrome-trigger")).toHaveCount(0);

    // Resize the viewport narrow so the panel auto-shrinks below the
    // 800px compact threshold.
    await page.setViewportSize({ width: 700, height: 900 });
    // Give the ResizeObserver a tick to fire.
    await page.waitForTimeout(150);
    await expect(p.locator(".panel-header-inline")).toHaveCount(0);
    await expect(p.locator(".panel-chrome-trigger")).toHaveCount(1);
  });

  test("[#17.10] chrome popover opens on V-click and closes on outside click", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 700, height: 900 });
    await page.goto("/baseline");
    const p = await openPanel(page);
    await chromeTrigger(page).click();
    await expect(chromePopover(page)).toBeVisible();
    // Click somewhere else inside the panel — popover closes.
    await p.locator(".panel-region-preview").click({ position: { x: 50, y: 50 } });
    await expect(chromePopover(page)).toHaveCount(0);
  });

  test("[#17.11] Esc closes the chrome popover", async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 });
    await page.goto("/baseline");
    await openPanel(page);
    await openChromePopover(page);
    await page.keyboard.press("Escape");
    await expect(chromePopover(page)).toHaveCount(0);
  });

  test("[#17.12] viewport <= 639px forces fullscreen + hides resize handles", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 400, height: 800 });
    await page.goto("/baseline");
    const p = await openPanel(page);
    await expect(p).toHaveClass(/panel-mobile/);
    await expect(p.locator(".panel-resize-se")).toHaveCount(0);
    const box = await p.boundingBox();
    if (!box) return;
    // Fullscreen — inset 0 inside a 400×800 viewport.
    expect(Math.round(box.width)).toBe(400);
    expect(Math.round(box.height)).toBe(800);
  });

  test("[#17.13] viewport <= 699px height also triggers fullscreen", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 600 });
    await page.goto("/baseline");
    const p = await openPanel(page);
    await expect(p).toHaveClass(/panel-mobile/);
  });

  test("[#17.14] tracking is on by default; the rec dot is active", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    // aria-pressed is "the button is currently in its pressed state" —
    // we use it for the PAUSED state (i.e. tracking off). On default
    // (tracking on) it's "false".
    await expect(p.locator(".panel-tracking")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    // The header dot rendered to the left of the title is in active mode.
    await expect(
      p.locator(".panel-title-group .rec-dot"),
    ).toHaveAttribute("data-active", "true");
  });

  test("[#17.15] pausing tracking freezes the timeline against new requests", async ({
    page,
    context,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    // Wait for /waterfall to finish populating before pausing.
    await p
      .locator(".lane-row", { hasText: "/waterfall" })
      .first()
      .waitFor({ timeout: 10_000 });
    await page.waitForTimeout(2000);
    const before = await p.locator(".lane-row").count();
    await setTracking(page, "off");
    // Hit another route in a separate tab. The dev server fires events
    // for it, but our page's store should ignore them while paused.
    const otherTab = await context.newPage();
    await otherTab.goto("/baseline");
    await otherTab.waitForTimeout(800);
    await otherTab.close();
    await page.waitForTimeout(800);
    const after = await p.locator(".lane-row").count();
    expect(after).toBe(before);
  });

  test("[#17.16] tracking-paused state persists across reload", async ({
    page,
  }) => {
    await page.goto("/baseline");
    await openPanel(page);
    await setTracking(page, "off");
    const stored = await page.evaluate(() =>
      localStorage.getItem("__rsc_observer_tracking"),
    );
    expect(stored).toBe("off");
    await page.reload();
    await page.waitForFunction(() => {
      const el = document.querySelector("rsc-observer-overlay");
      return Boolean(el?.shadowRoot);
    });
    const p = panel(page);
    await expect(p.locator(".panel-tracking")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(
      p.locator(".panel-title-group .rec-dot"),
    ).toHaveAttribute("data-active", "false");
  });

  test("[#17.17] maximize glyph swaps from □ to ⧉", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const max = p.locator(".panel-maximize");
    await expect(max).toHaveText("□");
    await max.click();
    await expect(max).toHaveText("⧉");
    await max.click();
    await expect(max).toHaveText("□");
  });
});

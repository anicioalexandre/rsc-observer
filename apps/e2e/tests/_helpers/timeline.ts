import type { Locator, Page } from "@playwright/test";
import { panel } from "./overlay";
// re-export so specs can `import { panel }` from here too if convenient
export { panel };

// The ruler at the top of the timeline. Click/drag here moves the
// scrubber.
export function rulerHost(page: Page): Locator {
  return panel(page).locator(".unified-timeline-scale-host");
}

// The lane surface (everything below the ruler, excluding the 170px
// sticky gutter). Drag here to draw a zoom-selection box.
export function timelineSurface(page: Page): Locator {
  return panel(page).locator(".unified-timeline-surface");
}

// Move the scrubber by clicking the ruler at a given fraction (0 = left
// edge of ruler content, 1 = right). Resolves once the scrubber line is
// at that position to within a pixel.
export async function clickScrubberAt(
  page: Page,
  fraction: number,
): Promise<void> {
  const ruler = rulerHost(page);
  const box = await ruler.boundingBox();
  if (!box) throw new Error("ruler not visible");
  const x = box.x + box.width * Math.max(0, Math.min(1, fraction));
  const y = box.y + box.height / 2;
  await page.mouse.click(x, y);
}

// Drag-zoom: pointer-down at fraction `from` of the lane content area,
// move to `to`, release. > 4px movement is required for the zoom to
// commit (matches UnifiedTimeline's threshold). Resolves once the
// resulting viewport has propagated through React state — i.e. once the
// `.zoom-reset` reset button has rendered in the gutter.
export async function dragZoom(
  page: Page,
  fromFraction: number,
  toFraction: number,
): Promise<void> {
  const surface = timelineSurface(page);
  const box = await surface.boundingBox();
  if (!box) throw new Error("timeline surface not visible");
  const GUTTER_PX = 170;
  const contentWidth = box.width - GUTTER_PX;
  const x0 = box.x + GUTTER_PX + contentWidth * fromFraction;
  const x1 = box.x + GUTTER_PX + contentWidth * toFraction;
  const y = box.y + box.height / 2;
  await page.mouse.move(x0, y);
  await page.mouse.down();
  await page.mouse.move(x0 + 5, y, { steps: 3 });
  await page.mouse.move(x1, y, { steps: 8 });
  await page.mouse.up();
  // Wait for React to commit the viewport state — the reset-zoom button
  // appears in the gutter as visible feedback. If it never shows, either
  // the drag didn't cross the 4px threshold or the session duration was
  // <1ms (dragZoom skips the commit).
  await panel(page)
    .locator(".zoom-reset")
    .waitFor({ state: "visible", timeout: 3000 });
}

// Return true if the timeline is currently zoomed (i.e. the ↺ reset-zoom
// button is rendered in the gutter).
export async function isZoomed(page: Page): Promise<boolean> {
  return (await panel(page).locator(".zoom-reset").count()) > 0;
}

export function resetZoomButton(page: Page): Locator {
  return panel(page).locator(".zoom-reset");
}

// Filter chips live inside the chrome "▾" popover in the title bar.
// Tests must call `openChromePopover(page)` before reaching for chips.
// Clicking toggles the matching lane category in the FilterState.hidden Set.
export function filterChip(page: Page, label: string): Locator {
  return panel(page).getByRole("button", {
    name: new RegExp(`^${label}$`, "i"),
  });
}

// URL substring filter input. `placeholder` is "filter by URL…". Lives
// inside the chrome popover when the panel is in compact mode.
export function urlFilterInput(page: Page): Locator {
  return panel(page).getByPlaceholder(/filter by url/i);
}

// Opens the chrome popover (the "▾" button next to "×" in the title bar)
// if it isn't already visible. Idempotent.
export async function openChromePopover(page: Page): Promise<void> {
  const p = panel(page);
  const popover = p.locator(".panel-chrome-popover");
  if (await popover.isVisible().catch(() => false)) return;
  await p.locator(".panel-chrome-trigger").click();
  await popover.waitFor({ state: "visible" });
}

export function chromeTrigger(page: Page): Locator {
  return panel(page).locator(".panel-chrome-trigger");
}

export function chromePopover(page: Page): Locator {
  return panel(page).locator(".panel-chrome-popover");
}

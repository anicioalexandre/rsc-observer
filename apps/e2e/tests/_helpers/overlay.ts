import type { Locator, Page } from "@playwright/test";

// All overlay UI lives inside <rsc-observer-overlay>'s shadow root. With
// the addInitScript patch in _fixtures.ts forcing mode: "open", Playwright's
// locator engine pierces transparently — so most queries can be written
// against the shadow root the same way as any other DOM.

export function overlayHost(page: Page): Locator {
  return page.locator("rsc-observer-overlay");
}

// The toggle button is bottom-right, attached directly to the overlay's
// shadow root (not nested under the panel). Its aria-label flips between
// "Open rsc-observer" and "Close rsc-observer" depending on state.
export function toggleButton(page: Page): Locator {
  return overlayHost(page).getByRole("button", {
    name: /(open|close) rsc-observer/i,
  });
}

export function panel(page: Page): Locator {
  return overlayHost(page).locator(".panel");
}

// Wait for the overlay's IIFE bundle to have mounted both the toggle and
// (optionally) the panel React tree. Useful in tests that need to interact
// with the panel right after navigation.
export async function openPanel(page: Page): Promise<Locator> {
  const btn = toggleButton(page);
  await btn.waitFor({ state: "visible" });
  const isOpen = (await btn.getAttribute("data-open")) === "true";
  if (!isOpen) await btn.click();
  const p = panel(page);
  await p.waitFor({ state: "visible" });
  return p;
}

export async function closePanel(page: Page): Promise<void> {
  const btn = toggleButton(page);
  const isOpen = (await btn.getAttribute("data-open")) === "true";
  if (isOpen) await btn.click();
}

// Lane group locator. The text label is uppercase ("SERVER", "DATA FETCH",
// "CLIENT") inside .lane-group-header.
export function laneGroup(page: Page, label: string): Locator {
  return panel(page)
    .locator(".lane-group", {
      has: page.locator(".lane-group-header", { hasText: label }),
    });
}

// One row in a lane, identified by a substring match against the URL it
// shows in its label gutter. e.g. laneRow(page, "/waterfall") for the
// /waterfall request row.
export function laneRow(page: Page, urlSubstring: string): Locator {
  return panel(page).locator(".lane-row", { hasText: urlSubstring });
}

// The floating details popover. Appears when hover or pin is active.
export function detailsPopover(page: Page): Locator {
  return overlayHost(page).locator(".details-popover");
}

// Wide panels (>=800px, container query) show a bare "clear" button inline
// in the header; narrow panels tuck "clear events" inside the chrome popover
// (the "▾" menu). Match both so this works regardless of panel width.
// Use `clearStore(page)` to invoke it — it opens the popover first if needed.
export function clearButton(page: Page): Locator {
  return panel(page).getByRole("button", { name: /^clear(?: events?)?$/i });
}

// Click whichever "clear" button is currently reachable: the inline one in
// wide mode, or the one inside the chrome popover (opening it first) in
// narrow mode.
export async function clearStore(page: Page): Promise<void> {
  const p = panel(page);
  if (await clearButton(page).isVisible().catch(() => false)) {
    await clearButton(page).click();
    return;
  }
  await p.locator(".panel-chrome-trigger").click();
  await p.locator(".panel-chrome-popover").waitFor({ state: "visible" });
  await clearButton(page).click();
}

// Switch the preview render mode. The ViewModeToggle renders inline in wide
// mode (≥800px — the panel's 880px default under the 1280px CI viewport) and
// behind the "▾" popover in compact mode. Only open the popover when the
// trigger is actually present; the mode button's accessible name is the same
// in both layouts. Mirrors the mode-aware `clearStore` helper above.
export async function selectViewMode(
  page: Page,
  mode: "visual" | "structural",
): Promise<void> {
  const p = panel(page);
  const trigger = p.locator(".panel-chrome-trigger");
  if (await trigger.isVisible().catch(() => false)) {
    if (
      !(await p
        .locator(".panel-chrome-popover")
        .isVisible()
        .catch(() => false))
    ) {
      await trigger.click();
      await p.locator(".panel-chrome-popover").waitFor({ state: "visible" });
    }
  }
  await p.getByRole("button", { name: mode, exact: true }).click();
}

// Toggle the tracking power button. The button is always visible in the
// title bar (right of the chrome trigger). When tracking is on the
// button is "press to pause" (aria-pressed="false"); when off it's
// "press to resume" (aria-pressed="true").
export async function setTracking(
  page: Page,
  desired: "on" | "off",
): Promise<void> {
  const btn = panel(page).locator(".panel-tracking");
  const isCurrentlyOn =
    (await btn.getAttribute("aria-pressed")) !== "true";
  const want = desired === "on";
  if (isCurrentlyOn === want) return;
  await btn.click();
}

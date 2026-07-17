import { test, expect } from "./_fixtures";
import {
  closePanel,
  openPanel,
  overlayHost,
  panel,
  toggleButton,
  clearButton,
} from "./_helpers/overlay";
import { readOverlayFacts } from "./_helpers/store";

// Phase B smoke. Proves three things a single test:
//   1. The overlay's IIFE bundle loads, defines the custom element, and
//      mounts a shadow root we can read into.
//   2. The toggle button exists in the page and clicking it opens the
//      panel.
//   3. Hitting a route that triggers fetches actually populates the
//      timeline (i.e. the WS pipe + capture pipeline are working).
// If this fails, every other spec will too.

test("[smoke] overlay mounts, panel opens, lanes populate", async ({
  page,
}) => {
  await page.goto("/baseline");

  // Custom element exists, shadow root attached (forced open by fixture).
  await expect(overlayHost(page)).toBeAttached();
  await page.waitForFunction(() => {
    const el = document.querySelector("rsc-observer-overlay");
    return Boolean(el?.shadowRoot);
  });

  // Toggle is visible bottom-right.
  const btn = toggleButton(page);
  await expect(btn).toBeVisible();

  // Panel is closed initially (default: localStorage empty).
  await expect(panel(page)).toBeHidden();

  // Open it. Visible, contains the rsc-observer title.
  const p = await openPanel(page);
  await expect(p).toBeVisible();
  await expect(
    p.getByText(/^rsc-observer$/i, { exact: false }),
  ).toBeVisible();

  // Hitting /waterfall should give us at least one SERVER lane row.
  // We use the helper that reads facts directly from the shadow root —
  // dedup runs on the rendered list so this is what the user actually
  // sees.
  await page.goto("/waterfall");
  await openPanel(page);
  // Wait for at least one server lane row to appear (HTML or RSC).
  await page.waitForFunction(() => {
    const root = document.querySelector("rsc-observer-overlay")?.shadowRoot;
    if (!root) return false;
    const groups = Array.from(root.querySelectorAll(".lane-group"));
    const server = groups.find((g) =>
      g.querySelector(".lane-group-header")?.textContent?.includes("SERVER"),
    );
    return Boolean(
      server && server.querySelectorAll(".lane-row").length > 0,
    );
  });

  const facts = await readOverlayFacts(page);
  expect(facts.panelOpen).toBe(true);
  expect(facts.serverLaneRowCount).toBeGreaterThan(0);

  // Clear should empty out the timeline.
  await clearButton(page).click();
  // After clear we expect no rows. allow a brief moment for re-render.
  await page.waitForFunction(() => {
    const root = document.querySelector("rsc-observer-overlay")?.shadowRoot;
    if (!root) return false;
    return root.querySelectorAll(".lane-row").length === 0;
  });

  // Panel close persists.
  await closePanel(page);
  await expect(panel(page)).toBeHidden();
});

import { test, expect } from "./_fixtures";
import { openPanel, panel } from "./_helpers/overlay";
import {
  filterChip,
  openChromePopover,
  urlFilterInput,
} from "./_helpers/timeline";

// Spec 03 — filter bar, now hosted inside the title bar's "▾" chrome
// popover. Five chips toggle lane categories; URL input substring-filters
// request rows.
//
// FilterState.hidden semantics: chip in `hidden` Set = lane category is
// hidden. So clicking a chip flips it from "active" to "off" (greyed).

test.describe("filter bar", () => {
  test("[#03.1] all five chips render in the chrome popover", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await openChromePopover(page);
    const labels = ["RSC", "HTML", "Actions", "Fetches", "Client"];
    for (const l of labels) {
      await expect(p.getByRole("button", { name: l })).toHaveCount(1);
    }
  });

  test("[#03.2] all chips start active (no .filter-chip-off class)", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await openChromePopover(page);
    const offCount = await p.locator(".filter-chip-off").count();
    expect(offCount).toBe(0);
  });

  test("[#03.3] clicking a chip toggles its off state", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await openChromePopover(page);
    const rscChip = filterChip(page, "RSC");
    await expect(rscChip).not.toHaveClass(/filter-chip-off/);
    await rscChip.click();
    await expect(rscChip).toHaveClass(/filter-chip-off/);
    await rscChip.click();
    await expect(rscChip).not.toHaveClass(/filter-chip-off/);
  });

  test("[#03.4] hiding RSC removes RSC lane rows from the timeline", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    // Wait for both RSC and HTML rows on /waterfall.
    await p.locator(".lane-row .badge-rsc").first().waitFor();
    const rscBefore = await p.locator(".lane-row .badge-rsc").count();
    expect(rscBefore).toBeGreaterThan(0);
    await openChromePopover(page);
    await filterChip(page, "RSC").click();
    // RSC rows should disappear after the filter applies.
    await expect(p.locator(".lane-row .badge-rsc")).toHaveCount(0);
    // HTML rows should still be there.
    await expect(p.locator(".lane-row .badge-html").first()).toBeVisible();
  });

  test("[#03.5] hiding HTML removes HTML lane rows", async ({ page }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p.locator(".lane-row .badge-html").first().waitFor();
    await openChromePopover(page);
    await filterChip(page, "HTML").click();
    await expect(p.locator(".lane-row .badge-html")).toHaveCount(0);
  });

  test("[#03.6] hiding Fetches empties the DATA FETCH group", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    const dataFetchHeader = p.locator(".lane-group-header", {
      hasText: "DATA FETCH",
    });
    await dataFetchHeader.waitFor();
    const rowsBefore = await dataFetchHeader.locator("..").locator(".lane-row").count();
    expect(rowsBefore).toBeGreaterThan(0);
    await openChromePopover(page);
    await filterChip(page, "Fetches").click();
    await expect(
      dataFetchHeader.locator("..").locator(".lane-row"),
    ).toHaveCount(0);
  });

  test("[#03.7] hiding Client hides every CLIENT sub-row at once", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    const clientHeader = p.locator(".lane-group-header", { hasText: "CLIENT" });
    await clientHeader.waitFor();
    await clientHeader.locator("..").locator(".lane-row").first().waitFor();
    await openChromePopover(page);
    await filterChip(page, "Client").click();
    await expect(
      clientHeader.locator("..").locator(".lane-row"),
    ).toHaveCount(0);
  });

  test("[#03.8] url substring input filters lane rows by URL", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/waterfall" }).first().waitFor();
    await openChromePopover(page);
    await urlFilterInput(page).fill("/api/delay");
    await expect(
      p.locator(".lane-row", { hasText: "/waterfall", hasNotText: "/api/delay" }),
    ).toHaveCount(0);
  });

  test("[#03.9] url filter is case-insensitive", async ({ page }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/waterfall" }).first().waitFor();
    await openChromePopover(page);
    await urlFilterInput(page).fill("/API/DELAY");
    await expect(
      p.locator(".lane-row", { hasText: "/api/delay" }).first(),
    ).toBeVisible();
  });

  test("[#03.10] url filter empties request lanes and clearing restores them", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/waterfall" }).first().waitFor();
    await openChromePopover(page);
    await urlFilterInput(page).fill("nothing-matches-this");
    // CURRENT BEHAVIOUR: url substring only filters request-shaped lanes
    // (SERVER + DATA FETCH). Client-side rows (NAV/PERF/CHUNKS/FETCH) are
    // not URL-filtered, so they keep their ground-state.
    await expect(p.locator(".lane-row .badge-rsc")).toHaveCount(0);
    await expect(p.locator(".lane-row .badge-html")).toHaveCount(0);
    await urlFilterInput(page).fill("");
    await expect(
      p.locator(".lane-row", { hasText: "/waterfall" }).first(),
    ).toBeVisible();
  });

  test("[#03.11] chip + url filter compose (AND)", async ({ page }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/waterfall" }).first().waitFor();
    await openChromePopover(page);
    await filterChip(page, "RSC").click();
    await urlFilterInput(page).fill("/waterfall");
    await expect(p.locator(".lane-row .badge-rsc")).toHaveCount(0);
    await expect(
      p
        .locator(".lane-row", { hasText: "/waterfall" })
        .filter({ has: page.locator(".badge-html") })
        .first(),
    ).toBeVisible();
  });
});

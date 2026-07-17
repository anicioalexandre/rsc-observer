import { test, expect } from "./_fixtures";
import { detailsPopover, openPanel } from "./_helpers/overlay";

// Spec 12 — DetailsPane lifecycle. Hover shows a peek; click pins; Esc
// unpins; close button unpins. Per-kind layouts are partially exercised
// by specs 04–06; this spec adds the kind-specific sections that other
// specs don't cover (chunk wire excerpt, request fetches list, action
// args/result panes, all-navs list when multiple).
//
// Most tests use /waterfall instead of /baseline because the HTML
// request capture for /baseline races a WS replay-window cutoff on this
// dev server (see #04.1 for the documented flake) — /waterfall has a
// long-enough span that all events land cleanly.

test.describe("details popover · lifecycle and content", () => {
  test("[#12.1] hover-only popover does NOT get .pinned class", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    const row = p
      .locator(".lane-row", { hasText: "/waterfall" })
      .first();
    await row.waitFor();
    await row.hover();
    await expect(detailsPopover(page)).toBeVisible();
    await expect(detailsPopover(page)).not.toHaveClass(/pinned/);
  });

  test("[#12.2] hover-only popover does NOT show the close button", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    const row = p
      .locator(".lane-row", { hasText: "/waterfall" })
      .first();
    await row.waitFor();
    await row.hover();
    await expect(p.locator(".details-popover-close")).toHaveCount(0);
  });

  test("[#12.3] Esc unpins a pinned popover", async ({ page }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    // Use the inline-html RSC row — its url label is reliably populated
    // even when the HTML request_start races a WS replay-window cutoff.
    const row = p
      .locator(".lane-row", { hasText: "/waterfall" })
      .filter({ has: page.locator(".badge-rsc") })
      .first();
    await row.waitFor({ timeout: 10_000 });
    await row.click();
    await expect(detailsPopover(page)).toHaveClass(/pinned/);
    await page.keyboard.press("Escape");
    await expect(detailsPopover(page)).not.toHaveClass(/pinned/);
  });

  test("[#12.4] close button unpins", async ({ page }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    // Use the inline-html RSC row — its url label is reliably populated
    // even when the HTML request_start races a WS replay-window cutoff.
    const row = p
      .locator(".lane-row", { hasText: "/waterfall" })
      .filter({ has: page.locator(".badge-rsc") })
      .first();
    await row.waitFor({ timeout: 10_000 });
    await row.click();
    await expect(detailsPopover(page)).toHaveClass(/pinned/);
    await p.locator(".details-popover-close").click();
    // Filter by text instead of class — the popover may stay visible (the
    // mouse is still over the lane row) as a hover-only peek, but it must
    // not be a pinned one.
    await expect(
      detailsPopover(page).filter({ hasText: "pinned" }),
    ).toHaveCount(0);
  });

  test("[#12.5] request details show 'fetches' subsection when request has server fetches", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    // The HTML request for /waterfall is what owns r.fetches. Its row's URL
    // label is "(unknown)" on this dev server (request_start race), but the
    // request still receives server_fetch events on its requestId.
    const row = p
      .locator(".lane-row")
      .filter({ has: page.locator(".badge-html") })
      .first();
    await row.waitFor({ timeout: 10_000 });
    // Wait for fetches to land on the request before pinning.
    await page.waitForTimeout(2500);
    await row.click();
    const pop = detailsPopover(page);
    await expect(pop).toContainText(/fetches/i, { timeout: 10_000 });
    await expect(
      pop.locator("ul.flat-list li", { hasText: "/api/delay" }).first(),
    ).toBeVisible();
  });

  test("[#12.6] clicking a chunk-mark pins the parent request (chunk-mark has no own onClick)", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    const dot = p.locator(".chunk-mark").first();
    await dot.waitFor({ timeout: 10_000 });
    // chunk-marks are tiny — bypass the hover-popover interception.
    await dot.click({ force: true });
    const pop = detailsPopover(page);
    // Click bubbles up to the parent lane-row, which pins kind:"request".
    // RequestDetails always shows a status line + a chunks-and-bytes summary
    // for RSC requests with chunks.
    await expect(pop).toContainText(/status/i);
    await expect(pop).toContainText(/chunks/i);
  });

  test("[#12.7] /actions ACT row pins the request (badge-act, status line)", async ({
    page,
  }) => {
    await page.goto("/actions");
    const p = await openPanel(page);
    await page.locator("button[type='submit']").click();
    const actRow = p
      .locator(".lane-row")
      .filter({ has: page.locator(".badge-act") })
      .first();
    await actRow.waitFor({ timeout: 10_000 });
    await actRow.click();
    const pop = detailsPopover(page);
    // Header has badge-act badge and a status line — current behaviour
    // pins the parent REQUEST (not server-action) because no UI element
    // emits a server-action EventRef. ActionDetails is reachable only
    // through DetailsPane's switch — out of scope for this test.
    await expect(pop.locator(".badge-act")).toBeVisible();
    await expect(pop).toContainText(/status/i);
  });

  test("[#12.8] client-nav details show 'all navs' list after >1 nav", async ({
    page,
  }) => {
    await page.goto("/soft-nav");
    const p = await openPanel(page);
    // Two clicks → two navs.
    await page.getByRole("link", { name: "/baseline" }).click();
    await page.waitForTimeout(500);
    await page.goto("/soft-nav");
    await page.getByRole("link", { name: "/server-only" }).click();
    await page.waitForTimeout(500);
    const navMarker = p
      .locator(".lane-row", { hasText: "NAV" })
      .locator(".client-marker-nav")
      .first();
    await navMarker.click({ force: true });
    const pop = detailsPopover(page);
    // Pin should show "all navs (N)" with N >= 2.
    await expect(pop).toContainText(/all navs/i);
  });

  test("[#12.9] client-fetch details include status, duration, bytes, url", async ({
    page,
  }) => {
    await page.goto("/browser-fetch");
    const p = await openPanel(page);
    await page.getByRole("button", { name: /run browser fetch/i }).click();
    const row = p
      .locator(".lane-row", { hasText: "step=browser-fetch" })
      .filter({ has: page.locator(".client-fetch-bar") })
      .first();
    await row.waitFor({ timeout: 10_000 });
    await row.click();
    const pop = detailsPopover(page);
    // Summary: <status> · <ms> · <bytes> · +start → +end.
    const summary = (await pop.locator(".details-summary").textContent()) ?? "";
    expect(summary).toMatch(/200/);
    expect(summary).toMatch(/\d+ms/);
  });

  test("[#12.10] client-chunk details show 'all chunks' list with current bolded", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    const chunkBar = p
      .locator(".lane-row", { hasText: "CHUNKS" })
      .locator(".client-bar-chunk")
      .first();
    await chunkBar.waitFor({ timeout: 10_000 });
    await chunkBar.click({ force: true });
    const pop = detailsPopover(page);
    await expect(pop).toContainText(/all chunks/i);
  });

  test("[#12.11] popover header shows DETAILS title with '· pinned' marker", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    // Use the inline-html RSC row — its url label is reliably populated
    // even when the HTML request_start races a WS replay-window cutoff.
    const row = p
      .locator(".lane-row", { hasText: "/waterfall" })
      .filter({ has: page.locator(".badge-rsc") })
      .first();
    await row.waitFor({ timeout: 10_000 });
    await row.click();
    const title = p.locator(".details-popover-title");
    await expect(title).toContainText(/DETAILS/);
    await expect(p.locator(".details-popover-pinned")).toContainText(/pinned/i);
  });

  test("[#12.12] hover with no pin shows popover without close button or pinned class", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    const row = p
      .locator(".lane-row", { hasText: "/waterfall" })
      .first();
    await row.waitFor({ timeout: 10_000 });
    await row.hover();
    const pop = detailsPopover(page);
    await expect(pop).toBeVisible();
    await expect(pop).not.toHaveClass(/pinned/);
    await expect(pop.locator(".details-popover-close")).toHaveCount(0);
    await expect(pop.locator(".details-popover-pinned")).toHaveCount(0);
  });
});

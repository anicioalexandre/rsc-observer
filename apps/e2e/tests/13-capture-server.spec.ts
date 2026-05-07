import { test, expect } from "./_fixtures";
import { detailsPopover, openPanel } from "./_helpers/overlay";

// Spec 13 — server-side capture pipeline. Verifies request_start /
// request_end / server_fetch / server_action lands in the store and that
// the inline-html scanner emits chunks with monotonically advancing
// timestamps for streaming responses.

// Run serially: per-route compile cache stays warm across tests; the
// dev server is stable enough this way.
test.describe.configure({ mode: "serial" });

test.describe("capture · server", () => {
  test("[#13.1] request_start fires for /waterfall (RSC inline-html-* row appears)", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await expect(
      p
        .locator(".lane-row", { hasText: "/waterfall" })
        .filter({ has: page.locator(".badge-rsc") })
        .first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("[#13.2] request shows a status code once request_end fires", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    const row = p
      .locator(".lane-row", { hasText: "/waterfall" })
      .filter({ has: page.locator(".badge-rsc") })
      .first();
    await row.waitFor({ timeout: 10_000 });
    await page.waitForTimeout(2000);
    await row.click();
    const pop = detailsPopover(page);
    // RequestDetails summary always reads "status <N>" once the request
    // finishes. For an open request this would be "status ?".
    await expect(pop.locator(".details-summary")).toContainText(/status\s*\d+/);
  });

  test("[#13.3] server_fetch entries are listed under their parent request", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    // The HTML row's url label may say "(unknown)" when the request_start
    // races the WS replay-window cutoff — but the request still receives
    // server_fetch events and renders them.
    const row = p
      .locator(".lane-row")
      .filter({ has: page.locator(".badge-html") })
      .first();
    await row.waitFor({ timeout: 10_000 });
    await page.waitForTimeout(2500);
    await row.click();
    const pop = detailsPopover(page);
    await expect(pop).toContainText(/fetches/i);
    await expect(
      pop.locator("ul.flat-list li", { hasText: "/api/delay" }).first(),
    ).toBeVisible();
  });

  test("[#13.4] server_action emits an ACT row on /actions form submit", async ({
    page,
  }) => {
    await page.goto("/actions");
    const p = await openPanel(page);
    await page.locator("button[type='submit']").click();
    await expect(
      p.locator(".lane-row").filter({ has: page.locator(".badge-act") }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("[#13.5] /baseline emits at least one rsc_chunk (chunk-mark dots present)", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await expect(p.locator(".chunk-mark").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("[#13.6] /deep-stream emits chunks across the streaming window", async ({
    page,
  }) => {
    await page.goto("/deep-stream");
    const p = await openPanel(page);
    // Stream resolves over ~1.5s; wait long enough for all 5 levels.
    await page.waitForTimeout(2500);
    const dots = p.locator(".chunk-mark");
    expect(await dots.count()).toBeGreaterThan(3);
  });

  test("[#13.7] /deep-stream chunk timestamps are monotonically non-decreasing", async ({
    page,
  }) => {
    await page.goto("/deep-stream");
    const p = await openPanel(page);
    await page.waitForTimeout(2500);
    const dots = p.locator(".chunk-mark");
    const count = await dots.count();
    expect(count).toBeGreaterThan(1);
    // Each chunk-mark's `left` style is computed from chunk.t. If the
    // server is recording write timestamps correctly, the percentage
    // values should be monotonically non-decreasing across the row.
    let prev = -Infinity;
    for (let i = 0; i < count; i++) {
      const style = (await dots.nth(i).getAttribute("style")) ?? "";
      const m = style.match(/left:\s*([\d.]+)%/);
      expect(m).not.toBeNull();
      const v = parseFloat(m![1]!);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  test("[#13.8] /deep-stream RSC summary shows total chunk count + bytes", async ({
    page,
  }) => {
    await page.goto("/deep-stream");
    const p = await openPanel(page);
    await page.waitForTimeout(2500);
    const row = p
      .locator(".lane-row", { hasText: "/deep-stream" })
      .filter({ has: page.locator(".badge-rsc") })
      .first();
    await row.waitFor({ timeout: 10_000 });
    await row.click();
    const pop = detailsPopover(page);
    await expect(pop.locator(".details-summary")).toContainText(/\d+ chunks/);
    await expect(pop.locator(".details-summary")).toContainText(/[KMG]?B/);
  });

  test("[#13.9] inline-html-* request id is hidden in the timeline label (URL is canonical)", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    const row = p
      .locator(".lane-row", { hasText: "/waterfall" })
      .filter({ has: page.locator(".badge-rsc") })
      .first();
    await row.waitFor({ timeout: 10_000 });
    // The label gutter shows r.url (canonical "/waterfall"), NOT the
    // synthetic "inline-html-{uuid}" id.
    const label = (await row.locator(".lane-url").textContent()) ?? "";
    expect(label).toMatch(/^\/waterfall/);
    expect(label).not.toMatch(/inline-html/);
  });

  test("[#13.10] /actions request shows ACT badge in pinned details", async ({
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
    await expect(pop.locator(".badge-act")).toBeVisible();
  });
});

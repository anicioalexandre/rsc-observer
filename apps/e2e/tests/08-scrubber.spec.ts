import { test, expect } from "./_fixtures";
import { openPanel, panel } from "./_helpers/overlay";
import { clickScrubberAt, dragZoom, rulerHost } from "./_helpers/timeline";

// Spec 08 — the scrubber overlays the lane surface and tracks "current
// time" in the captured session. Click on the ruler to jump; drag the
// handle to scan; the label uses formatTimeLabel (ms or s).

test.describe("scrubber", () => {
  test("[#08.1] scrubber renders with handle and label", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/baseline" }).first().waitFor();
    await expect(p.locator(".scrubber")).toHaveCount(1);
    await expect(p.locator(".scrubber-handle")).toHaveCount(1);
    await expect(p.locator(".scrubber-label")).toHaveCount(1);
  });

  test("[#08.2] clicking the ruler at ~50% positions the scrubber near 50%", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/waterfall" }).first().waitFor();
    // Wait for fetches to land so the session has nontrivial duration.
    await page.waitForTimeout(2000);
    await clickScrubberAt(page, 0.5);
    const left = (await p.locator(".scrubber").getAttribute("style")) ?? "";
    // .scrubber's `left` is a percentage. Allow a generous tolerance —
    // currentT may snap to the nearest event if the store does so.
    const m = left.match(/left:\s*([\d.]+)%/);
    expect(m).not.toBeNull();
    const pct = parseFloat(m![1]!);
    expect(pct).toBeGreaterThan(30);
    expect(pct).toBeLessThan(70);
  });

  test("[#08.3] clicking the ruler at the far left positions scrubber near 0%", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/waterfall" }).first().waitFor();
    await page.waitForTimeout(1500);
    await clickScrubberAt(page, 0.02);
    const left = (await p.locator(".scrubber").getAttribute("style")) ?? "";
    const m = left.match(/left:\s*([\d.]+)%/);
    expect(m).not.toBeNull();
    expect(parseFloat(m![1]!)).toBeLessThan(15);
  });

  test("[#08.4] dragging the ruler updates scrubber position continuously", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/waterfall" }).first().waitFor();
    await page.waitForTimeout(1500);
    const ruler = rulerHost(page);
    const box = await ruler.boundingBox();
    if (!box) throw new Error("ruler not visible");
    // Press at 20%, drag to 80%, release.
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2, {
      steps: 5,
    });
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, {
      steps: 5,
    });
    await page.mouse.up();
    const left = (await p.locator(".scrubber").getAttribute("style")) ?? "";
    const m = left.match(/left:\s*([\d.]+)%/);
    expect(m).not.toBeNull();
    expect(parseFloat(m![1]!)).toBeGreaterThan(60);
  });

  test("[#08.5] scrubber label uses ms format below 1 second", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/baseline" }).first().waitFor();
    // /baseline finishes well under a second — label should read e.g. "42ms".
    await clickScrubberAt(page, 0.4);
    const txt = (await p.locator(".scrubber-label").textContent()) ?? "";
    expect(txt).toMatch(/\d+\s*ms/i);
  });

  test("[#08.6] scrubber label uses seconds format above 1 second", async ({
    page,
  }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/waterfall" }).first().waitFor();
    // /waterfall + chunk loads + perf entries usually keep the session
    // around 1.5–4 seconds. Wait long enough for that to settle.
    await page.waitForTimeout(3500);
    await clickScrubberAt(page, 0.95);
    const txt = (await p.locator(".scrubber-label").textContent()) ?? "";
    // Should match either "1.20s" style or fall back to large ms count.
    expect(txt).toMatch(/(\d+\.\d{1,2}s|\d{4,}\s*ms)/);
  });

  test("[#08.7] scale ticks render TICK_COUNT labels", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/baseline" }).first().waitFor();
    const ticks = p.locator(".timeline-tick");
    expect(await ticks.count()).toBeGreaterThan(2);
    const labels = p.locator(".timeline-tick-label");
    expect(await labels.count()).toEqual(await ticks.count());
  });

  test("[#08.8] first scale label has .first modifier and last has .last", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/baseline" }).first().waitFor();
    await expect(
      p.locator(".timeline-tick-label.first"),
    ).toHaveCount(1);
    await expect(
      p.locator(".timeline-tick-label.last"),
    ).toHaveCount(1);
  });

  test("[#08.9] zooming changes the scale label range", async ({ page }) => {
    await page.goto("/waterfall");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/waterfall" }).first().waitFor();
    await page.waitForTimeout(1500);
    const firstBefore =
      (await p.locator(".timeline-tick-label.first").textContent()) ?? "";
    const lastBefore =
      (await p.locator(".timeline-tick-label.last").textContent()) ?? "";
    await dragZoom(page, 0.4, 0.7);
    // After zoom the labels should differ (the first shouldn't be 0 any more,
    // and the last should be shorter than before).
    const firstAfter =
      (await p.locator(".timeline-tick-label.first").textContent()) ?? "";
    const lastAfter =
      (await p.locator(".timeline-tick-label.last").textContent()) ?? "";
    expect(firstAfter).not.toEqual(firstBefore);
    expect(lastAfter).not.toEqual(lastBefore);
  });

  test("[#08.10] scrubber renders at 100% when sessionEnd reaches max events", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await p.locator(".lane-row", { hasText: "/baseline" }).first().waitFor();
    // No explicit click — currentT defaults to sessionEnd, so scrubber sits
    // near the right edge of the timeline.
    await page.waitForTimeout(800);
    const left = (await p.locator(".scrubber").getAttribute("style")) ?? "";
    const m = left.match(/left:\s*([\d.]+)%/);
    expect(m).not.toBeNull();
    expect(parseFloat(m![1]!)).toBeGreaterThan(80);
  });
});

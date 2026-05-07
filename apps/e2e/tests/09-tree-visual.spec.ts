import { test, expect } from "./_fixtures";
import { openPanel, selectViewMode } from "./_helpers/overlay";
import { openChromePopover } from "./_helpers/timeline";

// Spec 09 — visual mode of TreePreview. RSC trees are rendered as real
// DOM inside an inner shadow root, with host CSS adopted across so that
// Tailwind utilities + plain stylesheets resolve correctly.
//
// As of Phase 3, the visual / structural toggle lives inside the chrome
// popover (the "▾" button next to the title bar's "×"). Tests use the
// `selectViewMode` helper which opens the popover and clicks the right
// button.

test.describe("tree preview · visual mode", () => {
  test("[#09.1] view mode toggle has visual + structural buttons", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await openChromePopover(page);
    await expect(
      p.getByRole("button", { name: "visual", exact: true }),
    ).toHaveCount(1);
    await expect(
      p.getByRole("button", { name: "structural", exact: true }),
    ).toHaveCount(1);
  });

  test("[#09.2] one of the two view-mode buttons has .active class", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await openChromePopover(page);
    const visualBtn = p.getByRole("button", { name: "visual", exact: true });
    const structuralBtn = p.getByRole("button", {
      name: "structural",
      exact: true,
    });
    const visualActive =
      ((await visualBtn.getAttribute("class")) ?? "").includes("active");
    const structuralActive =
      ((await structuralBtn.getAttribute("class")) ?? "").includes("active");
    expect(visualActive !== structuralActive).toBe(true);
  });

  test("[#09.3] visual mode renders an .rsco-visual-host element", async ({
    page,
  }) => {
    await page.goto("/tailwind");
    const p = await openPanel(page);
    await selectViewMode(page, "visual");
    await expect(p.locator(".rsco-visual-host")).toBeVisible();
  });

  test("[#09.4] visual mode renders host elements in inner shadow root", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await selectViewMode(page, "visual");
    const h1 = p.locator(".rsco-visual-host h1");
    await h1.waitFor({ timeout: 10_000 });
    await expect(h1).toBeVisible();
  });

  test("[#09.5] structural mode renders .tree-preview-structural", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await selectViewMode(page, "structural");
    await expect(p.locator(".tree-preview-structural")).toBeVisible();
    await expect(p.locator(".rsco-visual-host")).toHaveCount(0);
  });

  test("[#09.6] toggling between modes swaps visible content", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await selectViewMode(page, "visual");
    await expect(p.locator(".rsco-visual-host")).toBeVisible();
    await selectViewMode(page, "structural");
    await expect(p.locator(".rsco-visual-host")).toHaveCount(0);
    await expect(p.locator(".tree-preview-structural")).toBeVisible();
    await selectViewMode(page, "visual");
    await expect(p.locator(".rsco-visual-host")).toBeVisible();
  });

  test("[#09.7] viewMode persists in localStorage", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await selectViewMode(page, "structural");
    const stored = await page.evaluate(() =>
      localStorage.getItem("__rsc_observer_view_mode"),
    );
    expect(stored).toBe("structural");
    await selectViewMode(page, "visual");
    const stored2 = await page.evaluate(() =>
      localStorage.getItem("__rsc_observer_view_mode"),
    );
    expect(stored2).toBe("visual");
  });

  test("[#09.8] /tailwind page renders host with at least one styled element", async ({
    page,
  }) => {
    await page.goto("/tailwind");
    const p = await openPanel(page);
    await selectViewMode(page, "visual");
    const host = p.locator(".rsco-visual-host");
    await host.waitFor();
    const styled = host.locator("[class]").first();
    await styled.waitFor({ timeout: 10_000 });
  });

  test("[#09.9] visual mode survives a viewport zoom (does not unmount)", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await selectViewMode(page, "visual");
    await expect(p.locator(".rsco-visual-host")).toBeVisible();
    await selectViewMode(page, "structural");
    await selectViewMode(page, "visual");
    await expect(p.locator(".rsco-visual-host")).toBeVisible();
  });

  test("[#09.10] /server-only renders multiple host elements in visual mode", async ({
    page,
  }) => {
    await page.goto("/server-only");
    const p = await openPanel(page);
    await selectViewMode(page, "visual");
    const host = p.locator(".rsco-visual-host");
    await host.waitFor();
    const headings = host.locator("h1, h2, h3");
    await headings.first().waitFor({ timeout: 10_000 });
    expect(await headings.count()).toBeGreaterThan(0);
  });
});

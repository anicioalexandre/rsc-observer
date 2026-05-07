import { test, expect } from "./_fixtures";
import { openPanel } from "./_helpers/overlay";

// Spec 11 — the right-side aside in TreePreview holds extra forest
// entries (the html shell, additional page subtrees, "extras"). It
// collapses by default and persists open state in localStorage.

test.describe("tree preview · aside", () => {
  test.beforeEach(async ({ page }) => {
    // Make sure no carry-over localStorage from a previous run leaks the
    // aside state.
    await page.goto("/baseline");
    await page.evaluate(() =>
      localStorage.removeItem("__rsc_observer_aside_open"),
    );
  });

  test("[#11.1] /baseline shows the aside (forest has shell + page)", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    // Default view mode is visual — aside should render alongside.
    await expect(p.locator(".tree-preview-aside")).toBeVisible();
  });

  test("[#11.2] aside is collapsed by default — no .open modifier", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await expect(p.locator(".tree-preview-aside")).toBeVisible();
    await expect(p.locator(".tree-preview-aside.open")).toHaveCount(0);
  });

  test("[#11.3] clicking the toggle expands the aside", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await p.locator(".tree-aside-toggle").click();
    await expect(p.locator(".tree-preview-aside.open")).toHaveCount(1);
    await expect(p.locator(".tree-aside-content")).toBeVisible();
  });

  test("[#11.4] expanded aside shows the 'other subtrees' heading", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await p.locator(".tree-aside-toggle").click();
    await expect(p.locator(".tree-aside-heading")).toContainText(
      /other subtrees/i,
    );
  });

  test("[#11.5] expanded aside lists at least one entry", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await p.locator(".tree-aside-toggle").click();
    expect(await p.locator(".tree-aside-entry").count()).toBeGreaterThan(0);
  });

  test("[#11.6] document shell entry uses the 'document shell' label", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await p.locator(".tree-aside-toggle").click();
    // At least one summary should read "document shell" (the html shell).
    await expect(
      p
        .locator(".tree-aside-summary")
        .filter({ hasText: /document shell/i })
        .first(),
    ).toBeVisible();
  });

  test("[#11.7] toggle button title flips between hide/show messages", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    const toggle = p.locator(".tree-aside-toggle");
    const titleClosed = (await toggle.getAttribute("title")) ?? "";
    expect(titleClosed.toLowerCase()).not.toContain("hide");
    await toggle.click();
    const titleOpen = (await toggle.getAttribute("title")) ?? "";
    expect(titleOpen.toLowerCase()).toContain("hide");
  });

  test("[#11.8] aside open-state persists in localStorage", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await p.locator(".tree-aside-toggle").click();
    const stored = await page.evaluate(() =>
      localStorage.getItem("__rsc_observer_aside_open"),
    );
    expect(stored).toBe("1");
    // Click again to close — value flips.
    await p.locator(".tree-aside-toggle").click();
    const stored2 = await page.evaluate(() =>
      localStorage.getItem("__rsc_observer_aside_open"),
    );
    expect(stored2).toBe("0");
  });

  test("[#11.9] reload picks up persisted open state", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await p.locator(".tree-aside-toggle").click();
    await expect(p.locator(".tree-preview-aside.open")).toHaveCount(1);
    await page.reload();
    const p2 = await openPanel(page);
    await expect(p2.locator(".tree-preview-aside.open")).toHaveCount(1);
  });

  test("[#11.10] each aside entry contains a TreeNode", async ({ page }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await p.locator(".tree-aside-toggle").click();
    // The <details> hasn't been opened yet — but its body wraps a TreeNode.
    // Open the first <details> and assert a tree-fieldset appears inside.
    const firstEntry = p.locator(".tree-aside-entry").first();
    await firstEntry.locator("summary").click();
    await expect(firstEntry.locator(".tree-fieldset").first()).toBeVisible();
  });
});

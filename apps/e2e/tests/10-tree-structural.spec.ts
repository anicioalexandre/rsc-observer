import { test, expect } from "./_fixtures";
import { openPanel, selectViewMode } from "./_helpers/overlay";

// Spec 10 — structural mode of TreePreview. Each tree node is a labelled
// <fieldset> (kind-specific class), legends carry the React element name,
// suspense + client references get extra labels.

async function selectStructural(page: import("@playwright/test").Page) {
  const p = await openPanel(page);
  await selectViewMode(page, "structural");
  await p.locator(".tree-preview-structural").waitFor();
  return p;
}

// Run serially: /mui pulls in the full MUI bundle on first hit and the
// dev server takes ~10s to compile under parallel load. Sharing the
// server across tests in this file lets the second /mui hit the warm
// cache, keeping the suite fast and stable.
test.describe.configure({ mode: "serial" });

test.describe("tree preview · structural mode", () => {
  test("[#10.1] /baseline renders fieldset-shaped tree nodes", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await selectStructural(page);
    await expect(
      p.locator(".tree-preview-structural .tree-fieldset").first(),
    ).toBeVisible();
  });

  test("[#10.2] each fieldset's legend names the element type", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await selectStructural(page);
    const firstLegend = p
      .locator(".tree-preview-structural .tree-fieldset legend .tree-type")
      .first();
    await firstLegend.waitFor();
    const txt = (await firstLegend.textContent())?.trim() ?? "";
    expect(txt.length).toBeGreaterThan(0);
  });

  test("[#10.3] empty elements show a '(no children)' placeholder when present", async ({
    page,
  }) => {
    // Empty placeholder only fires on host elements with no children. /actions
    // renders an <input /> which is exactly that. Client-ref fieldsets don't
    // get the placeholder (TreeNode only emits it on the element branch).
    await page.goto("/actions");
    const p = await selectStructural(page);
    await expect(
      p.locator(".tree-preview-structural .tree-empty").first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("[#10.4] /mui exposes at least one client-ref fieldset", async ({
    page,
  }) => {
    await page.goto("/mui");
    const p = await selectStructural(page);
    // /mui uses MUI's Stack/Typography which all flow through "use client".
    await expect(
      p.locator(".tree-fieldset-client").first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("[#10.5] client-ref legend has 'client' label", async ({ page }) => {
    await page.goto("/mui");
    const p = await selectStructural(page);
    // Same selector strategy as 10.7: the label class only ever exists on
    // a client-ref legend.
    const clientLabel = p.locator(".tree-label-client").first();
    await clientLabel.waitFor({ timeout: 10_000 });
    await expect(clientLabel).toContainText("client");
  });

  test("[#10.6] /nested-suspense renders a suspense fieldset", async ({
    page,
  }) => {
    await page.goto("/nested-suspense");
    const p = await selectStructural(page);
    // After the slow boundaries resolve we expect at least one
    // .tree-fieldset-suspense (resolved).
    await page.waitForTimeout(2500);
    const suspense = p.locator(".tree-fieldset-suspense").first();
    await suspense.waitFor({ timeout: 10_000 });
  });

  test("[#10.7] resolved suspense legend shows 'resolved' label", async ({
    page,
  }) => {
    await page.goto("/nested-suspense");
    const p = await selectStructural(page);
    // Slowest boundary resolves at 3000ms; allow headroom over that.
    await page.waitForTimeout(4000);
    // Pick the resolved label directly — we know there is at least one
    // resolved Suspense after 4s, and labels are only emitted on suspense
    // boundaries so this can't accidentally match anything else.
    const resolvedLabel = p.locator(".tree-label-resolved").first();
    await resolvedLabel.waitFor({ timeout: 10_000 });
    await expect(resolvedLabel).toContainText("resolved");
  });

  test("[#10.8] /deep-stream renders multiple nested fieldsets", async ({
    page,
  }) => {
    await page.goto("/deep-stream");
    const p = await selectStructural(page);
    await page.waitForTimeout(2500);
    const fieldsets = p.locator(".tree-preview-structural .tree-fieldset");
    expect(await fieldsets.count()).toBeGreaterThan(2);
  });

  test("[#10.9] text nodes render as .tree-text", async ({ page }) => {
    await page.goto("/baseline");
    const p = await selectStructural(page);
    // /baseline includes static text inside h1/p — at least one tree-text.
    await expect(
      p.locator(".tree-preview-structural .tree-text").first(),
    ).toBeVisible();
  });

  test("[#10.10] nested fieldsets do exist (depth > 1)", async ({ page }) => {
    await page.goto("/baseline");
    const p = await selectStructural(page);
    // A fieldset inside another fieldset proves we're recursing.
    await expect(
      p
        .locator(".tree-preview-structural .tree-fieldset .tree-fieldset")
        .first(),
    ).toBeVisible();
  });
});

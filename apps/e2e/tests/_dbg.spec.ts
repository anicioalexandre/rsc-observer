import { test } from "./_fixtures";
import { openPanel } from "./_helpers/overlay";

test("debug 15.3 prefetch+nav baseline rows", async ({ page }) => {
  await page.goto("/soft-nav");
  const p = await openPanel(page);
  await page.getByRole("link", { name: "/baseline" }).hover();
  await page.waitForTimeout(800);
  await page.getByRole("link", { name: "/baseline" }).click();
  await p.locator(".lane-row", { hasText: "/baseline" }).first().waitFor({ timeout: 10_000 });
  await page.waitForTimeout(2500);
  const rows = p.locator(".lane-row", { hasText: "/baseline" });
  const n = await rows.count();
  console.log("BASELINE_ROW_COUNT:", n);
  for (let i = 0; i < n; i++) {
    const txt = (await rows.nth(i).textContent()) ?? "";
    const html = await rows.nth(i).innerHTML();
    console.log(`#${i}: ${txt.slice(0, 90)} -- rsc=${html.includes("badge-rsc")} html=${html.includes("badge-html")}`);
  }
});

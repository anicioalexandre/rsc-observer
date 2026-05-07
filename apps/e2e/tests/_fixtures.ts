// Shared Playwright fixture used by every spec. Two responsibilities:
//
// 1. Force every shadow root in the page to mode: "open" before any page
//    script runs. The overlay's overlay-root is intentionally a closed
//    shadow root in production to keep host pages from poking at our chrome
//    — but Playwright's locator engine explicitly does not pierce closed
//    shadow roots ("Locators · Shadow DOM" in the Playwright docs). We
//    monkey-patch Element.prototype.attachShadow at addInitScript time so
//    the override only applies to the test process; production code is
//    untouched and the patch is invisible to the page.
//
// 2. Wait for the overlay to mount before the test body runs, so specs
//    don't race the IIFE bundle's React hydration.
import { test as base, type Page } from "@playwright/test";

export const test = base.extend<{ overlayPage: Page }>({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      const original = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function (init) {
        return original.call(this, { ...init, mode: "open" });
      };
    });
    await use(context);
  },
  // Convenience fixture: a page where we've already waited for the overlay's
  // <rsc-observer-overlay> element to mount and its inner shadow root to
  // exist. Specs that need a "ready" overlay get one without boilerplate.
  overlayPage: async ({ page }, use) => {
    await page.goto("/");
    await page.waitForFunction(() => {
      const el = document.querySelector("rsc-observer-overlay");
      return Boolean(el?.shadowRoot);
    }, { timeout: 10_000 });
    await use(page);
  },
});

export { expect } from "@playwright/test";

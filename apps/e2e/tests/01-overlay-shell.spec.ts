import { test, expect } from "./_fixtures";
import {
  closePanel,
  openPanel,
  overlayHost,
  panel,
  toggleButton,
} from "./_helpers/overlay";

// Spec 01 — the overlay shell. Mounts on every page, toggles open/closed,
// persists, and lives behind a shadow root.

test.describe("overlay shell", () => {
  test("[#01.1] toggle button is present on the home page", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(toggleButton(page)).toBeVisible();
  });

  test("[#01.2] toggle button is present on every demo route", async ({
    page,
  }) => {
    // /error excluded intentionally — see [#01.2b] for the documented
    // current behaviour on Next.js's not-found page.
    const routes = [
      "/baseline",
      "/soft-nav",
      "/owner-stack",
      "/browser-fetch",
      "/tailwind",
      "/mui",
      "/mixed",
      "/server-only",
      "/server-children",
      "/waterfall",
      "/parallel",
      "/deferred-fetch",
      "/nested-suspense",
      "/deep-stream",
      "/actions",
    ];
    for (const r of routes) {
      await page.goto(r);
      await expect(
        toggleButton(page),
        `toggle missing on ${r}`,
      ).toBeVisible();
    }
  });

  test("[#01.2b] CURRENT BEHAVIOUR: overlay does NOT mount on Next's 404 page", async ({
    page,
  }) => {
    // Real observer limitation, captured here so we notice if/when it
    // changes. The IIFE bundle DOES load (you can see it in the network
    // tab) and customElements.get('rsc-observer-overlay') resolves, but
    // entry.ts's auto-attach to document.body either races or is wiped by
    // Next's hydration of the not-found UI. If a future change makes the
    // overlay survive 404s, flip this assertion and merge into [#01.2].
    await page.goto("/error");
    await expect(toggleButton(page)).toHaveCount(0);
    const facts = await page.evaluate(() => ({
      bundleRegistered: Boolean(
        customElements.get("rsc-observer-overlay"),
      ),
      overlayInDom: Boolean(
        document.querySelector("rsc-observer-overlay"),
      ),
    }));
    expect(facts.bundleRegistered).toBe(true);
    expect(facts.overlayInDom).toBe(false);
  });

  test("[#01.3] toggle button has accessible label that flips with state", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const btn = toggleButton(page);
    await expect(btn).toHaveAttribute("aria-label", /open rsc-observer/i);
    await btn.click();
    await expect(btn).toHaveAttribute("aria-label", /close rsc-observer/i);
    await btn.click();
    await expect(btn).toHaveAttribute("aria-label", /open rsc-observer/i);
  });

  test("[#01.4] data-open attribute reflects state", async ({ page }) => {
    await page.goto("/baseline");
    const btn = toggleButton(page);
    await expect(btn).toHaveAttribute("data-open", "false");
    await btn.click();
    await expect(btn).toHaveAttribute("data-open", "true");
  });

  test("[#01.5] panel mounts only when open", async ({ page }) => {
    await page.goto("/baseline");
    // Panel not in the DOM before opening.
    await expect(panel(page)).toHaveCount(0);
    await openPanel(page);
    await expect(panel(page)).toBeVisible();
  });

  test("[#01.6] close (×) button in panel header closes the panel", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await p.getByRole("button", { name: /^close$/i }).click();
    await expect(panel(page)).toHaveCount(0);
  });

  test("[#01.7] open state persists across full page reload", async ({
    page,
  }) => {
    await page.goto("/baseline");
    await openPanel(page);
    await page.reload();
    // After reload the toggle should still report open and panel should
    // be present (driven from localStorage in App/index.tsx).
    await page.waitForFunction(() => {
      const el = document.querySelector("rsc-observer-overlay");
      return Boolean(el?.shadowRoot);
    });
    await expect(toggleButton(page)).toHaveAttribute("data-open", "true");
    await expect(panel(page)).toBeVisible();
    // Cleanup so other tests don't inherit "open" from localStorage.
    await closePanel(page);
  });

  test("[#01.8] closed state persists across full page reload", async ({
    page,
  }) => {
    await page.goto("/baseline");
    await openPanel(page);
    await closePanel(page);
    await page.reload();
    await page.waitForFunction(() => {
      const el = document.querySelector("rsc-observer-overlay");
      return Boolean(el?.shadowRoot);
    });
    await expect(toggleButton(page)).toHaveAttribute("data-open", "false");
    await expect(panel(page)).toHaveCount(0);
  });

  test("[#01.9] overlay attaches a shadow root to the custom element", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const hasShadow = await page.evaluate(() => {
      const el = document.querySelector("rsc-observer-overlay");
      return Boolean(el?.shadowRoot);
    });
    expect(hasShadow).toBe(true);
  });

  test("[#01.10] panel contains the timeline and preview regions", async ({
    page,
  }) => {
    await page.goto("/baseline");
    const p = await openPanel(page);
    await expect(p.locator(".panel-region-timeline")).toHaveCount(1);
    await expect(p.locator(".panel-region-preview")).toHaveCount(1);
    // Title is in the header.
    await expect(p.locator(".panel-title")).toHaveText("rsc-observer");
  });

  test("[#01.11] toggle button position fixed bottom-right", async ({
    page,
  }) => {
    // Sanity: button has the expected layout class and is positioned
    // toward the bottom of the viewport.
    await page.goto("/baseline");
    const btn = toggleButton(page);
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const viewport = page.viewportSize();
    if (!viewport) return;
    expect(viewport.height - (box.y + box.height)).toBeLessThan(80);
    expect(viewport.width - (box.x + box.width)).toBeLessThan(80);
  });

  test("[#01.12] SSR shell injects #rsc-observer-ssr-toggle into the HTML response", async ({
    page,
  }) => {
    // The server-side response wrapper splices a tiny <style> + <button>
    // shell before </body> so the toggle is visible at first paint, well
    // before the IIFE bundle loads. The HTML response itself should
    // therefore mention the SSR id.
    const response = await page.request.get("/baseline");
    const body = await response.text();
    expect(body).toContain("rsc-observer-ssr-toggle");
    expect(body).toContain("<rsc-observer-overlay");
  });

  test("[#01.13] SSR shell button is removed once the IIFE upgrades the custom element", async ({
    page,
  }) => {
    // After /rsc-observer/client.js runs, entry.ts removes the SSR
    // fallback button. The React-rendered toggle inside the shadow root
    // takes over.
    await page.goto("/baseline");
    await page.waitForFunction(() => {
      const el = document.querySelector("rsc-observer-overlay");
      return Boolean(el?.shadowRoot);
    });
    await expect(page.locator("#rsc-observer-ssr-toggle")).toHaveCount(0);
  });
});

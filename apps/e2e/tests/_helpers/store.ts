import type { Page } from "@playwright/test";

// Read minimal store-derived facts from the page. We don't pierce React
// internals; instead we walk the overlay's shadow root (open in tests
// thanks to the fixture) and count rendered DOM. That's noisier than a
// real store hook but doesn't require modifying the bundled overlay code
// to expose internals — and what the user *sees* is exactly what we're
// asserting on.

export interface OverlayFacts {
  panelOpen: boolean;
  serverLaneRowCount: number;
  dataFetchLaneRowCount: number;
  clientLaneRowCount: number;
  hasDetailsPopover: boolean;
  isZoomed: boolean;
}

export async function readOverlayFacts(page: Page): Promise<OverlayFacts> {
  return page.evaluate(() => {
    const overlay = document.querySelector("rsc-observer-overlay");
    const root = overlay?.shadowRoot;
    if (!root) {
      return {
        panelOpen: false,
        serverLaneRowCount: 0,
        dataFetchLaneRowCount: 0,
        clientLaneRowCount: 0,
        hasDetailsPopover: false,
        isZoomed: false,
      };
    }
    const panel = root.querySelector(".panel");
    if (!panel) {
      return {
        panelOpen: false,
        serverLaneRowCount: 0,
        dataFetchLaneRowCount: 0,
        clientLaneRowCount: 0,
        hasDetailsPopover: false,
        isZoomed: false,
      };
    }
    const groups = Array.from(panel.querySelectorAll(".lane-group"));
    const findGroup = (label: string): Element | null =>
      groups.find((g) =>
        g.querySelector(".lane-group-header")?.textContent?.includes(label),
      ) ?? null;
    const countRowsIn = (g: Element | null): number =>
      g ? g.querySelectorAll(".lane-row").length : 0;
    return {
      panelOpen: true,
      serverLaneRowCount: countRowsIn(findGroup("SERVER")),
      dataFetchLaneRowCount: countRowsIn(findGroup("DATA FETCH")),
      clientLaneRowCount: countRowsIn(findGroup("CLIENT")),
      hasDetailsPopover: Boolean(root.querySelector(".details-popover")),
      isZoomed: Boolean(root.querySelector(".zoom-reset")),
    };
  });
}

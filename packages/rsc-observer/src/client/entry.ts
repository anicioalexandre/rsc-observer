import { mountOverlay } from "./ShadowBootstrap/index";

const TAG = "rsc-observer-overlay";
const SSR_TOGGLE_ID = "rsc-observer-ssr-toggle";

// The server may have injected an SSR-rendered <button id="…ssr-toggle">
// alongside the <rsc-observer-overlay> placeholder so the toggle is
// visible at first paint. Once the IIFE loads, the React-rendered toggle
// inside the shadow root takes over, so we remove the SSR fallback.
function removeSsrShell(): void {
  if (typeof document === "undefined") return;
  document.getElementById(SSR_TOGGLE_ID)?.remove();
}

class RscObserverOverlay extends HTMLElement {
  private mounted = false;

  connectedCallback() {
    if (this.mounted) return;
    this.mounted = true;
    mountOverlay(this);
    removeSsrShell();
  }
}

if (typeof window !== "undefined") {
  if (!customElements.get(TAG)) {
    customElements.define(TAG, RscObserverOverlay);
  }

  // If the script loaded after `<rsc-observer-overlay>` was injected by instrumentation-client,
  // the connectedCallback will fire on upgrade. If no element exists yet, create one.
  const ensureHost = () => {
    if (document.querySelector(TAG)) return;
    const el = document.createElement(TAG);
    document.body.appendChild(el);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureHost, { once: true });
  } else {
    ensureHost();
  }
}

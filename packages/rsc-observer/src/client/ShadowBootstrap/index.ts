import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { App } from "../App/index";
import { overlayCss } from "../styles/index";
import { startIngest } from "../ingest/ws-client";
import { installCaptures } from "../capture";
import { clearAll } from "../store";

// Clear in-memory state once per page session (module-level flag).
// Hard refresh reloads the bundle → flag resets → we clear again, matching
// what users expect from devtools: a refresh starts over. HMR re-renders
// don't touch this because the module stays loaded.
let didClearForThisPageSession = false;

export function mountOverlay(host: HTMLElement): { shadow: ShadowRoot; root: Root } {
  if (!didClearForThisPageSession) {
    didClearForThisPageSession = true;
    clearAll();
  }

  // Install client-side captures BEFORE the React mount + WS connect so we
  // catch __next_f.push entries (which run as the HTML body parses).
  installCaptures();

  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = overlayCss;
  shadow.appendChild(style);

  const mountNode = document.createElement("div");
  mountNode.className = "overlay-root";
  shadow.appendChild(mountNode);

  const root = createRoot(mountNode);
  root.render(createElement(App));

  startIngest();

  return { shadow, root };
}

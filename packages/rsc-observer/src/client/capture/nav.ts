import { wallNow } from "../../shared/time";
import { ingestEvent } from "../store";

let installed = false;

function emitNav(navigationType: "push" | "replace" | "traverse", url: string): void {
  ingestEvent({
    kind: "client_nav_start",
    navigationType,
    url,
    t: wallNow(),
  });
}

export function installNavHook(): void {
  if (installed) return;
  installed = true;

  // pushState — programmatic forward navigation (Next router, custom code, etc.)
  const origPush = history.pushState;
  history.pushState = function patched(
    this: History,
    ...args: Parameters<History["pushState"]>
  ): void {
    const url = String(args[2] ?? location.pathname + location.search);
    emitNav("push", url);
    return origPush.apply(this, args);
  };

  // replaceState — same but doesn't add to history
  const origReplace = history.replaceState;
  history.replaceState = function patched(
    this: History,
    ...args: Parameters<History["replaceState"]>
  ): void {
    const url = String(args[2] ?? location.pathname + location.search);
    emitNav("replace", url);
    return origReplace.apply(this, args);
  };

  // popstate — back/forward
  window.addEventListener("popstate", () => {
    emitNav("traverse", location.pathname + location.search);
  });
}

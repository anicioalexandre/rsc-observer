import { installServerPatch } from "./capture/async-context";
import { installFetchWrap } from "./capture/fetch-wrap";
import { isDevEnabled } from "./dev-gate";
import { installWsServer } from "./transport/ws-server";

const INSTALLED_FLAG = Symbol.for("rsc-observer.server-installed");

export function registerServerInstrumentation(): void {
  const g = globalThis as typeof globalThis & { [INSTALLED_FLAG]?: true };
  if (g[INSTALLED_FLAG]) return;

  const gate = isDevEnabled();
  if (!gate.ok) {
    console.warn(`[rsc-observer] disabled: ${gate.reason}`);
    return;
  }

  installServerPatch();
  installFetchWrap();
  installWsServer();
  g[INSTALLED_FLAG] = true;

  console.log("[rsc-observer] server instrumentation active (ws + fetch + http)");
}

registerServerInstrumentation();

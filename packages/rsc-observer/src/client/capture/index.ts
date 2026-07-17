import { installNextFlightHook } from "./next-flight";
import { installNavHook } from "./nav";
import { installPerfObserver } from "./perf-observer";
import { installClientFetchWrap } from "./fetch-wrap";

let installed = false;

export function installCaptures(): void {
  if (installed) return;
  installed = true;
  installNextFlightHook();
  installNavHook();
  installPerfObserver();
  installClientFetchWrap();
}

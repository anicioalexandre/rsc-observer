import { useSyncExternalStore } from "react";
import { subscribe, getVersion } from "./events";

export * from "./events";
export type * from "./types";

export function useStoreVersion(): number {
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}

import { EventEmitter } from "node:events";
import type { Event } from "../../shared/protocol";

const emitter = new EventEmitter();
emitter.setMaxListeners(32);

const DEBUG = process.env.RSC_OBSERVER_DEBUG === "1";

export function emit(event: Event): void {
  if (DEBUG) {
    try {
      process.stdout.write(`[rsc-observer] ${JSON.stringify(event)}\n`);
    } catch {
      // stdout may be closed during shutdown; ignore.
    }
  }
  emitter.emit("event", event);
}

export function onEvent(handler: (event: Event) => void): () => void {
  emitter.on("event", handler);
  return () => emitter.off("event", handler);
}

export const eventBus = emitter;

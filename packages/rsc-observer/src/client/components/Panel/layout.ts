// Shared types + persistence helpers for the panel's window-style chrome.
// Keeps useDraggable / useResizable / Panel decoupled from where exactly
// the values live (localStorage today; could be in-store later).

export interface Position {
  top: number;
  left: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Direction = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

const POS_KEY = "__rsc_observer_panel_pos";
const SIZE_KEY = "__rsc_observer_panel_size";

export function readPosition(): Position | null {
  return readJson<Position>(POS_KEY, isPosition);
}

export function writePosition(p: Position): void {
  writeJson(POS_KEY, p);
}

export function readSize(): Size | null {
  return readJson<Size>(SIZE_KEY, isSize);
}

export function writeSize(s: Size): void {
  writeJson(SIZE_KEY, s);
}

// Default placement: bottom-right corner with a margin, leaving room above
// for the toggle button. Used on first load (no saved layout) and as a
// fallback when the saved layout no longer fits the current viewport.
export function defaultPosition(size: Size): Position {
  if (typeof window === "undefined") return { top: 0, left: 0 };
  const margin = 16;
  const toggleH = 28;
  const left = Math.max(margin, window.innerWidth - size.width - margin);
  const top = Math.max(
    margin,
    window.innerHeight - size.height - toggleH - margin * 2,
  );
  return { left, top };
}

export function defaultSize(): Size {
  if (typeof window === "undefined") return { width: 880, height: 640 };
  const w = Math.min(880, window.innerWidth - 32);
  const h = Math.min(720, Math.floor(window.innerHeight * 0.8));
  return { width: w, height: h };
}

// Read tokens from the panel element so changes in tokens.ts propagate
// automatically. Falls back to iPhone SE dimensions (the design's minimum
// supported screen) if the property isn't resolvable yet.
export function readMinSize(panel: Element | null): Size {
  if (!panel) return { width: 375, height: 667 };
  const cs = getComputedStyle(panel);
  const w = parseInt(cs.getPropertyValue("--panel-min-width") || "375", 10);
  const h = parseInt(cs.getPropertyValue("--panel-min-height") || "667", 10);
  return {
    width: Number.isFinite(w) && w > 0 ? w : 375,
    height: Number.isFinite(h) && h > 0 ? h : 667,
  };
}

function readJson<T>(key: string, guard: (v: unknown) => v is T): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    // storage disabled or full
  }
}

function isPosition(v: unknown): v is Position {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as Position).top === "number" &&
    typeof (v as Position).left === "number"
  );
}

function isSize(v: unknown): v is Size {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as Size).width === "number" &&
    typeof (v as Size).height === "number"
  );
}

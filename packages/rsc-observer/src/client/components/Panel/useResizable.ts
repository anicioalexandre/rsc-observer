import { useCallback, useRef } from "react";
import type { Direction, Position, Size } from "./layout";

interface ResizeHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
}

interface ResizeOptions {
  enabled: boolean;
  position: Position;
  size: Size;
  minSize: Size;
  onChange: (next: { position: Position; size: Size }) => void;
  onCommit: (final: { position: Position; size: Size }) => void;
}

// Eight-handle resize. The handle's `data-resize` attribute names the
// direction (n / s / e / w / nw / ne / sw / se). Each compass point maps to
// "which sides of the rectangle are anchored vs. free": e.g. "nw" means the
// south-east corner is anchored and we adjust top + left + width + height
// from the cursor's delta off the start position.
export function useResizable(opts: ResizeOptions): ResizeHandlers {
  const start = useRef<{
    cursorX: number;
    cursorY: number;
    initial: { position: Position; size: Size };
    direction: Direction;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!opts.enabled) return;
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const dir = e.currentTarget.dataset.resize as Direction | undefined;
      if (!dir) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.stopPropagation();
      start.current = {
        cursorX: e.clientX,
        cursorY: e.clientY,
        initial: { position: { ...opts.position }, size: { ...opts.size } },
        direction: dir,
      };
    },
    [opts.enabled, opts.position.top, opts.position.left, opts.size.width, opts.size.height],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const drag = start.current;
      if (!drag) return;
      const dx = e.clientX - drag.cursorX;
      const dy = e.clientY - drag.cursorY;
      const next = compute(drag.initial, drag.direction, dx, dy, opts.minSize);
      opts.onChange(next);
    },
    [opts.minSize.width, opts.minSize.height, opts.onChange],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      const drag = start.current;
      start.current = null;
      if (!drag) return;
      const dx = e.clientX - drag.cursorX;
      const dy = e.clientY - drag.cursorY;
      opts.onCommit(compute(drag.initial, drag.direction, dx, dy, opts.minSize));
    },
    [opts.minSize.width, opts.minSize.height, opts.onCommit],
  );

  return { onPointerDown, onPointerMove, onPointerUp };
}

function compute(
  initial: { position: Position; size: Size },
  dir: Direction,
  dx: number,
  dy: number,
  min: Size,
): { position: Position; size: Size } {
  let { left, top } = initial.position;
  let { width, height } = initial.size;

  if (dir.includes("e")) width = initial.size.width + dx;
  if (dir.includes("s")) height = initial.size.height + dy;
  if (dir.includes("w")) {
    width = initial.size.width - dx;
    left = initial.position.left + dx;
  }
  if (dir.includes("n")) {
    height = initial.size.height - dy;
    top = initial.position.top + dy;
  }

  // Min-size enforcement. When clamping a "w" or "n" handle, freeze the
  // anchor (right or bottom edge) by pinning position to its initial value
  // plus (initial.size - min).
  if (width < min.width) {
    if (dir.includes("w")) left = initial.position.left + (initial.size.width - min.width);
    width = min.width;
  }
  if (height < min.height) {
    if (dir.includes("n")) top = initial.position.top + (initial.size.height - min.height);
    height = min.height;
  }

  // Keep the panel within the viewport. The drag itself can move the panel
  // off-screen if you grow it from a corner against the edge — simpler to
  // clamp here and let the user drag again to re-center.
  if (typeof window !== "undefined") {
    const SLACK = 0;
    if (left < SLACK) {
      width -= SLACK - left;
      left = SLACK;
    }
    if (top < SLACK) {
      height -= SLACK - top;
      top = SLACK;
    }
    if (left + width > window.innerWidth) {
      width = Math.max(min.width, window.innerWidth - left);
    }
    if (top + height > window.innerHeight) {
      height = Math.max(min.height, window.innerHeight - top);
    }
  }

  return { position: { left, top }, size: { width, height } };
}

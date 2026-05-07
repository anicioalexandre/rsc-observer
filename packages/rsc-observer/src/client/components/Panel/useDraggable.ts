import { useCallback, useRef } from "react";
import type { Position, Size } from "./layout";

interface DragHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
}

interface DragOptions {
  enabled: boolean;
  position: Position;
  size: Size;
  onChange: (next: Position) => void;
  onCommit: (final: Position) => void;
}

// Title-bar drag. Pointer-down records the offset between cursor and panel
// origin; subsequent moves keep that offset constant so the panel "sticks"
// to where the user grabbed it. Persists on pointer-up via onCommit (caller
// writes to localStorage).
export function useDraggable(opts: DragOptions): DragHandlers {
  const start = useRef<{
    cursorX: number;
    cursorY: number;
    originLeft: number;
    originTop: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!opts.enabled) return;
      // Only react to primary mouse button / touch — secondary buttons might
      // be context menu or middle-click scroll.
      if (e.button !== 0 && e.pointerType === "mouse") return;
      e.currentTarget.setPointerCapture(e.pointerId);
      start.current = {
        cursorX: e.clientX,
        cursorY: e.clientY,
        originLeft: opts.position.left,
        originTop: opts.position.top,
      };
    },
    [opts.enabled, opts.position.left, opts.position.top],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const drag = start.current;
      if (!drag) return;
      const dx = e.clientX - drag.cursorX;
      const dy = e.clientY - drag.cursorY;
      const next = clampToViewport(
        { left: drag.originLeft + dx, top: drag.originTop + dy },
        opts.size,
      );
      opts.onChange(next);
    },
    [opts.size.width, opts.size.height, opts.onChange],
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
      opts.onCommit(
        clampToViewport(
          { left: drag.originLeft + dx, top: drag.originTop + dy },
          opts.size,
        ),
      );
    },
    [opts.size.width, opts.size.height, opts.onCommit],
  );

  return { onPointerDown, onPointerMove, onPointerUp };
}

// Hard-clamp: every edge of the panel must remain inside the viewport.
// If the panel is wider/taller than the viewport (extreme resize +
// window shrink) we still pin it to (0, 0) so the user can grab the
// title bar to resize it back down.
function clampToViewport(p: Position, size: Size): Position {
  if (typeof window === "undefined") return p;
  const maxLeft = Math.max(0, window.innerWidth - size.width);
  const maxTop = Math.max(0, window.innerHeight - size.height);
  return {
    left: Math.max(0, Math.min(p.left, maxLeft)),
    top: Math.max(0, Math.min(p.top, maxTop)),
  };
}

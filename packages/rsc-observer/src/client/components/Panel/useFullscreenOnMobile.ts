import { useEffect, useState } from "react";

// Auto-fullscreen when the viewport can't comfortably contain the panel's
// minimum dimensions. We watch BOTH width and height so a short laptop
// window (e.g. someone resized their browser to a thin strip) goes
// fullscreen, not just narrow phones.
//
// Defaults align with the panel-mobile-breakpoint-* tokens — change those
// in tokens.ts and pass new values here to keep the design system as the
// source of truth.
export function useFullscreenOnMobile(
  widthBreakpointPx: number = 640,
  heightBreakpointPx: number = 700,
): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    matchesAny(widthBreakpointPx, heightBreakpointPx),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const wMql = window.matchMedia(`(max-width: ${widthBreakpointPx - 1}px)`);
    const hMql = window.matchMedia(`(max-height: ${heightBreakpointPx - 1}px)`);
    const update = (): void =>
      setIsMobile(wMql.matches || hMql.matches);
    update();
    wMql.addEventListener("change", update);
    hMql.addEventListener("change", update);
    return () => {
      wMql.removeEventListener("change", update);
      hMql.removeEventListener("change", update);
    };
  }, [widthBreakpointPx, heightBreakpointPx]);

  return isMobile;
}

function matchesAny(w: number, h: number): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia(`(max-width: ${w - 1}px)`).matches ||
    window.matchMedia(`(max-height: ${h - 1}px)`).matches
  );
}

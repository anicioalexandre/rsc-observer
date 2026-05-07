import type { NextMiddleware, NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Phase 1: pass-through. Later phases add /rsc-observer/* routes served by this middleware.
export function rscObserverMiddleware(): NextMiddleware {
  return (_req: NextRequest) => NextResponse.next();
}

export function withRscObserver(inner: NextMiddleware): NextMiddleware {
  return async (req, ev) => {
    return inner(req, ev);
  };
}

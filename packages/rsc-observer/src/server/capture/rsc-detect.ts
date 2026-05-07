import type { IncomingMessage, ServerResponse } from "node:http";

export function isRSCRequest(req: IncomingMessage): boolean {
  const h = req.headers;
  if (typeof h["rsc"] === "string") return true;
  if (typeof h["next-router-state-tree"] === "string") return true;
  const accept = h["accept"];
  if (typeof accept === "string" && accept.includes("text/x-component")) return true;
  return false;
}

export function isRSCResponse(res: ServerResponse): boolean {
  const ct = res.getHeader("content-type");
  if (typeof ct !== "string") return false;
  return ct.includes("text/x-component");
}

export function isNextActionRequest(req: IncomingMessage): boolean {
  return typeof req.headers["next-action"] === "string";
}

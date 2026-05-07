// Domain types for the UI's reactive store. The wire Event union lives in shared/protocol.
import type { ParsedSnapshot } from "../parser/types";

export type ServerFetch = {
  id: string;
  url: string;
  method: string;
  start: number;
  end: number;
  status: number;
  sizeBytes: number;
  ownerStack?: string;
};

export type RSCChunk = {
  index: number;
  bytes: number;
  data: string;
  t: number;
};

export type RSCChunkReceived = {
  index: number;
  bytes: number;
  t: number;
};

export type ServerAction = {
  name: string;
  start: number;
  end: number;
  argsPreview: string;
  resultPreview: string;
};

export type RequestError = {
  message: string;
  digest?: string;
};

export type Request = {
  requestId: string;
  url: string;
  method: string;
  isRSC: boolean;
  startTime: number;
  endTime?: number;
  status?: number;
  fetches: ServerFetch[];
  chunks: RSCChunk[];
  chunksReceived: RSCChunkReceived[];
  actions: ServerAction[];
  error?: RequestError;
  lastEventAt: number;
  snapshots: ParsedSnapshot[];
};

// Phase 9 client-side events have their own state slots since they aren't
// tied to a single Request the way fetches/chunks are.
export type ClientNav = {
  url: string;
  navigationType: "push" | "replace" | "traverse";
  t: number;
};

export type ClientPerfEntry = {
  entryType: string;
  name: string;
  t: number;
  duration?: number;
};

export type ClientFetch = {
  id: string;
  url: string;
  method: string;
  start: number;
  end: number;
  status: number;
  sizeBytes: number;
};

export type ClientChunk = {
  url: string;
  chunkType: "script" | "css";
  start: number;
  end: number;
  sizeBytes: number;
};

// Anything drawable on the unified timeline that DetailsPane can focus on.
export type EventRef =
  | { kind: "request"; requestId: string }
  | { kind: "server-fetch"; requestId: string; fetchId: string }
  | { kind: "rsc-chunk"; requestId: string; chunkIndex: number }
  | { kind: "server-action"; requestId: string; actionIndex: number }
  | { kind: "client-perf"; name: string; t: number }
  | { kind: "client-fetch"; fetchId: string }
  | { kind: "client-chunk"; url: string; start: number }
  | { kind: "client-nav"; t: number };

export type FilterState = {
  // One bit per lane category. If a chip is in the set, that category is hidden.
  hidden: Set<"rsc" | "html" | "act" | "fetch" | "client">;
  // Case-insensitive substring match on URL. Empty = no filter.
  urlSubstring: string;
};

// "visual" → render Server Components as real DOM with adopted host CSS.
// "structural" → fieldset-style outline (always available; safe fallback).
export type ViewMode = "visual" | "structural";

import type { FilterState, Request } from "../../store/types";
import { DURATION_BANDS, type DurationClass } from "./constants";

// Total span of the session in ms. Minimum 1ms to avoid divide-by-zero.
export function sessionDuration(sessionZero: number | null, sessionEnd: number | null): number {
  if (sessionZero === null || sessionEnd === null) return 1;
  return Math.max(1, sessionEnd - sessionZero + 20); // tiny right-pad so end-ticks are visible
}

export function classifyDuration(ms: number): DurationClass {
  for (const band of DURATION_BANDS) {
    if (ms < band.max) return band.cls;
  }
  return "critical";
}

// Convert absolute perf.now()-domain time → percentage across the timeline viewport.
export function tToPct(t: number, sessionZero: number, duration: number): number {
  if (duration <= 0) return 0;
  return Math.max(0, Math.min(100, ((t - sessionZero) / duration) * 100));
}

// Inverse: a percent across the timeline → absolute time.
export function pctToT(pct: number, sessionZero: number, duration: number): number {
  return sessionZero + (pct / 100) * duration;
}

export function formatTimeLabel(ms: number): string {
  if (ms < 1) return "0";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Visual gutter on each end of the lane content, expressed as a percentage.
// Without it, bars at t=0 sit flush against the gutter / right border and
// can't be visually distinguished from the chrome. 1% is ~6–8px on a
// typical panel — enough to read as "padding" without compressing the
// useful content area.
export const TIMELINE_PAD_PCT = 1;

// Map a value in the time domain (0..total) into a percentage of the
// lane-content's width, with TIMELINE_PAD_PCT inset on both sides. All
// bars / markers / the scrubber go through this so the time axis is
// consistent across the timeline.
export function pct(value: number, total: number): number {
  if (total <= 0) return TIMELINE_PAD_PCT;
  const raw = Math.max(0, Math.min(100, (value / total) * 100));
  return TIMELINE_PAD_PCT + (raw * (100 - 2 * TIMELINE_PAD_PCT)) / 100;
}

// Inverse of pct(): takes a 0–1 fraction of the visible content width
// (the user's pixel drag, expressed as a proportion of the lane-content
// inner box) and returns the corresponding time-domain value clamped to
// [0, total]. Used by the scrubber click handler and zoom-drag commit so
// a click at the visual left edge maps to t = 0 instead of t = 1% × total.
export function fracToTime(frac: number, total: number): number {
  if (total <= 0) return 0;
  const span = (100 - 2 * TIMELINE_PAD_PCT) / 100;
  const adjusted = (frac - TIMELINE_PAD_PCT / 100) / span;
  return Math.max(0, Math.min(total, adjusted * total));
}

// ——— Filter helpers ———

export function requestMatchesFilter(r: Request, filter: FilterState): boolean {
  if (filter.hidden.has("rsc") && r.isRSC) return false;
  if (filter.hidden.has("html") && !r.isRSC && r.actions.length === 0) return false;
  if (filter.hidden.has("act") && r.actions.length > 0) return false;
  if (filter.urlSubstring) {
    const needle = filter.urlSubstring.toLowerCase();
    if (!r.url.toLowerCase().includes(needle)) return false;
  }
  return true;
}

export function fetchMatchesFilter(url: string, filter: FilterState): boolean {
  if (filter.hidden.has("fetch")) return false;
  if (filter.urlSubstring) {
    const needle = filter.urlSubstring.toLowerCase();
    if (!url.toLowerCase().includes(needle)) return false;
  }
  return true;
}

export function requestBadgeKind(r: Request): "RSC" | "HTML" | "ACT" {
  if (r.actions.length > 0) return "ACT";
  return r.isRSC ? "RSC" : "HTML";
}

// On a single page load, the same logical RSC render can be captured several
// ways:
//
//   1. server-RSC     (UUID requestId; HTTP request our patch saw with RSC headers)
//   2. server-inline  ("inline-html-<uuid>" — flight scripts extracted from
//                     a streaming text/html response, server-side, with
//                     accurate write timestamps)
//   3. client-inline  ("inline-<path>-…" — DOM-scraped __next_f.push from
//                     <script> tags, browser-side, fidelity limited by
//                     when the overlay bundle loaded)
//   4. client-fetch   ("client-rsc-…" — soft-nav fetch tee in fetch-wrap)
//
// Categories 1 and 2 are first-class — both have server-side timestamps.
// Categories 3 and 4 are best-effort fallbacks for cases where the server
// didn't or couldn't observe the chunks. When a category-1 or category-2
// capture exists for a URL, hide the category-3/4 peer to avoid
// double-rendering the same logical thing.
export function isClientSyntheticRequestId(id: string): boolean {
  return id.startsWith("inline-/") || id.startsWith("client-rsc-");
}

function canonicalUrl(url: string): string {
  try {
    const u = new URL(url, "http://x/");
    u.searchParams.delete("_rsc");
    return u.pathname + u.search + u.hash;
  } catch {
    return url;
  }
}

export function dedupRequests(requests: readonly Request[]): Request[] {
  // Authoritative captures: server-side. Anything we capture in Node has
  // accurate write/emit timestamps. Both real RSC requests and the
  // inline-html-* synthetic (extracted from a streaming HTML body server-
  // side) qualify. These hide the client-side fallback peers below.
  const authoritativeRscUrls = new Set<string>();
  for (const r of requests) {
    if (!r.isRSC) continue;
    if (isClientSyntheticRequestId(r.requestId)) continue;
    authoritativeRscUrls.add(canonicalUrl(r.url));
  }
  return requests.filter((r) => {
    if (isClientSyntheticRequestId(r.requestId)) {
      return !authoritativeRscUrls.has(canonicalUrl(r.url));
    }
    // Hide "self-bounce" requests: a Server Component calling
    // fetch("http://localhost:3000/api/foo") shows up twice — once as a
    // server_fetch on the parent request (DATA FETCH lane) and once as a
    // top-level HTTP request our http.Server patch sees (SERVER lane). The
    // SERVER lane copy is noise; the DATA FETCH lane already shows the call.
    if (isSelfBounceRequest(r, requests)) return false;
    return true;
  });
}

function isSelfBounceRequest(
  r: Request,
  all: readonly Request[],
): boolean {
  for (const parent of all) {
    if (parent.requestId === r.requestId) continue;
    for (const f of parent.fetches) {
      if (f.method !== r.method) continue;
      // server_fetch URL is absolute (`http://host/path?q`); request URL is
      // typically the path only. Match either direction.
      if (f.url !== r.url && !f.url.endsWith(r.url)) continue;
      if (Math.abs(f.start - r.startTime) < 100) return true;
    }
  }
  return false;
}

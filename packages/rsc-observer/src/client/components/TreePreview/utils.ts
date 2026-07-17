import type { ParsedSnapshot } from "../../parser/types";
import type { Request } from "../../store/types";

// Pick the most-recent RSC request whose span contains absoluteT. Ties broken
// by most-recently-started. If nothing strictly contains absoluteT (e.g. the
// scrubber is past the request's end because some other event extended
// sessionEnd), fall back to the most recent RSC request that started before
// absoluteT — that's still the request the user was last looking at.
// null absoluteT → pick the latest RSC request overall.
export function pickActiveRscRequest(
  requests: Request[],
  absoluteT: number | null,
): Request | null {
  if (absoluteT === null) {
    return [...requests].reverse().find((r) => r.isRSC) ?? null;
  }
  let containing: Request | null = null;
  let mostRecent: Request | null = null;
  for (const r of requests) {
    if (!r.isRSC) continue;
    if (r.startTime > absoluteT) continue;
    if (!mostRecent || r.startTime > mostRecent.startTime) mostRecent = r;
    const end = r.endTime ?? r.lastEventAt;
    if (end < absoluteT) continue;
    if (!containing || r.startTime > containing.startTime) containing = r;
  }
  return containing ?? mostRecent;
}

// Pick the latest snapshot whose timestamp ≤ absoluteT. Absolute-time semantics
// (unlike the previous relative-to-startTime version).
export function pickSnapshot(
  request: Request,
  absoluteT: number | null,
): ParsedSnapshot | null {
  const { snapshots } = request;
  if (snapshots.length === 0) return null;
  if (absoluteT === null) return snapshots[snapshots.length - 1] ?? null;
  let best: ParsedSnapshot | null = null;
  for (const s of snapshots) {
    if (s.t <= absoluteT) best = s;
  }
  return best ?? snapshots[0]!;
}

export function shortenModuleId(m: string): string {
  const match = m.match(/\/([^/]+)\.(?:[tj]sx?|mjs|cjs)(?:\s|$)/);
  if (match && match[1]) return match[1];
  if (m.length > 48) return "…" + m.slice(-46);
  return m;
}

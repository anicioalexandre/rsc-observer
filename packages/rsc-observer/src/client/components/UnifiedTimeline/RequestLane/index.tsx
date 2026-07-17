import type { Request, EventRef } from "../../../store/types";
import {
  getPinnedEventRef,
  setPinnedEventRef,
  useStoreVersion,
} from "../../../store";
import { ChunkMark } from "../ChunkMark";
import { classifyDuration, pct, requestBadgeKind } from "../utils";

interface Props {
  request: Request;
  sessionZero: number;
  duration: number;
  onHover: (ref: EventRef | null) => void;
}

export function RequestLane({ request: r, sessionZero, duration, onHover }: Props) {
  useStoreVersion();
  const kind = requestBadgeKind(r);
  const endT = r.endTime ?? r.lastEventAt ?? r.startTime + 1;
  const startPct = pct(r.startTime - sessionZero, duration);
  const endPct = pct(endT - sessionZero, duration);
  const widthPct = Math.max(0.2, endPct - startPct);
  const totalDur = Math.max(0, endT - r.startTime);
  const barCls =
    `request-bar request-bar-${kind.toLowerCase()} request-bar-${classifyDuration(totalDur)}`;

  const pinned = getPinnedEventRef();
  const isPinned =
    pinned && pinned.kind === "request" && pinned.requestId === r.requestId;

  const ref: EventRef = { kind: "request", requestId: r.requestId };

  return (
    <div
      className={`lane-row${isPinned ? " pinned" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        setPinnedEventRef(ref);
      }}
      onPointerEnter={() => onHover(ref)}
      onPointerLeave={() => onHover(null)}
    >
      <div className="lane-label">
        <span className={`badge badge-${kind.toLowerCase()}`}>{kind}</span>
        <span className="lane-method">{r.method}</span>
        <span className="lane-url" title={r.url}>
          {r.url || "(unknown)"}
        </span>
      </div>
      <div className="lane-content">
        <div
          className={barCls}
          style={{ left: `${startPct}%`, width: `${widthPct}%` }}
          title={`${r.method} ${r.url} · ${Math.round(totalDur)}ms`}
        />
        {r.chunks.map((c) => (
          <ChunkMark
            key={c.index}
            chunk={c}
            t0={sessionZero}
            duration={duration}
          />
        ))}
      </div>
    </div>
  );
}

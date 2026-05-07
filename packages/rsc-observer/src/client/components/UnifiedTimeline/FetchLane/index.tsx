import type { EventRef, Request, ServerFetch } from "../../../store/types";
import {
  getPinnedEventRef,
  setPinnedEventRef,
  useStoreVersion,
} from "../../../store";
import { FetchBar } from "../FetchBar";

interface Props {
  fetch: ServerFetch;
  parentRequest: Request;
  sessionZero: number;
  duration: number;
  onHover: (ref: EventRef | null) => void;
}

function shortPath(url: string): string {
  try {
    return new URL(url).pathname + (new URL(url).search || "");
  } catch {
    return url;
  }
}

export function FetchLane({
  fetch: f,
  parentRequest,
  sessionZero,
  duration,
  onHover,
}: Props) {
  useStoreVersion();
  const pinned = getPinnedEventRef();
  const isPinned =
    pinned &&
    pinned.kind === "server-fetch" &&
    pinned.requestId === parentRequest.requestId &&
    pinned.fetchId === f.id;

  const ref: EventRef = {
    kind: "server-fetch",
    requestId: parentRequest.requestId,
    fetchId: f.id,
  };

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
        <span className="lane-method">{f.method}</span>
        <span className="lane-url" title={f.url}>
          {shortPath(f.url)}
        </span>
      </div>
      <div className="lane-content">
        <FetchBar fetch={f} t0={sessionZero} duration={duration} />
      </div>
    </div>
  );
}

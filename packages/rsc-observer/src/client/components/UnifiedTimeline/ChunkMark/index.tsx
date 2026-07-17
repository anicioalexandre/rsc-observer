import type { RSCChunk } from "../../../store/types";
import { formatTimeLabel, pct } from "../utils";

interface Props {
  chunk: RSCChunk;
  t0: number;
  duration: number;
}

export function ChunkMark({ chunk, t0, duration }: Props) {
  const left = pct(chunk.t - t0, duration);
  const title = `chunk #${chunk.index} · ${chunk.bytes}B · t=${formatTimeLabel(chunk.t - t0)}`;
  return (
    <div className="chunk-mark" style={{ left: `${left}%` }} title={title}>
      <div className="chunk-mark-dot" />
      <div className="chunk-mark-line" />
    </div>
  );
}

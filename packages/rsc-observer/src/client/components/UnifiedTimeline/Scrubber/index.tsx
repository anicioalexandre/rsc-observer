import { formatTimeLabel, pct } from "../utils";

interface Props {
  t: number;
  duration: number;
}

export function Scrubber({ t, duration }: Props) {
  const left = pct(t, duration);
  return (
    <div className="scrubber" style={{ left: `${left}%` }}>
      <div className="scrubber-handle" />
      <div className="scrubber-label">{formatTimeLabel(t)}</div>
    </div>
  );
}

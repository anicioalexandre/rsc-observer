import { TICK_COUNT } from "../constants";
import { formatTimeLabel, pct } from "../utils";

interface Props {
  duration: number;
  // Time at the left edge of the visible window, expressed in
  // sessionZero-relative milliseconds. When the user zooms into [50ms,
  // 100ms], offset = 50 and labels read 50ms…100ms instead of 0…50ms.
  offset?: number;
}

export function Scale({ duration, offset = 0 }: Props) {
  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => i / (TICK_COUNT - 1));
  return (
    <div className="timeline-scale">
      {ticks.map((frac, i) => {
        // Match the bars' coordinate system — pct() applies the same
        // edge inset so a tick label at "0ms" lines up with bars that
        // start at t=0.
        const left = `${pct(frac * duration, duration)}%`;
        const isFirst = i === 0;
        const isLast = i === TICK_COUNT - 1;
        const labelCls =
          "timeline-tick-label" +
          (isFirst ? " first" : "") +
          (isLast ? " last" : "");
        return (
          <div key={i}>
            <div className="timeline-tick" style={{ left }} />
            <div className={labelCls} style={{ left }}>
              {formatTimeLabel(offset + frac * duration)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import type { ReactNode } from "react";

interface Props {
  label: string;
  count: number;
  children?: ReactNode;
}

export function LaneGroup({ label, count, children }: Props) {
  return (
    <div className="lane-group">
      <div className="lane-group-header">
        <span>{label}</span>
        <span className="lane-group-count">· {count}</span>
      </div>
      {count === 0 ? (
        <div className="lane-group-empty">(no events)</div>
      ) : (
        children
      )}
    </div>
  );
}

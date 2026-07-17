import type { ReactNode } from "react";

interface Props {
  label: string;
  children?: ReactNode;
}

export function Lane({ label, children }: Props) {
  return (
    <div className="lane">
      <span className="lane-label">{label}</span>
      {children}
    </div>
  );
}

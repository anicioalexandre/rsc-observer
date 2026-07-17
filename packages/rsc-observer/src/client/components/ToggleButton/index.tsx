import { getTracking, useStoreVersion } from "../../store";
import { RecordingDot } from "../RecordingDot";

interface Props {
  open: boolean;
  onToggle: () => void;
}

export function ToggleButton({ open, onToggle }: Props) {
  // Subscribe so the dot reflects tracking state even while the panel is
  // closed (the user might pause from the panel, close it, and expect
  // the corner pill to show "paused").
  useStoreVersion();
  const tracking = getTracking();
  return (
    <button
      className="toggle"
      type="button"
      data-open={open ? "true" : "false"}
      onClick={onToggle}
      aria-label={open ? "Close rsc-observer" : "Open rsc-observer"}
    >
      <RecordingDot active={tracking} />
      rsc
    </button>
  );
}

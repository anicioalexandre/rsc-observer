interface Props {
  active: boolean;
}

// Tiny status pip used in three places: the corner toggle button (when
// the panel is closed), the title bar (left of "rsc-observer"), and as
// a visual hint inside the power-button cell. `active` = tracking on
// (red, pulsing). `active = false` = paused (gray, static).
export function RecordingDot({ active }: Props) {
  return (
    <span
      className="rec-dot"
      data-active={active ? "true" : "false"}
      aria-hidden="true"
    />
  );
}

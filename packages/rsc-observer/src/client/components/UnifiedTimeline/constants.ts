export const DURATION_BANDS = [
  { max: 100, cls: "fast" },
  { max: 300, cls: "medium" },
  { max: 1000, cls: "slow" },
  { max: Infinity, cls: "critical" },
] as const;

export type DurationClass = (typeof DURATION_BANDS)[number]["cls"];

// Scale tick count across the timeline
export const TICK_COUNT = 6;

// Visual sizing
export const SCALE_HEIGHT = 22;      // top time ruler
export const LANE_HEIGHT = 22;       // one data row (request/fetch/client)
export const GROUP_HEADER_HEIGHT = 20; // "SERVER" / "DATA FETCH" / "CLIENT" header row
export const LANE_LABEL_WIDTH = 170; // left-gutter width for lane labels
export const BOTTOM_PAD = 8;

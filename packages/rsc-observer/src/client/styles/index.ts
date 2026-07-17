import { css as tokens } from "./tokens";
import { css as global } from "./global";
import { css as recordingDot } from "../components/RecordingDot/styles";
import { css as toggle } from "../components/ToggleButton/styles";
import { css as panel } from "../components/Panel/styles";
import { css as details } from "../components/DetailsPane/styles";
import { css as timeline } from "../components/UnifiedTimeline/styles";
import { css as filterBar } from "../components/UnifiedTimeline/FilterBar/styles";
import { css as treePreview } from "../components/TreePreview/styles";

// Tokens come first so every component rule below can resolve var(--…).
// RecordingDot styles come right after — they're shared by the toggle
// button, the title bar, and the power action.
export const overlayCss = [
  tokens,
  global,
  recordingDot,
  toggle,
  panel,
  details,
  timeline,
  filterBar,
  treePreview,
].join("\n");

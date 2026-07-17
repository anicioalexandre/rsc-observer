import type { TreeNode } from "./types";
import { buildForest } from "./tree-build";

// Hand-rolled Flight wire-format decoder (no react-server-dom-webpack dep).
// Returns a "forest" of trees: the main tree (rooted at <html> if present),
// followed by any element-shaped rows that weren't reached from the main tree
// (typically user page content that Next.js attaches via router segments).
// The orchestrator's `tier: 2` result exposes only the main tree for now; the
// TreePreview component reads the forest directly via buildForest() when it
// wants multi-root rendering.
export async function parseTier2(accumulated: string): Promise<TreeNode | null> {
  const forest = buildForest(accumulated);
  return forest[0]?.tree ?? null;
}

import { buildForest, type Forest } from "./tree-build";
import { parseTier3 } from "./tier3";
import type { ParseResult } from "./types";

export type { ParseResult, ParsedSnapshot, Tier3Row, TreeNode } from "./types";
export { buildForest, type Forest, type ForestEntry } from "./tree-build";

export async function parseRsc(accumulated: string): Promise<ParseResult> {
  const rows = parseTier3(accumulated);
  try {
    const forest: Forest = buildForest(accumulated);
    if (forest.length > 0) {
      return { tier: 2, tree: forest[0]!.tree, rows, forest };
    }
  } catch {
    // Fall through to tier-3 on any tier-2 failure.
  }
  return { tier: 3, rows };
}

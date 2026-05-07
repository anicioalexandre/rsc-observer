export type TreeNode =
  | {
      kind: "element";
      type: string;
      props: Record<string, unknown>;
      children: TreeNode[];
      ownerName?: string;
      isSuspenseBoundary?: boolean;
      boundaryId?: number;
    }
  | {
      kind: "client-ref";
      moduleId: string;
      exportName: string;
      props: Record<string, unknown>;
      children: TreeNode[];
    }
  | { kind: "suspense-pending"; boundaryId: number; fallback: TreeNode }
  | { kind: "text"; value: string };

export type Tier3Row = {
  id: string;       // hex id, possibly empty (e.g. `:HL[...]`)
  type: string;     // type tag: "", "I", "HL", "D", "H", "E", etc.
  rawData: string;  // everything after the tag; usually JSON
};

export type ParseResult =
  | {
      tier: 2;
      tree: TreeNode;
      // Forest of trees: main tree + any element rows not reached from the main.
      // Useful because Next.js attaches user page content to row 0 (router state),
      // which isn't part of the html → body → layout-router chain. Each entry
      // carries a `kind` so renderers can label it ("page" / "shell" / "extra")
      // without re-deriving from the tree shape.
      forest: {
        rootId: string;
        tree: TreeNode;
        kind: "page" | "shell" | "extra";
      }[];
      rows: Tier3Row[];
    }
  | { tier: 3; rows: Tier3Row[] };

export type ParsedSnapshot = {
  chunkIndex: number; // last chunk index included in this parse
  t: number;          // timestamp of the last included chunk (from rsc_chunk.t)
  result: ParseResult;
};

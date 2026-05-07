import type { TreeNode } from "./types";
import { parseTier3 } from "./tier3";

type RowMap = Map<string, unknown>;
type TypeMap = Map<string, string>;

function isSkippedType(t: string): boolean {
  return t === "D" || t === "E" || t.startsWith("H");
}

export type ForestEntry = {
  rootId: string;
  tree: TreeNode;
  // What this subtree represents. "page" = the user-facing page content
  // (Next.js attaches this under the router state row, so it's reached by
  // following $L refs from row 0; the html-rooted tree by itself is just
  // shell). "shell" = the document chrome (html → body → router stub).
  // "extra" = everything else (404 array roots, error pages, dangling rows).
  kind: "page" | "shell" | "extra";
};
export type Forest = ForestEntry[];

export function buildForest(accumulated: string): Forest {
  try {
    const rows = parseTier3(accumulated);
    if (rows.length === 0) return [];

    const values: RowMap = new Map();
    const types: TypeMap = new Map();
    for (const row of rows) {
      if (isSkippedType(row.type)) continue;
      if (row.rawData === "") continue;
      try {
        values.set(row.id, JSON.parse(row.rawData));
        types.set(row.id, row.type);
      } catch {
        // skip malformed rows
      }
    }

    const trees: Forest = [];
    const reached = new Set<string>();

    const buildAt = (id: string): TreeNode | null => {
      if (reached.has(id)) return null;
      if (!values.has(id)) return null;
      const tree = resolveNode(
        values.get(id),
        values,
        types,
        new Set([id]),
        reached,
      );
      reached.add(id);
      return tree;
    };

    // 1. Row 0 is the Next.js router state. The actual page subtrees are
    //    pointed at by $L / direct refs inside it. This is the deterministic
    //    signal for *what to look at*. But row 0 also references framework
    //    boundary use-sites (ViewportBoundary, OutletBoundary, …), the
    //    `<html>` shell row, and the hidden `<div hidden>` Next emits for
    //    streaming metadata. Those rows are technically reachable too, so
    //    we build everything and then classify by content shape: a real
    //    page has at least one visible host element with descendants;
    //    `<html>` is always shell; everything else gets demoted to `extra`
    //    (collapsed below).
    const pageRefs = collectPageRefs(values.get("0"), values, types);
    for (const id of pageRefs) {
      const tree = buildAt(id);
      if (!tree) continue;
      const kind: ForestEntry["kind"] = isShellRoot(tree)
        ? "shell"
        : looksLikePageContent(tree)
          ? "page"
          : "extra";
      trees.push({ rootId: id, tree, kind });
    }

    // 2. The html shell. The walk stops at the layout-router I-row (a client
    //    component with empty children), so it doesn't re-traverse the page
    //    subtrees we already built — the shell entry is just html → head →
    //    body → stub.
    const htmlId = pickHtmlRootId(values);
    if (htmlId) {
      const tree = buildAt(htmlId);
      if (tree) trees.push({ rootId: htmlId, tree, kind: "shell" });
    }

    // 3. Everything else element-shaped — 404 / error array roots, dangling
    //    subtrees, partial-parse state. These go into a collapsed "extras"
    //    section so the panel doesn't drown in router-internal trees.
    for (const [id, data] of values) {
      if (reached.has(id)) continue;
      if (types.get(id) === "I") continue;
      if (!isElementArray(data) && !isElementListArray(data)) continue;
      const tree = buildAt(id);
      if (tree) trees.push({ rootId: id, tree, kind: "extra" });
    }

    // Fallback when there's no row 0 (e.g. Server Action response payloads).
    // Keep the old "biggest extra wins page" heuristic so the primary tree
    // is still labelled.
    if (trees.every((t) => t.kind !== "page")) {
      promoteLargestExtraToPage(trees);
    }

    return sortForest(trees);
  } catch {
    return [];
  }
}

// For callers that only want the main tree.
export function buildTree(accumulated: string): TreeNode | null {
  const forest = buildForest(accumulated);
  return forest[0]?.tree ?? null;
}

// Tags emitted as document chrome (head metadata, styling, scripts). Their
// presence in a tree doesn't make it user content — they're framework noise.
const METADATA_TAGS = new Set([
  "script",
  "link",
  "meta",
  "style",
  "title",
  "head",
  "noscript",
]);

// Tells whether a tree is the document shell, no matter how content-y it
// looks. The html row contains <body> which contains the layout-router
// client-ref — passing the visible-host-element test — but it's never
// what the user wants to see in the preview.
function isShellRoot(tree: TreeNode): boolean {
  if (tree.kind !== "element") return false;
  const tag = tree.type.toLowerCase();
  return tag === "html" || tag === "body" || tag === "head";
}

// Decide whether a built subtree is the page the user authored vs. a Next.js
// internal wrapper (ViewportBoundary / OutletBoundary use-sites, the hidden
// `<div hidden>` metadata DOM, etc.). Heuristics, but applied to *resolved*
// trees so they're robust to the wire format reshuffling.
function looksLikePageContent(tree: TreeNode): boolean {
  if (tree.kind === "element") {
    const tag = tree.type.toLowerCase();
    if (METADATA_TAGS.has(tag)) return false;
    if (tree.props.hidden === true || tree.props.hidden === "") {
      // `<div hidden>` is Next's metadata DOM — keep checking the children
      // in case real content is nested somehow, but most of the time it isn't.
      return tree.children.some(looksLikePageContent);
    }
    // Logical wrappers (Fragment, Suspense) descend.
    if (tag === "fragment" || tag === "suspense") {
      return tree.children.some(looksLikePageContent);
    }
    // A real host element. Even an empty <main/> counts (could be loading).
    return true;
  }
  if (tree.kind === "client-ref") {
    // Pure client-ref placeholders are framework boundaries when they appear
    // at the top of a candidate tree; only count them as page content if
    // they have host descendants below.
    return tree.children.some(looksLikePageContent);
  }
  if (tree.kind === "suspense-pending") {
    return looksLikePageContent(tree.fallback);
  }
  return false;
}

// Walk the router-state row's data structure and collect every reference id
// that points at an element-shaped row. Skips I-rows (client component
// definitions) and the router-state row itself. Output preserves insertion
// order — the first ref in row 0's tree maps to the topmost page.
function collectPageRefs(
  rootData: unknown,
  values: RowMap,
  types: TypeMap,
): string[] {
  if (rootData === undefined) return [];
  const seen = new Set<string>();
  const ordered: string[] = [];
  const visited = new WeakSet<object>();
  // Iterative walk to avoid blowing the stack on deeply nested router state.
  const stack: unknown[] = [rootData];
  while (stack.length > 0) {
    const item = stack.pop();
    if (item === null || item === undefined) continue;
    if (typeof item === "string") {
      const id = parseRefId(item);
      if (id === null) continue;
      if (id === "0") continue;
      if (seen.has(id)) continue;
      if (!values.has(id)) continue;
      if (types.get(id) === "I") continue;
      const v = values.get(id);
      if (!isElementArray(v) && !isElementListArray(v)) continue;
      seen.add(id);
      ordered.push(id);
      continue;
    }
    if (typeof item !== "object") continue;
    if (visited.has(item as object)) continue;
    visited.add(item as object);
    if (Array.isArray(item)) {
      for (const child of item) stack.push(child);
    } else {
      for (const v of Object.values(item as Record<string, unknown>)) {
        stack.push(v);
      }
    }
  }
  return ordered;
}

// Strip the leading "$" / "$L" / "$W" sigil from a wire-format ref string and
// return the row id, or null if the string isn't a row reference.
function parseRefId(s: string): string | null {
  if (s.length < 2) return null;
  if (s.charCodeAt(0) !== 36 /* $ */) return null;
  if (s.startsWith("$$") || s.startsWith("$S") || s.startsWith("$@")) return null;
  if (s.startsWith("$L") || s.startsWith("$W")) return s.slice(2);
  return s.slice(1);
}

function pickHtmlRootId(values: RowMap): string | null {
  for (const [id, data] of values) {
    if (!isElementArray(data)) continue;
    if ((data as unknown[])[1] === "html") return id;
  }
  return null;
}

// Count host-element descendants. Used by the no-row-0 fallback to pick the
// "biggest" extra as the page.
function countElements(tree: TreeNode): number {
  if (tree.kind === "element" || tree.kind === "client-ref") {
    let n = 1;
    for (const c of tree.children) n += countElements(c);
    return n;
  }
  if (tree.kind === "suspense-pending") return 1 + countElements(tree.fallback);
  return 0;
}

function promoteLargestExtraToPage(trees: Forest): void {
  let bestI = -1;
  let bestSize = 0;
  for (let i = 0; i < trees.length; i++) {
    if (trees[i]!.kind !== "extra") continue;
    const size = countElements(trees[i]!.tree);
    if (size > bestSize) {
      bestSize = size;
      bestI = i;
    }
  }
  const shellEntry = trees.find((t) => t.kind === "shell");
  const shellSize = shellEntry ? countElements(shellEntry.tree) : 0;
  if (bestI >= 0 && bestSize > shellSize) {
    trees[bestI]!.kind = "page";
  }
}

function sortForest(trees: Forest): Forest {
  const order: Record<ForestEntry["kind"], number> = {
    page: 0,
    shell: 1,
    extra: 2,
  };
  return [...trees].sort((a, b) => order[a.kind] - order[b.kind]);
}

function isElementArray(data: unknown): data is unknown[] {
  return Array.isArray(data) && data[0] === "$" && data.length >= 2;
}

// A row whose value is an array whose first child is itself an element array.
// React server outputs this for "render this list of elements" cases — most
// notably error and not-found page rows.
function isElementListArray(data: unknown): data is unknown[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  return isElementArray(data[0]);
}

function resolveNode(
  data: unknown,
  values: RowMap,
  types: TypeMap,
  seen: Set<string>,
  reached: Set<string>,
): TreeNode {
  if (data === null || data === undefined) return { kind: "text", value: "null" };
  if (typeof data === "boolean" || typeof data === "number") {
    return { kind: "text", value: String(data) };
  }
  if (typeof data === "string") {
    return resolveString(data, values, types, seen, reached);
  }
  if (Array.isArray(data)) {
    if (isElementArray(data)) return resolveElement(data, values, types, seen, reached);
    return {
      kind: "element",
      type: "Fragment",
      props: {},
      children: data.map((d) => resolveNode(d, values, types, seen, reached)),
    };
  }
  return {
    kind: "element",
    type: "Object",
    props: data as Record<string, unknown>,
    children: [],
  };
}

function resolveString(
  s: string,
  values: RowMap,
  types: TypeMap,
  seen: Set<string>,
  reached: Set<string>,
): TreeNode {
  if (s === "$undefined") return { kind: "text", value: "undefined" };
  if (s.startsWith("$$")) return { kind: "text", value: s.slice(1) };

  if (s.startsWith("$S")) {
    const sym = s.slice(2);
    if (sym === "react.fragment")
      return { kind: "element", type: "Fragment", props: {}, children: [] };
    if (sym === "react.suspense")
      return { kind: "element", type: "Suspense", props: {}, children: [] };
    return { kind: "text", value: `<${sym}>` };
  }

  if (s.startsWith("$L")) return resolveRef(s.slice(2), values, types, seen, reached);
  if (s.startsWith("$W")) return resolveRef(s.slice(2), values, types, seen, reached);

  if (s.startsWith("$@")) {
    const refId = s.slice(2);
    if (values.has(refId)) return resolveRef(refId, values, types, seen, reached);
    return {
      kind: "suspense-pending",
      boundaryId: parseHex(refId),
      fallback: { kind: "text", value: "(pending)" },
    };
  }

  if (s.length > 1 && s.charCodeAt(0) === 36 /* $ */) {
    return resolveRef(s.slice(1), values, types, seen, reached);
  }

  return { kind: "text", value: s };
}

function resolveRef(
  refId: string,
  values: RowMap,
  types: TypeMap,
  seen: Set<string>,
  reached: Set<string>,
): TreeNode {
  if (seen.has(refId)) return { kind: "text", value: `(cyclic $${refId})` };
  if (!values.has(refId)) {
    // The row hasn't arrived yet — this is exactly the streaming-Suspense
    // case. Next emits `<Suspense fallback>` with `children: "$L<row>"`,
    // and `<row>` shows up later (after the await resolves). Returning a
    // suspense-pending node here lets buildSuspense detect "child is
    // pending" and render the actual fallback instead of leaking a
    // placeholder text into the resolved tree. Worst case (a non-suspense
    // ancestor) this renders as a standalone "pending" — still accurate.
    return {
      kind: "suspense-pending",
      boundaryId: parseHex(refId),
      fallback: { kind: "text", value: `(pending $${refId})` },
    };
  }

  reached.add(refId);
  const type = types.get(refId) ?? "";
  const data = values.get(refId);

  if (type === "I" && Array.isArray(data)) {
    const [moduleId, , exportName] = data as [unknown, unknown, unknown];
    return {
      kind: "client-ref",
      moduleId: String(moduleId ?? "unknown"),
      exportName: String(exportName ?? "default"),
      props: {},
      children: [],
    };
  }

  const nextSeen = new Set(seen);
  nextSeen.add(refId);
  return resolveNode(data, values, types, nextSeen, reached);
}

function resolveElement(
  arr: unknown[],
  values: RowMap,
  types: TypeMap,
  seen: Set<string>,
  reached: Set<string>,
): TreeNode {
  const rawType = arr[1];
  const props = (arr[3] ?? {}) as Record<string, unknown>;

  // Resolve "$Lxx", "$Sxx", "$xx" type references first.
  const resolved = resolveTypeRef(rawType, values, types, reached);

  if (resolved.kind === "client") {
    const children = extractChildren(props.children, values, types, seen, reached);
    return {
      kind: "client-ref",
      moduleId: resolved.moduleId,
      exportName: resolved.exportName,
      props: stripChildren(props),
      children,
    };
  }

  const typeStr = resolved.value;
  const children = extractChildren(props.children, values, types, seen, reached);

  if (typeStr === "Suspense")
    return buildSuspense(props, children, values, types, seen, reached);

  return {
    kind: "element",
    type: typeStr,
    props: stripChildren(props),
    children,
  };
}

type ResolvedType =
  | { kind: "tag"; value: string }
  | { kind: "client"; moduleId: string; exportName: string };

// Walk through "$L<id>", "$S<sym>", "$<hex>" references (and any chained refs)
// until we land on a concrete tag string, a React symbol, or an I-row (client ref).
// Defensive: if we don't recognise the shape, fall back to "Fragment" — which is
// a render-safe value (it'll either become a Fragment or be skipped by the
// renderer's tag-name guard, never a DOMException).
function resolveTypeRef(
  raw: unknown,
  values: RowMap,
  types: TypeMap,
  reached: Set<string>,
  visited: Set<string> = new Set(),
): ResolvedType {
  if (raw == null) return { kind: "tag", value: "Fragment" };
  if (typeof raw !== "string") return { kind: "tag", value: "Fragment" };
  if (raw === "") return { kind: "tag", value: "Fragment" };

  // React internal symbol
  if (raw.startsWith("$S")) {
    const sym = raw.slice(2);
    if (sym === "react.fragment") return { kind: "tag", value: "Fragment" };
    if (sym === "react.suspense") return { kind: "tag", value: "Suspense" };
    return { kind: "tag", value: "Fragment" };
  }

  // Lazy ref to a client-component definition
  if (raw.startsWith("$L")) {
    return resolveRefType(raw.slice(2), values, types, reached, visited);
  }

  // Direct ref: "$<hex>"
  if (raw.length > 1 && raw.charCodeAt(0) === 36 /* $ */) {
    return resolveRefType(raw.slice(1), values, types, reached, visited);
  }

  // Plain tag name
  return { kind: "tag", value: raw };
}

function resolveRefType(
  refId: string,
  values: RowMap,
  types: TypeMap,
  reached: Set<string>,
  visited: Set<string>,
): ResolvedType {
  if (visited.has(refId)) return { kind: "tag", value: "Fragment" };
  if (!values.has(refId)) return { kind: "tag", value: "Fragment" };

  reached.add(refId);

  // I-row: client component reference
  if (types.get(refId) === "I" && Array.isArray(values.get(refId))) {
    const refData = values.get(refId) as unknown[];
    return {
      kind: "client",
      moduleId: String(refData[0] ?? "unknown"),
      exportName: String(refData[2] ?? "default"),
    };
  }

  // Otherwise it's another value — could be a symbol string, another ref, etc.
  const next = new Set(visited);
  next.add(refId);
  return resolveTypeRef(values.get(refId), values, types, reached, next);
}

function buildSuspense(
  props: Record<string, unknown>,
  children: TreeNode[],
  values: RowMap,
  types: TypeMap,
  seen: Set<string>,
  reached: Set<string>,
): TreeNode {
  const pending = children.some((c) => c.kind === "suspense-pending");
  if (pending) {
    const fallback =
      props.fallback != null
        ? resolveNode(props.fallback, values, types, seen, reached)
        : ({ kind: "text", value: "(no fallback)" } as TreeNode);
    return { kind: "suspense-pending", boundaryId: 0, fallback };
  }
  return {
    kind: "element",
    type: "Suspense",
    props: {},
    children,
    isSuspenseBoundary: true,
  };
}

function extractChildren(
  children: unknown,
  values: RowMap,
  types: TypeMap,
  seen: Set<string>,
  reached: Set<string>,
): TreeNode[] {
  if (children == null) return [];
  if (Array.isArray(children)) {
    if (isElementArray(children)) {
      return [resolveNode(children, values, types, seen, reached)];
    }
    return (children as unknown[]).map((c) =>
      resolveNode(c, values, types, seen, reached),
    );
  }
  return [resolveNode(children, values, types, seen, reached)];
}

function stripChildren(props: Record<string, unknown>): Record<string, unknown> {
  if (!("children" in props)) return props;
  const { children: _c, ...rest } = props;
  return rest;
}

function parseHex(s: string): number {
  const n = parseInt(s, 16);
  return Number.isFinite(n) ? n : 0;
}

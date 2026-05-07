import { createElement, type ReactNode } from "react";
import type { TreeNode } from "../../../../parser/types";
import { BLOCKED_TAGS, NEUTRAL_TAGS } from "../constants";
import { sanitizeProps } from "../utils";
import { shortenModuleId } from "../../utils";

interface Props {
  node: TreeNode;
}

// Build the same friendly client-component label the structural view uses,
// so visual mode shows "TestClient" instead of "default" when the export is
// the module's default. For named exports we append `.name`.
function clientRefLabel(moduleId: string, exportName: string): string {
  const mod = shortenModuleId(moduleId);
  if (exportName && exportName !== "default") return `${mod}.${exportName}`;
  return mod;
}

export function NodeRenderer({ node }: Props): ReactNode {
  if (node.kind === "text") {
    return <>{node.value}</>;
  }

  if (node.kind === "client-ref") {
    return (
      <div
        data-rsco-client-ref="true"
        data-rsco-component={clientRefLabel(node.moduleId, node.exportName)}
      >
        {node.children.map((c, i) => (
          <NodeRenderer key={i} node={c} />
        ))}
      </div>
    );
  }

  if (node.kind === "suspense-pending") {
    return (
      <div data-rsco-suspense-pending="true">
        <NodeRenderer node={node.fallback} />
      </div>
    );
  }

  // element
  const tagLower = node.type.toLowerCase();
  if (BLOCKED_TAGS.has(tagLower)) return null;

  // Defensive: if the type isn't a valid HTML/SVG tag name, render as a labeled
  // div so React doesn't choke on document.createElement.
  // Valid HTML element name: starts with a letter, then letters/digits/hyphens.
  // We also allow "Fragment" / "Suspense" as logical labels.
  const isFragmentish =
    tagLower === "fragment" || tagLower === "suspense" || NEUTRAL_TAGS.has(tagLower);
  const isValidTag = /^[a-z][a-z0-9-]*$/.test(tagLower);

  if (isFragmentish) {
    return (
      <>
        {node.children.map((c, i) => (
          <NodeRenderer key={i} node={c} />
        ))}
      </>
    );
  }

  if (!isValidTag) {
    return (
      <div data-rsco-unknown-tag={node.type}>
        {node.children.map((c, i) => (
          <NodeRenderer key={i} node={c} />
        ))}
      </div>
    );
  }

  const safeProps = sanitizeProps(node.props);

  // Use createElement directly with a string tag — React knows how to handle
  // host elements that way, and we sidestep the JSX-IntrinsicElements lookup
  // which isn't in scope under tsconfig "bundler" resolution.
  if (isVoidElement(tagLower)) {
    return createElement(tagLower, safeProps);
  }

  return createElement(
    tagLower,
    safeProps,
    node.children.map((c, i) => <NodeRenderer key={i} node={c} />),
  );
}

const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function isVoidElement(tag: string): boolean {
  return VOID_ELEMENTS.has(tag);
}

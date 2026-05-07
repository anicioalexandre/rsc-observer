import type { TreeNode as TreeNodeType } from "../../../parser/types";
import { shortenModuleId } from "../utils";

interface Props {
  node: TreeNodeType;
  depth: number;
  // When set, the node is rendered inside the cramped subtree aside —
  // labels collapse to a single initial (C / P / R) and the full text
  // moves into a `title` tooltip. Propagates to all descendants so the
  // entire subtree is consistent.
  compact?: boolean;
}

const MAX_DEPTH = 32;

export function TreeNode({ node, depth, compact = false }: Props) {
  if (depth > MAX_DEPTH) {
    return <div className="tree-trunc dim">… (depth limit)</div>;
  }

  if (node.kind === "text") {
    return <div className="tree-text">{node.value}</div>;
  }

  if (node.kind === "client-ref") {
    const label = shortenModuleId(node.moduleId);
    return (
      <fieldset className="tree-fieldset tree-fieldset-client">
        <legend>
          <span className="tree-type">{label}</span>
          {node.exportName !== "default" ? (
            <span className="dim">.{node.exportName}</span>
          ) : null}
          <span
            className="tree-label tree-label-client"
            title={compact ? "client" : undefined}
          >
            {compact ? "C" : "client"}
          </span>
        </legend>
        {node.children.length > 0
          ? node.children.map((child, i) => (
              <TreeNode key={i} node={child} depth={depth + 1} compact={compact} />
            ))
          : null}
      </fieldset>
    );
  }

  if (node.kind === "suspense-pending") {
    return (
      <fieldset className="tree-fieldset tree-fieldset-suspense-pending">
        <legend>
          <span className="tree-type">Suspense</span>
          <span
            className="tree-label tree-label-pending"
            title={compact ? "pending" : undefined}
          >
            {compact ? "P" : "pending"}
          </span>
        </legend>
        <div className="tree-fallback-note dim">↳ fallback</div>
        <TreeNode node={node.fallback} depth={depth + 1} compact={compact} />
      </fieldset>
    );
  }

  // element
  const cls =
    "tree-fieldset" +
    (node.isSuspenseBoundary ? " tree-fieldset-suspense" : "");

  return (
    <fieldset className={cls}>
      <legend>
        <span className="tree-type">{node.type}</span>
        {node.isSuspenseBoundary ? (
          <span
            className="tree-label tree-label-resolved"
            title={compact ? "resolved" : undefined}
          >
            {compact ? "R" : "resolved"}
          </span>
        ) : null}
      </legend>
      {node.children.length > 0 ? (
        node.children.map((child, i) => (
          <TreeNode key={i} node={child} depth={depth + 1} compact={compact} />
        ))
      ) : (
        <div className="tree-empty dim">(no children)</div>
      )}
    </fieldset>
  );
}

import { Component, useEffect, useRef, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { createPortal } from "react-dom";
import type { TreeNode } from "../../../parser/types";
import { NodeRenderer } from "./NodeRenderer";
import { adoptHostStylesheets } from "./utils";

interface Props {
  forest: {
    rootId: string;
    tree: TreeNode;
    kind: "page" | "shell" | "extra";
  }[];
  onFallback?: () => ReactNode;
}

export function VisualTree({ forest, onFallback }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shadow, setShadow] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    if (shadow) return;
    const sr = hostRef.current.attachShadow({ mode: "closed" });
    setShadow(sr);
  }, [shadow]);

  useEffect(() => {
    if (!shadow) return;

    let scheduled = false;
    const reAdopt = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        adoptHostStylesheets(shadow);
      });
    };

    reAdopt();
    const observer = new MutationObserver(reAdopt);
    observer.observe(document.head, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [shadow]);

  return (
    <div ref={hostRef} className="rsco-visual-host">
      {shadow
        ? createPortal(
            <VisualErrorBoundary fallback={onFallback}>
              {forest.map(({ rootId, tree }) => (
                <div key={rootId} data-rsco-root={rootId}>
                  <NodeRenderer node={tree} />
                </div>
              ))}
            </VisualErrorBoundary>,
            shadow as unknown as Element,
          )
        : null}
    </div>
  );
}

interface BoundaryProps {
  fallback?: () => ReactNode;
  children: ReactNode;
}
interface BoundaryState {
  error: Error | null;
}

class VisualErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // swallow — we render the fallback below
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div data-rsco-visual-error="true">
          <div
            style={{
              padding: 16,
              fontFamily: "ui-monospace, monospace",
              fontSize: 11,
              color: "#a32c21",
            }}
          >
            Visual render failed: {this.state.error.message}
          </div>
          {this.props.fallback ? this.props.fallback() : null}
        </div>
      );
    }
    return this.props.children;
  }
}

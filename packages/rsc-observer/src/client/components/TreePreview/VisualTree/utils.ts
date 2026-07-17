// Per-shadow base sheet — chrome around our placeholders + small reset.
const BASE_CSS = `
:host { display: block; padding: 12px; min-height: 60px; color: inherit; }

[data-rsco-client-ref] {
  border: 1px dashed #3b617a;
  padding: 18px 8px 8px 8px;
  margin: 4px 0;
  border-radius: 3px;
  position: relative;
}
[data-rsco-client-ref]::before {
  content: 'CLIENT · ' attr(data-rsco-component);
  position: absolute;
  top: 2px;
  left: 6px;
  font: 600 9px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #7dd3fc;
  letter-spacing: 1px;
}

[data-rsco-suspense-pending] {
  border: 1px dashed #7a5a3b;
  padding: 18px 8px 8px 8px;
  margin: 4px 0;
  border-radius: 3px;
  background: rgba(250, 204, 21, 0.04);
  position: relative;
}
[data-rsco-suspense-pending]::before {
  content: 'SUSPENSE · pending';
  position: absolute;
  top: 2px;
  left: 6px;
  font: 600 9px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #facc15;
  letter-spacing: 1px;
}

[data-rsco-root-label] {
  font: 600 9px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #888;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin: 12px 0 6px 0;
  padding-top: 12px;
  border-top: 1px dashed #2a2a2a;
}

[data-rsco-main-root]:first-of-type [data-rsco-root-label] {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}

[data-rsco-extras] {
  margin-top: 16px;
  padding-top: 8px;
  border-top: 1px dashed #2a2a2a;
}

[data-rsco-extras-heading] {
  font: 600 9px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #888;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 6px;
}

[data-rsco-extra] {
  margin: 4px 0;
}

[data-rsco-extra-summary] {
  cursor: pointer;
  font: 600 9px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #888;
  padding: 2px 0;
  list-style: none;
}

[data-rsco-extra-summary]::before {
  content: "▶ ";
  display: inline-block;
  width: 10px;
  font-size: 8px;
  transition: transform 0.1s ease;
}

[data-rsco-extra][open] > [data-rsco-extra-summary]::before {
  transform: rotate(90deg);
}
`;

const baseSheet = (() => {
  try {
    const s = new CSSStyleSheet();
    s.replaceSync(BASE_CSS);
    return s;
  } catch {
    return null;
  }
})();

// Adopt the host page's stylesheets into the given shadow root, plus our base chrome sheet.
// Skips cross-origin sheets we can't read.
export function adoptHostStylesheets(target: ShadowRoot): void {
  const sheets: CSSStyleSheet[] = [];
  if (baseSheet) sheets.push(baseSheet);

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = Array.from(sheet.cssRules)
        .map((r) => r.cssText)
        .join("\n");
      if (!rules) continue;
      const constructed = new CSSStyleSheet();
      constructed.replaceSync(rules);
      sheets.push(constructed);
    } catch {
      // cross-origin stylesheet; skip
    }
  }

  try {
    target.adoptedStyleSheets = sheets;
  } catch {
    // adoptedStyleSheets not supported (very old browser); silent fallback
  }
}

// React passes only "safe" props through. Strip event handlers and
// dangerouslySetInnerHTML; don't pass through our internal structural keys.
export function sanitizeProps(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    const lower = key.toLowerCase();
    if (lower.startsWith("on")) continue; // event handlers
    if (key === "dangerouslySetInnerHTML") continue;
    if (key === "children") continue;
    if (key === "ref") continue;
    if (key === "key") continue;
    // refs to React internals
    if (key === "$$typeof" || key === "type" || key === "props") continue;
    out[key] = value;
  }
  return out;
}

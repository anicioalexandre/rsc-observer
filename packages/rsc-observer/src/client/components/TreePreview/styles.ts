export const css = `
.tree-preview {
  font-family: var(--font-mono);
  font-size: var(--font-sm);
  line-height: var(--line-loose);
  color: var(--color-text-primary);
}

.tree-preview-empty,
.tree-preview-fallback {
  padding: var(--space-5) var(--space-6);
  font-family: var(--font-mono);
  color: var(--color-text-dim);
  height: 100%;
  overflow: auto;
}

.tree-preview-fallback-msg {
  font-size: var(--font-xxs);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: var(--space-4);
}

.tree-preview-fallback-rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.tree-preview-fallback-rows > li {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: var(--space-3);
  align-items: baseline;
  padding: var(--space-2) var(--space-3);
  background: var(--color-elevated);
  border: var(--border-soft);
}

.tree-preview-fallback-id {
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  color: var(--color-text-primary);
  font-weight: 600;
  min-width: 24px;
}

.tree-preview-fallback-type {
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  min-width: 20px;
}

.tree-preview-fallback-raw {
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  color: var(--color-text-primary);
  word-break: break-all;
  overflow-wrap: anywhere;
  background: transparent;
  padding: 0;
}

/* Visual preview surface mimics the host page: white background, dark text,
 * so a Server Component rendered inside the inner shadow root looks like the
 * real thing instead of fighting the panel chrome. */
.rsco-visual-host {
  background: var(--color-elevated);
  color: var(--color-text-primary);
  min-height: 80px;
  border: var(--border-soft);
  border-radius: var(--radius-0);
  height: 100%;
  overflow: auto;
}

.tree-preview-raw {
  margin-top: var(--space-3);
}

.tree-preview-raw summary {
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  padding: var(--space-1) 0;
}

.tree-preview-raw pre {
  margin: var(--space-2) 0 0 0;
  padding: var(--space-3) var(--space-4);
  background: var(--color-recessed);
  border: var(--border-soft);
  border-radius: var(--radius-1);
  max-height: 160px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  color: var(--color-text-primary);
}

.tree-root + .tree-root {
  margin-top: var(--space-5);
  padding-top: var(--space-5);
  border-top: var(--border-dashed-soft);
}

.tree-root-label {
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: var(--space-2);
  color: var(--color-text-dim);
}

.tree-fieldset {
  border: var(--border-soft);
  border-radius: var(--radius-0);
  padding: var(--space-1) var(--space-4) var(--space-3) var(--space-4);
  margin: var(--space-2) 0;
  min-width: 0;
  background: var(--color-elevated);
}

.tree-fieldset > legend {
  padding: 0 var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  color: var(--color-text-primary);
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--color-elevated);
}

.tree-fieldset-client {
  border-style: dashed;
  border-color: var(--color-badge-rsc);
}

.tree-fieldset-suspense {
  border-color: var(--color-suspense-resolved);
}

.tree-fieldset-suspense-pending {
  border-color: var(--color-suspense-pending);
  border-style: dashed;
  background: color-mix(in srgb, var(--color-suspense-pending) 6%, var(--color-elevated));
}

.tree-type {
  color: var(--color-text-primary);
  font-weight: 600;
}

.tree-label {
  font-family: var(--font-mono);
  font-size: var(--font-min);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 1px var(--space-2);
  border-radius: var(--radius-2);
  border: 1px solid currentColor;
}

.tree-label-client {
  background: color-mix(in srgb, var(--color-badge-rsc) 12%, var(--color-elevated));
  color: var(--color-badge-rsc);
}

.tree-label-pending {
  background: color-mix(in srgb, var(--color-suspense-pending) 12%, var(--color-elevated));
  color: var(--color-suspense-pending);
}

.tree-label-resolved {
  background: color-mix(in srgb, var(--color-suspense-resolved) 12%, var(--color-elevated));
  color: var(--color-suspense-resolved);
}

.tree-text {
  padding: 1px 0;
  color: var(--color-text-dim);
  word-break: break-word;
  overflow-wrap: anywhere;
}

.tree-ref-module {
  padding: 1px 0 var(--space-1) 0;
  font-size: var(--font-xs);
}

.tree-fallback-note {
  font-size: var(--font-xs);
  padding: 1px 0;
  color: var(--color-text-mute);
}

.tree-empty {
  font-size: var(--font-xs);
  padding: 1px 0;
  color: var(--color-text-mute);
}

.tree-trunc {
  padding: var(--space-2) 0;
  color: var(--color-text-mute);
}

/* Page = full-width main; shell + extras live in a collapsable aside that
 * defaults to a thin strip on the right (just a toggle button + count).
 * When the user opens it, the grid swaps to 1fr / 220px and the aside body
 * shows. State is persisted in localStorage. */
.tree-preview-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 22px;
  gap: var(--space-3);
  height: 100%;
  padding: var(--space-4) var(--space-5);
}

.tree-preview-layout.aside-open {
  /* Tighter — subtrees are a side reference, not the main attraction. */
  grid-template-columns: minmax(0, 1fr) 160px;
}

.tree-preview-main {
  min-width: 0;
  overflow: auto;
}

.tree-preview-aside {
  min-width: 0;
  border-left: var(--border-soft);
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  display: flex;
  flex-direction: row;
  position: relative;
}

.tree-preview-aside.open {
  overflow: hidden;
}

.tree-aside-toggle {
  background: transparent;
  border: 0;
  color: var(--color-text-dim);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: var(--font-min);
  letter-spacing: 0.4px;
  padding: 0;
  width: 18px;
  flex-shrink: 0;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: var(--border-soft);
  transition: color var(--transition-fast), background var(--transition-fast);
}

.tree-preview-aside.open .tree-aside-toggle {
  writing-mode: initial;
  transform: none;
  width: 16px;
  border-right: none;
  border-bottom: var(--border-soft);
  align-self: flex-start;
  height: 18px;
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
  background: var(--color-surface);
}

.tree-aside-toggle:hover {
  color: var(--color-text-primary);
  background: var(--color-recessed);
}

.tree-aside-content {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding-left: var(--space-3);
  padding-right: 18px;
  padding-top: var(--space-1);
}

.tree-aside-heading {
  font-family: var(--font-mono);
  font-size: var(--font-min);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: var(--space-2);
  color: var(--color-text-dim);
}

.tree-aside-entry {
  margin: var(--space-1) 0;
  border: var(--border-soft);
  border-radius: var(--radius-0);
  background: var(--color-elevated);
}

.tree-aside-summary {
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  list-style: none;
  font-family: var(--font-mono);
  font-size: var(--font-min);
  color: var(--color-text-dim);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.tree-aside-summary::-webkit-details-marker { display: none; }

.tree-aside-summary::before {
  content: "▶";
  font-size: var(--font-min);
  color: var(--color-text-mute);
  transition: transform var(--transition-fast);
  display: inline-block;
}

.tree-aside-entry[open] > .tree-aside-summary::before {
  transform: rotate(90deg);
}

.tree-aside-body {
  padding: var(--space-1) var(--space-2) var(--space-2) var(--space-2);
  border-top: var(--border-soft);
  font-family: var(--font-mono);
  font-size: var(--font-min);
  line-height: var(--line-snug);
}

/* Inside the aside, fieldset chrome is squeezed: thinner paddings, smaller
   gaps in the legend, no minimum width on initials. The typography drops
   one notch (var(--font-min)) so deeply-nested trees stop wrapping. */
.tree-aside-body .tree-fieldset {
  padding: 0 var(--space-2) var(--space-1) var(--space-2);
  margin: var(--space-1) 0;
}

.tree-aside-body .tree-fieldset > legend {
  padding: 0 var(--space-1);
  font-size: var(--font-min);
  gap: var(--space-1);
}

.tree-aside-body .tree-type {
  font-size: var(--font-min);
}

.tree-aside-body .tree-label {
  font-size: var(--font-min);
  padding: 0 var(--space-1);
  letter-spacing: 0.3px;
  min-width: 12px;
  text-align: center;
}

.tree-aside-body .tree-text,
.tree-aside-body .tree-empty,
.tree-aside-body .tree-fallback-note {
  font-size: var(--font-min);
}

.tree-extras {
  margin-top: var(--space-5);
  padding-top: var(--space-4);
  border-top: var(--border-dashed-soft);
}

.tree-extras-heading {
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: var(--space-2);
  color: var(--color-text-dim);
}

.tree-extra {
  margin: var(--space-1) 0;
}

.tree-extra-summary {
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  padding: var(--space-1) 0;
  list-style: none;
}

.tree-extra-summary::before {
  content: "▶ ";
  display: inline-block;
  width: 10px;
  font-size: var(--font-min);
  transition: transform var(--transition-fast);
}

.tree-extra[open] > .tree-extra-summary::before {
  transform: rotate(90deg);
}
`;

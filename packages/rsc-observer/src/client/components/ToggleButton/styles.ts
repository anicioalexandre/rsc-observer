export const css = `
.toggle {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: var(--z-toggle);
  height: var(--toggle-height);
  padding: 0 var(--space-4);
  border-radius: var(--radius-1);
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border: var(--border-strong);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: var(--font-sm);
  font-weight: 600;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  box-shadow: var(--shadow-none);
  transition: background var(--transition-fast), color var(--transition-fast);
}

.toggle:hover {
  background: var(--color-accent-hover);
}

.toggle[data-open="true"] {
  background: var(--color-elevated);
  color: var(--color-text-primary);
  border-color: var(--color-border-strong);
}

/* The recording-status pip is rendered inside the toggle via the shared
   <RecordingDot /> — see RecordingDot/styles.ts. We just give the toggle
   itself a small left padding so the dot doesn't crowd the border. */
`;

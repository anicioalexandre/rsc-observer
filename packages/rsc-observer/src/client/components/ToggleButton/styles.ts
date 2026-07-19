export const css = `
/* Raised paper key (blog nav-key). Clicking presses it down-right into
   its own shadow; while the panel is open it STAYS pressed and fills
   amber (blog ReactionButton pattern). Chrome snaps — no easing. */
.toggle {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: var(--z-toggle);
  height: var(--toggle-height);
  padding: 0 var(--space-4);
  border-radius: var(--radius-1);
  background: var(--color-elevated);
  color: var(--color-text-primary);
  border: 2px solid var(--color-border-strong);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: var(--font-sm);
  font-weight: 600;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  box-shadow: var(--shadow-retro-sm);
  transition: none;
}

.toggle:hover {
  background: var(--color-recessed);
}

.toggle:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.toggle[data-open="true"] {
  transform: translate(2px, 2px);
  box-shadow: none;
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.toggle[data-open="true"]:hover {
  background: var(--color-accent-hover);
}

/* The recording-status pip is rendered inside the toggle via the shared
   <RecordingDot /> — see RecordingDot/styles.ts. We just give the toggle
   itself a small left padding so the dot doesn't crowd the border. */
`;

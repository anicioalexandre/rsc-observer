export const css = `
.filter-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.filter-bar-row {
  flex-direction: row;
  flex: 1;
  min-width: 0;
}

/* Stacked variant — used inside the chrome popover. Each chip and the
 * url input takes a full row, no flex-grow on the container. */
.filter-bar-stacked {
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-2);
  width: 100%;
}

.filter-bar-stacked .filter-chip {
  text-align: left;
  padding: var(--space-2) var(--space-4);
  width: 100%;
  font-size: var(--font-sm);
}

.filter-bar-stacked .filter-url {
  width: 100%;
  max-width: none;
  margin-top: var(--space-2);
  /* Match the chip / button height: 4px vert + 8px horiz, 11px font. */
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-sm);
}

.filter-chip {
  background: var(--color-accent);
  border: var(--border-strong);
  color: var(--color-text-inverse);
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  letter-spacing: 0.3px;
  padding: var(--space-1) var(--space-4);
  border-radius: var(--radius-2);
  cursor: pointer;
  transition: color var(--transition-fast), border-color var(--transition-fast),
              background var(--transition-fast);
}

.filter-chip-off {
  background: transparent;
  border-color: var(--color-border-soft);
  color: var(--color-text-mute);
}

.filter-chip:hover {
  background: var(--color-accent-hover);
}

/* Off-state hover inverts to the same dark style as the active chip
   so the click affordance reads clearly on cream surface. */
.filter-chip-off:hover {
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border-color: var(--color-accent);
}

.filter-url {
  background: var(--color-elevated);
  border: var(--border-soft);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-2);
  width: 180px;
  max-width: 40%;
}

.filter-url:focus {
  outline: none;
  border-color: var(--color-focus-ring);
}

.filter-url::placeholder {
  color: var(--color-text-mute);
}
`;

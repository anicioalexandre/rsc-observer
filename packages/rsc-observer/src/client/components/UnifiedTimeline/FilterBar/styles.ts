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
  height: 26px;
  padding: 0 var(--space-4);
  width: 100%;
  font-size: var(--font-sm);
}

.filter-bar-stacked .filter-url {
  width: 100%;
  max-width: none;
  margin-top: var(--space-2);
  /* Match the stacked row height: 26px, 11px font. */
  height: 26px;
  padding: 0 var(--space-4);
  font-size: var(--font-sm);
}

/* Flat toggle keys. ON = ink fill (the blog's inverse-badge pattern) —
   ink, not amber, because the chips sit ON the amber title bar in wide
   mode and amber actives would vanish. OFF = paper. Title-bar controls
   are flat and share a 22px height so they centre as one row; no offset
   shadows, no press-translate. Chrome snaps — no easing. */
.filter-chip {
  background: var(--color-text-primary);
  border: var(--border-strong);
  color: var(--color-text-inverse);
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  letter-spacing: 0.3px;
  height: 22px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-2);
  cursor: pointer;
  transition: none;
}

.filter-chip-off {
  background: var(--color-elevated);
  border-color: var(--color-border-strong);
  color: var(--color-text-dim);
}

.filter-chip:hover {
  background: var(--color-text-dim);
}

.filter-chip-off:hover {
  background: var(--color-recessed);
  color: var(--color-text-primary);
}

/* Sunken input well (blog .win-sunken) — the inset bevel is the only
   chrome, no border. Same 22px height as the title-bar keys; the 8px
   horizontal padding keeps text clear of the 2px inset bevel. */
.filter-url {
  background: var(--color-elevated);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--bevel-darker),
    inset -1px -1px 0 var(--bevel-light),
    inset 2px 2px 0 var(--bevel-dark);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  height: 22px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-2);
  width: 180px;
  max-width: 40%;
}

/* Classic dotted focus rectangle, inset past the bevel. */
.filter-url:focus {
  outline: 1px dotted var(--color-focus-ring);
  outline-offset: -4px;
}

.filter-url::placeholder {
  color: var(--color-text-mute);
}
`;

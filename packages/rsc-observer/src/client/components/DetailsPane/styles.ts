export const css = `
.details-empty {
  padding: var(--space-5) var(--space-6);
  font-family: var(--font-mono);
  font-size: var(--font-sm);
  color: var(--color-text-dim);
}

.details {
  padding: var(--space-4) var(--space-6);
  font-family: var(--font-mono);
}

.details-pin {
  font-size: var(--font-xs);
  margin-bottom: var(--space-4);
}

.details-hint {
  font-size: var(--font-xs);
  margin-bottom: var(--space-4);
  color: var(--color-text-dim);
}

.details-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-2);
}

.details-method {
  font-family: var(--font-mono);
  font-size: var(--font-sm);
  color: var(--color-text-dim);
}

.details-url {
  font-family: var(--font-mono);
  font-size: var(--font-base);
  color: var(--color-text-primary);
  word-break: break-all;
  flex: 1;
  min-width: 0;
}

.details-summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  color: var(--color-text-dim);
  font-size: var(--font-sm);
  font-family: var(--font-mono);
  padding-bottom: var(--space-4);
  border-bottom: var(--border-soft);
  margin-bottom: var(--space-4);
}

.details-summary code {
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}

.details-section {
  margin: var(--space-4) 0;
}

.details-section-label {
  font-size: var(--font-xxs);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--color-text-mute);
  font-weight: 700;
  margin-bottom: var(--space-2);
}

.details-error {
  color: var(--color-danger);
  font-size: var(--font-sm);
}

.details-stack {
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  color: var(--color-text-primary);
  margin: 0;
  padding: var(--space-3) var(--space-4);
  background: var(--color-recessed);
  border: var(--border-soft);
  border-radius: var(--radius-1);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 120px;
  overflow: auto;
}

.flat-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--font-sm);
}

.flat-list li {
  padding: var(--space-1) 0;
  border-bottom: var(--border-dashed-soft);
  word-break: break-all;
}

.flat-list li:last-child {
  border-bottom: none;
}

/* Chips for EventRef kinds that aren't "request". Pale tinted bg + saturated
 * dark fg — readable on the cream surface, doesn't fight the panel chrome. */
.fetch-chip {
  display: inline-block;
  padding: 1px var(--space-3);
  border-radius: var(--radius-2);
  font-size: var(--font-xxs);
  font-weight: 700;
  letter-spacing: 0.5px;
  font-family: var(--font-mono);
  border: 1px solid currentColor;
}

.fetch-chip-fast {
  background: color-mix(in srgb, var(--color-fast) 12%, var(--color-elevated));
  color: var(--color-fast);
}
.fetch-chip-medium {
  background: color-mix(in srgb, var(--color-medium) 12%, var(--color-elevated));
  color: var(--color-medium);
}
.fetch-chip-slow {
  background: color-mix(in srgb, var(--color-slow) 12%, var(--color-elevated));
  color: var(--color-slow);
}
.fetch-chip-critical {
  background: color-mix(in srgb, var(--color-critical) 12%, var(--color-elevated));
  color: var(--color-critical);
}

/* Badges (shared with timeline labels). Same idiom: pale bg + saturated fg. */
.badge {
  display: inline-block;
  padding: 1px var(--space-3);
  border-radius: var(--radius-2);
  font-size: var(--font-xxs);
  font-weight: 700;
  letter-spacing: 0.5px;
  font-family: var(--font-mono);
  flex-shrink: 0;
  border: 1px solid currentColor;
}

.badge-rsc {
  background: color-mix(in srgb, var(--color-badge-rsc) 12%, var(--color-elevated));
  color: var(--color-badge-rsc);
}

.badge-html {
  background: color-mix(in srgb, var(--color-badge-html) 12%, var(--color-elevated));
  color: var(--color-badge-html);
}

.badge-act {
  background: color-mix(in srgb, var(--color-badge-act) 12%, var(--color-elevated));
  color: var(--color-badge-act);
}
`;

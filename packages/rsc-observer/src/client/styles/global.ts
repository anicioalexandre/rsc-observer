export const css = `
:host {
  all: initial;
  font-family: var(--font-mono);
  font-size: var(--font-base);
  line-height: var(--line-normal);
  color: var(--color-text-primary);
}

* {
  box-sizing: border-box;
}

::selection {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

/* Win98 scrollbars — square, hard-edged: putty thumb with an ink border
   on a darker paper track. */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: var(--color-recessed);
  border-radius: 0;
}

::-webkit-scrollbar-thumb {
  background: var(--color-border-soft);
  border: 1px solid var(--color-border-strong);
  border-radius: 0;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--bevel-dark);
}

::-webkit-scrollbar-corner {
  background: var(--color-recessed);
}

button {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}

.dim {
  color: var(--color-text-dim);
}

.mono {
  font-family: var(--font-mono);
}
`;

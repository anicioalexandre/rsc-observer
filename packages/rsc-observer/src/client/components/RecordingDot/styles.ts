export const css = `
@keyframes rsc-rec-pulse {
  0%, 100% { opacity: 1;   transform: scale(1); }
  50%      { opacity: 0.7; transform: scale(0.95); }
}

.rec-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-rec);
  flex-shrink: 0;
  animation: rsc-rec-pulse var(--rec-pulse-duration) ease-in-out infinite;
}

.rec-dot[data-active="false"] {
  background: var(--color-text-mute);
  animation: none;
}

@media (prefers-reduced-motion: reduce) {
  .rec-dot {
    animation: none;
  }
}
`;

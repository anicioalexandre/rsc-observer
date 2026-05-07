// Wall-clock timestamp in milliseconds (since Unix epoch).
// Comparable across the Node ↔ browser process boundary because both runtimes
// expose `performance.timeOrigin` (a Unix timestamp marking when their high-res
// clock was created). Adding `performance.now()` (relative ms since timeOrigin)
// produces a wall-clock value with sub-millisecond precision in both.
//
// Why not Date.now()?
//   Date.now() is wall-clock too, but at ~1ms granularity. timeOrigin +
//   performance.now() preserves the strict monotonicity of the high-res clock.
export function wallNow(): number {
  return performance.timeOrigin + performance.now();
}

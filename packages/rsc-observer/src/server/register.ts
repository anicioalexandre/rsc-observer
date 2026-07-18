// Ready-made Next.js instrumentation hook. Wire it into your app with a single
// line in instrumentation.ts:
//
//   export { register } from "rsc-observer/instrumentation";
//
// Edge-safe by construction: Next evaluates instrumentation.ts in BOTH the
// Node.js and Edge runtimes, so nothing Node-specific may be imported at this
// module's top level. The actual instrumentation (which patches node:http,
// node:async_hooks, etc.) is loaded lazily via dynamic import, and only when
// running in the Node.js runtime.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrument");
  }
}

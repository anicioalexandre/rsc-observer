import { defineConfig } from "tsdown";

export default defineConfig([
  // Node-side entries (instrumentation, middleware, CLI)
  {
    entry: {
      "instrument-server": "src/server/instrument.ts",
      middleware: "src/server/middleware.ts",
      cli: "src/cli/init.ts",
    },
    format: ["esm", "cjs"],
    platform: "node",
    dts: true,
    clean: true,
  },
  // Browser loader (injects <script src="/rsc-observer/client.js">)
  {
    entry: { "instrument-client": "src/client/loader.ts" },
    format: ["esm", "cjs"],
    platform: "browser",
    dts: true,
    clean: false,
  },
  // Overlay IIFE (React + components, bundled for the user's browser)
  {
    entry: { client: "src/client/entry.ts" },
    format: ["iife"],
    platform: "browser",
    globalName: "__rscObserver",
    minify: true,
    clean: false,
    dts: false,
    noExternal: [/.*/],
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
  },
]);

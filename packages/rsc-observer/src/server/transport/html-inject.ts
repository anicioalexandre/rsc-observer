// SSR pre-paint shell: a tiny <style> + button + <rsc-observer-overlay>
// element injected just before </body> so the toggle is visible at first
// paint, well before the IIFE bundle loads. The client entry script
// removes the SSR button on mount and the custom-element registration
// upgrades the existing <rsc-observer-overlay> in place — the React
// React-rendered button takes over without flicker.
//
// The shell uses literal values rather than CSS variables (the design
// tokens haven't been parsed yet at SSR time). Numbers are kept in sync
// with tokens.ts manually; if those tokens shift, update SHELL_HTML.

const SHELL_HTML = [
  "<style>",
  "#rsc-observer-ssr-toggle{",
  "position:fixed;",
  "bottom:16px;right:16px;",
  "z-index:2147483647;",
  "height:28px;padding:0 8px;",
  "border-radius:1px;",
  "background:#18181b;color:#fafaf7;",
  "border:1px solid #18181b;",
  'font-family:ui-monospace,"SF Mono",Menlo,monospace;',
  "font-size:11px;font-weight:600;letter-spacing:0.5px;",
  "cursor:pointer;",
  "display:inline-flex;align-items:center;gap:4px;",
  "}",
  "#rsc-observer-ssr-toggle::before{",
  'content:"";width:6px;height:6px;',
  "border-radius:1px;background:#15803d;",
  "}",
  "</style>",
  '<button id="rsc-observer-ssr-toggle" type="button" aria-label="Open rsc-observer">rsc</button>',
  "<rsc-observer-overlay></rsc-observer-overlay>",
].join("");

const SHELL_BUF = Buffer.from(SHELL_HTML, "utf8");
const BODY_TAG = Buffer.from("</body>", "utf8");

// Hold this many trailing bytes of each forwarded chunk so a "</body>"
// straddling two chunks still matches. The tag is 7 bytes; 32 leaves
// plenty of slack and stays cheap.
const TAIL_BYTES = 32;

// Streaming state machine. Call `next(chunk)` for every outgoing res.write
// chunk (even after `done` is true — it returns the chunk unchanged).
// Call `flush()` once on res.end to drain any held tail.
export class HtmlInjector {
  private done = false;
  private tail: Buffer = Buffer.alloc(0);

  // Returns bytes to forward immediately. Empty Buffer = "holding";
  // caller skips the underlying write for this chunk.
  next(chunk: Buffer): Buffer {
    if (this.done) return chunk;

    const combined = Buffer.concat([this.tail, chunk]);
    const idx = combined.indexOf(BODY_TAG);
    if (idx >= 0) {
      this.done = true;
      this.tail = Buffer.alloc(0);
      return Buffer.concat([
        combined.subarray(0, idx),
        SHELL_BUF,
        combined.subarray(idx),
      ]);
    }

    if (combined.length <= TAIL_BYTES) {
      this.tail = combined;
      return Buffer.alloc(0);
    }
    this.tail = combined.subarray(combined.length - TAIL_BYTES);
    return combined.subarray(0, combined.length - TAIL_BYTES);
  }

  // Drain any held bytes. Called on res.end. If no </body> appeared
  // (non-HTML response, malformed body, very short fragment) we forward
  // what we held without injection — better to ship correct-but-bare
  // HTML than risk corrupting a non-HTML payload we mis-classified.
  flush(): Buffer {
    if (this.done) return Buffer.alloc(0);
    const out = this.tail;
    this.tail = Buffer.alloc(0);
    return out;
  }

  isDone(): boolean {
    return this.done;
  }
}

// Decide whether a response is a candidate for shell injection. Skips:
//   - non-GET methods (Server Action POSTs etc. don't have <body>)
//   - non-text/html content-types (RSC payloads, JSON, images, …)
//   - compressed bodies (gzip / br / deflate) — we'd need to decompress
//     and recompress to inject; the dev path never uses encoding so the
//     cost isn't worth it. Reverse-proxy-compressed prod traffic just
//     skips here and the IIFE's own mount path handles it as before.
export function shouldInjectShell(
  req: { method?: string },
  res: { getHeader: (name: string) => unknown },
): boolean {
  if (req.method !== "GET") return false;
  const ct = res.getHeader("content-type");
  if (typeof ct !== "string" || !ct.includes("text/html")) return false;
  const enc = res.getHeader("content-encoding");
  if (typeof enc === "string" && enc !== "" && enc !== "identity") {
    return false;
  }
  return true;
}

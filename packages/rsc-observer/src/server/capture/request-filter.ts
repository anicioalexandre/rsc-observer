const SKIP_PREFIXES = [
  "/_next/static/",
  "/_next/image",
  "/_next/data/",
  "/_next/webpack-hmr",
  "/__nextjs_original-stack-frame",
  "/__nextjs_launch-editor",
  "/__nextjs_source-map",
  "/__nextjs_font",
  "/__nextjs_devtools",
  "/__nextjs_original-source",
  "/rsc-observer/",
  "/.well-known/",
];

const SKIP_EXACT = new Set<string>([
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
]);

export function shouldCaptureRequest(url: string | undefined): boolean {
  if (!url) return false;
  const path = url.split("?")[0] ?? "";
  if (SKIP_EXACT.has(path)) return false;
  for (const p of SKIP_PREFIXES) {
    if (path.startsWith(p)) return false;
  }
  return true;
}

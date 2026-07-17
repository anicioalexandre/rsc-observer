// Tags we never render in the visual preview (would execute scripts, load resources,
// or otherwise affect the host page).
export const BLOCKED_TAGS = new Set<string>([
  "script",
  "style",
  "link",
  "meta",
  "head",
  "title",
  "iframe",
  "object",
  "embed",
  "noscript",
  "audio",
  "video",
  "source",
  "track",
  "base",
]);

// Tags we render as <div> instead of themselves (no document-level meaning inside a shadow root).
export const NEUTRAL_TAGS = new Set<string>(["html", "body"]);

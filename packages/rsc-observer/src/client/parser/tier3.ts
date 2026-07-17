import type { Tier3Row } from "./types";

// Flight wire format rows are newline-delimited: `<hexId>:<typeTag?><rawData>`
// - hexId: 0+ hex chars (usually non-empty, but some rows emit "" e.g. ":HL[...]")
// - typeTag: 0+ uppercase letters (e.g. "I", "HL", "D", "H", "E", "T")
// - rawData: the rest of the line (usually a JSON value)
const ROW_RE = /^([0-9a-f]*):([A-Z]+)?(.*)$/;

export function parseTier3(accumulated: string): Tier3Row[] {
  const rows: Tier3Row[] = [];
  if (!accumulated) return rows;
  const lines = accumulated.split("\n");
  for (const line of lines) {
    if (line.length === 0) continue;
    const m = ROW_RE.exec(line);
    if (!m) continue;
    rows.push({
      id: m[1] ?? "",
      type: m[2] ?? "",
      rawData: m[3] ?? "",
    });
  }
  return rows;
}

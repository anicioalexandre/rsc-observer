import type { ServerFetch } from "../../../store/types";
import { classifyDuration, formatTimeLabel, pct } from "../utils";

interface Props {
  fetch: ServerFetch;
  t0: number;
  duration: number;
}

function shortPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export function FetchBar({ fetch, t0, duration }: Props) {
  const start = pct(fetch.start - t0, duration);
  const end = pct(fetch.end - t0, duration);
  const width = Math.max(0.2, end - start);
  const dur = fetch.end - fetch.start;
  const cls = `fetch-bar fetch-bar-${classifyDuration(dur)}`;
  const title = `${fetch.method} ${fetch.url}\n${fetch.status} · ${formatTimeLabel(dur)}`;

  return (
    <div
      className={cls}
      style={{ left: `${start}%`, width: `${width}%` }}
      title={title}
    >
      {shortPath(fetch.url)}
    </div>
  );
}

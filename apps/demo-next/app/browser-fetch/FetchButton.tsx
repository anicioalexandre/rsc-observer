"use client";

import { useState } from "react";

// Browser-side fetch: when the user clicks, the browser issues a fetch().
// Our client-side fetch-wrap (capture/fetch-wrap.ts) should observe it and
// emit a `client_fetch` event with method GET. There's no server-side
// counterpart, so the FETCH lane row in CLIENT should be standalone (no
// matching SERVER lane request after dedup).

interface Result {
  ok: boolean;
  step: string;
  ms: number;
  at: number;
}

export function FetchButton() {
  const [data, setData] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);

  const onClick = async (): Promise<void> => {
    setPending(true);
    try {
      const r = await fetch(
        "http://localhost:3000/api/delay?ms=400&step=browser-fetch",
        { cache: "no-store" },
      );
      setData((await r.json()) as Result);
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        style={{
          padding: "8px 16px",
          border: "1px solid #0b57d0",
          background: pending ? "#cce0ff" : "#0b57d0",
          color: "#fff",
          borderRadius: 6,
          cursor: pending ? "wait" : "pointer",
        }}
      >
        {pending ? "fetching…" : "Run browser fetch"}
      </button>
      {data ? (
        <pre style={{ marginTop: 12, fontSize: 12 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

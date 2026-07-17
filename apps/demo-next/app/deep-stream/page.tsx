import { Suspense, type ReactNode } from "react";

async function fetchAt(ms: number, step: string) {
  const r = await fetch(
    `http://localhost:3000/api/delay?ms=${ms}&step=${step}`,
    { cache: "no-store" },
  );
  return r.json();
}

interface LevelProps {
  level: number;
  children?: ReactNode;
}

async function Level({ level, children }: LevelProps) {
  // Each level awaits its own fetch (300ms per level) before rendering its
  // children. With Suspense around each level, the resolution chunks should
  // arrive in waves: level 1 at ~300, level 2 at ~600, ... level 5 at ~1500.
  const data = await fetchAt(300, `level-${level}`);
  return (
    <div
      style={{
        marginLeft: level * 8,
        padding: 12,
        borderRadius: 6,
        border: "1px solid rgba(99,102,241,0.4)",
        background: `rgba(99,102,241,${0.05 + level * 0.04})`,
      }}
    >
      <strong>Level {level}</strong>
      <pre style={{ margin: "6px 0", fontSize: 11 }}>
        {JSON.stringify(data, null, 2)}
      </pre>
      {children}
    </div>
  );
}

function Pending({ label }: { label: string }) {
  return (
    <div className="rounded border border-dashed border-indigo-300 bg-indigo-50 p-3 text-sm text-indigo-700">
      streaming {label}…
    </div>
  );
}

export default function DeepStreamPage() {
  // Five levels of nested Suspense, each gated on its own ~300 ms fetch.
  // Outer level's children prop is a Suspense wrapping the next level —
  // so each level only starts its fetch *after* the previous resolved.
  return (
    <main className="mx-auto max-w-3xl p-8 font-sans">
      <header className="mb-4">
        <h1 className="text-3xl font-bold text-slate-900">Deep stream</h1>
        <p className="text-slate-600 mt-1">
          Five-level nested awaits, each behind its own Suspense. The HTML
          stream should hold the connection open for ~1.5 s and emit a chunk
          per level as each fetch resolves.
        </p>
      </header>
      <Suspense fallback={<Pending label="level 1" />}>
        <Level level={1}>
          <Suspense fallback={<Pending label="level 2" />}>
            <Level level={2}>
              <Suspense fallback={<Pending label="level 3" />}>
                <Level level={3}>
                  <Suspense fallback={<Pending label="level 4" />}>
                    <Level level={4}>
                      <Suspense fallback={<Pending label="level 5" />}>
                        <Level level={5} />
                      </Suspense>
                    </Level>
                  </Suspense>
                </Level>
              </Suspense>
            </Level>
          </Suspense>
        </Level>
      </Suspense>
    </main>
  );
}

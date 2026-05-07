import Link from "next/link";

interface Scenario {
  href: string;
  label: string;
  description: string;
  group: "edge" | "styling" | "wire" | "data" | "actions";
}

const scenarios: Scenario[] = [
  {
    group: "edge",
    href: "/baseline",
    label: "Baseline",
    description: "Three host elements, no fetch, no Suspense, no client.",
  },
  {
    group: "edge",
    href: "/error",
    label: "404 / not-found",
    description: "Server Component calls notFound() — array-root forest.",
  },
  {
    group: "edge",
    href: "/soft-nav",
    label: "Soft navigation",
    description: "Links that trigger Next's RSC prefetch + soft-nav fetch.",
  },
  {
    group: "edge",
    href: "/owner-stack",
    label: "Owner stack",
    description: "Nested Server Components — fetch shows owner chain.",
  },
  {
    group: "edge",
    href: "/browser-fetch",
    label: "Browser fetch",
    description: "Client component calls fetch() — CLIENT lane only.",
  },
  {
    group: "styling",
    href: "/tailwind",
    label: "Tailwind",
    description: "Tailwind v4 utility classes — verify host CSS adoption.",
  },
  {
    group: "styling",
    href: "/mui",
    label: "Material UI",
    description: "MUI components — every node is a CLIENT placeholder.",
  },
  {
    group: "styling",
    href: "/mixed",
    label: "Mixed",
    description: "Tailwind + MUI in the same page.",
  },
  {
    group: "wire",
    href: "/server-only",
    label: "Server-only",
    description:
      "No client components anywhere — flight wire is plain host elements.",
  },
  {
    group: "wire",
    href: "/server-children",
    label: "Server children inside MUI",
    description:
      "Host elements passed as children to a MUI Card — visible in the wire.",
  },
  {
    group: "data",
    href: "/waterfall",
    label: "Waterfall",
    description: "Sequential server fetches with a suspended client subtree.",
  },
  {
    group: "data",
    href: "/parallel",
    label: "Parallel",
    description: "Promise.all of three fetches inside one Server Component.",
  },
  {
    group: "data",
    href: "/deferred-fetch",
    label: "Deferred fetch",
    description: "Page renders fast; slow child sits behind a Suspense.",
  },
  {
    group: "data",
    href: "/nested-suspense",
    label: "Nested Suspense",
    description: "Three Suspense boundaries staggered by 500/1500/3000 ms.",
  },
  {
    group: "data",
    href: "/deep-stream",
    label: "Deep stream",
    description: "Five-level nested awaits — each emits its own chunk.",
  },
  {
    group: "actions",
    href: "/actions",
    label: "Server Actions",
    description: "POST a `use server` function and watch the round-trip.",
  },
];

const groupLabels: Record<Scenario["group"], string> = {
  edge: "Baselines & edge cases",
  styling: "Styling",
  wire: "Server vs Client in the flight wire",
  data: "Data fetching & Suspense",
  actions: "Server Actions",
};

export default function Home() {
  const groups: Record<Scenario["group"], Scenario[]> = {
    edge: [],
    styling: [],
    wire: [],
    data: [],
    actions: [],
  };
  for (const s of scenarios) groups[s.group].push(s);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 font-sans">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">
        rsc-observer demo
      </h1>
      <p className="text-neutral-600 mb-8">
        Scenarios exercising the capture pipeline. Open the overlay (bottom-right)
        and click around.
      </p>
      {(Object.keys(groups) as (keyof typeof groups)[]).map((g) => (
        <section key={g} className="mb-8">
          <h2 className="text-xs uppercase tracking-widest text-neutral-500 mb-3">
            {groupLabels[g]}
          </h2>
          <ul className="space-y-2">
            {groups[g].map((s) => (
              <li
                key={s.href}
                className="flex flex-col rounded-md border border-neutral-200 bg-white p-3 hover:border-neutral-300 transition-colors"
              >
                <Link
                  href={s.href}
                  className="text-base font-medium text-blue-700 hover:underline"
                >
                  {s.label}
                </Link>
                <span className="text-sm text-neutral-600">{s.description}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

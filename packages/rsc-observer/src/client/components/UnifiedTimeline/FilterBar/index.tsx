import type { FilterState } from "../../../store/types";
import {
  getFilter,
  setFilterUrl,
  toggleFilterType,
  useStoreVersion,
} from "../../../store";

const CHIPS: { key: FilterKey; label: string }[] = [
  { key: "rsc", label: "RSC" },
  { key: "html", label: "HTML" },
  { key: "act", label: "Actions" },
  { key: "fetch", label: "Fetches" },
  { key: "client", label: "Client" },
];

type FilterKey = FilterState["hidden"] extends Set<infer U> ? U : never;

interface Props {
  // "row" — original horizontal layout (unused by the panel after Phase 3
  // but kept for any caller that wants the inline form).
  // "stacked" — chips stack vertically inside the chrome popover, one
  // per row, with the URL input on its own line below.
  variant?: "row" | "stacked";
}

export function FilterBar({ variant = "row" }: Props = {}) {
  useStoreVersion();
  const filter = getFilter();

  return (
    <div className={`filter-bar filter-bar-${variant}`}>
      {CHIPS.map((c) => {
        const off = filter.hidden.has(c.key);
        return (
          <button
            key={c.key}
            type="button"
            className={`filter-chip${off ? " filter-chip-off" : ""}`}
            onClick={() => toggleFilterType(c.key)}
            title={off ? `Show ${c.label}` : `Hide ${c.label}`}
          >
            {c.label}
          </button>
        );
      })}
      <input
        type="text"
        placeholder="filter by URL…"
        className="filter-url"
        value={filter.urlSubstring}
        onChange={(e) => setFilterUrl(e.target.value)}
      />
    </div>
  );
}

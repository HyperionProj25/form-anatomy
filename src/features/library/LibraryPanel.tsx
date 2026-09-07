import {
  Activity,
  ArrowRight,
  Bone,
  ChevronRight,
  CircleHelp,
  Eye,
  Layers,
  Network,
  Search,
  X,
} from "lucide-react";
import { useMemo } from "react";
import { parts, partForSide, partById } from "../../data/catalog";
import { filterParts, groupParts } from "../../data/groups";
import { LINE_GROUPS, lines } from "../../data/lines";
import { REGION_LABELS, REGION_ORDER } from "../../data/regions";
import { useStore, type LayerFilter, type Mode, type SideFilter } from "../../state/store";

type Props = { mobileOpen: boolean; onCloseMobile: () => void };

const SYSTEMS: { id: Mode; label: string; icon: typeof Activity }[] = [
  { id: "muscles", label: "Muscles", icon: Activity },
  { id: "bones", label: "Bones", icon: Bone },
  { id: "fascia", label: "Fascia", icon: Network },
];

export default function LibraryPanel({ mobileOpen, onCloseMobile }: Props) {
  const { state, dispatch } = useStore();
  const { mode, filters, selected, hidden, isolated, opacity, line } = state;
  const selectedPart = selected ? partById(selected) : undefined;
  const groups = useMemo(() => groupParts(filterParts(parts, mode, filters)), [mode, filters]);
  const showLines = mode === "fascia" && !filters.search;

  return (
    <aside className={`left-panel ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="panel-heading">
        <Layers size={17} />
        <h2>Explore the body</h2>
        <button className="mobile-close icon-button" onClick={onCloseMobile} aria-label="Close layers">
          <X size={18} />
        </button>
      </div>
      <div className="system-switch" role="group" aria-label="Anatomy system">
        {SYSTEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-pressed={mode === id}
            className={mode === id ? "active" : ""}
            onClick={() => dispatch({ type: "setMode", mode: id })}
          >
            <Icon size={19} />
            {label}
          </button>
        ))}
      </div>
      <label className="search-box">
        <Search size={16} />
        <input
          aria-label="Search anatomical structures"
          placeholder="Find a structure…"
          value={filters.search}
          onChange={(e) => dispatch({ type: "setFilters", filters: { search: e.target.value } })}
        />
        {filters.search && (
          <button
            onClick={() => dispatch({ type: "setFilters", filters: { search: "" } })}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </label>

      {showLines ? (
        <>
          {LINE_GROUPS.map((g) => (
            <div key={g.id}>
              <div className="section-label">
                {g.label.toUpperCase()} <span>{lines.filter((l) => l.group === g.id).length}</span>
              </div>
              <div className="line-list">
                {lines
                  .filter((l) => l.group === g.id)
                  .map((l) => (
                    <button
                      className={`line-item ${line === l.id ? "selected" : ""}`}
                      key={l.id}
                      onClick={() => dispatch({ type: "setLine", line: l.id })}
                    >
                      <span className="line-dot" style={{ background: l.color }} />
                      <span>
                        {l.name}
                        <small>{l.subtitle}</small>
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
              </div>
            </div>
          ))}
          <div className="context-note">
            <Network size={18} />
            <p>
              A connected perspective
              <span>Follow anatomical relationships across regions of the body.</span>
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="filter-chips" role="group" aria-label="Body region">
            <button
              className={filters.region === "all" ? "active" : ""}
              onClick={() => dispatch({ type: "setFilters", filters: { region: "all" } })}
            >
              All regions
            </button>
            {REGION_ORDER.map((r) => (
              <button
                key={r}
                className={filters.region === r ? "active" : ""}
                onClick={() => dispatch({ type: "setFilters", filters: { region: r } })}
              >
                {REGION_LABELS[r]}
              </button>
            ))}
          </div>
          <div className="filter-rows">
            {mode !== "bones" && (
              <div className="segmented" role="group" aria-label="Layer (approximate)">
                {(["all", "superficial", "deep"] as LayerFilter[]).map((l) => (
                  <button
                    key={l}
                    aria-pressed={filters.layer === l}
                    className={filters.layer === l ? "active" : ""}
                    onClick={() => dispatch({ type: "setFilters", filters: { layer: l } })}
                  >
                    {l === "all" ? "All layers" : l[0].toUpperCase() + l.slice(1)}
                  </button>
                ))}
              </div>
            )}
            <div className="segmented" role="group" aria-label="Body side">
              {(["both", "left", "right"] as SideFilter[]).map((s) => (
                <button
                  key={s}
                  aria-pressed={filters.side === s}
                  className={filters.side === s ? "active" : ""}
                  onClick={() => dispatch({ type: "setFilters", filters: { side: s } })}
                >
                  {s === "both" ? "Both sides" : s === "left" ? "Left" : "Right"}
                </button>
              ))}
            </div>
          </div>
          <div className="section-label">
            {filters.search ? "SEARCH RESULTS" : "STRUCTURE LIBRARY"} <span>{groups.length}</span>
          </div>
          <div className="structure-list">
            {!groups.length ? (
              <p className="subtle">No matches. Try femur, deltoid, or gastrocnemius.</p>
            ) : (
              groups.map((g) => {
                const isSelected = selectedPart?.key === g.key;
                return (
                  <div className={`group-row ${isSelected ? "selected" : ""}`} key={g.key}>
                    <button
                      className="group-name"
                      onClick={() => {
                        const p = partForSide(g.key, filters.side);
                        if (p) dispatch({ type: "select", id: p.id });
                      }}
                    >
                      <span>{g.name}</span>
                      {!g.bilateral && <ChevronRight size={13} />}
                    </button>
                    {g.bilateral && (
                      <span className="side-toggle" aria-label={`${g.name} side`}>
                        {g.parts
                          .filter((p) => p.side !== "midline")
                          .map((p) => (
                            <button
                              key={p.id}
                              aria-pressed={selected === p.id}
                              className={selected === p.id ? "active" : ""}
                              onClick={() => dispatch({ type: "select", id: p.id })}
                              title={p.side === "left" ? "Left side" : "Right side"}
                            >
                              {p.side === "left" ? "L" : "R"}
                            </button>
                          ))}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      <div className="layer-settings">
        <div className="section-label">LAYER CONTROLS</div>
        <label className="opacity-label">
          {mode === "bones" ? "Bone" : "Muscle"} opacity <span>{opacity}%</span>
          <input
            type="range"
            min="10"
            max="100"
            value={opacity}
            onChange={(e) => dispatch({ type: "setOpacity", opacity: +e.target.value })}
          />
        </label>
        <button
          className="text-button"
          disabled={!hidden.length && !isolated}
          onClick={() => dispatch({ type: "restoreAll" })}
        >
          <Eye size={15} /> Restore hidden structures {hidden.length > 0 && `(${hidden.length})`}
        </button>
      </div>
      <button className="help-link" onClick={() => dispatch({ type: "setModal", modal: "guide" })}>
        <CircleHelp size={16} /> A little help exploring <ArrowRight size={14} />
      </button>
    </aside>
  );
}

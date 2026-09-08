import {
  Activity,
  ArrowRight,
  Bone,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Eye,
  Network,
  Play,
  Search,
  Square,
  X,
} from "lucide-react";
import { useMemo } from "react";
import { parts, partForSide, partById } from "../../data/catalog";
import { filterParts, firstMatch, groupParts } from "../../data/groups";
import { JOINT_IDS, JOINT_LABELS, jointPhrase } from "../../data/joints";
import { LINE_GROUPS, lines } from "../../data/lines";
import { displayName, secondaryName, type NameLang } from "../../data/names";
import { REGION_LABELS, REGION_ORDER } from "../../data/regions";
import { useStore, type Filters, type Mode, type SideFilter } from "../../state/store";
import CaveatChip from "../shared/CaveatChip";

type Props = { mobileOpen: boolean; onCloseMobile: () => void };

const SYSTEMS: { id: Mode; label: string; icon: typeof Activity }[] = [
  { id: "muscles", label: "Muscles", icon: Activity },
  { id: "bones", label: "Bones", icon: Bone },
  { id: "fascia", label: "Fascia", icon: Network },
];

type SelectProps = {
  label: string;
  value: string;
  options: readonly (readonly [string, string])[];
  onChange: (value: string) => void;
};

/** A native select that fills green only while it filters. */
function FilterSelect({ label, value, options, onChange }: SelectProps) {
  const active = value !== options[0][0];
  return (
    <span className={`filter-select ${active ? "active" : ""}`}>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <ChevronDown size={13} />
    </span>
  );
}

const REGION_OPTIONS = [
  ["all", "All regions"] as const,
  ...REGION_ORDER.map((r) => [r, REGION_LABELS[r]] as const),
];
const JOINT_OPTIONS = [
  ["all", "Any joint"] as const,
  ...JOINT_IDS.map((j) => [j, JOINT_LABELS[j]] as const),
];

export default function LibraryPanel({ mobileOpen, onCloseMobile }: Props) {
  const { state, dispatch } = useStore();
  const { mode, filters, selected, hidden, isolated, opacity, line, names } = state;
  const selectedPart = selected ? partById(selected) : undefined;
  const groups = useMemo(() => groupParts(filterParts(parts, mode, filters)), [mode, filters]);
  const showLines = mode === "fascia" && !filters.search;
  const activeJoint = filters.joint === "all" ? null : filters.joint;
  const moving = !!activeJoint && state.motion?.joint === activeJoint;
  const first = filters.search ? firstMatch(groups, filters.search) : undefined;
  const noun = mode === "bones" ? "bones" : "muscles";
  const setFilters = (f: Partial<Filters>) => dispatch({ type: "setFilters", filters: f });
  const selectFirst = () => {
    const p = first && partForSide(first.key, filters.side);
    if (p) dispatch({ type: "select", id: p.id });
  };

  return (
    <aside className={`left-panel ${mobileOpen ? "mobile-open" : ""}`} aria-label="Find a structure">
      <div className="panel-heading">
        <Search size={17} />
        <h2>Find a structure</h2>
        <button className="mobile-close icon-button" onClick={onCloseMobile} aria-label="Close the finder">
          <X size={18} />
        </button>
      </div>
      <label className="search-box">
        <Search size={16} />
        <input
          id="structure-search"
          aria-label="Search structures"
          placeholder={mode === "fascia" ? "Search muscles…" : `Search ${noun}…`}
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              selectFirst();
            }
          }}
        />
        {filters.search && (
          <button onClick={() => setFilters({ search: "" })} aria-label="Clear search">
            <X size={14} />
          </button>
        )}
      </label>
      {first && (
        <div className="match-strip" aria-live="polite">
          <kbd>Enter</kbd> selects <strong>{displayName(first.parts[0], names)}</strong>
          <span className="match-count">
            · {groups.length} {groups.length === 1 ? "match" : "matches"}
          </span>
        </div>
      )}
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
          <div className="filter-row">
            <FilterSelect
              label="Body region"
              value={filters.region}
              options={REGION_OPTIONS}
              onChange={(v) => setFilters({ region: v as Filters["region"] })}
            />
            {mode === "muscles" && (
              <FilterSelect
                label="Joint crossed"
                value={filters.joint}
                options={JOINT_OPTIONS}
                onChange={(v) => setFilters({ joint: v as Filters["joint"] })}
              />
            )}
            <div className="segmented" role="group" aria-label="Body side">
              {(["both", "left", "right"] as SideFilter[]).map((s) => (
                <button
                  key={s}
                  aria-pressed={filters.side === s}
                  className={filters.side !== s ? "" : s === "both" ? "current" : "active"}
                  onClick={() => setFilters({ side: s })}
                >
                  {s === "both" ? "Both sides" : s === "left" ? "Left" : "Right"}
                </button>
              ))}
            </div>
          </div>
          {mode === "muscles" && activeJoint && (
            <>
              <button
                className={moving ? "outline-button move-joint" : "primary-button move-joint"}
                onClick={() =>
                  moving
                    ? dispatch({ type: "motionStop" })
                    : dispatch({ type: "motionStart", joint: activeJoint })
                }
              >
                {moving ? <Square size={12} /> : <Play size={14} />}
                {moving ? "Stop moving" : `Move the ${jointPhrase(activeJoint)}`}
              </button>
              <div className="card-caveat joint-note">
                <CaveatChip label="Approximate">
                  Muscles attached on both sides of the {jointPhrase(activeJoint)}, matched from
                  the attachment text. Aponeuroses and the iliotibial tract are not seen.
                </CaveatChip>
              </div>
            </>
          )}
          <div className="section-label">
            {filters.search ? "MATCHES" : noun.toUpperCase()} <span>{groups.length}</span>
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
                      <span>
                        {displayName(g.parts[0], names)}
                        {names === "latin" && secondaryName(g.parts[0], names) && (
                          <small>{secondaryName(g.parts[0], names)}</small>
                        )}
                      </span>
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
        <div className="section-label">OPACITY</div>
        <label className="opacity-label">
          {mode === "bones" ? "Bones" : "Muscles"} <span>{opacity}%</span>
          <input
            type="range"
            min="10"
            max="100"
            value={opacity}
            onChange={(e) => dispatch({ type: "setOpacity", opacity: +e.target.value })}
          />
        </label>
        <div className="segmented names-toggle" role="group" aria-label="Structure names">
          {(["english", "latin"] as NameLang[]).map((l) => (
            <button
              key={l}
              aria-pressed={names === l}
              className={names === l ? "active" : ""}
              onClick={() => dispatch({ type: "setNames", names: l })}
            >
              {l === "english" ? "English names" : "Latin names"}
            </button>
          ))}
        </div>
        <button
          className="text-button"
          disabled={!hidden.length && !isolated}
          onClick={() => dispatch({ type: "restoreAll" })}
        >
          <Eye size={15} /> Restore hidden structures {hidden.length > 0 && `(${hidden.length})`}
        </button>
      </div>
      <button className="help-link" onClick={() => dispatch({ type: "setModal", modal: "guide" })}>
        <CircleHelp size={16} /> Help <ArrowRight size={14} />
      </button>
    </aside>
  );
}

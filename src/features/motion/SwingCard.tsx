import { Activity, ChevronDown, FileText, Pause, Play, X } from "lucide-react";
import { useMemo } from "react";
import { changeRanking, type Ranked } from "../../data/body";
import { JOINT_LABELS, type JointId } from "../../data/joints";
import { cableRoles, type Cable, type MotionSetup } from "../../data/motion";
import { prettyName } from "../../data/names";
import {
  CAVEATS,
  SWING_JOINTS,
  curveOf,
  frameAt,
  phaseAt,
  roleForSide,
  sideForRole,
  type Role,
  type SwingEventName,
  type SwingFile,
} from "../../data/swings";
import { useStore } from "../../state/store";
import { swingById } from "../../data/swings";

const sessionOf = (id: string) => swingById(id)?.session ?? null;
import CaveatChip from "../shared/CaveatChip";
import { usePrefersReducedMotion } from "../shared/usePrefersReducedMotion";

const SHORTEN = "#f2a531";
const LENGTHEN = "#3d8bff";
const SPEEDS = [0.25, 0.5, 1];
const EVENTS: SwingEventName[] = ["footPlant", "maxBatSpeed", "contact"];
const SHORT_EVENT: Record<SwingEventName, string> = {
  footPlant: "Plant",
  maxBatSpeed: "Peak",
  contact: "Contact",
  followThrough: "Follow",
};
const ROLES: Role[] = ["lead", "back"];

type Props = { swing: SwingFile; setup: MotionSetup; onCollapse?: () => void };

/** What the angle did between foot plant and contact, in the joint's own words. */
function verb(joint: JointId, delta: number): string {
  if (joint === "ankle") return delta > 0 ? "plantarflexes" : "dorsiflexes";
  return delta > 0 ? "flexes" : "extends";
}

/** Controls and readout for a measured swing driving one joint, in the stage dock. */
export default function SwingCard({ swing, setup, onCollapse }: Props) {
  const { state, dispatch } = useStore();
  const reduced = usePrefersReducedMotion();
  const ranked = useMemo(() => (swing.segments ? changeRanking(swing) : null), [swing]);
  const m = state.motion;
  if (!m?.swing) return null;
  const pct = (c: number) => `${c < 0 ? "−" : "+"}${Math.round(Math.abs(c) * 100)} %`;
  const rankedList = (list: Ranked[]) =>
    list.length
      ? list.map((r, i) => (
          <span key={r.id}>
            {i > 0 && ", "}
            <button className="link-button" onClick={() => dispatch({ type: "select", id: r.id })}>
              {prettyName(r.name)} {r.id.endsWith("-l") ? "L" : r.id.endsWith("-r") ? "R" : ""} {pct(r.change)}
            </button>
          </span>
        ))
      : "none";
  const curve = curveOf(swing, m.joint, m.side);
  const frame = frameAt(swing, m.phase);
  const angle = Math.round(curve[frame] ?? 0);
  const role = roleForSide(m.side, swing.handedness);
  const plant = swing.events.footPlant ?? 0;
  const contact = swing.events.contact ?? swing.frames - 1;
  const atPlant = Math.round(curve[plant] ?? 0);
  const atContact = Math.round(curve[contact] ?? 0);
  const delta = atContact - atPlant;
  const jointName = JOINT_LABELS[m.joint].toLowerCase();
  const roles = cableRoles(setup);
  const names = (list: Cable[]) => {
    if (!list.length) return "no path changes by more than 3 % of its muscle's size";
    const seen = new Set<string>();
    const rows: string[] = [];
    for (const c of [...list].sort((a, b) => Math.abs(b.change) - Math.abs(a.change))) {
      const name = prettyName(c.name);
      if (seen.has(name)) continue;
      seen.add(name);
      rows.push(`${name} ${c.change < 0 ? "−" : "+"}${Math.round(Math.abs(c.change) * 100)} %`);
    }
    const shown = rows.slice(0, 5);
    const more = rows.length - shown.length;
    return shown.join(", ") + (more > 0 ? ` and ${more} more` : "");
  };
  const lo = Math.min(...curve);
  const hi = Math.max(...curve);
  const span = hi - lo || 1;
  const x = (f: number) => (swing.frames > 1 ? (f / (swing.frames - 1)) * 200 : 0);
  const y = (v: number) => 40 - ((v - lo) / span) * 36;
  const points = curve.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  return (
    <div className="motion-card swing-card" aria-label="Measured swing">
      <div className="playlist-head">
        <Activity size={14} />
        <strong>{swing.label}</strong>
        <span className="card-buttons">
          {onCollapse && (
            <button className="icon-button" aria-label="Fold the swing card" onClick={onCollapse}>
              <ChevronDown size={14} />
            </button>
          )}
          <button className="icon-button" aria-label="Stop the swing" onClick={() => dispatch({ type: "motionStop" })}>
            <X size={14} />
          </button>
        </span>
      </div>
      <p className="subtle swing-attribution">Motion: {swing.source.attribution}.</p>
      <div className="motion-controls">
        {!reduced && (
          <button
            className="outline-button"
            aria-label={m.playing ? "Pause" : "Play"}
            onClick={() => dispatch({ type: "motionPlay", playing: !m.playing })}
          >
            {m.playing ? <Pause size={13} /> : <Play size={13} />}
          </button>
        )}
        <input
          type="range"
          min={0}
          max={swing.frames - 1}
          value={frame}
          aria-label="Swing frame"
          onChange={(e) => dispatch({ type: "motionScrub", phase: phaseAt(swing, Number(e.target.value)) })}
        />
        <span className="playlist-status">{(frame / swing.fps).toFixed(2)} s</span>
      </div>
      <div className="swing-events" aria-hidden="true">
        {EVENTS.map((e, i) => {
          const f = swing.events[e];
          return (
            f !== undefined && (
              <span key={e} className={i === 1 ? "row-1" : ""} style={{ left: `${(x(f) / 200) * 100}%` }}>
                {SHORT_EVENT[e]}
              </span>
            )
          );
        })}
        {swing.eventsEstimated && <em>events estimated</em>}
      </div>
      {reduced && (
        <p className="subtle motion-reduced">
          Playback is off because your system prefers reduced motion. Drag the frame.
        </p>
      )}
      <div className="segmented swing-speed" role="group" aria-label="Playback speed">
        {SPEEDS.map((s) => (
          <button
            key={s}
            aria-pressed={m.swing?.speed === s}
            className={m.swing?.speed === s ? "active" : ""}
            onClick={() => dispatch({ type: "swingSpeed", speed: s })}
          >
            {s}×
          </button>
        ))}
      </div>
      {ROLES.map((r) => {
        const side = sideForRole(r, swing.handedness);
        return (
          <div className="swing-chips" role="group" aria-label={`${r === "lead" ? "Lead" : "Back"} side joint`} key={r}>
            <span className="chip-role">{r === "lead" ? "Lead" : "Back"}</span>
            {SWING_JOINTS.map((j) => {
              const active = m.joint === j && m.side === side;
              return (
                <button
                  key={j}
                  aria-pressed={active}
                  className={active ? "active" : ""}
                  onClick={() => dispatch({ type: "swingJoint", joint: j, side })}
                >
                  {JOINT_LABELS[j]}
                </button>
              );
            })}
          </div>
        );
      })}
      <svg className="swing-spark" viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden="true">
        {EVENTS.map((e) => {
          const f = swing.events[e];
          return f !== undefined && <line key={e} x1={x(f)} x2={x(f)} y1={2} y2={42} stroke="#aab4ad" strokeWidth={0.6} />;
        })}
        <polyline points={points} fill="none" stroke="#2ac7e0" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
        <line x1={x(frame)} x2={x(frame)} y1={0} y2={44} stroke="#1f1a12" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </svg>
      <p className="swing-sentence">
        <strong>
          {r(role)} {jointName}: {angle}° now.
        </strong>{" "}
        {atPlant}° at {swing.eventsEstimated ? "estimated " : ""}foot plant, {atContact}° at{" "}
        {swing.eventsEstimated ? "estimated " : ""}contact: {verb(m.joint, delta)} {Math.abs(delta)}°.
      </p>
      <div className="motion-roles">
        <div>
          <span className="line-dot" style={{ background: SHORTEN }} />
          <span>
            Shortening, foot plant to contact
            <small>{names(roles.shortens)}</small>
          </span>
        </div>
        <div>
          <span className="line-dot" style={{ background: LENGTHEN }} />
          <span>
            Lengthening, foot plant to contact
            <small>{names(roles.lengthens)}</small>
          </span>
        </div>
      </div>
      <label className="motion-lines">
        <input
          type="checkbox"
          checked={m.lines}
          onChange={(e) => dispatch({ type: "motionLines", lines: e.target.checked })}
        />
        Show lines of action
      </label>
      {swing.segments && (
        <label className="motion-lines">
          <input
            type="checkbox"
            checked={m.swing.body}
            onChange={(e) => dispatch({ type: "swingBody", on: e.target.checked })}
          />
          Whole body
        </label>
      )}
      {swing.segments && m.swing.body && (
        <>
          <label className="motion-lines">
            <input
              type="checkbox"
              checked={m.swing.shapes}
              onChange={(e) => dispatch({ type: "swingShapes", on: e.target.checked })}
            />
            Muscle shapes (approximate)
          </label>
          {m.swing.shapes ? (
            <label className="motion-lines">
              <input
                type="checkbox"
                checked={m.swing.colour}
                onChange={(e) => dispatch({ type: "swingColour", on: e.target.checked })}
              />
              Colour by change (amber shortens, blue lengthens)
            </label>
          ) : (
            <p className="subtle swing-body-note">
              Muscle lines of action, origin to insertion: amber as a path shortens, blue as it
              lengthens, grey within 1 %. Click a line to select the muscle.
            </p>
          )}
          <button
            className="outline-button swing-report-button"
            onClick={() => dispatch({ type: "setModal", modal: "swing-report" })}
          >
            <FileText size={14} /> Swing report
          </button>
          {sessionOf(swing.id) && (
            <button
              className="outline-button swing-report-button"
              onClick={() => dispatch({ type: "openSession", id: sessionOf(swing.id)! })}
            >
              <FileText size={14} /> Session report
            </button>
          )}
          {ranked && (
            <div className="motion-roles swing-ranked">
              <div>
                <span className="line-dot" style={{ background: SHORTEN }} />
                <span>
                  Shortening most, whole body, foot plant to contact
                  <small>{rankedList(ranked.shortening)}</small>
                </span>
              </div>
              <div>
                <span className="line-dot" style={{ background: LENGTHEN }} />
                <span>
                  Lengthening most
                  <small>{rankedList(ranked.lengthening)}</small>
                </span>
              </div>
            </div>
          )}
          <p className="subtle swing-body-note">
            Path length between attachments on a generic model. Tendon, wrapping and fibre angle are
            not modelled; a shortening path means the muscle-tendon unit shortened, not that it
            contracted. Neck muscles are left out: the head is one rigid block here.
          </p>
        </>
      )}
      <div className="card-caveat">
        <CaveatChip label="Measured swing">
          Angles from motion capture on a generic adult model.{" "}
          {m.swing.body &&
            "The whole body follows eighteen rigid segments; the shoulder girdle takes a third of the arm's lift and the patella rides with the shin. "}
          {swing.caveats.map((k) => CAVEATS[k]).filter(Boolean).join(" ")} Percentages are the change
          in path length between attachments as a share of the muscle&apos;s size, not fibre length.
        </CaveatChip>
      </div>
    </div>
  );
}

function r(role: Role): string {
  return role === "lead" ? "Lead" : "Back";
}

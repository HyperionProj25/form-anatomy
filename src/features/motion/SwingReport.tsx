import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { REGION_ORDER } from "../../data/muscle-groups";
import { describeStat, groupStats, kinematicSequence, reportCsv, type GroupStat } from "../../data/swing-report";
import { SWING_INDEX, type SwingFile } from "../../data/swings";
import { useStore } from "../../state/store";
import { useSwing } from "./useSwing";

const REGION_LABELS: Record<GroupStat["group"]["region"], string> = {
  leg: "Legs",
  hip: "Hips",
  trunk: "Trunk",
  shoulder: "Shoulders",
  arm: "Arms",
};

const pct = (x: number, digits = 0) => `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(digits)} %`;
const ms = (t: number) => `${t > 0 ? "+" : ""}${t} ms`;

function Spark({ series, swing }: { series: Float32Array; swing: SwingFile }) {
  const n = series.length;
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of series) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo || 1;
  const x = (f: number) => (n > 1 ? (f / (n - 1)) * 110 : 0);
  const y = (v: number) => 20 - ((v - lo) / span) * 18;
  const points = Array.from(series, (v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const plant = swing.events.footPlant ?? 0;
  const contact = swing.events.contact ?? n - 1;
  return (
    <svg className="spark" viewBox="0 0 110 22" preserveAspectRatio="none" aria-hidden="true">
      <line x1={x(plant)} x2={x(plant)} y1={1} y2={21} stroke="#aab4ad" strokeWidth={0.8} />
      <line x1={x(contact)} x2={x(contact)} y1={1} y2={21} stroke="#aab4ad" strokeWidth={0.8} />
      <line x1={0} x2={110} y1={y(1)} y2={y(1)} stroke="#e3e5dc" strokeWidth={0.6} />
      <polyline points={points} fill="none" stroke="#2c3940" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function downloadCsv(swing: SwingFile, compare: SwingFile | null) {
  const text = reportCsv(swing) + (compare ? "\n" + reportCsv(compare) : "");
  const blob = new Blob([text], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `swing-report-${swing.id}${compare ? `-vs-${compare.id}` : ""}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The swing report modal: per-group path-length change, timing, the kinematic sequence, compare and CSV. */
export default function SwingReport() {
  const { state } = useStore();
  const id = state.motion?.swing?.id;
  const swing = useSwing(id);
  const [compareId, setCompareId] = useState<string>("");
  const compare = useSwing(compareId || undefined);
  const stats = useMemo(() => (swing?.segments ? groupStats(swing) : []), [swing]);
  const compareStats = useMemo(() => (compare?.segments ? groupStats(compare) : []), [compare]);
  const sequence = useMemo(() => (swing?.segments ? kinematicSequence(swing) : []), [swing]);
  const compareSequence = useMemo(() => (compare?.segments ? kinematicSequence(compare) : []), [compare]);
  if (!swing) return <p className="subtle">Start a measured swing to see its report.</p>;
  if (!swing.segments) return <p className="subtle">This swing file has no whole-body data. Rebuild the swings.</p>;
  const compareRow = (s: GroupStat) =>
    compareStats.find((c) => c.group.id === s.group.id && c.role === s.role);

  return (
    <div className="swing-report">
      <div className="eyebrow">SWING REPORT</div>
      <h2 id="modal-title">{swing.label}</h2>
      <p>
        Path length of each muscle group through the swing, from the posed skeleton: how much it
        shortened or lengthened from foot plant to contact, how fast, and when. Times are relative
        to contact{swing.eventsEstimated ? " (events estimated from the motion)" : ""}. Lead is the
        side facing the pitcher.
      </p>
      <div className="report-controls">
        <label>
          Compare with{" "}
          <select value={compareId} onChange={(e) => setCompareId(e.target.value)} aria-label="Swing to compare with">
            <option value="">nothing</option>
            {SWING_INDEX.filter((s) => s.id !== swing.id).map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button className="outline-button" onClick={() => downloadCsv(swing, compare)}>
          <Download size={14} /> Download CSV
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>Side</th>
              <th>Path</th>
              <th className="num">Plant → contact</th>
              <th className="num">Fastest shortening</th>
              <th className="num">Longest before contact</th>
              {compare && <th className="num">{compare.label.split(" · ")[0]}: plant → contact</th>}
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => {
              const rows = [];
              if (i === 0 || stats[i - 1].group.region !== s.group.region) {
                rows.push(
                  <tr className="region-row" key={`region-${s.group.region}`}>
                    <td colSpan={compare ? 7 : 6}>{REGION_LABELS[s.group.region]}</td>
                  </tr>,
                );
              }
              const other = compareRow(s);
              rows.push(
                <tr key={`${s.group.id}-${s.role}`} title={describeStat(s)}>
                  <td>{s.group.label}</td>
                  <td>{s.role === "lead" ? "Lead" : "Back"}</td>
                  <td>
                    <Spark series={s.series} swing={swing} />
                  </td>
                  <td className="num">{pct(s.change)}</td>
                  <td className="num">
                    {pct(s.peakShortening)}/s at {ms(s.peakShorteningMs)}
                  </td>
                  <td className="num">
                    {pct(s.longest - 1)} at {ms(s.longestMs)}
                  </td>
                  {compare && (
                    <td className="num">
                      {other ? (
                        <>
                          {pct(other.change)}{" "}
                          <span className={other.change - s.change > 0 ? "delta-up" : "delta-down"}>
                            ({pct(other.change - s.change)})
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                </tr>,
              );
              return rows;
            })}
          </tbody>
        </table>
      </div>
      <h3>Kinematic sequence</h3>
      <p>When each segment reached its peak rotation speed, relative to contact.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Segment</th>
              <th className="num">Peak speed</th>
              <th className="num">When</th>
              {compare && <th className="num">{compare.label.split(" · ")[0]}</th>}
            </tr>
          </thead>
          <tbody>
            {sequence.map((step, i) => (
              <tr key={step.label}>
                <td>{step.label}</td>
                <td className="num">{Math.abs(step.peakDegPerS)}°/s</td>
                <td className="num">{ms(step.peakMs)}</td>
                {compare && (
                  <td className="num">
                    {compareSequence[i] ? `${Math.abs(compareSequence[i].peakDegPerS)}°/s at ${ms(compareSequence[i].peakMs)}` : "—"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="subtle">
        Path length between attachments on a generic adult model, posed from the capture&apos;s
        segment orientations. Tendon, wrapping and fibre angle are not modelled, so these are
        muscle-tendon path changes, not fibre lengths or contraction. Muscles with both attachments
        on one rigid segment (hand intrinsics, jaw, abdominal wall) cannot change length here and are
        left out. Forearm and shin rotation are held; the head is one block; the shoulder girdle
        follows a quarter of the arm. The report
        states what moved and when; it makes no recommendation. Motion: {swing.source.attribution}.
      </p>
      <p className="subtle">
        Sorted from the ground up, in the order the {REGION_ORDER.length} regions load in a swing.
      </p>
    </div>
  );
}

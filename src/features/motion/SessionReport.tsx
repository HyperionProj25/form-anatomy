import { Download, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { loadSession, type SessionFile, type SessionHandAggregate, type SessionSwing, type Stat } from "../../data/sessions";
import { sideForRole } from "../../data/swings";
import { useStore } from "../../state/store";

const pm = (s: Stat, digits = 0, unit = "") =>
  Number.isFinite(s.mean) ? `${s.mean.toFixed(digits)} ± ${s.sd.toFixed(digits)}${unit}` : "—";
const pct = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(0)} %`;
const pctStat = (s: Stat) => (Number.isFinite(s.mean) ? `${pct(s.mean)} ± ${(s.sd * 100).toFixed(0)}` : "—");

function useSession(id: string | null): SessionFile | null {
  const [session, setSession] = useState<SessionFile | null>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    loadSession(id)
      .then((s) => {
        if (live) setSession(s);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [id]);
  return session && session.id === id ? session : null;
}

function sessionCsv(s: SessionFile): string {
  const head = ["swing", "hand", "bat_speed_mph", "separation_at_plant_deg", "separation_peak_deg", "lead_knee_at_plant_deg", "lead_knee_at_contact_deg", "pelvis_peak_ms", "torso_peak_ms", "lead_arm_peak_ms", "lead_forearm_peak_ms", "pelvis_agreement_rms_deg", "torso_agreement_rms_deg"];
  const rows = [head.join(",")];
  for (const w of s.swings) {
    const seq = (label: string) => w.sequence.find((x) => x.label === label)?.peakMs ?? "";
    rows.push([w.id, w.handedness, w.batSpeedMph, w.separationAtPlant, w.separationPeak, w.leadKneeAtPlant, w.leadKneeAtContact, seq("Pelvis rotation"), seq("Torso rotation"), seq("Lead arm"), seq("Lead forearm"), w.agreement.pelvisRms, w.agreement.torsoRms].join(","));
  }
  rows.push("");
  rows.push(["swing", "group", "side", "change_plant_to_contact", "peak_shortening_per_s", "peak_shortening_ms", "longest_ratio", "longest_ms"].join(","));
  for (const w of s.swings) for (const g of w.groups) rows.push([w.id, JSON.stringify(g.label), g.role, g.change, g.peakShortening, g.peakShorteningMs, g.longest, g.longestMs].join(","));
  return rows.join("\n") + "\n";
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The session report modal: every full swing's metrics, their spread per hand, and the exemplars to open. */
export default function SessionReport() {
  const { state, dispatch } = useStore();
  const session = useSession(state.sessionId);
  const hands = useMemo(() => (session ? (Object.keys(session.byHand) as ("L" | "R")[]) : []), [session]);
  const [hand, setHand] = useState<"L" | "R" | null>(null);
  const [sortKey, setSortKey] = useState<"batSpeedMph" | "separationAtPlant" | "id">("batSpeedMph");
  const active = hand && session?.byHand[hand] ? hand : hands[0];
  const agg: SessionHandAggregate | undefined = active ? session?.byHand[active] : undefined;
  const swings = useMemo(() => {
    if (!session || !active) return [];
    const list = session.swings.filter((w) => w.handedness === active);
    return [...list].sort((a, b) => (sortKey === "id" ? a.id.localeCompare(b.id) : b[sortKey] - a[sortKey]));
  }, [session, active, sortKey]);
  if (!session) return <p className="subtle">Loading the session…</p>;
  const open = (w: SessionSwing) => {
    if (!w.fileId) return;
    dispatch({ type: "setModal", modal: null });
    dispatch({ type: "swingStart", id: w.fileId, joint: "knee", side: sideForRole("lead", w.handedness) });
  };

  return (
    <div className="swing-report session-report">
      <div className="eyebrow">SESSION REPORT</div>
      <h2 id="modal-title">{session.label}</h2>
      <p>
        {session.swings.length} full swings run through the swing pipeline, right- and left-handed
        reported apart because the export carries no hitter identity. Every number is the mean
        across the session&apos;s swings, with its standard deviation: the spread is the consistency.
      </p>
      <div className="report-controls">
        {hands.length > 1 && (
          <div className="segmented" role="group" aria-label="Handedness">
            {hands.map((h) => (
              <button key={h} aria-pressed={active === h} className={active === h ? "active" : ""} onClick={() => setHand(h)}>
                {h === "R" ? "Right-handed" : "Left-handed"} ({session.byHand[h]!.count})
              </button>
            ))}
          </div>
        )}
        <button className="outline-button" onClick={() => download(`${session.id}.csv`, sessionCsv(session))}>
          <Download size={14} /> Download CSV
        </button>
      </div>
      {agg && (
        <>
          <h3>Across {agg.count} swings</h3>
          <div className="table-wrap">
            <table>
              <tbody>
                <tr>
                  <td>Bat speed (tip, peak)</td>
                  <td className="num">{pm(agg.batSpeedMph, 1, " mph")}</td>
                  <td className="num">best {agg.batSpeedMph.max.toFixed(1)} mph</td>
                </tr>
                <tr>
                  <td>Hip-shoulder separation at foot plant</td>
                  <td className="num">{pm(agg.separationAtPlant, 0, "°")}</td>
                  <td className="num">peak before contact {pm(agg.separationPeak, 0, "°")}</td>
                </tr>
                <tr>
                  <td>Lead knee extension, foot plant to contact</td>
                  <td className="num">{pm(agg.leadKneeExtension, 0, "°")}</td>
                  <td />
                </tr>
                <tr>
                  <td>Agreement with TrackMan&apos;s own segment angles (RMS)</td>
                  <td className="num">pelvis {pm(agg.agreement.pelvisRms, 1, "°")}</td>
                  <td className="num">torso {pm(agg.agreement.torsoRms, 1, "°")}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3>Kinematic sequence, ms before contact</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Segment</th>
                  <th className="num">Form (from the posed skeleton)</th>
                  <th className="num">TrackMan (its angular velocities)</th>
                </tr>
              </thead>
              <tbody>
                {agg.sequenceMs.map((s) => {
                  const theirs = agg.trackmanSequenceMs.find((t) => t.label === s.label || (s.label === "Lead arm" && t.label === "Lead arm"));
                  return (
                    <tr key={s.label}>
                      <td>{s.label}</td>
                      <td className="num">{pm(s.ms)}</td>
                      <td className="num">{theirs ? pm(theirs.ms) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <h3>Muscle groups, foot plant to contact</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Side</th>
                  <th className="num">Change (mean ± sd)</th>
                  <th className="num">Fastest shortening at (ms)</th>
                  <th className="num">Load (longest before contact)</th>
                </tr>
              </thead>
              <tbody>
                {agg.groups.map((g) => (
                  <tr key={`${g.group}-${g.role}`}>
                    <td>{g.label}</td>
                    <td>{g.role === "lead" ? "Lead" : "Back"}</td>
                    <td className="num">{pctStat(g.change)}</td>
                    <td className="num">{pm(g.peakShorteningMs)}</td>
                    <td className="num">{Number.isFinite(g.longest.mean) ? `${pct(g.longest.mean - 1)} ± ${(g.longest.sd * 100).toFixed(0)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Swings</h3>
          <div className="report-controls">
            <label>
              Sort by{" "}
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as typeof sortKey)} aria-label="Sort swings by">
                <option value="batSpeedMph">bat speed</option>
                <option value="separationAtPlant">separation at foot plant</option>
                <option value="id">order</option>
              </select>
            </label>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Swing</th>
                  <th className="num">Bat speed</th>
                  <th className="num">Separation at plant</th>
                  <th className="num">Lead knee plant → contact</th>
                  <th className="num">Pelvis → torso peaks</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {swings.map((w) => (
                  <tr key={w.id}>
                    <td>{w.id}</td>
                    <td className="num">{w.batSpeedMph.toFixed(1)} mph</td>
                    <td className="num">{w.separationAtPlant.toFixed(0)}°</td>
                    <td className="num">
                      {w.leadKneeAtPlant.toFixed(0)}° → {w.leadKneeAtContact.toFixed(0)}°
                    </td>
                    <td className="num">
                      {w.sequence[0]?.peakMs} → {w.sequence[1]?.peakMs} ms
                    </td>
                    <td>
                      {w.fileId && (
                        <button className="link-button" onClick={() => open(w)}>
                          <Play size={12} /> Open
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="subtle">
        Path lengths between attachments on a generic adult model, posed from each capture&apos;s
        segment orientations; not fibre lengths or contraction. Bat speed is the peak of the
        tracked tip. Agreement is the RMS difference between this pipeline&apos;s pelvis and torso
        rotation and TrackMan&apos;s own segment angles on the same swing. The report states what
        moved and when; it makes no recommendation. Motion: {session.source.attribution}.
      </p>
    </div>
  );
}

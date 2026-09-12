/**
 * Generate the validation note from the built session files (spec section 18; deal memo 2.1).
 *
 *   npx tsx scripts/validation-note.ts
 *
 * Reads public/sessions/*.json and writes docs/validation/validation-note.md: per session and
 * hand, how this pipeline's pelvis and torso rotation agree with TrackMan's own segment angles,
 * how the kinematic-sequence timing compares, and the spread of the headline metrics. Every
 * number here is recomputable from the exports with `npm run build:session`.
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SessionFile, Stat } from "../src/data/sessions";

const SESSIONS_DIR = resolve("public/sessions");
const OUT = resolve("docs/validation/validation-note.md");

const fmt = (s: Stat, d = 1) => (Number.isFinite(s.mean) ? `${s.mean.toFixed(d)} ± ${s.sd.toFixed(d)}` : "—");
const fmtMax = (s: Stat, d = 1) => (Number.isFinite(s.max) ? s.max.toFixed(d) : "—");

function main() {
  const files = readdirSync(SESSIONS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
  const sessions = files.map((f) => JSON.parse(readFileSync(join(SESSIONS_DIR, f), "utf8")) as SessionFile);
  const lines: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  lines.push(`# Validation note v1: Form's swing pipeline against TrackMan's own segment angles`);
  lines.push("");
  lines.push(`Generated ${today} by \`scripts/validation-note.ts\` from ${sessions.length} built session file(s). Regenerate with \`npm run build:session -- 1 2 3 4 && npm run validation:note\`.`);
  lines.push("");
  lines.push("## What is compared");
  lines.push("");
  lines.push(
    "For every full swing in a TrackMan hitting export, the pipeline derives eighteen rigid-segment orientations from the 21 tracked body points, poses a generic adult skeleton with them, and reads joint angles and trunk rotation from the posed skeleton. TrackMan's export also carries its own pelvis and torso segment angles (`segmentRotation`, first Euler component) and segment angular velocities. This note reports, per swing, the RMS difference between the pipeline's pelvis and torso rotation about vertical and TrackMan's, both made relative to the same start frame, differences taken modulo 360, with the sign convention allowed to differ. It also reports when each segment reached peak rotation speed relative to contact, from the pipeline and from TrackMan's angular velocities.",
  );
  lines.push("");
  lines.push("What this does and does not show: agreement with TrackMan's own segment angles shows the pipeline reproduces the capture's trunk kinematics; it does not show the capture is right. That needs a marker-based or force-plate reference (protocol in the deal memo, section 2.1). Muscle-path changes are computed from the posed skeleton and have no external reference yet.");
  lines.push("");
  lines.push("## Agreement, per session and hand");
  lines.push("");
  lines.push("| Session | Hand | Swings | Pelvis RMS (°) mean ± sd | Pelvis RMS max | Torso RMS (°) mean ± sd | Torso RMS max |");
  lines.push("|---|---|---|---|---|---|---|");
  const allPelvis: number[] = [];
  const allTorso: number[] = [];
  let total = 0;
  for (const s of sessions)
    for (const hand of ["R", "L"] as const) {
      const a = s.byHand[hand];
      if (!a) continue;
      total += a.count;
      lines.push(`| ${s.label} | ${hand} | ${a.count} | ${fmt(a.agreement.pelvisRms)} | ${fmtMax(a.agreement.pelvisRms)} | ${fmt(a.agreement.torsoRms)} | ${fmtMax(a.agreement.torsoRms)} |`);
      for (const w of s.swings.filter((x) => x.handedness === hand)) {
        allPelvis.push(w.agreement.pelvisRms);
        allTorso.push(w.agreement.torsoRms);
      }
    }
  const pooled = (v: number[]) => {
    const f = v.filter(Number.isFinite);
    const m = f.reduce((a, b) => a + b, 0) / (f.length || 1);
    const sd = Math.sqrt(f.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, f.length - 1));
    const sorted = [...f].sort((a, b) => a - b);
    return { m, sd, p95: sorted[Math.floor(0.95 * (sorted.length - 1))] ?? NaN, n: f.length };
  };
  const pp = pooled(allPelvis);
  const pt = pooled(allTorso);
  lines.push("");
  lines.push(`Pooled over ${total} swings: pelvis ${pp.m.toFixed(1)} ± ${pp.sd.toFixed(1)}° RMS (95th percentile ${pp.p95.toFixed(1)}°); torso ${pt.m.toFixed(1)} ± ${pt.sd.toFixed(1)}° RMS (95th percentile ${pt.p95.toFixed(1)}°).`);
  lines.push("");
  lines.push("## Kinematic sequence timing, ms relative to contact (negative = before)");
  lines.push("");
  lines.push("| Session | Hand | Pelvis: Form | Pelvis: TrackMan | Torso: Form | Torso: TrackMan | Lead arm: Form | Lead arm: TrackMan |");
  lines.push("|---|---|---|---|---|---|---|---|");
  const pick = (list: { label: string; ms: Stat }[], label: string) => list.find((x) => x.label === label)?.ms;
  for (const s of sessions)
    for (const hand of ["R", "L"] as const) {
      const a = s.byHand[hand];
      if (!a) continue;
      const cell = (st?: Stat) => (st ? fmt(st, 0) : "—");
      lines.push(
        `| ${s.label} | ${hand} | ${cell(pick(a.sequenceMs, "Pelvis rotation"))} | ${cell(pick(a.trackmanSequenceMs, "Pelvis rotation"))} | ${cell(pick(a.sequenceMs, "Torso rotation"))} | ${cell(pick(a.trackmanSequenceMs, "Torso rotation"))} | ${cell(pick(a.sequenceMs, "Lead arm"))} | ${cell(pick(a.trackmanSequenceMs, "Lead arm"))} |`,
      );
    }
  lines.push("");
  lines.push("The pipeline's peaks are searched up to 25 ms past contact; TrackMan's angular velocities are searched over the whole play, which is why its pelvis and torso spreads are wider. The lead arm differs by definition: the pipeline rates the upper-arm segment's whole orientation; TrackMan's lead-arm velocity is its own construct.");
  lines.push("");
  lines.push("## Headline metrics and their spread");
  lines.push("");
  lines.push("| Session | Hand | Bat speed (mph) mean ± sd | Best | Separation at foot plant (°) | Peak separation (°) | Lead knee extension, plant to contact (°) |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const s of sessions)
    for (const hand of ["R", "L"] as const) {
      const a = s.byHand[hand];
      if (!a) continue;
      lines.push(`| ${s.label} | ${hand} | ${fmt(a.batSpeedMph)} | ${fmtMax(a.batSpeedMph)} | ${fmt(a.separationAtPlant, 0)} | ${fmt(a.separationPeak, 0)} | ${fmt(a.leadKneeExtension, 0)} |`);
    }
  lines.push("");
  lines.push("Bat speed is the peak speed of TrackMan's tracked bat tip after a five-sample moving average; it is not TrackMan's own bat-speed product number, which the sample does not carry. Separation is torso rotation minus pelvis rotation about vertical, from the posed skeleton.");
  lines.push("");
  lines.push("## Swings rejected by the pipeline");
  lines.push("");
  for (const s of sessions) {
    const full = s.swings.length;
    lines.push(`- ${s.label}: ${full} swings passed; the build rejects a swing when more than 2 % of joint-angle frames fall outside physiological range, when its events are out of order, or when the posed skeleton's knee or elbow disagrees with the measured curve by more than 3° RMS.`);
  }
  lines.push("");
  lines.push("## Limits");
  lines.push("");
  lines.push("- No hitter identity in the export: a session mixes hitters, so per-hand statistics describe a group.");
  lines.push("- Forearm and shin rotation are not observable from 21 points and are held; the shoulder girdle follows a quarter of the arm's rotation; the head is one rigid block whose facing comes from the measured ear line, so it holds its gaze while the torso turns.");
  lines.push("- Muscle-path changes are straight lines between attachment points on a generic model: no wrapping, tendon or fibre-angle model.");
  lines.push("- The generic model's segment lengths differ from the hitter's; retargeting uses orientation only, so joint angles are exact and positions approximate.");
  mkdirSync(resolve("docs/validation"), { recursive: true });
  writeFileSync(OUT, lines.join("\n") + "\n");
  console.log(`Wrote ${OUT} (${total} swings, pelvis ${pp.m.toFixed(1)}°, torso ${pt.m.toFixed(1)}°)`);
}

main();

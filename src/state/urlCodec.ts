import { isPartId } from "../data/catalog";
import { JOINT_IDS, type JointId } from "../data/joints";
import { LINE_IDS, lineById, type LineId } from "../data/lines";
import { REGION_ORDER } from "../data/regions";
import { SWING_JOINTS, swingById } from "../data/swings";
import type { Region } from "../data/types";
import {
  initialState,
  MAX_PLAYLIST,
  MAX_PLAYLIST_TITLE,
  type AppState,
  type LayerFilter,
  type Mode,
  type SideFilter,
} from "./store";
import type { CameraPose, ViewPreset } from "../viewer/engine";
import { parseSetId } from "../features/quiz/generators";

const MODES: Mode[] = ["muscles", "bones", "fascia"];
const PRESETS: ViewPreset[] = ["front", "back", "side"];
const LAYERS: LayerFilter[] = ["all", "superficial", "deep"];
const SIDES: SideFilter[] = ["both", "left", "right"];
const MAX_HIDDEN = 20;
const MAX_PINS = 4;

const two = (n: number) => String(Math.round(n * 100) / 100);

/** Query string for the shareable parts of state; "" when everything is default. */
export function encodeState(s: AppState): string {
  const q = new URLSearchParams();
  if (s.mode !== initialState.mode) q.set("m", s.mode);
  if (s.selected && isPartId(s.selected)) q.set("s", s.selected);
  if (s.view === "custom") {
    if (s.camera) q.set("c", [...s.camera.position, ...s.camera.target].map(two).join(","));
  } else if (s.view !== initialState.view) q.set("v", s.view);
  if (s.line !== initialState.line) q.set("l", s.line);
  if (s.mode === "fascia" && s.tour) q.set("t", String(s.tour.step));
  const hidden = s.hidden.filter(isPartId).slice(0, MAX_HIDDEN);
  if (hidden.length) q.set("h", hidden.join(","));
  const pinned = s.pinned.filter(isPartId).slice(0, MAX_PINS);
  if (pinned.length) q.set("p", pinned.join(","));
  const playlist = s.playlist?.ids.filter(isPartId).slice(0, MAX_PLAYLIST) ?? [];
  if (playlist.length) {
    q.set("pl", playlist.join(","));
    const title = s.playlist?.title.trim().slice(0, MAX_PLAYLIST_TITLE);
    if (title) q.set("plt", title);
  }
  if (s.quiz) q.set("q", s.quiz.setId);
  if (s.attach) q.set("a", "1");
  if (s.filters.region !== "all") q.set("r", s.filters.region);
  if (s.filters.layer !== "all") q.set("d", s.filters.layer);
  if (s.filters.side !== "both") q.set("side", s.filters.side);
  if (s.filters.joint !== "all") q.set("j", s.filters.joint);
  if (s.motion?.swing) {
    q.set("sw", s.motion.swing.id);
    q.set("sj", s.motion.joint);
    q.set("ss", s.motion.side === "left" ? "l" : "r");
    if (s.motion.phase > 0) q.set("sp", String(Math.round(s.motion.phase * 1000) / 1000));
  }
  // Commas and colons are safe in a query string; keep them readable instead of %2C and %3A.
  const str = q.toString().replace(/%2C/g, ",").replace(/%3A/g, ":");
  return str ? `?${str}` : "";
}

/** Partial state from a query string. Every value is validated on its own; bad ones are dropped. */
export function decodeSearch(search: string): Partial<AppState> {
  const q = new URLSearchParams(search);
  const out: Partial<AppState> = {};
  const m = q.get("m");
  if (m && (MODES as string[]).includes(m)) out.mode = m as Mode;
  const s = q.get("s");
  if (s && isPartId(s)) out.selected = s;
  const c = q.get("c");
  const v = q.get("v");
  if (c) {
    const nums = c.split(",").map(Number);
    if (nums.length === 6 && nums.every(Number.isFinite)) {
      out.view = "custom";
      out.camera = {
        position: [nums[0], nums[1], nums[2]],
        target: [nums[3], nums[4], nums[5]],
      } as CameraPose;
    }
  } else if (v && (PRESETS as string[]).includes(v)) out.view = v as ViewPreset;
  const l = q.get("l");
  if (l && (LINE_IDS as string[]).includes(l)) out.line = l as LineId;
  const t = q.get("t");
  if (out.mode === "fascia" && t !== null) {
    const n = Number(t);
    const len = lineById(out.line ?? initialState.line)?.path.length ?? 0;
    if (Number.isInteger(n) && n >= 0 && n < len) out.tour = { step: n, playing: false };
  }
  const h = q.get("h");
  if (h) {
    const ids = h.split(",").filter(isPartId).slice(0, MAX_HIDDEN);
    if (ids.length) out.hidden = ids;
  }
  const p = q.get("p");
  if (p) {
    const ids = p.split(",").filter(isPartId).slice(0, MAX_PINS);
    if (ids.length) out.pinned = ids;
  }
  const pl = q.get("pl");
  if (pl) {
    const ids = [...new Set(pl.split(",").filter(isPartId))].slice(0, MAX_PLAYLIST);
    if (ids.length) {
      const title = (q.get("plt") ?? "").trim().slice(0, MAX_PLAYLIST_TITLE);
      out.playlist = { title, ids, step: null };
    }
  }
  const qs = q.get("q");
  const setId = qs ? parseSetId(qs) : null;
  if (setId) out.quizRequest = setId;
  if (q.get("a") === "1") out.attach = true;
  const r = q.get("r");
  const d = q.get("d");
  const side = q.get("side");
  const region = r && (REGION_ORDER as string[]).includes(r) ? (r as Region) : null;
  const layer = d && (LAYERS as string[]).includes(d) ? (d as LayerFilter) : null;
  const sideF = side && (SIDES as string[]).includes(side) ? (side as SideFilter) : null;
  const j = q.get("j");
  const joint = j && (JOINT_IDS as string[]).includes(j) ? (j as JointId) : null;
  if (region || layer || sideF || joint)
    out.filters = {
      ...initialState.filters,
      ...(region ? { region } : {}),
      ...(layer ? { layer } : {}),
      ...(sideF ? { side: sideF } : {}),
      ...(joint ? { joint } : {}),
    };
  const sw = q.get("sw");
  const swing = sw ? swingById(sw) : undefined;
  if (swing) {
    const sj = q.get("sj");
    const swingJoint = sj && (SWING_JOINTS as string[]).includes(sj) ? (sj as JointId) : "knee";
    const ss = q.get("ss");
    const side = ss === "r" ? "right" : ss === "l" ? "left" : swing.handedness === "R" ? "left" : "right";
    const sp = Number(q.get("sp"));
    out.motion = {
      joint: swingJoint,
      side,
      phase: Number.isFinite(sp) ? Math.min(1, Math.max(0, sp)) : 0,
      playing: false,
      lines: false,
      frameNonce: 0,
      swing: { id: swing.id, speed: 0.5 },
    };
    out.filters = { ...(out.filters ?? initialState.filters), joint: swingJoint };
  }
  return out;
}

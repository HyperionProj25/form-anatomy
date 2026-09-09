/**
 * Graphics quality: the user's preference (Auto, High, Low), how Auto decides from the device,
 * and a short frame meter that lets Auto back off to Low on a machine that cannot keep up.
 */
export type GraphicsLevel = "auto" | "high" | "low";
export type RenderLevel = "high" | "low";

const PREF_KEY = "form.graphics.v1";

/** Average frame time above which Auto drops to Low. */
export const DOWNGRADE_MS = 28;
/** How long the meter watches after the model loads. */
export const METER_MS = 3000;
/** Frames longer than this are stalls (a hidden tab, a load), not rendering cost. */
const STALL_MS = 60;

function storageOr(storage?: Storage): Storage | null {
  if (storage) return storage;
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadGraphicsPref(storage?: Storage): GraphicsLevel {
  try {
    const v = storageOr(storage)?.getItem(PREF_KEY);
    return v === "high" || v === "low" ? v : "auto";
  } catch {
    return "auto";
  }
}

export function saveGraphicsPref(level: GraphicsLevel, storage?: Storage): void {
  try {
    storageOr(storage)?.setItem(PREF_KEY, level);
  } catch {
    // A convenience only.
  }
}

/** The level to start with: a `?gfx=` override for testing, else the saved preference. */
export function initialGraphics(
  search = typeof location !== "undefined" ? location.search : "",
  storage?: Storage,
): GraphicsLevel {
  const g = new URLSearchParams(search).get("gfx");
  return g === "high" || g === "low" || g === "auto" ? g : loadGraphicsPref(storage);
}

export type DeviceSignals = {
  reducedMotion: boolean;
  coarsePointer: boolean;
  narrow: boolean;
  cores: number;
  memoryGb?: number;
  /** The WebGL renderer string, unmasked when the browser allows it. */
  gpu: string;
};

/** What Auto picks before any frames are measured. */
export function decideGraphics(s: DeviceSignals): RenderLevel {
  if (s.reducedMotion) return "low";
  if (s.coarsePointer && s.narrow) return "low";
  if (/swiftshader|software|llvmpipe|mesa offscreen|basic render/i.test(s.gpu)) return "low";
  if (s.cores < 4) return "low";
  if (s.memoryGb !== undefined && s.memoryGb < 4) return "low";
  return "high";
}

export function readSignals(gl: WebGLRenderingContext | WebGL2RenderingContext | null): DeviceSignals {
  const mq = (q: string) => typeof matchMedia === "function" && matchMedia(q).matches;
  let gpu = "";
  if (gl) {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    reducedMotion: mq("(prefers-reduced-motion: reduce)"),
    coarsePointer: mq("(pointer: coarse)"),
    narrow: mq("(max-width: 600px)"),
    cores: nav.hardwareConcurrency ?? 4,
    memoryGb: nav.deviceMemory,
    gpu,
  };
}

/** Measures frame times for METER_MS after a short warm-up, ignoring stalls. */
export class FrameMeter {
  private total = 0;
  frames = 0;
  private elapsed = 0;
  finished = false;

  push(dt: number): void {
    if (this.finished) return;
    this.elapsed += dt;
    if (this.elapsed >= METER_MS) this.finished = true;
    if (this.elapsed < 400 || dt >= STALL_MS) return;
    this.total += dt;
    this.frames++;
  }

  average(): number {
    return this.frames ? this.total / this.frames : 0;
  }
}

/** Auto backs off only on real evidence: enough frames, and a clearly slow average. */
export function shouldDowngrade(averageMs: number, frames: number): boolean {
  return frames >= 20 && averageMs > DOWNGRADE_MS;
}

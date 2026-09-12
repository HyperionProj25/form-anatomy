import { useEffect, useRef, useState } from "react";
import type { GraphicsLevel, RenderLevel } from "./quality";
import {
  AnatomyEngine,
  type CameraPose,
  type MotionDrawing,
  type PullDrawing,
  type ViewPreset,
} from "./engine";
import type { PartStyle } from "./appearance";
import { catalog, nodeToId, partById, parts } from "../data/catalog";
import type { Vec3 } from "../data/types";

/** A camera instruction from the store. `nonce` changes whenever the app wants the camera moved. */
export type CameraCommand =
  | { kind: "preset"; preset: ViewPreset; nonce: number }
  | { kind: "pose"; pose: CameraPose; nonce: number }
  | { kind: "fly"; id: string; direction: Vec3; nonce: number }
  | { kind: "frame"; center: Vec3; radius: number; direction: Vec3; nonce: number };

export type DrawnPath = { points: Vec3[]; color: string };

export type ViewerHandle = {
  zoom(factor: number): void;
  description(id: string): string | undefined;
};

type Props = {
  styles: Map<string, PartStyle>;
  cameraCommand: CameraCommand;
  paths: DrawnPath[];
  /** Label for the hover tooltip; defaults to the catalog name. */
  nameOf?: (id: string) => string;
  /** Part that gets the selection halo. */
  selectedId?: string | null;
  /** Slow camera drift, used while a tour plays. */
  autoRotate?: boolean;
  /** Animated direction of pull for the selected muscle. */
  pull?: PullDrawing | null;
  /** Rigid joint motion; phase applies while not playing, the engine drives it while playing. */
  motion?: MotionDrawing | null;
  motionPhase?: number;
  motionPlaying?: boolean;
  motionLines?: boolean;
  /** Playback speed of a measured curve, 1 = real time. */
  motionSpeed?: number;
  onMotionPhase?(phase: number): void;
  /** Contraction pulse on one muscle along its line of action. */
  pulse?: { id: string; axisFrom: Vec3; axisTo: Vec3; belly: Vec3 } | null;
  onSelect(id: string): void;
  onReady(ids: string[]): void;
  onCameraChange(pose: CameraPose): void;
  onHandle(handle: ViewerHandle | null): void;
  /** Graphics preference; Auto decides from the device and may report a downgrade. */
  graphics?: GraphicsLevel;
  onGraphicsAuto?(level: RenderLevel): void;
  /** Cinematic look (depth of field, slow dolly) while a tour plays, focused on this part. */
  cinematic?: boolean;
  focusId?: string | null;
};

const typeById = new Map(parts.map((p) => [p.id, p.type]));

const LOADING_MESSAGE = "Loading detailed anatomy…";
const WEBGL_MESSAGE =
  "The 3D view needs WebGL. Try a browser with hardware acceleration enabled. The fascial-line lessons and learning guide remain available.";

function supportsWebGL(): boolean {
  try {
    const probe = document.createElement("canvas");
    return !!(probe.getContext("webgl2") || probe.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function Viewer(props: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const engine = useRef<AnatomyEngine | null>(null);
  const latest = useRef(props);
  const appliedNonce = useRef(-1);
  useEffect(() => {
    latest.current = props;
  });
  const [webgl, setWebgl] = useState(supportsWebGL);
  const [status, setStatus] = useState(webgl ? LOADING_MESSAGE : WEBGL_MESSAGE);
  const [error, setError] = useState(!webgl);
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const host = mount.current;
    if (!host || !webgl) return;
    let e: AnatomyEngine;
    try {
      e = new AnatomyEngine(host, nodeToId, catalog.meta.modelCenter, {
        onProgress: (f) =>
          setStatus(f === null ? LOADING_MESSAGE : `Loading anatomy · ${Math.round(f * 100)}%`),
        onReady: () => {
          setStatus("");
          setReady(true);
          latest.current.onReady(e.ids());
        },
        onError: (message) => {
          setError(true);
          setStatus(message);
        },
        onHover: (id, x, y) =>
          setHover(
            id ? { name: latest.current.nameOf?.(id) ?? partById(id)?.name ?? id, x, y } : null,
          ),
        onSelect: (id) => latest.current.onSelect(id),
        onCameraChange: (pose) => latest.current.onCameraChange(pose),
        onMotionPhase: (phase) => latest.current.onMotionPhase?.(phase),
        onGraphicsAuto: (level) => latest.current.onGraphicsAuto?.(level),
      }, typeById);
    } catch {
      queueMicrotask(() => {
        setError(true);
        setStatus(WEBGL_MESSAGE);
      });
      return;
    }
    engine.current = e;
    latest.current.onHandle({ zoom: (f) => e.zoom(f), description: (id) => e.description(id) });
    e.load(`${import.meta.env.BASE_URL}body.glb`, `${import.meta.env.BASE_URL}draco/`);
    return () => {
      latest.current.onHandle(null);
      engine.current = null;
      appliedNonce.current = -1;
      setReady(false);
      e.dispose();
    };
  }, [retry, webgl]);

  useEffect(() => {
    if (ready) engine.current?.applyAppearance(props.styles);
  }, [ready, props.styles]);

  useEffect(() => {
    if (ready) engine.current?.drawPaths(props.paths);
  }, [ready, props.paths]);

  useEffect(() => {
    if (ready) engine.current?.setSelected(props.selectedId ?? null);
  }, [ready, props.selectedId]);

  useEffect(() => {
    engine.current?.setAutoRotate(!!props.autoRotate);
  }, [ready, props.autoRotate]);

  useEffect(() => {
    if (ready) engine.current?.drawPull(props.pull ?? null);
  }, [ready, props.pull]);

  useEffect(() => {
    if (ready) engine.current?.setMotion(props.motion ?? null);
  }, [ready, props.motion]);

  useEffect(() => {
    if (ready && !props.motionPlaying) engine.current?.setMotionPhase(props.motionPhase ?? 0);
  }, [ready, props.motionPhase, props.motionPlaying, props.motion]);

  useEffect(() => {
    if (ready) engine.current?.setMotionPlaying(!!props.motionPlaying);
  }, [ready, props.motionPlaying, props.motion]);

  useEffect(() => {
    if (ready) engine.current?.setCablesVisible(!!props.motionLines);
  }, [ready, props.motionLines, props.motion]);

  useEffect(() => {
    if (ready) engine.current?.setMotionSpeed(props.motionSpeed ?? 1);
  }, [ready, props.motionSpeed, props.motion]);

  useEffect(() => {
    if (ready) engine.current?.setPulse(props.pulse ?? null);
  }, [ready, props.pulse]);

  useEffect(() => {
    engine.current?.setGraphics(props.graphics ?? "auto");
  }, [ready, props.graphics]);

  useEffect(() => {
    if (ready) engine.current?.setCinematic(!!props.cinematic, props.focusId ?? null);
  }, [ready, props.cinematic, props.focusId]);

  useEffect(() => {
    const e = engine.current;
    if (!ready || !e) return;
    const c = props.cameraCommand;
    if (c.nonce === appliedNonce.current) return;
    appliedNonce.current = c.nonce;
    if (c.kind === "preset") void e.setView(c.preset, c.nonce > 0);
    else if (c.kind === "pose") void e.setCamera(c.pose, false);
    else if (c.kind === "frame") void e.frame(c.center, c.radius, c.direction);
    else void e.flyTo(c.id, { direction: c.direction, padding: 2.6 });
  }, [ready, props.cameraCommand]);

  return (
    <div className="model-wrap" ref={mount}>
      {status && (
        <div className={"model-status " + (error ? "error" : "")} role="status">
          {!error && <div className="loading-orbit" />}
          <p>{status}</p>
          {error && (
            <button
              className="outline-button"
              onClick={() => {
                const ok = supportsWebGL();
                setWebgl(ok);
                setError(!ok);
                setStatus(ok ? LOADING_MESSAGE : WEBGL_MESSAGE);
                setRetry(retry + 1);
              }}
            >
              Retry 3D view
            </button>
          )}
        </div>
      )}
      {hover && !status && (
        <div className="model-tooltip" style={{ left: hover.x, top: hover.y }}>
          {hover.name}
        </div>
      )}
    </div>
  );
}

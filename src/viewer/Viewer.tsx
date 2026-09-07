import { useEffect, useRef, useState } from "react";
import { AnatomyEngine, type CameraPose, type ViewPreset } from "./engine";
import type { PartStyle } from "./appearance";
import { catalog, nodeToId, partById } from "../data/catalog";
import type { Vec3 } from "../data/types";

/** A camera instruction from the store. `nonce` changes whenever the app wants the camera moved. */
export type CameraCommand =
  | { kind: "preset"; preset: ViewPreset; nonce: number }
  | { kind: "pose"; pose: CameraPose; nonce: number }
  | { kind: "fly"; id: string; direction: Vec3; nonce: number };

export type DrawnPath = { points: Vec3[]; color: string };

export type ViewerHandle = {
  zoom(factor: number): void;
  description(id: string): string | undefined;
};

type Props = {
  styles: Map<string, PartStyle>;
  cameraCommand: CameraCommand;
  paths: DrawnPath[];
  onSelect(id: string): void;
  onReady(ids: string[]): void;
  onCameraChange(pose: CameraPose): void;
  onHandle(handle: ViewerHandle | null): void;
};

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
        onHover: (id, x, y) => setHover(id ? { name: partById(id)?.name ?? id, x, y } : null),
        onSelect: (id) => latest.current.onSelect(id),
        onCameraChange: (pose) => latest.current.onCameraChange(pose),
      });
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
    const e = engine.current;
    if (!ready || !e) return;
    const c = props.cameraCommand;
    if (c.nonce === appliedNonce.current) return;
    appliedNonce.current = c.nonce;
    if (c.kind === "preset") void e.setView(c.preset, c.nonce > 0);
    else if (c.kind === "pose") void e.setCamera(c.pose, false);
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

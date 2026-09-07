import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { FascialLine } from "./study-data";
export type Structure = {
  id: string;
  name: string;
  detail: string;
  type: string;
  wiki?: string;
};
export type ViewerAPI = {
  view: (v: string) => void;
  zoom: (factor: number) => void;
};
type Props = {
  onApi: (api: ViewerAPI | null) => void;
  mode: string;
  line: FascialLine;
  opacity: number;
  selected: string | null;
  hidden: string[];
  isolated: boolean;
  onSelect: (s: Structure) => void;
  onReady: (s: Structure[]) => void;
};
type Part = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
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

export default function AnatomyViewer(props: Props) {
  const mount = useRef<HTMLDivElement>(null),
    current = useRef(props),
    parts = useRef<Part[]>([]),
    refresh = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    current.current = props;
  });
  const [webgl] = useState(supportsWebGL);
  const [status, setStatus] = useState(webgl ? LOADING_MESSAGE : WEBGL_MESSAGE),
    [error, setError] = useState(!webgl),
    [retry, setRetry] = useState(0),
    [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(
      null,
    );
  useEffect(() => {
    const host = mount.current;
    if (!host || !webgl) return;
    const s = {
      disposed: false,
      frame: 0,
      fitDistance: 3.7,
      model: null as THREE.Group | null,
    };
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      queueMicrotask(() => {
        setError(true);
        setStatus(WEBGL_MESSAGE);
      });
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.setAttribute(
      "aria-label",
      "Anatomical model. Use the structure library for keyboard selection.",
    );
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
    camera.position.set(0, 0, 3.7);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.minDistance = 0.3;
    controls.maxDistance = 8;
    controls.maxPolarAngle = Math.PI * 0.96;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8e8173, 2));
    const key = new THREE.DirectionalLight(0xfff4e8, 3.2);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xe0ecf3, 1.5);
    fill.position.set(3, 1, -4);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 2);
    rim.position.set(-2, 2, -3);
    scene.add(rim);
    const resize = () => {
      const w = host.clientWidth,
        h = host.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const api: ViewerAPI = {
      view: (v) => {
        controls.target.set(0, 0, 0);
        camera.position.set(
          v === "side" ? s.fitDistance : 0,
          0,
          v === "back" ? -s.fitDistance : v === "side" ? 0 : s.fitDistance,
        );
        controls.update();
      },
      zoom: (factor) => {
        const offset = camera.position.clone().sub(controls.target);
        offset.multiplyScalar(factor);
        offset.clampLength(controls.minDistance, controls.maxDistance);
        camera.position.copy(controls.target).add(offset);
        controls.update();
      },
    };
    current.current.onApi(api);
    const describe = (m: Part): Structure => ({
      id: m.uuid,
      name:
        m.userData.nameDetail || m.userData.name || m.name.replaceAll("_", " "),
      detail: m.userData.name || "",
      type: m.userData.type || "connective tissue",
      wiki:
        typeof m.userData.wikiLink === "string" &&
        m.userData.wikiLink.startsWith("https://en.wikipedia.org/")
          ? m.userData.wikiLink
          : undefined,
    });
    refresh.current = () => {
      const p = current.current;
      parts.current.forEach((m) => {
        const bone = m.userData.type === "bone",
          connective = !m.userData.type,
          selected = m.uuid === p.selected;
        const chain =
          p.mode === "fascia" &&
          m.userData.type === "muscle" &&
          p.line.matches.some((n) =>
            ((m.userData.nameDetail || "") + " " + (m.userData.name || m.name))
              .toLowerCase()
              .includes(n),
          );
        m.visible =
          !p.hidden.includes(m.uuid) &&
          (!p.isolated || selected) &&
          (p.mode !== "bones" || bone || selected);
        const mat = m.material;
        mat.color.set(
          selected
            ? "#477965"
            : chain
              ? p.line.color
              : bone
                ? "#e0d3b7"
                : connective
                  ? "#dbd4bb"
                  : "#a35b4c",
        );
        mat.emissive.set(
          selected ? "#204d3a" : chain ? p.line.color : "#000000",
        );
        mat.emissiveIntensity = selected ? 0.26 : chain ? 0.08 : 0;
        mat.opacity =
          selected || chain
            ? 1
            : bone
              ? p.mode === "bones"
                ? p.opacity
                : 1
              : p.mode === "fascia"
                ? 0.1
                : p.opacity;
        mat.transparent = mat.opacity < 1;
        mat.depthWrite = mat.opacity >= 0.95;
        mat.needsUpdate = true;
      });
    };
    const draco = new DRACOLoader();
    draco.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
    draco.setWorkerLimit(2);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    const disposeModel = (root: THREE.Object3D) =>
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => m.dispose());
        }
      });
    loader.load(
      `${import.meta.env.BASE_URL}body.glb`,
      (gltf) => {
        if (s.disposed) {
          disposeModel(gltf.scene);
          return;
        }
        s.model = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(s.model),
          size = bounds.getSize(new THREE.Vector3()),
          center = bounds.getCenter(new THREE.Vector3());
        s.model.position.sub(center);
        scene.add(s.model);
        s.fitDistance =
          Math.max(
            size.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))),
            size.x /
              (2 *
                Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
                camera.aspect),
          ) * 1.15;
        parts.current = [];
        s.model.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            const original = Array.isArray(o.material)
              ? o.material[0]
              : o.material;
            const bone = o.userData.type === "bone";
            o.material = new THREE.MeshStandardMaterial({
              color: bone ? 0xe0d3b7 : 0xa35b4c,
              roughness: bone ? 0.75 : 0.58,
              metalness: 0,
              side: THREE.DoubleSide,
            });
            original.dispose();
            parts.current.push(o as Part);
          }
        });
        current.current.onReady(
          parts.current
            .map(describe)
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        api.view(
          current.current.mode === "fascia"
            ? current.current.line.view
            : "front",
        );
        refresh.current();
        setStatus("");
      },
      (event) => {
        if (!s.disposed)
          setStatus(
            event.total
              ? "Loading anatomy · " +
                  Math.round((event.loaded / event.total) * 100) +
                  "%"
              : "Loading detailed anatomy…",
          );
      },
      () => {
        if (!s.disposed) {
          setError(true);
          setStatus(
            "The anatomy model could not load. Check your connection and try again.",
          );
        }
      },
    );
    const raycaster = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    let downX = 0,
      downY = 0;
    const hit = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(
        parts.current.filter((p) => p.visible && p.material.opacity > 0.2),
        false,
      )[0]?.object as Part | undefined;
    };
    const down = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const up = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return;
      const m = hit(e);
      if (m) current.current.onSelect(describe(m));
    };
    const move = (e: PointerEvent) => {
      if (e.buttons) {
        setHover(null);
        return;
      }
      const m = hit(e);
      renderer.domElement.style.cursor = m ? "pointer" : "grab";
      const rect = host.getBoundingClientRect();
      setHover(
        m
          ? {
              name: describe(m).name,
              x: Math.min(e.clientX - rect.left + 15, rect.width - 200),
              y: e.clientY - rect.top - 30,
            }
          : null,
      );
    };
    const leave = () => setHover(null);
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerleave", leave);
    const render = () => {
      s.frame = requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    };
    render();
    return () => {
      s.disposed = true;
      cancelAnimationFrame(s.frame);
      observer.disconnect();
      controls.dispose();
      draco.dispose();
      if (s.model) disposeModel(s.model);
      renderer.dispose();
      renderer.domElement.remove();
      parts.current = [];
      current.current.onApi(null);
    };
  }, [retry, webgl]);
  useEffect(() => {
    refresh.current();
  }, [
    props.mode,
    props.line,
    props.opacity,
    props.selected,
    props.hidden,
    props.isolated,
  ]);
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
                setError(false);
                setStatus(LOADING_MESSAGE);
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

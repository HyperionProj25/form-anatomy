import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createFloor, type Floor } from "./floor";
import { principalAxis, richMaterial, standardMaterial, tissueOf } from "./materials";
import type { Pipeline } from "./post";
import {
  decideGraphics,
  FrameMeter,
  readSignals,
  shouldDowngrade,
  type GraphicsLevel,
  type RenderLevel,
} from "./quality";
import type { PartStyle } from "./appearance";
import type { BodyDrawing, MusclePath } from "../data/body";
import { COLORS } from "./appearance";
import type { Vec3 } from "../data/types";

export type ViewPreset = "front" | "back" | "side";
export type CameraPose = { position: Vec3; target: Vec3 };

export type EngineHandlers = {
  onProgress(fraction: number | null): void;
  onReady(): void;
  onError(message: string): void;
  onHover(id: string | null, x: number, y: number): void;
  onSelect(id: string): void;
  /** Fires ~300 ms after the user finishes dragging or wheel-zooming. */
  onCameraChange(pose: CameraPose): void;
  /** Fires a few times a second while a joint motion plays, with the current phase 0..1. */
  onMotionPhase?(phase: number): void;
  /** Auto graphics dropped to Low after measuring slow frames. */
  onGraphicsAuto?(level: RenderLevel): void;
};

/**
 * A rigid joint motion: the moving meshes rotate about the pivot; crossing muscles are re-skinned
 * with two bones so they bend across the joint plane and bulge as they shorten; cables follow
 * their insertion end.
 */
export type MotionDrawing = {
  pivot: Vec3;
  /** Proximal-to-distal limb direction; with `band`, the blend across the joint plane. */
  dir: Vec3;
  band: number;
  axis: Vec3;
  range: [number, number];
  /** A measured angle curve, degrees per frame; when present it replaces the range sweep. */
  curve?: { angles: number[]; fps: number };
  /** Playback speed for a curve, 1 = real time. */
  speed?: number;
  movingIds: string[];
  /** Frame radius of the joint region; cable thickness scales with it so a jaw is not drawn with knee-sized tubes. */
  radius: number;
  cables: {
    id: string;
    from: Vec3;
    via: Vec3;
    to: Vec3;
    viaWeight: number;
    /** Path length change over the full range as a fraction of the muscle's size; negative shortens. */
    change: number;
    color: string;
    /** Rig segments of each end, so a full-body pose can carry the cable with the bones. */
    fromSeg?: string;
    toSeg?: string;
  }[];
};

type Deformed = {
  id: string;
  skinned: THREE.SkinnedMesh;
  seg: THREE.Bone;
  material: THREE.MeshStandardMaterial;
  uniforms: BulgeUniforms;
  change: number;
};

type BulgeUniforms = {
  uAxisOrigin: { value: THREE.Vector3 };
  uAxisDir: { value: THREE.Vector3 };
  uBulge: { value: number };
  uShorten: { value: number };
};

/**
 * Vertex-shader addition: scale the mesh radially about its own line of action (volume-preserving
 * bulge) and along it (contraction), before skinning bends it at the joint.
 */
const BULGE_VERTEX = `
{
  vec3 rel = transformed - uAxisOrigin;
  float along = dot(rel, uAxisDir);
  vec3 radial = rel - along * uAxisDir;
  transformed = uAxisOrigin + radial * uBulge + uAxisDir * along * uShorten;
}`;

function addBulge(material: THREE.MeshStandardMaterial, uniforms: BulgeUniforms): void {
  // Chain after any look the material already injects (fibre striations at High).
  const base = material.userData.baseCompile as THREE.Material["onBeforeCompile"] | undefined;
  const baseKey = typeof material.userData.baseKey === "string" ? material.userData.baseKey : "";
  material.onBeforeCompile = (shader, renderer) => {
    base?.(shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader =
      "uniform vec3 uAxisOrigin;\nuniform vec3 uAxisDir;\nuniform float uBulge;\nuniform float uShorten;\n" +
      shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>" + BULGE_VERTEX);
  };
  material.customProgramCacheKey = () => "bulge" + baseKey;
  material.needsUpdate = true;
}

function removeBulge(material: THREE.MeshStandardMaterial): void {
  const base = material.userData.baseCompile as THREE.Material["onBeforeCompile"] | undefined;
  const baseKey = typeof material.userData.baseKey === "string" ? material.userData.baseKey : "";
  material.onBeforeCompile = base ?? (() => {});
  material.customProgramCacheKey = () => baseKey;
  material.needsUpdate = true;
}

/** Stable per-part seed for material variation. */
function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Duration of the slow dolly after a cinematic flight. */
const DOLLY_MS = 6000;
/** Muscle lines of action in the whole-body swing: neutral, then amber as they shorten, blue as they lengthen. */
const LINE_NEUTRAL = new THREE.Color("#cfc7b8");
const LINE_SHORTEN = new THREE.Color("#f2a531");
const LINE_LENGTHEN = new THREE.Color("#3d8bff");
const LINE_RADIUS = 0.004;
const BAT_WOOD = new THREE.Color("#c9a96e");

/**
 * A 34-inch wood bat as a lathe profile: unit length along y centred at the origin so placeSegment
 * stretches it knob to tip, radii in real metres. Vertex colours carry a faint grain along the length.
 */
function batGeometry(): THREE.BufferGeometry {
  const profile: [number, number][] = [
    [0, 0],
    [0.026, 0],
    [0.026, 0.012],
    [0.018, 0.022],
    [0.0125, 0.04],
    [0.0125, 0.34],
    [0.016, 0.45],
    [0.024, 0.56],
    [0.031, 0.68],
    [0.033, 0.8],
    [0.033, 0.975],
    [0.027, 0.995],
    [0, 1],
  ];
  const geometry = new THREE.LatheGeometry(
    profile.map(([r, f]) => new THREE.Vector2(r, f - 0.5)),
    28,
  );
  const pos = geometry.attributes.position;
  const colours = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const theta = Math.atan2(pos.getZ(i), pos.getX(i));
    const f = pos.getY(i) + 0.5;
    const grain = 0.94 + 0.06 * Math.sin(theta * 7 + f * 4.5) * Math.sin(theta * 3 - f * 11);
    const knob = f < 0.03 ? 0.8 : 1;
    colours[i * 3] = BAT_WOOD.r * grain * knob;
    colours[i * 3 + 1] = BAT_WOOD.g * grain * knob;
    colours[i * 3 + 2] = BAT_WOOD.b * grain * knob;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  return geometry;
}
function lineColor(change: number): THREE.Color {
  if (!Number.isFinite(change) || Math.abs(change) < 0.01) return LINE_NEUTRAL.clone();
  const k = 0.35 + 0.65 * Math.min(1, Math.abs(change) / 0.15);
  return LINE_NEUTRAL.clone().lerp(change < 0 ? LINE_SHORTEN : LINE_LENGTHEN, k);
}

/** Smooth 0..1 ramp across a band; the same shape src/data/motion.ts uses for the belly. */
function bandWeight(signedDistance: number, band: number): number {
  const x = Math.min(1, Math.max(0, (signedDistance + band) / (2 * band)));
  return x * x * (3 - 2 * x);
}

/** Seconds for a full sweep of a joint motion in one direction. */
const MOTION_SWEEP_MS = 2600;
/** Pause at the end of a measured swing before it restarts. */
const CURVE_HOLD_MS = 600;

/** Linear sample of a curve at a phase in 0..1. */
function sampleCurve(angles: number[], phase: number): number {
  const n = angles.length;
  if (!n) return 0;
  const x = Math.min(1, Math.max(0, phase)) * (n - 1);
  const i = Math.floor(x);
  const k = x - i;
  return angles[i] + (angles[Math.min(n - 1, i + 1)] - angles[i]) * k;
}

type PartMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
type Target = { style: PartStyle; color: THREE.Color; emissive: THREE.Color };

/** A line of action to animate: from the moving end, through the muscle, to the fixed end. */
export type PullDrawing = {
  paths: { from: Vec3; via: Vec3; to: Vec3 }[];
  origin: Vec3[];
  insertion: Vec3[];
};

const PULL_PARTICLES = 4;
const PULL_PERIOD_MS = 2200;
const ORIGIN_COLOR = "#3d8bff";
const INSERTION_COLOR = "#f2a531";

const PRESET_DIRECTIONS: Record<ViewPreset, Vec3> = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  side: [1, 0, 0],
};

/** Time constant of appearance tweens, ms. Perceived as a soft 250 ms ease. */
const TWEEN_TAU = 110;
const HOVER_LIFT = 0.16;
const HOVER_EMISSIVE = new THREE.Color("#5b5346");
/** Bright rim around the selected part; carries the selection cue for colour-blind viewers. */
const HALO_COLOR = "#8fe9f7";

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function sameStyle(a: PartStyle, b: PartStyle): boolean {
  return (
    a.visible === b.visible &&
    a.color === b.color &&
    a.emissive === b.emissive &&
    a.emissiveIntensity === b.emissiveIntensity &&
    a.opacity === b.opacity
  );
}

function colorClose(a: THREE.Color, b: THREE.Color): boolean {
  return Math.abs(a.r - b.r) < 0.004 && Math.abs(a.g - b.g) < 0.004 && Math.abs(a.b - b.b) < 0.004;
}

/**
 * Owns the Three.js scene for the anatomy model. Imperative API; React wraps it in Viewer.tsx.
 * Depends only on Three.js and the DOM. Throws from the constructor if WebGL is unavailable.
 * Appearance changes tween in the render loop; camera moves ease; both snap under reduced motion.
 */
export class AnatomyEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
  private controls: OrbitControls;
  private observer: ResizeObserver;
  private draco = new DRACOLoader();
  private meshes = new Map<string, PartMesh>();
  private descriptionsById = new Map<string, string>();
  private model: THREE.Group | null = null;
  private ground: THREE.Mesh | null = null;
  private halo: THREE.Mesh | null = null;
  private fitDistance = 3.7;
  private rafHandle = 0;
  private lastFrame = performance.now();
  private disposed = false;
  private animation: number | null = null;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private downX = 0;
  private downY = 0;
  private cameraTimer = 0;
  private pathGroup = new THREE.Group();
  private pulses: { curve: THREE.CatmullRomCurve3; mesh: THREE.Mesh; phase: number }[] = [];
  private pullGroup = new THREE.Group();
  private pullFlows: { curve: THREE.CatmullRomCurve3; particles: THREE.Mesh[] }[] = [];
  private labels: { el: HTMLDivElement; position: THREE.Vector3 }[] = [];
  private cableGroup = new THREE.Group();
  private cables: {
    first: THREE.Mesh;
    second: THREE.Mesh;
    dot: THREE.Mesh;
    from: THREE.Vector3;
    via: THREE.Vector3;
    to: THREE.Vector3;
    viaWeight: number;
    fromSeg?: string;
    toSeg?: string;
  }[] = [];
  private motion: MotionDrawing | null = null;
  private motionPhase = 0;
  private motionT = 0;
  private motionDir = 1;
  private motionPlaying = false;
  private motionHold = 0;
  private motionSpeed = 1;
  private motionReported = 0;
  private posed = new Set<string>();
  private deformed: Deformed[] = [];
  private deformedIds = new Set<string>();
  private body: BodyDrawing | null = null;
  private bodyBones = new Map<string, THREE.Bone>();
  private bodySkeleton: THREE.Skeleton | null = null;
  private bodyTwins: {
    id: string;
    skinned: THREE.SkinnedMesh;
    material: THREE.MeshStandardMaterial;
    uniforms: BulgeUniforms | null;
  }[] = [];
  private bodyRigid: { id: string; seg: string }[] = [];
  private bodyHidden = new Set<string>();
  private bodyTwinIds = new Set<string>();
  private bodyLines: { id: string; path: MusclePath; first: THREE.Mesh; second: THREE.Mesh; material: THREE.MeshStandardMaterial }[] = [];
  private lineGroup = new THREE.Group();
  private selectedId: string | null = null;
  private batMesh: THREE.Mesh | null = null;
  private pulse: { id: string; uniforms: BulgeUniforms } | null = null;
  private targets = new Map<string, Target>();
  private pending = new Set<string>();
  private hoverId: string | null = null;
  private initialized = false;
  private level: RenderLevel = "low";
  private pref: GraphicsLevel = "auto";
  private pipeline: Pipeline | null = null;
  private pipelineLoading = false;
  private floor: Floor | null = null;
  private key: THREE.DirectionalLight;
  private axes = new Map<string, THREE.Vector3>();
  private shadowDirty = true;
  private meter: FrameMeter | null = null;
  private cinematic = false;
  private focusTarget: THREE.Vector3 | null = null;
  private dolly: { start: number; from: number; to: number } | null = null;
  private modelBox: THREE.Box3 | null = null;
  private typeById: Map<string, string>;
  private reduced: boolean;

  constructor(
    private host: HTMLElement,
    private nodeToId: Map<string, string>,
    private modelCenter: Vec3,
    private handlers: EngineHandlers,
    typeById: Map<string, string> = new Map(),
  ) {
    this.typeById = typeById;
    this.reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Anatomical model. Use the structure library for keyboard selection.",
    );
    host.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 0, this.fitDistance);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.minDistance = 0.3;
    this.controls.maxDistance = 8;
    this.controls.maxPolarAngle = Math.PI * 0.96;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.addEventListener("start", this.cancelAnimation);
    this.controls.addEventListener("end", this.scheduleCameraChange);
    this.controls.addEventListener("change", this.markReflection);

    // Image-based light from a neutral room gives soft reflections; direct lights carry the shape.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8e8173, 0.7));
    const key = new THREE.DirectionalLight(0xfff4e8, 1.9);
    key.position.set(-3, 4, 5);
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.015;
    key.shadow.radius = 3;
    key.shadow.camera.left = -1.3;
    key.shadow.camera.right = 1.3;
    key.shadow.camera.top = 1.3;
    key.shadow.camera.bottom = -1.3;
    key.shadow.camera.near = 4;
    key.shadow.camera.far = 11;
    key.shadow.camera.updateProjectionMatrix();
    this.key = key;
    const fill = new THREE.DirectionalLight(0xe0ecf3, 0.7);
    fill.position.set(3, 1, -4);
    const rim = new THREE.DirectionalLight(0xffffff, 1.1);
    rim.position.set(-2, 2, -3);
    this.scene.add(key, fill, rim);
    this.scene.add(this.pathGroup, this.pullGroup, this.cableGroup, this.lineGroup);

    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(host);
    this.resize();

    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.onDown);
    el.addEventListener("pointerup", this.onUp);
    el.addEventListener("pointermove", this.onMove);
    el.addEventListener("pointerleave", this.onLeave);
    this.render();
  }

  load(url: string, dracoPath: string): void {
    this.draco.setDecoderPath(dracoPath);
    this.draco.setWorkerLimit(2);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(this.draco);
    loader.load(
      url,
      (gltf) => {
        if (this.disposed) {
          disposeObject(gltf.scene);
          return;
        }
        this.model = gltf.scene;
        this.model.position.set(-this.modelCenter[0], -this.modelCenter[1], -this.modelCenter[2]);
        this.scene.add(this.model);
        const box = new THREE.Box3().setFromObject(this.model);
        const size = box.getSize(new THREE.Vector3());
        const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2);
        this.fitDistance =
          Math.max(size.y / (2 * Math.tan(halfFov)), size.x / (2 * Math.tan(halfFov) * this.camera.aspect)) *
          1.15;
        this.controls.maxDistance = this.fitDistance * 2.2;
        // GLTFLoader sanitizes node names (spaces -> underscores, dots removed), so match on the sanitized form.
        const idBySanitized = new Map<string, string>();
        for (const [node, id] of this.nodeToId) idBySanitized.set(THREE.PropertyBinding.sanitizeNodeName(node), id);
        this.model.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          const id = idBySanitized.get(o.name);
          const original = Array.isArray(o.material) ? o.material[0] : o.material;
          o.material = standardMaterial(tissueOf(this.typeById.get(id ?? "") ?? o.userData.type));
          original.dispose();
          if (!id) {
            console.warn("Mesh not in catalog:", o.name);
            return;
          }
          o.userData.catalogId = id;
          this.meshes.set(id, o as PartMesh);
          if (typeof o.userData.description === "string")
            this.descriptionsById.set(id, o.userData.description);
        });
        this.addGroundShadow(box);
        this.modelBox = box;
        this.applyLevel();
        if (this.pref === "auto" && this.level === "high") this.meter = new FrameMeter();
        this.handlers.onReady();
      },
      (event) => {
        if (!this.disposed) this.handlers.onProgress(event.total ? event.loaded / event.total : null);
      },
      () => {
        if (!this.disposed)
          this.handlers.onError("The anatomy model could not load. Check your connection and try again.");
      },
    );
  }

  ids(): string[] {
    return [...this.meshes.keys()];
  }

  /** Wikipedia-derived description embedded in the model, if any. */
  description(id: string): string | undefined {
    return this.descriptionsById.get(id);
  }

  /** True while the whole-body pose stands in for a part: hidden behind the lines, or replaced by a skinned twin. */
  private bodyStandsIn(id: string): boolean {
    return this.bodyHidden.has(id) || this.bodyTwinIds.has(id);
  }

  /** Set the target look of every part. Changes ease in over ~250 ms; the first call snaps. */
  applyAppearance(styles: Map<string, PartStyle>): void {
    for (const [id, mesh] of this.meshes) {
      const s = styles.get(id);
      if (!s) continue;
      const prev = this.targets.get(id);
      if (prev && sameStyle(prev.style, s)) continue;
      const target: Target = { style: s, color: new THREE.Color(s.color), emissive: new THREE.Color(s.emissive) };
      this.targets.set(id, target);
      if (!this.initialized || this.reduced) {
        this.snap(id, mesh, target);
        continue;
      }
      // A muscle with a deformed copy stays hidden itself; its material still tweens so the
      // copy, which mirrors it every frame, follows selection and hover.
      if (s.visible && !mesh.visible && !this.deformedIds.has(id) && !this.bodyStandsIn(id)) {
        mesh.visible = true;
        mesh.material.opacity = 0;
        mesh.material.transparent = true;
        mesh.material.depthWrite = false;
      }
      this.pending.add(id);
    }
    this.initialized = true;
    this.shadowDirty = true;
  }

  /** Show or hide the lines of action drawn during a joint motion. */
  setCablesVisible(on: boolean): void {
    this.cableGroup.visible = on;
  }

  /**
   * A slow contraction pulse on one muscle: it shortens a few percent along its line of action
   * and bulges to match, then relaxes. Off under reduced motion. Pass null to stop.
   */
  setPulse(pulse: { id: string; axisFrom: Vec3; axisTo: Vec3; belly: Vec3 } | null): void {
    if (this.pulse) {
      const mesh = this.meshes.get(this.pulse.id);
      if (mesh) removeBulge(mesh.material);
      this.pulse = null;
    }
    if (!pulse || this.reduced) return;
    const mesh = this.meshes.get(pulse.id);
    if (!mesh) return;
    const c = this.modelCenter;
    const dir = new THREE.Vector3(
      pulse.axisTo[0] - pulse.axisFrom[0],
      pulse.axisTo[1] - pulse.axisFrom[1],
      pulse.axisTo[2] - pulse.axisFrom[2],
    ).normalize();
    const uniforms: BulgeUniforms = {
      uAxisOrigin: { value: new THREE.Vector3(pulse.belly[0] + c[0], pulse.belly[1] + c[1], pulse.belly[2] + c[2]) },
      uAxisDir: { value: dir },
      uBulge: { value: 1 },
      uShorten: { value: 1 },
    };
    addBulge(mesh.material, uniforms);
    this.pulse = { id: pulse.id, uniforms };
  }

  /** Choose the graphics level; Auto decides from the device and may later back off to Low. */
  setGraphics(pref: GraphicsLevel): void {
    this.pref = pref;
    const level: RenderLevel =
      pref === "auto" ? decideGraphics(readSignals(this.renderer.getContext())) : pref;
    this.meter = this.model && pref === "auto" && level === "high" ? new FrameMeter() : null;
    if (level === this.level) return;
    this.level = level;
    this.applyLevel();
  }

  /** Depth of field and a slow dolly while a tour plays, focused on the part with `focusId`. */
  setCinematic(on: boolean, focusId: string | null): void {
    this.cinematic = on;
    const mesh = focusId ? this.meshes.get(focusId) : undefined;
    if (mesh) {
      mesh.geometry.computeBoundingBox();
      this.focusTarget = mesh.geometry
        .boundingBox!.getCenter(new THREE.Vector3())
        .applyMatrix4(mesh.matrixWorld);
    } else this.focusTarget = null;
    this.pipeline?.setCinematic(on && this.level === "high");
    if (!on) this.dolly = null;
  }

  /** Apply the current level to the renderer, lights, floor, materials and post-processing. */
  private applyLevel(): void {
    const high = this.level === "high";
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 1.5 : 2));
    this.renderer.shadowMap.enabled = high;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.key.castShadow = high;
    if (high && !this.pipeline && !this.pipelineLoading) {
      // The post-processing chain and its three.js addons load only when High is in use.
      this.pipelineLoading = true;
      void import("./post").then(({ createPipeline }) => {
        this.pipelineLoading = false;
        if (this.disposed || this.level !== "high") return;
        const pw = this.host.clientWidth;
        const ph = Math.max(this.host.clientHeight, 1);
        const pipeline = createPipeline(this.renderer, this.scene, this.camera, pw, ph);
        pipeline.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        pipeline.setSize(pw, ph);
        if (this.modelBox) pipeline.setSceneBox(this.modelBox);
        pipeline.setCinematic(this.cinematic);
        this.pipeline = pipeline;
      });
    } else if (!high && this.pipeline) {
      this.pipeline.dispose();
      this.pipeline = null;
    }
    if (this.modelBox) {
      this.pipeline?.setSceneBox(this.modelBox);
      if (high && !this.floor) {
        this.floor = createFloor(this.modelBox);
        this.floor.setMirror(!this.body);
        this.scene.add(this.floor.group);
      } else if (!high && this.floor) {
        this.floor.dispose();
        this.floor = null;
      }
    }
    // The painted shadow disc stands in for the real shadow at Low.
    if (this.ground) this.ground.visible = !high;
    this.pipeline?.setCinematic(this.cinematic && high);
    if (this.model) this.swapMaterials();
    if (this.halo && this.halo.material instanceof THREE.MeshBasicMaterial)
      this.halo.material.color.copy(this.haloColor());
    this.shadowDirty = true;
    this.floor?.markDirty();
  }

  /** Replace every part's material for the current level, keeping its tweened look. */
  private swapMaterials(): void {
    const high = this.level === "high";
    for (const [id, mesh] of this.meshes) {
      const old = mesh.material;
      const tissue = tissueOf(this.typeById.get(id));
      let axis: THREE.Vector3 | null = null;
      if (high && tissue === "muscle") {
        axis = this.axes.get(id) ?? principalAxis(mesh.geometry);
        this.axes.set(id, axis);
      }
      const next = high ? richMaterial(tissue, axis, hashOf(id)) : standardMaterial(tissue);
      next.color.copy(old.color);
      next.emissive.copy(old.emissive);
      next.emissiveIntensity = old.emissiveIntensity;
      next.opacity = old.opacity;
      next.transparent = old.transparent;
      next.depthWrite = old.depthWrite;
      mesh.material = next;
      mesh.castShadow = high && mesh.visible && old.opacity >= 0.5;
      mesh.receiveShadow = high;
      old.dispose();
    }
    if (this.pulse) {
      const mesh = this.meshes.get(this.pulse.id);
      if (mesh) addBulge(mesh.material, this.pulse.uniforms);
    }
  }

  /** At High the halo is written brighter than white so it blooms into a soft glow. */
  private haloColor(): THREE.Color {
    const c = new THREE.Color(HALO_COLOR);
    return this.level === "high" ? c.multiplyScalar(6) : c;
  }

  private meterFrame(dt: number): void {
    const meter = this.meter;
    if (!meter) return;
    meter.push(dt);
    if (!meter.finished) return;
    this.meter = null;
    if (shouldDowngrade(meter.average(), meter.frames)) {
      this.level = "low";
      this.applyLevel();
      this.handlers.onGraphicsAuto?.("low");
    }
  }

  private stepDolly(now: number): void {
    const d = this.dolly;
    if (!d) return;
    const t = Math.min(1, (now - d.start) / DOLLY_MS);
    const distance = d.from + (d.to - d.from) * easeInOut(t);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.camera.position.copy(this.controls.target).addScaledVector(dir, distance);
    if (t >= 1) this.dolly = null;
  }

  private markReflection = () => {
    this.floor?.markDirty();
  };

  /** Draw a thin halo around one part (or none). */
  setSelected(id: string | null): void {
    this.selectedId = id;
    if (this.body) this.applyBody(this.motionPhase * (this.body.frames - 1));
    if (this.halo) {
      this.halo.parent?.remove(this.halo);
      (this.halo.material as THREE.Material).dispose();
      this.halo = null;
    }
    const mesh = id ? this.meshes.get(id) : undefined;
    if (!mesh || !this.model) return;
    mesh.geometry.computeBoundingBox();
    const c = mesh.geometry.boundingBox!.getCenter(new THREE.Vector3());
    const halo = new THREE.Mesh(
      mesh.geometry,
      new THREE.MeshBasicMaterial({
        color: this.haloColor(),
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    halo.matrixAutoUpdate = false;
    const s = 1.035;
    halo.matrix
      .makeTranslation(c.x, c.y, c.z)
      .multiply(new THREE.Matrix4().makeScale(s, s, s))
      .multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
    halo.renderOrder = -1;
    // A child of the mesh, so it follows any joint pose the mesh is given.
    mesh.add(halo);
    this.halo = halo;
  }

  /** Frame a region: look at `center` from `direction`, fitting a sphere of `radius`. */
  frame(center: Vec3, radius: number, direction: Vec3): Promise<void> {
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const distance = THREE.MathUtils.clamp(
      (Math.max(radius, 0.05) * 1.05) / Math.sin(halfFov),
      this.controls.minDistance,
      this.controls.maxDistance,
    );
    const dir = new THREE.Vector3(...direction).normalize();
    const pos = new THREE.Vector3(...center).add(dir.multiplyScalar(distance));
    return this.moveCamera([pos.x, pos.y, pos.z], center, true);
  }

  /** Start (or clear) a rigid joint motion. Cables are drawn as cylinders that follow the moving end. */
  setMotion(m: MotionDrawing | null): void {
    this.clearMotion();
    this.motion = m;
    this.motionPhase = 0;
    this.motionT = 0;
    this.motionDir = 1;
    if (!m) return;
    // Screen-space thickness stays about the same for a jaw framed at 0.16 and a knee at 0.4.
    const k = Math.min(1, Math.max(0.3, m.radius / 0.42));
    for (const c of m.cables) {
      const material = new THREE.MeshBasicMaterial({
        color: c.color,
        transparent: true,
        opacity: 0.85,
        depthTest: false,
      });
      const first = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0045 * k, 0.0045 * k, 1, 10, 1, true),
        material,
      );
      first.renderOrder = 30;
      const second = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0052 * k, 0.0052 * k, 1, 10, 1, true),
        material,
      );
      second.renderOrder = 30;
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.008 * k, 12, 10),
        new THREE.MeshBasicMaterial({ color: c.color, depthTest: false }),
      );
      dot.renderOrder = 31;
      this.cableGroup.add(first, second, dot);
      this.cables.push({
        first,
        second,
        dot,
        from: new THREE.Vector3(...c.from),
        via: new THREE.Vector3(...c.via),
        to: new THREE.Vector3(...c.to),
        viaWeight: c.viaWeight,
        fromSeg: c.fromSeg,
        toSeg: c.toSeg,
      });
      // With a full-body pose the whole model is already skinned; only the cables are needed.
      if (!this.body) this.deform(c, m);
    }
    this.model?.updateMatrixWorld(true);
    for (const d of this.deformed) d.skinned.bind(d.skinned.skeleton);
    this.applyMotion();
  }

  /**
   * Re-skin one crossing muscle with two bones: a fixed root and the moving segment. Each vertex
   * blends between them by a smooth band across the joint plane, so the mesh bends at the joint
   * and its ends follow their bones. A bulge shader thickens it as it shortens.
   */
  private deform(c: MotionDrawing["cables"][number], m: MotionDrawing): void {
    const mesh = this.meshes.get(c.id);
    if (!mesh || !this.model) return;
    const geometry = mesh.geometry.clone();
    const pos = geometry.attributes.position;
    const n = pos.count;
    const skinIndex = new Uint16Array(n * 4);
    const skinWeight = new Float32Array(n * 4);
    const cx = m.pivot[0] + this.modelCenter[0];
    const cy = m.pivot[1] + this.modelCenter[1];
    const cz = m.pivot[2] + this.modelCenter[2];
    for (let i = 0; i < n; i++) {
      const s =
        (pos.getX(i) - cx) * m.dir[0] + (pos.getY(i) - cy) * m.dir[1] + (pos.getZ(i) - cz) * m.dir[2];
      const w = bandWeight(s, m.band);
      skinIndex[i * 4] = 1;
      skinIndex[i * 4 + 1] = 0;
      skinWeight[i * 4] = w;
      skinWeight[i * 4 + 1] = 1 - w;
    }
    geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndex, 4));
    geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeight, 4));
    const root = new THREE.Bone();
    const seg = new THREE.Bone();
    seg.matrixAutoUpdate = false;
    root.add(seg);
    const material = mesh.material.clone();
    const axisDir = new THREE.Vector3(c.to[0] - c.from[0], c.to[1] - c.from[1], c.to[2] - c.from[2]).normalize();
    const uniforms: BulgeUniforms = {
      uAxisOrigin: {
        value: new THREE.Vector3(
          c.via[0] + this.modelCenter[0],
          c.via[1] + this.modelCenter[1],
          c.via[2] + this.modelCenter[2],
        ),
      },
      uAxisDir: { value: axisDir },
      uBulge: { value: 1 },
      uShorten: { value: 1 },
    };
    addBulge(material, uniforms);
    const skinned = new THREE.SkinnedMesh(geometry, material);
    skinned.add(root);
    skinned.frustumCulled = false;
    skinned.userData.catalogId = c.id;
    skinned.castShadow = this.level === "high";
    skinned.receiveShadow = this.level === "high";
    this.model.add(skinned);
    skinned.skeleton = new THREE.Skeleton([root, seg]);
    this.deformed.push({ id: c.id, skinned, seg, material, uniforms, change: c.change });
    this.deformedIds.add(c.id);
    mesh.visible = false;
  }

  private static placeSegment(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3): void {
    const delta = b.clone().sub(a);
    mesh.position.copy(a).add(delta.clone().multiplyScalar(0.5));
    mesh.scale.set(1, Math.max(delta.length(), 0.001), 1);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  }

  setMotionPhase(phase: number): void {
    if (!this.motion) return;
    this.motionPhase = Math.min(1, Math.max(0, phase));
    this.motionT = this.motionPhase;
    this.applyMotion();
  }

  setMotionPlaying(on: boolean): void {
    this.motionPlaying = on && !this.reduced;
  }

  setMotionSpeed(speed: number): void {
    this.motionSpeed = Math.max(0.05, speed);
  }

  private applyMotion(): void {
    const m = this.motion;
    if (this.body) {
      this.applyBody(this.motionPhase * (this.body.frames - 1));
      return;
    }
    if (!m) return;
    const deg = m.curve
      ? sampleCurve(m.curve.angles, this.motionPhase)
      : m.range[0] + (m.range[1] - m.range[0]) * this.motionPhase;
    const q = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(...m.axis).normalize(),
      (deg * Math.PI) / 180,
    );
    // Mesh-local coordinates are the raw model coordinates: catalog point + model centre.
    const pivotLocal = new THREE.Vector3(
      m.pivot[0] + this.modelCenter[0],
      m.pivot[1] + this.modelCenter[1],
      m.pivot[2] + this.modelCenter[2],
    );
    const pose = new THREE.Matrix4()
      .makeTranslation(pivotLocal.x, pivotLocal.y, pivotLocal.z)
      .multiply(new THREE.Matrix4().makeRotationFromQuaternion(q))
      .multiply(new THREE.Matrix4().makeTranslation(-pivotLocal.x, -pivotLocal.y, -pivotLocal.z));
    for (const id of m.movingIds) {
      const mesh = this.meshes.get(id);
      if (!mesh) continue;
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(pose);
      mesh.matrixWorldNeedsUpdate = true;
      this.posed.add(id);
    }
    for (const d of this.deformed) {
      d.seg.matrix.copy(pose);
      d.seg.matrixWorldNeedsUpdate = true;
      // Volume-preserving: a path that shortens by k thickens by 1/sqrt(1 - k).
      const ratio = Math.max(0.35, 1 + d.change * this.motionPhase);
      d.uniforms.uBulge.value = Math.min(1.45, Math.max(0.75, 1 / Math.sqrt(ratio)));
    }
    const pivotWorld = new THREE.Vector3(...m.pivot);
    const axisUnit = new THREE.Vector3(...m.axis).normalize();
    const turn = (p: THREE.Vector3, weight = 1) =>
      p
        .clone()
        .sub(pivotWorld)
        .applyQuaternion(
          weight === 1
            ? q
            : new THREE.Quaternion().setFromAxisAngle(axisUnit, ((deg * Math.PI) / 180) * weight),
        )
        .add(pivotWorld);
    for (const c of this.cables) {
      const via = turn(c.via, c.viaWeight);
      const to = turn(c.to);
      AnatomyEngine.placeSegment(c.first, c.from, via);
      AnatomyEngine.placeSegment(c.second, via, to);
      c.dot.position.copy(to);
    }
    this.shadowDirty = true;
    this.floor?.markDirty();
  }

  /**
   * Pose the whole body from a measured swing (spec section 6): one skeleton of rig segments,
   * every bone following its segment rigidly, every soft part re-skinned across the segments its
   * attachments span. Pass null to restore the model; a single-joint motion, if set, comes back.
   */
  setBody(body: BodyDrawing | null): void {
    this.clearBody();
    this.body = body;
    if (!body || !this.model) {
      if (this.motion) {
        for (const c of this.motion.cables) this.deform(c, this.motion);
        this.model?.updateMatrixWorld(true);
        for (const d of this.deformed) d.skinned.bind(d.skinned.skeleton);
        this.applyMotion();
      }
      return;
    }
    this.undoMotionPose();
    this.floor?.setMirror(false);
    const bones: THREE.Bone[] = [];
    for (const seg of Object.keys(body.transformsAt(0))) {
      const bone = new THREE.Bone();
      bone.matrixAutoUpdate = false;
      this.bodyBones.set(seg, bone);
      bones.push(bone);
    }
    // Bones start at identity, so the skeleton's inverses are identity and each bone's matrix is
    // simply its segment's pose in mesh-local coordinates.
    this.bodySkeleton = new THREE.Skeleton(bones);
    const boneIndex = new Map(bones.map((b, i) => [b, i]));
    const c = this.modelCenter;
    for (const [id, mesh] of this.meshes) {
      const rigidSeg = body.segmentOf(id);
      if (rigidSeg) {
        this.bodyRigid.push({ id, seg: rigidSeg });
        continue;
      }
      if (body.mode === "lines") {
        // Skeleton plus lines of action: soft shapes stay out of the picture.
        this.bodyHidden.add(id);
        mesh.visible = false;
        continue;
      }
      const positions = mesh.geometry.attributes.position.array as Float32Array;
      const skin = body.skinOf(id, positions, c);
      if (!skin) {
        this.bodyRigid.push({ id, seg: body.carrierOf(id) });
        continue;
      }
      const geometry = new THREE.BufferGeometry();
      for (const name of ["position", "normal", "uv"]) {
        const attr = mesh.geometry.getAttribute(name);
        if (attr) geometry.setAttribute(name, attr);
      }
      if (mesh.geometry.index) geometry.setIndex(mesh.geometry.index);
      const index = new Uint16Array(skin.index.length);
      for (let i = 0; i < skin.index.length; i++) {
        const bone = this.bodyBones.get(skin.segments[skin.index[i]]);
        index[i] = bone ? (boneIndex.get(bone) ?? 0) : 0;
      }
      geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(index, 4));
      geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skin.weight, 4));
      if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
      geometry.boundingSphere = mesh.geometry.boundingSphere;
      const material = mesh.material.clone();
      let uniforms: BulgeUniforms | null = null;
      const bulge = body.bulgeOf(id);
      if (bulge) {
        uniforms = {
          uAxisOrigin: { value: new THREE.Vector3(bulge.belly[0] + c[0], bulge.belly[1] + c[1], bulge.belly[2] + c[2]) },
          uAxisDir: {
            value: new THREE.Vector3(
              bulge.axisTo[0] - bulge.axisFrom[0],
              bulge.axisTo[1] - bulge.axisFrom[1],
              bulge.axisTo[2] - bulge.axisFrom[2],
            ).normalize(),
          },
          uBulge: { value: 1 },
          uShorten: { value: 1 },
        };
        addBulge(material, uniforms);
      }
      const skinned = new THREE.SkinnedMesh(geometry, material);
      // Detached: bone matrices are in the mesh's own space, not the world, so no world inverse is applied.
      skinned.bindMode = THREE.DetachedBindMode;
      skinned.frustumCulled = false;
      skinned.userData.catalogId = id;
      skinned.castShadow = this.level === "high" && mesh.castShadow;
      skinned.receiveShadow = this.level === "high";
      skinned.renderOrder = mesh.renderOrder;
      this.model.add(skinned);
      skinned.bind(this.bodySkeleton, new THREE.Matrix4());
      this.bodyTwins.push({ id, skinned, material, uniforms });
      this.bodyTwinIds.add(id);
      mesh.visible = false;
    }
    if (body.mode === "lines") {
      for (const path of body.paths) {
        const material = new THREE.MeshStandardMaterial({ color: LINE_NEUTRAL, roughness: 0.55, metalness: 0 });
        const first = new THREE.Mesh(new THREE.CylinderGeometry(LINE_RADIUS, LINE_RADIUS, 1, 8, 1, false), material);
        const second = new THREE.Mesh(new THREE.CylinderGeometry(LINE_RADIUS, LINE_RADIUS, 1, 8, 1, false), material);
        first.userData.catalogId = path.id;
        second.userData.catalogId = path.id;
        first.castShadow = second.castShadow = this.level === "high";
        this.lineGroup.add(first, second);
        this.bodyLines.push({ id: path.id, path, first, second, material });
      }
    }
    if (body.bat) {
      this.batMesh = new THREE.Mesh(
        batGeometry(),
        new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.42, metalness: 0 }),
      );
      this.batMesh.castShadow = this.level === "high";
      this.scene.add(this.batMesh);
    }
    this.model.updateMatrixWorld(true);
    this.applyBody(this.motionPhase * (body.frames - 1));
  }

  /** Set every rig bone, rigid part, bulge, cable and the bat for one frame of the swing. */
  private applyBody(frame: number): void {
    const body = this.body;
    if (!body) return;
    const t = body.transformsAt(frame);
    const c = this.modelCenter;
    const rot = new THREE.Matrix4();
    const back = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (const [seg, bone] of this.bodyBones) {
      const s = t[seg as keyof typeof t];
      if (!s) continue;
      q.set(s.q[0], s.q[1], s.q[2], s.q[3]);
      bone.matrixWorld
        .makeTranslation(s.posed[0] + c[0], s.posed[1] + c[1], s.posed[2] + c[2])
        .multiply(rot.makeRotationFromQuaternion(q))
        .multiply(back.makeTranslation(-(s.pivot[0] + c[0]), -(s.pivot[1] + c[1]), -(s.pivot[2] + c[2])));
    }
    for (const { id, seg } of this.bodyRigid) {
      const mesh = this.meshes.get(id);
      const bone = this.bodyBones.get(seg);
      if (!mesh || !bone) continue;
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(bone.matrixWorld);
      mesh.matrixWorldNeedsUpdate = true;
    }
    for (const twin of this.bodyTwins) {
      if (!twin.uniforms) continue;
      const ratio = Math.max(0.35, body.ratioAt(twin.id, frame));
      twin.uniforms.uBulge.value = Math.min(1.45, Math.max(0.75, 1 / Math.sqrt(ratio)));
    }
    // Cables and the bat live in the scene (catalog space), so no centre offset here.
    const place = (seg: string | undefined, v: THREE.Vector3): THREE.Vector3 => {
      const s = seg ? t[seg as keyof typeof t] : undefined;
      if (!s) return v.clone();
      q.set(s.q[0], s.q[1], s.q[2], s.q[3]);
      return v
        .clone()
        .sub(new THREE.Vector3(s.pivot[0], s.pivot[1], s.pivot[2]))
        .applyQuaternion(q)
        .add(new THREE.Vector3(s.posed[0], s.posed[1], s.posed[2]));
    };
    for (const cable of this.cables) {
      const from = place(cable.fromSeg, cable.from);
      const to = place(cable.toSeg, cable.to);
      const via = place(cable.fromSeg, cable.via).lerp(place(cable.toSeg, cable.via), cable.viaWeight);
      AnatomyEngine.placeSegment(cable.first, from, via);
      AnatomyEngine.placeSegment(cable.second, via, to);
      cable.dot.position.copy(to);
    }
    const vec = (v: Vec3) => new THREE.Vector3(v[0], v[1], v[2]);
    for (const line of this.bodyLines) {
      const p = line.path;
      const from = place(p.fromSeg, vec(p.from));
      const to = place(p.toSeg, vec(p.to));
      const via = new THREE.Vector3();
      p.viaSegments.forEach((s, i) => via.addScaledVector(place(s, vec(p.via)), p.viaWeights[i]));
      AnatomyEngine.placeSegment(line.first, from, via);
      AnatomyEngine.placeSegment(line.second, via, to);
      const selected = line.id === this.selectedId;
      const hovered = line.id === this.hoverId;
      const k = selected ? 2 : hovered ? 1.5 : 1;
      line.first.scale.x = line.first.scale.z = k;
      line.second.scale.x = line.second.scale.z = k;
      if (selected) line.material.color.set(COLORS.selected);
      else line.material.color.copy(lineColor(body.ratioAt(line.id, frame) - 1));
      line.material.emissive.set(selected ? COLORS.selectedEmissive : hovered ? "#4a4238" : "#000000");
    }
    if (this.batMesh && body.bat) {
      const f = Math.min(body.bat.dirs.length - 1, Math.max(0, Math.round(frame)));
      const hands = place(body.bat.hands[0], vec(body.bat.anchors[0]))
        .add(place(body.bat.hands[1], vec(body.bat.anchors[1])))
        .multiplyScalar(0.5);
      const dir = vec(body.bat.dirs[f]);
      // The hands grip the handle, so the knob sits below them and the barrel runs out to the measured tip.
      const knob = hands.clone().addScaledVector(dir, -body.bat.gripOffset);
      const tip = knob.clone().addScaledVector(dir, body.bat.length);
      AnatomyEngine.placeSegment(this.batMesh, knob, tip);
    }
    this.shadowDirty = true;
    this.floor?.markDirty();
  }

  private clearBody(): void {
    for (const twin of this.bodyTwins) {
      this.model?.remove(twin.skinned);
      twin.material.dispose();
      const original = this.meshes.get(twin.id);
      const target = this.targets.get(twin.id);
      if (original) original.visible = target ? target.style.visible : true;
    }
    this.bodyTwins = [];
    this.bodyTwinIds.clear();
    for (const { id } of this.bodyRigid) {
      const mesh = this.meshes.get(id);
      if (!mesh) continue;
      mesh.matrix.identity();
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
      mesh.matrixAutoUpdate = true;
      mesh.matrixWorldNeedsUpdate = true;
    }
    this.bodyRigid = [];
    for (const id of this.bodyHidden) {
      const mesh = this.meshes.get(id);
      const target = this.targets.get(id);
      if (mesh) mesh.visible = target ? target.style.visible : true;
    }
    this.bodyHidden.clear();
    for (const line of this.bodyLines) {
      this.lineGroup.remove(line.first, line.second);
      line.first.geometry.dispose();
      line.second.geometry.dispose();
      line.material.dispose();
    }
    this.bodyLines = [];
    this.bodyBones.clear();
    this.bodySkeleton = null;
    if (this.batMesh) {
      this.scene.remove(this.batMesh);
      this.batMesh.geometry.dispose();
      (this.batMesh.material as THREE.Material).dispose();
      this.batMesh = null;
    }
    this.body = null;
    this.shadowDirty = true;
    this.floor?.setMirror(true);
  }

  /** Put rigidly posed bones back and drop the two-bone twins, keeping the cables. */
  private undoMotionPose(): void {
    for (const id of this.posed) {
      const mesh = this.meshes.get(id);
      if (!mesh) continue;
      mesh.matrix.identity();
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
      mesh.matrixAutoUpdate = true;
      mesh.matrixWorldNeedsUpdate = true;
    }
    this.posed.clear();
    for (const d of this.deformed) {
      this.model?.remove(d.skinned);
      d.skinned.geometry.dispose();
      d.material.dispose();
      const original = this.meshes.get(d.id);
      const target = this.targets.get(d.id);
      if (original) original.visible = target ? target.style.visible : true;
    }
    this.deformed = [];
    this.deformedIds.clear();
  }

  private clearMotion(): void {
    this.shadowDirty = true;
    this.floor?.markDirty();
    this.undoMotionPose();
    for (const c of this.cables) {
      this.cableGroup.remove(c.first, c.second, c.dot);
      c.first.geometry.dispose();
      c.second.geometry.dispose();
      (c.second.material as THREE.Material).dispose();
      c.dot.geometry.dispose();
      (c.dot.material as THREE.Material).dispose();
    }
    this.cables = [];
    this.motion = null;
    this.motionPlaying = false;
  }

  /** Copy the original's tweened look onto its deformed copy so selection and hover still read. */
  private mirrorDeformed(): void {
    const copy = (id: string, material: THREE.MeshStandardMaterial) => {
      const src = this.meshes.get(id)?.material;
      if (!src) return;
      material.color.copy(src.color);
      material.emissive.copy(src.emissive);
      material.emissiveIntensity = src.emissiveIntensity;
      material.opacity = src.opacity;
      material.transparent = src.transparent;
      material.depthWrite = src.depthWrite;
    };
    for (const d of this.deformed) copy(d.id, d.material);
    for (const twin of this.bodyTwins) {
      copy(twin.id, twin.material);
      const src = this.meshes.get(twin.id);
      if (src) twin.skinned.visible = this.targets.get(twin.id)?.style.visible ?? true;
    }
  }

  /** Slow drift around the target, for cinematic tours. Off under reduced motion. */
  setAutoRotate(on: boolean, speed = 0.5): void {
    this.controls.autoRotate = on && !this.reduced;
    this.controls.autoRotateSpeed = speed;
  }

  setView(preset: ViewPreset, animate = true): Promise<void> {
    const d = PRESET_DIRECTIONS[preset];
    return this.moveCamera(
      [d[0] * this.fitDistance, d[1] * this.fitDistance, d[2] * this.fitDistance],
      [0, 0, 0],
      animate,
    );
  }

  setCamera(pose: CameraPose, animate = false): Promise<void> {
    return this.moveCamera(pose.position, pose.target, animate);
  }

  getCamera(): CameraPose {
    const p = this.camera.position;
    const t = this.controls.target;
    return { position: [p.x, p.y, p.z], target: [t.x, t.y, t.z] };
  }

  /** Frame one part: keep the current viewing direction (or use a preset) and fit its bounding sphere. */
  flyTo(
    id: string,
    opts: { padding?: number; preset?: ViewPreset; direction?: Vec3 } = {},
  ): Promise<void> {
    const mesh = this.meshes.get(id);
    if (!mesh) return Promise.resolve();
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const distance = THREE.MathUtils.clamp(
      (Math.max(sphere.radius, 0.03) * (opts.padding ?? 2.4)) / Math.sin(halfFov),
      this.controls.minDistance,
      this.controls.maxDistance,
    );
    const dir = opts.direction
      ? new THREE.Vector3(...opts.direction).normalize()
      : opts.preset
        ? new THREE.Vector3(...PRESET_DIRECTIONS[opts.preset])
        : this.camera.position.clone().sub(this.controls.target).normalize();
    // In a cinematic tour the flight lands a little far out and a slow dolly closes the rest.
    const dollyIn = this.cinematic && this.level === "high" && !this.reduced;
    const start = dollyIn ? distance * 1.08 : distance;
    const pos = sphere.center.clone().add(dir.multiplyScalar(start));
    const flight = this.moveCamera(
      [pos.x, pos.y, pos.z],
      [sphere.center.x, sphere.center.y, sphere.center.z],
      true,
    );
    if (dollyIn)
      void flight.then(() => {
        if (this.cinematic && !this.disposed)
          this.dolly = { start: performance.now(), from: start, to: distance };
      });
    return flight;
  }

  /** Replace the drawn teaching cables. Points are in model space (catalog coordinates). */
  drawPaths(paths: { points: Vec3[]; color: string }[]): void {
    this.clearPaths();
    paths.forEach((path, i) => {
      if (path.points.length < 2) return;
      const curve = new THREE.CatmullRomCurve3(
        path.points.map((p) => new THREE.Vector3(...p)),
        false,
        "centripetal",
        0.5,
      );
      // A bright core with a pale strand and a soft glow keeps the cable readable on the slate.
      const core = new THREE.Color(path.color).lerp(new THREE.Color("#fffefb"), 0.12);
      const strand = new THREE.Color(path.color).lerp(new THREE.Color("#fffefb"), 0.85);
      const glow = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 240, 0.016, 10, false),
        new THREE.MeshBasicMaterial({ color: path.color, transparent: true, opacity: 0.22, depthTest: false }),
      );
      glow.renderOrder = 9;
      const outer = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 240, 0.0075, 10, false),
        new THREE.MeshBasicMaterial({ color: core, transparent: true, opacity: 0.95, depthTest: false }),
      );
      outer.renderOrder = 10;
      const inner = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 240, 0.0032, 8, false),
        new THREE.MeshBasicMaterial({ color: strand, depthTest: false }),
      );
      inner.renderOrder = 11;
      const pulse = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 16, 12),
        new THREE.MeshBasicMaterial({ color: "#fffefb", depthTest: false }),
      );
      pulse.renderOrder = 12;
      this.pathGroup.add(glow, outer, inner, pulse);
      this.pulses.push({ curve, mesh: pulse, phase: (i * 0.5) % 1 });
    });
  }

  clearPaths(): void {
    for (const child of [...this.pathGroup.children]) {
      this.pathGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
    this.pulses = [];
  }

  /**
   * Animate a muscle's direction of pull: a cable from the insertion through the muscle to the
   * origin, particles flowing toward the origin, an arrowhead there, and a label at each end.
   * Points are in model space. Pass null to clear.
   */
  drawPull(pull: PullDrawing | null): void {
    this.clearPull();
    if (!pull) return;
    const up = new THREE.Vector3(0, 1, 0);
    for (const p of pull.paths) {
      const curve = new THREE.CatmullRomCurve3(
        [new THREE.Vector3(...p.from), new THREE.Vector3(...p.via), new THREE.Vector3(...p.to)],
        false,
        "centripetal",
        0.5,
      );
      const core = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 64, 0.0065, 8, false),
        new THREE.MeshBasicMaterial({ color: "#2f2a24", transparent: true, opacity: 0.85, depthTest: false }),
      );
      core.renderOrder = 20;
      const strand = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 64, 0.003, 6, false),
        new THREE.MeshBasicMaterial({ color: "#fff2d6", depthTest: false }),
      );
      strand.renderOrder = 21;
      const tip = curve.getPointAt(0.985);
      const tangent = curve.getTangentAt(0.985).normalize();
      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.013, 0.034, 14),
        new THREE.MeshBasicMaterial({ color: ORIGIN_COLOR, depthTest: false }),
      );
      arrow.position.copy(tip);
      arrow.quaternion.setFromUnitVectors(up, tangent);
      arrow.renderOrder = 23;
      const start = new THREE.Mesh(
        new THREE.SphereGeometry(0.011, 14, 12),
        new THREE.MeshBasicMaterial({ color: INSERTION_COLOR, depthTest: false }),
      );
      start.position.copy(curve.getPointAt(0));
      start.renderOrder = 23;
      this.pullGroup.add(start);
      const particles: THREE.Mesh[] = [];
      for (let i = 0; i < PULL_PARTICLES; i++) {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.0085, 12, 10),
          new THREE.MeshBasicMaterial({ color: "#ffe6a8", depthTest: false }),
        );
        dot.renderOrder = 22;
        particles.push(dot);
      }
      this.pullGroup.add(core, strand, arrow, ...particles);
      this.pullFlows.push({ curve, particles });
    }
    if (pull.origin[0]) this.addLabel("Origin · fixed end", pull.origin[0], "origin");
    if (pull.insertion[0]) this.addLabel("Insertion · moving end", pull.insertion[0], "insertion");
  }

  clearPull(): void {
    for (const child of [...this.pullGroup.children]) {
      this.pullGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
    this.pullFlows = [];
    for (const l of this.labels) l.el.remove();
    this.labels = [];
  }

  private addLabel(text: string, position: Vec3, kind: "origin" | "insertion"): void {
    const el = document.createElement("div");
    el.className = `model-label model-label-${kind}`;
    el.textContent = text;
    el.setAttribute("aria-hidden", "true");
    this.host.appendChild(el);
    this.labels.push({ el, position: new THREE.Vector3(...position) });
  }

  private placeLabels(): void {
    if (!this.labels.length) return;
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    const v = new THREE.Vector3();
    for (const l of this.labels) {
      v.copy(l.position).project(this.camera);
      const visible = v.z < 1 && v.x > -1.1 && v.x < 1.1 && v.y > -1.1 && v.y < 1.1;
      l.el.style.display = visible ? "block" : "none";
      if (!visible) continue;
      l.el.style.left = `${((v.x + 1) / 2) * w}px`;
      l.el.style.top = `${((1 - v.y) / 2) * h}px`;
    }
  }

  zoom(factor: number): void {
    this.cancelAnimation();
    const offset = this.camera.position.clone().sub(this.controls.target).multiplyScalar(factor);
    offset.clampLength(this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
    this.scheduleCameraChange();
  }

  dispose(): void {
    this.disposed = true;
    this.cancelAnimation();
    cancelAnimationFrame(this.rafHandle);
    window.clearTimeout(this.cameraTimer);
    this.observer.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener("pointerdown", this.onDown);
    el.removeEventListener("pointerup", this.onUp);
    el.removeEventListener("pointermove", this.onMove);
    el.removeEventListener("pointerleave", this.onLeave);
    this.controls.dispose();
    this.draco.dispose();
    this.clearPaths();
    this.clearPull();
    this.clearBody();
    this.clearMotion();
    this.setPulse(null);
    this.setSelected(null);
    this.controls.removeEventListener("change", this.markReflection);
    this.pipeline?.dispose();
    this.floor?.dispose();
    if (this.ground) {
      this.scene.remove(this.ground);
      this.ground.geometry.dispose();
      const m = this.ground.material as THREE.MeshBasicMaterial;
      m.map?.dispose();
      m.dispose();
    }
    if (this.model) disposeObject(this.model);
    this.meshes.clear();
    this.scene.environment?.dispose();
    this.renderer.dispose();
    el.remove();
  }

  private addGroundShadow(box: THREE.Box3): void {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    // Soft on the dark slate ground; a third of what the cream stage needed.
    g.addColorStop(0, "rgba(10, 14, 16, 0.34)");
    g.addColorStop(0.5, "rgba(10, 14, 16, 0.12)");
    g.addColorStop(1, "rgba(10, 14, 16, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const w = Math.max(box.max.x - box.min.x, 0.4) * 1.5;
    const d = Math.max(box.max.z - box.min.z, 0.25) * 2.4;
    const disc = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set((box.min.x + box.max.x) / 2, box.min.y - 0.003, (box.min.z + box.max.z) / 2);
    disc.renderOrder = -5;
    this.scene.add(disc);
    this.ground = disc;
  }

  private snap(id: string, mesh: PartMesh, t: Target): void {
    const mat = mesh.material;
    mesh.visible = t.style.visible && !this.deformedIds.has(id) && !this.bodyStandsIn(id);
    mat.color.copy(t.color);
    mat.emissive.copy(t.emissive);
    mat.emissiveIntensity = t.style.emissiveIntensity;
    mat.opacity = t.style.opacity;
    mat.transparent = t.style.opacity < 1;
    mat.depthWrite = t.style.opacity >= 0.95;
    mesh.castShadow = this.level === "high" && t.style.visible && t.style.opacity >= 0.5;
  }

  /** Advance every pending tween by one frame. */
  private tick(dt: number): void {
    const k = 1 - Math.exp(-dt / TWEEN_TAU);
    for (const id of this.pending) {
      const mesh = this.meshes.get(id);
      const t = this.targets.get(id);
      if (!mesh || !t) {
        this.pending.delete(id);
        continue;
      }
      const mat = mesh.material;
      const lift = id === this.hoverId ? HOVER_LIFT : 0;
      const goalOpacity = t.style.visible ? t.style.opacity : 0;
      const goalEmissive = lift && t.emissive.r + t.emissive.g + t.emissive.b === 0 ? HOVER_EMISSIVE : t.emissive;
      const goalIntensity = t.style.emissiveIntensity + lift;
      mat.color.lerp(t.color, k);
      mat.emissive.lerp(goalEmissive, k);
      mat.emissiveIntensity += (goalIntensity - mat.emissiveIntensity) * k;
      mat.opacity += (goalOpacity - mat.opacity) * k;
      const done =
        Math.abs(mat.opacity - goalOpacity) < 0.004 &&
        Math.abs(mat.emissiveIntensity - goalIntensity) < 0.004 &&
        colorClose(mat.color, t.color) &&
        colorClose(mat.emissive, goalEmissive);
      if (done) {
        mat.opacity = goalOpacity;
        mat.emissiveIntensity = goalIntensity;
        mat.color.copy(t.color);
        mat.emissive.copy(goalEmissive);
        if (!t.style.visible) mesh.visible = false;
        this.pending.delete(id);
      }
      mat.transparent = mat.opacity < 1;
      mat.depthWrite = mat.opacity >= 0.95;
      mesh.castShadow = this.level === "high" && mesh.visible && mat.opacity >= 0.5;
    }
    this.shadowDirty = true;
  }

  private setHover(id: string | null): void {
    if (id === this.hoverId) return;
    if (this.body && this.bodyLines.length) {
      this.hoverId = id;
      this.applyBody(this.motionPhase * (this.body.frames - 1));
      return;
    }
    if (this.hoverId && this.targets.has(this.hoverId)) this.pending.add(this.hoverId);
    this.hoverId = id;
    if (id && this.targets.has(id) && !this.reduced) this.pending.add(id);
  }

  private moveCamera(position: Vec3, target: Vec3, animate: boolean): Promise<void> {
    this.cancelAnimation();
    if (!animate || this.reduced) {
      this.camera.position.set(...position);
      this.controls.target.set(...target);
      this.controls.update();
      return Promise.resolve();
    }
    const fromP = this.camera.position.clone();
    const fromT = this.controls.target.clone();
    const toP = new THREE.Vector3(...position);
    const toT = new THREE.Vector3(...target);
    const start = performance.now();
    const duration = 900;
    return new Promise((resolve) => {
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const k = easeInOut(t);
        this.camera.position.lerpVectors(fromP, toP, k);
        this.controls.target.lerpVectors(fromT, toT, k);
        this.controls.update();
        if (t < 1 && !this.disposed) this.animation = requestAnimationFrame(step);
        else {
          this.animation = null;
          resolve();
        }
      };
      this.animation = requestAnimationFrame(step);
    });
  }

  private cancelAnimation = () => {
    if (this.animation !== null) cancelAnimationFrame(this.animation);
    this.animation = null;
  };

  private scheduleCameraChange = () => {
    window.clearTimeout(this.cameraTimer);
    this.cameraTimer = window.setTimeout(() => {
      if (!this.disposed) this.handlers.onCameraChange(this.getCamera());
    }, 300);
  };

  private resize = () => {
    const w = this.host.clientWidth;
    const h = Math.max(this.host.clientHeight, 1);
    this.renderer.setSize(w, h);
    this.pipeline?.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private render = () => {
    this.rafHandle = requestAnimationFrame(this.render);
    const now = performance.now();
    const dt = Math.min(64, now - this.lastFrame);
    this.lastFrame = now;
    this.controls.update();
    if (this.pending.size) this.tick(dt);
    if (this.pulses.length) {
      const t = this.reduced ? 0.5 : (now % 4000) / 4000;
      for (const p of this.pulses) p.curve.getPointAt((t + p.phase) % 1, p.mesh.position);
    }
    if (this.pullFlows.length) {
      const t = this.reduced ? 0 : (now % PULL_PERIOD_MS) / PULL_PERIOD_MS;
      for (const flow of this.pullFlows)
        flow.particles.forEach((dot, i) =>
          flow.curve.getPointAt((t + i / PULL_PARTICLES) % 1, dot.position),
        );
    }
    if (this.motion && this.motionPlaying) {
      if (this.motion.curve) {
        // A measured curve plays forward at its own rate, holds at the end, then restarts.
        const frames = Math.max(2, this.motion.curve.angles.length);
        if (this.motionT >= 1) {
          this.motionHold += dt;
          if (this.motionHold >= CURVE_HOLD_MS) {
            this.motionHold = 0;
            this.motionT = 0;
          }
        } else {
          this.motionT = Math.min(1, this.motionT + ((dt / 1000) * this.motionSpeed * this.motion.curve.fps) / (frames - 1));
        }
        this.motionPhase = this.motionT;
      } else {
        this.motionT += (this.motionDir * dt) / MOTION_SWEEP_MS;
        if (this.motionT >= 1) {
          this.motionT = 1;
          this.motionDir = -1;
        } else if (this.motionT <= 0) {
          this.motionT = 0;
          this.motionDir = 1;
        }
        // Eased, so the joint slows into each end of its range instead of bouncing off it.
        this.motionPhase = easeInOut(this.motionT);
      }
      this.applyMotion();
      if (now - this.motionReported > 120) {
        this.motionReported = now;
        this.handlers.onMotionPhase?.(this.motionPhase);
      }
    }
    if (this.deformed.length || this.bodyTwins.length) this.mirrorDeformed();
    if (this.pulse) {
      // A slow breath: about 7% shorter at the peak, thicker to match.
      const p = (1 - Math.cos((now % 2600) / 2600 * Math.PI * 2)) / 2;
      this.pulse.uniforms.uShorten.value = 1 - 0.07 * p;
      this.pulse.uniforms.uBulge.value = 1 + 0.11 * p;
    }
    this.placeLabels();
    if (
      this.pending.size ||
      this.motionPlaying ||
      this.animation !== null ||
      this.pullFlows.length ||
      this.pulses.length ||
      this.dolly
    )
      this.floor?.markDirty();
    if (this.dolly) this.stepDolly(now);
    if (this.cinematic && this.pipeline && this.focusTarget)
      this.pipeline.setFocus(this.camera.position.distanceTo(this.focusTarget));
    if (this.shadowDirty && this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowDirty = false;
    }
    if (this.pipeline) this.pipeline.render();
    else this.renderer.render(this.scene, this.camera);
    if (this.meter) this.meterFrame(dt);
  };

  private hit(event: PointerEvent): PartMesh | undefined {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const candidates: THREE.Object3D[] = [...this.meshes.values()].filter(
      (m) => m.visible && m.material.opacity > 0.2,
    );
    for (const d of this.deformed) if (d.material.opacity > 0.2) candidates.push(d.skinned);
    for (const twin of this.bodyTwins)
      if (twin.skinned.visible && twin.material.opacity > 0.2) candidates.push(twin.skinned);
    for (const line of this.bodyLines) candidates.push(line.first, line.second);
    return this.raycaster.intersectObjects(candidates, false)[0]?.object as PartMesh | undefined;
  }

  private idOf(mesh: PartMesh): string | null {
    return typeof mesh.userData.catalogId === "string" ? mesh.userData.catalogId : null;
  }

  private onDown = (e: PointerEvent) => {
    this.downX = e.clientX;
    this.downY = e.clientY;
  };

  private onUp = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - this.downX, e.clientY - this.downY) > 5) return;
    const m = this.hit(e);
    const id = m && this.idOf(m);
    if (id) this.handlers.onSelect(id);
  };

  private onMove = (e: PointerEvent) => {
    if (e.buttons) {
      this.setHover(null);
      this.handlers.onHover(null, 0, 0);
      return;
    }
    const m = this.hit(e);
    this.renderer.domElement.style.cursor = m ? "pointer" : "grab";
    const rect = this.host.getBoundingClientRect();
    const id = m ? this.idOf(m) : null;
    this.setHover(id);
    this.handlers.onHover(
      id,
      Math.min(e.clientX - rect.left + 15, rect.width - 200),
      e.clientY - rect.top - 30,
    );
  };

  private onLeave = () => {
    this.setHover(null);
    this.handlers.onHover(null, 0, 0);
  };
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m.dispose());
    }
  });
}

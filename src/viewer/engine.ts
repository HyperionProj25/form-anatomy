import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { PartStyle } from "./appearance";
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
};

type PartMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
type Target = { style: PartStyle; color: THREE.Color; emissive: THREE.Color };

const PRESET_DIRECTIONS: Record<ViewPreset, Vec3> = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  side: [1, 0, 0],
};

/** Time constant of appearance tweens, ms. Perceived as a soft 250 ms ease. */
const TWEEN_TAU = 110;
const HOVER_LIFT = 0.16;
const HOVER_EMISSIVE = new THREE.Color("#5b5346");
const HALO_COLOR = "#9fc7b4";

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
  private frame = 0;
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
  private targets = new Map<string, Target>();
  private pending = new Set<string>();
  private hoverId: string | null = null;
  private initialized = false;
  private reduced: boolean;

  constructor(
    private host: HTMLElement,
    private nodeToId: Map<string, string>,
    private modelCenter: Vec3,
    private handlers: EngineHandlers,
  ) {
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

    // Image-based light from a neutral room gives soft reflections; direct lights carry the shape.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8e8173, 0.7));
    const key = new THREE.DirectionalLight(0xfff4e8, 1.9);
    key.position.set(-3, 4, 5);
    const fill = new THREE.DirectionalLight(0xe0ecf3, 0.7);
    fill.position.set(3, 1, -4);
    const rim = new THREE.DirectionalLight(0xffffff, 1.1);
    rim.position.set(-2, 2, -3);
    this.scene.add(key, fill, rim);
    this.scene.add(this.pathGroup);

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
          const bone = o.userData.type === "bone";
          o.material = new THREE.MeshStandardMaterial({
            color: bone ? 0xe0d3b7 : 0xa35b4c,
            roughness: bone ? 0.72 : 0.55,
            metalness: 0,
            envMapIntensity: 0.32,
            side: THREE.DoubleSide,
          });
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
        this.snap(mesh, target);
        continue;
      }
      if (s.visible && !mesh.visible) {
        mesh.visible = true;
        mesh.material.opacity = 0;
        mesh.material.transparent = true;
        mesh.material.depthWrite = false;
      }
      this.pending.add(id);
    }
    this.initialized = true;
  }

  /** Draw a thin halo around one part (or none). */
  setSelected(id: string | null): void {
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
        color: HALO_COLOR,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
    );
    halo.matrixAutoUpdate = false;
    const s = 1.03;
    halo.matrix
      .makeTranslation(c.x, c.y, c.z)
      .multiply(new THREE.Matrix4().makeScale(s, s, s))
      .multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
    halo.renderOrder = -1;
    this.model.add(halo);
    this.halo = halo;
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
    const pos = sphere.center.clone().add(dir.multiplyScalar(distance));
    return this.moveCamera(
      [pos.x, pos.y, pos.z],
      [sphere.center.x, sphere.center.y, sphere.center.z],
      true,
    );
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
      // A dark core with a pale strand keeps the cable readable over muscles drawn in the same hue.
      const core = new THREE.Color(path.color).multiplyScalar(0.45);
      const strand = new THREE.Color(path.color).lerp(new THREE.Color("#fffefb"), 0.75);
      const outer = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 240, 0.009, 10, false),
        new THREE.MeshBasicMaterial({ color: core, transparent: true, opacity: 0.9, depthTest: false }),
      );
      outer.renderOrder = 10;
      const inner = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 240, 0.004, 8, false),
        new THREE.MeshBasicMaterial({ color: strand, depthTest: false }),
      );
      inner.renderOrder = 11;
      const pulse = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 16, 12),
        new THREE.MeshBasicMaterial({ color: "#fffefb", depthTest: false }),
      );
      pulse.renderOrder = 12;
      this.pathGroup.add(outer, inner, pulse);
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
    cancelAnimationFrame(this.frame);
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
    this.setSelected(null);
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
    g.addColorStop(0, "rgba(38, 44, 34, 0.42)");
    g.addColorStop(0.5, "rgba(38, 44, 34, 0.16)");
    g.addColorStop(1, "rgba(38, 44, 34, 0)");
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

  private snap(mesh: PartMesh, t: Target): void {
    const mat = mesh.material;
    mesh.visible = t.style.visible;
    mat.color.copy(t.color);
    mat.emissive.copy(t.emissive);
    mat.emissiveIntensity = t.style.emissiveIntensity;
    mat.opacity = t.style.opacity;
    mat.transparent = t.style.opacity < 1;
    mat.depthWrite = t.style.opacity >= 0.95;
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
    }
  }

  private setHover(id: string | null): void {
    if (id === this.hoverId) return;
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
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private render = () => {
    this.frame = requestAnimationFrame(this.render);
    const now = performance.now();
    const dt = Math.min(64, now - this.lastFrame);
    this.lastFrame = now;
    this.controls.update();
    if (this.pending.size) this.tick(dt);
    if (this.pulses.length) {
      const t = this.reduced ? 0.5 : (now % 4000) / 4000;
      for (const p of this.pulses) p.curve.getPointAt((t + p.phase) % 1, p.mesh.position);
    }
    this.renderer.render(this.scene, this.camera);
  };

  private hit(event: PointerEvent): PartMesh | undefined {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const candidates = [...this.meshes.values()].filter((m) => m.visible && m.material.opacity > 0.2);
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

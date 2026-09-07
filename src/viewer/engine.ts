import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
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

const PRESET_DIRECTIONS: Record<ViewPreset, Vec3> = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  side: [1, 0, 0],
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Owns the Three.js scene for the anatomy model. Imperative API; React wraps it in Viewer.tsx.
 * Depends only on Three.js and the DOM. Throws from the constructor if WebGL is unavailable.
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
  private fitDistance = 3.7;
  private frame = 0;
  private disposed = false;
  private animation: number | null = null;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private downX = 0;
  private downY = 0;
  private cameraTimer = 0;
  private pathGroup = new THREE.Group();
  private pulses: { curve: THREE.CatmullRomCurve3; mesh: THREE.Mesh; phase: number }[] = [];

  constructor(
    private host: HTMLElement,
    private nodeToId: Map<string, string>,
    private modelCenter: Vec3,
    private handlers: EngineHandlers,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
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
    this.controls.addEventListener("start", this.cancelAnimation);
    this.controls.addEventListener("end", this.scheduleCameraChange);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8e8173, 2));
    const key = new THREE.DirectionalLight(0xfff4e8, 3.2);
    key.position.set(-3, 4, 5);
    const fill = new THREE.DirectionalLight(0xe0ecf3, 1.5);
    fill.position.set(3, 1, -4);
    const rim = new THREE.DirectionalLight(0xffffff, 2);
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
        const size = new THREE.Box3().setFromObject(this.model).getSize(new THREE.Vector3());
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
            roughness: bone ? 0.75 : 0.58,
            metalness: 0,
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

  applyAppearance(styles: Map<string, PartStyle>): void {
    for (const [id, mesh] of this.meshes) {
      const s = styles.get(id);
      if (!s) continue;
      mesh.visible = s.visible;
      const mat = mesh.material;
      mat.color.set(s.color);
      mat.emissive.set(s.emissive);
      mat.emissiveIntensity = s.emissiveIntensity;
      mat.opacity = s.opacity;
      mat.transparent = s.opacity < 1;
      mat.depthWrite = s.opacity >= 0.95;
      mat.needsUpdate = true;
    }
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
    if (this.model) disposeObject(this.model);
    this.meshes.clear();
    this.renderer.dispose();
    el.remove();
  }

  private moveCamera(position: Vec3, target: Vec3, animate: boolean): Promise<void> {
    this.cancelAnimation();
    if (!animate) {
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
    this.controls.update();
    if (this.pulses.length) {
      const t = (performance.now() % 4000) / 4000;
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
      this.handlers.onHover(null, 0, 0);
      return;
    }
    const m = this.hit(e);
    this.renderer.domElement.style.cursor = m ? "pointer" : "grab";
    const rect = this.host.getBoundingClientRect();
    const id = m ? this.idOf(m) : null;
    this.handlers.onHover(
      id,
      Math.min(e.clientX - rect.left + 15, rect.width - 200),
      e.clientY - rect.top - 30,
    );
  };

  private onLeave = () => this.handlers.onHover(null, 0, 0);
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

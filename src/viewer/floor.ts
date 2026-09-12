import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";

/**
 * The High-quality floor under the feet: a plane that catches the key light's shadow and a
 * mirror that reflects the body faintly, tinted to the slate and faded away from the contact.
 * The mirror re-renders only when something it reflects has changed.
 */
export type Floor = {
  group: THREE.Group;
  markDirty(): void;
  /** Show or hide the mirror; the shadow stays. Off during a whole-body swing, when the hitter leaves the mirror's centre and only fragments would show. */
  setMirror(on: boolean): void;
  dispose(): void;
};

const REFLECTION_STRENGTH = 0.3;

export function createFloor(box: THREE.Box3): Floor {
  const group = new THREE.Group();
  const w = Math.max(box.max.x - box.min.x, 0.4) * 2.2;
  const d = Math.max(box.max.z - box.min.z, 0.25) * 3.2;
  const cx = (box.min.x + box.max.x) / 2;
  const cz = (box.min.z + box.max.z) / 2;

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.ShadowMaterial({ color: 0x0a0e10, opacity: 0.38, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(cx, box.min.y - 0.002, cz);
  shadow.receiveShadow = true;
  shadow.renderOrder = -4;

  const mirror = new Reflector(new THREE.PlaneGeometry(w, d), {
    textureWidth: 512,
    textureHeight: 512,
    color: 0x5f6d75,
    clipBias: 0.003,
  });
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.set(cx, box.min.y - 0.004, cz);
  mirror.renderOrder = -6;
  mirror.castShadow = false;
  mirror.receiveShadow = false;
  const material = mirror.material as THREE.ShaderMaterial;
  material.transparent = true;
  material.depthWrite = false;
  material.vertexShader = material.vertexShader
    .replace("varying vec4 vUv;", "varying vec4 vUv;\nvarying vec2 vPlaneUv;")
    .replace("vUv = textureMatrix * vec4( position, 1.0 );", "vUv = textureMatrix * vec4( position, 1.0 );\nvPlaneUv = uv;");
  material.fragmentShader = material.fragmentShader
    .replace("varying vec4 vUv;", "varying vec4 vUv;\nvarying vec2 vPlaneUv;")
    .replace(
      "gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );",
      `vec2 rel = (vPlaneUv - 0.5) * vec2(2.0, 2.0);
      float fade = smoothstep(1.0, 0.1, length(rel)) * ${REFLECTION_STRENGTH.toFixed(2)};
      gl_FragColor = vec4( blendOverlay( base.rgb, color ), fade );`,
    );
  material.needsUpdate = true;

  // Render the mirror on demand: only from a perspective camera, and only when marked dirty.
  const original = mirror.onBeforeRender;
  let dirty = true;
  mirror.onBeforeRender = function (renderer, scene, camera, geometry, mat, groupArg) {
    if (!(camera instanceof THREE.PerspectiveCamera) || !dirty) return;
    dirty = false;
    original.call(this, renderer, scene, camera, geometry, mat, groupArg);
  };

  group.add(mirror, shadow);
  return {
    group,
    markDirty: () => {
      dirty = true;
    },
    setMirror: (on) => {
      mirror.visible = on;
      dirty = true;
    },
    dispose: () => {
      group.parent?.remove(group);
      shadow.geometry.dispose();
      shadow.material.dispose();
      mirror.dispose();
    },
  };
}

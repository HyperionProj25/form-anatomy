import * as THREE from "three";

export type Tissue = "muscle" | "bone" | "connective";

/** Catalog part types map onto three tissue looks. */
export function tissueOf(type: string | undefined): Tissue {
  return type === "bone" ? "bone" : type === "muscle" ? "muscle" : "connective";
}

/** Low quality: the phase 12 look, a plain standard material per tissue. */
export function standardMaterial(tissue: Tissue): THREE.MeshStandardMaterial {
  const bone = tissue === "bone";
  return new THREE.MeshStandardMaterial({
    color: bone ? 0xe0d3b7 : 0xa35b4c,
    roughness: bone ? 0.72 : 0.55,
    metalness: 0,
    envMapIntensity: 0.32,
    side: THREE.DoubleSide,
  });
}

/** Deterministic 0..1 from a seed, for per-part variation that never changes between visits. */
export function hash01(seed: number): number {
  let x = (seed + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/**
 * High quality: physical materials. Muscles get sheen, a light clearcoat, fibre striations along
 * `axis` (object space) and a ±3 % tint so the mass does not read as one plastic; bones are
 * matte and warm; connective parts glossy and pale.
 */
export function richMaterial(tissue: Tissue, axis: THREE.Vector3 | null, seed: number): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ metalness: 0, side: THREE.DoubleSide });
  if (tissue === "muscle") {
    m.color.set(0xa35b4c);
    m.roughness = 0.46 + 0.1 * hash01(seed);
    m.sheen = 0.35;
    m.sheenRoughness = 0.55;
    m.sheenColor.set("#e8a08a");
    m.clearcoat = 0.12;
    m.clearcoatRoughness = 0.5;
    m.envMapIntensity = 0.4;
    if (axis) addStriations(m, axis, 0.97 + 0.06 * hash01(seed + 1));
  } else if (tissue === "bone") {
    m.color.set(0xe0d3b7);
    m.roughness = 0.62;
    m.envMapIntensity = 0.35;
  } else {
    m.color.set(0xdbd4bb);
    m.roughness = 0.3;
    m.clearcoat = 0.3;
    m.clearcoatRoughness = 0.4;
    m.envMapIntensity = 0.5;
  }
  return m;
}

/**
 * Fragment addition after normal maps: tilt the view-space normal across the fibre direction with
 * a sine bump, so the surface shows fine ridges running along the muscle's axis. The bump is
 * computed in object space, so it stays put as the camera moves.
 */
const STRIATION_FRAGMENT = `
{
  vec3 fibreN = normalize(vFibreNormal);
  vec3 acrossO = cross(fibreN, uFibreAxis);
  float len = length(acrossO);
  if (len > 1e-4) {
    acrossO /= len;
    float phase = dot(vFibrePos, acrossO) * uFibreFreq;
    // Fade the ridges out as they shrink toward a pixel, so a distant body shows no grain and
    // the fibres appear as the camera moves in.
    float aa = clamp(1.0 - fwidth(phase) / 2.5, 0.0, 1.0);
    vec3 acrossV = normalize(normalMatrix * acrossO);
    normal = normalize(normal - acrossV * (uFibreAmp * sin(phase) * len * aa));
  }
}`;

type Compile = (shader: { vertexShader: string; fragmentShader: string; uniforms: Record<string, THREE.IUniform> }) => void;

/** Inject the striation shader; the engine's bulge shader chains after it via `userData.baseCompile`. */
export function addStriations(material: THREE.MeshStandardMaterial, axis: THREE.Vector3, tint: number): void {
  const uniforms = {
    uFibreAxis: { value: axis.clone().normalize() },
    uFibreFreq: { value: 1400 },
    uFibreAmp: { value: 0.3 },
    uTint: { value: tint },
  };
  const compile: Compile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader =
      "varying vec3 vFibrePos;\nvarying vec3 vFibreNormal;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvFibrePos = transformed;\nvFibreNormal = normalize(objectNormal);",
      );
    shader.fragmentShader =
      "uniform vec3 uFibreAxis;\nuniform float uFibreFreq;\nuniform float uFibreAmp;\nuniform float uTint;\nuniform mat3 normalMatrix;\nvarying vec3 vFibrePos;\nvarying vec3 vFibreNormal;\n" +
      shader.fragmentShader
        .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>" + STRIATION_FRAGMENT)
        .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= uTint;");
  };
  material.userData.baseCompile = compile;
  material.userData.baseKey = "striate";
  material.onBeforeCompile = compile;
  material.customProgramCacheKey = () => "striate";
  material.needsUpdate = true;
}

/**
 * The principal axis of a geometry's vertices (object space): for a muscle, close to its fibre
 * direction. Power iteration on the position covariance of up to 2000 sampled vertices.
 */
export function principalAxis(geometry: THREE.BufferGeometry): THREE.Vector3 {
  const pos = geometry.getAttribute("position");
  const n = pos.count;
  const step = Math.max(1, Math.floor(n / 2000));
  let cx = 0;
  let cy = 0;
  let cz = 0;
  let count = 0;
  for (let i = 0; i < n; i += step) {
    cx += pos.getX(i);
    cy += pos.getY(i);
    cz += pos.getZ(i);
    count++;
  }
  cx /= count;
  cy /= count;
  cz /= count;
  let xx = 0;
  let xy = 0;
  let xz = 0;
  let yy = 0;
  let yz = 0;
  let zz = 0;
  for (let i = 0; i < n; i += step) {
    const x = pos.getX(i) - cx;
    const y = pos.getY(i) - cy;
    const z = pos.getZ(i) - cz;
    xx += x * x;
    xy += x * y;
    xz += x * z;
    yy += y * y;
    yz += y * z;
    zz += z * z;
  }
  const v = new THREE.Vector3(1, 1, 1).normalize();
  for (let k = 0; k < 16; k++) {
    v.set(xx * v.x + xy * v.y + xz * v.z, xy * v.x + yy * v.y + yz * v.z, xz * v.x + yz * v.y + zz * v.z);
    if (v.lengthSq() < 1e-12) return new THREE.Vector3(0, 1, 0);
    v.normalize();
  }
  return v;
}

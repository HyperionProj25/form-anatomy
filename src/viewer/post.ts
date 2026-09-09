import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";

/**
 * The High-quality frame: scene, ambient occlusion, bloom (only HDR-bright pixels, i.e. the
 * selection halo), depth of field while a tour plays, tone mapping, a grade, anti-aliasing. Alpha
 * survives every pass so the CSS stage still shows through the canvas.
 */
export type Pipeline = {
  render(): void;
  setSize(width: number, height: number): void;
  setPixelRatio(ratio: number): void;
  setCinematic(on: boolean): void;
  setFocus(distance: number): void;
  setSceneBox(box: THREE.Box3): void;
  dispose(): void;
};

const GRADE = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    vignette: { value: 0.3 },
    saturation: { value: 1.06 },
    contrast: { value: 1.03 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float vignette;
    uniform float saturation;
    uniform float contrast;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 rgb = c.rgb;
      float l = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
      rgb = mix(vec3(l), rgb, saturation);
      rgb = (rgb - 0.5) * contrast + 0.5;
      vec2 d = (vUv - 0.5) * vec2(1.0, 0.85);
      float edge = smoothstep(0.32, 0.78, length(d));
      float dark = 1.0 - vignette * edge;
      // Empty pixels darken the CSS stage beneath by gaining alpha, so the vignette reaches the ground too.
      gl_FragColor = vec4(clamp(rgb * dark, 0.0, 1.0), max(c.a, (1.0 - dark) * 0.9));
    }`,
};

const VIGNETTE_NORMAL = 0.3;
const VIGNETTE_CINEMATIC = 0.5;

export function createPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
): Pipeline {
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const gtao = new GTAOPass(scene, camera, width, height);
  gtao.updateGtaoMaterial({
    radius: 0.25,
    distanceExponent: 1,
    thickness: 1,
    distanceFallOff: 1,
    scale: 1,
    samples: 16,
  });
  gtao.updatePdMaterial({
    lumaPhi: 10,
    depthPhi: 2,
    normalPhi: 3,
    radius: 4,
    radiusExponent: 1,
    rings: 2,
    samples: 16,
  });
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = 0.9;

  // Threshold above any lit bone or highlight: only the HDR halo blooms.
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.3, 0.4, 1.6);
  // The stock blend writes alpha 1 everywhere, which paints the empty stage black. Keep the
  // scene's alpha and let glow add its own brightness as coverage.
  bloom.blendMaterial.fragmentShader = `
    uniform float opacity;
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 bloomTexel = texture2D(tDiffuse, vUv);
      vec3 glow = bloomTexel.rgb * opacity;
      gl_FragColor = vec4(glow, clamp(max(glow.r, max(glow.g, glow.b)), 0.0, 1.0));
    }`;
  bloom.blendMaterial.blending = THREE.CustomBlending;
  bloom.blendMaterial.blendSrc = THREE.OneFactor;
  bloom.blendMaterial.blendDst = THREE.OneFactor;
  bloom.blendMaterial.blendSrcAlpha = THREE.OneFactor;
  bloom.blendMaterial.blendDstAlpha = THREE.OneFactor;
  bloom.blendMaterial.needsUpdate = true;

  const bokeh = new BokehPass(scene, camera, { focus: 2.5, aperture: 0.004, maxblur: 0.0035 });
  // Same story: the bokeh shader forces alpha to 1; keep the averaged coverage instead.
  const bokehMaterial = bokeh.materialBokeh as THREE.ShaderMaterial;
  bokehMaterial.fragmentShader = bokehMaterial.fragmentShader.replace("gl_FragColor.a = 1.0;", "");
  bokehMaterial.needsUpdate = true;
  bokeh.enabled = false;

  const output = new OutputPass();
  const grade = new ShaderPass(GRADE);
  const smaa = new SMAAPass();

  composer.addPass(renderPass);
  composer.addPass(gtao);
  composer.addPass(bloom);
  composer.addPass(bokeh);
  composer.addPass(output);
  composer.addPass(grade);
  composer.addPass(smaa);

  return {
    render: () => composer.render(),
    setSize: (w, h) => composer.setSize(w, h),
    setPixelRatio: (r) => composer.setPixelRatio(r),
    setCinematic: (on) => {
      bokeh.enabled = on;
      grade.uniforms.vignette.value = on ? VIGNETTE_CINEMATIC : VIGNETTE_NORMAL;
    },
    setFocus: (distance) => {
      (bokeh.uniforms as Record<string, THREE.IUniform>).focus.value = distance;
    },
    setSceneBox: (box) => gtao.setSceneClipBox(box),
    dispose: () => {
      for (const pass of [renderPass, gtao, bloom, bokeh, output, grade, smaa]) pass.dispose();
      composer.dispose();
    },
  };
}

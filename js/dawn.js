// Hero morning: the field at sunrise, seen from grass height, with the gift box sitting in it.
// back  = the field running into the morning haze (drawn behind the box)
// front = the nearest blades, drawn over the bottom of the box so it sits in the grass
// The sky, sun and mist are CSS behind and between the two canvases.
import * as THREE from 'three';
import { makeGrass, toVec, fbm, rng, GLSL_NOISE } from './meadow.js';

// backlit by a low sun: dark stems, glowing tips, a warm haze where the field meets the sky
const PAL = {
  base: '#0d2214', mid: '#2f5a24', tip: '#d3e58e', tip2: '#f6dd98', dry: '#ead39b',
  ground: '#1a3315', far: '#a7b88f', haze: '#f3e6d2',
};

const GROUND_VERT = /* glsl */ `
varying vec3 vWorld;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
const GROUND_FRAG = /* glsl */ `
uniform vec3 uGround; uniform vec3 uFar; uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar;
varying vec3 vWorld;
${GLSL_NOISE}
void main(){
  float d = distance(cameraPosition, vWorld);
  vec3 col = uGround * (0.75 + 0.5 * fbm(vWorld.xz * 0.6));
  col = mix(col, uFar, smoothstep(6.0, 34.0, d));
  col = mix(col, uFog, smoothstep(uFogNear, uFogFar, d));
  gl_FragColor = vec4(col, 1.0);
}
`;

export async function createDawn({ back, front, host, reduced = false, onReady = () => {} }) {
  const lowMem = (navigator.deviceMemory || 8) <= 4 || (navigator.hardwareConcurrency || 8) <= 4;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const Q = lowMem ? { back: 14000, front: 700, dpr: 1.25, seg: 4 }
    : small ? { back: 22000, front: 800, dpr: 1.5, seg: 5 }
      : { back: 52000, front: 1100, dpr: 1.75, seg: 6 };

  const opts = { antialias: (window.devicePixelRatio || 1) < 1.5, alpha: true, powerPreference: 'high-performance' };
  const rBack = new THREE.WebGLRenderer({ canvas: back, ...opts });
  const rFront = new THREE.WebGLRenderer({ canvas: front, ...opts });
  for (const r of [rBack, rFront]) { r.outputColorSpace = THREE.LinearSRGBColorSpace; r.setClearColor(0x000000, 0); }

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 260);
  const sceneBack = new THREE.Scene();
  const sceneFront = new THREE.Scene();

  const U = {
    uTime: { value: 0 }, uWind: { value: reduced ? 0.1 : 0.34 },
    uPointer: { value: new THREE.Vector3(999, 0, 999) }, uPointerStrength: { value: 0 },
    uBladeWidth: { value: 0.045 }, uSheen: { value: 0.7 },
    uBase: { value: toVec(PAL.base) }, uMid: { value: toVec(PAL.mid) }, uTip: { value: toVec(PAL.tip) },
    uTip2: { value: toVec(PAL.tip2) }, uDry: { value: toVec(PAL.dry) }, uFog: { value: toVec(PAL.haze) },
    uGround: { value: toVec(PAL.ground) }, uFar: { value: toVec(PAL.far) },
  };
  const backU = { ...U, uFogNear: { value: 5 }, uFogFar: { value: 46 } };
  // the nearest blades are wide and never fade into the haze
  const frontU = { ...U, uBladeWidth: { value: 0.03 }, uFogNear: { value: 80 }, uFogFar: { value: 90 } };

  // the field: flat, running to the horizon, where it dissolves into the morning haze
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.ShaderMaterial({ vertexShader: GROUND_VERT, fragmentShader: GROUND_FRAG, uniforms: backU }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -440;
  sceneBack.add(ground);

  const rand = rng(29);
  // the field behind the box: denser close by, thinning towards the horizon
  sceneBack.add(await makeGrass({
    count: Q.back, rand, uniforms: backU, segments: Q.seg,
    sample: (r) => {
      const z = -(0.9 + Math.pow(r(), 1.8) * 44);
      const x = (r() * 2 - 1) * (Math.abs(z) * 0.95 + 1.6);
      return { x, y: 0, z, h: 0.8 + 0.3 * fbm(x * 0.3, z * 0.3, 2) };
    },
  }));
  // the nearest blades: tall at the sides so they frame the view, short in the middle so the box sits in them
  sceneFront.add(await makeGrass({
    count: Q.front, rand, uniforms: frontU, segments: Q.seg,
    sample: (r) => {
      const z = -(0.35 + r() * 1.25);
      const x = (r() * 2 - 1) * (Math.abs(z) * 0.95 + 0.2);
      const side = Math.min(1, Math.abs(x) / (Math.abs(z) * 0.62 + 0.08));
      // keep the middle open: fewer, shorter blades in front of the box
      if (side < 0.55 && r() < 0.55) return null;
      return { x, y: 0, z, h: 0.5 + side * side * side * 1.9 };
    },
  }));

  const state = { w: 1, h: 1, active: true, tx: 0, ty: 0, px: 0, py: 0, rise: 0 };
  const EYE = 0.62;
  function resize() {
    state.w = host.clientWidth || window.innerWidth;
    state.h = host.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, Q.dpr);
    for (const r of [rBack, rFront]) { r.setPixelRatio(dpr); r.setSize(state.w, state.h, false); }
    camera.aspect = state.w / state.h;
    // portrait screens need a wider lens to show the field
    camera.fov = camera.aspect < 1 ? 58 : 38;
    camera.updateProjectionMatrix();
    dirty = true;
  }
  let dirty = true;
  const target = new THREE.Vector3();
  function place() {
    // the horizon sits a little below the middle, where the sun rises behind the box
    const pitch = THREE.MathUtils.degToRad(camera.aspect < 1 ? 7 : 4.5);
    camera.position.set(state.px * 0.07, EYE + state.rise * 0.5 - state.py * 0.025, 0);
    target.set(0, EYE + Math.tan(pitch) * 60, -60);
    camera.lookAt(target);
  }
  resize();
  window.addEventListener('resize', resize);
  if (!reduced) {
    host.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      state.tx = (e.clientX / window.innerWidth) * 2 - 1;
      state.ty = (e.clientY / window.innerHeight) * 2 - 1;
    });
  }

  const clock = new THREE.Clock();
  let raf = 0;
  let readyCalled = false;
  function frame() {
    raf = 0;
    const dt = Math.min(0.05, clock.getDelta());
    if (!reduced) U.uTime.value = (U.uTime.value + dt) % 1800;
    state.px += (state.tx - state.px) * Math.min(1, dt * 2.5);
    state.py += (state.ty - state.py) * Math.min(1, dt * 2.5);
    place();
    rBack.render(sceneBack, camera);
    rFront.render(sceneFront, camera);
    dirty = false;
    if (!readyCalled) { readyCalled = true; onReady(); }
    if (state.active && !reduced) raf = requestAnimationFrame(frame);
  }
  frame();

  return {
    setActive(a) {
      if (a === state.active) return;
      state.active = a;
      clock.getDelta();
      if (a && !raf) raf = requestAnimationFrame(frame);
    },
    // as the hero scrolls away the view lifts a little out of the grass
    setRise(v) { state.rise = v; if (reduced && !raf) raf = requestAnimationFrame(frame); },
  };
}

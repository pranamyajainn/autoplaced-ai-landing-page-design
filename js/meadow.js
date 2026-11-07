// Real-time meadow: two WebGL layers that sandwich the HTML product window.
// back  = sky clouds, distant hills, valley floor with a footpath
// front = two grassy hills that part as the visitor scrolls
import * as THREE from 'three';

THREE.ColorManagement.enabled = false;

/* ------------------------------------------------------------------ */
/* Small JS noise so hill shapes and flower patches look natural      */
/* ------------------------------------------------------------------ */
export function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash2 = (x, y) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
export function fbm(x, y, oct = 4) {
  let v = 0, a = 0.5;
  for (let i = 0; i < oct; i++) { v += a * vnoise(x, y); x *= 2.03; y *= 2.03; a *= 0.5; }
  return v;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* ------------------------------------------------------------------ */
/* Palettes (sRGB, colour management off so values show as written)   */
/* ------------------------------------------------------------------ */
const PALETTES = {
  day: {
    base: '#0d2617', mid: '#3a6a22', tip: '#9cc356', tip2: '#bfd06a', dry: '#cdb86c',
    ground: '#21390e', far: '#638f48', fog: '#ece6c9', path: '#b9a47e', cloud: '#ffffff', cloudShade: '#c9d6e4',
    r1: '#79a062', r2: '#a1bb98', r3: '#c6d3bf', treeDark: '#173a22', treeLit: '#5f9238',
  },
  golden: {
    base: '#142310', mid: '#4a6a1c', tip: '#d9c45c', tip2: '#ecb05a', dry: '#f0c27a',
    ground: '#1c2a0c', far: '#7d8a4a', fog: '#f7d6ab', path: '#c99a6a', cloud: '#fff1df', cloudShade: '#eaa98c',
    r1: '#8f9a5c', r2: '#c2a27a', r3: '#e2b999', treeDark: '#1b3418', treeLit: '#7f8f2c',
  },
};
export const toVec = (hex) => { const c = new THREE.Color(hex); return new THREE.Vector3(c.r, c.g, c.b); };

/* ------------------------------------------------------------------ */
/* Shared GLSL                                                         */
/* ------------------------------------------------------------------ */
export const GLSL_NOISE = /* glsl */ `
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i=0;i<4;i++){ v += a*noise(p); p *= 2.03; a *= 0.5; } return v; }
float fbm2(vec2 p){ return 0.62 * noise(p) + 0.38 * noise(p * 2.03 + 17.0); }
`;

const GLSL_WIND = /* glsl */ `
uniform float uTime;
uniform float uWind;
uniform vec3 uPointer;
uniform float uPointerStrength;
// xy = tip offset in world xz, z = gust amount (for the travelling sheen)
vec3 wind(vec3 base){
  vec2 p = base.xz;
  float gust = fbm2(p*0.13 + vec2(uTime*0.45, uTime*0.16));
  float ripple = noise(p*0.85 + vec2(uTime*1.7, -uTime*0.6));
  float w = (gust*1.3 - 0.5 + ripple*0.3) * uWind;
  vec2 off = normalize(vec2(1.0, -0.28)) * w;
  vec2 d = p - uPointer.xz;
  float dist = length(d) + 0.0001;
  float push = (1.0 - smoothstep(0.0, 1.5, dist)) * uPointerStrength;
  off += (d / dist) * push * 1.05;
  return vec3(off, gust);
}
`;

const BLADE_VERT = /* glsl */ `
attribute vec3 aOffset;
attribute vec4 aParams; // height, angle, variation, curve
uniform float uBladeWidth;
varying float vH;
varying float vVar;
varying float vGust;
varying vec3 vWorld;
varying vec4 vPatch; // tip blend, brightness, dry amount, cloud shadow
${GLSL_NOISE}
${GLSL_WIND}
void main(){
  float h = position.y;
  float height = aParams.x;
  vec3 baseWorld = (modelMatrix * vec4(aOffset, 1.0)).xyz;
  float camDist = distance(cameraPosition, baseWorld);
  float taper = 1.0 - pow(h, 1.35);
  float c = cos(aParams.y), s = sin(aParams.y);
  vec3 p = vec3(c * position.x, 0.0, -s * position.x) * uBladeWidth * taper * (1.0 + camDist * 0.03);
  vec3 w = wind(baseWorld);
  vec2 bend = vec2(s, c) * aParams.w + w.xy;
  float k = h * h;
  float bl = min(dot(bend, bend), 1.4);
  p.y += h * height * (1.0 - 0.3 * bl * k);
  p.xz += bend * k * height;
  vec4 world = modelMatrix * vec4(aOffset + p, 1.0);
  vWorld = world.xyz;
  vH = h; vVar = aParams.z; vGust = w.z;
  vec2 b = baseWorld.xz;
  vPatch = vec4(
    smoothstep(0.42, 0.78, fbm2(b * 0.2 + 7.0)),
    0.9 + 0.2 * fbm2(b * 0.09 + 3.0),
    smoothstep(0.58, 0.74, fbm2(b * 0.11 - 5.0)),
    smoothstep(0.5, 0.7, fbm2(b * 0.05 + vec2(uTime * 0.014, uTime * 0.007)))
  );
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const BLADE_FRAG = /* glsl */ `
uniform vec3 uBase; uniform vec3 uMid; uniform vec3 uTip; uniform vec3 uTip2; uniform vec3 uDry; uniform vec3 uFog;
uniform float uFogNear; uniform float uFogFar; uniform float uSheen;
varying float vH; varying float vVar; varying float vGust; varying vec3 vWorld; varying vec4 vPatch;
void main(){
  vec3 col = mix(uBase, uMid, smoothstep(0.0, 0.55, vH));
  vec3 tip = mix(uTip, uTip2, vPatch.x);
  col = mix(col, tip, smoothstep(0.42, 1.0, vH));
  col *= (0.86 + vVar * 0.28) * vPatch.y;
  col = mix(col, uDry * (0.82 + 0.3 * vVar), max(step(0.93, vVar), vPatch.z * 0.55) * smoothstep(0.25, 1.0, vH));
  col += vec3(0.13, 0.13, 0.05) * smoothstep(0.5, 0.85, vGust) * vH * uSheen;
  col *= mix(0.4, 1.0, smoothstep(0.0, 0.6, vH));
  col *= mix(1.0, 0.74, vPatch.w);
  float d = distance(cameraPosition, vWorld);
  col = mix(col, uFog, smoothstep(uFogNear, uFogFar, d));
  gl_FragColor = vec4(col, 1.0);
}
`;

const GROUND_VERT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormalW;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const GROUND_FRAG = /* glsl */ `
uniform vec3 uGround; uniform vec3 uFar; uniform vec3 uFog; uniform vec3 uPath;
uniform float uFogNear; uniform float uFogFar; uniform float uTime; uniform float uHasPath;
varying vec3 vWorld; varying vec3 vNormalW;
${GLSL_NOISE}
void main(){
  float n = fbm(vWorld.xz * 0.7);
  vec3 col = uGround * (0.8 + 0.4 * n);
  // far terrain is lighter and bluer so it reads as distance
  float farT = smoothstep(14.0, 70.0, distance(cameraPosition, vWorld));
  col = mix(col, uFar * (0.88 + 0.24 * fbm(vWorld.xz * 0.05)), farT);
  float light = clamp(dot(normalize(vNormalW), normalize(vec3(0.45, 0.85, 0.3))), 0.0, 1.0);
  col *= 0.72 + 0.38 * light;
  if (uHasPath > 0.5) {
    float px = sin(vWorld.z * 0.16) * 1.4 + sin(vWorld.z * 0.05) * 1.2;
    float edge = 0.45 + 0.08 * noise(vWorld.xz * 3.0);
    float onPath = (1.0 - smoothstep(edge - 0.18, edge, abs(vWorld.x - px))) * smoothstep(-40.0, -26.0, vWorld.z);
    col = mix(col, uPath * (0.85 + 0.3 * n), onPath);
  }
  float cs = fbm(vWorld.xz * 0.05 + vec2(uTime * 0.014, uTime * 0.007));
  col *= mix(1.0, 0.8, smoothstep(0.5, 0.7, cs) * (1.0 - farT));
  float d = distance(cameraPosition, vWorld);
  col = mix(col, uFog, smoothstep(uFogNear, uFogFar, d));
  gl_FragColor = vec4(col, 1.0);
}
`;

const FLOWER_VERT = /* glsl */ `
attribute vec3 aColor;
attribute vec2 aSize; // world size, stem height
uniform float uScale;
uniform float uFogNear; uniform float uFogFar;
varying vec3 vColor;
varying float vFog;
${GLSL_NOISE}
${GLSL_WIND}
void main(){
  vec3 baseWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  vec3 w = wind(baseWorld);
  float bl = min(dot(w.xy, w.xy), 1.2);
  vec3 p = position + vec3(w.x * aSize.y, aSize.y * (1.0 - 0.3 * bl), w.y * aSize.y);
  vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize.x * uScale / -mv.z;
  vColor = aColor;
  vFog = smoothstep(uFogNear, uFogFar, length(mv.xyz));
}
`;

const FLOWER_FRAG = /* glsl */ `
uniform vec3 uFog;
varying vec3 vColor;
varying float vFog;
void main(){
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  float petal = 0.6 + 0.32 * cos(a * 5.0);
  if (r > petal) discard;
  vec3 col = vColor * (0.82 + 0.25 * (1.0 - r / petal));
  col = mix(col, vec3(0.97, 0.76, 0.24), 1.0 - smoothstep(0.14, 0.26, r));
  col = mix(col, uFog, vFog);
  gl_FragColor = vec4(col, 1.0);
}
`;

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */
function bladeGeometry(segments) {
  const pos = [];
  const idx = [];
  for (let i = 0; i < segments; i++) {
    const y = i / segments;
    pos.push(-0.5, y, 0, 0.5, y, 0);
  }
  pos.push(0, 1, 0);
  for (let i = 0; i < segments - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const last = (segments - 1) * 2;
  idx.push(last, last + 1, segments * 2);
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

const FLOWER_COLORS = ['#fffdf6', '#fffdf6', '#fffaf0', '#f2b542', '#f6c454'];

const slice = () => new Promise((r) => setTimeout(r, 0));
export async function makeGrass({ count, sample, uniforms, rand, segments = 6 }) {
  const geo = bladeGeometry(segments);
  const offsets = new Float32Array(count * 3);
  const params = new Float32Array(count * 4);
  const pts = [];
  let guard = 0;
  while (pts.length < count && guard < count * 6) {
    guard++;
    const s = sample(rand);
    if (s) pts.push(s);
    if ((guard & 4095) === 0) await slice();
  }
  await slice();
  pts.sort((a, b) => b.z - a.z);
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    if ((i & 8191) === 8191) await slice();
    const s = pts[i];
    offsets[i * 3] = s.x; offsets[i * 3 + 1] = s.y - 0.02; offsets[i * 3 + 2] = s.z;
    const clump = fbm(s.x * 0.9 + 11, s.z * 0.9 - 3, 2);
    params[i * 4] = (s.h ?? 1) * (0.2 + rand() * 0.22 + clump * 0.24);
    params[i * 4 + 1] = rand() * Math.PI * 2;
    params[i * 4 + 2] = rand();
    params[i * 4 + 3] = 0.08 + rand() * 0.3;
  }
  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
  geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));
  geo.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    vertexShader: BLADE_VERT, fragmentShader: BLADE_FRAG, uniforms, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

// joins many small meshes into one geometry so the GPU draws them in a single call
function mergeParts(parts) {
  let verts = 0;
  let inds = 0;
  for (const g of parts) { verts += g.attributes.position.count; inds += g.index.count; }
  const pos = new Float32Array(verts * 3);
  const nor = new Float32Array(verts * 3);
  const idx = new Uint32Array(inds);
  let vo = 0;
  let io = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, vo * 3);
    nor.set(g.attributes.normal.array, vo * 3);
    const ix = g.index.array;
    for (let k = 0; k < ix.length; k++) idx[io + k] = ix[k] + vo;
    vo += g.attributes.position.count;
    io += ix.length;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

function makeFlowers({ count, sample, uniforms, rand }) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count * 2);
  let n = 0, guard = 0;
  while (n < count && guard < count * 12) {
    guard++;
    const s = sample(rand);
    if (!s) continue;
    const patch = fbm(s.x * 0.35 + 40, s.z * 0.35 + 9, 3);
    if (rand() > smooth(0.52, 0.7, patch)) continue;
    pos[n * 3] = s.x; pos[n * 3 + 1] = s.y; pos[n * 3 + 2] = s.z;
    const c = new THREE.Color(FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)]);
    col[n * 3] = c.r; col[n * 3 + 1] = c.g; col[n * 3 + 2] = c.b;
    size[n * 2] = 0.07 + rand() * 0.07;
    size[n * 2 + 1] = 0.26 + rand() * 0.24;
    n++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, n * 3), 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col.subarray(0, n * 3), 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size.subarray(0, n * 2), 2));
  const mat = new THREE.ShaderMaterial({ vertexShader: FLOWER_VERT, fragmentShader: FLOWER_FRAG, uniforms });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

/* Elliptical dome built on a polar grid so nothing renders outside the hill */
function hillHeight(x, z, cfg) {
  const d2 = (x / cfg.rx) ** 2 + (z / cfg.rz) ** 2;
  if (d2 >= 1) return 0;
  const f = (1 - d2) ** 1.6;
  const bumps = (fbm(x * 0.35 + cfg.seed, z * 0.35, 3) - 0.5) * 0.55;
  // crest pushed towards the outer side so the inner slope is long and soft
  const lean = 1 + cfg.lean * (x / cfg.rx);
  return Math.max(0, cfg.h * f * lean + bumps * f);
}

function hillGround(cfg, uniforms) {
  const rings = 56, segs = 120;
  const pos = [];
  const idx = [];
  pos.push(0, hillHeight(0, 0, cfg), 0);
  for (let r = 1; r <= rings; r++) {
    const t = r / rings;
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      const x = Math.cos(a) * cfg.rx * t;
      const z = Math.sin(a) * cfg.rz * t;
      pos.push(x, hillHeight(x, z, cfg) - (r === rings ? 0.08 : 0), z);
    }
  }
  for (let s = 0; s < segs; s++) idx.push(0, 1 + ((s + 1) % segs), 1 + s);
  for (let r = 1; r < rings; r++) {
    const a0 = 1 + (r - 1) * segs, a1 = 1 + r * segs;
    for (let s = 0; s < segs; s++) {
      const s1 = (s + 1) % segs;
      idx.push(a0 + s, a0 + s1, a1 + s, a0 + s1, a1 + s1, a1 + s);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: GROUND_VERT, fragmentShader: GROUND_FRAG, uniforms }));
}

/* Back terrain: flat valley close by, rolling hills mid-distance, soft ridges far away */
const pathX = (z) => Math.sin(z * 0.16) * 1.4 + Math.sin(z * 0.05) * 1.2;
function backHeight(x, z) {
  const mid = smooth(-8, -34, z);
  const far = smooth(-96, -122, z);
  let h = 0;
  h += (fbm(x * 0.045 + 3, z * 0.045, 4) - 0.35) * 7 * mid;
  h += Math.abs(x) * 0.06 * mid;
  h *= 1 - far;
  h += (fbm(x * 0.3, z * 0.3, 2) - 0.5) * 0.25;
  // keep the path in a gentle trough
  const dp = Math.abs(x - pathX(z));
  h -= (1 - smooth(0, 2.2, dp)) * 0.12 * (1 - mid);
  return h;
}

function cloudTexture(seed) {
  const W = 384, H = 192;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const rand = rng(seed);
  const ox = rand() * 100, oy = rand() * 100;
  const n = 3 + Math.floor(rand() * 3);
  const lobes = [];
  for (let i = 0; i < n; i++) {
    lobes.push({ x: 0.3 + 0.4 * (i / (n - 1)) + (rand() - 0.5) * 0.06, r: 0.1 + rand() * 0.09, h: 0.3 + rand() * 0.36 });
  }
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      let env = 0;
      for (const L of lobes) {
        const dx = (u - L.x) / L.r;
        const dy = (v - (0.74 - L.h * 0.45)) / (L.h * 0.62);
        env = Math.max(env, 1 - (dx * dx + dy * dy));
      }
      env *= (1 - smooth(0.7, 0.84, v)) * smooth(0.0, 0.14, u) * (1 - smooth(0.86, 1.0, u)) * smooth(0.0, 0.1, v);
      const nz = fbm(u * 7 + ox, v * 3.5 + oy, 5);
      const a = smooth(0.12, 0.5, env * 1.2 + (nz - 0.5) * 0.85);
      const lit = Math.min(1, 0.62 + (1 - v) * 0.42 + (nz - 0.5) * 0.3) * (1 - smooth(0.5, 0.82, v) * 0.42);
      const i4 = (y * W + x) * 4;
      const val = Math.round(255 * Math.max(0, lit));
      img.data[i4] = val; img.data[i4 + 1] = val; img.data[i4 + 2] = val;
      img.data[i4 + 3] = Math.round(255 * a * 0.92);
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

const CLOUD_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const CLOUD_FRAG = /* glsl */ `
uniform sampler2D uMap; uniform vec3 uLit; uniform vec3 uShade; uniform float uOpacity;
varying vec2 vUv;
void main(){
  vec4 t = texture2D(uMap, vUv);
  vec3 col = mix(uShade, uLit, t.r);
  gl_FragColor = vec4(col, t.a * uOpacity);
}
`;

/* ------------------------------------------------------------------ */
/* Public factory                                                      */
/* ------------------------------------------------------------------ */
// Builds in small steps and hands control back to the browser between them, so the page
// stays responsive while the meadow is being made. Resolves once the first frame is drawn.
export async function createMeadow({ back, front, reduced = false, onLost = () => {}, onReady = () => {} }) {
  const breathe = () => new Promise((r) => setTimeout(r, 0));
  const lowMem = (navigator.deviceMemory || 8) <= 4 || (navigator.hardwareConcurrency || 8) <= 4;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const Q = lowMem
    ? { hill: 11000, back: 7500, flowersHill: 180, flowersBack: 140, dpr: 1.25, seg: 4 }
    : small
      ? { hill: 18000, back: 12000, flowersHill: 260, flowersBack: 200, dpr: 1.5, seg: 5 }
      : { hill: 62000, back: 46000, flowersHill: 650, flowersBack: 560, dpr: 1.75, seg: 6 };

  const opts = { antialias: (window.devicePixelRatio || 1) < 1.5, alpha: true, powerPreference: 'high-performance' };
  const rBack = new THREE.WebGLRenderer({ canvas: back, ...opts });
  const rFront = new THREE.WebGLRenderer({ canvas: front, ...opts });
  for (const r of [rBack, rFront]) {
    r.outputColorSpace = THREE.LinearSRGBColorSpace;
    r.setClearColor(0x000000, 0);
  }

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 420);
  const sceneBack = new THREE.Scene();
  const sceneFront = new THREE.Scene();

  const pal = PALETTES.day;
  const U = {
    uTime: { value: 0 }, uWind: { value: reduced ? 0.15 : 0.62 },
    uPointer: { value: new THREE.Vector3(999, 0, 999) }, uPointerStrength: { value: 0 },
    uBladeWidth: { value: 0.05 }, uSheen: { value: 1 },
    uBase: { value: toVec(pal.base) }, uMid: { value: toVec(pal.mid) }, uTip: { value: toVec(pal.tip) },
    uTip2: { value: toVec(pal.tip2) }, uDry: { value: toVec(pal.dry) }, uFog: { value: toVec(pal.fog) },
    uGround: { value: toVec(pal.ground) }, uFar: { value: toVec(pal.far) }, uPath: { value: toVec(pal.path) },
    uScale: { value: 600 },
    uR1: { value: toVec(pal.r1) }, uR2: { value: toVec(pal.r2) }, uR3: { value: toVec(pal.r3) },
    uTreeDark: { value: toVec(pal.treeDark) }, uTreeLit: { value: toVec(pal.treeLit) },
    uCloud: { value: toVec(pal.cloud) }, uCloudShade: { value: toVec(pal.cloudShade) },
  };
  // each layer gets its own fog distances but shares colours and time
  const layerUniforms = (near, far, extra = {}) => ({
    ...U, uFogNear: { value: near }, uFogFar: { value: far }, uHasPath: { value: 0 }, ...extra,
  });
  const frontU = layerUniforms(16, 60);
  const backU = layerUniforms(34, 210, { uHasPath: { value: 1 } });

  /* ---------- front hills ---------- */
  const hillCfgs = [
    { side: -1, cx: -5.7, cz: 4.6, rx: 5.6, rz: 4.4, h: 2.15, lean: -0.22, seed: 3 },
    { side: 1, cx: 6.0, cz: 4.2, rx: 6.0, rz: 4.6, h: 2.45, lean: 0.24, seed: 17 },
  ];
  const hills = [];
  for (let i = 0; i < hillCfgs.length; i++) {
    const cfg = hillCfgs[i];
    await breathe();
    const group = new THREE.Group();
    group.position.set(cfg.cx, 0, cfg.cz);
    const rand = rng(100 + i * 31);
    const ground = hillGround(cfg, frontU);
    group.add(ground);
    const sample = (r) => {
      const x = (r() * 2 - 1) * cfg.rx, z = (r() * 2 - 1) * cfg.rz;
      const d2 = (x / cfg.rx) ** 2 + (z / cfg.rz) ** 2;
      if (d2 > 0.985) return null;
      return { x, y: hillHeight(x, z, cfg), z, h: 0.85 + (1 - d2) * 0.4 };
    };
    group.add(await makeGrass({ count: Q.hill, sample, uniforms: frontU, rand, segments: Q.seg }));
    group.add(makeFlowers({ count: Q.flowersHill, sample, uniforms: frontU, rand }));
    sceneFront.add(group);
    hills.push({ cfg, group, ground, base: new THREE.Vector3(cfg.cx, 0, cfg.cz) });
  }

  /* ---------- back terrain ---------- */
  await breathe();
  {
    const W = 260, D = 240;
    const geo = new THREE.PlaneGeometry(W, D, 220, 200);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -D / 2 + 12);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, backHeight(p.getX(i), p.getZ(i)));
    geo.computeVertexNormals();
    sceneBack.add(new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: GROUND_VERT, fragmentShader: GROUND_FRAG, uniforms: backU })));

    const rand = rng(7);
    const sample = (r) => {
      const z = 6 - r() * 30;
      const spread = 7 + (6 - z) * 0.55;
      const x = (r() * 2 - 1) * spread;
      if (Math.abs(x - pathX(z)) < 0.62 + r() * 0.15) return null;
      return { x, y: backHeight(x, z), z, h: 1 };
    };
    sceneBack.add(await makeGrass({ count: Q.back, sample, uniforms: backU, rand, segments: Q.seg }));
    sceneBack.add(makeFlowers({ count: Q.flowersBack, sample, uniforms: backU, rand }));
    await breathe();

    // soft tree clumps on the middle hills give the valley scale
    const blob = new THREE.SphereGeometry(1, 36, 24);
    {
      const bp = blob.attributes.position;
      for (let i = 0; i < bp.count; i++) {
        const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
        const k = 0.82 + fbm(x * 2.1 + 5, y * 2.1 + z * 1.3, 3) * 0.4;
        bp.setXYZ(i, x * k, y * k, z * k);
      }
      blob.computeVertexNormals();
    }
    const treeMat = new THREE.ShaderMaterial({
      vertexShader: GROUND_VERT,
      fragmentShader: /* glsl */ `
        uniform vec3 uTreeDark; uniform vec3 uTreeLit; uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar;
        varying vec3 vWorld; varying vec3 vNormalW;
        ${GLSL_NOISE}
        void main(){
          vec3 n = normalize(vNormalW);
          float l = clamp(dot(n, normalize(vec3(0.45, 0.85, 0.35))), 0.0, 1.0);
          float leaf = noise(vWorld.xz * 3.0 + vWorld.y * 2.0);
          vec3 col = mix(uTreeDark, uTreeLit, l * 0.85 + leaf * 0.15);
          col *= 0.8 + 0.2 * smoothstep(-1.0, 1.0, n.y);
          col = mix(col, uFog, smoothstep(uFogNear, uFogFar, distance(cameraPosition, vWorld)));
          gl_FragColor = vec4(col, 1.0);
        }`,
      uniforms: backU,
    });
    const tr = rng(91);
    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.09, 1, 6);
    const trunkMat = new THREE.ShaderMaterial({
      vertexShader: GROUND_VERT,
      fragmentShader: /* glsl */ `uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar; varying vec3 vWorld; varying vec3 vNormalW;
        void main(){ vec3 col = vec3(0.23, 0.18, 0.12); col = mix(col, uFog, smoothstep(uFogNear, uFogFar, distance(cameraPosition, vWorld))); gl_FragColor = vec4(col, 1.0); }`,
      uniforms: backU,
    });
    const canopies = [];
    const trunks = [];
    const dummy = new THREE.Object3D();
    const place = (list, geo, x, y, z, sx, sy, sz) => {
      dummy.position.set(x, y, z);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      list.push(geo.clone().applyMatrix4(dummy.matrix));
    };
    for (let i = 0; i < 34; i++) {
      const z = -24 - tr() * 64;
      const x = (tr() * 2 - 1) * (16 + (-z) * 0.6);
      if (Math.abs(x) < 7) continue;
      const s = 0.6 + tr() * 0.8;
      const gy = backHeight(x, z) - 0.1;
      place(trunks, trunkGeo, x, gy + s * 0.6, z, s, s * 1.2, s);
      const parts = 5 + Math.floor(tr() * 3);
      for (let k = 0; k < parts; k++) {
        const r = s * (0.42 + tr() * 0.22);
        const sy = r * (0.9 + tr() * 0.25);
        const ang = tr() * Math.PI * 2;
        const rad = k === 0 ? 0 : s * (0.35 + tr() * 0.3);
        const py = s * 1.35 + (k === 0 ? s * 0.35 : tr() * s * 0.45);
        place(canopies, blob, x + Math.cos(ang) * rad, gy + py, z + Math.sin(ang) * rad * 0.7, r, sy, r);
      }
    }
    sceneBack.add(new THREE.Mesh(mergeParts(canopies), treeMat), new THREE.Mesh(mergeParts(trunks), trunkMat));

    // layered far ridges: each one lighter and bluer, like real air between hills
    const ridges = [
      { z: -228, base: 16, amp: 15, freq: 0.011, seed: 4.2, u: 'uR3' },
      { z: -172, base: 10, amp: 10, freq: 0.019, seed: 9.7, u: 'uR2' },
      { z: -124, base: 4.5, amp: 7, freq: 0.028, seed: 1.3, u: 'uR1' },
    ];
    for (const r of ridges) {
      const shape = new THREE.Shape();
      const width = 760, N = 220;
      shape.moveTo(-width / 2, r.base - 80);
      for (let i = 0; i <= N; i++) {
        const x = -width / 2 + (width * i) / N;
        shape.lineTo(x, r.base + r.amp * (fbm(x * r.freq + r.seed, r.seed * 1.7, 4) - 0.35) * 1.6);
      }
      shape.lineTo(width / 2, r.base - 80);
      const mat = new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `varying float vY; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform vec3 uFog; uniform float uTop; uniform float uBot;
          varying float vY;
          void main(){
            vec3 col = mix(uColor, uFog, smoothstep(uTop, uBot, vY) * 0.6);
            gl_FragColor = vec4(col, 1.0);
          }`,
        uniforms: { uColor: U[r.u], uFog: U.uFog, uTop: { value: r.base + r.amp * 0.8 }, uBot: { value: r.base - 18 } },
      });
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
      mesh.position.z = r.z;
      sceneBack.add(mesh);
    }
  }

  /* ---------- clouds ---------- */
  await breathe();
  const clouds = [];
  {
    const texes = [];
    for (const seed of [4, 19, 33]) { texes.push(cloudTexture(seed)); await breathe(); }
    // few, large, high: the band behind the headline stays clear
    const spots = [
      [-92, 70, -250, 96], [64, 86, -270, 110], [168, 52, -240, 84], [-196, 44, -250, 90],
    ];
    spots.forEach(([x, y, z, w], i) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: CLOUD_VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthWrite: false,
        uniforms: { uMap: { value: texes[i % texes.length] }, uLit: U.uCloud, uShade: U.uCloudShade, uOpacity: { value: 0.95 } },
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.5), mat);
      m.position.set(x, y, z);
      m.renderOrder = -1;
      sceneBack.add(m);
      clouds.push({ m, x0: x, speed: 0.18 + (i % 3) * 0.07 });
    });
  }

  /* ---------- state ---------- */
  let qualityScale = 1;
  const state = { progress: 0, mood: 0, moodTarget: 0, active: true, w: 1, h: 1, portrait: false, pointerX: 0, pointerY: 0, px: 0, py: 0 };
  const layout = {};
  // the bot sits on the left hill: found by casting a ray from this screen point onto the hill
  const anchor = { local: new THREE.Vector3(), ndc: new THREE.Vector2(-0.72, -0.44), ok: false, d0: 1 };

  function applyLayout() {
    const aspect = state.w / state.h;
    state.portrait = aspect < 0.9;
    if (state.portrait) {
      Object.assign(layout, { camZ0: 17, camZ1: 6.2, camY0: 2.3, camY1: 1.75, lookY0: 6.8, lookY1: 2.9, spread: 2.2, fov: 52 });
      hills[0].base.set(-5.9, 0, 4.9); hills[1].base.set(6.0, 0, 4.4);
      anchor.ndc.set(-0.58, -0.5);
    } else if (aspect < 1.35) {
      Object.assign(layout, { camZ0: 16.5, camZ1: 4.6, camY0: 2.0, camY1: 1.65, lookY0: 4.6, lookY1: 2.4, spread: 2.4, fov: 38 });
      hills[0].base.set(-5.2, 0, 4.6); hills[1].base.set(5.5, 0, 4.2);
      anchor.ndc.set(-0.7, -0.48);
    } else {
      Object.assign(layout, { camZ0: 16, camZ1: 4.2, camY0: 1.95, camY1: 1.6, lookY0: 5.0, lookY1: 2.35, spread: 2.6, fov: 30 });
      hills[0].base.set(-6.7, 0, 4.6); hills[1].base.set(7.0, 0, 4.2);
      anchor.ndc.set(-0.72, -0.44);
    }
    hills.forEach((h) => h.group.scale.setScalar(state.portrait ? 0.82 : 1));
    camera.fov = layout.fov;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    // two full-screen layers: cap the pixel count so 4K screens stay smooth
    const dpr = Math.max(0.5, Math.min(window.devicePixelRatio || 1, Q.dpr, Math.sqrt(2.6e6 / (state.w * state.h))) * qualityScale);
    for (const r of [rBack, rFront]) { r.setPixelRatio(dpr); r.setSize(state.w, state.h, false); }
    const scale = (state.h * dpr) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    U.uScale.value = scale;
    placeScene(0);
    sceneFront.updateMatrixWorld(true);
    const rc = new THREE.Raycaster();
    const probe = anchor.ndc.clone();
    let hit = null;
    // walk down from the target point until the ray lands on the hill
    for (let i = 0; i < 24 && !hit; i++) {
      rc.setFromCamera(probe, camera);
      hit = rc.intersectObject(hills[0].ground, false)[0] || null;
      probe.y -= 0.03;
    }
    anchor.ok = !!hit;
    if (hit) {
      anchor.local.copy(hills[0].group.worldToLocal(hit.point.clone()));
      anchor.d0 = hit.distance;
    }
    placeScene(state.progress);
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function placeScene(p) {
    const e = ease(p);
    camera.position.set(
      state.px * 0.18,
      layout.camY0 + (layout.camY1 - layout.camY0) * e + state.py * 0.08,
      layout.camZ0 + (layout.camZ1 - layout.camZ0) * e,
    );
    camera.lookAt(state.px * 0.08, layout.lookY0 + (layout.lookY1 - layout.lookY0) * e, -10);
    camera.updateMatrixWorld();
    hills.forEach(({ cfg, group, base }) => {
      group.position.set(base.x + cfg.side * layout.spread * e, base.y - e * 0.35, base.z);
    });
  }

  const tmp = new THREE.Vector3();
  const anchorOut = { x: 0, y: 0, scale: 1, ok: false };
  function readAnchor() {
    anchorOut.ok = anchor.ok;
    if (!anchor.ok) return anchorOut;
    hills[0].group.updateMatrixWorld();
    tmp.copy(anchor.local);
    hills[0].group.localToWorld(tmp);
    const d = tmp.distanceTo(camera.position);
    tmp.project(camera);
    anchorOut.x = (tmp.x * 0.5 + 0.5) * state.w;
    anchorOut.y = (-tmp.y * 0.5 + 0.5) * state.h;
    anchorOut.scale = anchor.d0 / d;
    return anchorOut;
  }

  function resize() {
    const w = front.clientWidth || window.innerWidth;
    const h = front.clientHeight || window.innerHeight;
    if (w === state.w && h === state.h) return;
    state.w = w; state.h = h;
    applyLayout();
    dirty = true;
  }

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let pointerDirty = false;
  function onPointer(e) {
    state.pointerX = (e.clientX / state.w) * 2 - 1;
    state.pointerY = -(e.clientY / state.h) * 2 + 1;
    pointerDirty = true;
  }
  if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true });

  const lerpVec = (out, a, b, t) => out.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
  const palVec = { day: {}, golden: {} };
  for (const k of ['day', 'golden']) for (const key in PALETTES[k]) palVec[k][key] = toVec(PALETTES[k][key]);
  const MOOD_KEYS = {
    uBase: 'base', uMid: 'mid', uTip: 'tip', uTip2: 'tip2', uDry: 'dry', uFog: 'fog', uGround: 'ground', uFar: 'far',
    uPath: 'path', uR1: 'r1', uR2: 'r2', uR3: 'r3', uTreeDark: 'treeDark', uTreeLit: 'treeLit', uCloud: 'cloud', uCloudShade: 'cloudShade',
  };
  function applyMood(m) {
    for (const [u, k] of Object.entries(MOOD_KEYS)) lerpVec(U[u].value, palVec.day[k], palVec.golden[k], m);
  }

  const clock = new THREE.Clock();
  let last = 0;
  function render() {
    const now = clock.getElapsedTime();
    const dt = Math.min(0.05, now - last);
    last = now;
    if (!reduced) U.uTime.value = (U.uTime.value + dt) % 1800;

    if (Math.abs(state.mood - state.moodTarget) > 0.001) {
      state.mood += (state.moodTarget - state.mood) * Math.min(1, dt * 3);
      applyMood(state.mood);
    }

    state.px += (state.pointerX - state.px) * Math.min(1, dt * 2.5);
    state.py += (state.pointerY - state.py) * Math.min(1, dt * 2.5);

    placeScene(state.progress);

    for (const c of clouds) {
      c.m.position.x = c.x0 + ((U.uTime.value * c.speed + 200) % 400) - 200;
      // clouds thin out as they drift behind the headline
      c.m.material.uniforms.uOpacity.value = 0.95 * Math.min(1, Math.max(0, (Math.abs(c.m.position.x) - 40) / 45));
      c.m.quaternion.copy(camera.quaternion);
    }

    if (pointerDirty && !state.portrait) {
      pointerDirty = false;
      ndc.set(state.pointerX, state.pointerY);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(hills.map((h) => h.ground), false)[0];
      if (hit) {
        U.uPointer.value.copy(hit.point);
        U.uPointerStrength.value = Math.min(1, U.uPointerStrength.value + 0.25);
      }
    }
    U.uPointerStrength.value *= 0.965;

    rBack.render(sceneBack, camera);
    rFront.render(sceneFront, camera);
  }

  let raf = 0;
  let dirty = true;
  let lost = false;
  // Adaptive resolution: if this device can't hold ~50 fps, draw fewer pixels until it can.
  let frameSum = 0;
  let frameCount = 0;
  let lastT = 0;
  let calm = 0;
  function adapt(t) {
    if (lastT) {
      const ms = t - lastT;
      if (ms < 100) { frameSum += ms; frameCount++; }
    }
    lastT = t;
    if (frameCount < 40) return;
    const avg = frameSum / frameCount;
    frameSum = 0;
    frameCount = 0;
    if (avg > 20 && qualityScale > 0.55) {
      qualityScale = Math.max(0.55, qualityScale - 0.15);
      calm = 0;
      applyLayout();
    } else if (avg < 14 && qualityScale < 1 && ++calm > 5) {
      qualityScale = Math.min(1, qualityScale + 0.1);
      calm = 0;
      applyLayout();
    }
  }
  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (!state.active || lost) { lastT = 0; return; }
    if (reduced && !dirty) return;
    dirty = false;
    render();
    if (!reduced) adapt(t);
  }
  for (const c of [back, front]) {
    c.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; onLost(true); });
    c.addEventListener('webglcontextrestored', () => { lost = false; dirty = true; onLost(false); });
  }

  resize();
  applyMood(0);
  window.addEventListener('resize', resize);
  placeScene(state.progress);
  // prepare the shaders without freezing the page, then draw the first frame
  await breathe();
  try { await Promise.all([rBack.compileAsync(sceneBack, camera), rFront.compileAsync(sceneFront, camera)]); } catch { /* older browsers compile on first draw */ }
  render();
  requestAnimationFrame(() => onReady());
  raf = requestAnimationFrame(loop);

  return {
    setProgress(p) {
      const v = Math.min(1, Math.max(0, p));
      if (v !== state.progress) { state.progress = v; dirty = true; }
    },
    setMood(m, instant = false) {
      state.moodTarget = m;
      if (instant) { state.mood = m; applyMood(m); }
      dirty = true;
    },
    setActive(a) { if (a && !state.active) { clock.getDelta(); } state.active = a; },
    renderOnce: render,
    anchor: readAnchor,
    quality: small ? 'low' : 'high',
    destroy() { cancelAnimationFrame(raf); rBack.dispose(); rFront.dispose(); },
  };
}

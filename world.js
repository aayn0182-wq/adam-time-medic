// World construction for ADAM: TIME MEDIC (adapted from threejs_test/scene.js)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export const P = { paramedicRed: '#C8402E', navy: '#1F2A44', cyan: '#00E5FF', terracotta: '#B5562A', ashSky: '#3A2E2A', lava: '#E8893A', skin: '#C98B62', ochre: '#C9933F', plaster: '#D8B48A', stone: '#6E6258' };
export const scene = new THREE.Scene();
const C = { seed: 7 };
// ---------- deterministic rng ----------
let _s = C.seed >>> 0;
function rnd() { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
export const R = (a, b) => a + (b - a) * rnd();
export const col = h => new THREE.Color(h);
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
// ---------- graphics quality & CC0 PBR textures (ambientCG) ----------
const _mob = /[?&]touch=1/.test(location.search) || matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
export const GFX = (() => { const q = new URLSearchParams(location.search).get('gfx') || localStorage.getItem('adam_gfx'); return ['low', 'medium', 'high'].includes(q) ? q : (_mob ? 'low' : 'high'); })();
export const ANISO = { v: GFX === 'low' ? 2 : 8 };
const _tl = new THREE.TextureLoader(), _tc = {}, _allTex = [];
export function setAniso(a) { ANISO.v = a; _allTex.forEach(t => { t.anisotropy = a; t.needsUpdate = true; }); }
export function ptex(name, rep, normal = false) { // rep = metres per tile
  const key = name + (normal ? '_n' : GFX === 'low' ? '_lo' : '');
  const t = _tl.load('textures/' + key + '.jpg'); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / rep, 1 / rep);
  if (!normal) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO.v; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; _allTex.push(t); return t;
}
// PBR-ish world material (UVs are in metres, see boxUV); tint keeps the warm sunny palette
export function pmat(name, tint, rep = 2, o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: col(tint), map: ptex(name, rep), roughness: o.rough ?? 0.85, metalness: 0, side: o.side ?? THREE.FrontSide, envMapIntensity: 0 });
  if (GFX !== 'low' && o.normal !== false) { m.normalMap = ptex(name, rep, true); const k = o.ns ?? 0.8; m.normalScale.set(k, k); }
  if (o.emissive) { m.emissive = col(o.emissive); m.emissiveIntensity = o.ei ?? 0.12; }
  return m;
}
// box geometry with UVs in metres (so textures keep scale on any size box)
const _bc = {};
export function boxUV(sx, sy, sz) {
  const k = sx.toFixed(2) + ',' + sy.toFixed(2) + ',' + sz.toFixed(2); if (_bc[k]) return _bc[k];
  const g = new THREE.BoxGeometry(sx, sy, sz), uv = g.attributes.uv; const dims = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const j = f * 4 + i; uv.setXY(j, uv.getX(j) * dims[f][0], uv.getY(j) * dims[f][1]); }
  return (_bc[k] = g);
}
export function scaleUV(g, su, sv = su) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; }
// ---------- painterly procedural textures ----------
export function canvasTex(w, h, draw, repeat = [1, 1], srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function strokes(g, w, h, colors, n, sMin, sMax, aMin = 0.05, aMax = 0.18, elong = 3) {
  for (let i = 0; i < n; i++) {
    const x = R(0, w), y = R(0, h), s = R(sMin, sMax);
    g.save(); g.translate(x, y); g.rotate(R(-0.5, 0.5) + (rnd() < 0.5 ? 0 : Math.PI / 2) * 0.2);
    g.globalAlpha = R(aMin, aMax); g.fillStyle = colors[Math.floor(rnd() * colors.length)];
    g.beginPath(); g.ellipse(0, 0, s * elong, s, 0, 0, Math.PI * 2); g.fill(); g.restore();
  }
  g.globalAlpha = 1;
}
const shade = (hex, k) => { const c = col(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
const mix = (a, b, t) => '#' + col(a).lerp(col(b), t).getHexString();

function plasterTex(base, band) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    strokes(g, w, h, [shade(base, 1.12), shade(base, 0.85), mix(base, P.lava, 0.3), shade(base, 0.7)], 900, 6, 26);
    if (band) { // pompeian red dado with fresco panel lines
      const y0 = h * 0.62; g.fillStyle = band; g.fillRect(0, y0, w, h - y0);
      strokes(g, w, h - y0, [shade(band, 1.2), shade(band, 0.75)], 0, 1, 1);
      g.save(); g.translate(0, y0); strokes(g, w, h - y0, [shade(band, 1.25), shade(band, 0.7), '#2a1410'], 400, 4, 18); g.restore();
      g.strokeStyle = '#E8C27A'; g.globalAlpha = 0.55; g.lineWidth = 3;
      for (let x = 20; x < w; x += 128) g.strokeRect(x, y0 + 22, 96, h - y0 - 44);
      g.fillStyle = '#1b1210'; g.globalAlpha = 0.9; g.fillRect(0, y0 - 6, w, 8); g.globalAlpha = 1;
    }
    g.strokeStyle = 'rgba(40,20,15,0.35)'; g.lineWidth = 1.5; // cracks
    for (let i = 0; i < 10; i++) { g.beginPath(); let x = R(0, w), y = R(0, h); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += R(-14, 14); y += R(4, 18); g.lineTo(x, y); } g.stroke(); }
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(0,0,0,0.25)'); grd.addColorStop(0.3, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(30,15,10,0.35)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
}
export const tileTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = P.terracotta; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) {
    const c = mix(P.terracotta, rnd() < 0.5 ? '#7a3018' : '#d07040', R(0, 0.5));
    const gr = g.createLinearGradient(x, y, x + 32, y); gr.addColorStop(0, shade(c, 0.6)); gr.addColorStop(0.5, shade(c, 1.15)); gr.addColorStop(1, shade(c, 0.6));
    g.fillStyle = gr; g.fillRect(x + 1, y, 30, 30); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x, y + 28, 32, 4);
  }
  strokes(g, w, h, ['#3a2e2a', '#e0a070'], 150, 3, 10, 0.05, 0.15);
}, [3, 1]);
export const stoneTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#8a7e72'; g.fillRect(0, 0, w, h);
  strokes(g, w, h, ['#a09282', '#5e544c', '#776a5e', '#b4a48e'], 500, 4, 16, 0.08, 0.25, 1.6);
});
const groundTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#4c423b'; g.fillRect(0, 0, w, h);
  strokes(g, w, h, ['#5d5148', '#3a312b', '#6a5c50', '#2e2622'], 1500, 6, 22, 0.1, 0.3, 1.4);
}, [4, 30]);
const clothTex = (a, b) => canvasTex(256, 256, (g, w, h) => {
  for (let x = 0; x < w; x += 32) { g.fillStyle = (x / 32) % 2 ? a : b; g.fillRect(x, 0, 32, h); }
  strokes(g, w, h, ['#000', '#fff', P.lava], 200, 4, 14, 0.04, 0.1);
});
const woodTex = canvasTex(128, 256, (g, w, h) => { g.fillStyle = '#5a3a22'; g.fillRect(0, 0, w, h); strokes(g, w, h, ['#3a2414', '#7a5232'], 200, 1, 3, 0.2, 0.4, 12); });
const rockTex = canvasTex(1024, 512, (g, w, h) => {
  g.fillStyle = '#2b2320'; g.fillRect(0, 0, w, h);
  strokes(g, w, h, ['#3d322c', '#1c1614', '#4a3a30', '#56443a'], 2500, 4, 20, 0.15, 0.35, 2);
});
const rockTexDay = canvasTex(1024, 512, (g, w, h) => {
  g.fillStyle = '#8c8478'; g.fillRect(0, 0, w, h);
  strokes(g, w, h, ['#9a9284', '#6e665c', '#a49a8a', '#7a8a6a'], 2500, 4, 20, 0.15, 0.35, 2);
});
rockTexDay.flipY = false;
const lavaEmis = canvasTex(1024, 512, (g, w, h) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.lineCap = 'round';
  for (let i = 0; i < 26; i++) { // lava rivulets from crater (top v=0) downwards
    let x = R(0, w), y = R(0, 30); const len = R(0.25, 0.75) * h;
    for (let k = 0; k < 40 && y < len; k++) {
      const nx = x + R(-10, 10), ny = y + R(6, 16), f = 1 - y / len;
      g.strokeStyle = `rgba(255,${Math.floor(70 + 90 * f)},25,${0.5 + 0.5 * f})`; g.lineWidth = 1 + 5 * f;
      g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke(); x = nx; y = ny;
    }
  }
  const gr = g.createLinearGradient(0, 0, 0, 60); gr.addColorStop(0, 'rgba(255,170,60,1)'); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, 60);
});
export function softSprite(inner, outer, noise = 0) {
  return canvasTex(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, inner); gr.addColorStop(1, outer);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (noise) { g.globalCompositeOperation = 'destination-out'; strokes(g, w, h, ['#000'], noise, 8, 28, 0.06, 0.2, 1.3); }
  });
}
lavaEmis.flipY = false; rockTex.flipY = false;
export const smokeTex = softSprite('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 160);
export const glowTex = softSprite('rgba(255,255,255,1)', 'rgba(255,255,255,0)');

// ---------- stylized toon material with rim light ----------
const ramp = new THREE.DataTexture(new Uint8Array([38, 38, 38, 255, 95, 95, 95, 255, 185, 185, 185, 255, 255, 255, 255, 255]), 4, 1);
ramp.minFilter = ramp.magFilter = THREE.LinearFilter; ramp.needsUpdate = true;
export function toon(opts, rim = P.lava, rimPow = 3.0, rimK = 0.35) {
  const m = new THREE.MeshToonMaterial({ gradientMap: ramp, ...opts });
  m.onBeforeCompile = s => {
    s.uniforms.rimCol = { value: col(rim) }; s.uniforms.rimK = { value: rimK }; s.uniforms.rimPow = { value: rimPow };
    s.fragmentShader = 'uniform vec3 rimCol; uniform float rimK; uniform float rimPow;\n' + s.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n float rimF = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), rimPow); totalEmissiveRadiance += rimCol * rimF * rimK;');
  };
  return m;
}
// ---------- lights ----------
export const hemi = new THREE.HemisphereLight(col('#a8d0ff'), col('#a07050'), 1.25); scene.add(hemi);
export const amb = new THREE.AmbientLight(col('#fff0dd'), 0.55); scene.add(amb);
export const sun = new THREE.DirectionalLight(col('#fff1d6'), 3.2);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 4; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 200 });
scene.add(sun, sun.target);
const fillCool = new THREE.DirectionalLight(col('#9ab8e0'), 0.5); fillCool.position.set(-20, 15, 30); scene.add(fillCool);

// ---------- sky dome ----------
export const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uTime: { value: 0 }, uDoom: { value: 0 }, top: { value: col('#1e1716') }, ash: { value: col(P.ashSky) }, glow: { value: col(P.lava) }, dTop: { value: col('#2f6fc8') }, dHor: { value: col('#d6ecf8') } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader: `varying vec3 vP; uniform float uTime, uDoom; uniform vec3 top, ash, glow, dTop, dHor;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
  void main(){ float y=vP.y; vec3 c=mix(ash*1.25, top, smoothstep(0.0,0.6,y));
    float toV = pow(max(dot(normalize(vec3(vP.x,0.,vP.z)), vec3(0,0,-1)),0.0), 6.0);
    c += glow * toV * exp(-max(y,0.)*6.0) * 1.1;
    float cl = fbm(vec2(atan(vP.x,vP.z)*3.0 + uTime*0.01, y*6.0));
    c = mix(c, c*0.55 + glow*0.12*toV, smoothstep(0.45,0.8,cl)*smoothstep(-0.05,0.35,y));
    vec3 day = mix(dHor, dTop, smoothstep(-0.02, 0.45, y));
    float cd = fbm(vec2(atan(vP.x,vP.z)*4.0 + uTime*0.004, y*9.0)); day = mix(day, vec3(1.0,0.98,0.95), smoothstep(0.55,0.8,cd)*smoothstep(0.02,0.3,y)*0.6);
    day += vec3(1.0,0.6,0.3) * toV * exp(-max(y,0.)*10.0) * 0.25;
    c = mix(day, c, uDoom);
    gl_FragColor = vec4(c,1.0);
    #include <colorspace_fragment>
  }`
}));
scene.add(sky);

// ---------- Vesuvius ----------
export let vesMat, sommaMat;
const VZ = -430, VH = 215;
{
  const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push(new THREE.Vector2(lerp(55, 320, Math.pow(t, 1.3)), VH * (1 - t) - 10)); }
  const g = new THREE.LatheGeometry(pts, 160); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(z, x);
    const k = 1 + 0.06 * Math.sin(a * 7 + y * 0.03) + 0.04 * Math.sin(a * 19 + y * 0.08) + 0.03 * Math.sin(a * 41); p.setX(i, x * k); p.setZ(i, z * k); }
  g.computeVertexNormals();
  const m = vesMat = toon({ color: col('#7a6a5a'), map: (() => { const t = ptex('rock', 1); t.repeat.set(36, 10); return t; })(), emissive: col('#ffffff'), emissiveMap: lavaEmis, emissiveIntensity: 0.5, fog: false, side: THREE.DoubleSide }, '#ffffff', 2.0, 0.08);
  const v = new THREE.Mesh(g, m); v.position.set(-40, 0, VZ); v.rotation.y = 1.9; scene.add(v);
  // shoulder ridge (Monte Somma)
  const s = new THREE.Mesh(new THREE.ConeGeometry(260, 140, 64, 1, true), sommaMat = toon({ color: col('#2a211e'), map: rockTexDay, fog: false }, P.lava, 2, 0.2));
  s.position.set(260, 60, VZ - 160); scene.add(s);
}
// crater glow + smoke column + lava fountain
const craterY = VH - 10;
export const craterGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col('#ff9a40'), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
craterGlow.position.set(-40, craterY + 20, VZ); craterGlow.scale.set(160, 90, 1); scene.add(craterGlow);
const smoke = [];
for (let i = 0; i < 170; i++) {
  const h = Math.pow(rnd(), 0.8); const m = new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, fog: false, rotation: R(0, 6.28) });
  const s = new THREE.Sprite(m); s.userData = { h, ang: R(0, 6.28), rad: R(0, 1), sp: R(0.6, 1.4), sz: R(0.8, 1.3) }; scene.add(s); smoke.push(s);
}
export function updateSmoke(t, grow = 1, doom = 0) {
  for (const s of smoke) {
    const u = s.userData; const h = (u.h + t * 0.004 * u.sp) % 1;
    const hh = h; const top = grow; const y = craterY + h * 620 * (0.5 + 0.5 * grow), spread = 25 + Math.pow(h, 1.5) * 420 * grow + (h > 0.75 * top ? (h - 0.75 * top) * 900 * grow : 0);
    s.position.set(-40 + Math.cos(u.ang + t * 0.03) * spread * u.rad + h * 120, y, VZ + Math.sin(u.ang) * spread * u.rad * 0.5 + 60);
    const c = col('#ffb070').lerp(col('#ece8e2'), sstep(0, 0.15, h)).lerp(col('#b8b2ac'), sstep(0.3, 0.9, h)); c.lerp(col('#3a2a24'), doom * sstep(0.05, 0.4, h));
    s.material.color.copy(c).multiplyScalar(lerp(1.5, 1.0, sstep(0, 0.3, h)));
    const sz0 = (25 + hh * 300 * grow) * u.sz; s.scale.set(sz0, sz0, 1);
    s.material.opacity = 0.9 * sstep(0, 0.04, h) * (1 - sstep(0.9, 1, h)) * (1 - sstep(top - 0.12, top, h)); s.material.rotation += 0.001;
    s.renderOrder = -Math.floor(h * 100);
  }
}
const FN = 500, fountain = new THREE.BufferGeometry(); const fpos = new Float32Array(FN * 3); const fseed = [];
for (let i = 0; i < FN; i++) fseed.push([R(0, 3), R(-1, 1), R(-1, 1), R(60, 140)]);
fountain.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
const fountainPts = new THREE.Points(fountain, new THREE.PointsMaterial({ map: glowTex, color: col('#ffb060'), size: 9, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
scene.add(fountainPts);
export function updateFountain(t) {
  for (let i = 0; i < FN; i++) { const [o, dx, dz, v] = fseed[i]; const life = ((t + o) % 3); const g = 60;
    fpos[i * 3] = -40 + dx * 40 * life; fpos[i * 3 + 1] = craterY + v * life - 0.5 * g * life * life; fpos[i * 3 + 2] = VZ + dz * 30 * life + 40; }
  fountain.attributes.position.needsUpdate = true;
}

// ================= CITY LAYOUT (3 connected streets + harbor) =================
// heading 0 = north = -Z (towards Vesuvius); east = +X (harbor)
export const streets = [
  { name: 'Via di Stabia', x0: -4.8, x1: 4.8, z0: -66.5, z1: 14, dir: 'z' },
  { name: 'Decumanus', x0: -46, x1: 53, z0: -34.8, z1: -25.2, dir: 'x' },
  { name: 'Vicolo', x0: -44.8, x1: -35.2, z0: -72, z1: -25.2, dir: 'z' },
  { name: 'Market', x0: 20.2, x1: 29.8, z0: -26.5, z1: 12, dir: 'z' },
  { name: 'Temple', x0: 20.2, x1: 29.8, z0: -80, z1: -33.5, dir: 'z' },
];
export const districts = [
  { name: 'VIA DI STABIA', x0: -4.8, x1: 4.8, z0: -66.5, z1: 14 }, { name: 'DECUMANUS', x0: -46, x1: 52, z0: -34.8, z1: -25.2 },
  { name: 'VICOLO', x0: -44.8, x1: -35.2, z0: -72, z1: -25.2 }, { name: 'MARKET DISTRICT', x0: 20.2, x1: 29.8, z0: -25.2, z1: 12 },
  { name: 'TEMPLE DISTRICT', x0: 20.2, x1: 29.8, z0: -80, z1: -34.8 }, { name: 'HARBOR', x0: 52, x1: 66, z0: -44, z1: -16 }];
// rect blockers: 'gate' (until unlocked), 'beam' (crawl under), 'low' (jump/vault over)
export const blockers = [
  { type: 'gate', x0: 20.2, x1: 29.8, z0: -42, z1: -39.5, active: true },
  { type: 'beam', x0: -4.8, x1: 4.8, z0: -45.6, z1: -44.6 },
  { type: 'beam', x0: -44.8, x1: -35.2, z0: -50.5, z1: -49.5 },
  { type: 'low', x0: 1.0, x1: 4.6, z0: -20.4, z1: -19.4 },
  { type: 'low', x0: -10, x1: -9, z0: -34.6, z1: -29 },
  { type: 'low', x0: 36, x1: 37, z0: -31, z1: -25.4 },
  { type: 'low', x0: 21, x1: 25.5, z0: -8.5, z1: -7.6 },
];
export const fountains = [[20, -27], [26.5, -3], [-38.2, -44], [27.5, -58]];
export const fires = [[3.2, -63], [-37.5, -69], [27, -74], [-1, -52.5], [-26, -33.5]];
export const stalls = [];
export const harbor = { x0: 52, x1: 66, z0: -44, z1: -16 };
export const walkRects = [...streets, harbor];
export const colliders = []; // circles {x,z,r}
export const boat = new THREE.Vector3(69, 0, -30);
const inRect = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
const rectOverlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;

const ground = new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(400, 400), 400), pmat('sand', '#f0dcc0', 3, { ns: 0.6 }));
ground.rotation.x = -Math.PI / 2; ground.position.set(10, 0, -30); ground.receiveShadow = true; scene.add(ground);

// paved roads: Pompeian basalt blocks with cart ruts, raised sidewalks with kerbs
export const roadMat = pmat('street', '#d2b894', 2.4, { ns: 1.0 });
{
  const sideMat = pmat('sidewalk', '#ffe0b0', 1.6, { ns: 0.6 }), kerbMat = pmat('marble', '#d8ccb8', 1.2), rutMat = new THREE.MeshBasicMaterial({ color: col('#2a2420'), transparent: true, opacity: 0.22, depthWrite: false });
  const roads = streets.map(s => s.dir === 'z' ? { x0: s.x0 + 1.6, x1: s.x1 - 1.6, z0: s.z0, z1: s.z1, dir: 'z' } : { x0: s.x0, x1: s.x1, z0: s.z0 + 1.6, z1: s.z1 - 1.6, dir: 'x' });
  streets.forEach((st, i) => { const r = roads[i];
    const w = r.x1 - r.x0, l = r.z1 - r.z0; const p = new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(w, l), w, l), roadMat); p.rotation.x = -Math.PI / 2; p.position.set((r.x0 + r.x1) / 2, 0.02 + i * 0.002, (r.z0 + r.z1) / 2); p.receiveShadow = true; scene.add(p);
    for (const o of [-0.75, 0.75]) { const rw = 0.16, rl = (st.dir === 'z' ? l : w); const g = new THREE.PlaneGeometry(st.dir === 'z' ? rw : rl, st.dir === 'z' ? rl : rw); const ru = new THREE.Mesh(g, rutMat); ru.rotation.x = -Math.PI / 2;
      ru.position.set(st.dir === 'z' ? (r.x0 + r.x1) / 2 + o : (r.x0 + r.x1) / 2, 0.035 + i * 0.002, st.dir === 'z' ? (r.z0 + r.z1) / 2 : (r.z0 + r.z1) / 2 + o); scene.add(ru); }
    const sides = st.dir === 'z' ? [[st.x0, r.x0], [r.x1, st.x1]] : [[st.z0, r.z0], [r.z1, st.z1]];
    for (const [u0, u1] of sides) { const sw = u1 - u0, cx = st.dir === 'z' ? (u0 + u1) / 2 : (st.x0 + st.x1) / 2, cz = st.dir === 'z' ? (st.z0 + st.z1) / 2 : (u0 + u1) / 2;
      const sx = st.dir === 'z' ? sw : st.x1 - st.x0, sz = st.dir === 'z' ? st.z1 - st.z0 : sw;
      const m = new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(sx, sz), sx, sz), sideMat); m.rotation.x = -Math.PI / 2; m.position.set(cx, 0.08 + i * 0.002, cz); m.receiveShadow = true; scene.add(m);
      const kx = st.dir === 'z' ? (u0 === st.x0 ? u1 : u0) : cx, kz = st.dir === 'z' ? cz : (u0 === st.z0 ? u1 : u0);
      const k = new THREE.Mesh(boxUV(st.dir === 'z' ? 0.18 : sx, 0.16, st.dir === 'z' ? sz : 0.18), kerbMat); k.position.set(kx, 0.05, kz); k.receiveShadow = true; scene.add(k); }
  });
  const m = pmat('rock', '#c8beb0', 1);
  for (const z of [-9, -48]) for (const x of [-1.6, 0, 1.6]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.42, 14), m); s.scale.z = 0.6; s.position.set(x, 0.2, z); s.castShadow = s.receiveShadow = true; scene.add(s); colliders.push({ x, z, r: 0.42 }); }
}

const amphGeo = (() => { const p = []; const prof = [[0, 0], [0.04, 0.02], [0.1, 0.12], [0.18, 0.35], [0.2, 0.5], [0.17, 0.65], [0.08, 0.78], [0.06, 0.95], [0.08, 1.0]];
  for (const [r, y] of prof) p.push(new THREE.Vector2(r, y)); const g = new THREE.LatheGeometry(p, 18); g.scale(1.1, 1.1, 1.1); return g; })();
const amphMat = toon({ color: col('#c06a3a'), map: stoneTex }, P.lava, 2.5, 0.5);
function amphora(parent, x, z, s = 1, lean = 0) { const a = new THREE.Mesh(amphGeo, amphMat); a.position.set(x, 0.06, z); a.scale.setScalar(s); a.rotation.z = lean; a.castShadow = true; parent.add(a); return a; }

const facadeCols = [[P.plaster, P.paramedicRed], [P.ochre, '#8a2a1e'], ['#c98a5a', '#3a2a40'], [P.plaster, '#7a2a20'], ['#d2a070', null], [P.terracotta, '#2a2030']];
const facadeMats = facadeCols.map(([b, band]) => { const m = pmat('plaster', mix(b, '#ffd8a0', 0.12), 2.5, { ns: 0.9 }); m.userData.band = band; return m; });
const dadoMats = ['#b03a28', '#8a2a1e', '#c8762e', '#2a2a3a', '#7a2a20'].map(c => pmat('plaster', c, 2.5, { ns: 0.9 }));
const baseMat = pmat('brick', '#f0d6b8', 2.2, { ns: 1 });
const darkMat = toon({ color: col('#150e0c') }, P.lava, 3, 0.05);
export const woodMat = pmat('wood', '#e8c8a0', 1.2);
const tileMat = pmat('roof', '#ffd0b0', 1.4, { ns: 1.2 });
const colMat = pmat('marble', '#fbf2e4', 1.6, { rough: 0.5, ns: 0.4 });
const clothMats = ['#ffb8a0', '#fff0a0', '#ffd0c0'].map(c => pmat('fabric', c, 0.6, { side: THREE.DoubleSide, ns: 0.7 }));
export const rubMat = pmat('rock', '#d8a078', 0.8);
const boxG = new THREE.BoxGeometry(1, 1, 1);
const B = (parent, mat, sx, sy, sz, x, y, z, shadow = true) => { const tex = mat.isMeshStandardMaterial; const m = new THREE.Mesh(tex ? boxUV(sx, sy, sz) : boxG, mat); if (!tex) m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m; };

// building: local front face at x=0 facing +x, spans z in [-w/2,w/2], depth d behind (x<0)
function building(fx, fz, nx, nz, w, h, opts = {}) {
  const d = 7, m = facadeMats[Math.floor(rnd() * facadeMats.length)];
  const grp = new THREE.Group(); grp.position.set(fx, 0, fz); grp.rotation.y = Math.atan2(-nz, nx); scene.add(grp);
  B(grp, m, d, h, w, -d / 2, h / 2, 0);
  B(grp, dadoMats[Math.floor(rnd() * dadoMats.length)], 0.04, 1.25, w - 0.02, 0.01, 0.95, 0, false); B(grp, baseMat, 0.1, 0.36, w + 0.02, 0.03, 0.18, 0, false);
  B(grp, colMat, 0.07, 0.08, w, 0.03, 1.6, 0, false);
  const dw = R(1.2, Math.min(2.2, w - 1.4)), dz = R(-w / 2 + 0.6 + dw / 2, w / 2 - 0.6 - dw / 2);
  B(grp, darkMat, 0.12, 2.6, dw, 0.03, 1.3, dz, false);
  for (const o of [-1, 1]) B(grp, woodMat, 0.22, 2.8, 0.18, 0.05, 1.4, dz + o * dw / 2);
  B(grp, colMat, 0.26, 0.24, dw + 0.4, 0.05, 2.8, dz);
  if (h > 5.5) for (let wz = w / 2 - 0.9; wz > -w / 2 + 0.6; wz -= R(1.4, 2.2)) { B(grp, darkMat, 0.1, 0.7, 0.5, 0.02, h - 1.4, wz, false); B(grp, colMat, 0.25, 0.08, 0.7, 0.06, h - 1.78, wz, false); }
  B(grp, colMat, 0.5, 0.25, w, 0.05, h, 0);
  const roof = B(grp, tileMat, 3.2, 0.14, w + 0.2, -0.6, h + 0.55, 0); roof.rotation.z = -0.38;
  const items = [];
  if (!opts.plain && rnd() < 0.5) {
    const aw = new THREE.Mesh(new THREE.PlaneGeometry(1.7, w * 0.8, 1, 8), clothMats[Math.floor(rnd() * 3)]);
    const pa = aw.geometry.attributes.position; for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getY(i) * 3) * 0.04);
    aw.geometry.computeVertexNormals(); aw.rotation.set(0, Math.PI / 2, 0); aw.rotateX(-0.35); aw.position.set(0.8, 3.15, 0); aw.castShadow = true; grp.add(aw);
    for (const o of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.9, 6), woodMat); pole.position.set(1.55, 1.45, o * w * 0.38); pole.castShadow = true; grp.add(pole); items.push([1.55, o * w * 0.38, 0.12]); }
  }
  if (!opts.plain) {
    const n = Math.floor(R(0, 4)); for (let i = 0; i < n; i++) { const az = dz + R(-1.4, 1.4) + (i - n / 2) * 0.45, ax = R(0.3, 0.6); amphora(grp, ax, az, R(0.8, 1.05), R(-0.08, 0.08)); items.push([ax, az, 0.28]); }
    if (rnd() < 0.4) { const cz = dz - dw; const cr = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.5, 0.6, 2, 0.04), woodMat); cr.position.set(0.6, 0.25, cz); cr.rotation.y = R(-0.3, 0.3); cr.castShadow = true; grp.add(cr); items.push([0.6, cz, 0.42]); }
  }
  grp.updateMatrixWorld(true);
  const v = new THREE.Vector3(); for (const [x, z, r] of items) { v.set(x, 0, z).applyMatrix4(grp.matrixWorld); colliders.push({ x: v.x, z: v.z, r }); }
}
function footprint(fx, fz, nx, nz, w) { // world AABB of building
  const d = 7, tx = -nz, tz = nx; const pts = [[0, -w / 2], [0, w / 2], [-d, -w / 2], [-d, w / 2]].map(([a, b]) => [fx + nx * a + tx * b, fz + nz * a + tz * b]);
  return { x0: Math.min(...pts.map(p => p[0])), x1: Math.max(...pts.map(p => p[0])), z0: Math.min(...pts.map(p => p[1])), z1: Math.max(...pts.map(p => p[1])) };
}
const reserved = [{ x0: 29.8, x1: 37, z0: -10, z1: 4 }, { x0: 4.8, x1: 12, z0: -64, z1: -40 }]; // colonnade on Via di Stabia east side
function rowOfBuildings(s) {
  const sides = s.dir === 'z' ? [[s.x0, 1], [s.x1, -1]] : [[s.z0, 1], [s.z1, -1]];
  for (const [edge, sg] of sides) {
    const [a, b] = s.dir === 'z' ? [s.z1, s.z0] : [s.x1, s.x0];
    let u = a; while (u > b + 1) {
      const w = Math.min(R(4, 8.5), u - b); if (w < 2.5) break;
      const c = u - w / 2; const fx = s.dir === 'z' ? edge : c, fz = s.dir === 'z' ? c : edge;
      const nx = s.dir === 'z' ? sg : 0, nz = s.dir === 'z' ? 0 : sg;
      const fp = footprint(fx, fz, nx, nz, w); const sh = { x0: fp.x0 + 0.05, x1: fp.x1 - 0.05, z0: fp.z0 + 0.05, z1: fp.z1 - 0.05 };
      if (walkRects.some(r => rectOverlap(r, sh)) || reserved.some(r => rectOverlap(r, sh))) { u -= 1; continue; }
      building(fx, fz, nx, nz, w, R(5.2, 9)); u -= w;
    }
  }
}
streets.forEach(rowOfBuildings);
// dead-end caps
building(0, 14, 0, -1, 9.8, 8, { plain: true });
building(-46, -30, 1, 0, 9.8, 8.5, { plain: true });
building(-40, -72, 0, 1, 9.8, 7, { plain: true });
building(25, 12, 0, -1, 9.8, 8, { plain: true }); building(25, -80, 0, 1, 9.8, 9, { plain: true });
for (const [x, z] of [[15.7, -38.5], [34.3, -38.5], [15.7, -21.5], [34.3, -21.5]]) B(scene, facadeMats[Math.floor(rnd() * 6)], 7, 7.5, 7, x, 3.75, z);
// market stalls (open-air) on the east side of the Market street
B(scene, facadeMats[2], 6, 6, 14, 33.2, 3, -3);
for (let i = 0; i < 4; i++) { const z = 2 - i * 3.4, x = 28.4; const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  B(g, woodMat, 1.4, 0.9, 2.6, 0, 0.45, 0); for (const o of [-1, 1]) for (const q of [-1, 1]) B(g, woodMat, 0.1, 2.6, 0.1, q * 0.65, 1.3, o * 1.25);
  const aw = B(g, clothMats[i % 3], 1.9, 0.06, 3.0, -0.2, 2.65, 0); aw.rotation.z = 0.25; colliders.push({ x, z: z - 0.7, r: 0.75 }, { x, z: z + 0.7, r: 0.75 }); stalls.push([x - 0.9, z]); }
// blockers visuals
for (const b of blockers) { const w = b.x1 - b.x0, d = b.z1 - b.z0, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  if (b.type === 'beam') { const m = B(scene, woodMat, w + 1.2, 0.45, 0.45, cx, 1.3, cz); m.rotation.z = 0.06; B(scene, woodMat, 0.4, 1.3, 0.4, b.x0 + 0.3, 0.65, cz); for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(R(0.15, 0.3), 0), rubMat); r.position.set(R(b.x0, b.x1), 1.7, cz + R(-0.3, 0.3)); scene.add(r); } }
  if (b.type === 'low') { for (let x = b.x0 + 0.3; x < b.x1; x += 0.7) for (let z = b.z0 + 0.3; z < b.z1; z += 0.7) { const c = new THREE.Mesh(new RoundedBoxGeometry(0.66, 0.55, 0.66, 2, 0.04), woodMat); c.position.set(x, 0.3, z); c.rotation.y = R(-0.2, 0.2); c.castShadow = true; scene.add(c); } }
  if (b.type === 'gate') { b.meshes = []; for (let i = 0; i < 30; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(R(0.4, 1.1), 0), rnd() < 0.5 ? rubMat : colMat); r.position.set(R(b.x0, b.x1), R(0.2, 1.8), R(b.z0, b.z1)); r.rotation.set(R(0, 3), R(0, 3), 0); r.castShadow = true; scene.add(r); b.meshes.push(r); } }
}
for (const [x, z] of fountains.slice(1)) { B(scene, colMat, 1.4, 0.8, 1, x, 0.4, z); colliders.push({ x, z, r: 0.85 }); }
const waterMat = new THREE.MeshBasicMaterial({ color: col('#5ac8ff'), transparent: true, opacity: 0.8 });
for (const [x, z] of fountains) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), waterMat); w.rotation.x = -Math.PI / 2; w.position.set(x, 0.81, z); scene.add(w); }
// corner fillers (block views into the void at intersections)
for (const [x, z, w, d] of [[-8.5, -38.5, 7, 7], [8.5, -38.5, 7, 7], [-8.5, -21.5, 7, 7], [8.5, -21.5, 7, 7], [-31.5, -38.5, 7, 7], [-48.5, -38.5, 7, 7], [-48.5, -21.5, 7, 7], [-31.5, -21.5, 7, 7]]) {
  B(scene, facadeMats[Math.floor(rnd() * 6)], w, 7.5, d, x, 3.75, z);
}
// colonnade (portico) on Via di Stabia east side
for (let z = -42; z > -64; z -= 2.2) {
  const X = 4.8 - 0.4;
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 4.2, 16), colMat); c.position.set(X, 2.1, z); c.castShadow = true; scene.add(c);
  B(scene, colMat, 0.7, 0.2, 0.7, X, 4.25, z); B(scene, colMat, 0.66, 0.22, 0.66, X, 0.11, z);
  const rb = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.29, 1.4, 16), toon({ color: col(P.paramedicRed) }, P.lava, 2.5, 0.3)); rb.position.set(X, 0.8, z); scene.add(rb);
  colliders.push({ x: X, z, r: 0.4 });
}
B(scene, colMat, 0.8, 0.6, 22, 4.4, 4.6, -53); B(scene, facadeMats[0], 1, 7, 24, 9.2, 3.5, -53);
const pr = B(scene, tileMat, 4.6, 0.2, 22, 6.8, 5.2, -53); pr.rotation.z = 0.2;
for (let i = 0; i < 7; i++) amphora(scene, R(6, 8.4), -44 - i * 2.6, R(0.8, 1.1));
// honorific arch at the south end of Via di Stabia, framing Vesuvius, blocked by rubble
{
  const sh = new THREE.Shape(); sh.moveTo(-6, 0); sh.lineTo(6, 0); sh.lineTo(6, 11); sh.lineTo(-6, 11); sh.lineTo(-6, 0);
  const hole = new THREE.Path(); hole.moveTo(-3.4, 0); hole.lineTo(-3.4, 6); hole.absarc(0, 6, 3.4, Math.PI, 0, true); hole.lineTo(3.4, 0); hole.lineTo(-3.4, 0); sh.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 3, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, curveSegments: 32 });
  const a = new THREE.Mesh(g, pmat('marble', '#f0e0c8', 0.12)); a.position.set(0, 0, -70); a.castShadow = a.receiveShadow = true; scene.add(a);
  B(scene, colMat, 12.8, 0.6, 3.6, 0, 11.2, -68.5);
  for (const x of [-4.6, 4.6]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 9, 18), colMat); c.position.set(x, 4.5, -66.8); c.castShadow = true; scene.add(c); }
  for (let i = 0; i < 26; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(R(0.3, 0.9), 0), rnd() < 0.5 ? rubMat : colMat); r.position.set(R(-3.2, 3.2), R(0.1, 1.2), R(-71.5, -68.5)); r.rotation.set(R(0, 3), R(0, 3), 0); r.castShadow = true; scene.add(r); }
  for (const sx of [-1, 1]) for (let z = -76; z > -130; z -= 3.5) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 7, 12), colMat); c.position.set(sx * 16, 3.5, z); scene.add(c); }
  const temple = B(scene, facadeMats[4], 14, 10, 10, 0, 5, -150, false);
  for (let x = -6; x <= 6; x += 2.4) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 9, 12), colMat); c.position.set(x, 5.5, -144); scene.add(c); }
}
// fountain on the decumanus (Pompeian street fountain)
{ const f = B(scene, colMat, 1.4, 0.8, 1, 20, 0.4, -27, true); B(scene, colMat, 0.5, 1.4, 0.4, 20, 0.7, -26.4); colliders.push({ x: 20, z: -27, r: 0.85 }); }
// scattered rubble
for (let i = 0; i < 70; i++) { const s = streets[i % 3]; const r = new THREE.Mesh(new THREE.DodecahedronGeometry(R(0.05, 0.18), 0), rnd() < 0.5 ? rubMat : colMat); r.position.set(R(s.x0, s.x1), 0.12, R(s.z0, s.z1)); r.rotation.set(R(0, 3), R(0, 3), 0); scene.add(r); }

export const export_water = {};
// ---------- harbor ----------
{
  const plank = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < h; y += 32) { g.fillStyle = mix('#6a4a2e', '#4a3220', R(0, 1)); g.fillRect(0, y, w, 30); g.fillStyle = '#1a120a'; g.fillRect(0, y + 30, w, 2); } strokes(g, w, h, ['#2a1a10', '#8a6a4a'], 300, 1, 3, 0.15, 0.3, 14); }, [6, 8]);
  const dock = new THREE.Mesh(new THREE.BoxGeometry(22, 0.4, 32), pmat('planks', '#e8c490', 0.08)); dock.position.set(61, -0.15, -30); dock.receiveShadow = true; scene.add(dock);
  const waterMat = new THREE.MeshStandardMaterial({ color: col('#2f7f9a'), roughness: 0.15, metalness: 0.1 }); if (GFX !== 'low') { waterMat.normalMap = ptex('fabric', 0.08, true); waterMat.normalScale.set(0.35, 0.35); } waterMat.userData.water = 1; export_water.m = waterMat;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), waterMat);
  water.rotation.x = -Math.PI / 2; water.position.set(372, -0.7, -30); scene.add(water);
  for (let z = -45; z <= -15; z += 3) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.6, 8), woodMat); p.position.set(72, -0.2, z); scene.add(p); }
  // boat
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.0, 9, 12, 1, false, 0, Math.PI), woodMat); hull.rotation.set(Math.PI / 2, 0, Math.PI / 2); hull.scale.set(1, 1, 0.8);
  hull.position.set(boat.x + 0.5, 0.1, boat.z); hull.rotation.set(-Math.PI / 2, 0, 0); hull.rotation.order = 'YXZ'; scene.add(hull);
  const hg = new THREE.Group(); hg.position.set(75, 0, -30); scene.add(hg);
  const h2 = B(hg, woodMat, 3.2, 1.0, 10, 0, 0.0, 0); const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 9, 8), woodMat); mast.position.set(0, 4.5, 0); hg.add(mast);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(5, 4.5, 6, 6), clothMats[0]); sail.position.set(0.1, 5.5, 0); sail.rotation.y = Math.PI / 2; hg.add(sail);
  scene.remove(hull);
  // crates & amphorae
  for (let i = 0; i < 6; i++) { const x = R(54, 64), z = rnd() < 0.5 ? R(-43, -40) : R(-20, -17); const cr = new THREE.Mesh(new RoundedBoxGeometry(1, 0.9, 1, 2, 0.05), woodMat); cr.position.set(x, 0.5, z); cr.rotation.y = R(0, 1); cr.castShadow = true; scene.add(cr); colliders.push({ x, z, r: 0.7 }); }
  // warehouses framing the harbor
  building(58, -44, 0, 1, 12, 7, { plain: true }); building(58, -16, 0, -1, 12, 7, { plain: true });
}
// harbor beacon (objective marker in the world)
export const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: col(P.cyan), transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
beacon.position.set(62, 30, -30); scene.add(beacon);
const beaconRing = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.6, 48), new THREE.MeshBasicMaterial({ color: col(P.cyan), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
beaconRing.rotation.x = -Math.PI / 2; beaconRing.position.set(62, 0.08, -30); scene.add(beaconRing); export { beaconRing };

// haze sprites
export const hazes = [];
for (let i = 0; i < 30; i++) { const s = streets[i % 3]; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: col(i % 3 ? '#e0d8cc' : '#f0e0c8'), transparent: true, opacity: 0.05, depthWrite: false }));
  sp.position.set(R(s.x0, s.x1), R(0.5, 4), R(s.z0, s.z1)); const k = R(6, 14); sp.scale.set(k * 1.8, k, 1); scene.add(sp); hazes.push(sp); }

// ---------- collision ----------
export function blockedBy(a, b, r, ctx) {
  for (const k of blockers) { if (k.type === 'gate' && !k.active) continue; if (k.type === 'beam' && ctx.crouch) continue; if (k.type === 'low' && ctx.y > 0.3) continue;
    if (a > k.x0 - r && a < k.x1 + r && b > k.z0 - r && b < k.z1 + r) return k; } return null;
}
export function resolve(x, z, nx, nz, r = 0.35, ctx = { crouch: true, y: 1 }) {
  const steps = Math.ceil(Math.hypot(nx - x, nz - z) / 0.2);
  if (steps > 1) { let px = x, pz = z; for (let i = 1; i <= steps; i++) [px, pz] = resolve1(px, pz, px + (nx - x) / steps, pz + (nz - z) / steps, r, ctx); return [px, pz]; }
  return resolve1(x, z, nx, nz, r, ctx);
}
function resolve1(x, z, nx, nz, r, ctx) {
  const ok = (a, b) => walkRects.some(w => a > w.x0 + r && a < w.x1 - r && b > w.z0 + r && b < w.z1 - r) && !blockedBy(a, b, r, ctx);
  let px = x, pz = z;
  if (ok(nx, nz)) { px = nx; pz = nz; } else if (ok(nx, z)) px = nx; else if (ok(x, nz)) pz = nz;
  for (const c of colliders) { const dx = px - c.x, dz = pz - c.z, d = Math.hypot(dx, dz), m = c.r + r; if (d < m && d > 1e-4) { const tx = c.x + dx / d * m, tz = c.z + dz / d * m; if (ok(tx, tz)) { px = tx; pz = tz; } } }
  return [px, pz];
}
export function inHarbor(x, z) { return inRect(harbor, x, z, -1); }
export function walkable(x, z, r = 0.4) { return walkRects.some(w => x > w.x0 + r && x < w.x1 - r && z > w.z0 + r && z < w.z1 - r); }
export { stoneTex as _st, rnd, mix, shade };

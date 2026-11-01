import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { scene, P, col, clamp, sstep, lerp, R, toon, sun, sky, updateSmoke, updateFountain, craterGlow, smokeTex, glowTex, hazes, resolve, inHarbor, walkable, streets, harbor, boat, beacon, beaconRing, rubMat, mix, hemi, amb, vesMat, sommaMat, blockers, blockedBy, fountains, fires, stalls, districts, colliders, woodMat, GFX, setAniso, export_water, boats } from './world.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ITEMS, HOTBAR, INJURIES, Inventory } from './items.js';
import { Sfx } from './audio.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const GAME = { duration: 390, maxHp: 100, walk: 4.2, sprint: 7.0, eye: 1.68 };
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.domElement.className = 'gl'; document.body.prepend(renderer.domElement);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
scene.fog = new THREE.FogExp2(col('#cfe6fa'), 0.0018);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 3000); scene.add(camera);
sun.shadow.mapSize.set(GFX === 'high' ? 4096 : 2048, GFX === 'high' ? 4096 : 2048); sun.shadow.radius = 3;
// ---------- Adam's left forearm + chronometer (camera-attached) ----------
const arm = new THREE.Group(); camera.add(arm);
const navyMat = toon({ color: col(P.navy).multiplyScalar(0.8) }, '#ffb070', 2.5, 0.2);
const redMat = toon({ color: col(P.paramedicRed) }, '#ffb070', 2.5, 0.3);
const skinMat = toon({ color: col(P.skin).multiplyScalar(0.8), emissive: col('#3a1408'), emissiveIntensity: 0.15 }, '#ffb080', 2.5, 0.18);
const metalMat = toon({ color: col('#24262c') }, '#7fdfff', 2.0, 0.35);
const metal2 = toon({ color: col('#3a3d46') }, '#ffb070', 2.5, 0.3);
const cyanMat = new THREE.MeshBasicMaterial({ color: col(P.cyan).multiplyScalar(1.15), toneMapped: false });
const mustardMat = toon({ color: col('#e0a82e') }, '#fff0c0', 2.5, 0.25), gloveMat = toon({ color: col('#5aa8d8') }, '#d8f4ff', 2.5, 0.25);
{ // forearm along +X; top of wrist = +Y
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.42, 24), mustardMat); sleeve.rotation.z = Math.PI / 2; sleeve.position.x = -0.25; arm.add(sleeve);
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.009, 8, 24), metal2); cuff.rotation.y = Math.PI / 2; cuff.position.x = -0.04; arm.add(cuff);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.012, 0.016), redMat); stripe.position.set(-0.25, 0.012, 0.056); stripe.rotation.x = 0.3; arm.add(stripe);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.06, 0.03, 24), redMat); band.rotation.z = Math.PI / 2; band.position.x = -0.38; arm.add(band);
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.036, 0.12, 20), gloveMat); wrist.rotation.z = Math.PI / 2; wrist.position.x = 0.01; wrist.scale.z = 0.75; arm.add(wrist);
  const palm = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.034, 0.085, 3, 0.014), gloveMat); palm.position.set(0.11, -0.004, 0); arm.add(palm);
  const fingers = [[-0.03, 0.05], [-0.01, 0.054], [0.012, 0.05], [0.032, 0.042]];
  fingers.forEach(([z, l]) => { const g = new THREE.Group(); g.position.set(0.16, -0.004, z); g.rotation.z = -1.1;
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.0112, l * 0.5, 8, 14), gloveMat); a.rotation.z = Math.PI / 2; a.position.x = l * 0.3; g.add(a);
    const g2 = new THREE.Group(); g2.position.x = l * 0.62; g2.rotation.z = -1.3; const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.0105, l * 0.38, 8, 14), gloveMat); b.rotation.z = Math.PI / 2; b.position.x = l * 0.24; g2.add(b); g.add(g2); arm.add(g); });
  const th = new THREE.Group(); th.position.set(0.08, -0.008, 0.045); th.rotation.set(0.4, -0.7, -0.3);
  const t1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.04, 4, 10), gloveMat); t1.rotation.z = Math.PI / 2; t1.position.x = 0.025; th.add(t1); arm.add(th);
}
// chronometer
const dialC = document.createElement('canvas'); dialC.width = dialC.height = 512; const dctx = dialC.getContext('2d');
const dialTex = new THREE.CanvasTexture(dialC); dialTex.colorSpace = THREE.SRGBColorSpace; dialTex.anisotropy = 8;
const chrono = new THREE.Group(); chrono.position.set(0.0, 0.043, 0); arm.add(chrono);
{
  const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.05, 24, 1, true), metal2); strap.rotation.z = Math.PI / 2; strap.position.y = -0.043; strap.material.side = THREE.DoubleSide; chrono.add(strap);
  const caseG = new THREE.CylinderGeometry(0.05, 0.054, 0.02, 8); caseG.rotateY(Math.PI / 8);
  const cs = new THREE.Mesh(caseG, metalMat); chrono.add(cs);
  const bez = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.046, 0.008, 8).rotateY(Math.PI / 8), metal2); bez.position.y = 0.012; chrono.add(bez);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; const blk = new THREE.Mesh(new RoundedBoxGeometry(0.026, 0.026, 0.02, 2, 0.004), metalMat);
    blk.position.set(Math.cos(a) * 0.05, 0.004, Math.sin(a) * 0.05); blk.rotation.y = -a; chrono.add(blk); }
  for (const s of [-1, 1]) { const strip = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.04), cyanMat); strip.position.set(s * 0.047, 0.014, 0); chrono.add(strip);
    const strip2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 0.004), cyanMat); strip2.position.set(0, 0.014, s * 0.047); chrono.add(strip2); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.0022, 8, 64), cyanMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.0165; chrono.add(ring);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.035, 64), new THREE.MeshBasicMaterial({ map: dialTex, toneMapped: false, color: col('#c8c8c8') }));
  dial.rotation.x = -Math.PI / 2; dial.rotation.z = Math.PI * 1.5 + 1.15; dial.position.y = 0.0168; chrono.add(dial);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.035, 48), new THREE.MeshBasicMaterial({ map: glowTex, color: col('#9fefff'), transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false }));
  glass.rotation.x = -Math.PI / 2; glass.position.set(-0.008, 0.0175, -0.01); chrono.add(glass);
  const pl = new THREE.PointLight(col(P.cyan), 0.015, 0.15, 2); pl.position.y = 0.03; chrono.add(pl);
}
arm.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
function drawDial(timeLeft, barFrac, health, hitFlash) {
  const g = dctx, c = 256; g.clearRect(0, 0, 512, 512);
  const bg = g.createRadialGradient(c, c, 20, c, c, 256); bg.addColorStop(0, '#0b2a36'); bg.addColorStop(1, '#020a10'); g.fillStyle = bg; g.fillRect(0, 0, 512, 512);
  g.lineCap = 'round';
  for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; const r1 = i % 5 ? 222 : 210; g.strokeStyle = 'rgba(0,229,255,0.55)'; g.lineWidth = i % 5 ? 2 : 5;
    g.beginPath(); g.moveTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.lineTo(c + Math.cos(a) * 236, c + Math.sin(a) * 236); g.stroke(); }
  // health arc 270deg
  const a0 = Math.PI * 0.75, span = Math.PI * 1.5;
  g.strokeStyle = 'rgba(0,229,255,0.15)'; g.lineWidth = 18; g.beginPath(); g.arc(c, c, 186, a0, a0 + span); g.stroke();
  const hc = health > 99 ? P.cyan : mix(P.paramedicRed, '#ff8a5a', hitFlash);
  g.shadowColor = hc; g.shadowBlur = 18; g.strokeStyle = hc; g.beginPath(); g.arc(c, c, 186, a0, a0 + span * health / 100); g.stroke(); g.shadowBlur = 0;
  g.fillStyle = hc; g.font = '600 26px Rajdhani'; g.textAlign = 'center'; g.fillText('+ ' + Math.round(health), c, c + 200);
  // texts
  g.fillStyle = '#c8fbff'; g.font = '700 58px "Barlow Condensed"'; g.fillText('TIME LEFT', c, c - 58);
  const s = Math.max(0, Math.ceil(timeLeft)); g.shadowColor = P.cyan; g.shadowBlur = 16; g.fillStyle = '#e8fdff'; g.font = '700 92px Rajdhani';
  g.fillText(fmt(s), c, c + 32); g.shadowBlur = 0;
  g.fillStyle = 'rgba(200,64,46,0.25)'; g.fillRect(c - 140, c + 62, 280, 18);
  g.fillStyle = P.paramedicRed; g.shadowColor = '#ff3020'; g.shadowBlur = 12; g.fillRect(c - 140, c + 62, 280 * barFrac, 18); g.shadowBlur = 0;
  g.strokeStyle = '#ff6a50'; g.lineWidth = 2; g.strokeRect(c - 140, c + 62, 280, 18);
  dialTex.needsUpdate = true;
}
function fmt(s) { s = Math.max(0, Math.ceil(s)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }

// ---------- post-processing (painterly, no grain) ----------
setAniso(Math.min(renderer.capabilities.getMaxAnisotropy(), GFX === 'low' ? 4 : 16));
// MSAA render target (crisp edges instead of the old smear filter)
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: GFX === 'low' ? 0 : 4 }));
composer.addPass(new RenderPass(scene, camera));
const HQTEST = !/[?&]test=1/.test(location.search) || /hq=1/.test(location.search);
let gtao = null; if (GFX === 'high' && HQTEST && /[?&]ao=1/.test(location.search)) { gtao = new GTAOPass(scene, camera, innerWidth, innerHeight); gtao.blendIntensity = 0.45; gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 2, thickness: 1, scale: 1, distanceFallOff: 0.5 }); gtao.updatePdMaterial({ radius: 6, rings: 2, samples: 12 }); composer.addPass(gtao); }
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.28, 0.45, 0.9); composer.addPass(bloom);
composer.addPass(new OutputPass());
const paint = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, sunP: { value: new THREE.Vector3(0.5, 0.8, 0) }, shaft: { value: 0 }, sat: { value: 1.25 }, res: { value: new THREE.Vector2(1, 1) }, navy: { value: col(P.navy) }, lava: { value: col(P.lava) } },
  vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 res; uniform vec3 navy, lava, sunP; uniform float shaft, sat; varying vec2 vUv;
  void main(){ vec3 col=texture2D(tDiffuse,vUv).rgb;
    if (shaft > 0.0 && sunP.z > 0.0) { vec2 dv = (sunP.xy - vUv) / 14.0; vec2 uv = vUv; float acc = 0.0, w = 1.0;
      for (int i = 0; i < 14; i++) { uv += dv; vec3 c = texture2D(tDiffuse, clamp(uv, 0.001, 0.999)).rgb; acc += smoothstep(0.85, 1.0, dot(c, vec3(0.333))) * w; w *= 0.9; }
      float fall = 1.0 - smoothstep(0.0, 0.75, length((vUv - sunP.xy) * vec2(res.x / res.y, 1.0)));
      col += vec3(1.0, 0.82, 0.5) * acc / 14.0 * fall * 0.55 * shaft * sunP.z; }
    float l=dot(col,vec3(0.299,0.587,0.114));
    col = mix(col, col*0.8+navy*0.25, (1.0-smoothstep(0.0,0.3,l))*0.15);
    col = mix(col, col*vec3(1.06,0.98,0.9)+lava*0.04, smoothstep(0.4,1.0,l)*0.5);
    col = mix(vec3(dot(col,vec3(0.299,0.587,0.114))), col, sat); col *= vec3(1.05, 1.0, 0.92);
    
    gl_FragColor=vec4(col,1.0); }`
});
composer.addPass(paint);
const TEST = /[?&]test=1/.test(location.search);
const MOBILE = /[?&]touch=1/.test(location.search) || matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (MOBILE) document.body.classList.add('touch');
const touchMove = { on: false, x: 0, z: 0 };
const PR = { low: 1, medium: 1.5, high: 2 };
let pixelRatio = TEST && !/hq=1/.test(location.search) ? 0.5 : Math.min(devicePixelRatio || 1, PR[GFX]);
function resize() {
  renderer.setPixelRatio(pixelRatio); renderer.setSize(innerWidth, innerHeight, false); composer.setPixelRatio(pixelRatio); composer.setSize(innerWidth, innerHeight);
  paint.uniforms.res.value.set(innerWidth * pixelRatio, innerHeight * pixelRatio); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- ash & embers around the player ----------
function particleField(n, color, size, additive) {
  const g = new THREE.BufferGeometry(); const p = new Float32Array(n * 3), seeds = [];
  for (let i = 0; i < n; i++) seeds.push([R(0, 24), R(0, 10), R(0, 24), R(0.3, 1), R(0, 6.28)]);
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ map: glowTex, color: col(color), size, transparent: true, depthWrite: false, opacity: additive ? 1 : 0.75, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return { g, p, seeds, n, pts };
}
const ash = particleField(700, '#c8bcb4', 0.09, false), embers = particleField(220, '#ffa040', 0.07, true);
const wrap = (v, c) => c - 12 + (((v - c + 12) % 24) + 24) % 24;
function updateParticles(f, t, cx, cz, fall, rise) {
  for (let i = 0; i < f.n; i++) { const [x, y, z, sp, ph] = f.seeds[i];
    const yy = rise ? (y + t * sp * 1.2) % 10 : 10 - ((10 - y + t * sp * fall) % 10);
    f.p[i * 3] = wrap(x + Math.sin(t * sp + ph) * 0.4 + t * 0.3, cx); f.p[i * 3 + 1] = yy; f.p[i * 3 + 2] = wrap(z, cz); }
  f.g.attributes.position.needsUpdate = true;
}

// ---------- citizens (friendlier: faces, hair styles, colorful tunics) ----------
const skinMats = ['#e0a57e', '#b87a52', '#f0c29a', '#8a5a3a'].map(c => toon({ color: col(c) }, '#fff0d0', 2.5, 0.2));
const tunicMats = ['#ff4a36', '#2f9bff', '#ffc62e', '#3cd06a', '#b45cff', '#ff8a2e', '#fff2d8', '#ff5aa8', '#20c8c0', '#e8e040'].map(c => toon({ color: col(c) }, '#fff0d0', 2.5, 0.3));
const hairMats = ['#3a2214', '#7a4420', '#d8a040', '#b0aaa4', '#221812'].map(c => toon({ color: col(c) }, '#fff0d0', 3, 0.15));
const beltMat = toon({ color: col('#6a4424') }, '#fff0d0', 3, 0.2), bandMat = toon({ color: col('#f2efe6') }, '#fff0d0', 3, 0.2);
const eyeW = new THREE.MeshBasicMaterial({ color: col('#ffffff') }), eyeP = new THREE.MeshBasicMaterial({ color: col('#20140c') }), mouthM = new THREE.MeshBasicMaterial({ color: col('#7a2a20') });
const cheekM = new THREE.MeshBasicMaterial({ color: col('#f08a7a'), transparent: true, opacity: 0.55, depthWrite: false });
const bloodMat = new THREE.MeshBasicMaterial({ color: col('#6a0c08'), transparent: true, opacity: 0.8, depthWrite: false });
function makeCitizen(o) {
  const skin = skinMats[o.skin], tunic = tunicMats[o.tunic], hairM = hairMats[o.hair];
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const mk = (g, m, parent, x, y, z, sh = true) => { const q = new THREE.Mesh(g, m); q.position.set(x, y, z); q.castShadow = sh; parent.add(q); return q; };
  const legs = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.1, 0.9, 0); body.add(p); mk(new THREE.CapsuleGeometry(0.07, 0.68, 4, 10), skin, p, 0, -0.45, 0); mk(new THREE.BoxGeometry(0.12, 0.06, 0.24), beltMat, p, 0, -0.86, 0.04); return p; });
  mk(new THREE.CylinderGeometry(0.21, o.female ? 0.36 : 0.3, o.female ? 0.95 : 0.7, 14), tunic, body, 0, o.female ? 0.78 : 0.88, 0);
  mk(new THREE.CapsuleGeometry(0.18, 0.3, 4, 12), tunic, body, 0, 1.28, 0);
  mk(new THREE.TorusGeometry(0.2, 0.025, 6, 16), beltMat, body, 0, 1.08, 0).rotation.x = Math.PI / 2;
  const arms = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.25, 1.42, 0); body.add(p); mk(new THREE.CapsuleGeometry(0.055, 0.5, 4, 8), skin, p, 0, -0.3, 0); return p; });
  arms.forEach(a => mk(new THREE.SphereGeometry(0.06, 10, 8), skin, a, 0, -0.6, 0.01));
  const trim = tunicMats[(o.tunic + 3) % tunicMats.length];
  mk(new THREE.TorusGeometry(o.female ? 0.355 : 0.295, 0.02, 6, 20), trim, body, 0, o.female ? 0.31 : 0.54, 0).rotation.x = Math.PI / 2;
  if (o.female || o.beard) { const dr = mk(new THREE.TorusGeometry(0.22, 0.05, 6, 16, Math.PI * 1.2), trim, body, 0, 1.3, 0.02); dr.rotation.set(0.5, 0, o.female ? 0.6 : -0.9); }
  if (o.load === 'basket') { const bk = mk(new THREE.CylinderGeometry(0.2, 0.14, 0.14, 12), beltMat, body, 0, 1.86, 0); for (let i = 0; i < 4; i++) mk(new THREE.SphereGeometry(0.06, 8, 6), tunicMats[i % 3], bk, R(-0.08, 0.08), 0.09, R(-0.08, 0.08), false); }
  if (o.load === 'amphora') { const am = mk(amphoraGeo, terra, body, 0, 1.78, 0); am.scale.setScalar(0.55); }
  const band = mk(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 10), bandMat, arms[0], 0, -0.3, 0); band.visible = false;
  const head = new THREE.Group(); head.position.set(0, 1.6, 0); body.add(head);
  mk(new THREE.SphereGeometry(0.13, 18, 14), skin, head, 0, 0.04, 0);
  mk(new THREE.SphereGeometry(0.022, 8, 6), skin, head, 0, 0.03, 0.128); // nose
  const blink = []; for (const s of [-1, 1]) { blink.push(mk(new THREE.SphereGeometry(0.024, 10, 8), eyeW, head, s * 0.047, 0.07, 0.107, false)); mk(new THREE.SphereGeometry(0.02, 8, 6), cheekM, head, s * 0.075, 0.015, 0.1, false); mk(new THREE.SphereGeometry(0.013, 8, 6), eyeP, head, s * 0.047, 0.07, 0.128, false);
    const br = mk(new THREE.BoxGeometry(0.045, 0.01, 0.01), hairM, head, s * 0.047, 0.108, 0.118, false); br.rotation.z = s * 0.15;
    mk(new THREE.SphereGeometry(0.028, 8, 6), skin, head, s * 0.128, 0.04, 0); }
  const mouth = mk(new THREE.TorusGeometry(0.03, 0.007, 6, 12, Math.PI), mouthM, head, 0, -0.012, 0.118, false); mouth.rotation.z = Math.PI;
  const hs = o.style;
  if (hs !== 'bald') { const hair = mk(new THREE.SphereGeometry(0.14, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hairM, head, 0, 0.06, -0.02); hair.rotation.x = -0.35; }
  if (hs === 'bun') mk(new THREE.SphereGeometry(0.07, 10, 8), hairM, head, 0, 0.1, -0.14);
  if (hs === 'long') mk(new THREE.CapsuleGeometry(0.11, 0.18, 4, 10), hairM, head, 0, -0.08, -0.07);
  if (hs === 'curly') for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; mk(new THREE.SphereGeometry(0.05, 8, 6), hairM, head, Math.cos(a) * 0.11, 0.13 + Math.sin(i) * 0.02, Math.sin(a) * 0.1 - 0.02); }
  if (o.beard) mk(new THREE.SphereGeometry(0.08, 10, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), hairM, head, 0, 0.0, 0.05);
  if (o.wreath) mk(new THREE.TorusGeometry(0.135, 0.015, 6, 20), toon({ color: col('#6cc070') }, '#fff', 2, 0.2), head, 0, 0.12, 0).rotation.x = Math.PI / 2 - 0.2;
  return { root, body, legs, arms, head, band, blink, def: o };
}
const injuredDefs = [
  { name: 'Marcus', x: -3.4, z: -6, fx: 1, fz: 0, skin: 0, tunic: 0, hair: 0, style: 'short', beard: true, injury: 'cut', line: 'says it is "barely a scratch".' },
  { name: 'Lucius', x: -22, z: -26.3, fx: 0, fz: -1, skin: 1, tunic: 2, hair: 4, style: 'curly', injury: 'sprain', line: 'wants a second bandage "for style".' },
  { name: 'Octavia', x: 3.6, z: -32, fx: -1, fz: 0, skin: 3, tunic: 5, hair: 0, style: 'long', female: true, injury: 'smoke', line: 'coughs, then laughs. "Better than my husband\'s cooking."' },
  { name: 'Julia', x: -43.7, z: -63, fx: 1, fz: 0, skin: 2, tunic: 1, hair: 1, style: 'bun', female: true, injury: 'bleed', line: 'thanks you and asks if you are a god.' },
  { name: 'Quintus', x: -36, z: -38, fx: 1, fz: 0, skin: 0, tunic: 3, hair: 2, style: 'short', injury: 'unconscious', line: 'wakes up and asks who won the chariot race.' },
  { name: 'Aurelia', x: 21.0, z: -14, fx: 1, fz: 0, skin: 2, tunic: 4, hair: 2, style: 'long', female: true, injury: 'burn', line: 'was baking bread. The bread did not survive.' },
  { name: 'Felix', x: 21.2, z: 6, fx: 1, fz: 0, skin: 3, tunic: 3, hair: 0, style: 'short', injury: 'fracture', line: 'fell off a fig stall. Needs a lift.' },
  { name: 'Titus', x: 40, z: -33.8, fx: 0, fz: 1, skin: 1, tunic: 6, hair: 1, style: 'curly', beard: true, injury: 'cut', line: 'promises you free olives. Forever.' },
  { name: 'Livia', x: -3.8, z: -60, fx: 1, fz: 0, skin: 1, tunic: 1, hair: 4, style: 'bun', female: true, injury: 'smoke', line: 'breathes again and scolds the volcano.' },
  { name: 'Gaius', x: 21.0, z: -52, fx: 1, fz: 0, skin: 1, tunic: 5, hair: 3, style: 'bald', beard: true, injury: 'bleed', line: 'is a senator and expects a discount.' },
  { name: 'Cornelia', x: 25, z: -70, fx: 0, fz: 1, skin: 0, tunic: 6, hair: 1, style: 'bun', female: true, wreath: true, injury: 'cardiac', line: 'is back! Her heart is beating again.' },
];
const NINJ = injuredDefs.length;
const citizens = injuredDefs.map(d => {
  const c = makeCitizen(d); scene.add(c.root);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), bloodMat); pool.rotation.x = -Math.PI / 2; pool.scale.set(1, 0.7, 1); pool.position.set(d.x + d.fx * 0.45, 0.07, d.z + d.fz * 0.45); pool.visible = d.injury === 'bleed' || d.injury === 'cut'; scene.add(pool);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 40), new THREE.MeshBasicMaterial({ color: col('#ff5a3a'), transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(d.x, 0.1, d.z); scene.add(ring);
  return { ...d, ...c, pool, ring, state: 'injured', pos: new THREE.Vector2(d.x, d.z), yaw: Math.atan2(d.fx, d.fz), phase: R(0, 6), rank: -1, savedSpot: null };
});
function poseCitizen(c, t, dt) {
  const { body, legs, arms, head } = c; body.rotation.y = 0;
  if (c.state === 'injured' || c.state === 'down') {
    const pz = INJURIES[c.injury].pose, lying = pz === 'lie' && c.state === 'injured';
    body.position.y = lying ? -0.0 : -0.52; body.rotation.x = lying ? -Math.PI / 2 : -0.18; if (lying) body.position.y = 0.2;
    legs.forEach((l, i) => { l.rotation.x = lying ? 0 : -1.45; l.rotation.z = (i ? -1 : 1) * 0.12; });
    arms[0].rotation.set(-0.9, 0, 0.5); const wave = lying ? 0 : Math.max(0, Math.sin(t * 1.3 + c.phase)) ** 3; arms[1].rotation.set(lying ? 0 : -2.6 * wave - 0.3, 0, -0.2 - 0.3 * wave);
    head.rotation.set(0.1 + (lying ? 0 : Math.sin(t * 2 + c.phase) * 0.06), lying ? 0 : Math.sin(t * 0.7 + c.phase) * 0.3, 0); body.rotation.z = lying ? 0 : Math.sin(t * 2.2 + c.phase) * 0.03;
    if (pz === 'cough' && c.state === 'injured') { const k = Math.max(0, Math.sin(t * 3.1 + c.phase)) ** 6; body.rotation.x = -0.1 + 0.35 * k; arms[1].rotation.set(-2.2, 0, -0.6); head.rotation.x = 0.35 * k; }
    if (c.blink) { const bl = (t * 0.7 + c.phase) % 4 < 0.12 || lying ? 0.1 : 1; c.blink.forEach(e => e.scale.y = bl); }
  } else if (c.state === 'carried') {
    const [fx, fz] = fwd(); c.pos.set(player.x - fx * 0.55, player.z - fz * 0.55); c.yaw = player.yaw + Math.PI / 2;
    body.position.y = (carryStretcher() ? 0.25 : 0.55) + player.y; body.rotation.x = 0; body.rotation.z = Math.PI / 2; legs.forEach(l => l.rotation.x = 0); arms.forEach(a => a.rotation.set(0, 0, 0.2)); body.position.x = 0;
  } else {
    body.rotation.z = 0; body.position.x = 0;
    const sp = c.speed || 0, k = clamp(sp / 4); c.phase += dt * (2 + sp * 1.6);
    body.position.y = THREE.MathUtils.damp(body.position.y, Math.abs(Math.sin(c.phase)) * 0.05 * k, 12, dt); body.rotation.x = 0.12 * k;
    legs.forEach((l, i) => { l.rotation.x = Math.sin(c.phase + i * Math.PI) * 0.7 * k; l.rotation.z = 0; });
    arms.forEach((a, i) => a.rotation.set(-Math.sin(c.phase + i * Math.PI) * 0.6 * k, 0, (i ? -1 : 1) * 0.08));
    if (c.state === 'saved' && k < 0.1) arms[1].rotation.set(-2.7 + Math.sin(t * 6) * 0.2, 0, -0.3);
    head.rotation.set(Math.sin(t * 1.5 + c.phase) * 0.03, 0, 0);
  }
  c.ring.visible = c.state === 'injured' || c.state === 'down'; if (c.ring.visible) { c.ring.position.set(c.pos.x, 0.1, c.pos.y); c.ring.scale.setScalar(1 + 0.15 * Math.sin(t * 4)); c.ring.material.color.set(c.state === 'down' ? P.cyan : '#ff5a3a'); }
  c.root.position.set(c.pos.x, 0, c.pos.y); c.root.rotation.y = c.yaw; animModel(c, dt, 0);
}
// ---------- debris hazard ----------
const rockGeo = new THREE.IcosahedronGeometry(0.55, 2);
{ const p = rockGeo.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.85 + 0.18 * Math.sin(p.getX(i) * 9 + p.getY(i) * 7) + 0.08 * Math.sin(p.getZ(i) * 23 + p.getX(i) * 17); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.75, p.getZ(i) * k); } rockGeo.computeVertexNormals(); }
const shadowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const debrisList = [];
const dustSprites = [];
for (let i = 0; i < 30; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: col('#a08070'), transparent: true, opacity: 0, depthWrite: false })); s.visible = false; scene.add(s); dustSprites.push({ s, t: -9, a: 0, v: 0, u: 0, x: 0, z: 0 }); }
let dustIdx = 0;
function spawnDebris(x, z) {
  const rock = new THREE.Mesh(rockGeo, rubMat); rock.castShadow = true; rock.scale.setScalar(R(0.7, 1.2)); rock.visible = false; scene.add(rock);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(1.6, 32), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.set(x, 0.09, z); scene.add(sh);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.62, 40), new THREE.MeshBasicMaterial({ color: col('#ff5a3a'), transparent: true, opacity: 0.0, depthWrite: false, toneMapped: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.1, z); scene.add(ring);
  debrisList.push({ x, z, t: 0, dur: 1.6, rock, sh, ring, landed: false, spin: [R(-6, 6), R(-6, 6)] });
  Sfx.whistle();
}


// ---------- pickups, fountains, fires, ash zones ----------
const amphoraGeo = new THREE.LatheGeometry([[0, 0], [0.12, 0.02], [0.2, 0.2], [0.22, 0.35], [0.16, 0.55], [0.07, 0.62], [0.08, 0.72], [0, 0.72]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
const terra = toon({ color: col('#d0784a') }, '#fff0d0', 2.5, 0.3), grapeM = toon({ color: col('#7a3aa0') }, '#fff', 2.5, 0.3), figM = toon({ color: col('#8a5a7a') }, '#fff', 2.5, 0.3), breadM = toon({ color: col('#d8a050') }, '#fff', 2.5, 0.3), basketM = toon({ color: col('#b08850') }, '#fff', 2.5, 0.2);
const pickups = [];
function addPickup(kind, x, z, y = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  if (kind === 'amphora') { const m = new THREE.Mesh(amphoraGeo, terra); m.castShadow = true; g.add(m); }
  else { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.12, 12), basketM); b.position.y = 0.06; g.add(b);
    const mat = kind === 'grapes' ? grapeM : kind === 'figs' ? figM : breadM;
    for (let i = 0; i < (kind === 'bread' ? 2 : 7); i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(kind === 'bread' ? 0.11 : 0.055, 10, 8), mat); s.position.set(R(-0.1, 0.1), 0.15 + R(0, 0.06), R(-0.1, 0.1)); if (kind === 'bread') s.scale.set(1.3, 0.6, 1); g.add(s); } }
  pickups.push({ kind, x, z, g, taken: false });
}
stalls.forEach(([x, z], i) => { addPickup(['figs', 'grapes', 'bread', 'grapes'][i % 4], x + 0.95, z - 0.6, 0.9); addPickup(['bread', 'figs', 'figs', 'bread'][i % 4], x + 0.95, z + 0.6, 0.9); });
for (const [x, z] of [[-4, -8], [4.2, -38], [-30, -33.8], [-44, -36], [22, -30], [29, -47], [55, -20], [-4.2, -62], [-36, -60]]) addPickup('amphora', x, z);
for (const [k, x, z] of [['figs', 4, -2], ['bread', -4.2, -24], ['grapes', -36, -40], ['bread', 21, -60]]) addPickup(k, x, z);
const ashZones = [[0, -58, 9], [-40, -58, 7], [25, -64, 9], [-24, -30, 5]];
for (const [x, z, r] of ashZones) for (let i = 0; i < 7; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: col('#9a928c'), transparent: true, opacity: 0.5, depthWrite: false })); const a = R(0, 6.28), d = R(0, r * 0.7); s.position.set(x + Math.cos(a) * d, R(1, 3), z + Math.sin(a) * d); const k = R(4, 7); s.scale.set(k, k, 1); scene.add(s); }
const fireObjs = fires.map(([x, z]) => { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g); colliders.push({ x, z, r: 0.7 });
  for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.12, 0.14, 1, 0.03), woodMat); l.rotation.y = i; l.position.y = 0.08; g.add(l); }
  const fl = []; for (let i = 0; i < 4; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col(i % 2 ? '#ffb040' : '#ff6a20'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); g.add(s); fl.push(s); }
  const L = new THREE.PointLight(col('#ff8a3a'), 6, 9, 1.6); L.position.y = 1.2; g.add(L); return { x, z, fl, L }; });
// carried stretcher / vehicles held in front of camera
const gear = new THREE.Group(); camera.add(gear);
const stretcherV = new THREE.Group(); gear.add(stretcherV);
for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8), woodMat); p.rotation.x = Math.PI / 2 - 0.3; p.position.set(s * 0.32, -0.62, -0.5); stretcherV.add(p); }
const cartV = new THREE.Group(); gear.add(cartV);
{ const b = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.35, 0.9, 2, 0.04), woodMat); b.position.set(0, -0.95, -1.5); cartV.add(b); for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 8), woodMat); h.rotation.x = Math.PI / 2; h.position.set(s * 0.35, -0.7, -0.75); cartV.add(h); const w = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 6, 16), woodMat); w.rotation.y = Math.PI / 2; w.position.set(s * 0.55, -1.1, -1.5); cartV.add(w); } }
const horseV = new THREE.Group(); gear.add(horseV);
{ const hm = toon({ color: col('#7a4a2a') }, '#fff', 2.5, 0.2); const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.2, 4, 12), hm); b.rotation.x = Math.PI / 2; b.position.set(0, -0.6, -3.2); horseV.add(b);
  const n = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.6, 4, 10), hm); n.position.set(0, -0.1, -3.9); n.rotation.x = 0.7; horseV.add(n); const h = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.3, 4, 10), hm); h.position.set(0, 0.15, -4.25); h.rotation.x = 1.4; horseV.add(h);
  for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), woodMat); r.rotation.x = Math.PI / 2; r.position.set(s * 0.5, -0.75, -2); horseV.add(r); } }
gear.traverse(o => { if (o.isMesh) o.castShadow = false; });

// ---------- arm visibility helpers ----------
const rest = new THREE.Vector3(-0.06, -0.15, -0.45), off = new THREE.Vector3(-0.28, -0.42, -0.3);

// ================= PERSISTENCE / ECONOMY =================
const SAVE_KEY = 'adam_time_medic_v2';
const defSave = () => ({ credits: 100, owned: {}, upg: { stamina: 0, speed: 0, heat: 0, carry: 0 }, stash: {}, best: 0, runs: 0 });
let save = (() => { try { return Object.assign(defSave(), JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) { return defSave(); } })();
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } };
const UPG = { stamina: { name: 'Lungs of Steel', d: '+25% max stamina', base: 60 }, speed: { name: 'Sandals of Mercury', d: '+8% move speed', base: 70 }, heat: { name: 'Cool Cape', d: '−30% heat gain', base: 60 }, carry: { name: 'Big Pockets', d: '+4 per item stack, +1 follower', base: 50 } };
const VEH = { stretcher: { name: 'Stretcher', d: 'Carry the injured faster (×0.85 instead of ×0.65)', price: 60 }, cart: { name: 'Hand cart', d: 'V: ride ×1.3, carries 1 injured', price: 120 }, horse: { name: 'Horse cart', d: 'V: ride ×1.8, carries 1 injured', price: 300 } };
const upgPrice = k => UPG[k].base * (save.upg[k] + 1);

// ================= GAME STATE =================
const $ = id => document.getElementById(id);
const G = { state: 'start', locked: false };
const player = { x: 0, z: 9, yaw: 0, pitch: 0, phase: 0, speed: 0, vx: 0, vz: 0, eyeDrop: 0, y: 0, vy: 0, crouch: 0, riding: null };
let crumbs = [], inv = new Inventory(), sel = 0, carried = null;
const keys = {};
const V = { hp: 100, stamina: 100, pulse: 72, air: 100, hunger: 100, thirst: 100, temp: 36.8 };
const staMax = () => 100 * (1 + 0.25 * save.upg.stamina);
const START_INV = { plaster: 5, bandage: 4, kit: 1, splint: 1, water: 3, food: 2, mask: 1, salts: 1 };
// fog of war grid for the map (2 m cells) — later shareable between co-op players
const MAP = { x0: -52, x1: 70, z0: -86, z1: 18, cell: 2 }; MAP.w = Math.ceil((MAP.x1 - MAP.x0) / MAP.cell); MAP.h = Math.ceil((MAP.z1 - MAP.z0) / MAP.cell);
let fog = new Uint8Array(MAP.w * MAP.h);
function reset() {
  Object.assign(G, { warned: false, waveZ: 0, tut: null, t: 0, timeLeft: GAME.duration, saved: 0, treated: 0, dodged: 0, hits: 0, nextDebris: 30, shake: 0, hitFlash: 0, look: 0, interactHold: 0, end: null, endT: 0, toastT: 0, objT: 0, checkT: 0, medic: null, earned: 0, exhausted: false, breathT: 0, coughT: 0, heartT: 0, district: '', distT: 0, masked: false, gateOpen: false, hotT: 0, mapOpen: false });
  Object.assign(V, { hp: 100, stamina: staMax(), pulse: 72, air: 100, hunger: 100, thirst: 100, temp: 36.8 });
  Object.assign(player, { x: 0, z: 9, yaw: 0, pitch: 0, phase: 0, speed: 0, eyeDrop: 0, roll: 0, y: 0, vy: 0, crouch: 0, riding: null });
  inv = new Inventory(START_INV, 12 + 4 * save.upg.carry); for (const [k, n] of Object.entries(save.stash)) inv.add(k, n); save.stash = {};
  if (save.owned.defib) inv.add('defib', 1); persist(); sel = 0; carried = null;
  crumbs = [[0, 9]]; fog = new Uint8Array(MAP.w * MAP.h);
  for (const c of citizens) { c.state = 'injured'; c.pos.set(c.x, c.z); c.yaw = Math.atan2(c.fx, c.fz); c.rank = -1; c.band.visible = false; c.pool.visible = c.injury === 'bleed' || c.injury === 'cut'; c.speed = 0; }
  for (const p of pickups) { p.taken = false; p.g.visible = true; }
  for (const b of blockers) if (b.type === 'gate') { b.active = true; b.meshes.forEach(m => m.visible = true); }
  for (const d of debrisList) { scene.remove(d.rock, d.sh, d.ring); } debrisList.length = 0;
  wall.visible = false; $('fade').style.opacity = 0; $('vignette').style.opacity = 0; $('medic').classList.add('hidden'); $('map').classList.add('hidden');
  updateObjective(); $('objective').classList.add('off'); $('checkpoint').style.opacity = 1; buildHotbar();
}
function toast(text, dur = 2.4) { const el = $('toast'); el.textContent = text; el.style.opacity = 1; G.toastT = dur; }
function updateObjective() {
  const left = citizens.filter(c => c.state === 'injured' || c.state === 'down').length;
  $('objSub').textContent = `Injured treated ${G.treated}/${NINJ} · Saved ${G.saved}/${NINJ}${G.gateOpen ? '' : ' · Temple opens at 3 saved'}`;
  document.querySelector('#objective .obj-text').textContent = left === 0 ? 'Lead the survivors to the harbor' : 'Save the injured and reach the harbor';
}
// ---------- pyroclastic wall ----------
const wall = new THREE.Group(); scene.add(wall); wall.visible = false;
for (let i = 0; i < 60; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: col(i % 4 ? '#3a2620' : '#9a4a22'), transparent: true, opacity: 0.95, depthWrite: false, fog: false })); s.position.set(R(-80, 80), R(0, 70), R(-10, 10)); const k = R(25, 55); s.scale.set(k, k, 1); wall.add(s); }


// ---------- input ----------
const canvas = renderer.domElement;
addEventListener('keydown', e => {
  if (e.code === 'Tab') e.preventDefault();
  if (e.repeat) { keys[e.code] = true; return; }
  keys[e.code] = true;
  if (e.code === 'Escape' && G.state === 'play' && !G.locked) pause();
  if (G.state === 'intro') { if (e.code === 'Space' || e.code === 'Escape' || e.code === 'Enter') endIntro(); e.preventDefault(); return; }
  if (G.state === 'medic') medicKey(e.code); else onKey(e.code);
  if (e.code === 'Space' || /^Digit/.test(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('mousemove', e => {
  if (!G.locked || (G.state !== 'play' && G.state !== 'medic')) return;
  player.yaw -= e.movementX * 0.0022; player.pitch = clamp(player.pitch - e.movementY * 0.0022, -1.35, 1.35);
});
addEventListener('pointerdown', e => { if (G.state === 'medic' && e.button === 0 && !(e.target.closest && e.target.closest('.tmk'))) { e.preventDefault(); medicKey('Space'); } });
document.addEventListener('pointerlockchange', () => {
  G.locked = document.pointerLockElement === canvas;
  if (!G.locked && (G.state === 'play' || G.state === 'medic')) pause();
});
function lock() { if (MOBILE) return; try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { } }


// ---------- screens ----------
function screen(kind) {
  const s = $('screen'); s.classList.remove('hidden');
  const set = (k, t, sub, body, btn) => { $('sKicker').textContent = k; $('sTitle').textContent = t; $('sSub').textContent = sub; $('sBody').innerHTML = body; $('sBtn').textContent = btn; };
  const stats = () => `<div class="stats"><span>Citizens saved</span><b>${G.saved} / ${NINJ}</b><span>Time left</span><b>${fmt(G.timeLeft)}</b><span>Health</span><b>${Math.round(V.hp)}</b><span>Chrono credits earned</span><b>+${G.earned} ⌛</b><span>Total credits</span><b>${save.credits} ⌛</b></div>`;
  if (kind === 'pause') set('PAUSED', 'ADAM: TIME MEDIC', 'Pompeii, 79 AD', $('sBody').dataset.controls, MOBILE ? 'TAP TO RESUME' : 'CLICK TO RESUME');
  const why = { hp: 'Adam ran out of health', time: 'Time ran out', }[G.end] || '';
  if (kind === 'over') set(G.end === 'hp' ? 'ADAM IS DOWN' : 'THE SURGE HIT POMPEII', 'GAME OVER', why, stats(), 'REWIND');
  if (kind === 'win') set(G.saved === NINJ ? 'ALL SURVIVORS SAVED' : 'ESCAPED BY SEA', 'MISSION COMPLETE', 'The Time Rescue Service is mildly impressed', stats(), 'PLAY AGAIN');
  $('sShop').classList.toggle('hidden', kind === 'pause');
  if (kind === 'pause') addSettings();
  s.dataset.kind = kind;
}
$('sBody').dataset.controls = $('sBody').innerHTML.replace(/<p>[\s\S]*?<\/p>/, '');
$('sBtn').addEventListener('click', () => {
  Sfx.init(); const kind = $('screen').dataset.kind || 'start';
  if (kind === 'start' || kind === 'over' || kind === 'win') { reset(); $('screen').classList.add('hidden'); lock(); startIntro(); return; }
  else if (kind === 'pause') G.state = G.medic ? 'medic' : 'play';
  $('screen').classList.add('hidden'); $('hud').classList.remove('hidden'); lock();
});
$('sShop').addEventListener('click', () => { Sfx.init(); openShop(false); });
function pause() { if (G.state !== 'play' && G.state !== 'medic') return; G.state = 'paused'; screen('pause'); }
// ---------- depot shop ----------
let shopInRun = false;
function openShop(inRun) { shopInRun = inRun; if (inRun) { G.state = 'shop'; if (document.pointerLockElement) document.exitPointerLock(); } renderShop(); $('shop').classList.remove('hidden'); }
function closeShop() { $('shop').classList.add('hidden'); if (shopInRun) { G.state = 'play'; buildHotbar(); lock(); } }
$('shopClose').addEventListener('click', closeShop);
function buy(kind, id) {
  let price = 0;
  if (kind === 'item') price = ITEMS[id].price; else if (kind === 'upg') price = upgPrice(id); else price = VEH[id].price;
  if (save.credits < price) { Sfx.fail(); return; }
  if (kind === 'item') { if (id === 'defib') save.owned.defib = 1; if (shopInRun) { if (!inv.add(id, 1)) return; } else save.stash[id] = Math.min(12, (save.stash[id] || 0) + 1); }
  else if (kind === 'upg') { if (save.upg[id] >= 3) return; save.upg[id]++; if (shopInRun) { inv.cap = 12 + 4 * save.upg.carry; } }
  else { if (save.owned[id]) return; save.owned[id] = 1; }
  save.credits -= price; persist(); Sfx.coin(); renderShop(); buildHotbar();
}
function renderShop() {
  $('shopCr').textContent = `${save.credits} ⌛`;
  const card = (t, d, p, dis, on) => `<div class="si"><div class="t">${t}</div><div class="d">${d}</div><button ${dis ? 'disabled' : ''} data-on="${on}">${p}</button></div>`;
  const items = HOTBAR.map(id => { const it = ITEMS[id]; const own = shopInRun ? inv.count(id) : (save.stash[id] || 0); const perm = id === 'defib' && save.owned.defib;
    return card(`${it.icon} ${it.name}`, it.treats ? `Treats: ${it.treats.map(k => INJURIES[k].label).join(', ')} · speed ${'★'.repeat(it.tier)}${it.consumable ? '' : ' · reusable'}` : it.kind === 'use' ? 'Consumable' : 'Wear: cleaner air', perm ? 'OWNED' : `${it.price} ⌛ · have ${own}`, perm || save.credits < it.price, `item:${id}`); }).join('');
  const upg = Object.entries(UPG).map(([k, u]) => card(`${u.name} ${'●'.repeat(save.upg[k])}${'○'.repeat(3 - save.upg[k])}`, u.d, save.upg[k] >= 3 ? 'MAX' : `${upgPrice(k)} ⌛`, save.upg[k] >= 3 || save.credits < upgPrice(k), `upg:${k}`)).join('');
  const veh = Object.entries(VEH).map(([k, v]) => card(v.name, v.d, save.owned[k] ? 'OWNED' : `${v.price} ⌛`, save.owned[k] || save.credits < v.price, `veh:${k}`)).join('');
  $('shopBody').innerHTML = `<h3>TOOLS & SUPPLIES</h3><div class="sg">${items}</div><h3>UPGRADES</h3><div class="sg">${upg}</div><h3>TRANSPORT</h3><div class="sg">${veh}</div><div class="shop-note">Coming in Chapter II (Titanic, 1912): lifeboat & bathyscaphe.</div>`;
  $('shopBody').querySelectorAll('button[data-on]').forEach(b => b.addEventListener('click', () => { const [k, id] = b.dataset.on.split(':'); buy(k, id); }));
}
// ---------- hotbar ----------
function buildHotbar() {
  $('hotbar').innerHTML = HOTBAR.map((id, i) => { const n = inv.count(id); return `<div class="hs ${i === sel ? 'sel' : ''} ${n ? '' : 'empty'} ${id === 'mask' && G.masked ? 'on' : ''}"><span class="n">${i + 1}</span>${ITEMS[id].icon}<span class="c">${ITEMS[id].consumable ? n : (n ? '✓' : '')}</span></div>`; }).join('');
  $('credits').textContent = `${save.credits} ⌛`;
}
function selectSlot(i) { sel = i; buildHotbar(); const id = HOTBAR[i]; $('hotname').textContent = `${ITEMS[id].name.toUpperCase()} ×${inv.count(id)}`; $('hotname').style.opacity = 1; G.hotT = 1.6; }
function useSelected() {
  const id = HOTBAR[sel], it = ITEMS[id]; if (!inv.has(id)) { toast(`NO ${it.name.toUpperCase()} LEFT`); Sfx.fail(); return; }
  if (it.kind === 'use') { inv.remove(id); if (it.thirst) { V.thirst = Math.min(100, V.thirst + it.thirst); V.temp -= it.cool; Sfx.drink(); toast('GLUG GLUG. REFRESHING'); } if (it.hunger) { V.hunger = Math.min(100, V.hunger + it.hunger); V.hp = Math.min(100, V.hp + it.heal); Sfx.eat(); toast('BREAD! +HEALTH'); } }
  else if (it.kind === 'wear') { G.masked = !G.masked; toast(G.masked ? 'MASK ON — EASIER TO BREATHE' : 'MASK OFF'); Sfx.tick(); }
  else toast(`${it.name.toUpperCase()}: USE ON AN INJURED PERSON (E)`);
  buildHotbar();
}
// ---------- medic mini-game (difficulty depends on the tool) ----------
function startMedic(c, tool) {
  const T = ITEMS[tool]; G.state = 'medic'; G.medic = { c, tool, need: T.hits, nkeys: T.keys, step: 'pressure', hits: 0, zone: R(0.25, 0.75), w: T.zone, speed: 2.0, t: 0, seq: [], idx: 0 };
  $('medic').classList.remove('hidden'); $('mPressure').classList.remove('hidden'); $('mBandage').classList.add('hidden'); $('mStep').textContent = `${c.name} — ${INJURIES[c.injury].label} · ${T.icon} ${T.name}`; $('mPen').textContent = ''; $('mHits').textContent = `0/${T.hits}`;
  Sfx.chime();
}
function medicMarker() { const m = G.medic; return 0.5 + 0.48 * Math.sin((m.ph || 0) + m.t * m.speed); }
let _mLast = 0;
function penalty(sec, msg) { G.timeLeft -= sec; $('mPen').textContent = `${msg}  −${sec}s`; const el = $('medic'); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); Sfx.fail(); }
function medicKey(code) {
  const m = G.medic; if (!m) return;
  if (m.step === 'pressure' && code === 'Space') {
    const now = performance.now(); if (now - _mLast < 180) return; _mLast = now; // ignore duplicate events (touch + synthetic mouse, key + click)
    const tol = m.w / 2 + 0.035, cur = medicMarker(); // forgiving: anything the player SAW in the last ~220 ms (input/frame latency) or the current position
    const seen = (m.hist || []).some(([ts, v]) => now - ts < 220 && Math.abs(v - m.zone) < tol);
    if (seen || Math.abs(cur - m.zone) < tol) { m.hist = []; m.hits++; Sfx.hit(); $('mHits').textContent = `${m.hits}/${m.need}`; $('mPen').textContent = '';
      m.zone = R(0.2, 0.8); m.w = Math.max(0.14, m.w - 0.015); { const p = (m.ph || 0) + m.t * m.speed; m.speed += 0.25; m.ph = p - m.t * m.speed; }
      if (m.hits >= m.need) { m.step = 'bandage'; m.seq = Array.from({ length: m.nkeys }, () => ['KeyW', 'KeyA', 'KeyS', 'KeyD'][Math.floor(Math.random() * 4)]); m.idx = 0;
        $('mPressure').classList.add('hidden'); $('mBandage').classList.remove('hidden'); $('mStep').textContent = `${m.c.name} — ${m.tool === 'defib' ? 'Charge & shock' : m.tool === 'splint' ? 'Fix the splint' : 'Dress the wound'}`; drawKeys(); }
    } else penalty(3, 'MISSED');
  } else if (m.step === 'bandage' && /^Key[WASD]$/.test(code)) {
    if (code === m.seq[m.idx]) { m.idx++; Sfx.tick(); drawKeys(); if (m.idx >= m.seq.length) finishMedic(); }
    else { m.idx = 0; drawKeys(); penalty(2, 'WRONG KEY'); }
  }
}
function drawKeys() { const m = G.medic; $('mKeys').innerHTML = m.seq.map((k, i) => `<span class="key ${i < m.idx ? 'done' : i === m.idx ? 'cur' : ''}">${k.slice(3)}</span>`).join(''); }
function finishMedic() {
  const { c, tool } = G.medic; G.medic = null; if (tool === 'defib') Sfx.zap(); else if (['plaster', 'bandage', 'kit', 'splint'].includes(tool)) Sfx.rip(); else Sfx.drink(); $('medic').classList.add('hidden'); G.state = 'play';
  if (ITEMS[tool].consumable) inv.remove(tool); buildHotbar();
  c.band.visible = true; c.pool.visible = false; G.treated++;
  if (INJURIES[c.injury].walk && followers().length < maxFollowers()) { c.state = 'follow'; c.rank = followers().length - 1; toast(`${c.name.toUpperCase()} ${c.line.toUpperCase()}`, 3.2); }
  else { c.state = 'down'; toast(INJURIES[c.injury].walk ? `${c.name.toUpperCase()} WAITS — TOO MANY FOLLOWERS. COME BACK!` : `${c.name.toUpperCase()} ${c.line.toUpperCase()} PICK UP: E`, 3.2); }
  Sfx.success(); updateObjective();
}
window.__medicSolve = () => { const m = G.medic; if (!m) return; while (G.medic && G.medic.step === 'pressure') { m.t = (Math.asin(clamp((m.zone - 0.5) / 0.48, -1, 1)) - (m.ph || 0)) / m.speed; m.shown = null; m.hist = []; _mLast = 0; medicKey('Space'); } if (G.medic) for (const k of [...G.medic.seq]) medicKey(k); };
const followers = () => citizens.filter(o => o.state === 'follow');
const maxFollowers = () => 3 + save.upg.carry;
const carryStretcher = () => !!save.owned.stretcher;

// ================= UPDATE =================
const fwd = () => [-Math.sin(player.yaw), -Math.cos(player.yaw)];
function damage(n, silent) {
  if (G.state !== 'play' && G.state !== 'medic') return;
  V.hp = Math.max(0, V.hp - n); if (!silent) { G.hits++; G.hitFlash = 1; G.shake = Math.max(G.shake, 0.08); Sfx.hurt(); }
  if (V.hp <= 0) endGame('hp');
}
function endGame(reason) {
  if (G.end) return; G.end = reason; G.endT = 0; G.state = reason === 'win' ? 'winning' : (reason === 'time' ? 'wave' : 'dying');
  G.medic = null; $('medic').classList.add('hidden'); $('map').classList.add('hidden');
  if (reason === 'time') { wall.visible = true; Sfx.wave(); }
  if (reason === 'win') { const bonus = Math.round(G.timeLeft / 3) + (G.saved === NINJ ? 100 : 0); G.earned += bonus; save.credits += bonus; }
  save.best = Math.max(save.best, G.saved); persist();
}
const inAsh = (x, z) => ashZones.reduce((a, [ax, az, r]) => Math.max(a, 1 - Math.hypot(x - ax, z - az) / r), 0);
function updatePlayer(dt) {
  const canMove = G.state === 'play';
  let mx = 0, mz = 0;
  if (canMove && touchMove.on) { mx = touchMove.x; mz = touchMove.z; }
  if (canMove) { if (keys.KeyW) mz += 1; if (keys.KeyS) mz -= 1; if (keys.KeyA) mx -= 1; if (keys.KeyD) mx += 1; }
  const moving = mx || mz;
  const wantCrouch = canMove && (keys.KeyC || keys.ControlLeft || keys.ControlRight) && !player.riding;
  // can't stand up under a beam
  const underBeam = blockedBy(player.x, player.z, 0.35, { crouch: false, y: player.y }) && blockedBy(player.x, player.z, 0.35, { crouch: false, y: player.y }).type === 'beam';
  player.crouch = THREE.MathUtils.damp(player.crouch, wantCrouch || underBeam ? 1 : 0, 12, dt);
  const crouched = player.crouch > 0.5;
  const sprint = moving && (keys.ShiftLeft || keys.ShiftRight) && !G.exhausted && V.stamina > 1 && mz >= 0 && !crouched && !carried && !player.riding;
  if (sprint) { V.stamina = Math.max(0, V.stamina - 18 * dt); G.staminaCd = 0.9; if (V.stamina <= 0) { G.exhausted = true; toast('OUT OF BREATH — WAIT A MOMENT', 2); } }
  else { G.staminaCd = (G.staminaCd || 0) - dt; if (G.staminaCd <= 0) V.stamina = Math.min(staMax(), V.stamina + (V.air < 40 ? 6 : 15) * dt * (V.hunger > 0 ? 1 : 0.5)); }
  if (G.exhausted && V.stamina > staMax() * 0.35) G.exhausted = false;
  // jump / vault
  const onGround = player.y <= 0.0001;
  if (canMove && (G.jumpReq > 0) && onGround && !crouched && !player.riding && V.stamina > 5) { player.vy = 5.2; V.stamina -= 5; Sfx.jump(); G.jumpReq = 0;
    const [fx, fz] = fwd(); const ahead = blockedBy(player.x + fx * 1.2, player.z + fz * 1.2, 0.35, { crouch: true, y: 0 }); if (ahead && ahead.type === 'low') { player.vx += fx * 2.5; player.vz += fz * 2.5; G.vaults = (G.vaults || 0) + 1; } }
  G.jumpReq = Math.max(0, (G.jumpReq || 0) - dt);
  player.vy -= 13 * dt; player.y = Math.max(0, player.y + player.vy * dt); if (player.y === 0) player.vy = 0;
  const upK = 1 + 0.08 * save.upg.speed;
  const hpK = 0.75 + 0.25 * V.hp / 100, lookK = 1 - 0.4 * G.look, crK = lerp(1, 0.45, player.crouch);
  const carryK = carried && !player.riding ? (carryStretcher() ? 0.85 : 0.65) : 1;
  const rideK = player.riding === 'horse' ? 1.8 : player.riding === 'cart' ? 1.3 : 1;
  const base = sprint ? GAME.sprint : GAME.walk * (G.exhausted ? 0.8 : 1);
  const speed = base * hpK * lookK * crK * carryK * rideK * upK;
  const [fx, fz] = fwd(); const rx = -fz, rz = fx; const len = Math.hypot(mx, mz) || 1;
  const tvx = (fx * mz + rx * mx) / len * speed * (moving ? 1 : 0), tvz = (fz * mz + rz * mx) / len * speed * (moving ? 1 : 0);
  player.vx = THREE.MathUtils.damp(player.vx, tvx, onGround ? 10 : 2, dt); player.vz = THREE.MathUtils.damp(player.vz, tvz, onGround ? 10 : 2, dt);
  const ctx = { crouch: crouched, y: player.y };
  const [nx, nz] = resolve(player.x, player.z, player.x + player.vx * dt, player.z + player.vz * dt, player.riding ? 0.6 : 0.35, ctx);
  const moved = Math.hypot(nx - player.x, nz - player.z); player.x = nx; player.z = nz; player.speed = moved / Math.max(dt, 1e-4);
  const prev = player.phase; player.phase += moved * (crouched ? 0.9 : 0.62);
  if (onGround && Math.floor(prev + 0.5) !== Math.floor(player.phase + 0.5)) Sfx.stepOn(inHarbor(player.x, player.z) ? 'wood' : (inAsh(player.x, player.z) > 0.25 || debrisList.some(d => d.landed && Math.hypot(d.x - player.x, d.z - player.z) < 2.5)) ? 'gravel' : 'stone', sprint);
  const last = crumbs[crumbs.length - 1]; if (Math.hypot(player.x - last[0], player.z - last[1]) > 0.3) { crumbs.push([player.x, player.z]); if (crumbs.length > 300) crumbs.shift(); }
  G.sprinting = sprint;
  return sprint;
}
function updateVitals(dt, t) {
  if (G.state !== 'play' && G.state !== 'medic') return;
  const prog = 1 - G.timeLeft / GAME.duration, doom = sstep(60, 0, G.timeLeft);
  // air
  const ash = Math.max(inAsh(player.x, player.z), doom * 0.6);
  const ashK = ash * (G.masked ? 0.3 : 1) * (player.crouch > 0.5 ? 0.6 : 1);
  V.air = THREE.MathUtils.damp(V.air, 100 - ashK * 95, ash > 0.05 ? 0.9 : 0.6, dt);
  if (V.air < 35) { damage((35 - V.air) * 0.05 * dt, true); G.coughT -= dt; if (G.coughT <= 0) { G.coughT = R(2.5, 4); Sfx.cough(); } }
  // heat
  let heat = sstep(-20, -78, player.z) * 1.3 + prog * 0.5 + doom * 0.8;
  let fireNear = 0; for (const f of fireObjs) fireNear = Math.max(fireNear, 1 - Math.hypot(player.x - f.x, player.z - f.z) / 6); heat += fireNear * 3;
  let shade = 0; for (const [x, z] of stalls) shade = Math.max(shade, 1 - Math.hypot(player.x - x, player.z - z) / 2.5);
  for (const [x, z] of fountains) shade = Math.max(shade, 1 - Math.hypot(player.x - x, player.z - z) / 3);
  const target = 36.8 + heat * (1 - 0.3 * save.upg.heat) * (1 - 0.7 * shade) + (G.sprinting ? 0.5 : 0);
  V.temp += (target - V.temp) * (1 - Math.exp(-dt * (target > V.temp ? 0.12 : 0.25)));
  if (V.temp > 38.6) damage((V.temp - 38.6) * 2.2 * dt, true);
  // hunger / thirst
  V.hunger = Math.max(0, V.hunger - dt * (0.22 + (G.sprinting ? 0.25 : 0)));
  V.thirst = Math.max(0, V.thirst - dt * (0.24 + Math.max(0, V.temp - 37) * 0.25 + (G.sprinting ? 0.2 : 0)));
  G.hintT = (G.hintT || 0) - dt; if (G.hintT <= 0 && (V.thirst < 35 || V.hunger < 35)) { G.hintT = 12; toast(V.thirst < 35 ? 'THIRSTY! PRESS [R] TO DRINK WATER 💧' : 'HUNGRY! PRESS [T] TO EAT BREAD 🍞', 3.5); }
  if (V.hunger <= 0) damage(0.5 * dt, true); if (V.thirst <= 0) damage(0.8 * dt, true);
  // pulse
  const pT = 72 + (G.sprinting ? 58 : player.speed > 1 ? 14 : 0) + (100 - V.hp) * 0.4 + Math.max(0, V.temp - 37) * 14 + (V.air < 50 ? 16 : 0) + (G.exhausted ? 20 : 0) + doom * 15;
  V.pulse = THREE.MathUtils.damp(V.pulse, pT, 0.8, dt);
  // breathing when exhausted / low stamina
  if (G.exhausted || V.stamina < staMax() * 0.25) { G.breathT -= dt; if (G.breathT <= 0) { G.breathT = 0.85; Sfx.breath(G.exhausted ? 1 : 0.5); } }
  // fog of war reveal
  const ci = Math.floor((player.x - MAP.x0) / MAP.cell), cj = Math.floor((player.z - MAP.z0) / MAP.cell), rr = 7;
  for (let j = cj - rr; j <= cj + rr; j++) for (let i = ci - rr; i <= ci + rr; i++) if (i >= 0 && j >= 0 && i < MAP.w && j < MAP.h && (i - ci) ** 2 + (j - cj) ** 2 <= rr * rr) fog[j * MAP.w + i] = 1;
  // district
  const dname = (districts.find(d => player.x > d.x0 && player.x < d.x1 && player.z > d.z0 && player.z < d.z1) || {}).name;
  if (dname && dname !== G.district) { G.district = dname; $('district').textContent = dname; G.distT = 2.5; }
  // gate
  if (!G.gateOpen && G.saved >= 3) { G.gateOpen = true; for (const b of blockers) if (b.type === 'gate') { b.active = false; b.meshes.forEach(m => m.visible = false); } toast('TEMPLE DISTRICT UNLOCKED — THE RUBBLE IS CLEARED', 3.2); updateObjective(); }
}
function crumbAt(dist) {
  let acc = 0, px = player.x, pz = player.z;
  for (let i = crumbs.length - 1; i >= 0; i--) { const [x, z] = crumbs[i]; const d = Math.hypot(x - px, z - pz); if (acc + d >= dist) { const k = (dist - acc) / d; return [lerp(px, x, k), lerp(pz, z, k)]; } acc += d; px = x; pz = z; }
  return [px, pz];
}
function rescueJuice(c) {
  const f = $('flash'); f.style.transition = 'none'; f.style.background = 'radial-gradient(circle, rgba(255,230,140,.9), rgba(0,229,255,.35) 60%, rgba(0,0,0,0))'; f.style.opacity = 0.8;
  requestAnimationFrame(() => { f.style.transition = 'opacity .9s'; f.style.opacity = 0; setTimeout(() => { f.style.background = ''; f.style.transition = ''; }, 950); });
  let pop = $('savedPop'); if (!pop) { pop = document.createElement('div'); pop.id = 'savedPop'; document.body.appendChild(pop); }
  pop.textContent = `⌛ +1 SAVED  ${G.saved}/${NINJ}`; pop.classList.remove('go'); void pop.offsetWidth; pop.classList.add('go'); G.hitFlash = 0;
  c.cheerT = 2.5; }
function rescue(c) {
  c.state = 'saved'; G.saved++; c.savedSpot = [64.5, -40 + G.saved * 1.8]; const cr = INJURIES[c.injury].cr;
  save.credits += cr; G.earned += cr; persist(); Sfx.success(); Sfx.coin(); toast(`${c.name.toUpperCase()} SAVED  ${G.saved}/${NINJ}   +${cr} ⌛`); rescueJuice(c); updateObjective(); buildHotbar();
  followers().forEach((o, i) => o.rank = i);
}
function updateCitizens(t, dt) {
  for (const c of citizens) {
    if (c.state === 'follow') {
      const [tx, tz] = crumbAt(1.8 + c.rank * 1.3);
      const dx = tx - c.pos.x, dz = tz - c.pos.y, d = Math.hypot(dx, dz);
      const sp = d > 0.25 ? Math.min(9, d * 3) : 0;
      const [nx, nz] = resolve(c.pos.x, c.pos.y, c.pos.x + dx / (d || 1) * sp * dt, c.pos.y + dz / (d || 1) * sp * dt, 0.3);
      c.speed = Math.hypot(nx - c.pos.x, nz - c.pos.y) / dt; c.pos.set(nx, nz);
      if (sp > 0.2) c.yaw = THREE.MathUtils.lerp(c.yaw, c.yaw + Math.atan2(Math.sin(Math.atan2(dx, dz) - c.yaw), Math.cos(Math.atan2(dx, dz) - c.yaw)), 1 - Math.exp(-10 * dt));
      if (d > 25) c.pos.set(tx, tz);
      if (inHarbor(c.pos.x, c.pos.y)) rescue(c);
    } else if (c.state === 'carried') {
      if (inHarbor(player.x, player.z)) { carried = null; c.pos.set(player.x, player.z); rescue(c); }
    } else if (c.state === 'saved') {
      const [tx, tz] = c.savedSpot; const dx = tx - c.pos.x, dz = tz - c.pos.y, d = Math.hypot(dx, dz);
      const sp = d > 0.2 ? Math.min(3.5, d * 2) : 0; c.pos.x += dx / (d || 1) * sp * dt; c.pos.y += dz / (d || 1) * sp * dt; c.speed = sp;
      c.yaw = sp > 0.1 ? Math.atan2(dx, dz) : THREE.MathUtils.lerp(c.yaw, -Math.PI / 2, 0.05);
    }
    poseCitizen(c, t, dt);
  }
}
function updateDebris(dt) {
  if (G.state === 'play' || G.state === 'medic') {
    G.nextDebris -= dt;
    if (G.nextDebris <= 0) {
      const prog = 1 - G.timeLeft / GAME.duration; G.nextDebris = lerp(8, 0.7, prog * prog * (3 - 2 * prog)) * R(0.7, 1.3); G.debrisBurst = prog > 0.5 && Math.random() < prog - 0.3;
      const [fx, fz] = fwd(); let x, z;
      if (G.state === 'medic') { const a = R(0, 6.28); x = player.x + Math.cos(a) * R(3.5, 6); z = player.z + Math.sin(a) * R(3.5, 6); }
      else if (Math.random() < 0.45) { x = player.x + player.vx * 1.5 + R(-0.6, 0.6); z = player.z + player.vz * 1.5 + R(-0.6, 0.6); }
      else { const d = R(2, 8); x = player.x + fx * d + R(-2.5, 2.5); z = player.z + fz * d + R(-2.5, 2.5); }
      if (walkable(x, z, 0.8)) spawnDebris(x, z);
      if (G.debrisBurst) for (let k = 0; k < 2; k++) { const bx = x + R(-4, 4), bz = z + R(-4, 4); if (walkable(bx, bz, 0.8)) spawnDebris(bx, bz); }
    }
  }
  for (let i = debrisList.length - 1; i >= 0; i--) {
    const d = debrisList[i]; d.t += dt; const u = clamp(d.t / d.dur);
    if (!d.landed) {
      d.sh.scale.setScalar(lerp(0.3, 1, u)); d.sh.material.opacity = lerp(0.2, 0.9, u);
      d.ring.material.opacity = 0.35 + 0.45 * Math.abs(Math.sin(d.t * 10)); d.ring.scale.setScalar(lerp(1.4, 1, u));
      const fu = clamp((d.t - (d.dur - 0.55)) / 0.55); d.rock.visible = fu > 0;
      d.rock.position.set(d.x + (1 - fu) * 2, lerp(20, 0.35, fu * fu), d.z); d.rock.rotation.set(d.t * d.spin[0], d.t * d.spin[1], 0);
      if (u >= 1) {
        d.landed = true; d.ring.visible = false; d.sh.visible = false; const dist = Math.hypot(player.x - d.x, player.z - d.z);
        Sfx.crash(clamp(1.2 - dist / 25, 0.15, 1)); G.shake = Math.max(G.shake, clamp(0.06 - dist * 0.004, 0.005, 0.06));
        if (G.state === 'play' || G.state === 'medic') { if (dist < 1.3) damage(26); else if (dist < 2.1) damage(12); else if (dist < 5) G.dodged++; }
        for (let k = 0; k < 8; k++) { const ds = dustSprites[dustIdx++ % dustSprites.length]; Object.assign(ds, { t: 0, a: R(0, 6.28), v: R(0.8, 2.4), u: R(0.3, 1.2), x: d.x, z: d.z }); ds.s.visible = true; }
      }
    } else if (d.t > d.dur + 25) { scene.remove(d.rock, d.sh, d.ring); debrisList.splice(i, 1); }
  }
  for (const ds of dustSprites) { if (!ds.s.visible) continue; ds.t += dt; const k = ds.t; ds.s.position.set(ds.x + Math.cos(ds.a) * k * ds.v, 0.3 + k * ds.u * 0.8, ds.z + Math.sin(ds.a) * k * ds.v); const sz = 0.8 + k * 2.2; ds.s.scale.set(sz, sz, 1); ds.s.material.opacity = 0.55 * Math.exp(-k * 0.9); if (k > 4) ds.s.visible = false; }
}


// ================= HUD =================
const cctx = $('compass').getContext('2d');
const bearing = (x, z) => THREE.MathUtils.radToDeg(Math.atan2(x - player.x, -(z - player.z)));
function drawCompass(heading) {
  const g = cctx, W = 800, cx = 400, cy = 40, cw = 760, ppd = cw / 150; g.clearRect(0, 0, 800, 96); g.save();
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 8;
  const cg = g.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0); cg.addColorStop(0, 'rgba(255,255,255,0)'); cg.addColorStop(0.15, 'rgba(255,255,255,0.85)'); cg.addColorStop(0.85, 'rgba(255,255,255,0.85)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = 'rgba(10,14,22,0.35)'; g.fillRect(cx - cw / 2, cy - 22, cw, 44); g.strokeStyle = cg; g.lineWidth = 2; g.textAlign = 'center';
  g.beginPath(); g.moveTo(cx - cw / 2, cy + 22); g.lineTo(cx + cw / 2, cy + 22); g.stroke();
  const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
  for (let d = -75; d <= 75; d++) { const deg = Math.round(heading) + d; const dd = ((deg % 360) + 360) % 360; const x = cx + (deg - heading) * ppd;
    const fade = 1 - Math.abs(x - cx) / (cw / 2); if (fade <= 0) continue; g.globalAlpha = fade;
    if (names[dd] !== undefined) { g.font = '700 26px Rajdhani'; g.fillStyle = dd === 0 ? '#ffd9a0' : '#fff'; g.fillText(names[dd], x, cy + 9); }
    else if (dd % 15 === 0) { g.fillStyle = '#fff'; g.fillRect(x - 1, cy + 6, 2, 14); } else if (dd % 5 === 0) { g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x - 1, cy + 12, 2, 8); } }
  g.globalAlpha = 1; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx - 8, cy - 22); g.lineTo(cx + 8, cy - 22); g.lineTo(cx, cy - 12); g.fill();
  const rel = b => { let r = ((b - heading + 540) % 360) - 180; return clamp(r, -72, 72); };
  for (const c of citizens) if (c.state === 'injured' || c.state === 'down') { const r = rel(bearing(c.pos.x, c.pos.y)); const x = cx + r * ppd; g.fillStyle = '#ff5a3a'; g.shadowColor = '#f30'; g.shadowBlur = 10; g.fillRect(x - 3, cy - 12, 6, 20); g.fillRect(x - 10, cy - 5, 20, 6); }
  const hb = rel(bearing(62, -30)), hx = cx + hb * ppd; const hd = Math.hypot(62 - player.x, -30 - player.z);
  g.fillStyle = P.cyan; g.shadowColor = P.cyan; g.shadowBlur = 14; g.beginPath(); g.moveTo(hx, cy + 20); g.lineTo(hx - 11, cy - 2); g.lineTo(hx, cy - 14); g.lineTo(hx + 11, cy - 2); g.closePath(); g.fill();
  g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 8; g.font = '700 22px "Barlow Condensed"'; g.fillStyle = '#bff8ff'; g.fillText(`HARBOR  ${Math.round(hd)} m`, clamp(hx, 70, 730), cy + 50);
  g.restore();
}

const markerEls = citizens.map(() => { const d = document.createElement('div'); d.className = 'mk'; d.innerHTML = '<div class="ic"></div><span></span>'; $('markers').appendChild(d); return d; });
const depotEl = (() => { const d = document.createElement('div'); d.className = 'mk harbor'; d.innerHTML = '<div class="ic" style="background:#ffe08a"></div><span>DEPOT</span>'; document.getElementById('markers').appendChild(d); return d; })();
const harborEl = (() => { const d = document.createElement('div'); d.className = 'mk harbor'; d.innerHTML = '<div class="ic"></div><span>HARBOR</span>'; $('markers').appendChild(d); return d; })();
const v3 = new THREE.Vector3();
function placeMarker(el, x, y, z, text) {
  v3.set(x, y, z).project(camera); const vis = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
  el.style.display = vis ? 'block' : 'none'; if (!vis) return; el.style.left = ((v3.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - v3.y) / 2 * innerHeight) + 'px'; if (text != null) el.lastChild.textContent = text;
}
const vitalRows = [['hp', '✚', 'HEALTH', '#ff6a5a'], ['stamina', '⚡', 'STAMINA', '#ffe08a'], ['air', '☁', 'AIR', '#9ad8ff'], ['hunger', '🍞', 'FOOD', '#f2b04e'], ['thirst', '💧', 'WATER', '#4fb3ff'], ['temp', '🌡', 'TEMP', '#ff9a4a']];
$('vitals').innerHTML = vitalRows.map(([k, ic, n, c]) => `<div class="vt" id="vt_${k}"><span>${ic}</span><span>${n}</span><div class="bar"><i style="background:${c}"></i></div><b></b></div>`).join('') + '<div class="pulse"><span>♥ PULSE</span><b id="pulseV">72 bpm</b></div>';
const vEls = Object.fromEntries(vitalRows.map(([k]) => [k, { row: $('vt_' + k), bar: $('vt_' + k).querySelector('i'), val: $('vt_' + k).querySelector('b') }]));
let dialAcc = 0, vAcc = 0;
function updateHUD(dt, t) {
  { const q = G.look > 0.4; vEls.air.row.style.display = q || V.air < 85 ? '' : 'none'; vEls.temp.row.style.display = q || V.temp > 37.4 || player.z < -40 ? '' : 'none'; const pu = document.querySelector('#vitals .pulse'); if (pu) pu.style.display = q || V.pulse > 110 ? '' : 'none'; }
  const heading = -THREE.MathUtils.radToDeg(player.yaw); drawCompass(heading);
  $('miniTime').textContent = fmt(G.timeLeft); $('miniTime').classList.toggle('low', G.timeLeft < 60); $('miniBar').style.width = (100 * clamp(G.timeLeft / GAME.duration)) + '%';
  $('hpBar').style.width = V.hp + '%'; $('hpBar').style.background = V.hp < 100 ? P.paramedicRed : P.cyan;
  vAcc += dt; if (vAcc > 0.1) { vAcc = 0;
    const sm = staMax(); const vals = { hp: [V.hp / 100, Math.round(V.hp), V.hp < 35], stamina: [V.stamina / sm, Math.round(V.stamina), G.exhausted], air: [V.air / 100, Math.round(V.air) + '%', V.air < 40], hunger: [V.hunger / 100, Math.round(V.hunger), V.hunger < 20], thirst: [V.thirst / 100, Math.round(V.thirst), V.thirst < 20], temp: [clamp((V.temp - 36) / 4), V.temp.toFixed(1) + '°', V.temp > 38.3] };
    for (const [k, [f, s, w]] of Object.entries(vals)) { vEls[k].bar.style.width = (clamp(f) * 100) + '%'; vEls[k].val.textContent = s; vEls[k].row.classList.toggle('warn', !!w); }
    $('pulseV').textContent = `${Math.round(V.pulse)} bpm${G.masked ? ' · 😷' : ''}`; }
  G.objT += dt; $('objective').classList.toggle('off', G.objT < 1.0);
  G.checkT += dt; $('checkpoint').style.opacity = G.checkT < 3.2 ? 1 : 0;
  if (G.toastT > 0) { G.toastT -= dt; if (G.toastT <= 0) $('toast').style.opacity = 0; }
  if (G.hotT > 0) { G.hotT -= dt; if (G.hotT <= 0) $('hotname').style.opacity = 0; }
  if (G.distT > 0) { G.distT -= dt; $('district').style.opacity = clamp(G.distT); }
  const inj = 1 - V.hp / 100; const beat = V.hp < 50 ? 0.85 + 0.15 * Math.sin(t * 7) : 1;
  $('vignette').style.opacity = inj > 0.001 ? clamp((0.3 + inj * 1.1) * beat) : 0;
  $('heat').style.opacity = clamp((V.temp - 37.3) / 1.4) * (0.85 + 0.15 * Math.sin(t * 3));
  $('ashfx').style.opacity = clamp((100 - V.air) / 100) * 0.7;
  $('flash').style.opacity = 0.45 * G.hitFlash;
  const near = citizens.filter(c => c.state === 'injured' || c.state === 'down').sort((a, b) => Math.hypot(a.pos.x - player.x, a.pos.y - player.z) - Math.hypot(b.pos.x - player.x, b.pos.y - player.z)).slice(0, 2);
  citizens.forEach((c, i) => { if (near.includes(c)) placeMarker(markerEls[i], c.pos.x, 1.6, c.pos.y, `${c.name} · ${Math.round(Math.hypot(c.pos.x - player.x, c.pos.y - player.z))} m`); else markerEls[i].style.display = 'none'; });
  placeMarker(depotEl, DEPOT[0], 3.5, DEPOT[1], `DEPOT ${Math.round(Math.hypot(DEPOT[0] - player.x, DEPOT[1] - player.z))} m`);
  placeMarker(harborEl, 62, 3.5, -30, `HARBOR ${Math.round(Math.hypot(62 - player.x, -30 - player.z))} m`);
  if (G.medic) { const m = G.medic; document.querySelector('.m-zone').style.left = ((m.zone - m.w / 2) * 100) + '%'; document.querySelector('.m-zone').style.width = (m.w * 100) + '%'; m.shown = medicMarker(); { const n = performance.now(); (m.hist || (m.hist = [])).push([n, m.shown]); while (m.hist.length && n - m.hist[0][0] > 300) m.hist.shift(); } document.querySelector('.m-marker').style.left = (m.shown * 100) + '%'; }
  dialAcc += dt; if (G.look > 0.01 || dialAcc > 0.5) { dialAcc = 0; drawDial(G.timeLeft, clamp(G.timeLeft / GAME.duration), V.hp, G.hitFlash); }
  if (G.mapOpen) drawMap();
}
// ---------- map (M) with fog of war ----------
const mctx = $('mapC').getContext('2d');
function drawMap() {
  const g = mctx, W = 900, pad = 40, sc = Math.min((W - pad * 2) / (MAP.x1 - MAP.x0), (W - pad * 2) / (MAP.z1 - MAP.z0));
  const ox = pad + ((W - pad * 2) - (MAP.x1 - MAP.x0) * sc) / 2, oy = pad + ((W - pad * 2) - (MAP.z1 - MAP.z0) * sc) / 2;
  const X = x => ox + (x - MAP.x0) * sc, Y = z => oy + (z - MAP.z0) * sc;
  const seen = (x, z) => { const i = Math.floor((x - MAP.x0) / MAP.cell), j = Math.floor((z - MAP.z0) / MAP.cell); return i >= 0 && j >= 0 && i < MAP.w && j < MAP.h && fog[j * MAP.w + i]; };
  g.fillStyle = '#0a1218'; g.fillRect(0, 0, W, W);
  g.fillStyle = '#1a2a30'; for (const r of [...streets, harbor]) g.fillRect(X(r.x0), Y(r.z0), (r.x1 - r.x0) * sc, (r.z1 - r.z0) * sc);
  for (let j = 0; j < MAP.h; j++) for (let i = 0; i < MAP.w; i++) if (fog[j * MAP.w + i]) { const x = MAP.x0 + i * MAP.cell + 1, z = MAP.z0 + j * MAP.cell + 1; if (walkable(x, z, 0) || inHarbor(x, z)) { g.fillStyle = inHarbor(x, z) ? '#2a6a8a' : '#e8d6b0'; g.fillRect(X(x - 1), Y(z - 1), MAP.cell * sc + 0.5, MAP.cell * sc + 0.5); } }
  g.font = '700 18px "Barlow Condensed"'; g.textAlign = 'center';
  for (const d of districts) { const cx = (d.x0 + d.x1) / 2, cz = (d.z0 + d.z1) / 2; g.fillStyle = 'rgba(0,229,255,0.85)'; g.save(); g.translate(X(cx), Y(cz)); if (d.z1 - d.z0 > d.x1 - d.x0) g.rotate(-Math.PI / 2); g.fillText(d.name, 0, 6); g.restore(); }
  for (const b of blockers) if (b.type === 'gate' && b.active) { g.fillStyle = '#ff5a3a'; g.fillRect(X(b.x0), Y(b.z0), (b.x1 - b.x0) * sc, (b.z1 - b.z0) * sc); g.fillText('🔒 LOCKED (3 saved)', X((b.x0 + b.x1) / 2), Y(b.z0) - 8); }
  for (const [x, z] of fountains) if (seen(x, z)) { g.fillStyle = '#4fb3ff'; g.beginPath(); g.arc(X(x), Y(z), 7, 0, 7); g.fill(); }
  for (const p of pickups) if (!p.taken && seen(p.x, p.z)) { g.fillStyle = p.kind === 'amphora' ? '#7fd0ff' : '#f2b04e'; g.fillRect(X(p.x) - 3, Y(p.z) - 3, 6, 6); }
  for (const f of fireObjs) if (seen(f.x, f.z)) { g.fillStyle = '#ff7a2a'; g.fillText('🔥', X(f.x), Y(f.z) + 6); }
  for (const c of citizens) if ((c.state === 'injured' || c.state === 'down') && seen(c.pos.x, c.pos.y)) { g.fillStyle = c.state === 'down' ? P.cyan : '#ff4a3a'; g.fillRect(X(c.pos.x) - 3, Y(c.pos.y) - 10, 6, 20); g.fillRect(X(c.pos.x) - 10, Y(c.pos.y) - 3, 20, 6); }
  g.fillStyle = P.cyan; g.fillText('⚓ HARBOR · DEPOT', X(59), Y(-46)); g.fillStyle = '#ffe08a'; g.fillRect(X(56) - 6, Y(-23) - 6, 12, 12);
  g.save(); g.translate(X(player.x), Y(player.z)); g.rotate(-player.yaw); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -14); g.lineTo(9, 10); g.lineTo(0, 5); g.lineTo(-9, 10); g.fill(); g.restore();
  g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = '700 26px "Barlow Condensed"'; g.fillText('MAP — POMPEII  [M] close', 20, 30);
  const pct = Math.round(100 * fog.reduce((a, v) => a + v, 0) / fog.length); g.textAlign = 'right'; g.fillText(`explored ${pct}%`, W - 20, 30);
}
// ---------- interaction ----------
const DEPOT = [56, -23];
(function buildDepot() {
  const g = new THREE.Group(); g.position.set(DEPOT[0], 0, DEPOT[1] - 1.6);
  const M = c => new THREE.MeshLambertMaterial({ color: c });
  const box = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  for (const [x, z] of [[-1.8, -1], [1.8, -1], [-1.8, 1], [1.8, 1]]) box(0.16, 2.6, 0.16, '#8a5a2e', x, 1.3, z);
  box(3.4, 1.0, 0.7, '#a8703a', 0, 0.5, 1.0); box(3.6, 0.1, 0.8, '#d9b27a', 0, 1.02, 1.0);
  for (let i = 0; i < 6; i++) { const m = box(0.62, 0.06, 2.6, i % 2 ? '#ffffff' : '#2fb6d6', -1.55 + i * 0.62, 2.75, 0); m.rotation.x = -0.18; }
  for (const [x, c] of [[-1.1, '#e64a3a'], [-0.4, '#ffd34a'], [0.4, '#4fb3ff'], [1.1, '#ffffff']]) box(0.35, 0.3, 0.35, c, x, 1.22, 1.0);
  box(0.9, 0.9, 0.6, '#8a5a2e', -1.2, 0.45, -0.6); box(0.9, 0.9, 0.6, '#8a5a2e', 1.1, 0.45, -0.5);
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160; const x = cv.getContext('2d');
  x.fillStyle = '#123a48'; x.fillRect(0, 0, 512, 160); x.strokeStyle = '#5ff4ff'; x.lineWidth = 10; x.strokeRect(5, 5, 502, 150);
  x.fillStyle = '#ffe08a'; x.font = '700 64px Rajdhani, sans-serif'; x.textAlign = 'center'; x.fillText('⌛ TIME DEPOT', 256, 78); x.fillStyle = '#bff8ff'; x.font = '600 38px Rajdhani, sans-serif'; x.fillText('MEDICAL SUPPLIES · [E]', 256, 130);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false })); sp.scale.set(3.6, 1.1, 1); sp.position.set(0, 3.9, 0); sp.renderOrder = 10; g.add(sp);
  scene.add(g);
})();
function updateInteract(dt) {
  const pr = $('prompt'); let target = null, text = '', hold = 0.7;
  if (G.state === 'play') {
    const [fx, fz] = fwd(); const facing = (x, z, r) => { const dx = x - player.x, dz = z - player.z, d = Math.hypot(dx, dz); return d < r && (d < 0.8 || (dx * fx + dz * fz) / d > 0.3); };
    for (const c of citizens) if (c.state === 'injured' && facing(c.pos.x, c.pos.y, 2.4)) { const tool = inv.bestFor(c.injury, HOTBAR[sel]); target = { c, tool }; text = tool ? `Hold to treat ${c.name} (${INJURIES[c.injury].label}) — ${ITEMS[tool].icon} ${ITEMS[tool].name}` : `❌ ${c.name}: ${INJURIES[c.injury].label} — NEED ${needTool(c.injury).toUpperCase()} · BUY AT DEPOT (yellow ■ on map M)`; if (!tool) hold = 1e9; }
    if (!target && !carried) for (const c of citizens) if (c.state === 'down' && facing(c.pos.x, c.pos.y, 2.4)) { target = { pick: c }; text = INJURIES[c.injury].walk && followers().length < maxFollowers() ? `Hold to call ${c.name}` : `Hold to pick up ${c.name}${carryStretcher() ? ' (stretcher)' : ' (on back)'}`; hold = 0.5; }
    if (!target) for (const p of pickups) if (!p.taken && facing(p.x, p.z, 2.0)) { target = { p }; text = { amphora: 'Take water amphora', figs: 'Eat figs', grapes: 'Eat grapes', bread: 'Take bread' }[p.kind]; hold = 0.3; }
    if (!target) for (const [x, z] of fountains) if (facing(x, z, 2.2)) { target = { fountain: 1 }; text = 'Drink from the fountain'; hold = 0.4; }
    if (!target && Math.hypot(player.x - DEPOT[0], player.z - DEPOT[1]) < 3) { target = { shop: 1 }; text = 'Open Time Rescue Depot'; hold = 0.3; }
    if (!target && inHarbor(player.x, player.z) && Math.hypot(player.x - 64, player.z + 30) < 6 && G.saved > 0 && G.saved < NINJ) { target = { sail: 1 }; text = `Hold to set sail (${G.saved}/${NINJ} saved)`; }
  }
  if (target && keys.KeyE) G.interactHold += dt; else G.interactHold = Math.max(0, G.interactHold - dt * 3);
  pr.style.display = target ? 'flex' : 'none'; $('promptText').textContent = text;
  pr.querySelector('circle').style.strokeDashoffset = 107 * (1 - clamp(G.interactHold / hold));
  if (target && G.interactHold >= hold) { G.interactHold = 0; keys.KeyE = false; act(target); }
}
const needTool = type => HOTBAR.filter(id => ITEMS[id].treats && ITEMS[id].treats.includes(type)).map(id => ITEMS[id].name).join(' or ');
function act(tg) {
  if (tg.c) startMedic(tg.c, tg.tool);
  else if (tg.pick) { const c = tg.pick; if (INJURIES[c.injury].walk && followers().length < maxFollowers()) { c.state = 'follow'; c.rank = followers().length - 1; } else { c.state = 'carried'; carried = c; toast(`CARRYING ${c.name.toUpperCase()} — G TO PUT DOWN`); } Sfx.tick(); }
  else if (tg.p) { const p = tg.p; p.taken = true; p.g.visible = false;
    if (p.kind === 'amphora') { inv.add('water'); toast('+1 WATER — PRESS [R] TO DRINK'); Sfx.drink(); } else if (p.kind === 'bread') { inv.add('food'); toast('+1 BREAD — PRESS [T] TO EAT'); Sfx.eat(); }
    else if (p.kind === 'figs') { V.hunger = Math.min(100, V.hunger + 18); V.hp = Math.min(100, V.hp + 6); toast('FIGS! +FOOD +HEALTH'); Sfx.eat(); }
    else { V.hunger = Math.min(100, V.hunger + 10); V.thirst = Math.min(100, V.thirst + 12); V.hp = Math.min(100, V.hp + 4); toast('GRAPES! +FOOD +WATER'); Sfx.eat(); }
    buildHotbar(); }
  else if (tg.fountain) { V.thirst = 100; V.temp = Math.max(36.8, V.temp - 1.5); Sfx.drink(); toast('COOL FOUNTAIN WATER'); }
  else if (tg.shop) openShop(true);
  else if (tg.sail) endGame('win');
}
function onKey(code) {
  if (G.state !== 'play') return;
  tutKey(code);
  const n = /^Digit([1-9])$/.exec(code); if (n) selectSlot(+n[1] - 1);
  if (code === 'KeyF') useSelected();
  if (code === 'KeyR') { const k = sel; sel = HOTBAR.indexOf('water'); useSelected(); sel = k; buildHotbar(); }
  if (code === 'KeyT') { const k = sel; sel = HOTBAR.indexOf('food'); useSelected(); sel = k; buildHotbar(); }
  if (code === 'Space') G.jumpReq = 0.25;
  if (code === 'KeyG' && carried) { carried.state = 'down'; carried.pos.set(player.x, player.z); carried = null; toast('PUT DOWN'); }
  if (code === 'KeyM') { G.mapOpen = !G.mapOpen; $('map').classList.toggle('hidden', !G.mapOpen); }
  if (code === 'KeyV') { const opts = [null, save.owned.cart && 'cart', save.owned.horse && 'horse'].filter((v, i) => i === 0 || v);
    if (opts.length < 2) toast('NO VEHICLE — BUY ONE AT THE DEPOT'); else { player.riding = opts[(opts.indexOf(player.riding) + 1) % opts.length]; toast(player.riding ? (player.riding === 'horse' ? 'HORSE CART! NEIGH.' : 'HAND CART') : 'ON FOOT'); } }
}

// ================= MAIN LOOP =================
const clock = new THREE.Clock(); let fpsAcc = 0, fpsN = 0;
const nz = (t, f, o) => Math.sin(t * f * 0.45 + o) * 0.6 + Math.sin(t * f * 0.9 + o * 1.7) * 0.4;
let worldT = 0;
const DAY = { sun: col('#ffe0a8'), hemiS: col('#a8d4ff'), hemiG: col('#d8a070'), fog: col('#cfe6fa') }, DOOM = { sun: col('#ff7a3a'), hemiS: col('#4a5a88'), hemiG: col('#2a1c16'), fog: col('#4a2c22') };
const tmpC = new THREE.Color(), VES_DAY = col('#d8c8b4'), VES_DOOM = col('#3a2e2a'), SOM_DAY = col('#b8b8c0'), SOM_DOOM = col('#241c1a');
function frame() {
  requestAnimationFrame(frame);
  const rawDt = Math.min(clock.getDelta(), TEST ? 0.2 : 0.05); window.__sdt = window.__sdt ? window.__sdt + (rawDt - window.__sdt) * 0.2 : rawDt; const dt = TEST ? rawDt : window.__sdt; window.__frames = (window.__frames || 0) + 1; worldT += dt; const t = worldT;
  const active = G.state === 'play' || G.state === 'medic';
  if (active) {
    G.t += dt; G.timeLeft -= dt; if (G.timeLeft <= 0) { G.timeLeft = 0; endGame(inHarbor(player.x, player.z) && G.saved > 0 ? 'win' : 'time'); }
    if (G.state === 'medic' && G.medic) G.medic.t += dt;
  }
  if (G.state === 'intro') { updateIntro(dt, t); updateCitizens(t, dt); }
  if (G.state !== 'paused' && G.state !== 'start' && G.state !== 'shop' && G.state !== 'intro') {
    if (active) updatePlayer(dt); else { player.vx *= 0.9; player.vz *= 0.9; }
    updateVitals(dt, t); updateCitizens(t, dt); updateDebris(dt);
    if (active) updateInteract(dt); else $('prompt').style.display = 'none';
    if (active && G.saved === NINJ) endGame('win');
    const wantLook = active && (keys.KeyQ || keys.Tab);
    G.look = THREE.MathUtils.damp(G.look, wantLook ? 1 : 0, 9, dt);
    G.hitFlash = Math.max(0, G.hitFlash - dt * 3); G.shake = Math.max(0, G.shake - dt * 0.12);
    if (active && (V.hp < 70 || V.pulse > 120)) { G.heartT -= dt; if (G.heartT <= 0) { G.heartT = 60 / V.pulse; Sfx.heartbeat(clamp(1.2 - V.hp / 70, 0.25, 1)); } }
    const prog = 1 - G.timeLeft / GAME.duration; Sfx.setAmbience(0.12 + 0.5 * prog * prog, 0.03 + 0.07 * prog);
  }
  // atmosphere: sunny morning -> plume grows -> last minute darkens & reddens
  const prog = G.state === 'start' ? 0.1 : clamp(1 - G.timeLeft / GAME.duration), doom = G.state === 'start' ? 0 : clamp(sstep(60, 0, G.timeLeft) + (G.end === 'time' ? sstep(0, 2, G.endT) : 0));
  sun.color.lerpColors(DAY.sun, DOOM.sun, doom); hemi.color.lerpColors(DAY.hemiS, DOOM.hemiS, doom); hemi.groundColor.lerpColors(DAY.hemiG, DOOM.hemiG, doom);
  hemi.intensity = lerp(1.25, 0.6, doom); amb.intensity = lerp(0.55, 0.3, doom);
  scene.fog.color.lerpColors(DAY.fog, DOOM.fog, doom); scene.fog.density = lerp(0.0014 + 0.0025 * prog, 0.014, doom) + (G.end === 'time' ? 0.03 * sstep(1.5, 3.2, G.endT) : 0);
  sky.material.uniforms.uDoom.value = doom; vesMat.emissiveIntensity = lerp(0.04, 1.15, Math.max(doom, prog * prog * 0.25)); vesMat.color.lerpColors(VES_DAY, VES_DOOM, doom); sommaMat.color.lerpColors(SOM_DAY, SOM_DOOM, doom);
  renderer.toneMappingExposure = lerp(1.2, 0.95, doom);
  // end sequences
  if (G.end) {
    G.endT += dt; const e = G.endT;
    if (G.end === 'time') {
      const wz = (G.waveZ || player.z - 140) + e * 45; wall.position.set(player.x, 0, wz); G.shake = Math.max(G.shake, 0.02 + e * 0.01);
      player.yaw = THREE.MathUtils.lerp(player.yaw, Math.round(player.yaw / (Math.PI * 2)) * Math.PI * 2, 1 - Math.exp(-2 * dt)); player.pitch = THREE.MathUtils.lerp(player.pitch, 0.15, 1 - Math.exp(-2 * dt));
      $('fade').style.opacity = sstep(2.6, 3.4, e);
    } else if (G.end === 'hp') { player.eyeDrop = lerp(0, 1.25, sstep(0, 0.9, e)); player.roll = lerp(0, 0.8, sstep(0, 0.9, e)); $('fade').style.opacity = sstep(1.0, 2.2, e); }
    else if (G.end === 'win') $('fade').style.opacity = sstep(0.8, 1.8, e) * 0.85;
    if (e > (G.end === 'time' ? 3.6 : 2.3) && !['over', 'win'].includes(G.state)) {
      G.state = G.end === 'win' ? 'win' : 'over'; screen(G.state); $('hud').classList.add('hidden'); if (document.pointerLockElement) document.exitPointerLock();
      if (G.end === 'win') Sfx.success();
    }
  }
  // camera
  const ph = player.phase * Math.PI, bob = clamp(player.speed / 5) * (player.riding ? 0.3 : 1);
  const bobY = -Math.abs(Math.sin(ph)) * 0.022 * bob, bobX = Math.cos(ph) * 0.012 * bob;
  const breathAmp = G.exhausted ? 0.03 : 0.006, breath = Math.sin(t * 2 * Math.PI * (G.exhausted ? 0.9 : V.hp < 60 ? 0.55 : 0.3)) * breathAmp;
  const sh = G.shake + 0.0015 * prog * (G.state === 'start' ? 0 : 1) + doom * 0.004;
  const [fx, fz] = fwd(); const rxx = -fz, rzz = fx;
  const eye = lerp(GAME.eye, 0.95, player.crouch) + player.y + (player.riding === 'horse' ? 0.6 : 0);
  camera.position.set(player.x + rxx * bobX + nz(t, 37, 1) * sh, eye + bobY + breath + nz(t, 41, 2) * sh - player.eyeDrop, player.z + rzz * bobX);
  camera.rotation.set(player.pitch + nz(t, 33, 3) * sh * 1.5 + breath * 0.3, player.yaw + nz(t, 29, 4) * sh, Math.cos(ph) * 0.006 * bob + nz(t, 31, 5) * sh * 1.2 + (player.roll || 0), 'YXZ');
  if (G.state === 'start') { const a = t * 0.05; camera.position.set(Math.sin(a) * 1.5, 2.2, 6 - Math.sin(a * 0.7) * 3); camera.rotation.set(0.08, Math.sin(a) * 0.25, 0, 'YXZ'); }
  // arm + chronometer + carried gear
  const a = G.look; arm.visible = a > 0.01;
  arm.position.lerpVectors(off, rest, a); arm.position.x += bobX * 0.3; arm.position.y += bobY * 0.3 + breath * 0.5;
  arm.rotation.set(1.05 - (1 - a) * 0.5 + Math.sin(t * 1.7) * 0.01, 0.55 + (1 - a) * 0.4, 0.42 - (1 - a) * 0.3, 'XYZ');
  stretcherV.visible = !!carried && carryStretcher() && !player.riding; cartV.visible = player.riding === 'cart'; horseV.visible = player.riding === 'horse';
  // world animation
  const cx = camera.position.x, cz = camera.position.z;
  { const sn = 60 / sun.shadow.mapSize.x * 4, sx = Math.round(cx / sn) * sn, sz = Math.round(cz / sn) * sn; sun.position.set(sx + 40, 70, sz - 50); sun.target.position.set(sx, 0, sz - 10); } sun.intensity = lerp(3.5, 1.8, doom) * (1 + doom * (0.05 * Math.sin(t * 3.1) + 0.04 * Math.sin(t * 7.3)));
  sky.position.copy(camera.position); sky.material.uniforms.uTime.value = t;
  updateSmoke(t, 0.15 + 0.85 * prog * prog, doom); updateFountain(t);
  polishUpdate(dt, t, active, doom, prog);
  const ashAmt = Math.max(inAsh(player.x, player.z), doom); ash.pts.material.opacity = 0.45 * ashAmt; ash.pts.visible = ashAmt > 0.02; embers.pts.visible = doom > 0.15;
  updateParticles(ash, t, cx, cz, 0.6, false); updateParticles(embers, t, cx, cz, 0, true);
  craterGlow.material.opacity = lerp(0.25, 0.7, Math.max(doom, prog * 0.4)) + 0.1 * Math.sin(t * 2.3); for (const s of hazes) s.material.rotation = t * 0.02;
  beacon.material.opacity = 0.14 + 0.06 * Math.sin(t * 3); beaconRing.scale.setScalar(1 + 0.06 * Math.sin(t * 3));
  for (const f of fireObjs) { f.fl.forEach((s, i) => { const k = 0.8 + 0.3 * Math.sin(t * (9 + i * 3) + i); s.scale.set(1.1 * k, 1.6 * k, 1); s.position.set(Math.sin(t * 5 + i) * 0.1, 0.5 + i * 0.25, 0); }); f.L.intensity = 5 + 0.8 * Math.sin(t * 4 + f.x) + 0.4 * Math.sin(t * 6.7 + f.x); }
  if (G.state !== 'start') updateHUD(dt, t);
  composer.render();
  fpsAcc += dt; fpsN++; if (fpsAcc > 2) { const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; window.__fps = fps;
    if (!TEST && fps < 40 && pixelRatio > 0.9 && G.state !== 'start') { pixelRatio = Math.max(0.9, pixelRatio - 0.1); resize(); } }
}
reset(); screen('start'); if (MOBILE) initTouch(); $('screen').dataset.kind = 'start';
Promise.all(['700 30px Rajdhani', '600 30px Rajdhani', '700 30px "Barlow Condensed"'].map(f => document.fonts.load(f))).finally(() => { drawDial(GAME.duration, 1, 100, 0); window.ready = true; });
requestAnimationFrame(frame);
window.__game = { startMedic: (i, tool) => startMedic(citizens[i], tool), get crowd() { return crowd; }, G, V, player, citizens, keys, pickups, blockers, get inv() { return inv; }, get save() { return save; }, ITEMS, Inventory,
  teleport(x, z, yaw = player.yaw) { player.x = x; player.z = z; player.yaw = yaw; crumbs.push([x, z]); }, setTime(s) { G.timeLeft = s; }, damage, solve: () => window.__medicSolve(),
  debris: () => debrisList.length, pause, openShop, closeShop, buy, select: selectSlot, use: useSelected, key: onKey, act, setCredits(n) { save.credits = n; persist(); buildHotbar(); }, resetSave() { save = defSave(); persist(); }, resolve, blockedBy, colliders, walkable, scene, sky, vesMat };

// ================= TOUCH CONTROLS (mobile) =================
function initTouch() {
  $('sBtn').textContent = 'TAP TO PLAY'; document.querySelectorAll('.tapw').forEach((e, i) => e.innerHTML = i ? 'Tap the buttons' : 'Tap anywhere on this panel');
  const ctl = '<div class="controls"><div><span class="key">◎ Left stick</span>Move (push far = sprint)</div><div><span class="key">Drag right</span>Look</div><div><span class="key">E</span>Interact (hold)</div><div><span class="key">⏱</span>Chronometer (hold)</div><div><span class="key">⤒</span>Jump</div><div><span class="key">⤓</span>Crouch</div><div><span class="key">F</span>Use item</div><div><span class="key">💧 🍞</span>Drink / Eat</div><div><span class="key">G</span>Drop carried</div></div>';
  $('sBody').innerHTML = $('sBody').innerHTML.replace(/<div class="controls">[\s\S]*<\/div>\s*$/, ctl); $('sBody').dataset.controls = ctl;
  const ui = document.createElement('div'); ui.id = 'touchui';
  const B = (id, code, label, mode) => `<div class="tb" id="tb_${id}" data-code="${code}" data-mode="${mode || 'tap'}">${label}</div>`;
  ui.innerHTML = `<div id="stick"><div id="knob"></div></div>
    <div id="tbtns">${B('e', 'KeyE', 'E<small>ACT</small>', 'hold')}${B('jump', 'Space', '⤒<small>JUMP</small>')}${B('crouch', 'KeyC', '⤓<small>CROUCH</small>', 'toggle')}${B('use', 'KeyF', 'F<small>USE</small>')}${B('drink', 'KeyR', '💧')}${B('eat', 'KeyT', '🍞')}${B('carry', 'KeyG', 'G<small>DROP</small>')}</div>
    <div id="ttop">${B('chrono', 'KeyQ', '⏱', 'hold')}${B('map', 'KeyM', 'MAP')}${B('veh', 'KeyV', '🐴')}${B('pause', 'Pause', 'Ⅱ')}</div>`;
  $('hud').appendChild(ui);
  const mk = document.createElement('div'); mk.id = 'mTouch'; mk.innerHTML = ['KeyW', 'KeyA', 'KeyS', 'KeyD'].map(k => `<div class="tb tmk" data-k="${k}">${k.slice(3)}</div>`).join('');
  $('mBandage').appendChild(mk);
  const rot = document.createElement('div'); rot.id = 'rotate'; rot.innerHTML = '<div class="ph">📱</div><b>ROTATE YOUR PHONE</b><span>ADAM: TIME MEDIC is played in landscape</span>'; document.body.appendChild(rot);
  const down = code => { if (keys[code]) return; keys[code] = true; if (G.state === 'medic') medicKey(code); else onKey(code); };
  const up = code => { keys[code] = false; };
  ui.querySelectorAll('.tb').forEach(b => {
    const code = b.dataset.code, mode = b.dataset.mode;
    b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); Sfx.init();
      if (code === 'Pause') { pause(); return; }
      if (mode === 'toggle') { keys[code] = !keys[code]; b.classList.toggle('on', keys[code]); return; }
      down(code); b.classList.add('on'); }, { passive: false });
    const end = e => { e.preventDefault(); if (mode === 'toggle' || code === 'Pause') return; up(code); b.classList.remove('on'); };
    b.addEventListener('touchend', end); b.addEventListener('touchcancel', end);
  });
  mk.querySelectorAll(".tmk").forEach(b => b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); medicKey(b.dataset.k); b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 120); }, { passive: false }));
  // tap anywhere on the medic panel (pressure step) = Space
  $('medic').addEventListener('touchstart', e => { if (e.target.closest(".tmk")) return; e.preventDefault(); if (G.medic && G.medic.step === 'pressure') medicKey('Space'); }, { passive: false });
  // hotbar taps
  $('hotbar').addEventListener('touchstart', e => { const h = e.target.closest('.hs'); if (!h) return; e.preventDefault(); selectSlot([...$('hotbar').children].indexOf(h)); }, { passive: false });
  // map closes on tap
  $('map').addEventListener('touchstart', e => { e.preventDefault(); onKey('KeyM'); }, { passive: false });
  // joystick (left half) + look (right half)
  const stick = $('stick'), knob = $('knob'); let sId = null, sx = 0, sy = 0, lId = null, lx = 0, ly = 0; const RAD = 60;
  const playing = () => G.state === 'play' || G.state === 'medic';
  addEventListener('touchstart', e => { if (!playing()) return;
    for (const t of e.changedTouches) {
      if (t.target.closest && t.target.closest('.tb,.hs,#medic,#map,#shop,#screen')) continue;
      if (t.clientX < innerWidth * 0.45 && sId === null) { sId = t.identifier; sx = t.clientX; sy = t.clientY; stick.style.left = (sx - 70) + 'px'; stick.style.top = (sy - 70) + 'px'; stick.classList.add('act'); touchMove.on = true; touchMove.x = touchMove.z = 0; }
      else if (t.clientX >= innerWidth * 0.45 && lId === null) { lId = t.identifier; lx = t.clientX; ly = t.clientY; }
    }
    if (e.cancelable) e.preventDefault(); }, { passive: false });
  addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === sId) { let dx = t.clientX - sx, dy = t.clientY - sy; const d = Math.hypot(dx, dy), k = d > RAD ? RAD / d : 1; dx *= k; dy *= k;
        knob.style.transform = `translate(${dx}px,${dy}px)`; const m = Math.min(1, d / RAD);
        if (m < 0.15) { touchMove.x = touchMove.z = 0; } else { touchMove.x = dx / RAD; touchMove.z = -dy / RAD; }
        const spr = m > 0.92 && -dy > Math.abs(dx) * 0.5; keys.ShiftLeft = spr; stick.classList.toggle('sprint', spr); }
      else if (t.identifier === lId && G.state === 'play') { player.yaw -= (t.clientX - lx) * 0.006; player.pitch = clamp(player.pitch - (t.clientY - ly) * 0.006, -1.35, 1.35); lx = t.clientX; ly = t.clientY; }
    }
    if (e.cancelable) e.preventDefault(); }, { passive: false });
  const tend = e => { for (const t of e.changedTouches) {
    if (t.identifier === sId) { sId = null; touchMove.on = false; touchMove.x = touchMove.z = 0; keys.ShiftLeft = false; knob.style.transform = ''; stick.classList.remove('act', 'sprint'); stick.style.left = ''; stick.style.top = ''; }
    if (t.identifier === lId) lId = null; } };
  addEventListener('touchend', tend); addEventListener('touchcancel', tend);
  document.addEventListener('gesturestart', e => e.preventDefault());
}

// ================= INTRO CUTSCENE =================
const intro = { t: 0, el: null, portal: null };
function beginPlay() {
  G.state = 'play'; G.look = 0; G.shake = 0; Sfx.chime(); G.objT = 0; save.runs++; persist();
  $('hud').classList.remove('hidden'); toast('MISSION START — GOOD LUCK, ADAM', 3); tutStart();
}
function startIntro() {
  Sfx.init(); G.state = 'intro'; intro.t = 0; intro.yaw0 = player.yaw; intro.flags = {};
  if (!intro.el) {
    const el = document.createElement('div'); el.id = 'intro';
    el.innerHTML = '<div class="lb t"></div><div class="lb b"></div><div class="card"><div class="k">TIME RESCUE SERVICE</div><div class="l1">DISPATCH: POMPEII, 79 AD</div><div class="l2">The surge hits in 6½ minutes.</div><div class="l3">Agent: ADAM · Paramedic · Kit: 5 plasters, optimism</div></div><div class="ripple"></div><div class="cap"></div><div class="big">MISSION START</div><div class="skip">Press <span class="key">SPACE</span> / <span class="key">ESC</span> to skip</div><button class="skipBtn" id="skipBtn">SKIP ▸▸</button>';
    document.body.appendChild(el); intro.el = el;
    el.querySelector('#skipBtn').addEventListener('click', e => { e.stopPropagation(); endIntro(); });
    el.querySelector('#skipBtn').addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); endIntro(); }, { passive: false });
    // portal: ring of glowing particles
    const n = 260, pos = new Float32Array(n * 3), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    intro.portal = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color: col('#7ff3ff'), size: 0.18, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    intro.portal.frustumCulled = false; intro.seeds = Array.from({ length: n }, () => [Math.random() * Math.PI * 2, Math.random(), Math.random()]); scene.add(intro.portal);
  }
  intro.el.className = 'on'; intro.portal.visible = false; player.pitch = 0;
}
function cap(text) { const c = intro.el.querySelector('.cap'); if (c.dataset.t !== text) { c.dataset.t = text; c.textContent = text; c.style.opacity = text ? 1 : 0; } }
function updateIntro(dt, t) {
  intro.t += dt; const T = intro.t, f = intro.flags, el = intro.el, once = (k, fn) => { if (!f[k]) { f[k] = 1; fn(); } };
  const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
  el.classList.toggle('dark', T < 3.6); el.classList.toggle('cardOn', T > 0.3 && T < 3.3);
  once('beep', () => [0, 0.5, 1.0].forEach(d => Sfx.tone({ freq: 1320, dur: 0.08, gain: 0.07, type: 'square', delay: d })));
  // (2) portal
  if (T > 3.2 && T < 6) { intro.portal.visible = true; const k = (T - 3.2) / 2.8, a = intro.portal.geometry.attributes.position;
    const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
    intro.seeds.forEach(([ang, r, h], i) => { const rad = (0.6 + 2.2 * r) * (k < 0.5 ? k * 2 : 1 + (k - 0.5) * 4), an = ang + T * (2 + r * 3);
      const lx = Math.cos(an) * rad, ly = Math.sin(an) * rad * 0.9; const d = 2.2 - k * 1.5;
      a.setXYZ(i, player.x + fx * d - fz * lx, 1.6 + ly, player.z + fz * d + fx * lx); }); a.needsUpdate = true;
    intro.portal.material.opacity = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4; intro.portal.material.size = 0.12 + 0.2 * k; } else intro.portal.visible = false;
  once('whoosh', () => { if (T < 3.2) return f.whoosh = 0; Sfx.burst({ dur: 1.4, freq: 300, q: 2, gain: 0.35, attack: 0.5, sweep: 8 }); Sfx.tone({ freq: 220, dur: 1.2, gain: 0.12, slide: 4 }); });
  if (T > 3.5 && !f.flash) { f.flash = 1; el.classList.add('flash'); Sfx.chime(); setTimeout(() => el.classList.remove('flash'), 900); }
  // (3) look around, then Vesuvius
  const y0 = intro.yaw0, toVes = Math.round(y0 / (2 * Math.PI)) * 2 * Math.PI;
  if (T < 4.5) { player.yaw = y0 + 0.9; cap(T > 3.6 ? 'Temporal jump complete.' : ''); }
  else if (T < 9) { player.yaw = y0 + 0.9 - 1.8 * ease((T - 4.5) / 4.5); player.pitch = -0.05 * Math.sin(T); cap('A lovely sunny morning. The market is busy. Nobody suspects a thing.'); }
  else if (T < 12) { player.yaw = lerp(y0 - 0.9, toVes, ease((T - 9) / 2)); player.pitch = lerp(-0.05, 0.16, ease((T - 9) / 2)); cap('Mount Vesuvius. Smoking “a little”.');
    if (T > 10.6) once('rumble', () => { G.shake = 0.06; Sfx.impact(0.6); Sfx.setAmbience(0.4, 0.05); setTimeout(() => Sfx.setAmbience(0.1, 0.03), 1500); }); }
  else if (T < 16) { player.yaw = toVes; G.look = ease((T - 12) / 0.8); player.pitch = lerp(0.16, 0, ease((T - 12) / 0.8)); cap('Chronometer synced. Time until the surge:');
    if (T > 13) once('dial', () => { Sfx.tick(); Sfx.tone({ freq: 880, dur: 0.3, gain: 0.1, delay: 0.1 }); }); }
  else { G.look = 1 - ease((T - 16) / 0.5); cap(''); el.classList.add('go'); once('go', () => Sfx.success()); }
  G.shake = Math.max(0, G.shake - dt * 0.03);
  if (T > 17.6) endIntro();
}
function endIntro() {
  if (G.state !== 'intro') return; intro.portal.visible = false; intro.el.className = ''; cap('');
  player.yaw = Math.round(intro.yaw0 / (2 * Math.PI)) * 2 * Math.PI; player.pitch = 0; beginPlay();
}
window.__intro = intro; window.__endIntro = endIntro;

// ================= POLISH: crowd, pigeons, decor, ambience, tutorial, surge =================
const Q = MOBILE ? 0.45 : 1; // quality scale for mobile
if (MOBILE) { sun.shadow.mapSize.set(1024, 1024); }
// ---- decor: garlands, banners, potted plants, pottery ----
{
  const flagGeo = new THREE.PlaneGeometry(0.34, 0.42); { const p = flagGeo.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setX(i, 0); } // triangle pennant
  const flagMat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  const flagCols = ['#e85a4f', '#f2c14e', '#4fa3e8', '#6cc070', '#ffffff', '#f28c4e'].map(c => col(c));
  const lines = []; for (const st of streets) { const len = st.dir === 'z' ? st.z1 - st.z0 : st.x1 - st.x0;
    for (let u = 6; u < len - 4; u += 11) { if (st.dir === 'z') lines.push([st.x0, st.z0 + u, st.x1, st.z0 + u]); else lines.push([st.x0 + u, st.z0, st.x0 + u, st.z1]); } }
  const per = 14, flags = new THREE.InstancedMesh(flagGeo, flagMat, lines.length * per), m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), e = new THREE.Euler();
  const ropeMat = new THREE.LineBasicMaterial({ color: col('#5a4030') });
  lines.forEach(([x0, z0, x1, z1], li) => { const pts = [];
    for (let i = 0; i <= per; i++) { const k = i / per, y = 4.6 - Math.sin(k * Math.PI) * 0.7; pts.push(new THREE.Vector3(lerp(x0, x1, k), y, lerp(z0, z1, k)));
      if (i < per) { e.set(0, Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2, 0); qq.setFromEuler(e); m4.compose(new THREE.Vector3(lerp(x0, x1, k + 0.5 / per), y - 0.24, lerp(z0, z1, k + 0.5 / per)), qq, new THREE.Vector3(1, 1, 1)); flags.setMatrixAt(li * per + i, m4); flags.setColorAt(li * per + i, flagCols[(i + li) % flagCols.length]); } }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ropeMat)); });
  scene.add(flags);
  // facade banners
  const banMats = ['#c8402e', '#f2c14e', '#2f6fb0'].map(c => toon({ color: col(c), side: THREE.DoubleSide }, '#fff0d0', 2.5, 0.2));
  let bi = 0; for (const st of streets) { const len = st.dir === 'z' ? st.z1 - st.z0 : st.x1 - st.x0;
    for (let u = 9; u < len - 6; u += 17) for (const side of [0, 1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.4), banMats[bi++ % 3]);
      if (st.dir === 'z') { b.position.set(side ? st.x1 - 0.06 : st.x0 + 0.06, 3.7, st.z0 + u + side * 5); b.rotation.y = Math.PI / 2; } else { b.position.set(st.x0 + u + side * 5, 3.7, side ? st.z1 - 0.06 : st.z0 + 0.06); }
      scene.add(b); const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), woodMat); bar.rotation.z = Math.PI / 2; if (st.dir === 'z') bar.rotation.set(Math.PI / 2, 0, 0); bar.position.copy(b.position); bar.position.y += 1.22; scene.add(bar); } }
  // potted plants & pottery clusters along walls (avoid injured, pickups & blockers)
  const potMat = toon({ color: col('#c4683a') }, '#fff0d0', 2.5, 0.3), leafMats = ['#4f9a3a', '#6cb84a', '#3a8a4a'].map(c => toon({ color: col(c) }, '#fff8c0', 2.5, 0.25)), flowerM = toon({ color: col('#ff6a8a') }, '#fff', 2, 0.2);
  const free = (x, z) => walkable(x, z, 0.2) && !blockedBy(x, z, 1.2, { crouch: false, y: 0 }) && !citizens.some(c => Math.hypot(c.x - x, c.z - z) < 2.5) && !pickups.some(p => Math.hypot(p.x - x, p.z - z) < 1.5) && !fires.some(([fx, fz]) => Math.hypot(fx - x, fz - z) < 2) && !fountains.some(([fx, fz]) => Math.hypot(fx - x, fz - z) < 2.5);
  let placed = 0; for (const st of streets) { const len = st.dir === 'z' ? st.z1 - st.z0 : st.x1 - st.x0;
    for (let u = 3; u < len - 2; u += R(5, 9)) { const side = Math.random() < 0.5; let x, z; if (st.dir === 'z') { x = side ? st.x1 - 0.45 : st.x0 + 0.45; z = st.z0 + u; } else { x = st.x0 + u; z = side ? st.z1 - 0.45 : st.z0 + 0.45; }
      if (!free(x, z)) continue; const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g); placed++;
      if (Math.random() < 0.6) { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.18, 0.45, 12), potMat); pot.position.y = 0.22; pot.castShadow = true; g.add(pot);
        const lm = leafMats[placed % 3]; for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(R(0.2, 0.3), 1), lm); l.position.set(R(-0.12, 0.12), 0.6 + R(0, 0.3), R(-0.12, 0.12)); l.castShadow = true; g.add(l); }
        if (Math.random() < 0.5) for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), flowerM); f.position.set(R(-0.25, 0.25), 0.75 + R(0, 0.3), R(-0.25, 0.25)); g.add(f); } }
      else for (let i = 0; i < 3; i++) { const a = new THREE.Mesh(amphoraGeo, terra); a.scale.setScalar(R(0.7, 1)); a.position.set(R(-0.3, 0.3), 0, R(-0.3, 0.3)); a.rotation.z = i === 2 ? 1.3 : 0; if (i === 2) a.position.y = 0.2; a.castShadow = true; g.add(a); }
      colliders.push({ x, z, r: 0.4 }); } }
  // extra goods on market stalls: fruit pyramids & cloth rolls
  stalls.forEach(([x, z], i) => { for (let k = 0; k < 6; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), [grapeM, figM, breadM][(i + k) % 3]); f.position.set(x + 0.9 + R(-0.2, 0.2), 0.95, z + R(-0.9, 0.9)); scene.add(f); } });
}
// ---- ambient crowd ----
const crowd = [];
{ const NC = Math.round(18 * Q), sts = streets.filter(s => s.name !== 'Temple'), styles = ['short', 'bun', 'long', 'curly', 'bald'];
  for (let i = 0; i < NC; i++) { const female = i % 2 === 1, o = { skin: i % 4, tunic: (i * 3 + 1) % 10, hair: (i * 2) % 5, style: female ? ['bun', 'long', 'curly'][i % 3] : styles[i % 5], female, beard: !female && i % 3 === 0, load: i % 4 === 0 ? 'basket' : i % 7 === 3 ? 'amphora' : null };
    const c = makeCitizen(o); scene.add(c.root); const st = i % 3 === 0 ? streets[3] : sts[i % sts.length];
    const rp = () => new THREE.Vector2(R(st.x0 + 1, st.x1 - 1), R(st.z0 + 1, st.z1 - 1));
    let p = rp(); for (let k = 0; k < 10 && (Math.hypot(p.x - player.x, p.y - player.z) < 6 || !walkable(p.x, p.y, 0.5)); k++) p = rp();
    crowd.push({ ...c, st, rp, pos: p, tgt: rp(), base: R(1.0, 1.5), speed: 0, yaw: R(0, 6), phase: R(0, 6), idle: R(0, 3), talk: R(0, 6) }); } }
function updateCrowd(t, dt, panic) {
  for (const c of crowd) {
    const dx = c.tgt.x - c.pos.x, dz = c.tgt.y - c.pos.y, d = Math.hypot(dx, dz);
    if (c.idle > 0 && panic < 0.5) { c.idle -= dt; c.speed = 0; }
    else if (d < 0.6) { c.tgt = c.rp(); c.idle = panic > 0.5 ? 0 : R(1, 5); }
    else { const sp = c.base * (1 + panic * 2.4);
      let [nx, nz] = resolve(c.pos.x, c.pos.y, c.pos.x + dx / d * sp * dt, c.pos.y + dz / d * sp * dt, 0.3);
      const pd = Math.hypot(nx - player.x, nz - player.z); if (pd < 0.9) { nx += (nx - player.x) / pd * (0.9 - pd); nz += (nz - player.z) / pd * (0.9 - pd); }
      const moved = Math.hypot(nx - c.pos.x, nz - c.pos.y); c.speed = moved / Math.max(dt, 1e-4); if (moved < sp * dt * 0.2) c.tgt = c.rp();
      c.pos.set(nx, nz); const ty = Math.atan2(dx, dz); c.yaw += Math.atan2(Math.sin(ty - c.yaw), Math.cos(ty - c.yaw)) * (1 - Math.exp(-8 * dt)); }
    // pose
    const { body, legs, arms, head } = c, k = clamp(c.speed / 4); c.phase += dt * (2 + c.speed * 1.6);
    body.position.y = Math.abs(Math.sin(c.phase)) * 0.05 * k; body.rotation.x = 0.1 * k + 0.12 * panic;
    legs.forEach((l, i) => l.rotation.x = Math.sin(c.phase + i * Math.PI) * 0.75 * k);
    if (panic > 0.5) arms.forEach((a, i) => a.rotation.set(-2.6 + Math.sin(c.phase * 1.3 + i) * 0.4, 0, (i ? -1 : 1) * 0.3));
    else if (c.speed < 0.1) { const g = Math.sin(t * 2.2 + c.talk); arms[0].rotation.set(-0.3 - 0.5 * Math.max(0, g), 0, 0.15); arms[1].rotation.set(-0.2, 0, -0.1 - 0.2 * Math.max(0, -g)); head.rotation.set(0, Math.sin(t * 0.6 + c.talk) * 0.5, 0); }
    else { arms.forEach((a, i) => a.rotation.set(-Math.sin(c.phase + i * Math.PI) * 0.55 * k, 0, (i ? -1 : 1) * 0.08)); head.rotation.set(0, 0, 0); }
    if (c.blink) { const bl = (t * 0.7 + c.phase * 0.01 + c.talk) % 4 < 0.12 ? 0.1 : 1; c.blink.forEach(e => e.scale.y = bl); }
    c.root.position.set(c.pos.x, 0, c.pos.y); c.root.rotation.y = c.yaw; animModel(c, dt, panic);
  }
}

// ================= RIGGED CHARACTERS (KayKit Adventurers, CC0) =================
const TUNIC_HEX = ['#ff4a36', '#2f9bff', '#ffc62e', '#3cd06a', '#b45cff', '#ff8a2e', '#fff2d8', '#ff5aa8', '#20c8c0', '#e8e040'];
const CHARS_ON = GFX !== 'low' && !/[?&]chars=0/.test(location.search);
const _olMats = {}; function OUTLINE_MAT(s) { const k = s.toFixed(3); if (_olMats[k]) return _olMats[k];
  const mt = new THREE.MeshBasicMaterial({ color: col('#2a1a12'), side: THREE.BackSide }); const w = 0.012 / s;
  mt.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normalize(objectNormal) * ' + w.toFixed(5) + ';'); };
  return (_olMats[k] = mt); }
function attachModel(c, M) {
  const d = c.def || c, female = !!d.female, m = SkeletonUtils.clone(M.g.scene), s = (female ? 1.62 : 1.74) / M.h;
  const wrap = new THREE.Group(); wrap.add(m); m.scale.setScalar(s); m.position.y = -M.minY * s;
  const tint = col(TUNIC_HEX[(d.tunic || 0) % TUNIC_HEX.length]).lerp(col('#ffffff'), 0.35);
  const meshes = []; m.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
  for (const o of meshes) { o.castShadow = true; o.frustumCulled = false; const src = o.material;
    o.material = toon({ map: src.map, color: /Body|Leg/i.test(o.name) ? tint : col('#ffffff') }, '#fff0d0', 2.5, 0.22);
    const ol = new THREE.SkinnedMesh(o.geometry, OUTLINE_MAT(s)); ol.bind(o.skeleton, o.bindMatrix); ol.frustumCulled = false; ol.castShadow = false; o.parent.add(ol); ol.position.copy(o.position); ol.quaternion.copy(o.quaternion); ol.scale.copy(o.scale); }
  let bone = null; m.traverse(o => { if (!bone && o.isBone && /lowerarm\.?l|forearm/i.test(o.name)) bone = o; });
  if (bone && c.band) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06 / s, 0.06 / s, 0.1 / s, 10), c.band.material); b.visible = false; bone.add(b); c.band.visible = false; c.band = b; }
  c.body.visible = false; c.root.add(wrap);
  const mixer = new THREE.AnimationMixer(m), act = {}; for (const [n, clip] of Object.entries(M.clips)) act[n] = mixer.clipAction(clip);
  c.md = { wrap, mixer, act, cur: null, acc: 0 }; c.md.mixer.timeScale = R(0.92, 1.08);
}
function animModel(c, dt, panic) {
  const md = c.md; if (!md) return; let clip, ts = 1; md.wrap.position.set(0, 0, 0); md.wrap.rotation.set(0, 0, 0);
  if (c.state === 'injured' || c.state === 'down') { const pz = INJURIES[c.injury].pose; clip = pz === 'lie' && c.state === 'injured' ? 'Lie_Idle' : 'Sit_Floor_Idle'; }
  else if (c.state === 'carried') { clip = 'Lie_Idle'; md.wrap.position.y = c.body.position.y - 0.15; md.wrap.rotation.y = -Math.PI / 2; }
  else { const sp = c.speed || 0; if (sp > 3.4 || (panic > 0.5 && sp > 0.3)) { clip = 'Running_A'; ts = clamp(sp / 5.5, 0.7, 1.5); } else if (sp > 0.25) { clip = 'Walking_A'; ts = clamp(sp / 1.6, 0.6, 1.6); } else clip = c.state === 'saved' ? 'Cheer' : 'Idle'; if (c.state === 'saved' && c.cheerT > 0) { c.cheerT -= dt; clip = 'Cheer'; } }
  const a = md.act[clip] || md.act.Idle; if (md.cur !== a) { a.reset().setEffectiveWeight(1).fadeIn(0.25).play(); if (md.cur) md.cur.fadeOut(0.25); md.cur = a; }
  a.timeScale = ts;
  // distance LOD: far characters animate at lower rate
  const dd = Math.hypot(c.pos.x - player.x, c.pos.y - player.z); md.acc += dt; const step = dd > 45 ? 0.1 : dd > 22 ? 0.033 : 0;
  if (md.acc >= step) { md.mixer.update(md.acc); md.acc = 0; }
}
if (CHARS_ON) {
  const ld = new GLTFLoader(), load = u => new Promise((res, rej) => ld.load(u, res, undefined, rej));
  Promise.all([load('models/Rogue.glb'), load('models/Mage.glb')]).then(gs => {
    const Ms = gs.map(g => { g.scene.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(g.scene); const clips = {}; g.animations.forEach(k => clips[k.name] = k); return { g, h: box.max.y - box.min.y, minY: box.min.y, clips }; });
    for (const c of [...citizens, ...crowd]) attachModel(c, Ms[(c.def || c).female ? 1 : 0]);
    window.__charsReady = true;
  }).catch(e => { console.warn('characters failed, using procedural', e); window.__charsReady = 'fail'; });
} else window.__charsReady = 'off';
// ---- pigeons ----
const pigeons = [];
{ const gm = toon({ color: col('#9aa0aa') }, '#ffffff', 2.5, 0.25), hm = toon({ color: col('#5a7a8a') }, '#fff', 2.5, 0.25), wm = toon({ color: col('#7a808a') }, '#fff', 2.5, 0.2);
  const homes = [[20.5, -24], [26.5, -6], [-38, -41], [1, 2], [-20, -30], [24, -48]].slice(0, MOBILE ? 3 : 6);
  homes.forEach(([hx, hz], gi) => { for (let i = 0; i < 5; i++) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), gm); b.scale.set(1, 0.8, 1.5); b.position.y = 0.1; g.add(b);
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), hm); h.position.set(0, 0.19, 0.11); g.add(h);
      const wings = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.015, 0.12), wm); w.geometry.translate(s * 0.1, 0, 0); w.position.set(s * 0.04, 0.13, 0); g.add(w); return w; });
      const x = hx + R(-1.5, 1.5), z = hz + R(-1.5, 1.5); g.position.set(x, 0, z); g.rotation.y = R(0, 6); scene.add(g);
      pigeons.push({ g, h, wings, home: [x, z], st: 'peck', t: R(0, 5), vx: 0, vy: 0, vz: 0 }); } }); }
function updatePigeons(t, dt) {
  for (const p of pigeons) { const g = p.g;
    if (p.st === 'peck') { p.h.position.y = 0.19 - Math.max(0, Math.sin(t * 5 + p.t * 3)) ** 4 * 0.1; p.wings.forEach(w => w.rotation.z = 0);
      if (Math.sin(t * 0.3 + p.t) > 0.995) g.rotation.y += 0.05;
      const d = Math.hypot(g.position.x - player.x, g.position.z - player.z); if (d < 3.2 && G.state !== 'intro' || (G.timeLeft < 70 && Math.random() < dt * 0.2)) { p.st = 'fly'; p.t = 0; const a = Math.atan2(g.position.x - player.x, g.position.z - player.z) + R(-0.6, 0.6); p.vx = Math.sin(a) * R(4, 6); p.vz = Math.cos(a) * R(4, 6); p.vy = R(3, 5); g.rotation.y = a; if (Math.random() < 0.4) Sfx.flap(); } }
    else if (p.st === 'fly') { p.t += dt; g.position.x += p.vx * dt; g.position.z += p.vz * dt; g.position.y += p.vy * dt; p.vy = Math.max(1.2, p.vy - dt * 1.5);
      p.wings.forEach((w, i) => w.rotation.z = (i ? 1 : -1) * Math.sin(t * 28) * 0.9); if (p.t > 7) { p.st = 'away'; g.visible = false; p.t = 0; } }
    else { p.t += dt; if (p.t > 12 && G.timeLeft > 70 && Math.hypot(p.home[0] - player.x, p.home[1] - player.z) > 12) { p.st = 'peck'; g.visible = true; g.position.set(p.home[0], 0, p.home[1]); } } }
}
// ---- sunny dust motes (fade out as the doom approaches) ----
const motes = particleField(Math.round(500 * Q), '#fff2c0', 0.035, true);
// ---- the surge: pyroclastic cloud rolling down from Vesuvius in the last minute ----
const warn = document.createElement('div'); warn.id = 'warn'; warn.innerHTML = '<b>⚠ PYROCLASTIC SURGE INCOMING</b><span>REACH THE HARBOR!</span>'; $('hud').appendChild(warn);
let ambAcc = 0, rumbleT = 25;
function polishUpdate(dt, t, active, doom, prog) {
  vibUpdate(dt, t, doom);
  const paused = G.state === 'paused' || G.state === 'shop' || G.state === 'start';
  if (!paused) { const panic = clamp((90 - G.timeLeft) / 30) * (G.state === 'intro' ? 0 : 1); updateCrowd(t, dt, panic); updatePigeons(t, dt); }
  motes.pts.material.opacity = 0.35 * (1 - doom) * (1 - prog * 0.6); motes.pts.visible = motes.pts.material.opacity > 0.02; updateParticles(motes, t * 0.3, camera.position.x, camera.position.z, 0.04, false);
  // surge
  const surging = (active || G.state === 'wave') && G.timeLeft < 60;
  if (active && G.timeLeft < 60) { const k = 1 - G.timeLeft / 60; G.waveZ = lerp(-430, -92, k * k * 0.4 + k * 0.6); wall.visible = true; wall.position.set(10, -5 + 10 * k, G.waveZ); wall.scale.set(2.4, 1.2 + 0.6 * k, 1);
    wall.children.forEach((s, i) => { s.material.rotation = t * 0.05 * (i % 2 ? 1 : -1); s.position.y = (s.userData.y ??= s.position.y) + Math.sin(t * 0.7 + i) * 2; });
    if (!G.warned) { G.warned = true; Sfx.alarm(); Sfx.rumble(1); toast('THE SURGE IS COMING — GET EVERYONE TO THE HARBOR!', 4); } }
  warn.classList.toggle('on', !!(active && G.timeLeft < 60)); warn.classList.toggle('urgent', !!(active && G.timeLeft < 20));
  if (G.state === 'wave') wall.scale.set(2.4, 1.8, 1);
  // ambience (crowd murmur, calls, birds, volcano rumbles)
  if (Sfx.ctx && !paused) { ambAcc += dt; if (ambAcc > 0.5) { ambAcc = 0;
      const near = crowd.filter(c => Math.hypot(c.pos.x - player.x, c.pos.y - player.z) < 18).length; const panic = clamp((90 - G.timeLeft) / 30);
      Sfx.setCrowd(G.state === 'start' ? 0 : clamp(near / 6) * 0.35 * (1 + panic) + 0.04, panic);
      if (near > 1 && Math.random() < 0.12 && panic < 0.5) Sfx.call();
      if (pigeons.some(p => p.st === 'peck' && Math.hypot(p.g.position.x - player.x, p.g.position.z - player.z) < 8) && Math.random() < 0.15) Sfx.coo();
      if (doom < 0.3 && Math.random() < 0.1) Sfx.chirp(); }
    if (active) { rumbleT -= dt; if (rumbleT <= 0) { rumbleT = lerp(40, 12, prog) * R(0.7, 1.3); Sfx.rumble(0.4 + prog * 0.6); G.shake = Math.max(G.shake, 0.01 + prog * 0.03); } } }
  if (active) tutUpdate(dt);
}
// ---- pause-menu settings: separate music / sfx volume, tutorial toggle ----
function addSettings() {
  const tutOn = !localStorage.getItem('adam_tut_done');
  $('sBody').insertAdjacentHTML('beforeend', `<div class="settings"><label>MUSIC<input type="range" id="volMusic" min="0" max="1" step="0.02" value="${Sfx.vol.music}"><b id="volMusicV">${Math.round(Sfx.vol.music * 100)}%</b></label>
    <label>SOUND FX<input type="range" id="volSfx" min="0" max="1" step="0.02" value="${Sfx.vol.sfx}"><b id="volSfxV">${Math.round(Sfx.vol.sfx * 100)}%</b></label>
    <label>GRAPHICS<select id="gfxSel">${['low', 'medium', 'high'].map(q => `<option value="${q}" ${q === GFX ? 'selected' : ''}>${q[0].toUpperCase() + q.slice(1)}</option>`).join('')}</select><b id="gfxV"></b></label>
    <label class="chk"><input type="checkbox" id="tutChk" ${tutOn ? 'checked' : ''}> Show tutorial next run</label></div>`);
  for (const [id, k] of [['volMusic', 'music'], ['volSfx', 'sfx']]) $(id).addEventListener('input', e => { Sfx.setVol(k, +e.target.value); $(id + 'V').textContent = Math.round(e.target.value * 100) + '%'; });
  $('tutChk').addEventListener('change', e => { if (e.target.checked) localStorage.removeItem('adam_tut_done'); else localStorage.setItem('adam_tut_done', '1'); });
  $('gfxSel').addEventListener('change', e => { const q = e.target.value; localStorage.setItem('adam_gfx', q); pixelRatio = Math.min(devicePixelRatio || 1, PR[q]); resize(); renderer.shadowMap.enabled = q !== 'low' || !MOBILE; $('gfxV').textContent = 'textures: next load'; });
  $('sBody').querySelectorAll('input,select').forEach(i => ['touchstart', 'mousedown', 'click'].forEach(ev => i.addEventListener(ev, e => e.stopPropagation())));
}
// ---- tutorial (first run only; re-enable in pause menu) ----
const tutEl = document.createElement('div'); tutEl.id = 'tut'; $('hud').appendChild(tutEl);
const TUT = [
  { k: 'move', t: () => MOBILE ? 'Use the <b>left stick</b> to move · drag on the <b>right side</b> to look' : '<span class="key">W A S D</span> to move · <b>mouse</b> to look', done: s => s.dist > 5 },
  { k: 'sprint', t: () => MOBILE ? 'Push the stick <b>all the way</b> to sprint. Watch your <b>STAMINA</b> — when it is empty Adam must rest' : 'Hold <span class="key">SHIFT</span> to sprint. Watch your <b>STAMINA</b> — when it is empty Adam must rest', done: s => s.spr > 1.2 },
  { k: 'treat', t: () => `Marcus is hurt (red ring ahead). Walk up to him and <b>hold</b> ${MOBILE ? '<span class="key">E</span> button' : '<span class="key">E</span>'} to treat him`, done: () => citizens[0].state !== 'injured' },
  { k: 'follow', t: () => 'Treated people <b>follow you</b>. Lead them to the <b>HARBOR</b> (blue beacon, east). Each rescue = ⌛ credits', done: s => s.st > 7 || G.saved > 0 },
  { k: 'eat', t: () => `Thirsty? ${MOBILE ? '💧 button' : '<span class="key">R</span>'} to drink · Hungry? ${MOBILE ? '🍞 button' : '<span class="key">T</span>'} to eat · fountains are free`, done: s => s.rt || s.st > 8 },
  { k: 'depot', t: () => 'The <b>⌛ TIME DEPOT</b> (striped awning, yellow ■ on the map) sells better tools for your credits', done: s => s.st > 7 },
  { k: 'map', t: () => `Open the <b>MAP</b> with ${MOBILE ? 'the MAP button' : '<span class="key">M</span>'} to find the injured. Good luck, Adam!`, done: s => s.m || s.st > 8 },
];
function tutStart() { if (localStorage.getItem('adam_tut_done')) { G.tut = null; tutEl.classList.remove('on'); return; } G.tut = { i: 0, st: 0, dist: 0, spr: 0, rt: 0, m: 0, px: player.x, pz: player.z }; G.nextDebris = 50; tutShow(); }
function tutShow() { const s = G.tut; tutEl.innerHTML = `<div class="tk">TUTORIAL ${s.i + 1}/${TUT.length}</div><div class="tt">${TUT[s.i].t()}</div><div class="ts">${MOBILE ? '<span class="tskip">SKIP ▸▸</span>' : '<span class="key">ENTER</span> skip tutorial'}</div>`; tutEl.classList.add('on'); tutEl.classList.remove('pop'); void tutEl.offsetWidth; tutEl.classList.add('pop');
  const sk = tutEl.querySelector('.tskip'); if (sk) sk.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); tutEnd(); }, { passive: false }); }
function tutEnd() { G.tut = null; tutEl.classList.remove('on'); try { localStorage.setItem('adam_tut_done', '1'); } catch (e) { } }
function tutKey(code) { const s = G.tut; if (!s) return; if (code === 'Enter') return tutEnd(); if (code === 'KeyR' || code === 'KeyT') s.rt = 1; if (code === 'KeyM') s.m = 1; }
function tutUpdate(dt) { const s = G.tut; if (!s || G.state !== 'play') return; s.st += dt; s.dist += Math.hypot(player.x - s.px, player.z - s.pz); s.px = player.x; s.pz = player.z; if (keys.ShiftLeft && player.speed > 5) s.spr += dt;
  if (TUT[s.i].done(s)) { Sfx.chime(); s.i++; s.st = 0; if (s.i >= TUT.length) tutEnd(); else tutShow(); } }
window.__polish = { crowd, pigeons, tutEnd, get tut() { return G.tut; } };

// ================= VIBRANCY: greenery, frescoes, signs, laundry, produce, water, sun =================
const laundry = [];
const VQ = GFX === 'low' ? 0.45 : GFX === 'medium' ? 0.75 : 1;
const sMat = c => new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.8 });
const leafCols = ['#2e8a34', '#4aa83a', '#3c9a48', '#62b84a', '#2a7a3a'];
const leafMs = leafCols.map(sMat), trunkM = sMat('#7a5232'), flowerCols = ['#ff3a6a', '#ffd23a', '#ff7a2a', '#e040ff', '#ffffff', '#ff4a3a', '#5ab0ff'];
const flowerMs = flowerCols.map(c => new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.6, emissive: col(c), emissiveIntensity: 0.12 }));
// wall edges along every street (x = const or z = const) facing inward
const walls = []; streets.forEach(st => { if (st.dir === 'z') { walls.push({ ax: 'x', c: st.x0, n: 1, a0: st.z0, a1: st.z1 }, { ax: 'x', c: st.x1, n: -1, a0: st.z0, a1: st.z1 }); } else { walls.push({ ax: 'z', c: st.z0, n: 1, a0: st.x0, a1: st.x1 }, { ax: 'z', c: st.z1, n: -1, a0: st.x0, a1: st.x1 }); } });
const inStreet = (x, z, m = 0) => streets.some(s => x > s.x0 + m && x < s.x1 - m && z > s.z0 + m && z < s.z1 - m) || inHarbor(x, z);
function wallSpot(off) { for (let k = 0; k < 20; k++) { const w = walls[Math.floor(Math.random() * walls.length)]; const a = lerp(w.a0 + 2, w.a1 - 2, Math.random());
  const x = w.ax === 'x' ? w.c + w.n * off : a, z = w.ax === 'x' ? a : w.c + w.n * off; const bx = w.ax === 'x' ? w.c - w.n * 0.6 : a, bz = w.ax === 'x' ? a : w.c - w.n * 0.6;
  if (inStreet(bx, bz)) continue; return { x, z, rot: w.ax === 'x' ? (w.n > 0 ? Math.PI / 2 : -Math.PI / 2) : (w.n > 0 ? 0 : Math.PI), w }; } return null; }
// --- frescoes: Pompeian panels (red/yellow/black with garlands, birds, figures) ---
function frescoTex(seed) { return canvasTex2(512, 256, (g, w, h) => {
  const base = ['#b8302a', '#e0a83a', '#1e1a22', '#2a6a5a', '#c84a30'][seed % 5]; g.fillStyle = base; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#f4e2b0'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); g.lineWidth = 2; g.strokeRect(24, 24, w - 48, h - 48);
  const pc = ['#f2d27a', '#7ab0d8', '#e85a4f', '#5ab06a', '#fff4dc'];
  for (let p = 0; p < 3; p++) { const x0 = 40 + p * (w - 80) / 3; g.fillStyle = p === 1 ? pc[seed % 5] : 'rgba(255,240,210,.12)'; g.fillRect(x0 + 8, 36, (w - 80) / 3 - 16, h - 72); }
  g.fillStyle = '#3a7a3a'; for (let i = 0; i < 26; i++) { const t = i / 25; g.beginPath(); g.ellipse(40 + t * (w - 80), 46 + Math.sin(t * Math.PI * 3) * 14, 7, 4, t * 6, 0, 7); g.fill(); }
  g.fillStyle = ['#e85a4f', '#ffd23a', '#ffffff'][seed % 3]; for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(50 + i * (w - 100) / 9, 50 + Math.sin(i) * 10, 4, 0, 7); g.fill(); }
  // central figure / bird / vase
  const cx = w / 2, cy = h / 2 + 18; g.fillStyle = '#3a2418';
  if (seed % 3 === 0) { g.beginPath(); g.ellipse(cx, cy, 16, 34, 0, 0, 7); g.fill(); g.beginPath(); g.arc(cx, cy - 44, 11, 0, 7); g.fill(); g.fillStyle = '#e85a4f'; g.beginPath(); g.moveTo(cx - 18, cy - 20); g.lineTo(cx + 22, cy + 30); g.lineTo(cx - 20, cy + 34); g.fill(); }
  else if (seed % 3 === 1) { g.fillStyle = '#2a5a8a'; g.beginPath(); g.ellipse(cx, cy, 26, 14, -0.3, 0, 7); g.fill(); g.beginPath(); g.arc(cx + 24, cy - 12, 8, 0, 7); g.fill(); g.fillStyle = '#ffb030'; g.fillRect(cx + 30, cy - 13, 10, 3); }
  else { g.fillStyle = '#c06a3a'; g.beginPath(); g.moveTo(cx - 14, cy - 34); g.lineTo(cx + 14, cy - 34); g.lineTo(cx + 24, cy + 10); g.lineTo(cx, cy + 36); g.lineTo(cx - 24, cy + 10); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 400; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }); }
function canvasTex2(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const frescoMs = [0, 1, 2, 3, 4, 5].map(i => new THREE.MeshStandardMaterial({ map: frescoTex(i), roughness: 0.9 }));
for (let i = 0; i < 26 * VQ; i++) { const s = wallSpot(0.04); if (!s) continue; const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), frescoMs[i % 6]); m.position.set(s.x, R(3.4, 4.0), s.z); m.rotation.y = s.rot; scene.add(m); }
// --- painted shop signs ---
const SIGNS = [['TABERNA', '#c8402e'], ['PISTRINVM', '#e0a83a'], ['THERMOPOLIVM', '#2a6a5a'], ['VINVM', '#7a2a6a'], ['GARVM', '#2f6fb0'], ['FVLLONICA', '#3a8a3a'], ['POMA', '#e85a2a'], ['OLEVM', '#a08a2a']];
const signMs = SIGNS.map(([t, c]) => new THREE.MeshStandardMaterial({ roughness: 0.7, map: canvasTex2(512, 128, (g, w, h) => { g.fillStyle = '#6a4424'; g.fillRect(0, 0, w, h); g.fillStyle = c; g.fillRect(8, 8, w - 16, h - 16); g.strokeStyle = '#ffe6a0'; g.lineWidth = 4; g.strokeRect(16, 16, w - 32, h - 32);
  g.fillStyle = '#fff4dc'; g.font = 'bold 64px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, w / 2, h / 2 + 4, w - 60); }) }));
for (let i = 0; i < 22 * VQ; i++) { const s = wallSpot(0.09); if (!s) continue; const m = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.06), [trunkM, trunkM, trunkM, trunkM, signMs[i % SIGNS.length], trunkM]); m.position.set(s.x, 3.05, s.z); m.rotation.y = s.rot; scene.add(m); }
// --- ivy / vines climbing walls (instanced leaves) ---
{ const n = Math.floor(4000 * VQ), g = new THREE.PlaneGeometry(0.13, 0.13); const ivy = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, side: THREE.DoubleSide }), n); const d = new THREE.Object3D(); let k = 0;
  for (let p = 0; p < 26 * VQ && k < n; p++) { const s = wallSpot(0.06); if (!s) continue; const hgt = R(2.5, 6), wid = R(0.8, 2.2);
    for (let j = 0; j < n / (26 * VQ) && k < n; j++) { const v = Math.random(), u = (Math.random() - 0.5) * wid * (1 - v * 0.5); const tx = s.w.ax === 'x' ? 0 : u, tz = s.w.ax === 'x' ? u : 0;
      d.position.set(s.x + tx + (s.w.ax === 'x' ? s.w.n * R(0, 0.08) : 0), v * hgt + 0.2, s.z + tz + (s.w.ax === 'z' ? s.w.n * R(0, 0.08) : 0)); d.rotation.set(R(-0.6, 0.6), s.rot + R(-0.6, 0.6), R(0, 6)); d.scale.setScalar(R(0.6, 1.3)); d.updateMatrix(); ivy.setMatrixAt(k, d.matrix); ivy.setColorAt(k, col(leafCols[k % 5]).multiplyScalar(R(0.8, 1.2))); k++; } }
  ivy.count = k; scene.add(ivy); }
// --- trees: cypress & olive, bushes ---
const cypG = new THREE.ConeGeometry(0.7, 1, 9), oliveG = new THREE.IcosahedronGeometry(1, 1), bushG = new THREE.IcosahedronGeometry(0.5, 1);
const oliveM = sMat('#7aa04a'), cypM = sMat('#2a6a34');
function cypress(x, z, h = R(6, 9)) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 6), trunkM); t.position.set(x, 0.6, z); scene.add(t); const c = new THREE.Mesh(cypG, cypM); c.scale.set(R(0.9, 1.2), h, R(0.9, 1.2)); c.position.set(x, 1 + h / 2, z); c.castShadow = true; scene.add(c); colliders.push({ x, z, r: 0.5 }); }
function olive(x, z) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.28, 2.4, 7), trunkM); t.position.set(x, 1.2, z); t.rotation.z = R(-0.2, 0.2); t.castShadow = true; scene.add(t);
  for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(oliveG, i % 2 ? oliveM : leafMs[3]); c.position.set(x + R(-1.1, 1.1), R(2.5, 3.4), z + R(-1.1, 1.1)); c.scale.set(R(0.9, 1.4), R(0.6, 0.9), R(0.9, 1.4)); c.castShadow = true; scene.add(c); } colliders.push({ x, z, r: 0.45 }); }
function bush(x, z) { for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(bushG, leafMs[i % 5]); b.position.set(x + R(-0.4, 0.4), 0.35, z + R(-0.4, 0.4)); b.scale.setScalar(R(0.7, 1.2)); b.castShadow = true; scene.add(b);
  if (Math.random() < 0.7) for (let f = 0; f < 6; f++) { const fl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), flowerMs[(i + f) % 7]); fl.position.set(b.position.x + R(-0.4, 0.4), b.position.y + R(0.1, 0.45), b.position.z + R(-0.4, 0.4)); scene.add(fl); } } colliders.push({ x, z, r: 0.6 }); }
// along kerbs (sidewalk margin, 0.8 m from wall) and in the temple / harbor areas
let tc = 0; for (let i = 0; i < 70 * VQ; i++) { const s = wallSpot(0.7); if (!s) continue; const near = citizens.some(c => Math.hypot(c.pos.x - s.x, c.pos.y - s.z) < 2.5) || pickups.some(p => Math.hypot(p.x - s.x, p.z - s.z) < 1.5);
  if (near || blockedBy && blockers.some(b => s.x > b.x0 - 1 && s.x < b.x1 + 1 && s.z > b.z0 - 1 && s.z < b.z1 + 1)) continue; (tc++ % 3 === 0 ? (tc % 2 ? cypress : olive) : bush)(s.x, s.z); }
for (const [x, z] of [[19, -82], [31, -82], [-6.5, 16], [6.5, 16], [51, -46], [51, -14], [-47, -24], [-47, -36]]) cypress(x, z, R(7, 10));
// --- laundry lines across narrow streets ---
{ const lm = new THREE.LineBasicMaterial({ color: 0x5a4a3a }); const cloth = ['#ffffff', '#ff6a5a', '#5ab0ff', '#ffd23a', '#8ad06a', '#ff9ad0'].map(c => new THREE.MeshStandardMaterial({ color: col(c), side: THREE.DoubleSide, roughness: 0.9 }));
  const lines = []; for (const st of streets) { if (st.dir !== 'z' || st.x1 - st.x0 > 10) continue; for (let z = st.z1 - 6; z > st.z0 + 4; z -= R(9, 15)) lines.push([st.x0, st.x1, z, R(4.4, 5.2)]); }
  for (const st of streets) if (st.dir === 'x') for (let x = st.x0 + 6; x < st.x1 - 4; x += R(12, 18)) lines.push(['x', x, st.z0, st.z1, R(4.4, 5.2)]);
  lines.slice(0, Math.floor(16 * VQ + 2)).forEach(L => { const pts = []; const isX = L[0] === 'x'; for (let i = 0; i <= 10; i++) { const t = i / 10, sag = Math.sin(t * Math.PI) * 0.35; pts.push(isX ? new THREE.Vector3(L[1], L[4] - sag, lerp(L[2], L[3], t)) : new THREE.Vector3(lerp(L[0], L[1], t), L[3] - sag, L[2])); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm));
    for (let i = 1; i < 10; i += Math.random() < 0.5 ? 1 : 2) { const p = pts[i]; const c = new THREE.Mesh(new THREE.PlaneGeometry(R(0.4, 0.8), R(0.5, 0.9)), cloth[Math.floor(Math.random() * 6)]); c.geometry.translate(0, -c.geometry.parameters.height / 2, 0); c.position.copy(p); c.rotation.y = isX ? 0 : Math.PI / 2; c.rotation.y += Math.PI / 2; c.userData.sw = R(0, 6); laundry.push(c); scene.add(c); } }); }
// --- produce piles & colourful crates near stalls ---
{ const prod = ['#ff8a1a', '#ffe23a', '#c0201a', '#5ac83a', '#7a2a8a', '#f2e0b0', '#ff5a2a'].map(c => new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.5 }));
  const sg = new THREE.SphereGeometry(0.07, 8, 6);
  stalls.forEach(([x, z], i) => { for (const dz of [-0.7, 0, 0.7]) { const m = prod[(i * 3 + Math.round(dz * 10)) % 7 < 0 ? 0 : (i * 3 + Math.round((dz + 1) * 3)) % 7]; const n = Math.floor(14 * VQ) + 4;
      const im = new THREE.InstancedMesh(sg, m, n); const d = new THREE.Object3D(); for (let k = 0; k < n; k++) { const lay = k < n * 0.6 ? 0 : 1; d.position.set(x + 0.9 + R(-0.18, 0.18) * (1 - lay * 0.5), 0.97 + lay * 0.1, z + dz + R(-0.25, 0.25) * (1 - lay * 0.5)); d.scale.setScalar(R(0.8, 1.2)); d.updateMatrix(); im.setMatrixAt(k, d.matrix); } scene.add(im); } }); }
// --- bright flower window boxes ---
for (let i = 0; i < 30 * VQ; i++) { const s = wallSpot(0.2); if (!s) continue; const g = new THREE.Group(); g.position.set(s.x, R(4.2, 5.2), s.z); g.rotation.y = s.rot; scene.add(g);
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.3), woodMat); g.add(b); for (let f = 0; f < 9; f++) { const fl = new THREE.Mesh(new THREE.SphereGeometry(R(0.07, 0.11), 6, 4), f % 3 ? flowerMs[(i + f) % 7] : leafMs[f % 5]); fl.position.set(R(-0.55, 0.55), 0.18 + R(0, 0.12), R(-0.08, 0.08)); g.add(fl); } }
// --- harbor water: sky reflections, animated ripples, sparkles ---
let waterSparks = null;
{ const wm = export_water.m; if (wm) { const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene(); const sk = sky.clone(); sk.material = sky.material; es.add(sk); wm.envMap = pm.fromScene(es, 0, 1, 3000).texture; wm.envMapIntensity = 1.1; wm.color.set('#1f8fb0'); wm.roughness = 0.08; wm.metalness = 0.35; pm.dispose(); }
  if (GFX !== 'low') { const n = 500, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = R(72, 140); p[i * 3 + 1] = -0.6; p[i * 3 + 2] = R(-70, 10); } g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    waterSparks = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color: col('#fff4d0'), size: 0.5, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(waterSparks); } }
// --- sun glare sprite ---
const sunGlare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col('#fff0c0'), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0.9 }));
sunGlare.scale.set(260, 260, 1); scene.add(sunGlare);
const SUND = new THREE.Vector3(0.45, 0.6, -0.55).normalize(), _sv = new THREE.Vector3();
function vibUpdate(dt, t, doom) {
  const wm = export_water.m; if (wm && wm.normalMap) { wm.normalMap.offset.set(t * 0.01, t * 0.006); }
  if (waterSparks) { waterSparks.material.opacity = (0.5 + 0.5 * Math.sin(t * 9)) * (1 - doom); waterSparks.material.size = 0.35 + 0.25 * Math.sin(t * 13.7); }
  for (const b of boats) { b.position.y = -0.35 + Math.sin(t * 1.3 + b.position.x) * 0.08; b.rotation.z = Math.sin(t * 1.1 + b.position.z) * 0.04; }
  for (const c of laundry) c.rotation.x = Math.sin(t * 2 + c.userData.sw) * 0.18;
  sunGlare.position.copy(camera.position).addScaledVector(SUND, 2000); sunGlare.material.opacity = 0.9 * (1 - doom);
  _sv.copy(camera.position).addScaledVector(SUND, 1000).project(camera); const on = _sv.z < 1 && Math.abs(_sv.x) < 1.6 && Math.abs(_sv.y) < 1.6;
  paint.uniforms.sunP.value.set(_sv.x * 0.5 + 0.5, _sv.y * 0.5 + 0.5, on ? (1 - doom) : 0); paint.uniforms.sat.value = lerp(1.25, 1.0, doom);
}

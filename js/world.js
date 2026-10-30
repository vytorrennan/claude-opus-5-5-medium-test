import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BLOCKS, tile, rng, sampleColors } from './textures.js';

const WATER_LEVEL = 3;
const EXTRA_CAPACITY = 400;
const key = (x, y, z) => `${x},${y},${z}`;

// --- noise -----------------------------------------------------------------
function lattice(x, z, seed) {
  const s = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, z, seed) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = lattice(xi, zi, seed), b = lattice(xi + 1, zi, seed);
  const c = lattice(xi, zi + 1, seed), d = lattice(xi + 1, zi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, seed) {
  let sum = 0, amp = 0.5, f = 1;
  for (let i = 0; i < 4; i++) {
    sum += amp * vnoise(x * f, z * f, seed + i * 17);
    amp *= 0.5;
    f *= 2;
  }
  return sum;
}

// --- textures & materials --------------------------------------------------
const texCache = new Map();
function tex(name) {
  if (!texCache.has(name)) {
    const t = new THREE.CanvasTexture(tile(name));
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(name, t);
  }
  return texCache.get(name);
}

function materialsFor(type, glowMaterials) {
  const def = BLOCKS[type];
  const made = new Map();
  const mk = (name) => {
    if (made.has(name)) return made.get(name);
    const opts = { map: tex(name) };
    if (def.transparent) Object.assign(opts, { transparent: true, opacity: 0.72, depthWrite: false });
    if (def.glow) Object.assign(opts, { emissive: 0xffffff, emissiveMap: tex(name), emissiveIntensity: 0.15 });
    const m = new THREE.MeshLambertMaterial(opts);
    if (def.glow) glowMaterials.push(m);
    made.set(name, m);
    return m;
  };
  const side = mk(def.side);
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z
  return [side, side, mk(def.top), mk(def.bottom), side, side];
}

// --- sky -------------------------------------------------------------------
const SKY = {
  day: { top: new THREE.Color(0x4a9fff), bottom: new THREE.Color(0xcfeaff), hemi: 1.6, sun: 2.4, glow: 0.15, stars: 0 },
  night: { top: new THREE.Color(0x05061a), bottom: new THREE.Color(0x1d2552), hemi: 0.35, sun: 0.45, glow: 1.4, stars: 1 },
};

export class VoxelWorld {
  constructor(canvas, { onEvent = () => {} } = {}) {
    this.canvas = canvas;
    this.onEvent = onEvent;
    this.selected = 'grass';
    this.night = 0; // 0 = day, 1 = night (animated)
    this.nightTarget = 0;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(SKY.day.bottom.clone(), 70, 170);
    this.scene = scene;

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
    this.camera.position.set(34, 24, 34);

    const controls = new OrbitControls(this.camera, canvas);
    controls.target.set(0, 1, 0);
    controls.enableDamping = true;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = !this.reducedMotion;
    controls.autoRotateSpeed = 0.55;
    controls.minPolarAngle = 0.55;
    controls.maxPolarAngle = 1.5;
    // On touch screens let one-finger swipes scroll the page instead of orbiting.
    if (matchMedia('(pointer: coarse)').matches) {
      controls.enableRotate = false;
      canvas.style.touchAction = 'pan-y';
    }
    this.controls = controls;

    this.buildSky();
    this.buildLights();

    this.world = new THREE.Group();
    scene.add(this.world);
    this.glowMaterials = [];
    this.materials = {};
    for (const type of Object.keys(BLOCKS)) this.materials[type] = materialsFor(type, this.glowMaterials);
    this.geometry = new THREE.BoxGeometry(1, 1, 1);

    this.buildClouds();
    this.buildParticles();
    this.buildHighlight();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.bindInput();

    this.clock = new THREE.Clock();
    this.running = true;
    new IntersectionObserver(([e]) => (this.running = e.isIntersecting)).observe(canvas);
    addEventListener('resize', () => this.resize());

    this.generate(1337);
    this.resize();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  // --- scene pieces --------------------------------------------------------
  buildSky() {
    this.skyUniforms = {
      top: { value: SKY.day.top.clone() },
      bottom: { value: SKY.day.bottom.clone() },
    };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(300, 24, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: this.skyUniforms,
        vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vPos;
          void main(){ float h = clamp(normalize(vPos).y * 1.6 + 0.25, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }`,
      })
    );
    sky.renderOrder = -1;
    this.scene.add(sky);

    // Stars
    const r = rng(42);
    const pos = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      const th = r() * Math.PI * 2, ph = Math.acos(r() * 0.95);
      pos.set([Math.sin(ph) * Math.cos(th) * 250, Math.cos(ph) * 250, Math.sin(ph) * Math.sin(th) * 250], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false }));
    this.scene.add(this.stars);

    // Square sun & moon on a rotating arm
    this.celestial = new THREE.Group();
    const sprite = (name, scale) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(name), fog: false }));
      s.scale.set(scale, scale, 1);
      return s;
    };
    this.sun = sprite('sun', 22);
    this.sun.position.set(0, 200, -60);
    this.moon = sprite('moon', 16);
    this.moon.position.set(0, -200, 60);
    this.celestial.add(this.sun, this.moon);
    this.celestial.rotation.z = -0.5;
    this.scene.add(this.celestial);
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xdff1ff, 0x6b5a3a, SKY.day.hemi);
    this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xfff1d6, SKY.day.sun);
    sun.position.set(25, 40, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 120 });
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.02;
    this.sunLight = sun;
    this.scene.add(sun);
    this.lanterns = [];
  }

  buildClouds() {
    this.clouds = [];
    const r = rng(7);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, emissive: 0xffffff, emissiveIntensity: 0.25 });
    this.cloudMat = mat;
    for (let i = 0; i < 9; i++) {
      const parts = [];
      const w = 3 + Math.floor(r() * 4), d = 2 + Math.floor(r() * 3);
      for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
        if ((x === 0 || x === w - 1) && (z === 0 || z === d - 1) && r() < 0.7) continue;
        parts.push(new THREE.BoxGeometry(1, 1, 1).translate(x, 0, z));
      }
      const m = new THREE.Mesh(mergeGeometries(parts), mat);
      m.scale.set(3, 1.4, 3);
      m.position.set(-90 + r() * 180, 20 + r() * 12, -90 + r() * 180);
      m.userData.speed = 0.8 + r() * 1.2;
      this.clouds.push(m);
      this.scene.add(m);
    }
  }

  buildParticles() {
    // Break debris
    this.debris = [];
    const g = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    for (let i = 0; i < 80; i++) {
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      m.visible = false;
      m.userData = { vel: new THREE.Vector3(), life: 0 };
      this.debris.push(m);
      this.world.add(m);
    }
    // Waterfall
    const wf = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.35, 0.6, 0.35),
      new THREE.MeshLambertMaterial({ color: 0x8cc8ff, transparent: true, opacity: 0.65, emissive: 0x2a6ab0, emissiveIntensity: 0.3 }),
      140
    );
    wf.frustumCulled = false;
    this.waterfall = wf;
    this.fallDrops = Array.from({ length: 140 }, () => ({ p: new THREE.Vector3(), v: 0, life: Math.random() }));
    this.world.add(wf);
  }

  buildHighlight() {
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02));
    this.highlight = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.8 }));
    this.highlight.visible = false;
    this.world.add(this.highlight);
  }

  // --- world data ----------------------------------------------------------
  set(x, y, z, type) {
    this.blocks.set(key(x, y, z), type);
  }

  generate(seed) {
    this.seed = seed;
    const r = rng(seed);
    this.blocks = new Map();
    const columns = [];
    const R = 13;

    for (let x = -R - 3; x <= R + 3; x++) for (let z = -R - 3; z <= R + 3; z++) {
      const ang = Math.atan2(z, x);
      const rim = R * (0.82 + 0.32 * vnoise(Math.cos(ang) * 2 + 5, Math.sin(ang) * 2 + 5, seed));
      const d = Math.hypot(x, z) / rim;
      if (d > 1) continue;
      const top = Math.round(2.5 + fbm(x * 0.11, z * 0.11, seed) * 9 * (1 - d * d * 0.65) - d * 0.5);
      const bottom = -Math.round(Math.pow(1 - d, 0.65) * 12 + vnoise(x * 0.35, z * 0.35, seed + 9) * 3);
      columns.push({ x, z, d, top, bottom });
    }

    // Level a plot for the dev hut near the center.
    const hut = { x: 2, z: -2 };
    const center = columns.find((c) => c.x === hut.x && c.z === hut.z);
    hut.y = Math.max(WATER_LEVEL + 1, center ? center.top : 5);
    for (const c of columns) {
      if (Math.abs(c.x - hut.x) <= 3 && Math.abs(c.z - hut.z) <= 3) c.top = hut.y;
    }

    for (const c of columns) {
      const beach = c.top <= WATER_LEVEL && c.d < 0.86;
      for (let y = Math.min(c.bottom, c.top - 1); y <= c.top; y++) {
        let type;
        if (y === c.top) type = beach ? 'sand' : 'grass';
        else if (y > c.top - 3) type = beach ? 'sand' : 'dirt';
        else if (y < c.bottom + 2) type = 'deep';
        else {
          type = 'stone';
          const roll = r();
          if (y < 0 && roll < 0.05) type = y < -6 ? (roll < 0.02 ? 'diamond' : 'amethyst') : roll < 0.025 ? 'gold' : roll < 0.04 ? 'redstone' : 'emerald';
        }
        this.set(c.x, y, c.z, type);
      }
      if (c.top < WATER_LEVEL && c.d < 0.86) for (let y = c.top + 1; y <= WATER_LEVEL; y++) this.set(c.x, y, c.z, 'water');
    }

    this.buildHut(hut);

    // Trees
    const trees = [];
    const candidates = columns.filter((c) => c.d < 0.8 && c.top > WATER_LEVEL && (Math.abs(c.x - hut.x) > 5 || Math.abs(c.z - hut.z) > 5));
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    for (const c of candidates) {
      if (trees.length >= 6) break;
      if (trees.some((t) => Math.hypot(t.x - c.x, t.z - c.z) < 4.5)) continue;
      trees.push(c);
      this.buildTree(c.x, c.top + 1, c.z, r);
    }

    // Satellite islets
    const islets = [[-21, 7, -9, 4], [19, 11, -15, 3], [-12, -5, 21, 3.5], [22, -2, 14, 2.5]];
    for (const [ix, iy, iz, ir] of islets) this.buildIslet(ix, iy, iz, ir, r);

    // Waterfall source: the lowest rim column
    const rim = columns.filter((c) => c.d > 0.85).sort((a, b) => a.top - b.top)[0];
    this.set(rim.x, rim.top, rim.z, 'water');
    const out = new THREE.Vector2(rim.x, rim.z).normalize();
    this.fallSource = new THREE.Vector3(rim.x + out.x * 0.7, rim.top, rim.z + out.y * 0.7);

    this.buildMeshes();
  }

  buildHut({ x, y, z }) {
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) this.set(x + dx, y, z + dz, 'plank');
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) for (let h = 1; h <= 3; h++) this.set(x + dx, y + h, z + dz, 'log');
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
      if (Math.abs(dx) === 3 && Math.abs(dz) === 3) continue;
      this.set(x + dx, y + 4, z + dz, 'plank');
    }
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) this.set(x + dx, y + 5, z + dz, 'plank');
    // Desk with two monitors
    this.set(x - 1, y + 1, z - 1, 'plank');
    this.set(x, y + 1, z - 1, 'plank');
    this.set(x - 1, y + 2, z - 1, 'screen');
    this.set(x, y + 2, z - 1, 'screen');
    this.set(x + 1, y + 3, z + 1, 'glow');
    this.set(x - 3, y + 1, z + 3, 'glow');
    this.lanternSpots = [[x + 1, y + 3, z + 1], [x - 0.5, y + 2, z - 0.2], [x - 3, y + 1, z + 3]];
  }

  buildTree(x, y, z, r) {
    const h = 4 + Math.floor(r() * 2);
    for (let i = 0; i < h; i++) this.set(x, y + i, z, 'log');
    for (let dy = h - 2; dy <= h + 1; dy++) {
      const rad = dy >= h ? 1 : 2;
      for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
        if (Math.abs(dx) === rad && Math.abs(dz) === rad && (dy === h + 1 || r() < 0.5)) continue;
        const k = key(x + dx, y + dy, z + dz);
        if (!this.blocks.has(k)) this.blocks.set(k, 'leaves');
      }
    }
  }

  buildIslet(cx, cy, cz, rad, r) {
    let top = null;
    for (let x = -Math.ceil(rad); x <= rad; x++) for (let z = -Math.ceil(rad); z <= rad; z++) {
      const d = Math.hypot(x, z) / rad;
      if (d > 1) continue;
      const depth = Math.round((1 - d) * rad * 1.4 + r());
      for (let y = -depth; y <= 0; y++) this.set(cx + x, cy + y, cz + z, y === 0 ? 'grass' : y > -2 ? 'dirt' : 'stone');
      if (x === 0 && z === 0) top = cy + 1;
    }
    if (rad >= 3.5) this.buildTree(cx, top, cz, r);
  }

  buildMeshes() {
    if (this.meshes) for (const m of Object.values(this.meshes)) { this.world.remove(m); m.dispose(); }
    for (const l of this.lanterns) this.scene.remove(l);
    this.meshes = {};
    this.keysByType = {};
    this.indexOf = new Map();

    const byType = {};
    for (const [k, t] of this.blocks) (byType[t] ||= []).push(k);

    const m4 = new THREE.Matrix4();
    for (const type of Object.keys(BLOCKS)) {
      const keys = byType[type] || [];
      const mesh = new THREE.InstancedMesh(this.geometry, this.materials[type], keys.length + EXTRA_CAPACITY);
      mesh.count = keys.length;
      mesh.castShadow = type !== 'water';
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.userData.type = type;
      if (type === 'water') mesh.renderOrder = 2;
      keys.forEach((k, i) => {
        const [x, y, z] = k.split(',').map(Number);
        mesh.setMatrixAt(i, m4.makeTranslation(x, y, z));
        this.indexOf.set(k, i);
      });
      this.keysByType[type] = keys;
      this.meshes[type] = mesh;
      this.world.add(mesh);
    }

    this.lanterns = this.lanternSpots.map(([x, y, z]) => {
      const l = new THREE.PointLight(0xffc46b, 0, 14, 1.6);
      l.position.set(x, y, z);
      this.world.add(l);
      return l;
    });
    this.applyNight();
  }

  removeBlock(k) {
    const type = this.blocks.get(k);
    const mesh = this.meshes[type], keys = this.keysByType[type];
    const i = this.indexOf.get(k), last = keys.length - 1;
    if (i !== last) {
      const m4 = new THREE.Matrix4();
      mesh.getMatrixAt(last, m4);
      mesh.setMatrixAt(i, m4);
      keys[i] = keys[last];
      this.indexOf.set(keys[i], i);
    }
    keys.pop();
    mesh.count = keys.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.boundingSphere = null;
    this.indexOf.delete(k);
    this.blocks.delete(k);
    return type;
  }

  addBlock(x, y, z, type) {
    const k = key(x, y, z);
    const mesh = this.meshes[type], keys = this.keysByType[type];
    if (this.blocks.has(k) || keys.length >= mesh.instanceMatrix.count) return false;
    mesh.setMatrixAt(keys.length, new THREE.Matrix4().makeTranslation(x, y, z));
    this.indexOf.set(k, keys.length);
    keys.push(k);
    mesh.count = keys.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.boundingSphere = null;
    this.blocks.set(k, type);
    return true;
  }

  // --- interaction ---------------------------------------------------------
  bindInput() {
    let down = null;
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY, button: e.button }));
    c.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return (down = null);
      const hit = this.pick(e);
      if (hit) (down.button === 2 || e.shiftKey ? this.place(hit) : this.break(hit));
      down = null;
    });
    c.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const hit = this.pick(e);
      this.highlight.visible = !!hit;
      if (hit) this.highlight.position.copy(hit.pos);
      c.style.cursor = hit ? 'crosshair' : 'grab';
    });
    c.addEventListener('pointerleave', () => (this.highlight.visible = false));
  }

  pick(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targets = Object.values(this.meshes).filter((m) => m.userData.type !== 'water' && m.count > 0);
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    if (!hit) return null;
    const k = this.keysByType[hit.object.userData.type][hit.instanceId];
    const [x, y, z] = k.split(',').map(Number);
    return { key: k, pos: new THREE.Vector3(x, y, z), normal: hit.face.normal.clone().round() };
  }

  break(hit) {
    const type = this.removeBlock(hit.key);
    this.highlight.visible = false;
    const colors = sampleColors(BLOCKS[type].side, 8);
    let n = 0;
    for (const p of this.debris) {
      if (p.userData.life > 0) continue;
      p.visible = true;
      p.material.color.setHex(colors[n % colors.length]);
      p.position.copy(hit.pos).add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.7));
      p.userData.vel.set((Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4);
      p.userData.life = 0.8 + Math.random() * 0.5;
      if (++n >= 14) break;
    }
    this.onEvent('break', { type });
  }

  place(hit) {
    const p = hit.pos.clone().add(hit.normal);
    if (this.addBlock(p.x, p.y, p.z, this.selected)) this.onEvent('place', { type: this.selected });
  }

  select(type) {
    this.selected = type;
  }

  regenerate() {
    this.generate(Math.floor(Math.random() * 1e6));
    this.onEvent('regenerate', { seed: this.seed });
  }

  setNight(on) {
    this.nightTarget = on ? 1 : 0;
  }

  applyNight() {
    const t = this.night;
    const lerp = (a, b) => a + (b - a) * t;
    this.skyUniforms.top.value.copy(SKY.day.top).lerp(SKY.night.top, t);
    this.skyUniforms.bottom.value.copy(SKY.day.bottom).lerp(SKY.night.bottom, t);
    this.scene.fog.color.copy(this.skyUniforms.bottom.value);
    this.hemi.intensity = lerp(SKY.day.hemi, SKY.night.hemi);
    this.hemi.color.setHex(0xdff1ff).lerp(new THREE.Color(0x6677cc), t);
    this.sunLight.intensity = lerp(SKY.day.sun, SKY.night.sun);
    this.sunLight.color.setHex(0xfff1d6).lerp(new THREE.Color(0x8fa8ff), t);
    this.stars.material.opacity = lerp(SKY.day.stars, SKY.night.stars);
    for (const m of this.glowMaterials) m.emissiveIntensity = lerp(SKY.day.glow, SKY.night.glow);
    for (const l of this.lanterns) l.intensity = lerp(0, 30);
    this.cloudMat.color.setHex(0xffffff).lerp(new THREE.Color(0x5a6390), t);
    this.cloudMat.emissiveIntensity = lerp(0.25, 0.02);
    this.celestial.rotation.x = t * Math.PI;
  }

  // --- loop ----------------------------------------------------------------
  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const wide = w > 900;
    const dist = wide ? 60 : w / h < 0.8 ? 84 : 66;
    this.camera.position.setLength(dist);
    if (wide) this.camera.setViewOffset(w, h, -w * 0.22, h * 0.06, w, h);
    else this.camera.setViewOffset(w, h, 0, -h * 0.17, w, h);
    this.camera.updateProjectionMatrix();
  }

  tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (!this.running) return;
    const t = this.clock.elapsedTime;

    if (Math.abs(this.night - this.nightTarget) > 0.001) {
      this.night += Math.sign(this.nightTarget - this.night) * Math.min(dt * 0.8, Math.abs(this.nightTarget - this.night));
      this.applyNight();
    }

    if (!this.reducedMotion) this.world.position.y = Math.sin(t * 0.6) * 0.35;

    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 110) c.position.x = -110;
    }

    for (const p of this.debris) {
      const u = p.userData;
      if (u.life <= 0) continue;
      u.life -= dt;
      u.vel.y -= 14 * dt;
      p.position.addScaledVector(u.vel, dt);
      p.rotation.x += dt * 6;
      p.visible = u.life > 0;
    }

    const m4 = new THREE.Matrix4();
    this.fallDrops.forEach((d, i) => {
      d.life -= dt * 0.35;
      if (d.life <= 0) {
        d.life = 1;
        d.p.copy(this.fallSource).add(new THREE.Vector3((Math.random() - 0.5) * 0.9, 0, (Math.random() - 0.5) * 0.9));
        d.v = 0;
      }
      d.v += 9 * dt;
      d.p.y -= d.v * dt;
      const s = Math.max(d.life, 0.05);
      m4.makeScale(s, 1 + d.v * 0.08, s).setPosition(d.p);
      this.waterfall.setMatrixAt(i, m4);
    });
    this.waterfall.instanceMatrix.needsUpdate = true;

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

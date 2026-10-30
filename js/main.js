import { VoxelWorld } from './world.js';
import { tile, patternURL, blockIcon, isoCube, oreTile, BLOCKS } from './textures.js';

// ---------------------------------------------------------------------------
// Content — edit these to make the page yours.
// ---------------------------------------------------------------------------
const ROLES = ['full-stack developer', 'graphics tinkerer', 'open-source maintainer', 'builder of tiny worlds'];

const SKILLS = {
  Languages: [
    { name: 'TypeScript', n: 60, years: 7, colors: ['#3178c6', '#9cc8ff', '#1d4f8f'], note: 'My daily driver. Strict mode, always.' },
    { name: 'Rust', n: 44, years: 3, colors: ['#e57339', '#ffb38a', '#9c3d12'], note: 'For the hot loops and the path tracer.' },
    { name: 'Go', n: 40, years: 4, colors: ['#00add8', '#9ff0ff', '#00708c'], note: 'Services, CLIs and job queues.' },
    { name: 'Python', n: 46, years: 6, colors: ['#ffd43b', '#4b8bbe', '#306998'], note: 'Scripts, data wrangling, a little ML.' },
    { name: 'SQL', n: 50, years: 8, colors: ['#e8e8e8', '#9aa8b8', '#5c6b7c'], note: 'Window functions are my love language.' },
  ],
  Frontend: [
    { name: 'React', n: 58, years: 7, colors: ['#61dafb', '#c6f4ff', '#2a8fb0'], note: 'Hooks, suspense, server components.' },
    { name: 'Three.js / WebGL', n: 46, years: 4, colors: ['#ffffff', '#b48cff', '#5a3fb8'], note: 'Like the island up top.' },
    { name: 'CSS', n: 55, years: 8, colors: ['#ff6bcb', '#ffc2ea', '#a3267a'], note: 'Grid, container queries, pixel-art borders.' },
    { name: 'Svelte', n: 30, years: 2, colors: ['#ff3e00', '#ff9d7a', '#a32800'], note: 'For small, fast side projects.' },
    { name: 'Accessibility', n: 42, years: 5, colors: ['#3ddc84', '#a5ffcb', '#1f9e5a'], note: 'Keyboard first. Screen readers tested.' },
  ],
  Backend: [
    { name: 'Node.js', n: 56, years: 7, colors: ['#5fa04e', '#b7e3a6', '#2f6a22'], note: 'APIs, websockets, edge functions.' },
    { name: 'PostgreSQL', n: 48, years: 6, colors: ['#336791', '#9cc0e0', '#1b3e5c'], note: 'The database I trust the most.' },
    { name: 'Redis', n: 36, years: 5, colors: ['#dc382d', '#ff9a90', '#8c1a13'], note: 'Caches, rate limits, pub/sub.' },
    { name: 'GraphQL', n: 38, years: 4, colors: ['#e535ab', '#ffa6e0', '#8f1667'], note: 'Federated schemas in production.' },
    { name: 'CRDTs', n: 34, years: 2, colors: ['#f5c542', '#fff09a', '#c9951e'], note: 'Realtime collab without the conflicts.' },
  ],
  Tools: [
    { name: 'Git', n: 62, years: 8, colors: ['#f05033', '#ffa08c', '#a1260f'], note: 'Rebase enjoyer.' },
    { name: 'Docker', n: 44, years: 6, colors: ['#2496ed', '#a5d6ff', '#0f5c9c'], note: 'Reproducible everything.' },
    { name: 'Kubernetes', n: 28, years: 3, colors: ['#326ce5', '#a8c1ff', '#173c8f'], note: 'Enough to be dangerous.' },
    { name: 'Linux', n: 52, years: 9, colors: ['#ffcc33', '#2b2b2b', '#ffffff'], note: 'Home since high school.' },
    { name: 'AWS', n: 38, years: 5, colors: ['#ff9900', '#ffd08a', '#232f3e'], note: 'Lambda, S3, the usual suspects.' },
  ],
};

const BUILDS = [
  { title: 'Chunkstream', kind: 'Realtime · Open source', block: 'diamond', color: '#5ee6e0', stars: '2.4k',
    desc: 'A collaborative whiteboard that syncs over CRDTs and WebRTC. Works offline, merges cleanly, scales to hundreds of cursors.',
    tags: ['TypeScript', 'WebRTC', 'Yjs', 'Canvas'] },
  { title: 'Lumen', kind: 'Graphics · Side project', block: 'gold', color: '#f5c542', stars: '860',
    desc: 'A tiny progressive path tracer written in Rust and WGSL. Runs in the browser through WebGPU at interactive frame rates.',
    tags: ['Rust', 'WebGPU', 'WGSL'] },
  { title: 'Hopper', kind: 'Infrastructure · Library', block: 'redstone', color: '#ff6b5e', stars: '1.1k',
    desc: 'A durable job queue on top of Postgres with retries, priorities and exactly-once handlers. No extra infra required.',
    tags: ['Go', 'PostgreSQL', 'SKIP LOCKED'] },
  { title: 'Pixelkit', kind: 'Design system', block: 'emerald', color: '#3ddc84', stars: '540',
    desc: 'Accessible, themeable React components with a retro pixel aesthetic. Fully keyboard navigable, zero runtime CSS.',
    tags: ['React', 'CSS', 'a11y', 'Storybook'] },
  { title: 'Basecamp CLI', kind: 'Developer tooling', block: 'log', color: '#c79a5b', stars: '310',
    desc: 'One command to bootstrap a dev machine: dotfiles, toolchains and secrets, declared in a single readable config file.',
    tags: ['Go', 'Shell', 'Nix'] },
  { title: 'Nowcast', kind: 'ML · Experiment', block: 'amethyst', color: '#b48cff', stars: '190',
    desc: 'Short-range rain prediction from radar frames, tiny enough to run on a Raspberry Pi on my balcony.',
    tags: ['Python', 'PyTorch', 'ONNX'] },
];

const JOURNEY = [
  { when: '2024 — now', title: 'Senior Software Engineer', where: 'Northwind Labs', loot: '+ realtime sync engine',
    desc: 'Leading the collaboration platform: presence, conflict-free editing and the infra underneath it.' },
  { when: '2021 — 2024', title: 'Software Engineer', where: 'Cobalt Systems', loot: '+ cut p95 latency by 63%',
    desc: 'Built billing and data pipelines in Go and Postgres. Migrated a monolith into services without downtime.' },
  { when: '2019 — 2021', title: 'Frontend Developer', where: 'Bitforge Studio', loot: '+ 12 shipped client sites',
    desc: 'Interactive sites and WebGL experiences for agencies, museums and one very demanding bakery.' },
  { when: '2015 — 2019', title: 'B.Sc. Computer Science', where: 'University of Lisbon', loot: '+ first voxel engine',
    desc: 'Graphics, compilers and distributed systems. Wrote a voxel renderer for my thesis and never stopped.' },
];

// ---------------------------------------------------------------------------
// Textures → CSS
// ---------------------------------------------------------------------------
const root = document.documentElement.style;
const url = (u) => `url(${u})`;
const textures = {
  grassTop: tile('grassTop').toDataURL(),
  stone: tile('stone').toDataURL(),
  plank: tile('plank').toDataURL(),
  lava: patternURL('lava', { n: 4 }),
  goldBlock: tile('goldBlock').toDataURL(),
  ladder: tile('ladder').toDataURL(),
  dirt: patternURL('dirt'),
  stoneLayer: patternURL('stone', { mix: [['gold', 0.012], ['redstone', 0.012]] }),
  oreLayer: patternURL('stone', { mix: [['diamond', 0.03], ['emerald', 0.03], ['gold', 0.04], ['redstone', 0.04]], seed: 3 }),
  deepLayer: patternURL('deep', { mix: [['amethyst', 0.06]] }),
  bedrock: patternURL('bedrock'),
};
for (const [k, v] of Object.entries(textures)) root.setProperty(`--tex-${k}`, url(v));
root.setProperty('--icon-grass', url(blockIcon('grass').toDataURL()));
root.setProperty('--icon-heart', url(tile('heart').toDataURL()));

const iconCache = new Map();
const iconURL = (type) => {
  if (!iconCache.has(type)) iconCache.set(type, blockIcon(type).toDataURL());
  return iconCache.get(type);
};

// Jagged terrain edges where one layer meets the next.
function drawEdges() {
  const tilePx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tile')) || 48;
  document.querySelectorAll('.edge').forEach((edge, ei) => {
    const cols = Math.ceil(innerWidth / tilePx) + 1;
    const c = document.createElement('canvas');
    c.width = cols * 16;
    c.height = 48;
    const ctx = c.getContext('2d');
    let h = 2;
    for (let x = 0; x < cols; x++) {
      const roll = Math.sin(x * 12.9898 + ei * 78.233) * 43758.5453 % 1;
      h = Math.max(1, Math.min(3, h + (Math.abs(roll) < 0.3 ? -1 : Math.abs(roll) > 0.7 ? 1 : 0)));
      for (let y = 0; y < h; y++) {
        const name = y === h - 1 ? edge.dataset.top : edge.dataset.fill;
        ctx.drawImage(tile(name, (x + y) % 4), x * 16, (2 - y) * 16);
      }
    }
    edge.style.backgroundImage = url(c.toDataURL());
  });
}
drawEdges();
let edgeTimer;
addEventListener('resize', () => {
  clearTimeout(edgeTimer);
  edgeTimer = setTimeout(drawEdges, 200);
});

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------
const earned = new Set();
function achieve(id, text, icon = 'grass') {
  if (earned.has(id)) return;
  earned.add(id);
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<img alt="" src="${iconURL(icon)}"><div><b>Achievement unlocked</b><span></span></div>`;
  el.querySelector('span').textContent = text;
  document.getElementById('toasts').append(el);
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove());
  }, 3600);
}

// ---------------------------------------------------------------------------
// The world
// ---------------------------------------------------------------------------
let broken = 0;
let world;
try {
  world = new VoxelWorld(document.getElementById('world'), {
    onEvent(name, data) {
      if (name === 'break') {
        broken++;
        if (broken === 1) achieve('first-break', 'Getting wood… or whatever that was', data.type);
        if (broken === 25) achieve('miner', 'Professional miner: 25 blocks', 'diamond');
        if (data.type === 'screen') achieve('screen', 'Have you tried turning it off?', 'screen');
      }
      if (name === 'place') achieve('first-place', 'Architect: placed your first block', data.type);
      if (name === 'regenerate') achieve('regen', `New world, seed ${data.seed}`, 'leaves');
    },
  });
} catch (err) {
  console.error(err);
  document.querySelector('.hero').classList.add('no-webgl');
}

const HOTBAR = ['grass', 'dirt', 'stone', 'plank', 'log', 'leaves', 'glow', 'sand'];
const hotbar = document.getElementById('hotbar');
const hotbarLabel = document.getElementById('hotbar-label');
let labelTimer;
function selectSlot(i) {
  const type = HOTBAR[i];
  world?.select(type);
  hotbar.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
  hotbarLabel.textContent = BLOCKS[type].label;
  clearTimeout(labelTimer);
  labelTimer = setTimeout(() => (hotbarLabel.textContent = ''), 1400);
}
HOTBAR.forEach((type, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.title = `${BLOCKS[type].label} (${i + 1})`;
  b.innerHTML = `<span>${i + 1}</span><img alt="${BLOCKS[type].label}" src="${iconURL(type)}">`;
  b.addEventListener('click', () => selectSlot(i));
  hotbar.append(b);
});
selectSlot(0);
hotbarLabel.textContent = '';

const nightBtn = document.getElementById('night-toggle');
function toggleNight() {
  const on = nightBtn.getAttribute('aria-pressed') !== 'true';
  nightBtn.setAttribute('aria-pressed', String(on));
  world?.setNight(on);
  if (on) achieve('night', 'Night owl: the lanterns are on', 'glow');
}
nightBtn.addEventListener('click', toggleNight);
document.getElementById('regen').addEventListener('click', () => world?.regenerate());

addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const n = Number(e.key);
  if (n >= 1 && n <= HOTBAR.length) selectSlot(n - 1);
  else if (e.key === 'n' || e.key === 'N') toggleNight();
  else if (e.key === 'r' || e.key === 'R') world?.regenerate();
});

// Loader
const tips = ['Placing trees…', 'Carving ore veins…', 'Hanging lanterns…', 'Booting monitors…'];
let tipI = 0;
const tipTimer = setInterval(() => (document.getElementById('loader-tip').textContent = tips[++tipI % tips.length]), 280);
setTimeout(() => {
  clearInterval(tipTimer);
  document.getElementById('loader').classList.add('done');
}, 1150);

// Typed subtitle
const typed = document.getElementById('typed');
(async function typeLoop() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; ; i = (i + 1) % ROLES.length) {
    const word = ROLES[i];
    for (let j = 0; j <= word.length; j++) { typed.textContent = word.slice(0, j); await wait(55); }
    await wait(2200);
    for (let j = word.length; j >= 0; j--) { typed.textContent = word.slice(0, j); await wait(28); }
    await wait(300);
  }
})();

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------
const FACE = [
  '..hhhhhhhh..',
  '.hhhhhhhhhh.',
  'phhhhhhhhhhp',
  'phsssssssshp',
  'pssssssssssp',
  'pswesssswesp',
  'pssssnnssssp',
  '.ssssssssss.',
  '.sssmmmmsss.',
  '..ssssssss..',
  '.tttttttttt.',
  'ttttcttctttt',
];
const FACE_COLORS = { h: '#3b2416', p: '#2b2b33', s: '#e0a77a', w: '#ffffff', e: '#2d4a8a', n: '#c98d62', m: '#8a3e2e', t: '#2f7d32', c: '#f5c542' };
{
  const ctx = document.getElementById('avatar').getContext('2d');
  FACE.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!FACE_COLORS[ch]) return;
    ctx.fillStyle = FACE_COLORS[ch];
    ctx.fillRect(x, y, 1, 1);
  }));
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------
const tabs = document.getElementById('skill-tabs');
const slots = document.getElementById('slots');
const inspect = document.getElementById('inspect');
const skillIcons = new Map();
const inspected = new Set();

function skillIcon(s) {
  if (!skillIcons.has(s.name)) {
    const a = oreTile(s.colors, 1), b = oreTile(s.colors, 2);
    skillIcons.set(s.name, isoCube(oreTile(s.colors, 3, 'stone'), a, b, 64).toDataURL());
  }
  return skillIcons.get(s.name);
}

function rarity(n) {
  if (n >= 56) return ['Legendary', '#f5c542'];
  if (n >= 44) return ['Epic', '#b48cff'];
  if (n >= 34) return ['Rare', '#5ee6e0'];
  return ['Common', '#c9c3dc'];
}

function showSkill(s, btn) {
  slots.querySelectorAll('.slot').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  const [label, color] = rarity(s.n);
  inspect.innerHTML = `
    <img alt="" src="${skillIcon(s)}">
    <h3></h3>
    <p class="rarity" style="color:${color}">${label}</p>
    <div class="meta">Stack ${s.n} / 64 · ${s.years} yrs</div>
    <div class="bar" style="--v:${s.n / 64};--c:${s.colors[0]}"><i></i></div>
    <p class="note"></p>`;
  inspect.querySelector('h3').textContent = s.name;
  inspect.querySelector('.note').textContent = s.note;
  inspected.add(s.name);
  if (inspected.size === 8) achieve('inspector', 'Item inspector: checked 8 skills', 'emerald');
}

function showTab(name) {
  tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  slots.innerHTML = '';
  SKILLS[name].forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot';
    b.style.setProperty('--i', i);
    b.title = s.name;
    b.innerHTML = `<img alt="${s.name}" src="${skillIcon(s)}"><span class="count">${s.n}</span>`;
    b.addEventListener('click', () => showSkill(s, b));
    b.addEventListener('mouseenter', () => matchMedia('(hover: hover)').matches && showSkill(s, b));
    b.addEventListener('focus', () => showSkill(s, b));
    slots.append(b);
  });
  // Fill the rest of the grid with empty slots so it reads as an inventory.
  for (let i = SKILLS[name].length; i < 16; i++) {
    const e = document.createElement('span');
    e.className = 'slot';
    e.style.setProperty('--i', i);
    e.style.cursor = 'default';
    slots.append(e);
  }
  showSkill(SKILLS[name][0], slots.firstElementChild);
}

for (const name of Object.keys(SKILLS)) {
  const b = document.createElement('button');
  b.type = 'button';
  b.role = 'tab';
  b.dataset.tab = name;
  b.textContent = name;
  b.addEventListener('click', () => showTab(name));
  tabs.append(b);
}
showTab('Languages');

// ---------------------------------------------------------------------------
// Builds
// ---------------------------------------------------------------------------
const grid = document.getElementById('builds-grid');
for (const p of BUILDS) {
  const def = BLOCKS[p.block];
  const side = tile(def.side).toDataURL(), top = tile(def.top).toDataURL();
  const card = document.createElement('article');
  card.className = 'panel build reveal';
  card.style.setProperty('--c', p.color);
  card.innerHTML = `
    <div class="build-stage">
      <div class="build-shadow"></div>
      <div class="cube" style="--face:${url(side)};--top:${url(top)}">${'<i></i>'.repeat(6)}</div>
    </div>
    <div class="build-body">
      <h3></h3>
      <p class="kind"></p>
      <p class="desc"></p>
      <ul class="chips">${p.tags.map((t) => `<li>${t}</li>`).join('')}</ul>
      <div class="build-links">
        <a href="#" aria-label="Source code">Source</a>
        <a href="#" aria-label="Live demo">Live</a>
        <span class="stars">★ ${p.stars}</span>
      </div>
    </div>`;
  card.querySelector('h3').textContent = p.title;
  card.querySelector('.kind').textContent = p.kind;
  card.querySelector('.desc').textContent = p.desc;
  grid.append(card);
}

// ---------------------------------------------------------------------------
// Journey
// ---------------------------------------------------------------------------
const shaft = document.getElementById('shaft');
for (const j of JOURNEY) {
  const li = document.createElement('li');
  li.className = 'step reveal';
  li.innerHTML = `<span class="torch" aria-hidden="true"></span>
    <div class="sign"><p class="when"></p><h3></h3><p class="where"></p><p class="desc"></p><p class="loot"></p></div>`;
  li.querySelector('.when').textContent = j.when;
  li.querySelector('h3').textContent = j.title;
  li.querySelector('.where').textContent = `@ ${j.where}`;
  li.querySelector('.desc').textContent = j.desc;
  li.querySelector('.loot').textContent = j.loot;
  shaft.append(li);
}

// ---------------------------------------------------------------------------
// Scroll: reveals, depth meter, bedrock achievement
// ---------------------------------------------------------------------------
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) {
    e.target.classList.add('in');
    io.unobserve(e.target);
  }
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

const depth = document.getElementById('depth');
const depthY = document.getElementById('depth-y');
const depthName = document.getElementById('depth-name');
const marker = document.getElementById('depth-marker');
const layers = [...document.querySelectorAll('.layer')];
function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  const p = Math.min(1, Math.max(0, scrollY / max));
  const y = Math.round(80 - p * 144);
  depth.classList.toggle('show', scrollY > innerHeight * 0.6);
  depthY.textContent = `Y ${y}`;
  marker.style.setProperty('--p', `${p * 100}%`);
  const mid = scrollY + innerHeight / 2;
  const current = layers.filter((l) => l.offsetTop <= mid).pop();
  depthName.textContent = current ? current.dataset.layer : 'Sky';
  if (p > 0.97) achieve('bedrock', 'Reached bedrock. Say hi!', 'deep');
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Copy email
const copyBtn = document.getElementById('copy-email');
copyBtn.addEventListener('click', async () => {
  const email = copyBtn.dataset.email;
  try {
    await navigator.clipboard.writeText(email);
    copyBtn.textContent = 'Copied!';
    achieve('email', 'Copied the email. Talk soon!', 'gold');
  } catch {
    location.href = `mailto:${email}`;
  }
  setTimeout(() => (copyBtn.textContent = email), 1600);
});

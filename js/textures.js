// Procedural 16×16 pixel textures, shared by the 3D world and the page backgrounds.
export const TILE = 16;

export function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

const P = {
  grass: ['#5fa83a', '#6dbb43', '#4e9230', '#78c24b', '#58a035'],
  dirt: ['#8a5a36', '#7a4e2e', '#94633d', '#6f4729'],
  stone: ['#8b8d90', '#7f8185', '#96989b', '#74767a'],
  deep: ['#40424e', '#383a45', '#4a4d5a', '#30323b'],
  sand: ['#e3d39a', '#d8c688', '#ecdca8', '#cfbd7c'],
  bark: ['#6b4a2b', '#5c3f24', '#77532f'],
  leaves: ['#2f7d32', '#3a8c3c', '#287030', '#45a045'],
  plank: ['#b5844f', '#a97b48', '#be8d57'],
  water: ['#3b82c4', '#3678ba', '#4189cc'],
  bedrock: ['#2b2b2e', '#3c3c40', '#1c1c1e', '#55555a'],
  lava: ['#ff6a00', '#ff8c1a', '#e65100', '#ffb347'],
  glow: ['#ffd36b', '#ffc23d', '#ffe59a'],
};

export const ORES = {
  diamond: ['#5ee6e0', '#b5fff9', '#2aa9a4'],
  gold: ['#f5c542', '#fff09a', '#c9951e'],
  emerald: ['#3ddc84', '#a5ffcb', '#1f9e5a'],
  redstone: ['#e8433a', '#ff8f80', '#a81e17'],
  amethyst: ['#a874ff', '#dcc2ff', '#6f3fd1'],
};

const pick = (r, a) => a[Math.floor(r() * a.length)];

function px(ctx, x, y, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, 1, 1);
}

function speckle(ctx, r, pal, x0 = 0, y0 = 0, w = TILE, h = TILE) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) px(ctx, x, y, pick(r, pal));
}

function sprinkle(ctx, r, color, n, w = 1, h = 1) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) ctx.fillRect(Math.floor(r() * TILE), Math.floor(r() * TILE), w, h);
}

function ore(ctx, r, colors, clusters = 4) {
  const shape = [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [2, 1], [1, 2]];
  for (let i = 0; i < clusters; i++) {
    const cx = 2 + Math.floor(r() * 12), cy = 2 + Math.floor(r() * 12);
    for (const [dx, dy] of shape) if (r() < 0.75) px(ctx, cx + dx, cy + dy, pick(r, colors));
  }
}

const MAKERS = {
  grassTop(ctx, r) {
    speckle(ctx, r, P.grass);
    sprinkle(ctx, r, '#8fd65e', 10);
    sprinkle(ctx, r, '#3f7f27', 8);
  },
  grassSide(ctx, r) {
    MAKERS.dirt(ctx, r);
    speckle(ctx, r, P.grass, 0, 0, TILE, 3);
    for (let x = 0; x < TILE; x++) {
      const drip = r() < 0.45 ? 1 + Math.floor(r() * 2) : 0;
      for (let y = 3; y < 3 + drip; y++) px(ctx, x, y, pick(r, P.grass));
    }
  },
  dirt(ctx, r) {
    speckle(ctx, r, P.dirt);
    sprinkle(ctx, r, '#5a3820', 9);
    sprinkle(ctx, r, '#a87248', 6);
  },
  stone(ctx, r) {
    speckle(ctx, r, P.stone);
    ctx.fillStyle = '#66686c';
    for (let i = 0; i < 5; i++) ctx.fillRect(Math.floor(r() * 13), Math.floor(r() * 16), 2 + Math.floor(r() * 3), 1);
  },
  deep(ctx, r) {
    speckle(ctx, r, P.deep);
    ctx.fillStyle = '#555866';
    for (let i = 0; i < 6; i++) ctx.fillRect(Math.floor(r() * 12), Math.floor(r() * 16), 3 + Math.floor(r() * 4), 1);
  },
  sand(ctx, r) {
    speckle(ctx, r, P.sand);
    sprinkle(ctx, r, '#bfa96a', 6);
  },
  bedrock(ctx, r) {
    speckle(ctx, r, P.bedrock);
    sprinkle(ctx, r, '#6a6a70', 6, 2, 2);
    sprinkle(ctx, r, '#141416', 6, 2, 1);
  },
  log(ctx, r) {
    for (let x = 0; x < TILE; x++) {
      const base = x % 5 === 0 ? '#4a321c' : pick(r, P.bark);
      for (let y = 0; y < TILE; y++) px(ctx, x, y, r() < 0.15 ? pick(r, P.bark) : base);
    }
  },
  logTop(ctx, r) {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      const c = d > 6.5 ? pick(r, P.bark) : Math.floor(d) % 2 ? '#c79a5b' : '#a8783f';
      px(ctx, x, y, c);
    }
  },
  leaves(ctx, r) {
    speckle(ctx, r, P.leaves);
    sprinkle(ctx, r, '#1b4d1f', 22);
    sprinkle(ctx, r, '#5cb85c', 6);
  },
  plank(ctx, r) {
    speckle(ctx, r, P.plank);
    ctx.fillStyle = '#7a5230';
    for (let row = 0; row < 4; row++) {
      ctx.fillRect(0, row * 4 + 3, TILE, 1);
      ctx.fillRect(((row * 7) % 12) + 2, row * 4, 1, 3);
    }
    sprinkle(ctx, r, '#9c6d3d', 8, 2, 1);
  },
  water(ctx, r) {
    speckle(ctx, r, P.water);
    sprinkle(ctx, r, '#7cbcf0', 8, 3, 1);
  },
  lava(ctx, r) {
    speckle(ctx, r, P.lava);
    sprinkle(ctx, r, '#fff176', 8, 2, 1);
    sprinkle(ctx, r, '#b33c00', 6, 2, 2);
  },
  glow(ctx, r) {
    ctx.fillStyle = '#3a2a14';
    ctx.fillRect(0, 0, TILE, TILE);
    speckle(ctx, r, P.glow, 2, 2, 12, 12);
    ctx.fillStyle = '#fff6d0';
    ctx.fillRect(6, 5, 4, 6);
    ctx.fillStyle = '#3a2a14';
    ctx.fillRect(7, 0, 2, 2);
    ctx.fillRect(7, 14, 2, 2);
  },
  screen(ctx, r) {
    ctx.fillStyle = '#1d1f24';
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#0b1512';
    ctx.fillRect(1, 1, 14, 12);
    const syn = ['#7ee787', '#79c0ff', '#ff7b72', '#d2a8ff', '#ffa657'];
    for (let y = 2; y < 12; y += 2) {
      let x = 2 + Math.floor(r() * 3);
      while (x < 14) {
        const len = 1 + Math.floor(r() * 4);
        ctx.fillStyle = pick(r, syn);
        ctx.fillRect(x, y, Math.min(len, 14 - x), 1);
        x += len + 1;
        if (r() < 0.3) break;
      }
    }
    ctx.fillStyle = '#3a3d45';
    ctx.fillRect(6, 13, 4, 3);
  },
  goldBlock(ctx, r) {
    speckle(ctx, r, ['#f5c542', '#eab935', '#ffd75e']);
    ctx.fillStyle = '#fff3a8';
    ctx.fillRect(0, 0, TILE, 1);
    ctx.fillRect(0, 0, 1, TILE);
    ctx.fillStyle = '#b88a1c';
    ctx.fillRect(0, 15, TILE, 1);
    ctx.fillRect(15, 0, 1, TILE);
  },
  ladder(ctx, r) {
    MAKERS.deep(ctx, r);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, TILE, TILE);
    for (const x of [2, 12]) {
      ctx.fillStyle = '#8a6138';
      ctx.fillRect(x, 0, 2, TILE);
      ctx.fillStyle = '#5c3f24';
      ctx.fillRect(x + 1, 0, 1, TILE);
    }
    for (const y of [2, 7, 12]) {
      ctx.fillStyle = '#a7774a';
      ctx.fillRect(2, y, 12, 2);
      ctx.fillStyle = '#5c3f24';
      ctx.fillRect(2, y + 1, 12, 1);
    }
  },
  heart(ctx) {
    const rows = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
    rows.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && px(ctx, x + 4, y + 5, y < 2 && x > 0 && x < 3 ? '#ff9a9a' : '#e23a3a')));
    ctx.fillStyle = '#7a0d0d';
    ctx.fillRect(7, 10, 1, 1);
  },
  cloud(ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, TILE, TILE);
  },
  sun(ctx) {
    ctx.fillStyle = '#ffe680';
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#fff8c4';
    ctx.fillRect(3, 3, 10, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(5, 5, 6, 6);
  },
  moon(ctx, r) {
    speckle(ctx, r, ['#dfe6f2', '#cfd8e8', '#e9eef7']);
    ctx.fillStyle = '#aeb8cc';
    ctx.fillRect(3, 4, 3, 3);
    ctx.fillRect(10, 9, 2, 2);
    ctx.fillRect(8, 3, 2, 1);
  },
};

for (const [name, colors] of Object.entries(ORES)) {
  MAKERS[name] = (ctx, r) => {
    (name === 'amethyst' ? MAKERS.deep : MAKERS.stone)(ctx, r);
    ore(ctx, r, colors);
  };
}

function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

const cache = new Map();

/** A 16×16 canvas for a named texture. Different seeds give variations. */
export function tile(name, seed = 0) {
  const key = `${name}:${seed}`;
  if (!cache.has(key)) {
    const [c, ctx] = makeCanvas(TILE);
    MAKERS[name](ctx, rng(hash(name) + seed * 7919));
    cache.set(key, c);
  }
  return cache.get(key);
}

/** A custom ore tile in arbitrary colors (used for skill "ores"). */
export function oreTile(colors, seed, base = 'deep') {
  const [c, ctx] = makeCanvas(TILE);
  const r = rng(hash(colors.join()) + seed);
  MAKERS[base](ctx, r);
  ore(ctx, r, colors, 5);
  return c;
}

/**
 * An n×n tile pattern with seed variation and optional sprinkled-in tiles,
 * so page backgrounds don't look obviously repeated.
 */
export function patternURL(name, { n = 8, mix = [], seed = 1 } = {}) {
  const [c, ctx] = makeCanvas(TILE * n);
  const r = rng(hash(name) + seed);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let t = name;
    for (const [other, p] of mix) if (r() < p) { t = other; break; }
    ctx.drawImage(tile(t, Math.floor(r() * 6)), x * TILE, y * TILE);
  }
  return c.toDataURL();
}

export const BLOCKS = {
  grass: { top: 'grassTop', side: 'grassSide', bottom: 'dirt', label: 'Grass' },
  dirt: { top: 'dirt', side: 'dirt', bottom: 'dirt', label: 'Dirt' },
  stone: { top: 'stone', side: 'stone', bottom: 'stone', label: 'Stone' },
  deep: { top: 'deep', side: 'deep', bottom: 'deep', label: 'Deepstone' },
  sand: { top: 'sand', side: 'sand', bottom: 'sand', label: 'Sand' },
  log: { top: 'logTop', side: 'log', bottom: 'logTop', label: 'Log' },
  leaves: { top: 'leaves', side: 'leaves', bottom: 'leaves', label: 'Leaves' },
  plank: { top: 'plank', side: 'plank', bottom: 'plank', label: 'Planks' },
  glow: { top: 'glow', side: 'glow', bottom: 'glow', label: 'Lantern', glow: true },
  screen: { top: 'plank', side: 'screen', bottom: 'plank', label: 'Monitor', glow: true },
  water: { top: 'water', side: 'water', bottom: 'water', label: 'Water', transparent: true },
  diamond: { top: 'diamond', side: 'diamond', bottom: 'diamond', label: 'Diamond Ore' },
  gold: { top: 'gold', side: 'gold', bottom: 'gold', label: 'Gold Ore' },
  emerald: { top: 'emerald', side: 'emerald', bottom: 'emerald', label: 'Emerald Ore' },
  redstone: { top: 'redstone', side: 'redstone', bottom: 'redstone', label: 'Ruby Ore' },
  amethyst: { top: 'amethyst', side: 'amethyst', bottom: 'amethyst', label: 'Amethyst' },
};

/** Draw an isometric cube from three face canvases. */
export function isoCube(top, left, right = left, size = 64) {
  const [c, ctx] = makeCanvas(size);
  ctx.imageSmoothingEnabled = false;
  const u = size / 32, v = size / 64;
  const faces = [
    [top, [u, v, -u, v, size / 2, 0], 0],
    [left, [u, v, 0, u * 1, 0, size / 4], 0.22],
    [right, [u, -v, 0, u * 1, size / 2, size / 2], 0.42],
  ];
  for (const [img, m, shade] of faces) {
    ctx.setTransform(...m);
    ctx.drawImage(img, 0, 0);
    if (shade) {
      ctx.fillStyle = `rgba(10,8,20,${shade})`;
      ctx.fillRect(0, 0, TILE, TILE);
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}

export function blockIcon(type, size = 64) {
  const b = BLOCKS[type];
  return isoCube(tile(b.top), tile(b.side), tile(b.side, 1), size);
}

/** A few representative colors sampled from a texture (for break particles). */
export function sampleColors(name, n = 6) {
  const data = tile(name).getContext('2d').getImageData(0, 0, TILE, TILE).data;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = Math.floor(((i + 0.5) / n) * TILE * TILE) * 4;
    out.push((data[p] << 16) | (data[p + 1] << 8) | data[p + 2]);
  }
  return out;
}

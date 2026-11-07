import * as THREE from '../vendor/three.module.js';

/* Pixel-art texture atlas, painted procedurally at boot. */

const ART = 16;
const PAD = 8;
const CELL = ART + PAD * 2;
const COLS = 8;
const ROWS = 8;
export const ATLAS_SIZE = COLS * CELL;
const SIZE = ATLAS_SIZE;

export const TILE_NAMES = [
  'grass_top', 'grass_side', 'dirt', 'stone', 'cobble', 'sand',
  'sandstone_top', 'sandstone_side', 'log_side', 'log_top', 'leaves',
  'planks', 'glass', 'brick', 'water', 'snow', 'snow_side', 'gravel',
  'coal_ore', 'iron_ore', 'bedrock', 'cactus_side', 'cactus_top',
  'poppy', 'dandelion', 'tallgrass', 'ice',
];

export const TILES = {};
TILE_NAMES.forEach((n, i) => { TILES[n] = i; });

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Tex {
  constructor() { this.d = new Uint8ClampedArray(ART * ART * 4); }
  set(x, y, c) {
    if (x < 0 || y < 0 || x >= ART || y >= ART) return;
    const i = (y * ART + x) * 4;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2];
    this.d[i + 3] = c.length > 3 ? c[3] : 255;
  }
  get(x, y) {
    const i = (y * ART + x) * 4;
    return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]];
  }
  fill(c) { for (let y = 0; y < ART; y++) for (let x = 0; x < ART; x++) this.set(x, y, c); }
  noise(rnd, c, amt = 10, alpha = 255) {
    for (let y = 0; y < ART; y++) for (let x = 0; x < ART; x++) {
      const j = (rnd() * 2 - 1) * amt;
      this.set(x, y, [clamp(c[0] + j, 0, 255), clamp(c[1] + j, 0, 255), clamp(c[2] + j, 0, 255), alpha]);
    }
  }
  specks(rnd, count, colors, size = 1) {
    for (let i = 0; i < count; i++) {
      const x = (rnd() * ART) | 0, y = (rnd() * ART) | 0;
      const c = colors[(rnd() * colors.length) | 0];
      for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
        if (size > 1 && dx > 0 && dy > 0 && rnd() < 0.45) continue;
        this.set(x + dx, y + dy, c);
      }
    }
  }
  rect(x, y, w, h, c) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c); }
  line(x0, y0, x1, y1, c) {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy, x = x0, y = y0;
    for (;;) {
      this.set(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = err * 2;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }
  blob(rnd, cx, cy, r, c, ragged = 0.25) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d <= r - 0.2 || (d <= r + 0.6 && rnd() > ragged)) this.set(cx + x, cy + y, c);
    }
  }
}

/* --- individual tile painters ------------------------------------------- */

const painters = {
  grass_top(r) {
    const t = new Tex();
    t.noise(r, [104, 168, 76], 11);
    t.specks(r, 46, [[72, 138, 55], [130, 190, 96], [88, 152, 64]], 1);
    t.specks(r, 8, [[64, 128, 50]], 2);
    return t;
  },
  grass_side(r) {
    const t = new Tex();
    t.noise(r, [134, 96, 64], 13);
    t.specks(r, 22, [[110, 76, 50], [152, 112, 78]], 1);
    for (let x = 0; x < ART; x++) {
      const d = 3 + ((r() * 2.4) | 0);
      for (let y = 0; y < d; y++) {
        const j = (r() * 2 - 1) * 9;
        t.set(x, y, [clamp(99 + j, 0, 255), clamp(162 + j, 0, 255), clamp(72 + j, 0, 255)]);
      }
      if (r() < 0.35) t.set(x, d, [86, 146, 62]);
    }
    return t;
  },
  dirt(r) {
    const t = new Tex();
    t.noise(r, [134, 96, 64], 14);
    t.specks(r, 26, [[105, 73, 47], [157, 116, 82], [121, 85, 56]], 1);
    t.specks(r, 4, [[92, 64, 42]], 2);
    return t;
  },
  stone(r) {
    const t = new Tex();
    t.noise(r, [132, 134, 138], 8);
    t.specks(r, 24, [[112, 114, 118], [148, 150, 154]], 1);
    t.line(3, 5, 6, 9, [107, 109, 113]);
    t.line(9, 11, 12, 14, [150, 152, 156]);
    return t;
  },
  cobble(r) {
    const t = new Tex();
    t.noise(r, [104, 106, 110], 6);
    for (let i = 0; i < 9; i++) {
      const cx = 1 + ((r() * 14) | 0), cy = 1 + ((r() * 14) | 0);
      const rad = 1 + ((r() * 2) | 0);
      t.blob(r, cx, cy, rad, [146 + ((r() * 18) | 0), 148 + ((r() * 18) | 0), 152 + ((r() * 18) | 0)]);
      if (cy - rad > 0) t.set(cx, cy - rad, [176, 178, 182]);
    }
    t.specks(r, 16, [[86, 88, 92], [170, 172, 176]], 1);
    return t;
  },
  sand(r) {
    const t = new Tex();
    t.noise(r, [224, 208, 154], 7);
    t.specks(r, 30, [[206, 188, 132], [238, 224, 176], [214, 196, 144]], 1);
    return t;
  },
  sandstone_top(r) {
    const t = new Tex();
    t.noise(r, [226, 210, 158], 5);
    t.specks(r, 18, [[212, 194, 142]], 1);
    return t;
  },
  sandstone_side(r) {
    const t = new Tex();
    t.noise(r, [222, 205, 150], 5);
    for (let x = 0; x < ART; x++) {
      t.set(x, 4, [206, 186, 130]);
      t.set(x, 5, [231, 215, 166]);
      t.set(x, 12, [204, 184, 128]);
      t.set(x, 13, [233, 218, 170]);
    }
    t.specks(r, 16, [[208, 190, 136], [238, 224, 178]], 1);
    return t;
  },
  log_side(r) {
    const t = new Tex();
    t.noise(r, [122, 88, 54], 9);
    for (let x = 0; x < ART; x++) {
      if (x % 4 === 0) for (let y = 0; y < ART; y++) t.set(x, y, [98, 68, 40]);
      if (x % 4 === 2) for (let y = 0; y < ART; y++) if (r() < 0.7) t.set(x, y, [140, 102, 62]);
    }
    t.rect(6, 6, 3, 4, [86, 58, 34]);
    t.rect(7, 7, 1, 2, [104, 72, 44]);
    t.specks(r, 10, [[86, 58, 34], [146, 108, 68]], 1);
    return t;
  },
  log_top(r) {
    const t = new Tex();
    t.noise(r, [168, 130, 82], 6);
    for (let y = 0; y < ART; y++) for (let x = 0; x < ART; x++) {
      const d = Math.sqrt((x - 7.5) ** 2 + (y - 7.5) ** 2);
      const ring = Math.floor(d * 1.55) % 2;
      if (d > 6.5) t.set(x, y, [104, 74, 44]);
      else t.set(x, y, ring ? [150, 112, 68] : [176, 138, 88]);
    }
    t.rect(7, 7, 2, 2, [126, 90, 54]);
    return t;
  },
  leaves(r) {
    const t = new Tex();
    t.noise(r, [64, 126, 50], 14);
    t.specks(r, 34, [[44, 98, 38], [92, 158, 62], [52, 112, 44]], 2);
    t.specks(r, 20, [[120, 180, 80]], 1);
    return t;
  },
  planks(r) {
    const t = new Tex();
    t.noise(r, [178, 136, 88], 8);
    for (let x = 0; x < ART; x++) {
      t.set(x, 0, [142, 104, 64]);
      t.set(x, 5, [142, 104, 64]);
      t.set(x, 10, [142, 104, 64]);
      t.set(x, 15, [142, 104, 64]);
    }
    t.line(0, 4, 15, 4, [196, 154, 104]);
    t.line(0, 9, 15, 9, [196, 154, 104]);
    for (let i = 0; i < 22; i++) {
      const x = (r() * 16) | 0, y = (r() * 16) | 0;
      if (y % 5 !== 0) t.set(x, y, [160, 120, 76]);
    }
    t.set(3, 3, [110, 80, 48]); t.set(11, 8, [110, 80, 48]); t.set(7, 13, [110, 80, 48]);
    return t;
  },
  glass(r) {
    const t = new Tex();
    t.fill([210, 240, 250, 0]);
    for (let i = 0; i < ART; i++) {
      t.set(i, 0, [220, 245, 255, 190]); t.set(i, 15, [220, 245, 255, 190]);
      t.set(0, i, [220, 245, 255, 190]); t.set(15, i, [220, 245, 255, 190]);
    }
    for (let i = 1; i < 7; i++) t.set(i + 2, 12 - i, [235, 250, 255, 90]);
    for (let i = 0; i < 5; i++) t.set(i + 9, 6 + i, [235, 250, 255, 70]);
    t.set(1, 1, [255, 255, 255, 220]); t.set(14, 1, [255, 255, 255, 220]);
    t.set(1, 14, [255, 255, 255, 220]); t.set(14, 14, [255, 255, 255, 220]);
    return t;
  },
  brick(r) {
    const t = new Tex();
    t.noise(r, [184, 176, 160], 5);
    const brick = [160, 70, 58];
    for (let row = 0; row < 4; row++) {
      const y = row * 4;
      for (let col = 0; col < 3; col++) {
        const x = (col * 6 + (row % 2 ? 3 : 0)) % 16;
        for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 5; dx++) {
          const j = (r() * 2 - 1) * 12;
          t.set((x + dx) % 16, y + dy, [clamp(brick[0] + j, 0, 255), clamp(brick[1] + j, 0, 255), clamp(brick[2] + j, 0, 255)]);
        }
        for (let dx = 0; dx < 5; dx++) t.set((x + dx) % 16, y + 2, [130, 54, 44]);
      }
    }
    t.specks(r, 12, [[196, 188, 172], [140, 60, 50]], 1);
    return t;
  },
  water(r) {
    const t = new Tex();
    t.noise(r, [48, 106, 186], 8);
    for (let row = 0; row < 4; row++) {
      const y = 1 + row * 4 + ((r() * 2) | 0);
      for (let x = 0; x < 16; x++) {
        if (r() < 0.55) t.set(x, y, [72, 136, 214]);
        if (r() < 0.18) t.set(x, y, [110, 170, 234]);
      }
    }
    return t;
  },
  snow(r) {
    const t = new Tex();
    t.noise(r, [242, 248, 253], 4);
    t.specks(r, 20, [[224, 236, 248], [255, 255, 255]], 1);
    t.specks(r, 4, [[214, 230, 245]], 2);
    return t;
  },
  snow_side(r) {
    const t = new Tex();
    t.noise(r, [134, 100, 72], 12);
    for (let x = 0; x < ART; x++) {
      const d = 5 + ((r() * 3) | 0);
      for (let y = 0; y < d; y++) {
        const j = (r() * 2 - 1) * 4;
        t.set(x, y, [242 + j, 248 + j, 253 + j]);
      }
      if (r() < 0.4) t.set(x, d, [228, 238, 248]);
    }
    t.specks(r, 12, [[108, 78, 54]], 1);
    return t;
  },
  gravel(r) {
    const t = new Tex();
    t.noise(r, [120, 116, 110], 9);
    t.specks(r, 34, [[154, 150, 144], [92, 88, 84], [134, 128, 120], [176, 172, 166]], 2);
    t.specks(r, 18, [[76, 72, 68]], 1);
    return t;
  },
  coal_ore(r) {
    const t = painters.stone(r);
    for (let i = 0; i < 5; i++) {
      const x = 2 + ((r() * 12) | 0), y = 2 + ((r() * 12) | 0);
      t.blob(r, x, y, 1 + ((r() * 2) | 0), [34, 34, 38]);
      t.set(x - 1, y - 1, [64, 64, 70]);
    }
    return t;
  },
  iron_ore(r) {
    const t = painters.stone(r);
    for (let i = 0; i < 5; i++) {
      const x = 2 + ((r() * 12) | 0), y = 2 + ((r() * 12) | 0);
      t.blob(r, x, y, 1 + ((r() * 2) | 0), [198, 152, 112]);
      t.set(x - 1, y - 1, [226, 192, 158]);
    }
    return t;
  },
  bedrock(r) {
    const t = new Tex();
    t.noise(r, [72, 72, 78], 14);
    t.specks(r, 26, [[48, 48, 54], [102, 102, 108], [60, 60, 66]], 2);
    t.specks(r, 14, [[34, 34, 40]], 3);
    return t;
  },
  cactus_side(r) {
    const t = new Tex();
    t.noise(r, [74, 138, 58], 8);
    for (let x = 0; x < ART; x++) {
      if (x % 4 === 1) for (let y = 0; y < ART; y++) if (r() < 0.8) t.set(x, y, [56, 112, 44]);
      if (x % 4 === 3) for (let y = 0; y < ART; y++) if (r() < 0.8) t.set(x, y, [92, 158, 72]);
    }
    for (let i = 0; i < 10; i++) {
      const x = (r() * 16) | 0, y = (r() * 16) | 0;
      t.set(x, y, [220, 230, 190]);
    }
    return t;
  },
  cactus_top(r) {
    const t = new Tex();
    t.noise(r, [86, 152, 66], 6);
    for (let y = 0; y < ART; y++) for (let x = 0; x < ART; x++) {
      const d = Math.sqrt((x - 7.5) ** 2 + (y - 7.5) ** 2);
      if (d > 6.5) t.set(x, y, [58, 112, 46]);
      else if (d < 3.2) t.set(x, y, [70, 132, 54]);
    }
    t.specks(r, 10, [[220, 230, 190]], 1);
    return t;
  },
  poppy(r) {
    const t = new Tex();
    t.fill([0, 0, 0, 0]);
    t.rect(7, 6, 2, 10, [58, 124, 46]);
    t.rect(5, 11, 2, 1, [70, 142, 52]);
    t.rect(9, 12, 2, 1, [70, 142, 52]);
    t.rect(6, 2, 4, 4, [196, 40, 40]);
    t.set(6, 2, [0, 0, 0, 0]); t.set(9, 2, [0, 0, 0, 0]);
    t.set(6, 5, [0, 0, 0, 0]); t.set(9, 5, [0, 0, 0, 0]);
    t.rect(7, 3, 2, 2, [54, 30, 26]);
    t.set(7, 2, [226, 76, 66]);
    return t;
  },
  dandelion(r) {
    const t = new Tex();
    t.fill([0, 0, 0, 0]);
    t.rect(7, 6, 2, 10, [58, 124, 46]);
    t.rect(5, 11, 2, 1, [70, 142, 52]);
    t.rect(9, 12, 2, 1, [70, 142, 52]);
    t.rect(6, 2, 4, 4, [236, 200, 52]);
    t.set(5, 3, [236, 200, 52]); t.set(10, 3, [236, 200, 52]);
    t.set(6, 1, [246, 226, 106]); t.set(9, 1, [246, 226, 106]);
    t.set(7, 3, [184, 140, 32]); t.set(8, 3, [184, 140, 32]);
    return t;
  },
  tallgrass(r) {
    const t = new Tex();
    t.fill([0, 0, 0, 0]);
    for (let i = 0; i < 9; i++) {
      const x = 1 + ((r() * 14) | 0);
      const h = 6 + ((r() * 9) | 0);
      const col = r() < 0.5 ? [70, 142, 52] : [92, 166, 66];
      for (let y = 15; y > 15 - h; y--) {
        if (r() < 0.85) t.set(x, y, col);
        if (r() < 0.15) t.set(x + 1, y, [58, 124, 46]);
      }
    }
    return t;
  },
  ice(r) {
    const t = new Tex();
    t.fill([176, 216, 238, 205]);
    t.noise(r, [176, 216, 238], 9, 205);
    t.line(2, 3, 8, 8, [222, 244, 255, 235]);
    t.line(8, 8, 6, 13, [222, 244, 255, 235]);
    t.line(10, 2, 13, 5, [150, 194, 222, 235]);
    t.specks(r, 10, [[206, 234, 250, 220]], 1);
    return t;
  },
};

/* --- atlas assembly ----------------------------------------------------- */

function paintTile(index) {
  const name = TILE_NAMES[index];
  const rnd = mulberry32(1000 + index * 7919);
  return painters[name](rnd).d;
}

export function buildAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(SIZE, SIZE);
  for (let i = 0; i < TILE_NAMES.length; i++) {
    const data = paintTile(i);
    const tx = i % COLS, ty = (i / COLS) | 0;
    const ox = tx * CELL, oy = ty * CELL;
    for (let py = -PAD; py < ART + PAD; py++) {
      for (let px = -PAD; px < ART + PAD; px++) {
        const sx = clamp(px, 0, ART - 1), sy = clamp(py, 0, ART - 1);
        const s = (sy * ART + sx) * 4;
        const d = ((oy + py + PAD) * SIZE + (ox + px + PAD)) * 4;
        img.data[d] = data[s]; img.data[d + 1] = data[s + 1];
        img.data[d + 2] = data[s + 2]; img.data[d + 3] = data[s + 3];
      }
    }
  }
  ctx.putImageData(img, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, texture, ctx };
}

/* UV rectangle for a tile's crisp 16px centre (v grows downward). */
export function tileRect(index) {
  const tx = index % COLS, ty = (index / COLS) | 0;
  const x = (tx * CELL + PAD) / SIZE;
  const y = (ty * CELL + PAD) / SIZE;
  return { x, y, size: ART / SIZE };
}

/* --- isometric inventory icons ----------------------------------------- */

let iconCtx = null;
let iconCanvas = null;

function drawIsoFace(ctx, tile, path, m, shade) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(path[0][0], path[0][1]);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1]);
  ctx.closePath();
  ctx.clip();
  const tx = tile % COLS, ty = (tile / COLS) | 0;
  const sx = tx * CELL + PAD, sy = ty * CELL + PAD;
  ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  ctx.drawImage(iconCanvas, sx, sy, ART, ART, 0, 0, ART, ART);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (shade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${shade})`;
    ctx.fillRect(0, 0, 64, 64);
  }
  ctx.restore();
}

export function makeIcon(blockDef, size = 48) {
  if (!iconCanvas) iconCanvas = buildAtlas().canvas;
  const s = size;
  const c = document.createElement('canvas');
  c.width = s; c.height = s;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const u = s / 48;
  ctx.save();
  ctx.scale(u, u);

  if (blockDef.plant) {
    const tile = blockDef.tiles.side;
    const tx = tile % COLS, ty = (tile / COLS) | 0;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(iconCanvas, tx * CELL + PAD, ty * CELL + PAD, ART, ART, 8, 4, 32, 32);
    ctx.restore();
    return c;
  }

  const top = blockDef.tiles.top;
  const side = blockDef.tiles.side;
  const A = [24, 4], B = [43, 13.5], C = [24, 23], D = [5, 13.5];
  const E = [5, 34.5], F = [24, 44], G = [43, 34.5];
  const mTop = [19 / 16, 9.5 / 16, -19 / 16, 9.5 / 16, 24, 4];
  drawIsoFace(ctx, top, [A, B, C, D], mTop, 0);
  const mLeft = [19 / 16, 9.5 / 16, 0, 21 / 16, 5, 13.5];
  drawIsoFace(ctx, side, [D, C, F, E], mLeft, 0.14);
  const mRight = [19 / 16, -9.5 / 16, 0, 21 / 16, 43, 13.5];
  drawIsoFace(ctx, side, [B, C, F, G], mRight, 0.3);

  ctx.strokeStyle = 'rgba(20,16,12,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]);
  ctx.lineTo(D[0], D[1]); ctx.closePath();
  ctx.moveTo(D[0], D[1]); ctx.lineTo(E[0], E[1]); ctx.lineTo(F[0], F[1]);
  ctx.lineTo(G[0], G[1]); ctx.lineTo(B[0], B[1]);
  ctx.moveTo(C[0], C[1]); ctx.lineTo(F[0], F[1]);
  ctx.moveTo(C[0], C[1]); ctx.lineTo(E[0], E[1]);
  ctx.moveTo(C[0], C[1]); ctx.lineTo(G[0], G[1]);
  ctx.stroke();
  ctx.restore();
  return c;
}

export function tileDataURL(index, px = 48) {
  if (!iconCanvas) iconCanvas = buildAtlas().canvas;
  const c = document.createElement('canvas');
  c.width = px; c.height = px;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const tx = index % COLS, ty = (index / COLS) | 0;
  ctx.drawImage(iconCanvas, tx * CELL + PAD, ty * CELL + PAD, ART, ART, 0, 0, px, px);
  return c.toDataURL();
}

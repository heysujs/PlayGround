import * as THREE from '../vendor/three.module.js';
import { B, BLOCKS, FACES, tileForFace, isOpaque, isSolid } from './blocks.js';
import { tileRect } from './textures.js';

export const CH = 16;
export const HEIGHT = 96;
export const SEA = 32;
const MAX_Y = HEIGHT - 1;
const PADW = CH + 2;
const PAD_AREA = PADW * PADW;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* ---------------- deterministic noise ---------------- */

function hashInt(x, z, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
function hash2(x, z, seed = 0) { return hashInt(x, z, seed) / 4294967296; }
function hash3(x, y, z, seed = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 2246822519) ^
    Math.imul(z | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function rand2(x, z, seed) {
  let a = hashInt(x, z, seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function vnoise2(x, z, seed) {
  const xi = Math.floor(x), zi = Math.floor(z);
  let fx = x - xi, fz = z - zi;
  fx = fx * fx * (3 - 2 * fx);
  fz = fz * fz * (3 - 2 * fz);
  const a = hash2(xi, zi, seed), b = hash2(xi + 1, zi, seed);
  const c = hash2(xi, zi + 1, seed), d = hash2(xi + 1, zi + 1, seed);
  return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fz;
}
function vnoise3(x, y, z, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let fx = x - xi, fy = y - yi, fz = z - zi;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  fz = fz * fz * (3 - 2 * fz);
  const c000 = hash3(xi, yi, zi, seed), c100 = hash3(xi + 1, yi, zi, seed);
  const c010 = hash3(xi, yi + 1, zi, seed), c110 = hash3(xi + 1, yi + 1, zi, seed);
  const c001 = hash3(xi, yi, zi + 1, seed), c101 = hash3(xi + 1, yi, zi + 1, seed);
  const c011 = hash3(xi, yi + 1, zi + 1, seed), c111 = hash3(xi + 1, yi + 1, zi + 1, seed);
  const x00 = c000 + (c100 - c000) * fx;
  const x10 = c010 + (c110 - c010) * fx;
  const x01 = c001 + (c101 - c001) * fx;
  const x11 = c011 + (c111 - c011) * fx;
  const y0 = x00 + (x10 - x00) * fy;
  const y1 = x01 + (x11 - x01) * fy;
  return y0 + (y1 - y0) * fz;
}
function fbm2(x, z, oct, seed) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += (vnoise2(x * freq, z * freq, seed + i * 131) * 2 - 1) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

/* ---------------- terrain shape ---------------- */

export function heightAtWorld(x, z) {
  const base = fbm2(x * 0.0043, z * 0.0043, 4, 11);
  const hills = fbm2(x * 0.019, z * 0.019, 3, 23);
  const mmask = smoothstep(0.18, 0.78, fbm2(x * 0.0032 + 31, z * 0.0032 - 17, 3, 37));
  const ridge = 1 - Math.abs(fbm2(x * 0.0125, z * 0.0125, 3, 51));
  const h = 30 + base * 13 + hills * 3.4 + mmask * ridge * ridge * 44;
  return clamp(h, 3, MAX_Y - 6);
}
export function temperatureAt(x, z) { return fbm2(x * 0.0021 + 120, z * 0.0021 - 80, 2, 71); }
export function humidityAt(x, z) { return fbm2(x * 0.0027 - 55, z * 0.0027 + 210, 2, 83); }

function columnInfo(x, z) {
  const h = Math.round(heightAtWorld(x, z));
  const temp = temperatureAt(x, z);
  const humid = humidityAt(x, z);
  const desert = temp > 0.27 && humid < 0.04;
  const snowy = temp < -0.34;
  const beach = h <= SEA + 2 && h >= SEA - 2;
  return { h, temp, humid, desert, snowy, beach };
}

/* ---------------- world ---------------- */

export class World {
  constructor(seed, savedEdits) {
    this.seed = seed | 0;
    this.chunks = new Map();
    this.edits = new Map();
    this.dirty = false;
    if (savedEdits) {
      for (const k of Object.keys(savedEdits)) {
        const arr = savedEdits[k];
        const m = new Map();
        for (let i = 0; i < arr.length; i += 2) m.set(arr[i], arr[i + 1]);
        this.edits.set(Number(k), m);
      }
    }
  }
  key(cx, cz) { return cx * 1000003 + cz; }
  getChunk(cx, cz) {
    const k = this.key(cx, cz);
    let c = this.chunks.get(k);
    if (!c) {
      c = { cx, cz, data: new Uint8Array(CH * CH * HEIGHT), height: new Uint8Array(CH * CH), generated: false, dirty: true, version: 0 };
      this.chunks.set(k, c);
      this.generate(c);
    }
    return c;
  }
  peekChunk(cx, cz) { return this.chunks.get(this.key(cx, cz)); }
  getBlock(x, y, z) {
    if (y < 0 || y >= HEIGHT) return 0;
    const c = this.chunks.get(this.key(x >> 4, z >> 4));
    if (!c || !c.generated) return 0;
    return c.data[(y * CH + (z & 15)) * CH + (x & 15)];
  }
  heightAt(x, z) {
    if (z === undefined) return 0;
    const c = this.chunks.get(this.key(x >> 4, z >> 4));
    if (!c || !c.generated) return 0;
    return c.height[(z & 15) * CH + (x & 15)];
  }
  isSolidAt(x, y, z) { return isSolid(this.getBlock(x, y, z)); }
  isWaterAt(x, y, z) { return this.getBlock(x, y, z) === B.WATER; }

  surfaceY(x, z) {
    const c = this.getChunk(x >> 4, z >> 4);
    const lx = x & 15, lz = z & 15;
    for (let y = HEIGHT - 1; y >= 0; y--) {
      const id = c.data[(y * CH + lz) * CH + lx];
      if (id !== 0 && isSolid(id)) return y;
    }
    return 0;
  }

  setBlock(x, y, z, id, record = true) {
    if (y < 0 || y >= HEIGHT) return null;
    const cx = x >> 4, cz = z >> 4;
    const c = this.getChunk(cx, cz);
    const lx = x & 15, lz = z & 15;
    const idx = (y * CH + lz) * CH + lx;
    if (c.data[idx] === id) return null;
    c.data[idx] = id;
    c.dirty = true;
    c.version++;
    // recompute the column height
    let hy = HEIGHT - 1;
    for (; hy >= 0; hy--) {
      const b = c.data[(hy * CH + lz) * CH + lx];
      if (b !== 0 && isOpaque(b)) break;
    }
    c.height[lz * CH + lx] = hy;
    if (record) {
      const k = this.key(cx, cz);
      let m = this.edits.get(k);
      if (!m) { m = new Map(); this.edits.set(k, m); }
      m.set(idx, id);
      this.dirty = true;
    }
    const affected = [{ cx, cz }];
    const add = (dx, dz) => {
      const t = this.chunks.get(this.key(cx + dx, cz + dz));
      if (t) { t.dirty = true; affected.push({ cx: t.cx, cz: t.cz }); }
    };
    if (lx === 0) add(-1, 0);
    if (lx === 15) add(1, 0);
    if (lz === 0) add(0, -1);
    if (lz === 15) add(0, 1);
    if (lx === 0 && lz === 0) add(-1, -1);
    if (lx === 15 && lz === 0) add(1, -1);
    if (lx === 0 && lz === 15) add(-1, 1);
    if (lx === 15 && lz === 15) add(1, 1);
    return affected;
  }

  exportEdits() {
    const out = {};
    for (const [k, m] of this.edits) {
      const arr = [];
      for (const [idx, id] of m) { arr.push(idx, id); }
      out[k] = arr;
    }
    return out;
  }

  /* ------------ generation ------------ */

  generate(c) {
    const { cx, cz } = c;
    const bx = cx * CH, bz = cz * CH;
    const data = c.data;
    const heights = new Int16Array(256);
    const desertCol = new Uint8Array(256);
    const snowCol = new Uint8Array(256);

    for (let lz = 0; lz < CH; lz++) {
      for (let lx = 0; lx < CH; lx++) {
        const wx = bx + lx, wz = bz + lz;
        const info = columnInfo(wx, wz);
        const h = info.h;
        heights[lz * CH + lx] = h;
        desertCol[lz * CH + lx] = info.desert ? 1 : 0;
        snowCol[lz * CH + lx] = info.snowy ? 1 : 0;

        let surf;
        if (h < SEA - 2) surf = hash2(wx, wz, 3) < 0.35 ? B.GRAVEL : B.SAND;
        else if (h <= SEA + 1) surf = B.SAND;
        else if (info.snowy) surf = B.SNOW;
        else if (info.desert) surf = B.SAND;
        else surf = B.GRASS;

        for (let y = 0; y <= h; y++) {
          const depth = h - y;
          let id;
          if (depth === 0) id = surf;
          else if (depth <= 3) {
            id = (surf === B.SAND || surf === B.SANDSTONE) ? B.SAND : B.DIRT;
          } else if (info.desert && depth <= 7) {
            id = B.SANDSTONE;
          } else {
            id = B.STONE;
            if (y < h - 4) {
              const r = hash3(wx, y, wz, this.seed + 301);
              if (r < 0.0055 && y < 30) id = B.IRON;
              else if (r < 0.017 && y < 60) id = B.COAL;
            }
          }
          data[(y * CH + lz) * CH + lx] = id;
        }
        data[(0 * CH + lz) * CH + lx] = B.BEDROCK;
        if (hash3(wx, 1, wz, this.seed + 17) < 0.55) data[(1 * CH + lz) * CH + lx] = B.BEDROCK;

        // water
        for (let y = h + 1; y <= SEA; y++) data[(y * CH + lz) * CH + lx] = B.WATER;
      }
    }

    // caves
    for (let lz = 0; lz < CH; lz++) {
      for (let lx = 0; lx < CH; lx++) {
        const wx = bx + lx, wz = bz + lz;
        const h = heights[lz * CH + lx];
        const submerged = h <= SEA + 2;
        for (let y = 3; y < h - 2; y++) {
          if (submerged && y > SEA - 7) continue;
          const idx = (y * CH + lz) * CH + lx;
          if (data[idx] === B.AIR) continue;
          const n1 = vnoise3(wx * 0.047, y * 0.072, wz * 0.047, this.seed + 91);
          if (n1 < 0.455 || n1 > 0.545) continue;
          const n2 = vnoise3(wx * 0.027 + 41, y * 0.045, wz * 0.027 - 13, this.seed + 137);
          if (n2 < 0.415 || n2 > 0.585) continue;
          data[idx] = B.AIR;
        }
      }
    }

    // trees (deterministic per 6x6 cell, drawn only where they intersect us)
    const CELL = 6;
    const cell0X = Math.floor((bx - 3) / CELL), cell1X = Math.floor((bx + CH + 2) / CELL);
    const cell0Z = Math.floor((bz - 3) / CELL), cell1Z = Math.floor((bz + CH + 2) / CELL);
    for (let ccx = cell0X; ccx <= cell1X; ccx++) {
      for (let ccz = cell0Z; ccz <= cell1Z; ccz++) {
        const rnd = rand2(ccx, ccz, this.seed + 717);
        const tx = ccx * CELL + ((rnd() * CELL) | 0);
        const tz = ccz * CELL + ((rnd() * CELL) | 0);
        const info = columnInfo(tx, tz);
        if (info.h <= SEA + 1 || info.desert) continue;
        let density = 0.14;
        if (info.snowy) density = 0.22;
        else if (info.humid > 0.08) density = 0.78;
        else if (info.humid > -0.12) density = 0.42;
        if (rnd() > density) continue;
        if (info.h > 72) continue;
        this.growTree(c, tx, info.h, tz, rnd);
      }
    }

    // ground cover
    for (let lz = 0; lz < CH; lz++) {
      for (let lx = 0; lx < CH; lx++) {
        const wx = bx + lx, wz = bz + lz;
        const h = heights[lz * CH + lx];
        if (h >= HEIGHT - 2) continue;
        const surf = data[(h * CH + lz) * CH + lx];
        const above = (h + 1) * CH * CH + lz * CH + lx;
        if (data[above] !== B.AIR) continue;
        const r = hash3(wx, 7, wz, this.seed + 991);
        if (surf === B.GRASS) {
          if (r < 0.055) {
            const y = h + 1;
            const pick = hash3(wx, 11, wz, this.seed + 992);
            data[(y * CH + lz) * CH + lx] = pick < 0.32 ? B.POPPY : pick < 0.6 ? B.DANDELION : B.TALLGRASS;
          }
        } else if (surf === B.SAND && desertCol[lz * CH + lx] && r < 0.006) {
          const ch = 2 + ((hash3(wx, 9, wz, this.seed + 993) * 3) | 0);
          for (let dy = 1; dy <= ch && h + dy < HEIGHT; dy++) {
            if (data[((h + dy) * CH + lz) * CH + lx] !== B.AIR) break;
            data[((h + dy) * CH + lz) * CH + lx] = B.CACTUS;
          }
        }
      }
    }

    // player edits
    const k = this.key(cx, cz);
    const edit = this.edits.get(k);
    if (edit) {
      for (const [idx, id] of edit) data[idx] = id;
    }

    // height map (topmost opaque block)
    for (let lz = 0; lz < CH; lz++) {
      for (let lx = 0; lx < CH; lx++) {
        let hy = HEIGHT - 1;
        for (; hy >= 0; hy--) {
          const id = data[(hy * CH + lz) * CH + lx];
          if (id !== 0 && isOpaque(id)) break;
        }
        c.height[lz * CH + lx] = hy;
      }
    }
    c.generated = true;
    c.dirty = true;
  }

  growTree(c, tx, groundY, tz, rnd) {
    const bx = c.cx * CH, bz = c.cz * CH;
    const trunkH = 4 + ((rnd() * 3) | 0);
    const topY = groundY + trunkH;
    if (topY + 2 >= HEIGHT) return;
    const place = (x, y, z, id, onlyAir) => {
      const lx = x - bx, lz = z - bz;
      if (lx < 0 || lx > 15 || lz < 0 || lz > 15 || y < 0 || y >= HEIGHT) return;
      const idx = (y * CH + lz) * CH + lx;
      if (onlyAir && c.data[idx] !== B.AIR) return;
      c.data[idx] = id;
    };
    // canopy
    for (let dy = -2; dy <= 1; dy++) {
      const y = topY + dy;
      const r = dy >= 1 ? 1 : 2;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          const corner = Math.abs(dx) === r && Math.abs(dz) === r;
          if (corner && (dy >= 1 || rnd() < 0.6)) continue;
          if (dx === 0 && dz === 0 && dy < 1) continue;
          place(tx + dx, y, tz + dz, B.LEAVES, true);
        }
      }
    }
    // trunk
    for (let y = groundY + 1; y <= topY; y++) place(tx, y, tz, B.LOG, false);
    // dirt under trunk base so it does not float over caves
    place(tx, groundY, tz, B.DIRT, false);
    // small root/canopy anchor
    place(tx, topY + 1, tz, B.LEAVES, true);
  }
}

/* ---------------- chunk meshing ---------------- */

const AO_LEVELS = [0.55, 0.72, 0.86, 1.0];

function newBuf() { return { pos: [], norm: [], uv: [], col: [], idx: [] }; }

function pushVertex(buf, x, y, z, nx, ny, nz, u, v, c) {
  buf.pos.push(x, y, z);
  buf.norm.push(nx, ny, nz);
  buf.uv.push(u, v);
  buf.col.push(c, c, c);
}
function pushQuad(buf, verts, idxCount, flip) {
  const b = idxCount;
  if (!flip) buf.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  else buf.idx.push(b + 1, b + 2, b + 3, b + 1, b + 3, b);
}

/* padded neighbourhood: lets meshing walk across chunk borders cheaply */
function buildPad(world, c) {
  const pad = new Uint8Array(PAD_AREA * HEIGHT);
  const hp = new Int16Array(PAD_AREA);
  for (let pz = -1; pz <= CH; pz++) {
    for (let px = -1; px <= CH; px++) {
      const wx = c.cx * CH + px, wz = c.cz * CH + pz;
      const nb = world.chunks.get(world.key(wx >> 4, wz >> 4));
      const lx = wx & 15, lz = wz & 15;
      const pi = (pz + 1) * PADW + (px + 1);
      if (!nb || !nb.generated) { hp[pi] = 0; continue; }
      hp[pi] = nb.height[lz * CH + lx];
      const base = pi * HEIGHT;
      for (let y = 0; y < HEIGHT; y++) pad[base + y] = nb.data[(y * CH + lz) * CH + lx];
    }
  }
  return { pad, hp };
}

const skyBrightness = (hp, pi, y) => {
  const H = hp[pi];
  if (y >= H) return 1;
  return 0.34 + 0.66 * clamp((y - H + 9) / 9, 0, 1);
};

export function buildChunkGeometry(world, c, materials) {
  const { pad, hp } = buildPad(world, c);
  PAD_REF = pad;
  const opaque = newBuf(), cutout = newBuf(), water = newBuf(), glass = newBuf();
  const bx = c.cx * CH, bz = c.cz * CH;
  const PI = (lx, lz) => (lz + 1) * PADW + (lx + 1);
  const AT = (lx, y, lz) => pad[PI(lx, lz) * HEIGHT + y];

  for (let y = 0; y < HEIGHT; y++) {
    for (let lz = 0; lz < CH; lz++) {
      for (let lx = 0; lx < CH; lx++) {
        const id = c.data[(y * CH + lz) * CH + lx];
        if (id === 0) continue;
        const def = BLOCKS[id];
        const wx = bx + lx, wz = bz + lz;
        const nPi = PI(lx, lz);

        if (def.plant) {
          addPlant(cutout, wx, y, wz, def.tiles.side, hp, nPi);
          continue;
        }

        let buf = opaque;
        if (id === B.WATER) buf = water;
        else if (def.transparent) buf = glass;

        for (let f = 0; f < 6; f++) {
          const face = FACES[f];
          const nid = AT(lx + face.n[0], y + face.n[1], lz + face.n[2]);
          if (nid !== 0) {
            const nd = BLOCKS[nid];
            if (nd.plant) { /* keep face */ }
            else if (nd.transparent) {
              if (nd.liquid && id === B.WATER) continue; // water/water seam
              if (!nd.liquid && id === nid) continue;     // glass/glass seam
            } else continue; // opaque neighbour hides this face
          }
          const tile = tileForFace(id, f);
          addFace(buf, wx, y, wz, f, tile, id === B.WATER ? AT(lx, y + 1, lz) : -1, hp, PI);
        }
      }
    }
  }

  PAD_REF = null;
  const make = (buf, mat, renderOrder) => {
    if (!buf.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(buf.norm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(buf.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(buf.col, 3));
    g.setIndex(buf.idx);
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, mat);
    mesh.matrixAutoUpdate = false;
    mesh.renderOrder = renderOrder;
    return mesh;
  };

  return {
    opaque: make(opaque, materials.opaque, 0),
    cutout: make(cutout, materials.cutout, 1),
    water: make(water, materials.water, 2),
    glass: make(glass, materials.glass, 3),
  };
}

function addFace(buf, wx, wy, wz, f, tile, waterAbove, hp, PI) {
  const face = FACES[f];
  const n = face.n;
  const lx0 = wx & 15, lz0 = wz & 15;
  const cornerLight = [0, 0, 0, 0];
  const cornerAO = [0, 0, 0, 0];
  const axes = [0, 1, 2].filter((a) => n[a] === 0);
  const a1 = axes[0], a2 = axes[1];

  const blockOcc = (dx, dy, dz) => {
    const yy = wy + dy;
    if (yy < 0 || yy >= HEIGHT) return 0;
    return AT_PAD(lx0 + dx, yy, lz0 + dz);
  };

  for (let i = 0; i < 4; i++) {
    const co = face.c[i];
    const ox = co[0], oy = co[1], oz = co[2];
    // sky exposure sampled in the natural light column of this vertex
    const pi = PI(lx0 + ox, lz0 + oz);
    const sky = skyBrightness(hp, pi, Math.min(HEIGHT - 1, wy + oy));
    cornerLight[i] = sky;

    // ambient occlusion from the three cells around this face corner
    const o1x = a1 === 0 ? (ox === 1 ? 1 : -1) : 0;
    const o1y = a1 === 1 ? (oy === 1 ? 1 : -1) : 0;
    const o1z = a1 === 2 ? (oz === 1 ? 1 : -1) : 0;
    const o2x = a2 === 0 ? (ox === 1 ? 1 : -1) : 0;
    const o2y = a2 === 1 ? (oy === 1 ? 1 : -1) : 0;
    const o2z = a2 === 2 ? (oz === 1 ? 1 : -1) : 0;
    const s1 = isOpaque(blockOcc(n[0] + o1x, n[1] + o1y, n[2] + o1z)) ? 1 : 0;
    const s2 = isOpaque(blockOcc(n[0] + o2x, n[1] + o2y, n[2] + o2z)) ? 1 : 0;
    const cr = isOpaque(blockOcc(n[0] + o1x + o2x, n[1] + o1y + o2y, n[2] + o1z + o2z)) ? 1 : 0;
    let ao;
    if (s1 && s2) ao = AO_LEVELS[0];
    else ao = AO_LEVELS[3 - (s1 + s2 + cr)];
    cornerAO[i] = ao;
  }

  const topOffset = waterAbove === -1 ? 1 : waterAbove === 0 ? 0.88 : 1;
  const verts = [];
  for (let i = 0; i < 4; i++) {
    const co = face.c[i];
    const py = wy + (co[1] === 1 ? topOffset : 0);
    const u = face.uv[i][0], v = face.uv[i][1];
    const r = tileRect(tile);
    const light = cornerAO[i] * cornerLight[i];
    verts.push([wx + co[0], py, wz + co[2], n[0], n[1], n[2], r.x + u * r.size, r.y + v * r.size, light]);
  }
  const flip = cornerAO[0] + cornerAO[2] < cornerAO[1] + cornerAO[3];
  const start = buf.pos.length / 3;
  for (const v of verts) pushVertex(buf, v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8]);
  pushQuad(buf, verts, start, flip);
}

/* direct padded-volume lookup (the pad is closed over by the mesher) */
let PAD_REF = null;
function AT_PAD(lx, y, lz) {
  if (!PAD_REF) return 0;
  return PAD_REF[((lz + 1) * PADW + (lx + 1)) * HEIGHT + y];
}

function addPlant(buf, wx, wy, wz, tile, hp, nPi) {
  const r = tileRect(tile);
  const sky = skyBrightness(hp, nPi, Math.min(HEIGHT - 1, wy));
  const quads = [
    [[0.12, 0, 0.12], [0.88, 0, 0.88], [0.88, 1, 0.88], [0.12, 1, 0.12]],
    [[0.88, 0, 0.12], [0.12, 0, 0.88], [0.12, 1, 0.88], [0.88, 1, 0.12]],
  ];
  for (const q of quads) {
    const start = buf.pos.length / 3;
    const uvs = [[0, 1], [1, 1], [1, 0], [0, 0]];
    for (let i = 0; i < 4; i++) {
      pushVertex(buf, wx + q[i][0], wy + q[i][1], wz + q[i][2],
        0, 1, 0, r.x + uvs[i][0] * r.size, r.y + uvs[i][1] * r.size, sky * 0.95);
    }
    buf.idx.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
}

/* ---------------- streamed chunk renderer ---------------- */

export class ChunkView {
  constructor(scene, world, materials, radius = 6) {
    this.scene = scene;
    this.world = world;
    this.materials = materials;
    this.radius = radius;
    this.entries = new Map();
    this.meshGroup = new THREE.Group();
    scene.add(this.meshGroup);
  }
  disposeGroup(e) {
    if (!e.group) return;
    this.meshGroup.remove(e.group);
    e.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    e.group = null;
    e.built = false;
  }
  rebuild(c) {
    const old = this.entries.get(this.world.key(c.cx, c.cz));
    if (old) this.disposeGroup(old);
    const geos = buildChunkGeometry(this.world, c, this.materials);
    const group = new THREE.Group();
    for (const g of [geos.opaque, geos.cutout, geos.glass, geos.water]) {
      if (g) group.add(g);
    }
    group.position.set(0, 0, 0);
    this.meshGroup.add(group);
    const key = this.world.key(c.cx, c.cz);
    let e = this.entries.get(key);
    if (!e) {
      e = { cx: c.cx, cz: c.cz, group: null };
      this.entries.set(key, e);
    }
    e.group = group;
    e.cx = c.cx;
    e.cz = c.cz;
    e.built = true;
    c.dirty = false;
  }
  update(px, pz, budgetMs = 7) {
    const pcx = Math.floor(px / CH), pcz = Math.floor(pz / CH);
    const R = this.radius;
    // drop far meshes
    for (const [key, e] of this.entries) {
      const d = Math.max(Math.abs(e.cx - pcx), Math.abs(e.cz - pcz));
      if (d > R + 1) {
        this.disposeGroup(e);
        this.entries.delete(key);
      }
    }
    // ensure data ring
    for (let dz = -R - 1; dz <= R + 1; dz++) {
      for (let dx = -R - 1; dx <= R + 1; dx++) {
        if (dx * dx + dz * dz > (R + 1.6) * (R + 1.6)) continue;
        this.world.getChunk(pcx + dx, pcz + dz);
      }
    }
    // queue dirty/missing
    const queue = [];
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dz * dz > R * R + 1) continue;
        const c = this.world.peekChunk(pcx + dx, pcz + dz);
        if (!c) continue;
        const key = this.world.key(c.cx, c.cz);
        const e = this.entries.get(key);
        if (!e || !e.group || c.dirty) {
          queue.push({ c, d: dx * dx + dz * dz });
        }
      }
    }
    if (!queue.length) return;
    queue.sort((a, b) => a.d - b.d);
    const t0 = performance.now();
    let built = 0;
    for (const q of queue) {
      this.rebuild(q.c);
      built++;
      if (performance.now() - t0 > budgetMs && built >= 1) break;
    }
  }
  count() { let n = 0; for (const e of this.entries.values()) if (e.group) n++; return n; }
  pending() {
    let n = 0;
    for (const e of this.entries.values()) if (!e.group) n++;
    return n;
  }
}

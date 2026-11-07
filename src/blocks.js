import * as THREE from '../vendor/three.module.js';
import { TILES, tileRect } from './textures.js';

export const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COBBLE: 4, SAND: 5, SANDSTONE: 6,
  LOG: 7, PLANKS: 8, GLASS: 9, BRICK: 10, WATER: 11, SNOW: 12, GRAVEL: 13,
  COAL: 14, IRON: 15, BEDROCK: 16, CACTUS: 17, LEAVES: 18,
  POPPY: 19, DANDELION: 20, TALLGRASS: 21, ICE: 22,
};

function def(id, key, name, tiles, opts = {}) {
  return {
    id, key, name,
    tiles: typeof tiles === 'number' ? { top: tiles, bottom: tiles, side: tiles } : tiles,
    solid: opts.solid !== false,
    opaque: opts.opaque !== false,
    plant: !!opts.plant,
    liquid: !!opts.liquid,
    cutout: !!opts.cutout,
    transparent: !!opts.transparent,
    hardness: opts.hardness ?? 0.5,
    sound: opts.sound || 'stone',
    placeable: opts.placeable !== false,
  };
}

export const BLOCKS = [
  null,
  def(B.GRASS, 'grass', 'Grass Block', { top: TILES.grass_top, side: TILES.grass_side, bottom: TILES.dirt }, { hardness: 0.42, sound: 'grass' }),
  def(B.DIRT, 'dirt', 'Dirt', TILES.dirt, { hardness: 0.38, sound: 'grass' }),
  def(B.STONE, 'stone', 'Stone', TILES.stone, { hardness: 1.35, sound: 'stone' }),
  def(B.COBBLE, 'cobble', 'Cobblestone', TILES.cobble, { hardness: 1.25, sound: 'stone' }),
  def(B.SAND, 'sand', 'Sand', TILES.sand, { hardness: 0.4, sound: 'sand' }),
  def(B.SANDSTONE, 'sandstone', 'Sandstone', { top: TILES.sandstone_top, side: TILES.sandstone_side, bottom: TILES.sandstone_top }, { hardness: 0.9, sound: 'stone' }),
  def(B.LOG, 'log', 'Oak Log', { top: TILES.log_top, side: TILES.log_side, bottom: TILES.log_top }, { hardness: 0.85, sound: 'wood' }),
  def(B.PLANKS, 'planks', 'Oak Planks', TILES.planks, { hardness: 0.7, sound: 'wood' }),
  def(B.GLASS, 'glass', 'Glass', TILES.glass, { transparent: true, opaque: false, hardness: 0.22, sound: 'glass' }),
  def(B.BRICK, 'brick', 'Bricks', TILES.brick, { hardness: 1.4, sound: 'stone' }),
  def(B.WATER, 'water', 'Water', TILES.water, { liquid: true, transparent: true, opaque: false, solid: false, hardness: Infinity, placeable: true }),
  def(B.SNOW, 'snow', 'Snow Block', { top: TILES.snow, side: TILES.snow_side, bottom: TILES.dirt }, { hardness: 0.35, sound: 'snow' }),
  def(B.GRAVEL, 'gravel', 'Gravel', TILES.gravel, { hardness: 0.45, sound: 'sand' }),
  def(B.COAL, 'coal', 'Coal Ore', TILES.coal_ore, { hardness: 1.7, sound: 'stone' }),
  def(B.IRON, 'iron', 'Iron Ore', TILES.iron_ore, { hardness: 1.9, sound: 'stone' }),
  def(B.BEDROCK, 'bedrock', 'Bedrock', TILES.bedrock, { hardness: Infinity, sound: 'stone' }),
  def(B.CACTUS, 'cactus', 'Cactus', { top: TILES.cactus_top, side: TILES.cactus_side, bottom: TILES.cactus_top }, { hardness: 0.5, sound: 'wood' }),
  def(B.LEAVES, 'leaves', 'Oak Leaves', TILES.leaves, { hardness: 0.2, sound: 'grass' }),
  def(B.POPPY, 'poppy', 'Poppy', { top: TILES.poppy, side: TILES.poppy, bottom: TILES.poppy }, { plant: true, cutout: true, solid: false, opaque: false, hardness: 0.02, sound: 'grass' }),
  def(B.DANDELION, 'dandelion', 'Dandelion', { top: TILES.dandelion, side: TILES.dandelion, bottom: TILES.dandelion }, { plant: true, cutout: true, solid: false, opaque: false, hardness: 0.02, sound: 'grass' }),
  def(B.TALLGRASS, 'tallgrass', 'Tall Grass', { top: TILES.tallgrass, side: TILES.tallgrass, bottom: TILES.tallgrass }, { plant: true, cutout: true, solid: false, opaque: false, hardness: 0.02, sound: 'grass' }),
  def(B.ICE, 'ice', 'Ice', TILES.ice, { transparent: true, opaque: false, hardness: 0.5, sound: 'glass' }),
];

export const PLACEABLE = BLOCKS.filter((b) => b && b.placeable);
export const DEFAULT_HOTBAR = [
  B.GRASS, B.DIRT, B.STONE, B.COBBLE, B.SAND, B.LOG, B.PLANKS, B.GLASS, B.BRICK,
];

const isAir = (id) => id === 0;

export function isOpaque(id) {
  const d = BLOCKS[id];
  return !!d && d.opaque;
}

export function isSolid(id) {
  const d = BLOCKS[id];
  return !!d && d.solid;
}

export function isWater(id) { return id === B.WATER; }

/* ------------------------------------------------------------------ *
 * Cube face table: corner positions + uv (v grows downward in atlas)
 * ------------------------------------------------------------------ */
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], uv: [[0, 1], [1, 1], [1, 0], [0, 0]] },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], uv: [[0, 1], [1, 1], [1, 0], [0, 0]] },
  { n: [0, 1, 0], c: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], uv: [[0, 0], [0, 1], [1, 1], [1, 0]] },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], uv: [[0, 0], [1, 0], [1, 1], [0, 1]] },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], uv: [[0, 1], [1, 1], [1, 0], [0, 0]] },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], uv: [[0, 1], [1, 1], [1, 0], [0, 0]] },
];
export { FACES };

export function tileForFace(block, faceIndex) {
  const d = BLOCKS[block];
  if (faceIndex === 2) return d.tiles.top;
  if (faceIndex === 3) return d.tiles.bottom;
  return d.tiles.side;
}

/* UV for a corner of a face (u,v in 0..1 across the tile art). */
export function faceUV(tile, u, v) {
  const r = tileRect(tile);
  return [r.x + u * r.size, r.y + v * r.size];
}

/* Shared materials. */
export function createMaterials(atlasTexture) {
  const opaque = new THREE.MeshLambertMaterial({ map: atlasTexture, vertexColors: true });
  const cutout = new THREE.MeshLambertMaterial({
    map: atlasTexture, vertexColors: true, alphaTest: 0.45, side: THREE.DoubleSide,
  });
  const water = new THREE.MeshLambertMaterial({
    map: atlasTexture, vertexColors: true, transparent: true, opacity: 0.78,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const glass = new THREE.MeshLambertMaterial({
    map: atlasTexture, vertexColors: true, transparent: true, opacity: 0.92,
    depthWrite: false, alphaTest: 0.02, side: THREE.DoubleSide,
  });
  return { opaque, cutout, water, glass };
}

/* Geometry for a single block (held item + break particles). */
const geoCache = new Map();
export function blockGeometry(id) {
  if (geoCache.has(id)) return geoCache.get(id);
  const g = new THREE.BoxGeometry(1, 1, 1);
  const uvAttr = g.attributes.uv;
  for (let f = 0; f < 6; f++) {
    const tile = tileForFace(id, f);
    const r = tileRect(tile);
    // Box UVs run v=1 at the top of the face; atlas v grows downward.
    for (let i = 0; i < 4; i++) {
      const vi = f * 4 + i;
      const u = uvAttr.getX(vi);
      const v = uvAttr.getY(vi);
      uvAttr.setXY(vi, r.x + u * r.size, r.y + (1 - v) * r.size);
    }
  }
  uvAttr.needsUpdate = true;
  geoCache.set(id, g);
  return g;
}

export { isAir };

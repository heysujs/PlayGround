export const CORE_DEPTH = 6371;
export const OIL_SECONDS = 60;
export const BASE_SPEED = 13;
export const BASE_YIELD = 6;
export const START_CASH = 1000;

export const BIOMES = [
  { id: 'CRUST', name: 'CONTINENTAL CRUST', limit: 35, color: 0xffb347, css: '#ffb347' },
  { id: 'MANTLE', name: 'SILICATE MANTLE', limit: 2890, color: 0xff7638, css: '#ff7638' },
  { id: 'OUTER CORE', name: 'LIQUID OUTER CORE', limit: 5150, color: 0xff4a32, css: '#ff4a32' },
  { id: 'INNER CORE', name: 'SOLID INNER CORE', limit: CORE_DEPTH, color: 0xffe18b, css: '#ffe18b' },
];

export const UPGRADE_DEFS = [
  {
    id: 'motor',
    name: 'Magnetic Motor',
    desc: 'A hotter stator and stronger drive head. Increases bore speed.',
    costs: [2200, 6500, 16000],
    max: 3,
    statLabel: 'DRILL SPEED',
    stat: (lv) => `${(BASE_SPEED * (1 + lv * 0.35)).toFixed(1)} KM/S`,
  },
  {
    id: 'refinery',
    name: 'Ore Refinery',
    desc: 'Sorts and sells bore tailings in real time. More credits per kilometer.',
    costs: [1800, 5200, 14000],
    max: 3,
    statLabel: 'TAILINGS VALUE',
    stat: (lv) => `$${BASE_YIELD + lv * 3} / KM`,
  },
  {
    id: 'tank',
    name: 'Reservoir Rings',
    desc: 'Adds an extra barrel mount to the top of the rig. More oil per climb.',
    costs: [1600, 5000, 12000],
    max: 3,
    statLabel: 'RIG CAPACITY',
    stat: (lv) => `${1 + lv} BARREL${lv ? 'S' : ''}`,
  },
  {
    id: 'auto',
    name: 'Auto-Loader',
    desc: 'A robotic arm loads a spare barrel whenever the reservoir runs dry.',
    costs: [8500],
    max: 1,
    statLabel: 'AUTOMATION',
    stat: (lv) => (lv ? 'AUTOMATIC' : 'MANUAL'),
  },
];

export const SHOP_ITEMS = [
  {
    id: 'barrel',
    name: 'Crude Barrel',
    barrels: 1,
    cost: 650,
    desc: 'One barrel. Sixty seconds of full-power drilling.',
    icon: '◈',
  },
  {
    id: 'crate',
    name: 'Barrel Crate',
    barrels: 3,
    cost: 1750,
    desc: 'Three barrels, strapped and ready. Save 200 credits.',
    icon: '▥',
  },
  {
    id: 'tanker',
    name: 'Mini Tanker',
    barrels: 8,
    cost: 4200,
    desc: 'Eight barrels for a long unattended burn. Save 1,000 credits.',
    icon: '▰',
  },
];

export function biomeFor(depth) {
  for (const biome of BIOMES) {
    if (depth < biome.limit) return biome;
  }
  return BIOMES[BIOMES.length - 1];
}

export function biomeIndex(depth) {
  for (let i = 0; i < BIOMES.length; i++) {
    if (depth < BIOMES[i].limit) return i;
  }
  return BIOMES.length - 1;
}

export function speedMultiplier(state) {
  return 1 + state.lv.motor * 0.35;
}

export function yieldValue(state) {
  return BASE_YIELD + state.lv.refinery * 3;
}

export function tankMax(state) {
  return 1 + state.lv.tank;
}

export function nextUpgradeCost(def, level) {
  return def.costs[level] ?? null;
}

export function formatMoney(value) {
  return '$' + Math.floor(value).toLocaleString('en-US');
}

export function formatDepth(value) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

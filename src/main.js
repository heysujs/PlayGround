import * as THREE from '../vendor/three.module.js';
import { buildAtlas, TILE_NAMES, TILES } from './textures.js';
import {
  BLOCKS, B, PLACEABLE, DEFAULT_HOTBAR, blockGeometry, createMaterials,
} from './blocks.js';
import { World, ChunkView, CH, HEIGHT, SEA, heightAtWorld, humidityAt } from './world.js';
import { Player, raycastVoxel } from './player.js';
import { Sky } from './sky.js';
import { Sound } from './audio.js';
import {
  $, buildHotbar, updateHotbarSelection, buildPalette, toast, setBreakRing,
} from './ui.js';

/* ------------------------------------------------------------------ *
 *  Setup
 * ------------------------------------------------------------------ */

const SAVE_KEY = 'minecraft3d.save.v1';
const isTouch = window.matchMedia('(pointer: coarse)').matches ||
  (('ontouchstart' in window) && navigator.maxTouchPoints > 0);
if (isTouch) document.body.classList.add('touch');

function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { return null; }
}
const save = loadSave();
const params = new URLSearchParams(location.search);
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) && seedParam !== 0 ? seedParam : (save?.seed || 1337);
const resume = save && save.seed === seed ? save : null;

const canvas = $('#game');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  $('#loadText').textContent = 'WebGL is unavailable in this browser.';
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x87ceeb, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfe8f5, 58, 108);
const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.08, 900);
camera.rotation.order = 'YXZ';
scene.add(camera);

const atlas = buildAtlas();
const materials = createMaterials(atlas.texture);
const sky = new Sky(scene, renderer);
const world = new World(seed, resume?.edits);
const view = new ChunkView(scene, world, materials, isTouch ? 5 : 6);
const player = new Player(world);
const sound = new Sound();
if (resume?.muted) sound.setMuted(true);

/* ------------------------------------------------------------------ *
 *  Restore or find the spawn point
 * ------------------------------------------------------------------ */

function findScenicSpawn() {
  let best = null;
  for (let r = 0; r <= 42; r += 6) {
    const n = r === 0 ? 1 : 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.6;
      const x = Math.round(startX + Math.cos(a) * r);
      const z = Math.round(startZ + Math.sin(a) * r);
      const h = heightAtWorld(x, z);
      if (h <= SEA + 2 || h > 64) continue;
      let sum = 0, low = 999, lowAng = 0;
      for (let d = 0; d < 8; d++) {
        const ang = (d / 8) * Math.PI * 2;
        let sh = 0;
        for (let k = 1; k <= 3; k++) sh += heightAtWorld(x + Math.cos(ang) * 14 * k, z + Math.sin(ang) * 14 * k);
        sh /= 3;
        sum += sh;
        if (sh < low) { low = sh; lowAng = ang; }
      }
      const avg = sum / 8;
      const score = h * 0.7 + Math.max(0, h - avg) * 2.6 + (low < SEA + 1 ? 7 : 0)
        - Math.max(0, humidityAt(x, z)) * 6 + (r < 14 ? 1 : 0);
      if (!best || score > best.score) {
        best = { x, z, h, yaw: Math.atan2(-Math.cos(lowAng), -Math.sin(lowAng)), score };
      }
    }
  }
  return best;
}

const startX = Math.round(resume?.player?.x ?? 8);
const startZ = Math.round(resume?.player?.z ?? 8);
for (let dz = -1; dz <= 1; dz++) {
  for (let dx = -1; dx <= 1; dx++) world.getChunk((startX >> 4) + dx, (startZ >> 4) + dz);
}
let restored = false;
if (resume?.player && Number.isFinite(resume.player.x)) {
  const p = resume.player;
  const below = world.getBlock(Math.floor(p.x), Math.floor(p.y - 0.3), Math.floor(p.z));
  const head = world.getBlock(Math.floor(p.x), Math.floor(p.y + 1.2), Math.floor(p.z));
  if (below !== 0 && head !== B.WATER) {
    player.pos.set(p.x, p.y, p.z);
    player.yaw = Number(p.yaw) || 0;
    player.pitch = Number(p.pitch) || 0;
    restored = true;
  }
}
if (!restored) {
  const spot = findScenicSpawn();
  let placed = false;
  if (spot) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) world.getChunk((spot.x >> 4) + dx, (spot.z >> 4) + dz);
    }
    const sy = world.surfaceY(spot.x, spot.z);
    if (sy > SEA + 1 && Math.abs(sy - spot.h) < 3 && world.getBlock(spot.x, sy, spot.z) !== B.WATER) {
      // clear a small vantage point so the spawn view is not blocked by a tree
      for (let dx = -3; dx <= 3; dx++) {
        for (let dz = -3; dz <= 3; dz++) {
          for (let y = sy + 1; y <= sy + 9; y++) {
            const id = world.getBlock(spot.x + dx, y, spot.z + dz);
            if (id === B.LEAVES || id === B.LOG || id === B.POPPY || id === B.DANDELION || id === B.TALLGRASS || id === B.CACTUS) {
              world.setBlock(spot.x + dx, y, spot.z + dz, 0);
            }
          }
        }
      }
      player.pos.set(spot.x + 0.5, sy + 1.02, spot.z + 0.5);
      player.yaw = spot.yaw;
      player.pitch = -0.08;
      placed = true;
    }
  }
  if (!placed) {
    player.spawnAt(startX, startZ);
    player.yaw = -0.55;
    player.pitch = -0.06;
  }
}

/* ------------------------------------------------------------------ *
 *  Hotbar + palette
 * ------------------------------------------------------------------ */

const defaultHotbar = [...DEFAULT_HOTBAR];
let hotbar = Array.isArray(resume?.hotbar) && resume.hotbar.length === 9
  ? resume.hotbar.map((id) => (BLOCKS[id] && BLOCKS[id].placeable ? id : B.DIRT))
  : defaultHotbar;
let slot = Math.min(8, Math.max(0, Number(resume?.slot) || 0));
const hotbarEl = $('#hotbar');
const itemNameEl = $('#itemName');
let itemNameTimer = 0;

function item() { return hotbar[slot]; }
function refreshHotbar() {
  buildHotbar(hotbarEl, hotbar, slot, (i) => selectSlot(i));
  updateHotbarSelection(hotbarEl, slot);
}
function flashItemName(ms = 1700) {
  itemNameEl.textContent = BLOCKS[item()].name;
  itemNameEl.classList.add('show');
  clearTimeout(itemNameTimer);
  itemNameTimer = setTimeout(() => itemNameEl.classList.remove('show'), ms);
}
function selectSlot(i) {
  slot = ((i % 9) + 9) % 9;
  updateHotbarSelection(hotbarEl, slot);
  flashItemName();
  sound.click();
  updateHeldItem();
}
refreshHotbar();

const paletteEl = $('#palette');
function openPalette() {
  $('#slotLabel').textContent = String(slot + 1);
  buildPalette(paletteEl, item(), (id) => {
    hotbar[slot] = id;
    refreshHotbar();
    selectSlot(slot);
    sound.click();
    closeInventory();
    toast(`${BLOCKS[id].name} → slot ${slot + 1}`);
  });
  openInventory();
}

/* ------------------------------------------------------------------ *
 *  Menus
 * ------------------------------------------------------------------ */

const menuEl = $('#menu');
const hudEl = $('#hud');
const pauseEl = $('#pause');
const inventoryEl = $('#inventory');
const loadingEl = $('#loading');
const mobileEl = $('#mobile');
const loadFill = $('#loadFill');
const loadText = $('#loadText');

$('#seedLbl').textContent = String(seed);

let playing = false;
let paused = false;
let invOpen = false;
let invFromPause = false;
let suppressPause = false;
let loading = true;
let startedAt = 0;
let preloadStart = 0;

function requestLock() {
  if (isTouch || !playing || paused || invOpen) return;
  const p = canvas.requestPointerLock?.();
  if (p && p.catch) p.catch(() => {});
}

function startPlaying() {
  if (loading) return;
  playing = true;
  paused = false;
  sound.unlock();
  menuEl.classList.remove('show');
  hudEl.classList.remove('hidden');
  if (isTouch) mobileEl.classList.remove('hidden');
  pauseEl.classList.remove('show');
  inventoryEl.classList.remove('show');
  invOpen = false;
  startedAt = performance.now();
  requestLock();
  flashItemName(2200);
  toast(isTouch ? 'Drag to look · joystick to move' : 'Click to capture the mouse', 2200);
}

function openPause() {
  if (!playing) return;
  paused = true;
  pauseEl.classList.add('show');
  mining = false;
  rightDown = false;
  saveGame();
}

function closePause() {
  paused = false;
  pauseEl.classList.remove('show');
  requestLock();
}

function openInventory() {
  if (!playing) return;
  const fromPause = paused;
  invFromPause = fromPause;
  if (fromPause) pauseEl.classList.remove('show');
  paused = false;
  invOpen = true;
  mining = false;
  rightDown = false;
  if (document.pointerLockElement) {
    suppressPause = true;
    document.exitPointerLock();
  }
  inventoryEl.classList.add('show');
}

function closeInventory() {
  inventoryEl.classList.remove('show');
  invOpen = false;
  if (invFromPause) {
    invFromPause = false;
    paused = true;
    pauseEl.classList.add('show');
  } else {
    requestLock();
  }
}

$('#play').addEventListener('click', startPlaying);
document.addEventListener('pointerlockchange', () => {
  if (!playing || invOpen) return;
  if (document.pointerLockElement === canvas) {
    pauseEl.classList.remove('show');
    paused = false;
  } else if (!suppressPause && !isTouch) {
    suppressPause = false;
    openPause();
  }
  suppressPause = false;
});

/* ------------------------------------------------------------------ *
 *  Day / night, underwater tint, held block
 * ------------------------------------------------------------------ */

if (resume?.time != null) sky.setTime(Number(resume.time) || 0.34);

const heldMat = new THREE.MeshBasicMaterial({
  map: atlas.texture, alphaTest: 0.35, transparent: false, depthTest: false, depthWrite: false,
});
const held = new THREE.Mesh(blockGeometry(item()), heldMat);
held.scale.setScalar(0.23);
held.position.set(0.55, -0.36, -0.78);
held.rotation.set(0.18, -0.55, 0.1);
held.renderOrder = 999;
held.frustumCulled = false;
camera.add(held);
let heldSwing = 0;
let heldPop = 0;
let heldId = item();

function updateHeldItem() {
  const id = item();
  if (id === heldId) return;
  heldId = id;
  held.geometry = blockGeometry(id);
  heldPop = 1;
}

/* ------------------------------------------------------------------ *
 *  Target highlight + particles
 * ------------------------------------------------------------------ */

const outline = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)),
  new THREE.LineBasicMaterial({ color: 0x0b0b0b, transparent: true, opacity: 0.55, depthWrite: false }),
);
outline.visible = false;
scene.add(outline);

const particleMat = new THREE.MeshLambertMaterial({ map: atlas.texture });
const particles = [];
const MAX_PARTICLES = 130;
let particleCursor = 0;

function spawnParticles(x, y, z, id, count = 12) {
  const geo = blockGeometry(id);
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(geo, particleMat);
    m.scale.setScalar(0.09 + Math.random() * 0.1);
    m.position.set(x + 0.2 + Math.random() * 0.6, y + 0.2 + Math.random() * 0.6, z + 0.2 + Math.random() * 0.6);
    scene.add(m);
    particles.push({
      mesh: m,
      vx: (Math.random() - 0.5) * 4.2,
      vy: 1.6 + Math.random() * 3.4,
      vz: (Math.random() - 0.5) * 4.2,
      life: 0.65 + Math.random() * 0.55,
      rot: (Math.random() - 0.5) * 8,
    });
  }
  while (particles.length > MAX_PARTICLES) {
    const p = particles.shift();
    scene.remove(p.mesh);
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      particles.splice(i, 1);
      continue;
    }
    p.vy -= 16 * dt;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    p.mesh.rotation.x += p.rot * dt;
    p.mesh.rotation.y += p.rot * 0.7 * dt;
    p.mesh.scale.setScalar(Math.max(0.02, p.mesh.scale.x * (1 - dt * 0.4)));
  }
}

/* ------------------------------------------------------------------ *
 *  Saving
 * ------------------------------------------------------------------ */

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      seed,
      edits: world.exportEdits(),
      player: { x: player.pos.x, y: player.pos.y, z: player.pos.z, yaw: player.yaw, pitch: player.pitch },
      hotbar,
      slot,
      time: sky.time,
      muted: sound.muted,
      savedAt: Date.now(),
    }));
    world.dirty = false;
    const note = $('#saveNote');
    if (note) note.textContent = 'Saved just now in this browser.';
  } catch (e) { /* storage full — ignore */ }
}
setInterval(() => { if (playing && world.dirty) saveGame(); }, 6000);
window.addEventListener('beforeunload', () => { if (playing) saveGame(); });

// expose for debugging / automated checks
window.__game = {
  player, world, view, camera, sky, renderer, scene, saveGame,
  get slot() { return slot; },
  get target() { return target; },
  get mining() { return { mining, breakProgress, breakKey }; },
  setMining(v) { mining = !!v; breakProgress = 0; },
  get hotbar() { return hotbar; },
  setTime: (t) => sky.setTime(t),
};

/* ------------------------------------------------------------------ *
 *  Initial load
 * ------------------------------------------------------------------ */

preloadStart = performance.now();
function preloadStep(now) {
  view.update(player.pos.x, player.pos.z, loading ? 34 : 8);
  const n = view.count();
  const target = isTouch ? 48 : 100;
  const pct = Math.min(97, (n / target) * 100);
  loadFill.style.width = `${pct.toFixed(1)}%`;
  loadText.textContent = n < 24 ? 'Carving mountains…' : n < target ? 'Growing forests…' : 'Placing clouds…';
  if (now - preloadStart > 26000 || n >= target) {
    finishLoading();
    return;
  }
  requestAnimationFrame(preloadStep);
}
function finishLoading() {
  loading = false;
  loadFill.style.width = '100%';
  loadText.textContent = 'World ready';
  setTimeout(() => {
    loadingEl.classList.remove('show');
    setTimeout(() => loadingEl.classList.add('hidden'), 350);
    menuEl.classList.add('show');
    $('#worldInfo').textContent = `${view.count()} chunks loaded`;
  }, 260);
}
requestAnimationFrame(preloadStep);
requestAnimationFrame(() => requestAnimationFrame(() => {
  // let the first frames paint behind the loading card
  sky.update(0.016, camera);
}));

/* ------------------------------------------------------------------ *
 *  Input
 * ------------------------------------------------------------------ */

const input = { forward: false, back: false, left: false, right: false, jump: false, sprint: false, down: false };
const keys = new Set();
const touchState = { mx: 0, my: 0, jump: false, down: false };
let mining = false;
let rightDown = false;
let breakProgress = 0;
let breakKey = '';
let breakCooldown = 0;
let placeCooldown = 0;
let target = null;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function look(dx, dy, sens = player.sensitivity) {
  player.yaw -= dx * sens;
  player.pitch = clamp(player.pitch - dy * sens, -1.54, 1.54);
}

function toggleFly() {
  player.flying = !player.flying;
  player.vel.y = 0;
  toast(player.flying ? 'Flight on — Space up · Shift down' : 'Flight off');
}

function toggleSound(showToast = true) {
  sound.unlock();
  sound.setMuted(!sound.muted);
  const label = sound.muted ? 'Sound: off' : 'Sound: on';
  const btn = $('#pause [data-act="sound"]');
  if (btn) btn.textContent = label;
  const top = document.querySelector('#topBtns [data-act="sound"]');
  if (top) top.textContent = sound.muted ? '✕' : '♪';
  if (showToast) toast(sound.muted ? 'Sound muted' : 'Sound on');
  saveGame();
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Tab') e.preventDefault();
  const k = e.code;
  const fresh = !keys.has(k);
  keys.add(k);
  if (!fresh || !playing) return;
  if (k === 'Escape') {
    if (invOpen) closeInventory();
    return;
  }
  if (paused) return;
  if (/^Digit[1-9]$/.test(k)) {
    selectSlot(Number(k.slice(5)) - 1);
  } else if (k === 'KeyE') {
    if (invOpen) closeInventory(); else openPalette();
  } else if (k === 'KeyF') {
    toggleFly();
  } else if (k === 'KeyT') {
    sky.setTime(sky.time + 0.083);
    toast(`Time → ${sky.clockString()}`);
  } else if (k === 'KeyM') {
    toggleSound();
  } else if (k === 'F3') {
    hudEl.classList.toggle('debug-off');
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => {
  keys.clear();
  mining = false;
  rightDown = false;
  touchState.jump = false;
});

window.addEventListener('mousemove', (e) => {
  if (!playing || paused || invOpen || isTouch) return;
  if (document.pointerLockElement === canvas) {
    look(e.movementX, e.movementY);
  } else if (e.buttons) {
    look(e.movementX || 0, e.movementY || 0);
  }
});

canvas.addEventListener('mousedown', (e) => {
  if (!playing || paused || invOpen) return;
  if (!isTouch && document.pointerLockElement !== canvas) {
    requestLock();
  }
  if (e.button === 0) { mining = true; breakProgress = 0; }
  if (e.button === 2) { rightDown = true; tryPlace(); }
  if (e.button === 1) { e.preventDefault(); pickBlock(); }
});
window.addEventListener('mouseup', (e) => {
  if (e.button === 0) mining = false;
  if (e.button === 2) rightDown = false;
});
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('wheel', (e) => {
  if (!playing || paused || invOpen) return;
  e.preventDefault();
  selectSlot(slot + (e.deltaY > 0 ? 1 : -1));
}, { passive: false });

/* touch look + joystick */
let lookPointer = null;
let lookX = 0, lookY = 0;
canvas.addEventListener('pointerdown', (e) => {
  if (!isTouch || !playing || paused || invOpen) return;
  if (lookPointer !== null) return;
  lookPointer = e.pointerId;
  lookX = e.clientX; lookY = e.clientY;
  try { canvas.setPointerCapture(e.pointerId); } catch {}
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== lookPointer) return;
  look(e.clientX - lookX, e.clientY - lookY, 0.0045);
  lookX = e.clientX; lookY = e.clientY;
});
const endLook = (e) => { if (e.pointerId === lookPointer) lookPointer = null; };
canvas.addEventListener('pointerup', endLook);
canvas.addEventListener('pointercancel', endLook);

const stickEl = $('#stick');
const knobEl = $('#stickKnob');
let stickPointer = null;
const STICK_R = 40;
function updateStick(e) {
  const r = stickEl.getBoundingClientRect();
  let dx = e.clientX - (r.left + r.width / 2);
  let dy = e.clientY - (r.top + r.height / 2);
  const d = Math.hypot(dx, dy);
  if (d > STICK_R) { dx = (dx / d) * STICK_R; dy = (dy / d) * STICK_R; }
  knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
  touchState.mx = dx / STICK_R;
  touchState.my = dy / STICK_R;
}
stickEl.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if (stickPointer !== null) return;
  stickPointer = e.pointerId;
  try { stickEl.setPointerCapture(e.pointerId); } catch {}
  updateStick(e);
});
stickEl.addEventListener('pointermove', (e) => {
  if (e.pointerId === stickPointer) { e.stopPropagation(); updateStick(e); }
});
function releaseStick(e) {
  if (e.pointerId !== stickPointer) return;
  stickPointer = null;
  knobEl.style.transform = '';
  touchState.mx = 0; touchState.my = 0;
}
stickEl.addEventListener('pointerup', releaseStick);
stickEl.addEventListener('pointercancel', releaseStick);

const jumpBtn = $('#mJump');
const setJump = (v) => (e) => { e.preventDefault(); e.stopPropagation(); touchState.jump = v; jumpBtn.classList.toggle('on', v); };
jumpBtn.addEventListener('pointerdown', setJump(true));
jumpBtn.addEventListener('pointerup', setJump(false));
jumpBtn.addEventListener('pointercancel', setJump(false));
jumpBtn.addEventListener('pointerleave', setJump(false));

const breakBtn = $('#mBreak');
breakBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault(); e.stopPropagation();
  mining = true; breakProgress = 0;
  breakBtn.classList.add('on');
  try { breakBtn.setPointerCapture(e.pointerId); } catch {}
});
const endBreak = (e) => { e.preventDefault(); mining = false; breakBtn.classList.remove('on'); };
breakBtn.addEventListener('pointerup', endBreak);
breakBtn.addEventListener('pointercancel', endBreak);
breakBtn.addEventListener('pointerleave', endBreak);

const placeBtn = $('#mPlace');
placeBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault(); e.stopPropagation();
  tryPlace();
});
$('#mFly').addEventListener('click', (e) => { e.stopPropagation(); if (playing) toggleFly(); });
$('#mBag').addEventListener('click', (e) => { e.stopPropagation(); if (playing) openPalette(); });

/* action buttons shared by menu + pause */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  if (act === 'sound') { toggleSound(); return; }
  if (act === 'menu') { if (playing) openPause(); return; }
  if (act === 'resume') { closePause(); return; }
  if (act === 'inventory') { if (playing) openPalette(); return; }
  if (act === 'closeInventory') { closeInventory(); return; }
  if (act === 'newworld') {
    localStorage.removeItem(SAVE_KEY);
    const ns = Math.floor(Math.random() * 1e8) + 1;
    location.href = `${location.pathname}?seed=${ns}`;
    return;
  }
  if (act === 'reset') {
    localStorage.removeItem(SAVE_KEY);
    toast('Edits cleared — reloading…', 900);
    setTimeout(() => { location.href = `${location.pathname}?seed=${seed}`; }, 600);
  }
});

/* ------------------------------------------------------------------ *
 *  Mining + building
 * ------------------------------------------------------------------ */

const _dir = new THREE.Vector3();

function currentTarget() {
  camera.getWorldDirection(_dir);
  return raycastVoxel(world, camera.position, _dir, 6.5);
}

function breakBlock(hit) {
  const def = BLOCKS[hit.id];
  if (!def || def.hardness === Infinity) return;
  world.setBlock(hit.x, hit.y, hit.z, 0);
  spawnParticles(hit.x, hit.y, hit.z, hit.id, def.plant ? 4 : 12);
  sound.breakBlock(def.sound);
  heldSwing = 0.0001;
  world.dirty = true;
  breakCooldown = 0.05;
}

function intersectsPlayer(bx, by, bz) {
  const hw = player.width / 2;
  return (player.pos.x + hw > bx && player.pos.x - hw < bx + 1 &&
    player.pos.y + player.height > by && player.pos.y < by + 1 &&
    player.pos.z + hw > bz && player.pos.z - hw < bz + 1);
}

function tryPlace() {
  if (!playing || paused || invOpen || placeCooldown > 0) return;
  if (!target) return;
  let bx = target.x, by = target.y, bz = target.z;
  if (!BLOCKS[target.id].plant) {
    bx += target.nx; by += target.ny; bz += target.nz;
  }
  if (by < 1 || by >= HEIGHT) return;
  const cur = world.getBlock(bx, by, bz);
  if (cur !== 0 && cur !== B.WATER && !BLOCKS[cur].plant) return;
  if (intersectsPlayer(bx, by, bz)) return;
  const id = item();
  if (!world.setBlock(bx, by, bz, id)) return;
  sound.placeBlock(BLOCKS[id].sound);
  heldSwing = 0.0001;
  placeCooldown = 0.2;
  if (id === B.POPPY || id === B.DANDELION || id === B.TALLGRASS) { /* no support check */ }
}

function pickBlock() {
  if (!target) return;
  const id = target.id;
  if (!BLOCKS[id] || !BLOCKS[id].placeable) return;
  hotbar[slot] = id;
  refreshHotbar();
  flashItemName();
  updateHeldItem();
  sound.click();
}

function updateInteraction(dt) {
  breakCooldown = Math.max(0, breakCooldown - dt);
  placeCooldown = Math.max(0, placeCooldown - dt);
  target = playing && !paused && !invOpen ? currentTarget() : null;

  if (target) {
    outline.visible = true;
    outline.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);
    const key = `${target.x},${target.y},${target.z}`;
    if (key !== breakKey) { breakKey = key; breakProgress = 0; }
    const nameEl = $('#hoverName');
    nameEl.textContent = BLOCKS[target.id].name;
    nameEl.classList.add('on');
  } else {
    outline.visible = false;
    breakKey = '';
    breakProgress = 0;
    $('#hoverName').classList.remove('on');
  }

  if (target && mining && breakCooldown <= 0) {
    const def = BLOCKS[target.id];
    if (def.hardness !== Infinity) {
      breakProgress += dt / Math.max(0.02, def.hardness);
      if (breakProgress >= 1) {
        breakBlock(target);
        breakProgress = 0;
        breakKey = '';
      }
    }
  }
  if (!mining) breakProgress = 0;
  setBreakRing($('#ring'), breakProgress);

  if (rightDown) tryPlace();
}

/* ------------------------------------------------------------------ *
 *  Animate held block
 * ------------------------------------------------------------------ */

function animateHeld(dt) {
  held.visible = playing && !invOpen && !paused;
  if (!held.visible) return;
  if (heldSwing > 0) {
    heldSwing += dt * 5.2;
    if (heldSwing >= 1) heldSwing = 0;
  }
  if (heldPop > 0) heldPop = Math.max(0, heldPop - dt * 6);
  const s = heldSwing > 0 ? Math.sin(heldSwing * Math.PI) : 0;
  const bob = player.bob * 0.7;
  const sway = Math.sin(player.walkTime * 0.5) * 0.018;
  held.scale.setScalar(0.23 * (1 + heldPop * 0.22));
  held.position.set(0.55 + s * 0.12 + sway, -0.36 + bob + s * 0.08, -0.78 + s * 0.16);
  held.rotation.set(0.18 + s * 0.6, -0.55, 0.1 - s * 0.85);
}

/* ------------------------------------------------------------------ *
 *  Main loop
 * ------------------------------------------------------------------ */

let last = performance.now();
let fpsAccum = 0, fpsFrames = 0, fpsShown = 60, hudAccum = 0;
const waterTint = $('#waterTint');
const clockTime = $('#clockTime');
const clockIcon = $('#clockIcon');

function readInput() {
  input.forward = keys.has('KeyW') || keys.has('ArrowUp') || touchState.my < -0.32;
  input.back = keys.has('KeyS') || keys.has('ArrowDown') || touchState.my > 0.32;
  input.left = keys.has('KeyA') || keys.has('ArrowLeft') || touchState.mx < -0.32;
  input.right = keys.has('KeyD') || keys.has('ArrowRight') || touchState.mx > 0.32;
  const shift = keys.has('ShiftLeft') || keys.has('ShiftRight');
  input.jump = keys.has('Space') || touchState.jump;
  input.sprint = shift && !player.flying;
  input.down = player.flying && (shift || touchState.down);
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;

  // time of day
  sky.setTime(sky.time + dt / 540);
  readInput();

  const active = playing && !paused && !invOpen;
  if (active) {
    player.update(dt, input);
    camera.position.copy(player.eyePosition());
    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
    if (!loading) view.update(player.pos.x, player.pos.z, isTouch ? 3 : 4);
  } else if (!playing) {
    const t = now * 0.00006;
    const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
    const sx = -fz, sz = fx;
    const back = 34, side = Math.sin(t * 2.1) * 5;
    const cx = player.pos.x - fx * back + sx * side;
    const cz = player.pos.z - fz * back + sz * side;
    const minY = Math.max(heightAtWorld(cx, cz) + 8, player.pos.y + 11);
    camera.position.set(cx, minY + Math.sin(t * 1.6) * 1.5, cz);
    camera.lookAt(player.pos.x + fx * 24, player.pos.y + 3, player.pos.z + fz * 24);
    if (!loading) view.update(player.pos.x, player.pos.z, 6);
  } else {
    camera.position.copy(player.eyePosition());
    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  }

  sky.update(dt, camera);
  scene.fog.color.copy(sky.fogColor);

  // underwater look
  const eye = camera.position;
  const under = world.getBlock(Math.floor(eye.x), Math.floor(eye.y), Math.floor(eye.z)) === B.WATER;
  waterTint.classList.toggle('on', active && under);
  if (under) {
    scene.fog.color.setHex(0x1e5a9e);
    scene.fog.near = 1.5;
    scene.fog.far = 26;
  } else {
    scene.fog.near = 58;
    scene.fog.far = 108;
  }

  updateParticles(dt);
  updateInteraction(dt);
  animateHeld(dt);

  // hud
  fpsAccum += dt; fpsFrames++;
  hudAccum += dt;
  if (fpsAccum > 0.45) {
    fpsShown = Math.round(fpsFrames / fpsAccum);
    fpsAccum = 0; fpsFrames = 0;
  }
  if (hudAccum > 0.12) {
    hudAccum = 0;
    $('#fps').textContent = String(fpsShown);
    const cc = view.count();
    $('#chunkCount').textContent = String(cc);
    $('#coords').textContent = `X ${Math.floor(player.pos.x)} · Y ${Math.floor(player.pos.y)} · Z ${Math.floor(player.pos.z)}`;
    clockTime.textContent = sky.clockString();
    const night = sky.day < 0.35;
    clockIcon.textContent = night ? '☾' : '☀';
    if (!loading) $('#worldInfo').textContent = `${cc} chunks loaded`;
  }

  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

/* ------------------------------------------------------------------ *
 *  Resize
 * ------------------------------------------------------------------ */

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 250));

// Preload uses the same clock; start the renderer near the spawn.
camera.position.set(player.pos.x + 24, player.pos.y + 14, player.pos.z + 24);
camera.lookAt(player.pos.x, player.pos.y + 5, player.pos.z);


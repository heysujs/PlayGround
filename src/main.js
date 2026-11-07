import * as THREE from '../vendor/three.module.js';
import {
  CORE_DEPTH, OIL_SECONDS, BASE_SPEED, START_CASH, SHOP_ITEMS, UPGRADE_DEFS,
  biomeFor, biomeIndex, speedMultiplier, yieldValue, tankMax,
  formatMoney, formatClock,
} from './config.js';
import { createSurface } from './world/surface.js';
import { createInteriors } from './world/interiors.js';
import { SoundEngine } from './audio.js';
import { GameUI } from './ui.js';

const canvas = document.querySelector('#game');

/* ------------------------------------------------------------------ */
/* Renderer / scene                                                    */
/* ------------------------------------------------------------------ */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
} catch (error) {
  document.body.innerHTML = '<div style="color:#fff;font:16px sans-serif;padding:40px">WebGL is required to play CORE//BOUND.</div>';
  throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1820);
scene.fog = new THREE.Fog(0xb97855, 62, 275);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 560);
camera.rotation.order = 'YXZ';

const surface = createSurface(scene);
const interiors = createInteriors(scene);

/* ------------------------------------------------------------------ */
/* State                                                              */
/* ------------------------------------------------------------------ */
const state = {
  started: false,
  ending: false,
  cash: START_CASH,
  oilInv: 1,
  rigOil: 0,
  depth: 0,
  drilling: false,
  lv: { motor: 0, refinery: 0, tank: 0, auto: 0 },
  zone: 'surface',
  totalEarned: 0,
  barrelsUsed: 0,
  elapsed: 0,
  drillSeconds: 0,
  biomeIdx: 0,
  muted: false,
  autoTimer: 0,
};

const player = {
  pos: new THREE.Vector3(0, 1.7, 13),
  yaw: 0,
  pitch: -0.02,
  bob: 0,
  bobPhase: 0,
  sprintTouch: false,
};

const keys = new Set();
const touchMove = { x: 0, y: 0 };
let currentInteraction = null;
let transitioning = false;
let dragging = false;
let lookTouchId = null;
let lookTouchX = 0;
let lookTouchY = 0;
let joyTouchId = null;
let joyCenter = { x: 0, y: 0 };

const audio = new SoundEngine();

/* ------------------------------------------------------------------ */
/* UI                                                                 */
/* ------------------------------------------------------------------ */
const ui = new GameUI({
  onStart: startGame,
  onClosePanel: closePanel,
  onBuy: buyItem,
  onUpgrade: purchaseUpgrade,
  onRestart: restartGame,
  onToggleSound: toggleSound,
  onTouchUse: interact,
  onSprintToggle: () => {
    player.sprintTouch = !player.sprintTouch;
    ui.el.touchSprint.classList.toggle('active', player.sprintTouch);
  },
});

/* ------------------------------------------------------------------ */
/* Game actions                                                       */
/* ------------------------------------------------------------------ */
function startGame() {
  if (state.started) return;
  state.started = true;
  state.ending = false;
  state.elapsed = 0;
  player.pos.set(0, 1.7, 13);
  player.yaw = 0;
  player.pitch = -0.02;
  ui.start();
  audio.init();
  requestLock();
  setTimeout(() => {
    ui.toast('One barrel in your pack. Load it into the top reservoir of BORE-01.', 'good');
  }, 650);
}

function requestLock() {
  if (ui.isTouch || ui.modalOpen || state.ending) return;
  try {
    const result = renderer.domElement.requestPointerLock?.();
    if (result?.catch) result.catch(() => {});
  } catch {
    /* Drag-to-look remains available. */
  }
}

function toggleSound() {
  state.muted = !state.muted;
  audio.setMuted(state.muted);
  ui.setMuted(state.muted);
  if (!state.muted) audio.click();
}

function computeObjective() {
  const remaining = Math.max(0, CORE_DEPTH - state.depth);
  const meta = `${formatMoney(state.cash)} · ${remaining.toFixed(0)} KM TO CORE`;
  if (state.ending) {
    return { title: 'CORE REACHED', copy: 'BORE-01 has breached the inner core.', meta };
  }
  if (state.drilling) {
    return {
      title: 'DRILL TO THE CORE',
      copy: 'Keep the reservoir wet. Reinvest bore credits at the lab to go faster.',
      meta,
    };
  }
  if (state.rigOil <= 0 && state.oilInv <= 0) {
    return {
      title: 'BUY OIL',
      copy: 'The reservoir is dry. Visit the OIL DEPOT east of the rig and buy a barrel.',
      meta,
    };
  }
  if (state.rigOil <= 0) {
    return {
      title: 'LOAD THE RIG',
      copy: 'Carry a barrel to BORE-01 and load it into the top reservoir.',
      meta,
    };
  }
  return {
    title: 'START THE DRILL',
    copy: 'Use the control console at the base of the rig to engage the drill.',
    meta,
  };
}

function toggleDrill() {
  if (state.drilling) {
    state.drilling = false;
    audio.setDrill(false);
    ui.toast('BORE-01 paused.');
    return;
  }
  if (state.rigOil <= 0) {
    audio.error();
    ui.toast('Reservoir dry. Load oil at the rig first.', 'warn');
    return;
  }
  state.drilling = true;
  state.autoTimer = 0;
  audio.setDrill(true);
  audio.click();
  ui.toast('BORE-01 engaged. Drilling credits incoming.', 'good');
}

function loadBarrel(auto = false) {
  const cap = tankMax(state) * OIL_SECONDS;
  if (state.oilInv <= 0) {
    audio.error();
    if (!auto) ui.toast('No barrels in your pack. Buy oil at the depot.', 'warn');
    return false;
  }
  if (state.rigOil >= cap - 0.5) {
    audio.error();
    if (!auto) ui.toast('Top reservoir is already full.', 'warn');
    return false;
  }
  state.oilInv -= 1;
  state.rigOil = Math.min(cap, state.rigOil + OIL_SECONDS);
  state.barrelsUsed += 1;
  surface.pulseOil();
  audio.pour();
  ui.toast(auto ? 'Auto-Loader primed a fresh barrel. +60 seconds.' : 'Barrel loaded into the top reservoir. +60 seconds.', 'good');
  if (auto) {
    state.drilling = true;
    audio.setDrill(true);
  }
  return true;
}

function openPanel(kind) {
  if (state.ending) return;
  audio.click();
  document.exitPointerLock?.();
  ui.showModal(kind, state);
}

function closePanel() {
  if (!ui.modalOpen) return;
  ui.hideModal();
  audio.click();
  requestLock();
}

function buyItem(id) {
  const item = SHOP_ITEMS.find((entry) => entry.id === id);
  if (!item) return;
  if (state.cash < item.cost) {
    audio.error();
    ui.toast('Not enough credits. Drill deeper and earn more.', 'warn');
    return;
  }
  state.cash -= item.cost;
  state.oilInv += item.barrels;
  audio.buy();
  ui.toast(`${item.name} purchased. +${item.barrels} barrel${item.barrels === 1 ? '' : 's'}.`, 'good');
  ui.showModal('shop', state);
}

function purchaseUpgrade(id) {
  const def = UPGRADE_DEFS.find((entry) => entry.id === id);
  if (!def) return;
  const level = state.lv[id] || 0;
  if (level >= def.max) return;
  const cost = def.costs[level];
  if (state.cash < cost) {
    audio.error();
    ui.toast('Not enough credits for that installation.', 'warn');
    return;
  }
  state.cash -= cost;
  state.lv[id] = level + 1;
  audio.upgrade();
  ui.toast(`${def.name} upgraded to level ${level + 1}.`, 'good');
  ui.showModal('lab', state);
}

function enterZone(zone) {
  if (transitioning) return;
  transitioning = true;
  audio.click();
  ui.fade(true);
  setTimeout(() => {
    state.zone = zone;
    const spawn = zone === 'lab' ? interiors.labSpawn : interiors.shopSpawn;
    player.pos.copy(spawn.position);
    player.yaw = spawn.yaw;
    player.pitch = spawn.pitch;
    player.bob = 0;
    ui.fade(false);
    transitioning = false;
    ui.toast(zone === 'lab' ? 'CORE LAB · research terminal online.' : 'OIL DEPOT · cashier ready.', 'good');
  }, 280);
}

function leaveZone() {
  if (transitioning) return;
  transitioning = true;
  const exit = state.zone === 'lab' ? interiors.labExit : interiors.shopExit;
  ui.fade(true);
  audio.click();
  setTimeout(() => {
    state.zone = 'surface';
    player.pos.copy(exit.position);
    player.yaw = exit.yaw;
    player.pitch = exit.pitch;
    player.bob = 0;
    ui.fade(false);
    transitioning = false;
    ui.toast('Back on the surface.');
  }, 280);
}

function reachCore() {
  if (state.ending) return;
  state.depth = CORE_DEPTH;
  state.drilling = false;
  state.ending = true;
  state.rigOil = Math.max(0, state.rigOil);
  audio.setDrill(false);
  audio.victory();
  document.exitPointerLock?.();
  ui.setInteract(null);
  ui.toast('CORE BREACH · 6,371 KM. The drill is through.', 'good');
  setTimeout(() => {
    ui.showVictory({
      time: formatClock(state.elapsed),
      earned: formatMoney(state.totalEarned),
      barrels: String(state.barrelsUsed),
      upgrades: String(Object.values(state.lv).reduce((a, b) => a + b, 0)),
    });
  }, 1100);
}

function restartGame() {
  state.ending = false;
  state.started = true;
  state.cash = START_CASH;
  state.oilInv = 1;
  state.rigOil = 0;
  state.depth = 0;
  state.drilling = false;
  state.lv = { motor: 0, refinery: 0, tank: 0, auto: 0 };
  state.zone = 'surface';
  state.totalEarned = 0;
  state.barrelsUsed = 0;
  state.elapsed = 0;
  state.drillSeconds = 0;
  state.biomeIdx = 0;
  state.autoTimer = 0;
  player.pos.set(0, 1.7, 13);
  player.yaw = 0;
  player.pitch = -0.02;
  player.bob = 0;
  ui.hideVictory();
  ui.setMuted(state.muted);
  surface.setDepth(0, biomeFor(0));
  audio.setDrill(false);
  requestLock();
  ui.toast('New expedition. One barrel in your pack.', 'good');
}

function interact() {
  if (!state.started || state.ending || ui.modalOpen || transitioning) return;
  if (!currentInteraction) return;
  currentInteraction.action();
}

/* ------------------------------------------------------------------ */
/* Input                                                              */
/* ------------------------------------------------------------------ */
window.addEventListener('keydown', (event) => {
  const code = event.code;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(code)) {
    keys.add(code);
    if (code.startsWith('Arrow')) event.preventDefault();
  }
  if (code === 'KeyE') {
    event.preventDefault();
    interact();
  }
  if (code === 'Escape') {
    if (ui.modalOpen) {
      closePanel();
    }
  }
  if (code === 'KeyM') toggleSound();
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
});

window.addEventListener('blur', () => {
  keys.clear();
  player.sprintTouch = false;
});

renderer.domElement.addEventListener('mousedown', (event) => {
  if (event.button !== 0) return;
  if (!state.started || ui.modalOpen || state.ending) return;
  if (document.pointerLockElement !== renderer.domElement) {
    dragging = true;
    requestLock();
  }
});
window.addEventListener('mouseup', () => { dragging = false; });

window.addEventListener('mousemove', (event) => {
  if (!state.started || ui.modalOpen || state.ending) return;
  if (document.pointerLockElement !== renderer.domElement && !dragging) return;
  player.yaw -= event.movementX * 0.00215;
  player.pitch -= event.movementY * 0.00215;
  player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch));
});

document.addEventListener('pointerlockchange', () => {
  ui.setPointerLocked(document.pointerLockElement === renderer.domElement);
});
document.addEventListener('pointerlockerror', () => {
  ui.setPointerLocked(false);
});

// Touch look.
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (!ui.isTouch || !state.started || ui.modalOpen || state.ending) return;
  if (lookTouchId !== null) return;
  lookTouchId = event.pointerId;
  lookTouchX = event.clientX;
  lookTouchY = event.clientY;
  renderer.domElement.setPointerCapture?.(event.pointerId);
});
window.addEventListener('pointermove', (event) => {
  if (event.pointerId !== lookTouchId) return;
  const dx = event.clientX - lookTouchX;
  const dy = event.clientY - lookTouchY;
  lookTouchX = event.clientX;
  lookTouchY = event.clientY;
  player.yaw -= dx * 0.0042;
  player.pitch -= dy * 0.0042;
  player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch));
});
window.addEventListener('pointerup', (event) => {
  if (event.pointerId === lookTouchId) lookTouchId = null;
  if (event.pointerId === joyTouchId) resetJoystick();
});

// Virtual joystick.
function updateJoystick(event) {
  const max = 42;
  let dx = event.clientX - joyCenter.x;
  let dy = event.clientY - joyCenter.y;
  const len = Math.hypot(dx, dy);
  if (len > max) {
    dx = (dx / len) * max;
    dy = (dy / len) * max;
  }
  touchMove.x = dx / max;
  touchMove.y = -dy / max;
  ui.el.stick.style.transform = `translate(${dx}px, ${dy}px)`;
}
function resetJoystick() {
  joyTouchId = null;
  touchMove.x = 0;
  touchMove.y = 0;
  ui.el.stick.style.transform = 'translate(0px, 0px)';
}
ui.el.joystick.addEventListener('pointerdown', (event) => {
  if (!ui.isTouch) return;
  event.preventDefault();
  const rect = ui.el.joystick.getBoundingClientRect();
  joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  joyTouchId = event.pointerId;
  ui.el.joystick.setPointerCapture?.(event.pointerId);
  updateJoystick(event);
});
ui.el.joystick.addEventListener('pointermove', (event) => {
  if (event.pointerId !== joyTouchId) return;
  event.preventDefault();
  updateJoystick(event);
});

/* ------------------------------------------------------------------ */
/* Movement / collision                                               */
/* ------------------------------------------------------------------ */
function colliders() {
  if (state.zone === 'lab') return interiors.labColliders;
  if (state.zone === 'shop') return interiors.shopColliders;
  return surface.colliders;
}

function collides(x, z) {
  const radius = 0.38;
  if (state.zone === 'surface') {
    if (x < -39.5 || x > 39.5 || z < -46 || z > 28.5) return true;
    const hx = x - surface.hole.x;
    const hz = z - surface.hole.z;
    if (Math.hypot(hx, hz) < surface.hole.radius + radius) return true;
  }
  for (const c of colliders()) {
    if (x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ) {
      return true;
    }
  }
  return false;
}

function updatePlayer(dt) {
  if (!state.started || state.ending || ui.modalOpen || transitioning) {
    player.bob *= 0.9;
    return;
  }
  let forwardInput = 0;
  let rightInput = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) forwardInput += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) forwardInput -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) rightInput += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) rightInput -= 1;
  forwardInput += touchMove.y;
  rightInput += touchMove.x;

  const length = Math.hypot(forwardInput, rightInput);
  if (length > 1) {
    forwardInput /= length;
    rightInput /= length;
  }

  const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') || player.sprintTouch;
  const speed = sprint ? 7.4 : 4.6;
  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const move = new THREE.Vector3()
    .addScaledVector(forward, forwardInput)
    .addScaledVector(right, rightInput)
    .multiplyScalar(speed * dt);

  if (Math.abs(move.x) > 0.0001) {
    const nx = player.pos.x + move.x;
    if (!collides(nx, player.pos.z)) player.pos.x = nx;
  }
  if (Math.abs(move.z) > 0.0001) {
    const nz = player.pos.z + move.z;
    if (!collides(player.pos.x, nz)) player.pos.z = nz;
  }

  const moving = Math.abs(forwardInput) + Math.abs(rightInput) > 0.05;
  if (moving) {
    player.bobPhase += dt * (sprint ? 12.5 : 8.5);
    player.bob += (Math.sin(player.bobPhase) * 0.035 - player.bob) * Math.min(1, dt * 12);
  } else {
    player.bob += (0 - player.bob) * Math.min(1, dt * 9);
  }
}

/* ------------------------------------------------------------------ */
/* Drilling                                                           */
/* ------------------------------------------------------------------ */
function updateDrill(dt) {
  if (!state.started || state.ending || ui.modalOpen) return;

  if (state.drilling) {
    if (state.rigOil <= 0) {
      state.drilling = false;
      audio.setDrill(false);
      return;
    }
    const used = Math.min(dt, state.rigOil);
    state.rigOil = Math.max(0, state.rigOil - used);
    state.drillSeconds += dt;

    const speed = BASE_SPEED * speedMultiplier(state);
    const delta = Math.min(speed * dt, CORE_DEPTH - state.depth);
    state.depth += delta;
    const earned = delta * yieldValue(state);
    state.cash += earned;
    state.totalEarned += earned;

    const newBiome = biomeIndex(state.depth);
    if (newBiome !== state.biomeIdx) {
      state.biomeIdx = newBiome;
      const biome = biomeFor(state.depth);
      audio.milestone();
      ui.toast(`ENTERING ${biome.id} · ${biome.name}`, 'good');
    }

    if (state.depth >= CORE_DEPTH - 0.001) {
      reachCore();
      return;
    }

    if (state.rigOil <= 0.001) {
      state.rigOil = 0;
      state.drilling = false;
      state.autoTimer = 0;
      audio.setDrill(false);
      ui.toast('Reservoir dry. BORE-01 has stopped.', 'warn');
    }
  }

  // Auto-loader quality-of-life upgrade.
  if (state.lv.auto > 0 && !state.drilling && state.rigOil <= 0 && state.oilInv > 0 && !state.ending) {
    state.autoTimer += dt;
    if (state.autoTimer > 1.4) {
      state.autoTimer = 0;
      if (loadBarrel(true)) {
        state.drilling = true;
        audio.setDrill(true);
      }
    }
  } else if (state.drilling) {
    state.autoTimer = 0;
  }
}

/* ------------------------------------------------------------------ */
/* Interaction                                                        */
/* ------------------------------------------------------------------ */
function interactionList() {
  if (state.zone === 'lab') {
    return [
      {
        id: 'lab-terminal',
        pos: interiors.labInteractables.terminal,
        radius: 3.1,
        label: 'Access research terminal',
        action: () => openPanel('lab'),
      },
      {
        id: 'lab-exit',
        pos: interiors.labInteractables.exit,
        radius: 3.0,
        label: 'Exit to surface',
        action: leaveZone,
      },
    ];
  }
  if (state.zone === 'shop') {
    return [
      {
        id: 'shop-counter',
        pos: interiors.shopInteractables.counter,
        radius: 3.4,
        label: 'Open oil depot shop',
        action: () => openPanel('shop'),
      },
      {
        id: 'shop-exit',
        pos: interiors.shopInteractables.exit,
        radius: 3.0,
        label: 'Exit to surface',
        action: leaveZone,
      },
    ];
  }

  const cap = tankMax(state) * OIL_SECONDS;
  const oilFull = state.rigOil >= cap - 0.5;
  return [
    {
      id: 'rig-oil',
      pos: surface.interactables.oil,
      radius: 4.2,
      label: oilFull ? 'Top reservoir full' : state.oilInv > 0 ? 'Load oil into top reservoir' : 'No barrels · buy oil at depot',
      action: () => loadBarrel(false),
    },
    {
      id: 'rig-console',
      pos: surface.interactables.console,
      radius: 3.3,
      label: state.drilling ? 'Stop the drill' : state.rigOil > 0 ? 'Start the drill' : 'Reservoir dry · load oil first',
      action: toggleDrill,
    },
    {
      id: 'lab-door',
      pos: surface.interactables.labDoor,
      radius: 3.2,
      label: 'Enter CORE LAB',
      action: () => enterZone('lab'),
    },
    {
      id: 'shop-door',
      pos: surface.interactables.shopDoor,
      radius: 3.2,
      label: 'Enter OIL DEPOT',
      action: () => enterZone('shop'),
    },
  ];
}

function updateInteraction() {
  if (!state.started || state.ending || ui.modalOpen || transitioning) {
    currentInteraction = null;
    ui.setInteract(null);
    return;
  }
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  let best = null;
  let bestScore = -Infinity;
  for (const item of interactionList()) {
    const to = item.pos.clone().sub(camera.position);
    const distance = to.length();
    if (distance > item.radius) continue;
    const dot = forward.dot(to.normalize());
    if (dot < 0.08) continue;
    const score = dot * 2 - distance / item.radius;
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  currentInteraction = best;
  ui.setInteract(best ? best.label : null);
}

/* ------------------------------------------------------------------ */
/* Camera / intro                                                     */
/* ------------------------------------------------------------------ */
function updateCamera(time) {
  if (!state.started) {
    camera.position.set(0, 1.9 + Math.sin(time * 0.22) * 0.025, 13.8);
    camera.rotation.set(-0.015 + Math.sin(time * 0.17) * 0.005, Math.sin(time * 0.1) * 0.012, 0, 'YXZ');
    return;
  }
  camera.position.set(player.pos.x, 1.7 + player.bob, player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
}

/* ------------------------------------------------------------------ */
/* Main loop                                                          */
/* ------------------------------------------------------------------ */
let lastTime = performance.now();
let hudAccumulator = 0;
let mapAccumulator = 0;
let lastDepthForWorld = -1;

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.1, Math.max(0.001, (now - lastTime) / 1000));
  lastTime = now;
  const time = now / 1000;

  if (state.started && !state.ending && !ui.modalOpen) {
    state.elapsed += dt;
    updatePlayer(dt);
    updateDrill(dt);
    updateInteraction();
  } else if (!state.started) {
    updatePlayer(dt);
  }

  updateCamera(time);
  surface.setDepth(state.depth, biomeFor(state.depth));
  surface.update(dt, time, state);
  interiors.update(dt, time);

  hudAccumulator += dt;
  if (hudAccumulator > 0.08) {
    hudAccumulator = 0;
    const biome = biomeFor(state.depth);
    ui.updateHUD(state, {
      biome,
      objective: computeObjective(),
      rate: state.drilling ? BASE_SPEED * speedMultiplier(state) * yieldValue(state) : 0,
      tankCapacity: tankMax(state),
      speed: BASE_SPEED * speedMultiplier(state),
      oilSeconds: state.rigOil,
      totalOilSeconds: tankMax(state) * OIL_SECONDS,
    });
    ui.updateWaypoints(camera, state.zone, surface.waypoints);
  }

  mapAccumulator += dt;
  if (mapAccumulator > 0.12) {
    mapAccumulator = 0;
    ui.drawMinimap(state, state.zone, player.pos, player.yaw);
  }

  renderer.render(scene, camera);
}

/* ------------------------------------------------------------------ */
/* Resize                                                             */
/* ------------------------------------------------------------------ */
function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);

// Small quality-of-life: pause the drill while the tab is hidden.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    keys.clear();
    player.sprintTouch = false;
    ui.el.touchSprint.classList.remove('active');
  }
});

/* ------------------------------------------------------------------ */
/* Debug hook (used for visual QA; harmless in normal play)           */
/* ------------------------------------------------------------------ */
window.__CORE__ = {
  state,
  player,
  ui,
  start: startGame,
  addCash: (amount) => { state.cash += amount; },
  setDepth: (depth) => { state.depth = Math.max(0, Math.min(CORE_DEPTH, depth)); },
  teleport: (x, z, yaw = 0) => { player.pos.set(x, 1.7, z); player.yaw = yaw; },
  enterZone,
  leaveZone,
  openPanel,
  loadBarrel,
  toggleDrill,
  reachCore,
};

surface.setDepth(0, biomeFor(0));
ui.setMuted(false);
ui.drawMinimap(state, state.zone, player.pos, player.yaw);
requestAnimationFrame(animate);

import * as THREE from '../../vendor/three.module.js';
import { concreteTexture, rustTexture, makeSignTexture, makeScreenTexture, makeGlowTexture } from './textures.js';
import { box, cylinder, addCollider, makeLabel, lcg } from './helpers.js';

export function createInteriors(scene) {
  const group = new THREE.Group();
  group.name = 'interiors';
  scene.add(group);
  const random = lcg(1919);
  const glowTex = makeGlowTexture();
  const concreteTex = concreteTexture();
  const rustTex = rustTexture();

  const M = {
    floorLab: new THREE.MeshStandardMaterial({ map: concreteTex, color: 0x727d82, roughness: 0.32, metalness: 0.45 }),
    floorShop: new THREE.MeshStandardMaterial({ map: concreteTex, color: 0x6f6254, roughness: 0.78 }),
    wallLab: new THREE.MeshStandardMaterial({ color: 0x182b35, roughness: 0.6, metalness: 0.18 }),
    wallLabLight: new THREE.MeshStandardMaterial({ color: 0x304852, roughness: 0.5, metalness: 0.15 }),
    cyan: new THREE.MeshStandardMaterial({ color: 0x46cfe0, emissive: 0x1c93a3, emissiveIntensity: 1.6, roughness: 0.3 }),
    cyanSoft: new THREE.MeshStandardMaterial({ color: 0x183b45, emissive: 0x1f9aac, emissiveIntensity: 0.7, roughness: 0.4 }),
    white: new THREE.MeshStandardMaterial({ color: 0xc8d2d0, roughness: 0.5 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x59686f, metalness: 0.7, roughness: 0.35 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x10171b, roughness: 0.75 }),
    black: new THREE.MeshStandardMaterial({ color: 0x090d0f, roughness: 0.9 }),
    shopWall: new THREE.MeshStandardMaterial({ map: rustTex, color: 0x7e4b34, roughness: 0.86, metalness: 0.18 }),
    shopTrim: new THREE.MeshStandardMaterial({ color: 0x3b2a22, roughness: 0.8 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x5e4830, roughness: 0.9 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xd9a63a, emissive: 0x5a3608, emissiveIntensity: 0.6, roughness: 0.5, metalness: 0.2 }),
    barrel: new THREE.MeshStandardMaterial({ color: 0xbd6b33, roughness: 0.55, metalness: 0.3 }),
    barrelYellow: new THREE.MeshStandardMaterial({ color: 0xcaa02e, roughness: 0.52, metalness: 0.25 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x12333c, emissive: 0x0a2229, emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.15 }),
  };

  /* ================================================================
   * LAB INTERIOR
   * ================================================================ */
  const lab = new THREE.Group();
  lab.position.set(200, 0, 0);
  group.add(lab);
  const labColliders = [];

  box(lab, M.floorLab, 14, 0.26, 12, 0, 0.0, 0, false);
  box(lab, M.dark, 14.3, 0.18, 12.3, 0, 3.65, 0, false);
  // Walls.
  box(lab, M.wallLab, 14.2, 3.7, 0.28, 0, 1.8, -6.0);
  box(lab, M.wallLab, 14.2, 3.7, 0.28, 0, 1.8, 6.0);
  box(lab, M.wallLab, 0.28, 3.7, 12.2, -7.0, 1.8, 0);
  box(lab, M.wallLab, 0.28, 3.7, 12.2, 7.0, 1.8, 0);
  addCollider(labColliders, 193, 207, -6.2, -5.7);
  addCollider(labColliders, 193, 207, 5.7, 6.2);
  addCollider(labColliders, 192.7, 193.3, -6.2, 6.2);
  addCollider(labColliders, 206.7, 207.3, -6.2, 6.2);
  // Wall trim.
  for (const z of [-5.8, 5.8]) {
    box(lab, M.cyan, 13.4, 0.07, 0.06, 0, 3.36, z);
    box(lab, M.cyan, 13.4, 0.07, 0.06, 0, 0.25, z);
  }
  for (const x of [-6.82, 6.82]) {
    box(lab, M.cyan, 0.06, 0.07, 11.3, x, 3.36, 0);
    box(lab, M.cyan, 0.06, 0.07, 11.3, x, 0.25, 0);
  }
  // Ceiling light strips.
  for (const z of [-3.3, 0, 3.3]) {
    box(lab, M.cyan, 9.5, 0.06, 0.16, 0, 3.52, z, false);
  }
  // Floor line detail.
  for (const x of [-3.5, 0, 3.5]) {
    box(lab, M.cyanSoft, 0.035, 0.012, 10.8, x, 0.14, 0, false);
  }

  // Back wall display.
  const displayTex = makeScreenTexture('MANTLE THERMAL MODEL', [
    'DEPTH  0.0 KM  ·  TEMP  21 C',
    'CORE GRADIENT  0.027 K/M',
    'BORE-01  STATUS  NOMINAL',
    'THERMAL SHIELD  STANDBY',
  ], '#72e7ff');
  const displayMat = new THREE.MeshBasicMaterial({ map: displayTex, toneMapped: false });
  const display = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.1), displayMat);
  display.position.set(0.8, 2.15, -5.83);
  lab.add(display);
  box(lab, M.steel, 6.5, 3.4, 0.14, 0.8, 2.15, -5.9);
  display.position.z = -5.81;
  // Side data panel.
  const sideTex = makeScreenTexture('GEOPHYSICS', [
    'MANTLE  ·  2,890 KM',
    'OUTER CORE  ·  5,150 KM',
    'INNER CORE  ·  6,371 KM',
    'DRILL PAYLOAD  NOMINAL',
  ], '#ffb347');
  const sideDisplay = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.75), new THREE.MeshBasicMaterial({ map: sideTex, toneMapped: false }));
  sideDisplay.position.set(6.82, 2.1, -2.6);
  sideDisplay.rotation.y = -Math.PI / 2;
  lab.add(sideDisplay);

  // Hologram table.
  cylinder(lab, M.dark, 1.55, 1.8, 0.25, 24, 0.8, 0.2, 1.1);
  cylinder(lab, M.steel, 1.35, 1.5, 0.72, 24, 0.8, 0.63, 1.1);
  const tableTop = cylinder(lab, M.glass, 1.6, 1.6, 0.13, 32, 0.8, 1.03, 1.1);
  tableTop.material = M.glass.clone();
  const tableRing = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.045, 8, 48), M.cyan);
  tableRing.rotation.x = Math.PI / 2;
  tableRing.position.set(0.8, 1.1, 1.1);
  lab.add(tableRing);
  addCollider(labColliders, 198.9, 202.7, 0.2, 3.1);

  // Holographic Earth.
  const holo = new THREE.Group();
  holo.position.set(0.8, 2.35, 1.1);
  lab.add(holo);
  const earthWire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.25, 2),
    new THREE.MeshBasicMaterial({ color: 0x72e7ff, wireframe: true, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending })
  );
  holo.add(earthWire);
  const earthShell = new THREE.Mesh(
    new THREE.SphereGeometry(1.22, 32, 20),
    new THREE.MeshBasicMaterial({ color: 0x1d8fa2, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false })
  );
  holo.add(earthShell);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffc46a }));
  holo.add(core);
  const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff8a36, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  coreGlow.scale.set(2.4, 2.4, 1);
  holo.add(coreGlow);
  for (const [rx, rz] of [[0.5, 0.2], [1.2, -0.7], [-0.8, 0.9]]) {
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.008, 4, 64), new THREE.MeshBasicMaterial({ color: 0x72e7ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending }));
    orbit.rotation.set(rx, rz, 0);
    holo.add(orbit);
  }
  const holoLight = new THREE.PointLight(0x62dff2, 3.2, 12, 2);
  holoLight.position.set(0.8, 2.2, 1.1);
  lab.add(holoLight);

  // Upgrade terminal.
  const term = new THREE.Group();
  term.position.set(-4.6, 0, -4.95);
  lab.add(term);
  box(term, M.dark, 2.4, 1.0, 0.9, 0, 0.5, 0);
  box(term, M.steel, 2.5, 0.1, 1.0, 0, 1.05, 0);
  const termScreen = box(term, M.glass, 2.0, 1.15, 0.1, 0, 1.58, -0.05);
  termScreen.rotation.x = -0.12;
  const termTex = makeScreenTexture('RESEARCH TERMINAL', [
    'DRILL  MOTOR  ·  LV 0',
    'ORE  REFINERY  ·  LV 0',
    'RESERVOIR  RINGS  ·  LV 0',
    'PRESS  E  TO  ACCESS',
  ], '#72e7ff');
  const termFace = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 1.0), new THREE.MeshBasicMaterial({ map: termTex, toneMapped: false }));
  termFace.position.set(0, 1.6, 0.015);
  termFace.rotation.x = -0.12;
  term.add(termFace);
  addCollider(labColliders, 195.1, 197.7, -5.5, -4.4);
  // Small stools.
  for (const x of [-1.4, 3.1]) {
    cylinder(lab, M.dark, 0.3, 0.36, 0.08, 12, x, 0.48, 0.8);
    cylinder(lab, M.steel, 0.06, 0.06, 0.44, 8, x, 0.24, 0.8);
  }

  // Exit door.
  box(lab, M.dark, 2.1, 2.9, 0.2, 0, 1.5, 5.82);
  box(lab, M.cyan, 0.11, 2.5, 0.1, 0, 1.4, 5.7);
  const exitSign = makeLabel(makeSignTexture('EXIT', 'SITE 07 / SURFACE', '#9ff5c0'), 2.2, 0.73, 0, 3.2, 5.68);
  lab.add(exitSign);
  // Lab lighting.
  const labLightA = new THREE.PointLight(0xc8f4ff, 3.8, 18, 2);
  labLightA.position.set(0, 3.2, 2.5);
  lab.add(labLightA);
  const labLightB = new THREE.PointLight(0x5ecbdc, 2.8, 16, 2);
  labLightB.position.set(-4, 2.8, -2.5);
  lab.add(labLightB);

  /* ================================================================
   * SHOP INTERIOR
   * ================================================================ */
  const shop = new THREE.Group();
  shop.position.set(-200, 0, 0);
  group.add(shop);
  const shopColliders = [];

  box(shop, M.floorShop, 13, 0.24, 11, 0, 0, 0, false);
  box(shop, M.dark, 13.3, 0.2, 11.3, 0, 3.5, 0, false);
  // Walls.
  box(shop, M.shopWall, 13.2, 3.55, 0.3, 0, 1.75, -5.5);
  box(shop, M.shopWall, 13.2, 3.55, 0.3, 0, 1.75, 5.5);
  box(shop, M.shopWall, 0.3, 3.55, 11.2, -6.5, 1.75, 0);
  box(shop, M.shopWall, 0.3, 3.55, 11.2, 6.5, 1.75, 0);
  addCollider(shopColliders, -207, -193, -5.7, -5.2);
  addCollider(shopColliders, -207, -193, 5.2, 5.7);
  addCollider(shopColliders, -206.8, -206.2, -5.7, 5.7);
  addCollider(shopColliders, -193.8, -193.2, -5.7, 5.7);
  // Corrugated trim.
  for (let i = -5; i <= 5; i++) {
    box(shop, M.shopTrim, 0.12, 3.3, 0.08, i * 1.16, 1.7, -5.31);
    box(shop, M.shopTrim, 0.12, 3.3, 0.08, i * 1.16, 1.7, 5.31);
  }
  // Warm ceiling lamps.
  for (const [x, z] of [[-3, -2], [3, -2], [0, 2.5]]) {
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.35, 12, 1, true), M.steel);
    shade.position.set(x, 3.15, z);
    shop.add(shade);
    box(shop, M.amber, 0.35, 0.03, 0.35, x, 3.0, z, false);
    const lamp = new THREE.PointLight(0xffb45c, 2.0, 10, 2);
    lamp.position.set(x, 2.9, z);
    shop.add(lamp);
  }

  // Counter.
  box(shop, M.wood, 5.8, 1.15, 1.1, 0, 0.58, -2.55);
  box(shop, M.shopTrim, 6.0, 0.12, 1.25, 0, 1.17, -2.55);
  box(shop, M.steel, 5.7, 0.16, 0.95, 0, 1.28, -2.55);
  addCollider(shopColliders, -203.1, -196.9, -3.2, -1.9);
  // Register.
  box(shop, M.dark, 0.8, 0.45, 0.5, 1.7, 1.55, -2.55);
  const registerScreen = box(shop, M.glass, 0.68, 0.4, 0.06, 1.7, 1.72, -2.27);
  registerScreen.rotation.x = -0.2;
  // Cashier robot.
  const bot = new THREE.Group();
  bot.position.set(0, 0, -4.1);
  shop.add(bot);
  cylinder(bot, M.steel, 0.4, 0.55, 0.9, 12, 0, 0.45, 0);
  cylinder(bot, M.dark, 0.32, 0.4, 0.35, 12, 0, 1.05, 0);
  const head = box(bot, M.steel, 0.62, 0.5, 0.55, 0, 1.42, 0);
  box(bot, M.amber, 0.44, 0.15, 0.03, 0, 1.47, 0.29);
  box(bot, M.dark, 0.1, 0.7, 0.1, -0.5, 0.7, 0);
  box(bot, M.dark, 0.1, 0.7, 0.1, 0.5, 0.7, 0);
  // Shop sign.
  const shopInteriorSign = makeLabel(makeSignTexture('OIL DEPOT', 'CASHIER / SUPPLIES', '#ffb347'), 4.2, 1.4, 0, 3.0, -5.28);
  shop.add(shopInteriorSign);

  // Shelves and barrels.
  function barrel(x, y, z, mat) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 14), mat);
    b.position.set(x, y + 0.45, z);
    b.castShadow = true;
    shop.add(b);
    for (const ry of [0.18, 0.72]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.355, 0.03, 6, 16), M.shopTrim);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, y + ry, z);
      shop.add(ring);
    }
  }
  // Side shelves.
  for (const side of [-1, 1]) {
    box(shop, M.wood, 1.4, 0.18, 8.4, side * 5.45, 0.55, -0.2);
    box(shop, M.wood, 1.4, 0.18, 8.4, side * 5.45, 1.65, -0.2);
    box(shop, M.wood, 1.4, 0.18, 8.4, side * 5.45, 2.75, -0.2);
    for (let i = 0; i < 7; i++) {
      barrel(side * 5.45, 0.64, -3.8 + i * 1.1, i % 2 ? M.barrel : M.barrelYellow);
      if (i % 2 === 0) barrel(side * 5.45, 1.74, -3.8 + i * 1.1, M.barrelYellow);
    }
    addCollider(shopColliders,
      side === -1 ? -206.2 : -195.3,
      side === -1 ? -204.7 : -193.8,
      -4.5, 4.1);
  }
  // Barrels near door.
  for (let i = 0; i < 4; i++) {
    barrel(-4.3 + i * 0.9, 0.12, 4.0, i % 2 ? M.barrelYellow : M.barrel);
  }
  addCollider(shopColliders, -204.8, -201.2, 3.4, 4.7);

  // Exit door.
  box(shop, M.shopTrim, 2.2, 2.9, 0.22, 0, 1.48, 5.34);
  box(shop, M.amber, 0.11, 2.5, 0.1, 0, 1.4, 5.2);
  const shopExitSign = makeLabel(makeSignTexture('EXIT', 'SITE 07 / SURFACE', '#9ff5c0'), 2.2, 0.73, 0, 3.16, 5.18);
  shop.add(shopExitSign);

  // Dynamic update.
  function update(dt, time) {
    holo.rotation.y += dt * 0.25;
    earthWire.rotation.y -= dt * 0.13;
    coreGlow.material.opacity = 0.65 + Math.sin(time * 2.6) * 0.15;
    tableRing.rotation.z += dt * 0.2;
    core.scale.setScalar(1 + Math.sin(time * 3.2) * 0.06);
  }

  return {
    group,
    labColliders,
    shopColliders,
    labInteractables: {
      terminal: new THREE.Vector3(195.4, 1.35, -4.15),
      exit: new THREE.Vector3(200, 1.6, 5.25),
    },
    shopInteractables: {
      counter: new THREE.Vector3(-200, 1.4, -1.9),
      exit: new THREE.Vector3(-200, 1.6, 5.2),
    },
    labSpawn: { position: new THREE.Vector3(200, 1.7, 4.55), yaw: 0, pitch: -0.04 },
    shopSpawn: { position: new THREE.Vector3(-200, 1.7, 4.55), yaw: 0, pitch: -0.04 },
    labExit: { position: new THREE.Vector3(-19, 1.7, -1.7), yaw: Math.PI, pitch: -0.02 },
    shopExit: { position: new THREE.Vector3(19, 1.7, -1.7), yaw: Math.PI, pitch: -0.02 },
    update,
  };
}

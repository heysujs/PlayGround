import * as THREE from '../../vendor/three.module.js';
import {
  canvasTexture, dirtTexture, concreteTexture, rustTexture,
  makeSignTexture, makeScreenTexture, makeGlowTexture, makeDustTexture, makeHazardTexture,
} from './textures.js';
import { box, cylinder, beamBetween, addCollider, makeLabel, lcg } from './helpers.js';
import { OIL_SECONDS } from '../config.js';

export function createSurface(scene) {
  const group = new THREE.Group();
  group.name = 'surface';
  scene.add(group);
  const colliders = [];
  const random = lcg(707);

  const dirtTex = dirtTexture();
  const concreteTex = concreteTexture();
  const rustTex = rustTexture();
  const glowTex = makeGlowTexture();
  const dustTex = makeDustTexture();
  const hazardTex = makeHazardTexture();

  const M = {
    ground: new THREE.MeshStandardMaterial({ map: dirtTex, color: 0xc39a72, roughness: 1, metalness: 0 }),
    path: new THREE.MeshStandardMaterial({ color: 0x705a43, roughness: 1 }),
    concrete: new THREE.MeshStandardMaterial({ map: concreteTex, color: 0x9b9b92, roughness: 0.94 }),
    concreteDark: new THREE.MeshStandardMaterial({ map: concreteTex, color: 0x555850, roughness: 0.96 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x59646a, metalness: 0.72, roughness: 0.42 }),
    steelDark: new THREE.MeshStandardMaterial({ color: 0x242c30, metalness: 0.78, roughness: 0.38 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x8b9498, metalness: 0.85, roughness: 0.32 }),
    rust: new THREE.MeshStandardMaterial({ map: rustTex, color: 0x9a5a3b, roughness: 0.8, metalness: 0.25 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xd99928, roughness: 0.5, metalness: 0.2 }),
    black: new THREE.MeshStandardMaterial({ color: 0x14191c, roughness: 0.85 }),
    white: new THREE.MeshStandardMaterial({ color: 0xdde2dc, roughness: 0.55, metalness: 0.08 }),
    cyan: new THREE.MeshStandardMaterial({ color: 0x3eb7c9, emissive: 0x1c7988, emissiveIntensity: 1.2, roughness: 0.35 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x1b3540, emissive: 0x0b2933, emissiveIntensity: 0.5, metalness: 0.55, roughness: 0.18 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xff7b2e, emissive: 0xff4b18, emissiveIntensity: 1.4, roughness: 0.5 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2b3337, roughness: 0.8 }),
    wire: new THREE.LineBasicMaterial({ color: 0x35302b, transparent: true, opacity: 0.65 }),
  };

  /* ---------------- Sky ---------------- */
  const skyUniforms = {
    topColor: { value: new THREE.Color(0x15213a) },
    midColor: { value: new THREE.Color(0x7b5a61) },
    horizonColor: { value: new THREE.Color(0xf39a5e) },
    sunColor: { value: new THREE.Color(0xffe2b0) },
    sunDir: { value: new THREE.Vector3(-0.55, 0.16, -0.82).normalize() },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(420, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: skyUniforms,
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      toneMapped: false,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 horizonColor;
        uniform vec3 sunColor;
        uniform vec3 sunDir;
        varying vec3 vWorld;
        void main() {
          vec3 dir = normalize(vWorld);
          float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.32, h));
          col = mix(col, topColor, smoothstep(0.3, 0.8, h));
          float sun = pow(max(dot(dir, sunDir), 0.0), 260.0);
          float halo = pow(max(dot(dir, sunDir), 0.0), 8.0);
          col += sunColor * sun * 3.0;
          col += vec3(1.0, 0.45, 0.18) * halo * 0.2;
          float band = smoothstep(0.46, 0.5, h) * smoothstep(0.58, 0.5, h);
          col += vec3(0.24, 0.13, 0.1) * band * 0.3;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
  );
  group.add(sky);

  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xffd7a0, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  sunSprite.position.set(-185, 58, -280);
  sunSprite.scale.set(74, 74, 1);
  group.add(sunSprite);

  /* ---------------- Lighting ---------------- */
  const hemi = new THREE.HemisphereLight(0xffd8b3, 0x4b372c, 1.55);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0x7d8796, 0.32);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffc38f, 2.85);
  sun.position.set(-55, 75, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.left = -55;
  sun.shadow.camera.right = 55;
  sun.shadow.camera.top = 55;
  sun.shadow.camera.bottom = -55;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 180;
  sun.shadow.bias = -0.0007;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x6f8db0, 0.68);
  fill.position.set(40, 25, -50);
  scene.add(fill);

  /* ---------------- Terrain ---------------- */
  const terrain = new THREE.PlaneGeometry(360, 360, 110, 110);
  terrain.rotateX(-Math.PI / 2);
  const pos = terrain.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const dist = Math.hypot(x, z + 10);
    const flat = THREE.MathUtils.smoothstep(dist, 30, 105);
    const ridge = Math.sin(x * 0.058) * Math.cos(z * 0.05) * 2.4
      + Math.sin(x * 0.13 + 1.7) * 0.75
      + Math.cos(z * 0.11 - 0.4) * 1.1;
    pos.setY(i, flat * (ridge + 1.2) - 0.1);
  }
  terrain.computeVertexNormals();
  const ground = new THREE.Mesh(terrain, M.ground);
  ground.receiveShadow = true;
  group.add(ground);

  // Approach road and paths.
  const road = new THREE.Mesh(new THREE.PlaneGeometry(9, 64), M.path);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.015, 26);
  road.receiveShadow = true;
  group.add(road);
  const pathLab = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 18), M.path);
  pathLab.rotation.x = -Math.PI / 2;
  pathLab.rotation.z = -0.95;
  pathLab.position.set(-9.6, 0.02, -2);
  group.add(pathLab);
  const pathShop = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 18), M.path);
  pathShop.rotation.x = -Math.PI / 2;
  pathShop.rotation.z = 0.95;
  pathShop.position.set(9.6, 0.02, -2);
  group.add(pathShop);

  // Site pad.
  const pad = new THREE.Mesh(new THREE.CircleGeometry(11, 64), M.concrete);
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(0, 0.04, -22);
  pad.receiveShadow = true;
  group.add(pad);
  const padRing = new THREE.Mesh(new THREE.RingGeometry(10.4, 11.2, 64), M.steelDark);
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.set(0, 0.06, -22);
  group.add(padRing);

  // Tire tracks.
  for (let side = -1; side <= 1; side += 2) {
    const track = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 50), new THREE.MeshBasicMaterial({ color: 0x4d3b2d, transparent: true, opacity: 0.32 }));
    track.rotation.x = -Math.PI / 2;
    track.position.set(side * 2.4, 0.025, 16);
    group.add(track);
  }

  /* ---------------- Distant mesas ---------------- */
  const mesaMat = new THREE.MeshStandardMaterial({ color: 0x79564a, roughness: 1 });
  const mesaTopMat = new THREE.MeshStandardMaterial({ color: 0x5c413a, roughness: 1 });
  for (let i = 0; i < 17; i++) {
    const angle = (i / 17) * Math.PI * 2 + random() * 0.22;
    const radius = 115 + random() * 52;
    const height = 12 + random() * 28;
    const wide = 10 + random() * 20;
    const mesa = new THREE.Mesh(new THREE.CylinderGeometry(wide * (0.65 + random() * 0.2), wide, height, 7), mesaMat);
    mesa.position.set(Math.cos(angle) * radius, height / 2 - 2, Math.sin(angle) * radius - 10);
    mesa.rotation.y = random() * Math.PI;
    group.add(mesa);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(wide * 0.68, wide * 0.68, 1.2, 7), mesaTopMat);
    top.position.copy(mesa.position);
    top.position.y = height - 1.6;
    group.add(top);
  }

  /* ---------------- Rocks ---------------- */
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x70594a, roughness: 0.96 });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 74);
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  for (let i = 0; i < 74; i++) {
    let x, z;
    do {
      x = (random() - 0.5) * 95;
      z = (random() - 0.5) * 90 - 5;
    } while (Math.hypot(x, z + 10) < 23 || (Math.abs(x) < 27 && z < -2 && z > -14));
    const s = 0.18 + random() * 1.35;
    scale.set(s * (0.7 + random() * 0.7), s * (0.5 + random() * 0.5), s * (0.7 + random() * 0.7));
    quat.setFromEuler(new THREE.Euler(random(), random() * Math.PI, random()));
    matrix.compose(new THREE.Vector3(x, s * 0.35, z), quat, scale);
    rocks.setMatrixAt(i, matrix);
  }
  group.add(rocks);

  /* ---------------- Fence ---------------- */
  const fencePostGeo = new THREE.BoxGeometry(0.14, 1.5, 0.14);
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x4b4037, roughness: 0.9 });
  const fencePosts = [];
  for (let x = -42; x <= 42; x += 5.25) {
    const post = new THREE.Mesh(fencePostGeo, fenceMat);
    post.position.set(x, 0.75, -48);
    post.castShadow = true;
    group.add(post);
    fencePosts.push(post.position.clone());
  }
  for (let z = -48; z <= 28; z += 5.25) {
    for (const x of [-42, 42]) {
      const post = new THREE.Mesh(fencePostGeo, fenceMat);
      post.position.set(x, 0.75, z);
      post.castShadow = true;
      group.add(post);
      fencePosts.push(post.position.clone());
    }
  }
  const wirePoints = [];
  for (let h = 0.55; h <= 1.2; h += 0.32) {
    for (let i = 0; i < fencePosts.length - 1; i++) {
      const a = fencePosts[i];
      const b = fencePosts[i + 1];
      if (Math.abs(a.x - b.x) + Math.abs(a.z - b.z) > 6) continue;
      wirePoints.push(a.x, h, a.z, b.x, h, b.z);
    }
  }
  const wireGeo = new THREE.BufferGeometry();
  wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wirePoints, 3));
  group.add(new THREE.LineSegments(wireGeo, M.wire));

  /* ---------------- Power poles ---------------- */
  const polePositions = [new THREE.Vector3(32, 0, -39), new THREE.Vector3(36, 0, -20), new THREE.Vector3(40, 0, 0)];
  const poleGeo = new THREE.CylinderGeometry(0.16, 0.22, 8.5, 7);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x4c4137, roughness: 0.92 });
  polePositions.forEach((p, i) => {
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(p.x, 4.25, p.z);
    pole.castShadow = true;
    group.add(pole);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(3, 0.14, 0.14), poleMat);
    cross.position.set(p.x, 7.4, p.z);
    group.add(cross);
    if (i < polePositions.length - 1) {
      const n = polePositions[i + 1];
      for (const off of [-1.2, 1.2]) {
        const pts = [
          new THREE.Vector3(p.x + off, 7.5, p.z),
          new THREE.Vector3((p.x + n.x) / 2 + off, 6.4, (p.z + n.z) / 2),
          new THREE.Vector3(n.x + off, 7.5, n.z),
        ];
        const curve = new THREE.CatmullRomCurve3(pts);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.018, 4, false), M.black);
        group.add(tube);
      }
    }
  });

  /* ---------------- Site sign ---------------- */
  const siteSign = makeLabel(makeSignTexture('SITE 07', 'DEEP BORE DIVISION', '#ffb347'), 5.8, 1.93, 0, 2.4, 29, Math.PI);
  siteSign.position.set(0, 2.3, 29.2);
  group.add(siteSign);
  box(group, M.steelDark, 0.18, 2.4, 0.18, -2.3, 1.2, 29.2);
  box(group, M.steelDark, 0.18, 2.4, 0.18, 2.3, 1.2, 29.2);

  /* ================================================================
   * CORE LAB
   * ================================================================ */
  const lab = new THREE.Group();
  lab.position.set(-19, 0, -8);
  group.add(lab);

  box(lab, M.concreteDark, 12.6, 0.35, 9.8, 0, 0.17, 0);
  box(lab, M.white, 12, 5.5, 9.2, 0, 2.9, 0);
  box(lab, M.white, 12.6, 0.32, 9.8, 0, 5.72, 0);
  box(lab, M.cyan, 12.1, 0.16, 9.3, 0, 5.52, 0);
  box(lab, M.steelDark, 12.15, 0.28, 9.35, 0, 0.4, 0);
  // Window band.
  box(lab, M.glass, 9.2, 1.55, 0.1, 0, 3.62, 4.63);
  box(lab, M.steelDark, 9.5, 0.12, 0.2, 0, 2.8, 4.66);
  box(lab, M.steelDark, 9.5, 0.12, 0.2, 0, 4.44, 4.66);
  for (let i = -3; i <= 3; i++) {
    box(lab, M.steelDark, 0.07, 1.55, 0.13, i * 1.32, 3.62, 4.68);
  }
  // Door and canopy.
  box(lab, M.steelDark, 2.0, 2.9, 0.16, 0, 1.5, 4.66);
  box(lab, M.glass, 1.5, 2.45, 0.06, 0, 1.48, 4.76);
  box(lab, M.cyan, 0.1, 2.6, 0.08, 0, 1.45, 4.8);
  box(lab, M.white, 4.5, 0.22, 2.2, 0, 4.72, 5.45);
  box(lab, M.steelDark, 0.18, 2.4, 0.18, -2.1, 3.55, 6.35);
  box(lab, M.steelDark, 0.18, 2.4, 0.18, 2.1, 3.55, 6.35);
  // Exterior details.
  for (let i = -1; i <= 1; i += 2) {
    box(lab, M.steelDark, 0.5, 0.9, 0.5, i * 5.3, 0.45, 4.2);
    box(lab, M.white, 1.0, 0.8, 0.9, i * 5.3, 1.3, 4.2);
  }
  const labSign = makeLabel(makeSignTexture('CORE LAB', 'GEOSCIENCE / UPGRADES', '#72e7ff'), 4.4, 1.47, 0, 4.72, 4.72);
  lab.add(labSign);
  const labDoorGlow = new THREE.PointLight(0x72e7ff, 2.1, 10, 2);
  labDoorGlow.position.set(0, 3, 5.4);
  lab.add(labDoorGlow);
  addCollider(colliders, -25.2, -12.8, -12.8, -3.25);

  /* ================================================================
   * OIL DEPOT
   * ================================================================ */
  const shop = new THREE.Group();
  shop.position.set(19, 0, -8);
  group.add(shop);
  box(shop, M.concreteDark, 11.2, 0.3, 8.9, 0, 0.15, 0);
  box(shop, M.rust, 10.6, 4.35, 8.4, 0, 2.45, 0);
  box(shop, M.steelDark, 10.8, 0.24, 8.6, 0, 4.65, 0);
  // Container ribs.
  for (let i = -4; i <= 4; i++) {
    box(shop, M.rust, 0.16, 4.25, 0.18, i * 1.16, 2.45, 4.24);
  }
  // Awning.
  const awning = box(shop, M.yellow, 11.1, 0.16, 2.8, 0, 4.25, 5.25);
  awning.rotation.x = -0.14;
  box(shop, M.steelDark, 0.12, 3.8, 0.12, -4.9, 2.05, 6.35);
  box(shop, M.steelDark, 0.12, 3.8, 0.12, 4.9, 2.05, 6.35);
  // Door.
  box(shop, M.steelDark, 2.0, 2.75, 0.16, 0, 1.48, 4.28);
  box(shop, M.orange, 0.1, 2.5, 0.08, 0, 1.4, 4.4);
  const shopSign = makeLabel(makeSignTexture('OIL DEPOT', 'FUEL / SUPPLIES / CREDITS', '#ffb347'), 4.9, 1.63, 0, 5.1, 4.28);
  shop.add(shopSign);
  const shopLight = new THREE.PointLight(0xffb45c, 2.4, 13, 2);
  shopLight.position.set(0, 3.6, 5.2);
  shop.add(shopLight);
  addCollider(colliders, 13.2, 24.8, -12.8, -3.25);

  // Barrels and crates around the depot.
  const barrelMats = [
    new THREE.MeshStandardMaterial({ color: 0xcc6a2f, roughness: 0.58, metalness: 0.35 }),
    new THREE.MeshStandardMaterial({ color: 0xd8a32d, roughness: 0.55, metalness: 0.25 }),
    new THREE.MeshStandardMaterial({ color: 0x6b786f, roughness: 0.6, metalness: 0.4 }),
  ];
  function makeBarrel(x, z, scale = 1, materialIndex = 0) {
    const b = new THREE.Group();
    b.position.set(x, 0, z);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.92, 14), barrelMats[materialIndex % 3]);
    body.position.y = 0.46;
    body.castShadow = true;
    b.add(body);
    for (const y of [0.2, 0.72]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.385, 0.035, 6, 16), M.steelDark);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      b.add(ring);
    }
    b.scale.setScalar(scale);
    group.add(b);
    return b;
  }
  makeBarrel(24.2, -3.7, 1, 0);
  makeBarrel(25.0, -4.4, 0.92, 1);
  makeBarrel(24.1, -5.2, 1, 0);
  makeBarrel(25.1, -6.0, 0.88, 2);
  makeBarrel(-23.3, -2.9, 0.9, 1);
  // Crates.
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x6f573b, roughness: 0.9 });
  box(group, crateMat, 1.5, 1.2, 1.3, 22.7, 0.6, -1.5).rotation.y = 0.22;
  box(group, crateMat, 1.1, 0.9, 1.1, 23.7, 0.45, -0.7).rotation.y = -0.3;
  box(group, crateMat, 1.3, 1.0, 1.2, 22.5, 0.5, -0.4).rotation.y = 0.1;

  /* ================================================================
   * BORE RIG
   * ================================================================ */
  const rig = new THREE.Group();
  rig.position.set(0, 0, -22);
  group.add(rig);

  // Concrete apron.
  const apron = new THREE.Mesh(new THREE.CircleGeometry(9.2, 48), M.concreteDark);
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = 0.065;
  apron.receiveShadow = true;
  rig.add(apron);

  // Bore hole.
  const holeBlack = new THREE.Mesh(new THREE.CircleGeometry(2.48, 48), new THREE.MeshBasicMaterial({ color: 0x010101 }));
  holeBlack.rotation.x = -Math.PI / 2;
  holeBlack.position.y = 0.1;
  rig.add(holeBlack);

  const holeWall = new THREE.Mesh(
    new THREE.CylinderGeometry(2.45, 2.45, 18, 40, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x1a100b, roughness: 1, side: THREE.BackSide })
  );
  holeWall.position.y = -8.9;
  rig.add(holeWall);

  const holeRing = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.28, 10, 48), M.steelDark);
  holeRing.rotation.x = Math.PI / 2;
  holeRing.position.y = 0.2;
  rig.add(holeRing);

  const holeGlowMat = new THREE.MeshStandardMaterial({ color: 0xff7a2e, emissive: 0xff5a1c, emissiveIntensity: 2.2, roughness: 0.45 });
  const holeGlow = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.075, 8, 64), holeGlowMat);
  holeGlow.rotation.x = Math.PI / 2;
  holeGlow.position.y = 0.24;
  rig.add(holeGlow);

  const holeLight = new THREE.PointLight(0xff6a24, 2.5, 18, 2);
  holeLight.position.set(0, 0.8, 0);
  rig.add(holeLight);

  // Glowing rings deep in the bore.
  const depthRings = [];
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2 - i * 0.15, 0.045, 6, 40), holeGlowMat.clone());
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -2.4 - i * 3.2;
    rig.add(ring);
    depthRings.push(ring);
  }

  // Hazard blocks around the hole.
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const h = box(rig, i % 2 ? M.yellow : M.black, 1.05, 0.2, 0.5, Math.cos(a) * 4.45, 0.14, Math.sin(a) * 4.45);
    h.rotation.y = -a + Math.PI / 2;
  }

  // Derrick legs.
  const legTop = 20.4;
  const legBottom = 3.6;
  const legTopR = 1.55;
  const legs = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const a = new THREE.Vector3(sx * legBottom, 0.35, sz * legBottom);
      const b = new THREE.Vector3(sx * legTopR, legTop, sz * legTopR);
      beamBetween(rig, M.steel, a, b, 0.16, 8);
      legs.push({ sx, sz });
    }
  }
  // Horizontal rings and cross braces.
  for (const y of [4.6, 9.0, 13.4, 17.6]) {
    const t = (y - 0.35) / (legTop - 0.35);
    const r = legBottom + (legTopR - legBottom) * t;
    const corners = [
      new THREE.Vector3(-r, y, -r), new THREE.Vector3(r, y, -r),
      new THREE.Vector3(r, y, r), new THREE.Vector3(-r, y, r),
    ];
    for (let i = 0; i < 4; i++) beamBetween(rig, M.steel, corners[i], corners[(i + 1) % 4], 0.075, 5);
    const lowerT = Math.max(0, (y - 4.4) / (legTop - 0.35));
    const lowerR = legBottom + (legTopR - legBottom) * lowerT;
    if (y > 5) {
      beamBetween(rig, M.steel, new THREE.Vector3(-lowerR, y - 4.4, -lowerR), new THREE.Vector3(lowerR, y, r), 0.045, 4);
      beamBetween(rig, M.steel, new THREE.Vector3(lowerR, y - 4.4, -lowerR), new THREE.Vector3(-lowerR, y, r), 0.045, 4);
    }
  }

  // Crown / platform.
  box(rig, M.steelDark, 4.7, 0.38, 4.7, 0, legTop + 0.2, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    box(rig, M.yellow, 0.11, 0.8, 0.11, Math.cos(a) * 2.15, legTop + 0.75, Math.sin(a) * 2.15);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const b = ((i + 1) / 4) * Math.PI * 2;
    beamBetween(rig, M.yellow,
      new THREE.Vector3(Math.cos(a) * 2.15, legTop + 1.12, Math.sin(a) * 2.15),
      new THREE.Vector3(Math.cos(b) * 2.15, legTop + 1.12, Math.sin(b) * 2.15), 0.045, 4);
  }
  // Crown wheel.
  const wheel = cylinder(rig, M.metal, 0.9, 0.9, 0.32, 18, 0, legTop + 1.15, 0);
  wheel.rotation.z = Math.PI / 2;
  const wheel2 = cylinder(rig, M.metal, 0.58, 0.58, 0.36, 16, 0, legTop + 1.15, 0);
  wheel2.rotation.z = Math.PI / 2;

  // Drill string and top drive.
  const drillGroup = new THREE.Group();
  rig.add(drillGroup);
  const drillShaft = cylinder(drillGroup, M.metal, 0.17, 0.17, 20.2, 10, 0, 10.1, 0);
  drillShaft.castShadow = true;
  for (let i = 0; i < 6; i++) {
    const collar = cylinder(drillGroup, M.steelDark, 0.28, 0.28, 0.12, 10, 0, 1.6 + i * 3.2, 0);
    collar.castShadow = false;
  }
  const topDrive = box(drillGroup, M.yellow, 1.25, 1.6, 1.25, 0, 17.1, 0);
  topDrive.castShadow = true;
  box(drillGroup, M.steelDark, 1.55, 0.34, 1.55, 0, 18.1, 0);
  const drillTip = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.4, 12), M.steelDark);
  drillTip.position.y = 0.3;
  drillTip.rotation.z = Math.PI;
  drillGroup.add(drillTip);

  // Rotary table at the hole.
  const rotary = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.22, 8, 24), M.yellow);
  rotary.rotation.x = Math.PI / 2;
  rotary.position.y = 0.5;
  rig.add(rotary);

  // Top oil reservoir.
  const reservoirMat = new THREE.MeshStandardMaterial({ color: 0xd79c25, emissive: 0x5a3306, emissiveIntensity: 0.3, metalness: 0.35, roughness: 0.48 });
  const reservoir = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 3.8, 20), reservoirMat);
  reservoir.rotation.z = Math.PI / 2;
  reservoir.position.set(2.75, legTop + 1.7, 0);
  reservoir.castShadow = true;
  rig.add(reservoir);
  for (const x of [1.55, 3.95]) {
    box(rig, M.steelDark, 0.22, 0.75, 1.1, x, legTop + 1.25, 0);
  }
  const reservoirBand = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.075, 6, 24), M.orange);
  reservoirBand.rotation.y = Math.PI / 2;
  reservoirBand.position.set(2.75, legTop + 1.7, 0);
  rig.add(reservoirBand);
  // Pipe from reservoir to top drive.
  beamBetween(rig, M.steelDark, new THREE.Vector3(2.1, legTop + 1.7, 0), new THREE.Vector3(0.7, legTop + 1.2, 0), 0.09, 6);
  beamBetween(rig, M.steelDark, new THREE.Vector3(0.7, legTop + 1.2, 0), new THREE.Vector3(0.55, 18.1, 0), 0.09, 6);
  const oilLabel = makeLabel(makeSignTexture('OIL', 'RESERVOIR / 60 SEC', '#ffd46a'), 1.5, 0.5, 2.75, legTop + 1.72, 1.02);
  rig.add(oilLabel);

  // Tower sign.
  const rigSign = makeLabel(makeSignTexture('BORE-01', 'DEPTH TO CORE: 6,371 KM', '#ffb347'), 4.4, 1.47, 0, 15.0, 1.7);
  rig.add(rigSign);

  // Console.
  const consoleGroup = new THREE.Group();
  consoleGroup.position.set(5.2, 0, 2.8);
  rig.add(consoleGroup);
  box(consoleGroup, M.steelDark, 1.9, 1.15, 1.0, 0, 0.58, 0);
  box(consoleGroup, M.yellow, 1.95, 0.08, 1.05, 0, 1.16, 0);
  const consoleScreen = box(consoleGroup, M.glass, 1.55, 0.75, 0.08, 0, 1.52, 0.2);
  consoleScreen.rotation.x = -0.2;
  // Dynamic screen face.
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 512;
  screenCanvas.height = 256;
  const screenCtx = screenCanvas.getContext('2d');
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  const screenFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.43, 0.66),
    new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })
  );
  screenFace.position.set(0, 1.54, 0.255);
  screenFace.rotation.x = -0.2;
  consoleGroup.add(screenFace);
  box(consoleGroup, M.steelDark, 0.5, 0.12, 0.3, 0, 0.75, -0.65).rotation.x = 0.2;
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0xff7a2e, emissive: 0xff4b18, emissiveIntensity: 1.5 });
  const beacon = cylinder(consoleGroup, beaconMat, 0.11, 0.11, 0.3, 8, 0, 1.8, -0.05);
  beacon.castShadow = false;

  // Hose and fill port.
  box(rig, M.yellow, 0.8, 0.7, 0.55, 0, 0.7, 3.75);
  box(rig, M.black, 0.62, 0.36, 0.12, 0, 0.86, 4.04);
  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.35, 0.9, 3.75),
    new THREE.Vector3(1.4, 0.55, 2.8),
    new THREE.Vector3(2.0, 1.0, 1.4),
    new THREE.Vector3(2.2, legTop - 0.2, 0.4),
  ]);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 24, 0.055, 6, false), M.black);
  rig.add(hose);

  // Floodlight poles.
  for (const [x, z] of [[-6.6, 4.2], [6.6, -4.2]]) {
    cylinder(rig, M.steelDark, 0.09, 0.12, 5.2, 7, x, 2.6, z);
    const lamp = box(rig, M.yellow, 0.7, 0.24, 0.35, x, 5.15, z);
    lamp.rotation.x = 0.25;
    const light = new THREE.PointLight(0xffc36c, 1.2, 16, 2);
    light.position.set(x, 5.0, z);
    rig.add(light);
  }

  // Cable reels and details.
  for (let i = 0; i < 4; i++) {
    const reel = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.16, 8, 16), M.steelDark);
    reel.position.set(-6.0 + i * 0.3, 0.7, -3.2 + i * 0.2);
    reel.rotation.y = Math.PI / 2;
    rig.add(reel);
  }
  const padGlow = new THREE.PointLight(0xff9c50, 1.0, 24, 2);
  padGlow.position.set(0, 4, 5);
  rig.add(padGlow);

  // Oil flow particles.
  const oilParticles = [];
  const oilParticleMat = new THREE.MeshBasicMaterial({ color: 0xffd25e, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 11; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), oilParticleMat);
    p.visible = false;
    rig.add(p);
    oilParticles.push({ mesh: p, t: 0, speed: 0.6 + random() * 0.5, side: random() * 2 - 1 });
  }

  // Drill dust.
  const dustCount = 190;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustSeeds = new Float32Array(dustCount * 4);
  for (let i = 0; i < dustCount; i++) {
    dustSeeds[i * 4] = random() * Math.PI * 2;
    dustSeeds[i * 4 + 1] = 1.4 + random() * 3.0;
    dustSeeds[i * 4 + 2] = 0.35 + random() * 0.65;
    dustSeeds[i * 4 + 3] = random();
    dustPositions[i * 3 + 1] = -100;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const drillDust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    map: dustTex, color: 0xffb067, size: 0.28, transparent: true, opacity: 0.6,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  rig.add(drillDust);

  // Core heat glow deep in the shaft.
  const coreSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xff8a36, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  coreSprite.position.set(0, -9, 0);
  coreSprite.scale.set(5, 5, 1);
  rig.add(coreSprite);

  /* ---------------- World dust motes ---------------- */
  const moteCount = 320;
  const motePos = new Float32Array(moteCount * 3);
  const moteSeed = new Float32Array(moteCount);
  for (let i = 0; i < moteCount; i++) {
    motePos[i * 3] = (random() - 0.5) * 130;
    motePos[i * 3 + 1] = random() * 14 + 0.4;
    motePos[i * 3 + 2] = (random() - 0.5) * 110 - 10;
    moteSeed[i] = random() * 100;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({
    map: dustTex, color: 0xffd7ae, size: 0.11, transparent: true, opacity: 0.4,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  group.add(motes);

  /* ---------------- Dynamic screen ---------------- */
  let lastScreenDepth = -1;
  let lastScreenOil = -1;
  let lastScreenDrill = null;
  function drawConsole(depth, oil, drilling, capacity) {
    const d = Math.floor(depth);
    const o = Math.ceil(oil);
    if (d === lastScreenDepth && o === lastScreenOil && drilling === lastScreenDrill) return;
    lastScreenDepth = d;
    lastScreenOil = o;
    lastScreenDrill = drilling;
    const ctx = screenCtx;
    const w = screenCanvas.width;
    const h = screenCanvas.height;
    ctx.fillStyle = '#061016';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(114,231,255,0.18)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.fillStyle = drilling ? '#ffb347' : '#72e7ff';
    ctx.font = '700 21px "Chakra Petch", sans-serif';
    ctx.fillText('BORE-01 / CONTROL', 18, 32);
    ctx.fillStyle = '#e9f6f7';
    ctx.font = '700 48px "Chakra Petch", sans-serif';
    ctx.fillText(`${d.toLocaleString()} KM`, 18, 92);
    ctx.fillStyle = '#7f9aa2';
    ctx.font = '500 16px "Space Grotesk", sans-serif';
    ctx.fillText('RESERVOIR', 18, 132);
    ctx.fillStyle = '#ffb347';
    ctx.font = '700 25px "Chakra Petch", sans-serif';
    ctx.fillText(o > 0 ? `${o}s / ${capacity * 60}s` : 'DRY', 18, 160);
    ctx.fillStyle = drilling ? '#ff8a45' : '#5f737a';
    ctx.font = '700 17px "Space Grotesk", sans-serif';
    ctx.fillText(drilling ? '● DRILLING' : '○ STANDBY', 18, 204);
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.font = '500 12px "Space Grotesk", sans-serif';
    ctx.fillText('SITE 07  ·  DEEP BORE DIVISION', 18, 236);
    screenTex.needsUpdate = true;
  }

  /* ---------------- Update ---------------- */
  let oilPulse = 0;
  let biomeColor = new THREE.Color(0xffb347);
  let currentDepth = 0;
  const tempColor = new THREE.Color();

  function update(dt, time, state) {
    const drilling = Boolean(state.drilling);
    const capacity = 1 + (state.lv?.tank || 0);
    const oil = state.rigOil || 0;
    const speed = drilling ? 8.5 : 0.55;
    drillGroup.rotation.y += dt * speed;
    rotary.rotation.z += dt * (drilling ? 4.0 : 0.25);
    wheel.rotation.x += dt * (drilling ? 2.2 : 0.08);

    // Hole glow responds to depth.
    const t = Math.min(1, currentDepth / 6371);
    tempColor.copy(biomeColor);
    holeGlowMat.color.copy(tempColor);
    holeGlowMat.emissive.copy(tempColor);
    holeGlowMat.emissiveIntensity = 1.7 + Math.sin(time * 2.3) * 0.25 + (drilling ? 0.9 : 0);
    holeLight.color.copy(tempColor);
    holeLight.intensity = 1.8 + (drilling ? 2.6 : 0) + t * 1.3;
    coreSprite.material.color.copy(tempColor);
    coreSprite.material.opacity = 0.28 + t * 0.45 + (drilling ? 0.12 : 0);
    depthRings.forEach((ring, i) => {
      ring.material.color.copy(tempColor);
      ring.material.emissive.copy(tempColor);
      ring.material.emissiveIntensity = 0.7 + Math.sin(time * 2 + i) * 0.3 + t * 1.5;
    });

    // Reservoir glow.
    const loadFraction = Math.min(1, oil / (capacity * OIL_SECONDS));
    reservoirMat.emissiveIntensity = oil > 0 ? 0.55 + Math.sin(time * 2) * 0.12 : 0.08;
    reservoirMat.emissive.setHex(oil > 0 ? 0x8a4a08 : 0x1e1205);
    reservoirBand.material.emissiveIntensity = oil > 0 ? 1.5 : 0.2;

    // Beacon.
    beaconMat.color.setHex(drilling ? 0xff4b18 : 0x72e7ff);
    beaconMat.emissive.setHex(drilling ? 0xff4b18 : 0x1d7886);
    beaconMat.emissiveIntensity = drilling ? 2.5 : 0.7 + Math.sin(time * 2.5) * 0.25;

    // Drill dust.
    if (drilling) {
      const p = dustGeo.attributes.position.array;
      for (let i = 0; i < dustCount; i++) {
        const s = dustSeeds[i * 4 + 3];
        const age = ((time * dustSeeds[i * 4 + 2] + s) % 1);
        const angle = dustSeeds[i * 4] + time * 0.7;
        const radius = dustSeeds[i * 4 + 1] * (0.4 + age * 0.85);
        p[i * 3] = Math.cos(angle) * radius;
        p[i * 3 + 1] = 0.35 + age * 7.5;
        p[i * 3 + 2] = Math.sin(angle) * radius;
      }
      dustGeo.attributes.position.needsUpdate = true;
      drillDust.material.opacity = 0.55;
    } else {
      drillDust.material.opacity = 0;
    }

    // Oil load particles.
    if (oilPulse > 0) {
      oilPulse -= dt;
      oilParticles.forEach((p, i) => {
        p.t += dt * p.speed;
        const t = (p.t + i / oilParticles.length) % 1;
        p.mesh.visible = t < 0.92;
        const curveT = t;
        const pos = hoseCurve.getPoint(curveT);
        p.mesh.position.set(pos.x + p.side * 0.09, pos.y + Math.sin(t * 9) * 0.06, pos.z);
        p.mesh.scale.setScalar(0.8 + Math.sin(t * Math.PI) * 0.7);
      });
      reservoirMat.emissiveIntensity += 0.6;
    } else {
      oilParticles.forEach(p => { p.mesh.visible = false; p.t = 0; });
    }

    // Ambient dust drift.
    const mp = moteGeo.attributes.position.array;
    for (let i = 0; i < moteCount; i++) {
      mp[i * 3] += Math.sin(time * 0.15 + moteSeed[i]) * dt * 0.09;
      mp[i * 3 + 1] += Math.cos(time * 0.22 + moteSeed[i]) * dt * 0.03;
    }
    moteGeo.attributes.position.needsUpdate = true;

    drawConsole(currentDepth, oil, drilling, capacity);
  }

  function setDepth(depth, biome) {
    currentDepth = depth;
    biomeColor.setHex(biome?.color || 0xffb347);
  }

  function pulseOil() {
    oilPulse = 2.4;
  }

  const waypoints = {
    lab: new THREE.Vector3(-19, 7.2, -8),
    shop: new THREE.Vector3(19, 7.4, -8),
    rig: new THREE.Vector3(0, 23.2, -22),
  };

  const interactables = {
    oil: new THREE.Vector3(0, 1.25, -18.25),
    console: new THREE.Vector3(5.2, 1.35, -18.8),
    labDoor: new THREE.Vector3(-19, 1.7, -3.0),
    shopDoor: new THREE.Vector3(19, 1.7, -3.0),
  };

  return {
    group,
    colliders,
    hole: { x: 0, z: -22, radius: 2.75 },
    waypoints,
    interactables,
    update,
    setDepth,
    pulseOil,
    materials: M,
    reservoirMat,
    screenTex,
  };
}

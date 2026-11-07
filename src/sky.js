import * as THREE from '../vendor/three.module.js';

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function radialTexture(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [p, col] of stops) g.addColorStop(p, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const COL = {
  topDay: new THREE.Color(0x4f9fe8),
  topNight: new THREE.Color(0x060d1d),
  horDay: new THREE.Color(0xcfe8f5),
  horNight: new THREE.Color(0x111c30),
  sunset: new THREE.Color(0xff8a4a),
  sunDay: new THREE.Color(0xfff3d6),
  sunSet: new THREE.Color(0xffab63),
  sunNight: new THREE.Color(0x8095cc),
  cloudDay: new THREE.Color(0xffffff),
  cloudNight: new THREE.Color(0x39465e),
};

export class Sky {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.time = 0.34;
    this.day = 1;

    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: COL.topDay.clone() },
        bottomColor: { value: COL.horDay.clone() },
        offset: { value: 0 },
        exponent: { value: 0.72 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPosition = wp.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          vec3 dir = normalize(vWorldPosition - cameraPosition);
          float h = clamp(dir.y * 0.5 + 0.5 + offset, 0.0, 1.0);
          vec3 col = mix(bottomColor, topColor, pow(h, exponent));
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 20), this.skyMat);
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    // lights
    this.hemi = new THREE.HemisphereLight(0xcfe7ff, 0x5a4a30, 1.1);
    scene.add(this.hemi);
    this.sunLight = new THREE.DirectionalLight(0xfff3d6, 2.1);
    scene.add(this.sunLight);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.22);
    scene.add(this.ambient);

    // sun + moon sprites
    const sunTex = radialTexture([
      [0, 'rgba(255,255,245,1)'],
      [0.18, 'rgba(255,248,214,1)'],
      [0.45, 'rgba(255,214,130,0.55)'],
      [1, 'rgba(255,180,80,0)'],
    ]);
    this.sun = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sunTex, color: 0xffffff, transparent: true, depthWrite: false, fog: false,
      blending: THREE.AdditiveBlending,
    }));
    this.sun.scale.setScalar(115);
    scene.add(this.sun);

    const moonTex = radialTexture([
      [0, 'rgba(255,255,255,1)'],
      [0.36, 'rgba(233,238,252,1)'],
      [0.42, 'rgba(200,212,235,0.55)'],
      [1, 'rgba(160,180,220,0)'],
    ]);
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({
      map: moonTex, color: 0xdfe8ff, transparent: true, depthWrite: false, fog: false,
      blending: THREE.AdditiveBlending,
    }));
    this.moon.scale.setScalar(72);
    scene.add(this.moon);

    // stars
    const starCount = 700;
    const sp = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const e = Math.acos(Math.random() * 1.0); // upper hemisphere bias
      const y = Math.abs(Math.cos(e));
      const r = 380;
      sp[i * 3] = Math.cos(a) * Math.sqrt(1 - y * y) * r;
      sp[i * 3 + 1] = y * r;
      sp[i * 3 + 2] = Math.sin(a) * Math.sqrt(1 - y * y) * r;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true,
      opacity: 0, depthWrite: false, fog: false,
    });
    this.stars = new THREE.Points(starGeo, this.starMat);
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    // clouds
    this.cloudDrift = 0;
    const count = 130;
    this.cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.9, fog: true,
    });
    this.clouds = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.cloudMat, count);
    this.clouds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.clouds.frustumCulled = false;
    this.cloudData = [];
    const rand = (() => { let s = 12345; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    for (let i = 0; i < count; i++) {
      this.cloudData.push({
        x: (rand() - 0.5) * 720,
        z: (rand() - 0.5) * 720,
        y: 112 + rand() * 14,
        sx: 8 + rand() * 18,
        sy: 1.8 + rand() * 2.8,
        sz: 8 + rand() * 18,
      });
    }
    scene.add(this.clouds);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._c1 = new THREE.Color();
    this._c2 = new THREE.Color();
    this.fogColor = COL.horDay.clone();
  }

  setTime(t) { this.time = ((t % 1) + 1) % 1; }

  update(dt, camera) {
    const time = this.time;
    const angle = (time - 0.25) * Math.PI * 2;
    const elev = Math.sin(angle);
    const day = smoothstep(-0.12, 0.2, elev);
    this.day = day;
    const dusk = Math.exp(-Math.abs(elev) * 5.2) * smoothstep(-0.28, 0.02, elev);

    const sunDir = new THREE.Vector3(Math.cos(angle) * 0.82, Math.sin(angle), 0.34).normalize();
    const sunUp = Math.max(0, sunDir.y);

    this.sky.position.copy(camera.position);
    this.stars.position.copy(camera.position);
    this.sun.position.copy(camera.position).addScaledVector(sunDir, 340);
    this.moon.position.copy(camera.position).addScaledVector(sunDir, -340);
    this.sun.visible = sunDir.y > -0.25;
    this.moon.visible = sunDir.y < 0.25;

    // colors
    const top = this._c1.copy(COL.topNight).lerp(COL.topDay, day);
    const hor = this._c2.copy(COL.horNight).lerp(COL.horDay, day);
    hor.lerp(COL.sunset, dusk * 0.85);
    this.skyMat.uniforms.topColor.value.copy(top);
    this.skyMat.uniforms.bottomColor.value.copy(hor);
    this.fogColor.copy(hor).multiplyScalar(0.94);

    this.sunLight.color.copy(COL.sunNight).lerp(COL.sunSet, dusk).lerp(COL.sunDay, day);
    this.sunLight.position.copy(sunDir).multiplyScalar(180);
    this.sunLight.intensity = 0.18 + 2.35 * Math.pow(sunUp, 0.65);
    this.hemi.intensity = 0.38 + 0.95 * day;
    this.hemi.color.copy(hor).lerp(new THREE.Color(0xffffff), 0.35);
    this.ambient.intensity = 0.16 + 0.18 * day;

    this.starMat.opacity = Math.max(0, 1 - day * 1.4) * 0.9;
    this.sun.material.opacity = Math.min(1, Math.max(0, (sunDir.y + 0.15) * 3));
    this.moon.material.opacity = Math.max(0, Math.min(1, (0.2 - sunDir.y) * 3)) * 0.9;

    // clouds
    this.cloudDrift += dt * 1.4;
    this.cloudMat.color.copy(COL.cloudNight).lerp(COL.cloudDay, day);
    this.cloudMat.opacity = 0.5 + 0.42 * day;
    const m = this._m, q = this._q, s = this._s, v = this._v;
    for (let i = 0; i < this.cloudData.length; i++) {
      const c = this.cloudData[i];
      let cx = ((c.x + this.cloudDrift) % 760 + 760) % 760 - 380;
      let cz = ((c.z) % 760 + 760) % 760 - 380;
      v.set(cx + camera.position.x * 0.92, c.y, cz + camera.position.z * 0.92);
      s.set(c.sx, c.sy, c.sz);
      m.compose(v, q, s);
      this.clouds.setMatrixAt(i, m);
    }
    this.clouds.instanceMatrix.needsUpdate = true;
  }

  clockString() {
    const mins = Math.round(this.time * 24 * 60) % (24 * 60);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}

import * as THREE from '../vendor/three.module.js';
import { B, isSolid } from './blocks.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const GRAVITY = 30;
const JUMP = 8.6;
const EYE = 1.62;
const WIDTH = 0.6;
const HEIGHT = 1.78;

export class Player {
  constructor(world) {
    this.world = world;
    this.pos = new THREE.Vector3(0, 60, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = -0.08;
    this.onGround = false;
    this.inWater = false;
    this.flying = false;
    this.eyeHeight = EYE;
    this.width = WIDTH;
    this.height = HEIGHT;
    this.walkTime = 0;
    this.running = false;
    this.lastStep = 0;
    this.sensitivity = 0.0022;
    this.bob = 0;
  }

  spawnAt(x, z) {
    const w = this.world;
    let sx = Math.round(x), sz = Math.round(z);
    // find a dry, walkable column near the requested point
    for (let r = 0; r < 48; r++) {
      for (let i = 0; i <= r; i++) {
        for (const [dx, dz] of [[i, r], [-i, r], [i, -r], [-i, -r], [r, i], [r, -i], [-r, i], [-r, -i]]) {
          const tx = Math.round(x) + dx, tz = Math.round(z) + dz;
          const h = w.surfaceY(tx, tz);
          const top = w.getBlock(tx, h + 1, tz);
          if (h > 32 && h < 70 && top === 0 && w.getBlock(tx, h, tz) !== B.WATER) {
            sx = tx; sz = tz;
            this.pos.set(sx + 0.5, h + 1.02, sz + 0.5);
            this.vel.set(0, 0, 0);
            return;
          }
        }
      }
    }
    this.pos.set(sx + 0.5, w.surfaceY(sx, sz) + 1.02, sz + 0.5);
  }

  collidesAt(x, y, z) {
    const half = this.width / 2;
    const x0 = Math.floor(x - half), x1 = Math.floor(x + half);
    const y0 = Math.floor(y + 0.002), y1 = Math.floor(y + this.height - 0.002);
    const z0 = Math.floor(z - half), z1 = Math.floor(z + half);
    const w = this.world;
    for (let yy = y0; yy <= y1; yy++) {
      for (let zz = z0; zz <= z1; zz++) {
        for (let xx = x0; xx <= x1; xx++) {
          if (isSolid(w.getBlock(xx, yy, zz))) return true;
        }
      }
    }
    return false;
  }

  update(dt, input) {
    dt = Math.min(dt, 0.05);
    const w = this.world;
    const feetBlock = w.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + 0.2), Math.floor(this.pos.z));
    this.inWater = feetBlock === B.WATER || w.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + 1.1), Math.floor(this.pos.z)) === B.WATER;

    // desired horizontal direction from yaw
    let f = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
    let s = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (f !== 0 && s !== 0) { f *= 0.7071; s *= 0.7071; }
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const dirX = -sin * f + cos * s;
    const dirZ = -cos * f - sin * s;

    const sprint = input.sprint && f > 0;
    this.running = sprint && !this.flying;
    let speed = this.flying ? (sprint ? 24 : 11) : (sprint ? 6.8 : 4.4);
    if (this.inWater && !this.flying) speed *= 0.62;

    const accel = this.flying ? 8 : this.onGround ? 16 : this.inWater ? 6 : 4.5;
    const k = Math.min(1, accel * dt);
    this.vel.x += (dirX * speed - this.vel.x) * k;
    this.vel.z += (dirZ * speed - this.vel.z) * k;
    if (dirX === 0 && dirZ === 0 && this.onGround) {
      const fr = Math.min(1, 12 * dt);
      this.vel.x -= this.vel.x * fr;
      this.vel.z -= this.vel.z * fr;
    }

    if (this.flying) {
      const up = (input.jump ? 1 : 0) - (input.down ? 1 : 0);
      this.vel.y += (up * 9 - this.vel.y) * Math.min(1, 10 * dt);
    } else if (this.inWater) {
      this.vel.y -= 8 * dt;
      this.vel.y *= 1 - Math.min(1, 2.6 * dt);
      if (input.jump) this.vel.y = Math.min(this.vel.y + 24 * dt, 3.4);
      this.vel.y = Math.max(this.vel.y, -3.2);
    } else {
      this.vel.y -= GRAVITY * dt;
      if (input.jump && this.onGround) {
        this.vel.y = JUMP;
        this.onGround = false;
      }
    }
    if (this.vel.y < -48) this.vel.y = -48;

    this.onGround = false;
    const dx = this.vel.x * dt, dy = this.vel.y * dt, dz = this.vel.z * dt;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) / 0.22));
    const sx = dx / steps, sy = dy / steps, sz = dz / steps;
    for (let i = 0; i < steps; i++) {
      this.moveAxis('x', sx);
      this.moveAxis('z', sz);
      this.moveAxis('y', sy);
    }

    // walking bob + footsteps
    const hspeed = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround && hspeed > 1.6) {
      this.walkTime += dt * (this.running ? 12.5 : 8.5);
      this.bob = Math.sin(this.walkTime) * 0.035 * Math.min(1, hspeed / 4.4);
      this.lastStep += dt;
      if (this.lastStep > (this.running ? 0.3 : 0.42)) {
        this.lastStep = 0;
        const below = w.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y - 0.2), Math.floor(this.pos.z));
        this.onStep && this.onStep(below);
      }
    } else {
      this.bob *= 1 - Math.min(1, 8 * dt);
    }

    if (this.pos.y < -8) {
      const y = this.world.surfaceY(Math.floor(this.pos.x), Math.floor(this.pos.z));
      this.pos.y = y + 2;
      this.vel.set(0, 0, 0);
    }
  }

  moveAxis(axis, delta) {
    if (!delta) return;
    const prev = this.pos[axis];
    const attempted = prev + delta;
    this.pos[axis] = attempted;
    if (!this.collidesAt(this.pos.x, this.pos.y, this.pos.z)) return;
    this.pos[axis] = prev;
    if (axis === 'y') {
      if (delta < 0) {
        this.onGround = true;
        // rest on top of the block we tried to enter
        this.pos.y = Math.floor(attempted) + 1;
        if (this.collidesAt(this.pos.x, this.pos.y, this.pos.z)) {
          this.pos.y = Math.ceil(prev + 0.0001);
        }
      } else {
        this.pos.y = Math.floor(attempted + this.height) - this.height - 0.0001;
      }
      this.vel.y = 0;
    } else {
      this.vel[axis] = 0;
    }
  }

  eyePosition(out = new THREE.Vector3()) {
    out.set(this.pos.x, this.pos.y + this.eyeHeight + this.bob, this.pos.z);
    return out;
  }
}

/* Amanatides & Woo voxel traversal. */
export function raycastVoxel(world, origin, dir, maxDist = 6.5) {
  let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
  const stepX = dir.x > 0 ? 1 : -1;
  const stepY = dir.y > 0 ? 1 : -1;
  const stepZ = dir.z > 0 ? 1 : -1;
  const invX = dir.x === 0 ? Infinity : Math.abs(1 / dir.x);
  const invY = dir.y === 0 ? Infinity : Math.abs(1 / dir.y);
  const invZ = dir.z === 0 ? Infinity : Math.abs(1 / dir.z);
  let tMaxX = dir.x === 0 ? Infinity : ((dir.x > 0 ? x + 1 - origin.x : origin.x - x) * invX);
  let tMaxY = dir.y === 0 ? Infinity : ((dir.y > 0 ? y + 1 - origin.y : origin.y - y) * invY);
  let tMaxZ = dir.z === 0 ? Infinity : ((dir.z > 0 ? z + 1 - origin.z : origin.z - z) * invZ);
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < 128; i++) {
    const id = world.getBlock(x, y, z);
    if (id !== 0 && id !== B.WATER) {
      return { x, y, z, nx, ny, nz, id };
    }
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      if (tMaxX > maxDist) break;
      x += stepX; tMaxX += invX; nx = -stepX; ny = 0; nz = 0;
    } else if (tMaxY < tMaxZ) {
      if (tMaxY > maxDist) break;
      y += stepY; tMaxY += invY; nx = 0; ny = -stepY; nz = 0;
    } else {
      if (tMaxZ > maxDist) break;
      z += stepZ; tMaxZ += invZ; nx = 0; ny = 0; nz = -stepZ;
    }
  }
  return null;
}

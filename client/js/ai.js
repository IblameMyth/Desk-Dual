/*
 * Computer opponent. Pens are at rest when the AI shoots (turns alternate),
 * so "predicting" the target means predicting where the shot will end up:
 * Hard estimates how far its own pen will slide and avoids flinging itself off the desk.
 */
import { CONFIG } from './physics.js';

export const DIFFICULTY = {
  easy: { errorDeg: 26, think: [900, 1700] },
  medium: { errorDeg: 9, think: [700, 1400] },
  hard: { errorDeg: 3, think: [600, 1100] },
};

/** Rough distance a pen slides after a launch at `speed` (mirrors the physics friction model). */
export function travelDistance(speed) {
  let v = speed;
  let d = 0;
  for (let i = 0; i < 3000 && v > CONFIG.restSpeed; i++) {
    d += v;
    v = v * (1 - CONFIG.pen.frictionAir) - CONFIG.deskFriction;
  }
  return d;
}

function speedForDistance(dist) {
  let lo = 0;
  let hi = CONFIG.maxSpeed;
  if (travelDistance(hi) <= dist) return hi;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (travelDistance(mid) < dist) lo = mid;
    else hi = mid;
  }
  return hi;
}

function distanceToEdge(p, dir, size) {
  const tx = dir.x > 0 ? (size.w - p.x) / dir.x : dir.x < 0 ? -p.x / dir.x : Infinity;
  const ty = dir.y > 0 ? (size.h - p.y) / dir.y : dir.y < 0 ? -p.y / dir.y : Infinity;
  return Math.min(tx, ty);
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * @returns {{dir:{x:number,y:number}, power:number, grab:{x:number,y:number}, thinkMs:number}}
 */
export function planShot(level, me, opp, size, rand = Math.random) {
  const cfg = DIFFICULTY[level] || DIFFICULTY.medium;
  const dist = Math.hypot(opp.x - me.x, opp.y - me.y) || 1;
  const err = ((rand() + rand() - 1) * cfg.errorDeg * Math.PI) / 180; // triangular: usually small
  const angle = Math.atan2(opp.y - me.y, opp.x - me.x) + err;
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };

  let power;
  if (level === 'easy') {
    power = 0.3 + rand() * 0.7;
  } else if (level === 'medium') {
    power = speedForDistance(dist + 50 + rand() * 70) / CONFIG.maxSpeed;
  } else {
    let want = dist + 150;
    const room = distanceToEdge(me, dir, size) - 12;
    if (travelDistance(speedForDistance(want)) > room) want = Math.max(dist + 30, Math.min(want, room));
    power = (speedForDistance(want) / CONFIG.maxSpeed) * (0.96 + rand() * 0.08);
  }
  power = clamp(power, 0.2, 1);

  const jitter = level === 'easy' ? 0 : 14;
  const grab = { x: me.x + (rand() - 0.5) * jitter, y: me.y + (rand() - 0.5) * jitter };
  const [lo, hi] = cfg.think;
  return { dir, power, grab, thinkMs: lo + rand() * (hi - lo) };
}

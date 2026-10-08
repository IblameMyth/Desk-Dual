/* Human-ish AI for the 10-level pen ladder. */
import { CONFIG } from './physics.js';
import { AI_BY_LEVEL, PEN_BY_ID } from './pens.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function travelDistance(speed) {
  // Mirror the same fixed-step cadence used by PhysicsWorld.  The previous AI
  // planner treated every iteration as a 60 Hz frame even though the real
  // simulation runs at 120 Hz, which made CPU shots feel noticeably different
  // from human/friends shots.
  let v = Math.max(0, speed), d = 0;
  const frameScale = CONFIG.step / (1000 / 60);
  const air = Math.max(0, 1 - CONFIG.pen.frictionAir * frameScale);
  const drag = CONFIG.deskFriction * frameScale;
  for (let i = 0; i < 6000 && v > CONFIG.restSpeed; i++) {
    d += v * frameScale;
    v = Math.max(0, v * air - drag);
  }
  return d;
}

function speedForDistance(dist, maxSpeed = CONFIG.maxSpeed) {
  let lo = 0, hi = maxSpeed;
  if (travelDistance(hi) <= dist) return hi;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (travelDistance(mid) < dist) lo = mid; else hi = mid;
  }
  return hi;
}

function distanceToEdge(p, dir, area) {
  const left = area.x, top = area.y;
  const right = area.x + area.w, bottom = area.y + area.h;
  const tx = dir.x > 0 ? (right - p.x) / dir.x : dir.x < 0 ? (left - p.x) / dir.x : Infinity;
  const ty = dir.y > 0 ? (bottom - p.y) / dir.y : dir.y < 0 ? (top - p.y) / dir.y : Infinity;
  return Math.min(tx, ty);
}

export function planShot(levelNumber, me, opp, size, playArea = { x: 0, y: 0, w: size.w, h: size.h }, rand = Math.random) {
  const cfg = AI_BY_LEVEL[levelNumber] || AI_BY_LEVEL[1];
  const pen = PEN_BY_ID[cfg.penId] || { strength: 1 };
  const penMaxSpeed = CONFIG.maxSpeed * (pen.strength || 1);
  const dx = opp.x - me.x, dy = opp.y - me.y;
  const dist = Math.hypot(dx, dy) || 1;

  // Higher levels aim more consistently, but never become perfectly accurate.
  const err = ((rand() + rand() - 1) * cfg.errorDeg * Math.PI) / 180;
  const baseAngle = Math.atan2(dy, dx);
  let angle = baseAngle + err;

  // Better opponents sometimes attack from an angle instead of blindly shooting center.
  if (rand() < cfg.edgeAwareness) {
    const side = rand() < 0.5 ? -1 : 1;
    angle += side * (0.05 + rand() * 0.13);
  }
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };

  const targetExtra = 28 + rand() * 55;
  const desired = dist + targetExtra;
  let power = speedForDistance(desired, penMaxSpeed) / penMaxSpeed;
  power = clamp(power * (0.96 + rand() * 0.10), cfg.powerMin, cfg.powerMax);

  // Avoid suicidal full-power shots when the launch direction points toward an edge.
  const room = distanceToEdge(me, dir, playArea) - 24;
  const launchSpeed = CONFIG.maxSpeed * Math.pow(power, 1.12) * (pen.strength || 1);
  const desiredTravel = travelDistance(launchSpeed);
  if (desiredTravel > room && cfg.edgeAwareness > 0.3) {
    const safe = Math.max(dist * 0.9, room * 0.72);
    const safeSpeed = speedForDistance(Math.max(30, safe), penMaxSpeed);
    power = clamp(Math.pow(Math.max(0, safeSpeed / penMaxSpeed), 1 / 1.12), cfg.powerMin, cfg.powerMax);
  }

  const jitter = Math.max(0, 18 - levelNumber * 1.25);
  const grab = { x: me.x + (rand() - 0.5) * jitter, y: me.y + (rand() - 0.5) * jitter };
  const [lo, hi] = cfg.think;
  return { dir, power, grab, thinkMs: lo + rand() * (hi - lo) };
}

/*
 * Tiny rigid-body physics for Pencil-Box Tower.
 * Boxes only (every classroom item is a rectangle for physics), with
 * SAT collision, clipped contact points, warm-started sequential impulses
 * and Coulomb friction. No external libraries, so it works offline.
 * World units are "pixels", y grows downward, angles are clockwise.
 */
(function () {
  'use strict';

  const GRAVITY = 1150;
  const SUBSTEPS = 3;
  const ITERATIONS = 12;
  const BIAS = 0.2;
  const SLOP = 0.4;

  let nextId = 1;

  function makeBody(opts) {
    const w = opts.w;
    const h = opts.h;
    const isStatic = !!opts.isStatic;
    const mass = isStatic ? 0 : (opts.density || 0.01) * w * h;
    return {
      id: nextId++,
      x: opts.x, y: opts.y, angle: opts.angle || 0,
      vx: 0, vy: 0, w: 0,
      hw: w / 2, hh: h / 2,
      isStatic,
      mass,
      invMass: isStatic ? 0 : 1 / mass,
      invI: isStatic ? 0 : 12 / (mass * (w * w + h * h)),
      friction: opts.friction === undefined ? 0.75 : opts.friction,
      tag: opts.tag || null,
      type: opts.type || null
    };
  }

  /* ---------- collision (box vs box) ---------- */
  function rot(b) {
    const c = Math.cos(b.angle);
    const s = Math.sin(b.angle);
    return { c, s };
  }

  function incidentEdge(h, pos, R, normal) {
    // convert the reference normal into the incident box frame and flip it
    const nx = -(R.c * normal.x + R.s * normal.y);
    const ny = -(-R.s * normal.x + R.c * normal.y);
    let a;
    let b;
    if (Math.abs(nx) > Math.abs(ny)) {
      if (nx > 0) { a = { x: h.x, y: -h.y }; b = { x: h.x, y: h.y }; }
      else { a = { x: -h.x, y: h.y }; b = { x: -h.x, y: -h.y }; }
    } else if (ny > 0) { a = { x: h.x, y: h.y }; b = { x: -h.x, y: h.y }; }
    else { a = { x: -h.x, y: -h.y }; b = { x: h.x, y: -h.y }; }
    return [a, b].map(v => ({ x: pos.x + R.c * v.x - R.s * v.y, y: pos.y + R.s * v.x + R.c * v.y }));
  }

  function clip(vIn, nx, ny, offset) {
    const out = [];
    const d0 = nx * vIn[0].x + ny * vIn[0].y - offset;
    const d1 = nx * vIn[1].x + ny * vIn[1].y - offset;
    if (d0 <= 0) out.push(vIn[0]);
    if (d1 <= 0) out.push(vIn[1]);
    if (d0 * d1 < 0) {
      const t = d0 / (d0 - d1);
      out.push({ x: vIn[0].x + t * (vIn[1].x - vIn[0].x), y: vIn[0].y + t * (vIn[1].y - vIn[0].y) });
    }
    return out;
  }

  function collide(A, B) {
    const RA = rot(A);
    const RB = rot(B);
    const dpx = B.x - A.x;
    const dpy = B.y - A.y;
    // d in each box frame
    const dAx = RA.c * dpx + RA.s * dpy;
    const dAy = -RA.s * dpx + RA.c * dpy;
    const dBx = RB.c * dpx + RB.s * dpy;
    const dBy = -RB.s * dpx + RB.c * dpy;
    // C = RA^T * RB
    const C00 = RA.c * RB.c + RA.s * RB.s;
    const C01 = -RA.c * RB.s + RA.s * RB.c;
    const C10 = -RA.s * RB.c + RA.c * RB.s;
    const C11 = RA.s * RB.s + RA.c * RB.c;
    const a00 = Math.abs(C00); const a01 = Math.abs(C01);
    const a10 = Math.abs(C10); const a11 = Math.abs(C11);

    const faceAx = Math.abs(dAx) - A.hw - (a00 * B.hw + a01 * B.hh);
    const faceAy = Math.abs(dAy) - A.hh - (a10 * B.hw + a11 * B.hh);
    if (faceAx > 0 || faceAy > 0) return null;
    const faceBx = Math.abs(dBx) - (a00 * A.hw + a10 * A.hh) - B.hw;
    const faceBy = Math.abs(dBy) - (a01 * A.hw + a11 * A.hh) - B.hh;
    if (faceBx > 0 || faceBy > 0) return null;

    let axis = 'ax';
    let sep = faceAx;
    let normal = dAx > 0 ? { x: RA.c, y: RA.s } : { x: -RA.c, y: -RA.s };
    const REL = 0.95;
    const ABS = 0.01;
    if (faceAy > REL * sep + ABS * A.hh) {
      axis = 'ay'; sep = faceAy;
      normal = dAy > 0 ? { x: -RA.s, y: RA.c } : { x: RA.s, y: -RA.c };
    }
    if (faceBx > REL * sep + ABS * B.hw) {
      axis = 'bx'; sep = faceBx;
      normal = dBx > 0 ? { x: RB.c, y: RB.s } : { x: -RB.c, y: -RB.s };
    }
    if (faceBy > REL * sep + ABS * B.hh) {
      axis = 'by'; sep = faceBy;
      normal = dBy > 0 ? { x: -RB.s, y: RB.c } : { x: RB.s, y: -RB.c };
    }

    let front; let side; let negSide; let posSide; let sideN; let frontN; let inc;
    const posA = { x: A.x, y: A.y };
    const posB = { x: B.x, y: B.y };
    if (axis === 'ax') {
      frontN = normal; front = posA.x * frontN.x + posA.y * frontN.y + A.hw;
      sideN = { x: -RA.s, y: RA.c };
      side = posA.x * sideN.x + posA.y * sideN.y;
      negSide = -side + A.hh; posSide = side + A.hh;
      inc = incidentEdge({ x: B.hw, y: B.hh }, posB, RB, frontN);
    } else if (axis === 'ay') {
      frontN = normal; front = posA.x * frontN.x + posA.y * frontN.y + A.hh;
      sideN = { x: RA.c, y: RA.s };
      side = posA.x * sideN.x + posA.y * sideN.y;
      negSide = -side + A.hw; posSide = side + A.hw;
      inc = incidentEdge({ x: B.hw, y: B.hh }, posB, RB, frontN);
    } else if (axis === 'bx') {
      frontN = { x: -normal.x, y: -normal.y }; front = posB.x * frontN.x + posB.y * frontN.y + B.hw;
      sideN = { x: -RB.s, y: RB.c };
      side = posB.x * sideN.x + posB.y * sideN.y;
      negSide = -side + B.hh; posSide = side + B.hh;
      inc = incidentEdge({ x: A.hw, y: A.hh }, posA, RA, frontN);
    } else {
      frontN = { x: -normal.x, y: -normal.y }; front = posB.x * frontN.x + posB.y * frontN.y + B.hh;
      sideN = { x: RB.c, y: RB.s };
      side = posB.x * sideN.x + posB.y * sideN.y;
      negSide = -side + B.hw; posSide = side + B.hw;
      inc = incidentEdge({ x: A.hw, y: A.hh }, posA, RA, frontN);
    }

    const c1 = clip(inc, -sideN.x, -sideN.y, negSide);
    if (c1.length < 2) return null;
    const c2 = clip(c1, sideN.x, sideN.y, posSide);
    if (c2.length < 2) return null;

    const contacts = [];
    for (let i = 0; i < 2; i++) {
      const separation = frontN.x * c2[i].x + frontN.y * c2[i].y - front;
      if (separation <= 0) {
        contacts.push({
          x: c2[i].x - separation * frontN.x,
          y: c2[i].y - separation * frontN.y,
          nx: normal.x, ny: normal.y, sep: separation,
          Pn: 0, Pt: 0, Pnb: 0
        });
      }
    }
    return contacts.length ? contacts : null;
  }

  /* ---------- world ---------- */
  function createWorld() {
    const world = {
      bodies: [],
      arbiters: new Map(),
      add(body) { world.bodies.push(body); return body; },
      remove(body) {
        const i = world.bodies.indexOf(body);
        if (i >= 0) world.bodies.splice(i, 1);
      },
      step(dt) {
        const h = dt / SUBSTEPS;
        for (let s = 0; s < SUBSTEPS; s++) stepOnce(world, h);
      }
    };
    return world;
  }

  function aabb(b) {
    const c = Math.abs(Math.cos(b.angle));
    const s = Math.abs(Math.sin(b.angle));
    return { hx: b.hw * c + b.hh * s, hy: b.hw * s + b.hh * c };
  }

  function stepOnce(world, dt) {
    const bodies = world.bodies;
    const invDt = 1 / dt;

    // broad + narrow phase
    const fresh = new Map();
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const A = bodies[i];
        const B = bodies[j];
        if (A.invMass === 0 && B.invMass === 0) continue;
        const ea = aabb(A);
        const eb = aabb(B);
        if (Math.abs(A.x - B.x) > ea.hx + eb.hx + 1 || Math.abs(A.y - B.y) > ea.hy + eb.hy + 1) continue;
        const contacts = collide(A, B);
        if (!contacts) continue;
        const key = A.id < B.id ? A.id + ':' + B.id : B.id + ':' + A.id;
        const old = world.arbiters.get(key);
        const arb = { A, B, contacts, friction: Math.sqrt(A.friction * B.friction) };
        if (old && old.A === A) {
          // warm start: carry impulses across from the nearest old contact
          contacts.forEach(c => {
            let best = null;
            let bd = 9;
            old.contacts.forEach(o => {
              const d = (o.x - c.x) * (o.x - c.x) + (o.y - c.y) * (o.y - c.y);
              if (d < bd) { bd = d; best = o; }
            });
            if (best) { c.Pn = best.Pn; c.Pt = best.Pt; }
          });
        }
        fresh.set(key, arb);
      }
    }
    world.arbiters = fresh;

    // gravity
    for (const b of bodies) {
      if (b.invMass === 0) continue;
      b.vy += GRAVITY * dt;
      b.vx *= 0.9995;
      b.w *= 0.998;
    }

    // pre-step
    for (const arb of fresh.values()) {
      const { A, B } = arb;
      for (const c of arb.contacts) {
        c.r1x = c.x - A.x; c.r1y = c.y - A.y;
        c.r2x = c.x - B.x; c.r2y = c.y - B.y;
        const rn1 = c.r1x * c.nx + c.r1y * c.ny;
        const rn2 = c.r2x * c.nx + c.r2y * c.ny;
        const kN = A.invMass + B.invMass +
          A.invI * (c.r1x * c.r1x + c.r1y * c.r1y - rn1 * rn1) +
          B.invI * (c.r2x * c.r2x + c.r2y * c.r2y - rn2 * rn2);
        c.massN = 1 / kN;
        const tx = c.ny;
        const ty = -c.nx;
        c.tx = tx; c.ty = ty;
        const rt1 = c.r1x * tx + c.r1y * ty;
        const rt2 = c.r2x * tx + c.r2y * ty;
        const kT = A.invMass + B.invMass +
          A.invI * (c.r1x * c.r1x + c.r1y * c.r1y - rt1 * rt1) +
          B.invI * (c.r2x * c.r2x + c.r2y * c.r2y - rt2 * rt2);
        c.massT = 1 / kT;
        c.bias = -BIAS * invDt * Math.min(0, c.sep + SLOP);
        // warm start
        const Px = c.Pn * c.nx + c.Pt * tx;
        const Py = c.Pn * c.ny + c.Pt * ty;
        A.vx -= A.invMass * Px; A.vy -= A.invMass * Py;
        A.w -= A.invI * (c.r1x * Py - c.r1y * Px);
        B.vx += B.invMass * Px; B.vy += B.invMass * Py;
        B.w += B.invI * (c.r2x * Py - c.r2y * Px);
      }
    }

    // iterate
    for (let it = 0; it < ITERATIONS; it++) {
      for (const arb of fresh.values()) {
        const { A, B } = arb;
        for (const c of arb.contacts) {
          let dvx = B.vx - B.w * c.r2y - A.vx + A.w * c.r1y;
          let dvy = B.vy + B.w * c.r2x - A.vy - A.w * c.r1x;
          const vn = dvx * c.nx + dvy * c.ny;
          let dPn = c.massN * (-vn + c.bias);
          const Pn0 = c.Pn;
          c.Pn = Math.max(Pn0 + dPn, 0);
          dPn = c.Pn - Pn0;
          let Px = dPn * c.nx;
          let Py = dPn * c.ny;
          A.vx -= A.invMass * Px; A.vy -= A.invMass * Py;
          A.w -= A.invI * (c.r1x * Py - c.r1y * Px);
          B.vx += B.invMass * Px; B.vy += B.invMass * Py;
          B.w += B.invI * (c.r2x * Py - c.r2y * Px);

          dvx = B.vx - B.w * c.r2y - A.vx + A.w * c.r1y;
          dvy = B.vy + B.w * c.r2x - A.vy - A.w * c.r1x;
          const vt = dvx * c.tx + dvy * c.ty;
          let dPt = c.massT * (-vt);
          const maxPt = arb.friction * c.Pn;
          const Pt0 = c.Pt;
          c.Pt = Math.max(-maxPt, Math.min(maxPt, Pt0 + dPt));
          dPt = c.Pt - Pt0;
          Px = dPt * c.tx;
          Py = dPt * c.ty;
          A.vx -= A.invMass * Px; A.vy -= A.invMass * Py;
          A.w -= A.invI * (c.r1x * Py - c.r1y * Px);
          B.vx += B.invMass * Px; B.vy += B.invMass * Py;
          B.w += B.invI * (c.r2x * Py - c.r2y * Px);
        }
      }
    }

    // integrate
    for (const b of bodies) {
      if (b.invMass === 0) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle += b.w * dt;
    }
  }

  window.PTPhysics = { createWorld, makeBody };
})();

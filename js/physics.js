/*
 * Physics layer: Matter.js pen-flick simulation.
 * The playable surface is a real classroom desk placed inside a larger
 * top-down classroom scene. Pens can leave the desk and collide/slide/spin.
 */
const { Engine, Bodies, Body, Composite, Events } = window.Matter;

export const CONFIG = {
  // The canvas is the whole classroom. `playArea` is the actual desk.
  desk: {
    landscape: { w: 1400, h: 800, playArea: { x: 470, y: 75, w: 460, h: 650 } },
    portrait: { w: 800, h: 1200, playArea: { x: 105, y: 90, w: 590, h: 1020 } },
  },
  pen: {
    length: 153,
    width: 19,
    density: 0.0017,
    restitution: 0.18,
    friction: 0.30,
    frictionStatic: 0.34,
    frictionAir: 0.020,
  },
  // Moderate, consistent desk drag creates a longer, smooth glide without runaway shots.
  // Damping is expressed per 60 Hz reference frame and scaled by dt so
  // motion stays identical and smooth on 60/90/120 Hz displays.
  deskFriction: 0.65,
  angularDamping: 0.90,
  maxPull: 190,
  minPull: 8,
  // Controlled launch speed; lower launch velocity with calibrated drag keeps impacts readable.
  maxSpeed: 10,
  spinFactor: 1 / 5200,
  maxSpin: 0.42,
  grabPadding: 18,
  restSpeed: 0.025,
  restSpin: 0.0003,
  wallThickness: 220,
  solidWalls: false,
  wallRestitution: 0.42,
  // Run the simulation at 120 Hz. Rendering still follows requestAnimationFrame,
  // giving much smoother pen trajectories and more stable collision response.
  step: 1000 / 120,
  maxStepsPerFrame: 12,
};

export class PhysicsWorld {
  constructor(width, height, playArea = null) {
    this.size = { w: width, h: height };
    this.playArea = playArea || { x: 0, y: 0, w: width, h: height };
    this.engine = Engine.create({
      gravity: { x: 0, y: 0, scale: 0 },
      // More solver passes reduce residual overlap when two thin pens hit at
      // an angle, especially during strong shots on mobile browsers.
      positionIterations: 10,
      velocityIterations: 8,
      constraintIterations: 2,
      enableSleeping: false,
    });
    this.pens = new Map();
    this.walls = [];
    this.accumulator = 0;
    // Render interpolation state: the physics runs at a fixed 120 Hz while
    // the browser renders at whatever refresh rate is available. Keeping the
    // previous and current physics poses lets the renderer smoothly blend
    // between simulation ticks instead of visibly stepping/jittering.
    this.renderState = new Map();
    this._buildWalls();
    this.onCollision = null;

    Events.on(this.engine, 'beforeUpdate', () => this._applyDeskFriction());
    Events.on(this.engine, 'collisionStart', (e) => {
      for (const { bodyA: a, bodyB: b } of e.pairs) {
        if (a.label.startsWith('pen:') && b.label.startsWith('pen:')) {
          const rvx = a.velocity.x - b.velocity.x;
          const rvy = a.velocity.y - b.velocity.y;
          const speed = Math.hypot(rvx, rvy);

          // Collision audio/statistics only. Do not add an artificial shove:
          // Matter.js already transfers momentum, and a bonus impulse was
          // making a single clean hit launch the target off the desk.
          this.onCollision?.({
            speed,
            massA: a.mass,
            massB: b.mass,
            relativeMass: Math.max(a.mass, b.mass) / Math.max(0.0001, Math.min(a.mass, b.mass)),
          });
        }
      }
    });
  }

  addPen(id, { fx = 0.5, fy = 0.5, angle = 0, skin = 'blue', asset = null, modelId = 'starter', strength = 1 } = {}) {
    const { length: baseLength, width: baseWidth, density, restitution, friction, frictionStatic, frictionAir } = CONFIG.pen;

    // Pen tiers must matter in collisions, not only when launching a shot.
    // Higher-tier models are visibly larger and carry more mass. Keep the
    // density adjusted for the size change so total mass follows the tier
    // curve instead of accidentally being multiplied twice by the larger area.
    const tier = Math.max(0.85, Math.min(1.80, Number(strength) || 1));
    const sizeScale = 0.90 + ((tier - 0.85) / 0.95) * 0.30; // 0.90x -> 1.20x
    const massScale = Math.pow(tier / 0.90, 0.55);          // gentle tier advantage; starter and Level 1 match
    const length = baseLength * sizeScale;
    const width = baseWidth * sizeScale;
    const tierDensity = density * massScale / (sizeScale * sizeScale);

    const body = Bodies.rectangle(
      this.playArea.x + fx * this.playArea.w,
      this.playArea.y + fy * this.playArea.h,
      length,
      width,
      {
        angle,
        density: tierDensity,
        restitution,
        friction,
        frictionStatic,
        frictionAir,
        chamfer: { radius: width * 0.4 },
        label: `pen:${id}`,
      },
    );
    Composite.add(this.engine.world, body);
    const pen = { id, body, skin, length, width, fx, fy, angle, asset, modelId, strength: tier, sizeScale, massScale }; 
    this.pens.set(id, pen);
    this.renderState.set(id, {
      prevX: body.position.x, prevY: body.position.y, prevA: body.angle,
      currX: body.position.x, currY: body.position.y, currA: body.angle,
    });
    return pen;
  }

  resetPen(id, spawn) {
    const pen = this.pens.get(id);
    if (!pen) return;
    if (spawn) Object.assign(pen, spawn);
    Body.setPosition(pen.body, {
      x: this.playArea.x + pen.fx * this.playArea.w,
      y: this.playArea.y + pen.fy * this.playArea.h,
    });
    Body.setAngle(pen.body, pen.angle);
    Body.setVelocity(pen.body, { x: 0, y: 0 });
    Body.setAngularVelocity(pen.body, 0);
    this.renderState.set(id, {
      prevX: pen.body.position.x, prevY: pen.body.position.y, prevA: pen.body.angle,
      currX: pen.body.position.x, currY: pen.body.position.y, currA: pen.body.angle,
    });
  }

  resize(width, height, playArea = null) {
    const sx = width / this.size.w;
    const sy = height / this.size.h;
    this.size = { w: width, h: height };
    this.playArea = playArea || {
      x: this.playArea.x * sx,
      y: this.playArea.y * sy,
      w: this.playArea.w * sx,
      h: this.playArea.h * sy,
    };
    this._buildWalls();
    const margin = CONFIG.pen.length / 2;
    for (const { body } of this.pens.values()) {
      const x = Math.min(Math.max(body.position.x * sx, this.playArea.x + margin), this.playArea.x + this.playArea.w - margin);
      const y = Math.min(Math.max(body.position.y * sy, this.playArea.y + margin), this.playArea.y + this.playArea.h - margin);
      Body.setPosition(body, { x, y });
      Body.setVelocity(body, { x: 0, y: 0 });
      Body.setAngularVelocity(body, 0);
    }
  }

  penContains(id, point, padding = 0) {
    const pen = this.pens.get(id);
    if (!pen) return false;
    const { position, angle } = pen.body;
    const dx = point.x - position.x;
    const dy = point.y - position.y;
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    return Math.abs(lx) <= pen.length / 2 + padding && Math.abs(ly) <= pen.width / 2 + padding;
  }

  penStatus(id) {
    const { body } = this.pens.get(id);
    const { min, max } = body.bounds;
    const { x, y, w, h } = this.playArea;
    const { x: cx, y: cy } = body.position;
    return {
      fullyOut: max.x < x || min.x > x + w || max.y < y || min.y > y + h,
      centerOut: cx < x || cx > x + w || cy < y || cy > y + h,
    };
  }

  allResting() {
    for (const id of this.pens.keys()) if (!this.isResting(id)) return false;
    return true;
  }

  maxSpeed() {
    let s = 0;
    for (const { body } of this.pens.values()) s = Math.max(s, body.speed);
    return s;
  }

  freeze() {
    for (const { body } of this.pens.values()) {
      Body.setVelocity(body, { x: 0, y: 0 });
      Body.setAngularVelocity(body, 0);
    }
  }

  isResting(id) {
    const pen = this.pens.get(id);
    if (!pen) return true;
    return pen.body.speed < CONFIG.restSpeed && Math.abs(pen.body.angularSpeed) < CONFIG.restSpin;
  }

  flick(id, grab, pull) {
    const pen = this.pens.get(id);
    if (!pen) return null;
    const len = Math.hypot(pull.x, pull.y);
    if (len < CONFIG.minPull) return null;

    const power = Math.min(len / CONFIG.maxPull, 1);
    // A slightly sub-linear curve keeps short flicks controllable while
    // allowing a committed flick to launch the pen noticeably faster.
    const launchPower = power;
    // Every pen has its own strength. Better pens launch faster from the same flick.
    const speed = CONFIG.maxSpeed * launchPower * (pen.strength || 1);
    const vx = (pull.x / len) * speed;
    const vy = (pull.y / len) * speed;
    Body.setVelocity(pen.body, { x: vx, y: vy });

    const rx = grab.x - pen.body.position.x;
    const ry = grab.y - pen.body.position.y;
    let spin = (rx * vy - ry * vx) * CONFIG.spinFactor;
    spin = Math.max(-CONFIG.maxSpin, Math.min(CONFIG.maxSpin, spin));
    Body.setAngularVelocity(pen.body, spin);

    return { power, speed };
  }

  update(dtMs) {
    // Clamp large tab-switch/frame stalls, then consume the time in small
    // deterministic 120 Hz steps. This prevents visible teleporting after
    // a dropped frame while keeping the simulation responsive.
    this.accumulator += Math.min(Math.max(dtMs, 0), 50);
    let steps = 0;
    while (this.accumulator >= CONFIG.step && steps < CONFIG.maxStepsPerFrame) {
      // Capture the pose immediately before this fixed simulation step.
      for (const [id, pen] of this.pens) {
        const b = pen.body;
        const r = this.renderState.get(id);
        if (!r) continue;
        r.prevX = b.position.x;
        r.prevY = b.position.y;
        r.prevA = b.angle;
      }

      Engine.update(this.engine, CONFIG.step);

      // And the pose immediately after it. The renderer interpolates between
      // these two poses on every animation frame.
      for (const [id, pen] of this.pens) {
        const b = pen.body;
        const r = this.renderState.get(id);
        if (!r) continue;
        r.currX = b.position.x;
        r.currY = b.position.y;
        r.currA = b.angle;
      }
      this.accumulator -= CONFIG.step;
      steps++;
    }
    if (steps === CONFIG.maxStepsPerFrame && this.accumulator >= CONFIG.step) {
      this.accumulator = 0;
    }
  }

  getRenderPose(id) {
    const pen = this.pens.get(id);
    if (!pen) return null;
    const r = this.renderState.get(id);
    if (!r) return { x: pen.body.position.x, y: pen.body.position.y, angle: pen.body.angle };

    // Interpolate the last two fixed-step poses. Angle interpolation uses the
    // shortest path so a wrap from +PI to -PI never causes a visual spin.
    const alpha = Math.max(0, Math.min(1, this.accumulator / CONFIG.step));
    let da = r.currA - r.prevA;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    return {
      x: r.prevX + (r.currX - r.prevX) * alpha,
      y: r.prevY + (r.currY - r.prevY) * alpha,
      angle: r.prevA + da * alpha,
    };
  }

  _applyDeskFriction() {
    // Scale damping to the actual physics step. Without this scaling, moving
    // from 60 -> 120 Hz would double the friction and make pens feel sticky.
    const frameScale = CONFIG.step / (1000 / 60);
    for (const { body } of this.pens.values()) {
      const { x, y } = body.velocity;
      const s = Math.hypot(x, y);
      if (s > 0) {
        const next = Math.max(0, s - CONFIG.deskFriction * frameScale);
        if (next <= CONFIG.restSpeed) Body.setVelocity(body, { x: 0, y: 0 });
        else Body.setVelocity(body, { x: (x * next) / s, y: (y * next) / s });
      }
      const w = body.angularVelocity;
      const damp = Math.pow(CONFIG.angularDamping, frameScale);
      let nextW = w * damp;
      if (Math.abs(nextW) < CONFIG.restSpin) nextW = 0;
      if (nextW !== w) Body.setAngularVelocity(body, nextW);
    }
  }

  _buildWalls() {
    if (this.walls.length) Composite.remove(this.engine.world, this.walls);
    this.walls = [];
    if (!CONFIG.solidWalls) return;
    const { x, y, w, h } = this.playArea;
    const t = CONFIG.wallThickness;
    const opts = { isStatic: true, restitution: CONFIG.wallRestitution, friction: 0.05, label: 'wall' };
    this.walls = [
      Bodies.rectangle(x + w / 2, y - t / 2, w + t * 2, t, opts),
      Bodies.rectangle(x + w / 2, y + h + t / 2, w + t * 2, t, opts),
      Bodies.rectangle(x - t / 2, y + h / 2, t, h + t * 2, opts),
      Bodies.rectangle(x + w + t / 2, y + h / 2, t, h + t * 2, opts),
    ];
    Composite.add(this.engine.world, this.walls);
  }
}

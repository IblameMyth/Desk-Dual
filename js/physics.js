/*
 * Physics layer: Matter.js pen-flick simulation.
 * The playable surface is a real classroom desk placed inside a larger
 * top-down classroom scene. Pens can leave the desk and collide/slide/spin.
 */
const { Engine, Bodies, Body, Composite, Events } = window.Matter;

export const CONFIG = {
  // The canvas is the whole classroom. `playArea` is the actual desk.
  desk: {
    landscape: { w: 1400, h: 800, playArea: { x: 560, y: 100, w: 280, h: 600 } },
    portrait: { w: 800, h: 1200, playArea: { x: 260, y: 135, w: 280, h: 900 } },
  },
  pen: {
    length: 122,
    width: 15,
    density: 0.0017,
    restitution: 0.72,
    friction: 0.055,
    frictionStatic: 0.025,
    frictionAir: 0.012,
  },
  // Small constant slowdown gives the characteristic classroom-desk glide.
  deskFriction: 0.058,
  angularDamping: 0.985,
  maxPull: 175,
  minPull: 12,
  maxSpeed: 6.75,
  spinFactor: 1 / 6200,
  maxSpin: 0.34,
  grabPadding: 18,
  restSpeed: 0.045,
  restSpin: 0.00055,
  wallThickness: 220,
  solidWalls: false,
  wallRestitution: 0.72,
  step: 1000 / 60,
  maxStepsPerFrame: 6,
};

export class PhysicsWorld {
  constructor(width, height, playArea = null) {
    this.size = { w: width, h: height };
    this.playArea = playArea || { x: 0, y: 0, w: width, h: height };
    this.engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });
    this.pens = new Map();
    this.walls = [];
    this.accumulator = 0;
    this._buildWalls();
    this.onCollision = null;

    Events.on(this.engine, 'beforeUpdate', () => this._applyDeskFriction());
    Events.on(this.engine, 'collisionStart', (e) => {
      for (const { bodyA: a, bodyB: b } of e.pairs) {
        if (a.label.startsWith('pen:') && b.label.startsWith('pen:')) {
          const speed = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
          this.onCollision?.({ speed });
        }
      }
    });
  }

  addPen(id, { fx = 0.5, fy = 0.5, angle = 0, skin = 'blue' } = {}) {
    const { length, width, density, restitution, friction, frictionStatic, frictionAir } = CONFIG.pen;
    const body = Bodies.rectangle(
      this.playArea.x + fx * this.playArea.w,
      this.playArea.y + fy * this.playArea.h,
      length,
      width,
      {
        angle,
        density,
        restitution,
        friction,
        frictionStatic,
        frictionAir,
        chamfer: { radius: width * 0.4 },
        label: `pen:${id}`,
      },
    );
    Composite.add(this.engine.world, body);
    const pen = { id, body, skin, length, width, fx, fy, angle };
    this.pens.set(id, pen);
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
    const speed = CONFIG.maxSpeed * power;
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
    this.accumulator += dtMs;
    let steps = 0;
    while (this.accumulator >= CONFIG.step && steps < CONFIG.maxStepsPerFrame) {
      Engine.update(this.engine, CONFIG.step);
      this.accumulator -= CONFIG.step;
      steps++;
    }
    if (steps === CONFIG.maxStepsPerFrame) this.accumulator = 0;
  }

  _applyDeskFriction() {
    for (const { body } of this.pens.values()) {
      const { x, y } = body.velocity;
      const s = Math.hypot(x, y);
      if (s > 0) {
        const next = s - CONFIG.deskFriction;
        if (next <= CONFIG.restSpeed) Body.setVelocity(body, { x: 0, y: 0 });
        else Body.setVelocity(body, { x: (x * next) / s, y: (y * next) / s });
      }
      let w = body.angularVelocity * CONFIG.angularDamping;
      if (Math.abs(w) < CONFIG.restSpin) w = 0;
      if (w !== body.angularVelocity) Body.setAngularVelocity(body, w);
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

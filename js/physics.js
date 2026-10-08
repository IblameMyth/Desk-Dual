/*
 * Physics layer: a thin wrapper around Matter.js.
 * Top-down view, so there is no gravity. "Desk friction" is a small constant
 * deceleration on top of Matter's air damping, which makes pens stop crisply
 * instead of drifting forever.
 *
 * Expects window.Matter (loaded from the CDN in game.html).
 */
const { Engine, Bodies, Body, Composite, Events } = window.Matter;

export const CONFIG = {
  // Logical desk sizes (world units). The orientation is chosen to fit the screen.
  desk: {
    landscape: { w: 900, h: 560 },
    portrait: { w: 560, h: 900 },
  },
  pen: {
    length: 140,
    width: 16,
    density: 0.002,
    restitution: 0.55,
    friction: 0.1,
    frictionAir: 0.02,
  },
  deskFriction: 0.07, // velocity lost per step, on top of frictionAir
  angularDamping: 0.965, // spin multiplier per step
  maxPull: 160, // world units of drag that equal 100% power
  minPull: 14, // shorter drags are treated as "cancelled"
  maxSpeed: 22, // configurable maximum launch velocity (world units / step)
  spinFactor: 1 / 9000, // how much an off-centre grab spins the pen
  maxSpin: 0.22, // rad / step
  grabPadding: 22, // extra grab area around the pen (fingers are fat)
  restSpeed: 0.05,
  restSpin: 0.0008,
  wallThickness: 300,
  solidWalls: false, // false = pens can fall off the desk (the real game); true = bouncy walls
  wallRestitution: 0.6,
  step: 1000 / 60,
  maxStepsPerFrame: 5,
};

export class PhysicsWorld {
  constructor(width, height) {
    this.size = { w: width, h: height };
    this.engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });
    this.pens = new Map(); // id -> { body, skin, length, width, fx, fy, angle }
    this.walls = [];
    this.accumulator = 0;
    this._buildWalls();
    Events.on(this.engine, 'beforeUpdate', () => this._applyDeskFriction());
    this.onCollision = null; // ({ speed }) => void, fired when two pens touch
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
    const { length, width, density, restitution, friction, frictionAir } = CONFIG.pen;
    const body = Bodies.rectangle(fx * this.size.w, fy * this.size.h, length, width, {
      angle,
      density,
      restitution,
      friction,
      frictionStatic: 0,
      frictionAir,
      chamfer: { radius: width * 0.4 },
      label: `pen:${id}`,
    });
    Composite.add(this.engine.world, body);
    const pen = { id, body, skin, length, width, fx, fy, angle };
    this.pens.set(id, pen);
    return pen;
  }

  /** Put a pen back on the desk. `spawn` ({fx, fy, angle}) optionally replaces its home position. */
  resetPen(id, spawn) {
    const pen = this.pens.get(id);
    if (!pen) return;
    if (spawn) Object.assign(pen, spawn);
    Body.setPosition(pen.body, { x: pen.fx * this.size.w, y: pen.fy * this.size.h });
    Body.setAngle(pen.body, pen.angle);
    Body.setVelocity(pen.body, { x: 0, y: 0 });
    Body.setAngularVelocity(pen.body, 0);
  }

  /** Called when the desk changes size/orientation. Keeps pens on the desk and still. */
  resize(width, height) {
    const sx = width / this.size.w;
    const sy = height / this.size.h;
    this.size = { w: width, h: height };
    this._buildWalls();
    const margin = CONFIG.pen.length / 2;
    for (const { body } of this.pens.values()) {
      const x = Math.min(Math.max(body.position.x * sx, margin), width - margin);
      const y = Math.min(Math.max(body.position.y * sy, margin), height - margin);
      Body.setPosition(body, { x, y });
      Body.setVelocity(body, { x: 0, y: 0 });
      Body.setAngularVelocity(body, 0);
    }
  }

  /** Is `point` on (or within `padding` of) the pen? Uses the pen's rotated rectangle. */
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

  /**
   * Has the pen left the desk? `fullyOut`: its whole bounding box is past one edge.
   * `centerOut`: its centre of mass is past an edge (it would tip over).
   */
  penStatus(id) {
    const { body } = this.pens.get(id);
    const { min, max } = body.bounds;
    const { w, h } = this.size;
    const { x, y } = body.position;
    return {
      fullyOut: max.x < 0 || min.x > w || max.y < 0 || min.y > h,
      centerOut: x < 0 || x > w || y < 0 || y > h,
    };
  }

  allResting() {
    for (const id of this.pens.keys()) if (!this.isResting(id)) return false;
    return true;
  }

  /** Largest current speed of any pen (world units / step). */
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

  /**
   * Launch a pen.
   * @param grab  world point where the player grabbed the pen
   * @param pull  vector from the current pointer to the grab point (the way the pen should fly)
   * @returns {{power:number, speed:number}|null} null when the drag was too short
   */
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

    // Off-centre grabs make the pen spin, like flicking a real pen at one end.
    const rx = grab.x - pen.body.position.x;
    const ry = grab.y - pen.body.position.y;
    let spin = (rx * vy - ry * vx) * CONFIG.spinFactor;
    spin = Math.max(-CONFIG.maxSpin, Math.min(CONFIG.maxSpin, spin));
    Body.setAngularVelocity(pen.body, spin);

    return { power, speed };
  }

  /** Advance the simulation with a fixed time step (stable regardless of frame rate). */
  update(dtMs) {
    this.accumulator += dtMs;
    let steps = 0;
    while (this.accumulator >= CONFIG.step && steps < CONFIG.maxStepsPerFrame) {
      Engine.update(this.engine, CONFIG.step);
      this.accumulator -= CONFIG.step;
      steps++;
    }
    if (steps === CONFIG.maxStepsPerFrame) this.accumulator = 0; // drop backlog after a stall
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
    const { w, h } = this.size;
    const t = CONFIG.wallThickness;
    const opts = { isStatic: true, restitution: CONFIG.wallRestitution, friction: 0.1, label: 'wall' };
    this.walls = [
      Bodies.rectangle(w / 2, -t / 2, w + t * 2, t, opts),
      Bodies.rectangle(w / 2, h + t / 2, w + t * 2, t, opts),
      Bodies.rectangle(-t / 2, h / 2, t, h + t * 2, opts),
      Bodies.rectangle(w + t / 2, h / 2, t, h + t * 2, opts),
    ];
    Composite.add(this.engine.world, this.walls);
  }
}

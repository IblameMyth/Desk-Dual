/*
 * Canvas rendering: wooden desk + notebook paper (cached), pens, aim guide.
 * Pens are drawn from "skins", so adding a new pen look = adding an entry to PEN_SKINS.
 */
export const PEN_SKINS = {
  blue: { barrel: '#2f6bff', barrelDark: '#1b3fb8', cap: '#14267a', trim: '#ffd34d', tip: '#d5dae2', ink: '#1d3fd1' },
  red: { barrel: '#ff4a4a', barrelDark: '#b81f2a', cap: '#7a1018', trim: '#ffd34d', tip: '#d5dae2', ink: '#d31d2e' },
};

const PAPER_INSET = 36;

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class DeskRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.bg = null;
    this.world = { w: 1, h: 1 };
    this.sx = 1;
    this.sy = 1;
  }

  resize({ cssW, cssH, dpr, world }) {
    const bw = Math.round(cssW * dpr);
    const bh = Math.round(cssH * dpr);
    this.canvas.width = bw;
    this.canvas.height = bh;
    this.world = world;
    this.sx = bw / world.w;
    this.sy = bh / world.h;
    this.bg = this._buildBackground(bw, bh, world);
  }

  draw(physics, aim, { guide = true, highlight = null } = {}) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.bg, 0, 0);
    ctx.setTransform(this.sx, 0, 0, this.sy, 0, 0);
    for (const pen of physics.pens.values()) {
      const skin = PEN_SKINS[pen.skin] || PEN_SKINS.blue;
      if (pen.id === highlight) this._drawTurnRing(ctx, pen, skin);
      this._drawPen(ctx, pen, skin);
    }
    if (aim) this._drawAim(ctx, aim, guide);
  }

  _drawPen(ctx, pen, skin) {
    const { x, y } = pen.body.position;
    const L = pen.length;
    const W = pen.width;
    const h = W / 2;
    const angle = pen.body.angle;

    ctx.save();
    ctx.translate(x, y);

    // soft drop shadow (offset in screen space, so it doesn't rotate with the pen)
    ctx.save();
    ctx.translate(4, 7);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(40, 25, 10, 0.26)';
    roundRect(ctx, -L / 2, -h, L, W, h);
    ctx.fill();
    ctx.restore();

    ctx.rotate(angle);

    // barrel
    const g = ctx.createLinearGradient(0, -h, 0, h);
    g.addColorStop(0, skin.barrel);
    g.addColorStop(1, skin.barrelDark);
    ctx.fillStyle = g;
    ctx.fillRect(-L / 2 + 34, -h, L - 34 - 26, W);

    // cone + metal tip
    ctx.beginPath();
    ctx.moveTo(L / 2 - 26, -h);
    ctx.lineTo(L / 2 - 8, -3);
    ctx.lineTo(L / 2 - 8, 3);
    ctx.lineTo(L / 2 - 26, h);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(L / 2 - 8, -3);
    ctx.lineTo(L / 2, -1);
    ctx.lineTo(L / 2, 1);
    ctx.lineTo(L / 2 - 8, 3);
    ctx.closePath();
    ctx.fillStyle = skin.tip;
    ctx.fill();
    ctx.fillStyle = skin.ink;
    ctx.beginPath();
    ctx.arc(L / 2, 0, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // cap (back end) + trim ring + clip
    ctx.fillStyle = skin.cap;
    roundRect(ctx, -L / 2, -h, 40, W, h);
    ctx.fill();
    ctx.fillStyle = skin.trim;
    ctx.fillRect(-L / 2 + 36, -h, 4, W);
    ctx.fillStyle = skin.trim;
    roundRect(ctx, -L / 2 + 6, -h - 2.5, 24, 4, 2);
    ctx.fill();

    // glossy highlight
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.fillRect(-L / 2 + 44, -h + 3, L - 44 - 32, 2.5);

    ctx.restore();
  }

  /** Dashed outline around the pen whose turn it is. */
  _drawTurnRing(ctx, pen, skin) {
    ctx.save();
    ctx.translate(pen.body.position.x, pen.body.position.y);
    ctx.rotate(pen.body.angle);
    ctx.strokeStyle = skin.barrel;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 3;
    ctx.setLineDash([9, 7]);
    roundRect(ctx, -pen.length / 2 - 10, -pen.width / 2 - 10, pen.length + 20, pen.width + 20, 16);
    ctx.stroke();
    ctx.restore();
  }

  _drawAim(ctx, a, guide) {
    const color = `hsl(${Math.round(120 - 120 * a.power)} 85% 42%)`;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // pull-back line + grab ring + finger knob
    ctx.strokeStyle = 'rgba(23, 34, 74, 0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(a.grab.x, a.grab.y);
    ctx.lineTo(a.current.x, a.current.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(a.grab.x, a.grab.y, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(a.current.x, a.current.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // launch direction guide (length grows with power)
    if (guide && a.power > 0.02) {
      const len = 50 + a.power * 230;
      const ex = a.pen.x + a.dir.x * len;
      const ey = a.pen.y + a.dir.y * len;
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.setLineDash([1, 14]);
      ctx.beginPath();
      ctx.moveTo(a.pen.x, a.pen.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
      const ang = Math.atan2(a.dir.y, a.dir.x);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(ang) * 14, ey + Math.sin(ang) * 14);
      ctx.lineTo(ex + Math.cos(ang + 2.5) * 14, ey + Math.sin(ang + 2.5) * 14);
      ctx.lineTo(ex + Math.cos(ang - 2.5) * 14, ey + Math.sin(ang - 2.5) * 14);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /** Wooden desk + ruled notebook sheet, rendered once per resize. */
  _buildBackground(bw, bh, world) {
    const c = document.createElement('canvas');
    c.width = bw;
    c.height = bh;
    const g = c.getContext('2d', { alpha: false });
    g.scale(bw / world.w, bh / world.h);
    const { w, h } = world;
    const rng = mulberry32(1987);

    // wood base + grain
    const wood = g.createLinearGradient(0, 0, w, h);
    wood.addColorStop(0, '#c48a52');
    wood.addColorStop(1, '#a8703c');
    g.fillStyle = wood;
    g.fillRect(0, 0, w, h);
    g.lineWidth = 1;
    for (let i = 0; i < 120; i++) {
      const y = rng() * h;
      const amp = 2 + rng() * 6;
      const freq = 0.004 + rng() * 0.01;
      const phase = rng() * 6;
      g.strokeStyle = i % 3 === 0 ? `rgba(255,220,170,${0.05 + rng() * 0.08})` : `rgba(80,42,16,${0.05 + rng() * 0.1})`;
      g.lineWidth = 1 + rng() * 2;
      g.beginPath();
      for (let x = 0; x <= w; x += 20) {
        const yy = y + Math.sin(x * freq + phase) * amp;
        if (x === 0) g.moveTo(x, yy);
        else g.lineTo(x, yy);
      }
      g.stroke();
    }

    // notebook sheet
    const px = PAPER_INSET;
    const pw = w - PAPER_INSET * 2;
    const ph = h - PAPER_INSET * 2;
    g.save();
    g.shadowColor = 'rgba(40, 20, 5, 0.45)';
    g.shadowBlur = 18;
    g.shadowOffsetY = 5;
    g.fillStyle = '#f7faff';
    roundRect(g, px, px, pw, ph, 6);
    g.fill();
    g.restore();

    g.save();
    roundRect(g, px, px, pw, ph, 6);
    g.clip();
    g.strokeStyle = 'rgba(70, 120, 200, 0.28)';
    g.lineWidth = 1.5;
    for (let y = px + 56; y < px + ph; y += 32) {
      g.beginPath();
      g.moveTo(px, y);
      g.lineTo(px + pw, y);
      g.stroke();
    }
    g.strokeStyle = 'rgba(225, 70, 80, 0.45)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(px + 74, px);
    g.lineTo(px + 74, px + ph);
    g.stroke();
    g.fillStyle = 'rgba(110, 70, 35, 0.9)'; // binder holes show the desk through the paper
    for (const f of [0.2, 0.5, 0.8]) {
      g.beginPath();
      g.arc(px + 26, px + ph * f, 8, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();

    // desk edge lip
    g.strokeStyle = 'rgba(50, 25, 8, 0.6)';
    g.lineWidth = 12;
    g.strokeRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255, 225, 175, 0.28)';
    g.lineWidth = 2;
    g.strokeRect(7, 7, w - 14, h - 14);

    return c;
  }
}

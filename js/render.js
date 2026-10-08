/*
 * Classroom renderer: the playable desk sits in a top-down classroom scene.
 * Everything is procedural so the project stays self-contained.
 */
export const PEN_SKINS = {
  blue: { barrel: '#2d73d5', barrelDark: '#16458e', cap: '#0c2a5b', trim: '#d9e5ef', tip: '#d7dde4', ink: '#174fa8' },
  red: { barrel: '#d84b42', barrelDark: '#7f201e', cap: '#5a1517', trim: '#eadfce', tip: '#d7dde4', ink: '#8b1818' },
};

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

function fillDesk(ctx, x, y, w, h, rng, radius = 7) {
  ctx.save();
  ctx.shadowColor = 'rgba(20, 14, 8, 0.34)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 9;
  const wood = ctx.createLinearGradient(x, y, x + w, y + h);
  wood.addColorStop(0, '#a96732');
  wood.addColorStop(0.5, '#c0803f');
  wood.addColorStop(1, '#94582b');
  ctx.fillStyle = wood;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, w, h, radius);
  ctx.clip();
  for (let i = 0; i < Math.max(16, Math.round(w / 20)); i++) {
    const yy = y + rng() * h;
    const amp = 1.5 + rng() * 4;
    ctx.beginPath();
    ctx.moveTo(x - 20, yy);
    for (let xx = x; xx <= x + w + 20; xx += 20) {
      ctx.lineTo(xx, yy + Math.sin(xx * 0.018 + i) * amp);
    }
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,225,175,.10)' : 'rgba(65,35,14,.11)';
    ctx.lineWidth = 1 + rng();
    ctx.stroke();
  }
  ctx.restore();
}

function drawBackpack(ctx, x, y, w, h, color, rng) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rng() - 0.5) * 0.08);
  ctx.shadowColor = 'rgba(0,0,0,.35)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 7;
  ctx.fillStyle = color;
  roundRect(ctx, -w / 2, -h / 2, w, h, 18);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  roundRect(ctx, -w * .31, -h * .18, w * .62, h * .34, 9);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -h * .48, w * .22, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
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
    ctx.save();
    ctx.translate(4, 6);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(20,12,5,.28)';
    roundRect(ctx, -L / 2, -h, L, W, h);
    ctx.fill();
    ctx.restore();
    ctx.rotate(angle);

    const g = ctx.createLinearGradient(0, -h, 0, h);
    g.addColorStop(0, skin.barrel);
    g.addColorStop(1, skin.barrelDark);
    ctx.fillStyle = g;
    roundRect(ctx, -L / 2 + 26, -h, L - 48, W, h);
    ctx.fill();

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
    ctx.lineTo(L / 2, -1.2);
    ctx.lineTo(L / 2, 1.2);
    ctx.lineTo(L / 2 - 8, 3);
    ctx.closePath();
    ctx.fillStyle = skin.tip;
    ctx.fill();

    ctx.fillStyle = skin.cap;
    roundRect(ctx, -L / 2, -h, 31, W, h);
    ctx.fill();
    ctx.fillStyle = skin.trim;
    ctx.fillRect(-L / 2 + 28, -h, 3, W);
    ctx.fillStyle = 'rgba(255,255,255,.38)';
    ctx.fillRect(-L / 2 + 35, -h + 3, L - 67, 2);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(-L / 2 + 33, -h + 7, L - 60, 1.5);
    ctx.restore();
  }

  _drawTurnRing(ctx, pen, skin) {
    ctx.save();
    ctx.translate(pen.body.position.x, pen.body.position.y);
    ctx.rotate(pen.body.angle);
    ctx.strokeStyle = skin.barrel;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 6]);
    roundRect(ctx, -pen.length / 2 - 12, -pen.width / 2 - 12, pen.length + 24, pen.width + 24, 14);
    ctx.stroke();
    ctx.restore();
  }

  _drawAim(ctx, a, guide) {
    const color = `hsl(${Math.round(115 - 115 * a.power)} 72% 45%)`;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(40,28,17,.48)';
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 8]);
    ctx.beginPath();
    ctx.moveTo(a.grab.x, a.grab.y);
    ctx.lineTo(a.current.x, a.current.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(40,28,17,.65)';
    ctx.beginPath();
    ctx.arc(a.grab.x, a.grab.y, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(a.current.x, a.current.y, 11, 0, Math.PI * 2);
    ctx.fill();

    if (guide && a.power > 0.02) {
      const len = 45 + a.power * 250;
      const ex = a.pen.x + a.dir.x * len;
      const ey = a.pen.y + a.dir.y * len;
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.setLineDash([1, 13]);
      ctx.beginPath();
      ctx.moveTo(a.pen.x, a.pen.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  _buildBackground(bw, bh, world) {
    const c = document.createElement('canvas');
    c.width = bw;
    c.height = bh;
    const g = c.getContext('2d', { alpha: false });
    g.scale(bw / world.w, bh / world.h);
    const { w, h, playArea } = world;
    const rng = mulberry32(8024);

    // Warm classroom floor.
    g.fillStyle = '#b9b39a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.08)';
    for (let y = 0; y < h; y += 52) g.fillRect(0, y, w, 2);
    for (let x = 0; x < w; x += 58) g.fillRect(x, 0, 2, h);
    g.strokeStyle = 'rgba(65,58,42,.34)';
    g.lineWidth = 2;
    for (let y = 0; y <= h; y += 52) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let x = 0; x <= w; x += 58) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }

    // Top chalkboard.
    const boardX = w * 0.36;
    const boardY = 22;
    const boardW = w * 0.42;
    const boardH = 112;
    g.fillStyle = '#51341d';
    roundRect(g, boardX - 9, boardY - 7, boardW + 18, boardH + 15, 4);
    g.fill();
    g.fillStyle = '#17291d';
    roundRect(g, boardX, boardY, boardW, boardH, 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)';
    g.font = '14px sans-serif';
    g.fillText('STD 9-A', boardX + 24, boardY + 24);
    g.fillText('SUB : MATHS', boardX + 24, boardY + 43);
    g.font = 'bold 17px sans-serif';
    g.fillText('PEN FIGHT', boardX + boardW * .38, boardY + 62);
    g.font = '12px sans-serif';
    g.fillText('Practice makes a man perfect', boardX + boardW * .28, boardY + 84);
    g.fillStyle = '#76502c';
    g.fillRect(boardX + boardW * .34, boardY + boardH + 6, boardW * .34, 6);

    // Surrounding classroom benches/desks.
    const sideY = [150, 370, 590];
    for (const yy of sideY) {
      fillDesk(g, 20, yy, 320, 76, rng, 5);
      fillDesk(g, w - 340, yy + 15, 320, 76, rng, 5);
      g.strokeStyle = '#1d1713';
      g.lineWidth = 9;
      for (const xx of [50, 290, w - 310, w - 70]) {
        g.beginPath(); g.moveTo(xx, yy + 72); g.lineTo(xx - 28, yy + 135); g.stroke();
      }
    }
    fillDesk(g, 10, h - 72, 250, 68, rng, 5);
    fillDesk(g, w - 260, h - 72, 250, 68, rng, 5);

    // School bags beside the front desks.
    drawBackpack(g, w * .18, 245, 74, 105, '#263f68', rng);
    drawBackpack(g, w * .82, 445, 76, 108, '#6d2528', rng);

    // Central playable wooden desk.
    fillDesk(g, playArea.x, playArea.y, playArea.w, playArea.h, rng, 8);
    g.save();
    g.globalAlpha = 0.25;
    g.fillStyle = '#7a451e';
    g.font = 'bold 16px sans-serif';
    g.rotate(-0.05);
    g.fillText('9-A', playArea.x + 42, playArea.y + 160);
    g.fillText('MATHS', playArea.x + playArea.w - 92, playArea.y + 280);
    g.restore();

    // Scratches / doodles visible on the desk, matching the reference feel.
    g.save();
    g.beginPath();
    roundRect(g, playArea.x, playArea.y, playArea.w, playArea.h, 8);
    g.clip();
    for (let i = 0; i < 32; i++) {
      const x = playArea.x + rng() * playArea.w;
      const y = playArea.y + rng() * playArea.h;
      const len = 12 + rng() * 55;
      g.strokeStyle = i % 2 ? 'rgba(255,235,190,.16)' : 'rgba(70,35,12,.13)';
      g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + len * .35, y - len); g.stroke();
    }
    g.strokeStyle = 'rgba(80,42,18,.22)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(playArea.x + playArea.w * .58, playArea.y + playArea.h * .17, 13, 0, Math.PI * 2);
    g.stroke();
    g.restore();

    // Desk front lip and legs.
    g.fillStyle = '#6e3e1e';
    g.fillRect(playArea.x, playArea.y + playArea.h - 8, playArea.w, 11);
    g.strokeStyle = '#24160e';
    g.lineWidth = 12;
    g.beginPath();
    g.moveTo(playArea.x + 50, playArea.y + playArea.h); g.lineTo(playArea.x + 85, h + 25);
    g.moveTo(playArea.x + playArea.w - 50, playArea.y + playArea.h); g.lineTo(playArea.x + playArea.w - 85, h + 25);
    g.stroke();

    return c;
  }
}

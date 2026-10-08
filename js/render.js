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
  ctx.shadowColor = 'rgba(15, 9, 4, 0.52)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 14;
  const wood = ctx.createLinearGradient(x, y, x + w * 0.25, y + h);
  wood.addColorStop(0, '#9a5a29');
  wood.addColorStop(0.18, '#c27a38');
  wood.addColorStop(0.52, '#b96f32');
  wood.addColorStop(0.82, '#a25e2a');
  wood.addColorStop(1, '#7e451f');
  ctx.fillStyle = wood;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.restore();

  // Thick rounded edge / bevel gives the desk a physical 3D lip.
  ctx.save();
  roundRect(ctx, x, y, w, h, radius);
  ctx.clip();
  const edge = ctx.createLinearGradient(0, y, 0, y + h);
  edge.addColorStop(0, 'rgba(255,224,174,.30)');
  edge.addColorStop(.08, 'rgba(255,224,174,.05)');
  edge.addColorStop(.88, 'rgba(52,24,8,.02)');
  edge.addColorStop(1, 'rgba(48,23,9,.38)');
  ctx.fillStyle = edge;
  ctx.fillRect(x, y, w, h);

  // Long, irregular wood grain.
  for (let i = 0; i < Math.max(20, Math.round(w / 18)); i++) {
    const yy = y + rng() * h;
    const amp = 1.2 + rng() * 4.5;
    ctx.beginPath();
    ctx.moveTo(x - 30, yy);
    for (let xx = x; xx <= x + w + 30; xx += 18) {
      ctx.lineTo(xx, yy + Math.sin(xx * 0.015 + i * 1.7) * amp);
    }
    ctx.strokeStyle = i % 4 === 0 ? 'rgba(255,229,180,.13)' : 'rgba(55,27,10,.12)';
    ctx.lineWidth = .8 + rng() * 1.3;
    ctx.stroke();
  }

  // Small knots and worn patches.
  for (let i = 0; i < Math.max(3, Math.round(w / 130)); i++) {
    const kx = x + rng() * w;
    const ky = y + rng() * h;
    ctx.strokeStyle = 'rgba(69,32,12,.16)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(kx, ky, 7 + rng() * 13, 2 + rng() * 4, rng() * Math.PI, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Fine highlight around the tabletop perimeter.
  ctx.save();
  roundRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, Math.max(3, radius - 2));
  ctx.strokeStyle = 'rgba(255,230,186,.20)';
  ctx.lineWidth = 2;
  ctx.stroke();
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
    const k = L / 122;
    const capLen = 31 * k;
    const barrelInset = 26 * k;
    const tipInset = 8 * k;
    const trimX = 28 * k;
    const shineX = 35 * k;

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
    roundRect(ctx, -L / 2 + barrelInset, -h, L - barrelInset * 2, W, h);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(L / 2 - barrelInset, -h);
    ctx.lineTo(L / 2 - tipInset, -3 * k);
    ctx.lineTo(L / 2 - tipInset, 3 * k);
    ctx.lineTo(L / 2 - barrelInset, h);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(L / 2 - 8, -3);
    ctx.lineTo(L / 2, -1.2 * k);
    ctx.lineTo(L / 2, 1.2 * k);
    ctx.lineTo(L / 2 - tipInset, 3 * k);
    ctx.closePath();
    ctx.fillStyle = skin.tip;
    ctx.fill();

    ctx.fillStyle = skin.cap;
    roundRect(ctx, -L / 2, -h, capLen, W, h);
    ctx.fill();
    ctx.fillStyle = skin.trim;
    ctx.fillRect(-L / 2 + trimX, -h, 3 * k, W);
    ctx.fillStyle = 'rgba(255,255,255,.38)';
    ctx.fillRect(-L / 2 + shineX, -h + 3 * k, L - 67 * k, 2 * k);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(-L / 2 + 33 * k, -h + 7 * k, L - 60 * k, 1.5 * k);
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
    roundRect(ctx, -pen.length / 2 - 10, -pen.width / 2 - 10, pen.length + 20, pen.width + 20, 11);
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

    // Warm classroom floor with perspective-like plank seams and subtle variation.
    const floor = g.createLinearGradient(0, 0, 0, h);
    floor.addColorStop(0, '#c9c3aa');
    floor.addColorStop(.55, '#b5af97');
    floor.addColorStop(1, '#9d977f');
    g.fillStyle = floor;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(68,61,44,.28)';
    g.lineWidth = 1.5;
    for (let y = 0; y <= h; y += 52) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.10)';
      g.beginPath(); g.moveTo(0, y + 2); g.lineTo(w, y + 2); g.stroke();
      g.strokeStyle = 'rgba(68,61,44,.28)';
    }
    for (let x = -40; x <= w + 40; x += 58) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (x - w/2) * .05, h); g.stroke();
    }
    // Soft classroom light / window glow.
    const light = g.createRadialGradient(w * .50, h * .12, 10, w * .50, h * .12, w * .72);
    light.addColorStop(0, 'rgba(255,244,205,.20)');
    light.addColorStop(1, 'rgba(255,244,205,0)');
    g.fillStyle = light;
    g.fillRect(0, 0, w, h);

    // Top chalkboard and wall trim.
    const boardX = w * 0.405;
    const boardY = 22;
    const boardW = w * 0.38;
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

    // Tall classroom window / light panel on the opposite wall.
    const winX = w * .27, winY = 38, winW = w * .12, winH = 88;
    g.fillStyle = '#76502d';
    roundRect(g, winX - 7, winY - 7, winW + 14, winH + 14, 4);
    g.fill();
    const sky = g.createLinearGradient(winX, winY, winX, winY + winH);
    sky.addColorStop(0, '#a9d4e2'); sky.addColorStop(1, '#e7d8ae');
    g.fillStyle = sky;
    g.fillRect(winX, winY, winW, winH);
    g.strokeStyle = 'rgba(70,47,29,.55)';
    g.lineWidth = 5;
    g.beginPath(); g.moveTo(winX + winW/2, winY); g.lineTo(winX + winW/2, winY + winH); g.stroke();
    g.beginPath(); g.moveTo(winX, winY + winH/2); g.lineTo(winX + winW, winY + winH/2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.16)';
    g.fillRect(winX + 10, winY + 10, winW * .18, winH - 20);

    // Surrounding classroom benches/desks. Sized and positioned to match the reference composition.
    const sideY = [150, 365, 580];
    const sideW = 210, sideH = 62;
    const leftX = 255, rightX = w - 255 - sideW;
    for (const yy of sideY) {
      fillDesk(g, leftX, yy, sideW, sideH, rng, 5);
      fillDesk(g, rightX, yy + 15, sideW, sideH, rng, 5);
      g.strokeStyle = '#1d1713';
      g.lineWidth = 8;
      for (const xx of [leftX + 24, leftX + sideW - 24, rightX + 24, rightX + sideW - 24]) {
        g.beginPath(); g.moveTo(xx, yy + sideH + 2); g.lineTo(xx - (xx < w/2 ? 18 : -18), yy + sideH + 58); g.stroke();
      }
    }
    fillDesk(g, 250, h - 66, 165, 55, rng, 5);
    fillDesk(g, w - 415, h - 66, 165, 55, rng, 5);

    // School bags beside the front desks.
    drawBackpack(g, leftX + sideW * .76, 225, 52, 86, '#263f68', rng);
    drawBackpack(g, rightX + sideW * .25, 445, 54, 88, '#6d2528', rng);

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
    const lipY = playArea.y + playArea.h - 11;
    const lip = g.createLinearGradient(0, lipY, 0, lipY + 17);
    lip.addColorStop(0, '#8b5128');
    lip.addColorStop(.45, '#6e3e1e');
    lip.addColorStop(1, '#432612');
    g.fillStyle = lip;
    g.fillRect(playArea.x, lipY, playArea.w, 17);
    g.strokeStyle = 'rgba(255,215,160,.20)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(playArea.x, lipY + 1); g.lineTo(playArea.x + playArea.w, lipY + 1); g.stroke();
    g.strokeStyle = '#24160e';
    g.lineWidth = 14;
    g.beginPath();
    g.moveTo(playArea.x + 50, playArea.y + playArea.h); g.lineTo(playArea.x + 85, h + 25);
    g.moveTo(playArea.x + playArea.w - 50, playArea.y + playArea.h); g.lineTo(playArea.x + playArea.w - 85, h + 25);
    g.stroke();

    return c;
  }
}

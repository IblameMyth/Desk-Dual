/*
 * Classroom renderer: the playable desk sits in a top-down classroom scene.
 * Everything is procedural so the project stays self-contained.
 */
// Trimax-style ballpoint skins: transparent cap, faceted grip, metal tip
// and a narrow branded barrel. The colours remain player-specific for gameplay.
export const PEN_SKINS = {
  blue: {
    barrel: '#1671c8', barrelDark: '#0b3e78', cap: '#cfe7f5',
    trim: '#e8edf2', tip: '#b9c0c8', ink: '#0753a0', grip: '#0d5ba8'
  },
  red: {
    barrel: '#d63f38', barrelDark: '#741a1a', cap: '#f0d7d2',
    trim: '#f0e9df', tip: '#b9c0c8', ink: '#9b1515', grip: '#a72b28'
  },
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
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.bg = null;
    this.world = { w: 1, h: 1 };
    this.sx = 1;
    this.sy = 1;
    this.penImages = new Map();
    this.starterImage = null;
  }

  _getImage(src) {
    if (!src) return null;
    if (this.penImages.has(src)) return this.penImages.get(src);
    const img = new Image();
    img.onload = () => this.canvas.dispatchEvent(new Event('pen-model-loaded'));
    img.src = src;
    this.penImages.set(src, img);
    return img;
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
    const pose = pen.renderPose || { x: pen.body.position.x, y: pen.body.position.y, angle: pen.body.angle };
    const { x, y } = pose;
    const L = pen.length;
    const W = pen.width;
    const angle = pose.angle;

    ctx.save();
    ctx.translate(x, y);
    // Pens are flat on the desk: no drop/contact shadow is drawn here.
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Real photographed Reynolds Trimax pen supplied as the in-game model.
    // Keep the physics body independent from the visual texture so the pen
    // still collides as a simple, stable rectangle.
    const img = pen.asset ? this._getImage(pen.asset) : null;
    const imageReady = img && img.complete && img.naturalWidth > 0;
    // The uploaded pen photos are not all oriented the same way: some are
    // horizontal and some are vertical. Fit every model into the same
    // physical-length box while preserving its original aspect ratio.
    // Vertical source photos are rotated so the pen lies naturally on the desk.
    const sourceW = imageReady ? img.naturalWidth : L;
    const sourceH = imageReady ? img.naturalHeight : W;
    const sourceRatio = imageReady ? sourceH / sourceW : W / L;
    const portraitSource = imageReady && sourceH > sourceW * 1.25;
    const drawW = imageReady ? (portraitSource ? L * (sourceW / sourceH) : L) : L;
    const drawH = imageReady ? (portraitSource ? L : L * sourceRatio) : W;

    // No artificial pen contact shadow: the supplied pen model is rendered cleanly.
    ctx.rotate(angle);

    if (imageReady) {
      // Preserve the supplied model exactly. Portrait uploads are rotated 90°
      // so their long axis matches the physics pen. No stretching/cropping.
      ctx.imageSmoothingEnabled = true;
      if (portraitSource) {
        ctx.save();
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      } else {
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      }
    } else {
      // Loading fallback only; this is replaced automatically once the image loads.
      const h = W / 2;
      ctx.fillStyle = skin.barrel;
      roundRect(ctx, -L / 2, -h, L, W, h * .8);
      ctx.fill();
      ctx.fillStyle = skin.tip;
      ctx.beginPath();
      ctx.moveTo(L / 2, 0);
      ctx.lineTo(L / 2 - 14, -h);
      ctx.lineTo(L / 2 - 14, h);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  _drawTurnRing(ctx, pen, skin) {
    ctx.save();
    const pose = pen.renderPose || { x: pen.body.position.x, y: pen.body.position.y, angle: pen.body.angle };
    ctx.translate(pose.x, pose.y);
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

    // The match scoreboard is the single classroom blackboard in the HTML header.
    // Keep the playfield wall clean here so a duplicate board is not rendered behind the desk.

    // Tall classroom window / light panel on the opposite wall.
    const winX = w * .16, winY = 34, winW = w * .12, winH = 92;
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

    // Surrounding classroom benches/desks. The center desk is intentionally dominant.
    const sideY = [150, 370, 590];
    for (const yy of sideY) {
      fillDesk(g, 20, yy, 320, 76, rng, 5);
      fillDesk(g, w - 340, yy + 15, 320, 76, rng, 5);
      g.strokeStyle = '#1d1713';
      g.lineWidth = 9;
      for (const xx of [48, 310, w - 310, w - 48]) {
        g.beginPath(); g.moveTo(xx, yy + 84); g.lineTo(xx - (xx < w/2 ? 28 : -28), yy + 145); g.stroke();
      }
    }
    fillDesk(g, 10, h - 72, 250, 62, rng, 5);
    fillDesk(g, w - 260, h - 72, 250, 62, rng, 5);

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

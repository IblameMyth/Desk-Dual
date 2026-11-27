(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const sound = () => window.ClassroomSounds;
  const TAU = Math.PI * 2;

  /* ---------- world layout (logical canvas units) ---------- */
  const W = 400, H = 270;
  const DESK_Y = 200;                 // the line the bottle stands on
  const EDGE = 330;                   // right end of the bench
  const FLOOR_Y = 262;
  const START_X = 48, START_Y = DESK_Y - 50;
  const HW = 22, HH = 51;             // bottle half-width / half-height (bounding box)
  const DIM_UP = { hw: 22, hh: 50 };  // resting on the base
  const DIM_CAP = { hw: 10.5, hh: 52 }; // resting on the cap
  const FLIGHT_T = 0.9, APEX = 95;

  /* ---------- meter / scoring tuning ---------- */
  const SPEEDS = { slow: 0.34, normal: 0.48, fast: 0.66 };   // meter cycles per second
  const STAND_IN = 0.02;      // bright core of the green zone
  const STAND_OUT = 0.055;    // half-width of the green zone
  const CAP_AT = 0.31;        // distance from the green zone to the gold zone
  const CAP_HALF = 0.03;      // half-width of the gold zone
  const OVERPOWER = 0.965;    // above this the bottle leaves the desk

  const stage = $('stage');
  const cv = $('bf-canvas');
  const ctx = cv.getContext('2d');

  /* ---------- state ---------- */
  const state = {
    mode: null, level: 'easy', speed: 'normal', players: [], flips: 3, first: 0,
    seq: [], idx: 0, scores: [0, 0], logs: [[], []], sudden: false,
    phase: 'idle',        // idle | ready | aim | flight | settle | over
    turnPlayer: 0, turn: null, plan: null, t: 0, timers: [], done: false
  };
  const bottle = { x: START_X, y: START_Y, th: 0, omega: 0, amp: 1.5, ph: 0, held: true };
  let particles = [];
  let raf = 0, lastTs = 0;
  let bg = null, k = 1, dpr = 1;
  let scoreEls = [];

  document.addEventListener('pointerdown', () => sound()?.unlock(), { once: true });
  document.addEventListener('click', event => {
    if (event.target.closest('button, a')) sound()?.tap();
  });

  /* ---------- helpers ---------- */
  function mk(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function later(fn, ms) {
    const id = setTimeout(() => {
      state.timers = state.timers.filter(t => t !== id);
      fn();
    }, ms);
    state.timers.push(id);
  }
  function clearTimers() { state.timers.forEach(clearTimeout); state.timers = []; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function gauss() {
    const u = 1 - Math.random();
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  }
  function fairRand() {
    if (window.crypto && window.crypto.getRandomValues) {
      const v = new Uint32Array(1);
      window.crypto.getRandomValues(v);
      return v[0] / 4294967296;
    }
    return Math.random();
  }
  function fairCoin() { return fairRand() < 0.5 ? 'heads' : 'tails'; }
  function buzz(ms) {
    try {
      const s = JSON.parse(localStorage.getItem('deskduel.settings.v1') || '{}');
      if (s.vibration !== false && navigator.vibrate) navigator.vibrate(ms);
    } catch (_) { /* ignore */ }
  }
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function showPanel(id) {
    ['setup-ai', 'setup-friends', 'toss-panel', 'game-panel', 'result-panel'].forEach(panel =>
      $(panel).classList.toggle('hidden', panel !== id));
  }
  function openPlay(id) {
    clearTimers();
    stopLoop();
    $('main-menu').classList.add('hidden');
    $('play-area').classList.remove('hidden');
    showPanel(id);
  }

  /* ======================================================================
     Geometry helpers
     ====================================================================== */
  function ext(th) { return HH * Math.abs(Math.cos(th)) + HW * Math.abs(Math.sin(th)); }

  // Centre of the bottle (relative to the contact surface) when it is tilted by phi
  // about the bottom corner on the side it leans towards.
  function poseTilt(xb, phi, d) {
    const s = phi < 0 ? -1 : 1;
    const px = xb + s * d.hw;
    const vx = -s * d.hw, vy = -d.hh;
    const c = Math.cos(phi), sn = Math.sin(phi);
    return { x: px + vx * c - vy * sn, y: vx * sn + vy * c };
  }
  // nearest angle at which the bottle lies on its side
  function nearestLying(th) {
    const n = Math.round((th / TAU - 0.25) / 0.5);
    return TAU * (0.25 + 0.5 * n);
  }

  /* ======================================================================
     Judging a flip and planning its animation
     ====================================================================== */
  function judge(p, c, g) {
    const d = p - c, ad = Math.abs(d);
    if (p >= OVERPOWER) return { kind: 'overpower', d, base: 'up' };
    if (ad <= STAND_OUT) {
      const chance = ad <= STAND_IN ? 0.96 : 0.72;
      return { kind: Math.random() < chance ? 'stand' : 'tip', d, base: 'up' };
    }
    if (Math.abs(p - g) <= CAP_HALF) {
      return { kind: Math.random() < 0.55 ? 'cap' : 'tip', d, base: 'cap' };
    }
    if (ad <= 0.09) return { kind: 'tip', d, base: 'up' };
    return { kind: 'flat', d, base: 'up' };
  }

  function finishFlat(plan) {
    const L = nearestLying(plan.thL);
    const dx1 = HW * (L - plan.thL);
    const dir = Math.abs(L - plan.thL) < 0.05 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(L - plan.thL);
    let roll = (10 + 30 * Math.random()) * dir;
    let xf = plan.xl + dx1 + roll;
    if (plan.kind !== 'overpower') plan.kind = 'flat';
    plan.yl = plan.surf - ext(plan.thL);
    plan.L = L; plan.dx1 = dx1; plan.roll = roll;
    if (plan.surf === DESK_Y && xf > EDGE - 6) {
      plan.kind = 'rolloff';
      plan.sim = simRollOff(plan);
      return plan;
    }
    if (xf > 374) roll -= xf - 374;
    if (xf < 24) roll += 24 - xf;
    plan.roll = roll;
    return plan;
  }

  function simRollOff(plan) {
    const out = [];
    const dt = 1 / 60, T1 = 0.4;
    for (let t = 0; t < T1; t += dt) {
      const e = 1 - Math.pow(1 - t / T1, 3);
      const th = plan.thL + (plan.L - plan.thL) * e;
      out.push({ x: plan.xl + plan.dx1 * 0.6 * e, y: DESK_Y - ext(th), th });
    }
    let x = plan.xl + plan.dx1 * 0.6, th = plan.L, y = DESK_Y - ext(th);
    let vx = 95 + Math.random() * 30, vy = 0, om = 0.6, fell = false, restT = 0;
    for (let i = 0; i < 360 && restT < 0.3; i++) {
      if (!fell) {
        x += vx * dt; th += om * dt * 0.25; y = DESK_Y - ext(th);
        if (x >= EDGE) { fell = true; vy = 0; om = 2.4; }
      } else {
        vy += 900 * dt; y += vy * dt; x += vx * dt * 0.9; th += om * dt;
        const floorY = FLOOR_Y - ext(th);
        if (y >= floorY) {
          y = floorY;
          if (vy > 80) { vy = -vy * 0.3; vx *= 0.5; om *= 0.5; }
          else { vy = 0; vx *= 0.8; om *= 0.8; restT += dt; }
        }
      }
      x = Math.min(x, 376);
      out.push({ x, y, th });
    }
    const last = out[out.length - 1];
    const L2 = nearestLying(last.th);
    for (let i = 1; i <= 18; i++) {
      const e = i / 18, t2 = last.th + (L2 - last.th) * e;
      out.push({ x: last.x, y: FLOOR_Y - ext(t2), th: t2 });
    }
    return out;
  }

  function buildPlan(p, c, g) {
    const j = judge(p, c, g);
    const R = 1 + (p - c) * 1.6;
    const thL = TAU * R;
    const plan = { p, R, thL, kind: j.kind, xl: 120 + 170 * p, surf: DESK_Y };
    if (j.kind === 'overpower') { plan.xl = EDGE + 36; plan.surf = FLOOR_Y; plan.apex = 150; plan.late = true; return finishFlat(plan); }
    if (j.kind === 'flat') return finishFlat(plan);

    const cap = j.base === 'cap';
    const dim = cap ? DIM_CAP : DIM_UP;
    const thR = cap ? Math.PI * Math.round(R * 2) : TAU * Math.round(R);
    let alpha = clamp(thL - thR, -1, 1);
    plan.dim = dim; plan.thR = thR;
    if (j.kind === 'tip') {
      const s0 = Math.abs(alpha) < 0.1 ? (j.d >= 0 ? 1 : -1) : Math.sign(alpha);
      if (Math.abs(alpha) < 0.12) alpha = s0 * 0.12;
      plan.s0 = s0;
      plan.phiT = s0 * Math.PI / 2;
    }
    plan.alpha = alpha;
    const o = poseTilt(0, alpha, dim);
    plan.xBase = plan.xl - o.x;
    plan.yl = DESK_Y + o.y;
    if (j.kind === 'tip' && poseTilt(plan.xBase, plan.phiT, dim).x > EDGE - 6) return finishFlat(plan);
    return plan;
  }

  /* ---------- poses ---------- */
  function flightPose(plan, t) {
    const s = Math.min(1, t / FLIGHT_T);
    const sy = plan.late ? s * s : s;
    return {
      x: START_X + (plan.xl - START_X) * s,
      y: START_Y + (plan.yl - START_Y) * sy - 4 * (plan.apex || APEX) * s * (1 - s),
      th: TAU * plan.R * s
    };
  }

  function settlePose(plan, t) {
    switch (plan.kind) {
      case 'stand':
      case 'cap': {
        const phi = plan.alpha * Math.exp(-3.4 * t) * Math.cos(13 * t);
        const hop = t < 0.16 ? 8 * Math.sin(Math.PI * t / 0.16) : 0;
        const o = poseTilt(plan.xBase, phi, plan.dim);
        return { x: o.x, y: DESK_Y + o.y - hop, th: plan.thR + phi, done: t >= 1.4 };
      }
      case 'tip': {
        const s = plan.s0, a = plan.alpha, T0 = 0.3;
        let phi;
        if (t < T0) {
          phi = a + s * 0.06 * Math.sin(t * 26);
        } else {
          const u = Math.min(1, (t - T0) / 0.7);
          phi = a + (plan.phiT - a) * u * u * u;
          if (t > T0 + 0.7) phi = plan.phiT - s * 0.09 * Math.exp(-10 * (t - T0 - 0.7)) * Math.abs(Math.sin(26 * (t - T0 - 0.7)));
        }
        const o = poseTilt(plan.xBase, phi, plan.dim);
        const th = plan.thR + phi;
        return { x: o.x, y: Math.min(DESK_Y + o.y, DESK_Y - ext(th)), th, done: t >= 1.6 };
      }
      case 'flat':
      case 'overpower': {
        const t1 = 0.5;
        let x, th;
        if (t < t1) {
          const e = 1 - Math.pow(1 - t / t1, 3);
          th = plan.thL + (plan.L - plan.thL) * e;
          x = plan.xl + plan.dx1 * e;
        } else {
          const u = Math.min(1, (t - t1) / 1.0), e = 1 - (1 - u) * (1 - u);
          x = plan.xl + plan.dx1 + plan.roll * e;
          th = plan.L + Math.sign(plan.roll || 1) * 0.1 * Math.sin(e * Math.PI);
        }
        x = clamp(x, 24, 374);
        return { x, y: plan.surf - ext(th), th, done: t >= 1.5 };
      }
      case 'rolloff': {
        const i = Math.min(plan.sim.length - 1, Math.floor(t * 60));
        const q = plan.sim[i];
        return { x: q.x, y: q.y, th: q.th, done: i >= plan.sim.length - 1 && t > plan.sim.length / 60 + 0.25 };
      }
      default:
        return { x: plan.xl, y: plan.yl, th: plan.thL, done: true };
    }
  }

  const KIND_INFO = {
    stand: { text: 'STANDING! +1', cls: 'good', pts: 1, pip: 'stand', mark: '✓' },
    cap: { text: 'CAP LANDING! +3', cls: 'gold', pts: 3, pip: 'cap', mark: '★' },
    tip: { text: 'TIPPED OVER', cls: 'bad', pts: 0, pip: 'miss', mark: '✗' },
    flat: { text: 'LANDED FLAT', cls: 'bad', pts: 0, pip: 'miss', mark: '✗' },
    overpower: { text: 'OFF THE DESK!', cls: 'bad', pts: 0, pip: 'miss', mark: '✗' },
    rolloff: { text: 'ROLLED OFF!', cls: 'bad', pts: 0, pip: 'miss', mark: '✗' }
  };

  /* ======================================================================
     Turn flow
     ====================================================================== */
  function meterAt(ph) {
    const f = ph - Math.floor(ph);
    return f < 0.5 ? f * 2 : 2 - f * 2;
  }

  function setZones(c, g) {
    const ok = $('zone-ok'), cap = $('zone-cap');
    ok.style.left = ((c - STAND_OUT) * 100).toFixed(2) + '%';
    ok.style.width = (STAND_OUT * 200).toFixed(2) + '%';
    ok.firstElementChild.style.width = (STAND_IN / STAND_OUT * 100).toFixed(1) + '%';
    cap.style.left = ((g - CAP_HALF) * 100).toFixed(2) + '%';
    cap.style.width = (CAP_HALF * 200).toFixed(2) + '%';
  }
  function setMarker(p) { $('marker').style.left = (p * 100).toFixed(2) + '%'; }

  function flipNumber(i) { return state.logs[i].length + 1; }

  function updateTurnUi() {
    const i = state.turnPlayer, pl = state.players[i];
    const label = state.sudden && state.logs[i].length >= state.flips
      ? 'SUDDEN DEATH'
      : 'FLIP ' + flipNumber(i) + ' OF ' + state.flips;
    $('round-label').textContent = label;
    $('turn-chip').textContent = pl.name + ' · ' + label;
    $('turn-chip').classList.remove('is-turn');
    $('turn-title').textContent = pl.ai ? pl.name + ' is lining up the flip…' : pl.name + ', flip the bottle!';
    $('turn-description').textContent = pl.ai
      ? 'Watch the marker. The AI will tap when it thinks it is in the green zone.'
      : 'Tap FLIP when the marker is inside the green zone.';
    $('flip-hint').textContent = pl.ai ? 'The AI is aiming…' : 'Press FLIP, tap the desk, or hit the space bar.';
    renderScores();
    renderLog();
  }

  function startTurn() {
    clearTimers();
    hideBanner();
    $('continue-round').classList.add('hidden');
    const i = state.seq[state.idx];
    state.turnPlayer = i;
    const pl = state.players[i];
    const c = 0.36 + Math.random() * 0.28;
    const g = c < 0.5 ? c + CAP_AT : c - CAP_AT;
    const T = { c, g, f: SPEEDS[state.speed] || SPEEDS.normal, ph0: Math.random(), el: 0, p: 0, prev: null, ai: pl.ai, aiTarget: 0, aiAfter: 0 };
    if (pl.ai) {
      const sd = state.level === 'hard' ? 0.028 : 0.075;
      let target = c + gauss() * sd;
      if (state.level === 'hard' && Math.random() < 0.1) target = g + gauss() * 0.015;
      T.aiTarget = clamp(target, 0.03, 0.96);
      T.aiAfter = 0.9 + Math.random() * 0.8;
    }
    state.turn = T; state.plan = null; state.phase = 'ready';
    Object.assign(bottle, { x: START_X, y: START_Y, th: 0, omega: 0, amp: 1.5, held: true });
    particles = [];
    T.p = meterAt(T.ph0);
    setZones(c, g);
    setMarker(T.p);
    $('flip-btn').disabled = true;
    updateTurnUi();
    if (state.sudden && state.logs[i].length === state.flips) showBanner('SUDDEN DEATH!', 'gold', 1300);
    later(() => {
      if (state.turn !== T) return;
      state.phase = 'aim';
      $('turn-chip').classList.add('is-turn');
      $('flip-btn').disabled = pl.ai;
    }, state.sudden && state.logs[i].length === state.flips ? 1100 : 650);
  }

  function doFlip(source) {
    if (state.phase !== 'aim') return;
    const T = state.turn;
    if (T.ai && source !== 'ai') return;
    state.phase = 'flight';
    state.t = 0;
    $('flip-btn').disabled = true;
    $('turn-chip').classList.remove('is-turn');
    $('turn-chip').textContent = state.players[state.turnPlayer].name + ' · FLIP!';
    state.plan = buildPlan(T.p, T.c, T.g);
    bottle.held = false;
    sound()?.page?.();
  }

  function land() {
    const plan = state.plan;
    state.phase = 'settle';
    state.t = 0;
    sound()?.desk?.();
    buzz(plan.kind === 'stand' || plan.kind === 'cap' ? 30 : 18);
    const sx = plan.xl, sy = plan.surf;
    if (plan.kind === 'stand' || plan.kind === 'cap') {
      spawn(sx, sy - 10, 18, ['#ffe38a', '#8fd3a0', '#f4e5bf', '#a8d0f0', '#f08a7a'], 150, true);
    } else {
      spawn(sx, sy - 2, 10, ['rgba(150,118,80,.7)', 'rgba(190,160,120,.6)'], 70, false);
    }
  }

  function finishTurn() {
    const i = state.turnPlayer, plan = state.plan, info = KIND_INFO[plan.kind];
    state.phase = 'over';
    state.scores[i] += info.pts;
    state.logs[i].push({ pip: info.pip, mark: info.mark, kind: plan.kind });
    renderScores(true, i);
    renderLog();
    showBanner(info.text, info.cls, 1700);
    if (info.pts > 0) sound()?.win?.(); else sound()?.lose?.();
    if (info.pts === 0) {
      stage.classList.remove('shake');
      void stage.offsetWidth;
      stage.classList.add('shake');
    }

    // what happens next?
    const nextIdx = state.idx + 1;
    let step = 'turn';
    if (nextIdx >= state.seq.length) step = state.scores[0] === state.scores[1] ? 'sudden' : 'end';
    const advance = () => {
      state.idx = nextIdx;
      if (step === 'sudden') { state.sudden = true; state.seq.push(state.first, 1 - state.first); }
      if (step === 'end') finishMatch(); else startTurn();
    };
    if (step === 'end') { later(advance, 2000); return; }
    if (state.mode === 'ai') { later(advance, 1900); return; }
    const nextName = state.players[step === 'sudden' ? state.first : state.seq[nextIdx]].name;
    const btn = $('continue-round');
    btn.textContent = 'PASS TO ' + nextName.toUpperCase() + ' →';
    btn.classList.remove('hidden');
    btn.onclick = () => { btn.onclick = null; advance(); };
  }

  function beginMatch(first) {
    clearTimers();
    state.first = first;
    state.seq = [];
    for (let n = 0; n < state.flips; n++) state.seq.push(first, 1 - first);
    state.idx = 0;
    state.scores = [0, 0];
    state.logs = [[], []];
    state.sudden = false;
    state.done = false;
    showPanel('game-panel');
    const now = new Date();
    $('bf-board-date').textContent = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0');
    $('target-label').textContent = state.flips + ' FLIPS EACH';
    layout();
    startLoop();
    startTurn();
    requestAnimationFrame(layout);
  }

  function startMatch(mode, players, flips, level, speed) {
    clearTimers();
    Object.assign(state, { mode, players, flips, level, speed });
    openPlay('toss-panel');
    if (mode === 'ai') showTossAi(); else showTossFriends();
  }

  /* ======================================================================
     Scoreboard, banner, flip log
     ====================================================================== */
  function renderScores(pop, who) {
    const box = $('score-list');
    box.textContent = '';
    scoreEls = [];
    state.players.forEach((p, i) => {
      const active = state.turnPlayer === i && state.phase !== 'over';
      const d = mk('div', 'bf-st' + (active ? ' is-active' : ''));
      const sc = mk('span', 'bf-st-score', String(state.scores[i]));
      if (pop && who === i) sc.classList.add('pop');
      d.append(mk('span', 'bf-st-name', p.name), sc);
      box.appendChild(d);
      scoreEls.push(sc);
    });
  }

  function renderLog() {
    const box = $('flip-log');
    box.textContent = '';
    state.players.forEach((p, i) => {
      const total = Math.max(state.flips, state.seq.filter(x => x === i).length);
      const row = mk('div', 'bf-log-row' + (state.turnPlayer === i && state.phase !== 'over' ? ' is-active' : ''));
      row.appendChild(mk('span', 'bf-log-name', p.name));
      const pips = mk('div', 'bf-pips');
      for (let n = 0; n < total; n++) {
        const r = state.logs[i][n];
        let el;
        if (r) el = mk('span', 'bf-pip ' + r.pip, r.mark);
        else if (n === state.logs[i].length && state.turnPlayer === i && state.phase !== 'over' && state.phase !== 'idle') el = mk('span', 'bf-pip next', '•');
        else el = mk('span', 'bf-pip', '·');
        if (n >= state.flips) el.classList.add('sd');
        pips.appendChild(el);
      }
      row.appendChild(pips);
      box.appendChild(row);
    });
  }

  let bannerTimer = 0;
  function showBanner(text, cls, ms) {
    const b = $('banner');
    clearTimeout(bannerTimer);
    b.textContent = text;
    b.className = 'bf-banner ' + (cls || '') + ' show';
    bannerTimer = setTimeout(hideBanner, ms || 1500);
  }
  function hideBanner() {
    clearTimeout(bannerTimer);
    $('banner').classList.remove('show');
  }

  /* ======================================================================
     Coin toss (winner flips first)
     ====================================================================== */
  function showToss(title, copy, parts) {
    const box = $('toss-stage');
    box.textContent = '';
    const card = mk('div', 'bf-toss-card');
    card.append(mk('h2', '', title), mk('p', 'khc-muted', copy), ...parts);
    box.appendChild(card);
  }
  function callOptions(onPick) {
    const wrap = mk('div', 'bf-toss-options');
    ['heads', 'tails'].forEach(c => {
      const b = mk('button', '', c.toUpperCase());
      b.type = 'button';
      b.addEventListener('click', () => {
        wrap.querySelectorAll('button').forEach(x => x.classList.remove('selected'));
        b.classList.add('selected');
        onPick(c);
      });
      wrap.appendChild(b);
    });
    return wrap;
  }
  function makeCoin() {
    const wrap = mk('div', 'bf-coin-wrap');
    const coin = mk('div', 'bf-coin');
    const face = mk('div', 'bf-coin-face', '2');
    coin.appendChild(face);
    wrap.appendChild(coin);
    return { wrap, coin, face };
  }
  function flipCoin(c, done) {
    const result = fairCoin();
    c.coin.classList.add('flip');
    c.face.textContent = result.toUpperCase();
    sound()?.bell?.();
    later(() => done(result), 1200);
  }
  function actionButton(label, onClick, disabled) {
    const b = mk('button', 'btn btn-primary bf-go', label);
    b.type = 'button';
    b.disabled = !!disabled;
    b.addEventListener('click', onClick);
    return b;
  }
  function showTossAi() {
    let call = null;
    const coin = makeCoin();
    const go = actionButton('TOSS COIN', () => {
      go.disabled = true;
      opts.querySelectorAll('button').forEach(x => { x.disabled = true; });
      flipCoin(coin, result => tossWon(call === result ? 0 : 1, result));
    }, true);
    const opts = callOptions(c => { call = c; go.disabled = false; });
    showToss('Coin toss', state.players[0].name + ', call heads or tails. The winner flips first.', [opts, coin.wrap, go]);
  }
  function showTossFriends() {
    let call = null;
    const next = actionButton('PASS TO ' + state.players[1].name.toUpperCase(), () => {
      const coin = makeCoin();
      const go = actionButton('TOSS COIN', () => {
        go.disabled = true;
        flipCoin(coin, result => tossWon(call === result ? 0 : 1, result));
      });
      showToss(state.players[1].name + ', toss the coin', state.players[0].name + ' called ' + call.toUpperCase() + '. Tap to toss.', [coin.wrap, go]);
    }, true);
    const opts = callOptions(c => { call = c; next.disabled = false; });
    showToss(state.players[0].name + ' calls the toss', 'Pick heads or tails, then pass the phone. The winner flips first.', [opts, next]);
  }
  function tossWon(winner, result) {
    const name = state.players[winner].name;
    showToss(name + ' won the toss!', 'The coin shows ' + result.toUpperCase() + '. ' + name + ' flips first.',
      [actionButton('START GAME', () => beginMatch(winner))]);
    sound()?.win?.();
  }

  /* ======================================================================
     Final result
     ====================================================================== */
  function finishMatch() {
    state.done = true;
    stopLoop();
    showPanel('result-panel');
    const [a, b] = state.scores;
    const w = a > b ? 0 : 1;
    const win = state.players[w];
    if (window.DeskStats) {
      let run = 0, best = 0, good = 0;
      state.logs[0].forEach((r) => { if (r.kind === 'stand' || r.kind === 'cap') { good++; run++; best = Math.max(best, run); } else run = 0; });
      window.DeskStats.record('bottle-flip', { inc: { successfulFlips: good }, max: { bestStreak: best } });
    }
    $('match-result-title').textContent = (state.mode === 'ai' && win.ai) ? 'The AI wins!' : win.name + ' wins!';
    $('match-result-copy').textContent = state.mode === 'ai' && win.ai
      ? 'Steady hands this time. Ask for a rematch!'
      : 'What a flip session! The bench goes wild.';
    const box = $('final-score');
    box.textContent = '';
    state.players.forEach((p, i) => {
      const stands = state.logs[i].filter(r => r.kind === 'stand').length;
      const caps = state.logs[i].filter(r => r.kind === 'cap').length;
      const d = mk('div', i === w ? 'is-winner' : '');
      d.append(mk('span', '', p.name), mk('strong', '', String(state.scores[i])),
        mk('small', '', stands + ' stand' + (stands === 1 ? '' : 's') + ' · ' + caps + ' cap' + (caps === 1 ? '' : 's')));
      box.appendChild(d);
    });
    $('final-foot').textContent = 'STD 9-A · ' + state.flips + ' FLIPS EACH' + (state.sudden ? ' · SUDDEN DEATH' : '');
    sound()?.win?.();
  }

  /* ======================================================================
     Drawing
     ====================================================================== */
  function layout() {
    const w = stage.clientWidth;
    if (!w) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cw = Math.round(w * dpr);
    const ch = Math.round(w * H / W * dpr);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    k = cv.width / W;
    bg = null;
  }
  window.addEventListener('resize', () => { if (!$('game-panel').classList.contains('hidden')) layout(); });
  window.addEventListener('orientationchange', () => later(layout, 250));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { bg = null; });

  function drawBg(c) {
    // wall with notebook rules
    c.fillStyle = '#e6dabb'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(70,92,111,.17)'; c.lineWidth = 1;
    for (let y = 14; y < 188; y += 22) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.strokeStyle = 'rgba(171,65,55,.3)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(18, 0); c.lineTo(18, 190); c.stroke();

    // little blackboard on the wall
    c.fillStyle = '#79512f'; rr(c, 226, 14, 156, 66, 4); c.fill();
    c.fillStyle = '#1c392d'; rr(c, 232, 20, 144, 54, 2); c.fill();
    c.fillStyle = '#f4e5bf'; c.textAlign = 'center';
    c.font = '17px "Lilita One","Trebuchet MS",sans-serif';
    c.fillText('LUNCH BREAK', 304, 43);
    c.font = '800 10px Nunito,"Trebuchet MS",sans-serif';
    c.fillStyle = '#e8cf91';
    c.fillText('FLIP • STAND • WIN', 304, 62);
    c.textAlign = 'left';
    c.fillStyle = '#d2b77c'; c.fillRect(236, 70, 22, 3);       // chalk tray bit
    c.fillStyle = '#f4e5bf'; c.fillRect(242, 67, 8, 3);

    // pencil on the bench
    c.save(); c.translate(86, 193); c.rotate(-0.06);
    c.fillStyle = '#f2cf53'; c.fillRect(0, -3, 44, 6);
    c.fillStyle = '#3a2616'; c.fillRect(0, -3, 44, 1.2); c.fillRect(0, 1.8, 44, 1.2);
    c.fillStyle = '#e9c9a0'; c.beginPath(); c.moveTo(44, -3); c.lineTo(52, 0); c.lineTo(44, 3); c.fill();
    c.fillStyle = '#2b2b2b'; c.beginPath(); c.moveTo(49.5, -1); c.lineTo(52, 0); c.lineTo(49.5, 1); c.fill();
    c.fillStyle = '#e88c8c'; c.fillRect(-6, -3, 6, 6);
    c.restore();

    // floor + under-bench shadow
    c.fillStyle = '#d6c9a6'; c.fillRect(0, FLOOR_Y - 26, W, 26);
    c.fillStyle = '#8c6a45'; c.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
    c.fillStyle = '#6e5232'; c.fillRect(0, FLOOR_Y, W, 2);
    c.fillStyle = 'rgba(40,24,10,.12)'; c.fillRect(0, 236, EDGE, FLOOR_Y - 236);

    // bench legs
    c.fillStyle = '#59656f'; c.fillRect(26, 232, 8, FLOOR_Y - 232); c.fillRect(EDGE - 44, 232, 8, FLOOR_Y - 232);
    c.fillStyle = '#7b8791'; c.fillRect(26, 232, 3, FLOOR_Y - 232); c.fillRect(EDGE - 44, 232, 3, FLOOR_Y - 232);

    // bench: top face + front face
    c.fillStyle = '#e0b076';
    c.beginPath(); c.moveTo(0, 188); c.lineTo(EDGE - 8, 188); c.lineTo(EDGE, 212); c.lineTo(0, 212); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(122,78,36,.28)'; c.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const y = 191 + i * 2.6;
      c.beginPath(); c.moveTo(0, y); c.lineTo(EDGE - 6 + (y - 188) * 0.08, y); c.stroke();
    }
    c.fillStyle = '#a8743c'; c.fillRect(0, 212, EDGE, 22);
    c.fillStyle = '#8a5a2f'; c.fillRect(0, 230, EDGE, 4);
    c.fillStyle = '#f0c895'; c.fillRect(0, 211, EDGE, 2);
    c.fillStyle = '#a8743c';
    c.beginPath(); c.moveTo(EDGE, 212); c.lineTo(EDGE + 2, 218); c.lineTo(EDGE + 2, 234); c.lineTo(EDGE, 234); c.closePath(); c.fill();
    c.fillStyle = 'rgba(60,36,16,.5)';
    c.font = '900 10px Nunito,"Trebuchet MS",sans-serif';
    c.fillText('STD 9-A', 40, 227);
    c.fillText('✎ BENCH 3', 250, 227);
  }

  function drawBottle(c, b, shadowSurf) {
    // shadow on whatever surface is below
    const height = Math.max(0, shadowSurf - b.y - HH);
    const sa = clamp(0.28 - height / 700, 0.05, 0.28);
    c.fillStyle = 'rgba(40,24,10,' + sa.toFixed(3) + ')';
    c.beginPath();
    c.ellipse(b.x, shadowSurf + 1, clamp(26 - height / 14, 10, 26), 4, 0, 0, TAU);
    c.fill();

    c.save();
    c.translate(b.x, b.y);
    c.rotate(b.th);

    // glass body
    bottlePath(c);
    c.fillStyle = 'rgba(214,236,250,.38)';
    c.fill();

    // water + label, clipped to the bottle
    c.save();
    bottlePath(c);
    c.clip();
    c.save();
    c.rotate(-b.th + b.omega);
    const lvl = 10;
    c.beginPath();
    c.moveTo(-90, lvl);
    for (let x = -90; x <= 90; x += 6) c.lineTo(x, lvl + b.amp * Math.sin(x * 0.12 + b.ph));
    c.lineTo(90, 140); c.lineTo(-90, 140); c.closePath();
    const g = c.createLinearGradient(0, lvl, 0, lvl + 60);
    g.addColorStop(0, 'rgba(96,170,232,.94)');
    g.addColorStop(1, 'rgba(44,108,178,.96)');
    c.fillStyle = g;
    c.fill();
    c.restore();
    // paper label
    c.fillStyle = '#f6edda'; c.fillRect(-24, -14, 48, 20);
    c.fillStyle = '#a83232'; c.fillRect(-24, -14, 48, 3); c.fillRect(-24, 3, 48, 3);
    c.fillStyle = '#284638';
    c.font = '900 10px Nunito,"Trebuchet MS",sans-serif';
    c.textAlign = 'center';
    c.fillText('9-A', 0, 0);
    c.textAlign = 'left';
    c.restore();

    // glass highlight + outline
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-15, 12); c.lineTo(-15, 38); c.stroke();
    c.beginPath(); c.moveTo(-14, -22); c.lineTo(-12, -16); c.stroke();
    bottlePath(c);
    c.strokeStyle = '#4a6d8a'; c.lineWidth = 2.5; c.lineJoin = 'round';
    c.stroke();

    // cap + ring
    c.fillStyle = '#9fc3e0'; c.fillRect(-11, -44, 22, 3.5);
    c.strokeStyle = '#4a6d8a'; c.lineWidth = 1.5; c.strokeRect(-11, -44, 22, 3.5);
    c.fillStyle = '#32609a'; rr(c, -10.5, -52, 21, 9, 2); c.fill();
    c.strokeStyle = '#193b65'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1;
    for (let x = -6; x <= 6; x += 4) { c.beginPath(); c.moveTo(x, -50.5); c.lineTo(x, -45); c.stroke(); }

    if (b.held) drawHand(c);
    c.restore();
  }

  function bottlePath(c) {
    c.beginPath();
    c.moveTo(-9, -44);
    c.lineTo(-9, -36);
    c.bezierCurveTo(-9, -28, -22, -26, -22, -14);
    c.lineTo(-22, 40);
    c.quadraticCurveTo(-22, 50, -12, 50);
    c.lineTo(12, 50);
    c.quadraticCurveTo(22, 50, 22, 40);
    c.lineTo(22, -14);
    c.bezierCurveTo(22, -26, 9, -28, 9, -36);
    c.lineTo(9, -44);
    c.closePath();
  }

  function drawHand(c) {
    // sleeve cuff
    c.fillStyle = '#f6f2e8'; rr(c, -24, 34, 48, 18, 4); c.fill();
    c.strokeStyle = '#9b8f78'; c.lineWidth = 2; c.stroke();
    // palm + fingers
    c.fillStyle = '#e8b48c'; rr(c, -27, 10, 54, 26, 9); c.fill();
    c.strokeStyle = '#9b6a45'; c.lineWidth = 2; c.stroke();
    c.beginPath();
    [-9, 0, 9].forEach(x => { c.moveTo(x, 13); c.lineTo(x, 31); });
    c.stroke();
    // thumb
    c.save(); c.translate(-27, 12); c.rotate(-0.5);
    c.fillStyle = '#e8b48c'; c.beginPath(); c.ellipse(0, 0, 7, 12, 0, 0, TAU); c.fill(); c.stroke();
    c.restore();
  }

  function spawn(x, y, n, colors, speed, stars) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.1 + 0.8 * Math.random());
      const v = speed * (0.4 + Math.random() * 0.8);
      particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.6 + Math.random() * 0.5,
        size: stars ? 3 + Math.random() * 3 : 3 + Math.random() * 5,
        color: colors[i % colors.length], stars, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 10
      });
    }
  }
  function drawParticles(c) {
    particles.forEach(p => {
      const a = 1 - p.life / p.max;
      if (a <= 0) return;
      c.globalAlpha = clamp(a, 0, 1);
      c.fillStyle = p.color;
      if (p.stars) {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        c.restore();
      } else {
        c.beginPath(); c.arc(p.x, p.y, p.size * (1.2 - a * 0.5), 0, TAU); c.fill();
      }
    });
    c.globalAlpha = 1;
  }

  function draw() {
    if (!cv.width) return;
    if (!bg) {
      bg = document.createElement('canvas');
      bg.width = cv.width; bg.height = cv.height;
      const bc = bg.getContext('2d');
      bc.setTransform(k, 0, 0, k, 0, 0);
      drawBg(bc);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    let surf = DESK_Y;
    if (state.plan && (state.phase === 'flight' || state.phase === 'settle' || state.phase === 'over')) {
      if (bottle.x > EDGE + 2) surf = FLOOR_Y;
    }
    drawBottle(ctx, bottle, surf);
    drawParticles(ctx);
  }

  /* ======================================================================
     Main loop
     ====================================================================== */
  function update(dt, ts) {
    const T = state.turn;
    if (state.phase === 'aim' && T) {
      T.el += dt;
      const p = meterAt(T.ph0 + T.el * T.f);
      T.prev = T.p; T.p = p;
      setMarker(p);
      if (T.ai && T.el >= T.aiAfter && (T.prev - T.aiTarget) * (p - T.aiTarget) <= 0) doFlip('ai');
    }
    if (bottle.held) {
      bottle.x = START_X;
      bottle.y = START_Y + Math.sin(ts / 420) * 1.5;
      bottle.th = -0.05 + 0.03 * Math.sin(ts / 260);
      bottle.omega = 0.12 * Math.sin(ts / 200);
      bottle.amp = 1.6;
      bottle.ph += dt * 4;
    } else if (state.phase === 'flight') {
      state.t += dt;
      const q = flightPose(state.plan, state.t);
      bottle.x = q.x; bottle.y = q.y; bottle.th = q.th;
      bottle.omega = 0.7 * Math.sin(q.th);
      bottle.amp = 3.2;
      bottle.ph += dt * 12;
      state.omega0 = bottle.omega;
      if (state.t >= FLIGHT_T) {
        const e = flightPose(state.plan, FLIGHT_T);
        bottle.x = e.x; bottle.y = e.y; bottle.th = e.th;
        land();
      }
    } else if (state.phase === 'settle') {
      state.t += dt;
      const q = settlePose(state.plan, state.t);
      bottle.x = q.x; bottle.y = q.y; bottle.th = q.th;
      bottle.omega = (state.omega0 || 0) * Math.exp(-4 * state.t) * Math.cos(14 * state.t);
      bottle.amp = 0.6 + 2.6 * Math.exp(-2.4 * state.t);
      bottle.ph += dt * 9;
      if (q.done) finishTurn();
    }
    particles.forEach(p => {
      p.life += dt;
      p.vy += 380 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
    });
    particles = particles.filter(p => p.life < p.max);
  }

  function tick(ts) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
    lastTs = ts;
    update(dt, ts);
    draw();
  }
  function startLoop() {
    if (raf) return;
    lastTs = performance.now();
    raf = requestAnimationFrame(tick);
  }
  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  /* ======================================================================
     Input
     ====================================================================== */
  $('flip-btn').addEventListener('click', () => doFlip('human'));
  stage.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
    doFlip('human');
  });
  document.addEventListener('keydown', event => {
    if ($('game-panel').classList.contains('hidden')) return;
    if (event.code === 'Space' || event.key === ' ') {
      if (state.phase === 'aim') { event.preventDefault(); doFlip('human'); }
      else if (event.target === document.body) event.preventDefault();
    }
  });

  /* ======================================================================
     Setup screens
     ====================================================================== */
  $('open-ai').addEventListener('click', () => openPlay('setup-ai'));
  $('open-friends').addEventListener('click', () => openPlay('setup-friends'));
  $('open-how').addEventListener('click', () => {
    const dlg = $('how-dialog');
    dlg.showModal();
    dlg.scrollTop = 0;
  });
  $('back-menu').addEventListener('click', event => { event.preventDefault(); window.location.href = 'bottle-flip.html'; });

  $('ai-name').addEventListener('input', () => {
    $('start-ai').disabled = !$('ai-name').value.trim();
  });
  $('start-ai').addEventListener('click', () => {
    const name = $('ai-name').value.trim();
    if (!name) { $('ai-error').textContent = 'Enter your name first.'; return; }
    $('ai-error').textContent = '';
    startMatch('ai', [{ name, ai: false }, { name: name.toLowerCase() === 'ai' ? 'Computer' : 'AI', ai: true }],
      Number($('ai-best-of').value) || 3, $('ai-level').value, $('ai-speed').value);
  });
  $('start-friends').addEventListener('click', () => {
    const one = $('friend-name-1').value.trim();
    const two = $('friend-name-2').value.trim();
    if (!one || !two) { $('friends-error').textContent = 'Enter both player names.'; return; }
    if (one.toLowerCase() === two.toLowerCase()) { $('friends-error').textContent = 'Use different names for both players.'; return; }
    $('friends-error').textContent = '';
    startMatch('friends', [{ name: one, ai: false }, { name: two, ai: false }],
      Number($('best-of').value) || 3, 'easy', $('friend-speed').value);
  });

  $('play-again').addEventListener('click', () =>
    openPlay(state.mode === 'ai' ? 'setup-ai' : 'setup-friends'));
  $('exit-game').addEventListener('click', () => { window.location.href = 'bottle-flip.html'; });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) lastTs = performance.now();
  });

  // handy for testing from the console
  window.__bottleFlip = { state, bottle, buildPlan, doFlip, startTurn, beginMatch, flightPose, settlePose };
})();

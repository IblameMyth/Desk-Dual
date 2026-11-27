(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const sound = () => window.ClassroomSounds;
  const P = window.PTPhysics;
  const I = window.PTItems;

  /* ---------- world layout (all numbers are world units) ---------- */
  const WORLD_W = 360;
  const CX = WORLD_W / 2;          // the desk and the string pivot sit in the middle
  const DESK_TOP = 0;              // y of the desk surface
  const FLOOR_Y = I.DESK_TOP_H + I.DESK_LEG_H + 1;
  const REACH = 98;                // how far the swing goes left and right

  const stage = $('stage');
  const world = $('world');

  /* ---------- state ---------- */
  const state = {
    mode: null, level: 'easy', players: [], rounds: 1, round: 1, first: 0,
    seq: [], seqIdx: 0, cur: 0, phase: 'idle', count: 0,
    results: [], timers: [], done: false
  };
  let physics = null;
  let placed = [];            // { body, el, type }
  let held = null;            // the item on the string
  let falling = null;         // the item that was just dropped
  let deskTag = null;
  // fixed camera: the desk sits at (ax, ay) on screen and never moves; only the zoom changes
  const view = { base: 1, s: 1, sT: 1, ax: 180, ay: 400, h0: 400, L: 170, A: 0.7 };
  let swingT = 0;
  let prevX = CX;
  let ai = null;
  let calmT = 0;
  let fallT = 0;
  let crashT = 0;
  let lastTypeId = null;
  let running = false;
  let raf = 0;
  let lastTs = 0;
  let acc = 0;

  document.addEventListener('pointerdown', () => sound()?.unlock(), { once: true });
  document.addEventListener('click', event => {
    if (event.target.closest('button, a')) sound()?.tap();
  });

  /* ---------- small helpers ---------- */
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
  function gauss() {
    const u = 1 - Math.random();
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fairCoin() {
    if (window.crypto && window.crypto.getRandomValues) {
      const v = new Uint32Array(1);
      window.crypto.getRandomValues(v);
      return (v[0] & 1) === 0 ? 'heads' : 'tails';
    }
    return Math.random() < 0.5 ? 'heads' : 'tails';
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

  /* ---------- sizing: the desk is pinned to one spot on screen ---------- */
  function layout() {
    const sh = clamp(window.innerHeight - 360, 330, 540);
    stage.style.height = sh + 'px';
    const cw = stage.clientWidth;
    const ch = stage.clientHeight;
    if (!cw || !ch) return;
    view.base = cw / WORLD_W;
    view.ax = cw / 2;
    view.ay = ch - 88 * view.base;           // screen position of the desk top, fixed
    view.h0 = view.ay / view.base;
    view.L = clamp((view.h0 + 88) * 0.4, 140, 215);
    view.A = Math.asin(Math.min(0.92, REACH / view.L));
    view.s = view.sT = zoomTarget();
    applyCamera();
  }
  function towerTopY() {
    let top = DESK_TOP;
    for (const rec of placed) {
      const b = rec.body;
      if (!b.touched || b.y > DESK_TOP) continue;
      top = Math.min(top, b.y - (b.hw * Math.abs(Math.sin(b.angle)) + b.hh * Math.abs(Math.cos(b.angle))));
    }
    return top;
  }
  function zoomTarget() {
    const need = view.L + 58 - towerTopY();   // world height needed above the desk
    return clamp(Math.min(view.base, (view.ay - 14) / need), 0.28, view.base);
  }
  function applyCamera() {
    world.style.transform = 'translate(' + view.ax.toFixed(2) + 'px,' + view.ay.toFixed(2) + 'px) scale(' + view.s.toFixed(4) +
      ') translate(' + (-CX) + 'px,' + (-DESK_TOP) + 'px)';
  }
  window.addEventListener('resize', () => { if (!$('game-panel').classList.contains('hidden')) layout(); });
  window.addEventListener('orientationchange', () => later(layout, 250));

  /* ---------- building the scene ---------- */
  function placeEl(el, x, y, w, h, angle) {
    el.style.transform = 'translate(' + (x - w / 2).toFixed(2) + 'px,' + (y - h / 2).toFixed(2) + 'px) rotate(' + (angle || 0).toFixed(4) + 'rad)';
  }
  function createItemEl(type) {
    const el = mk('div', 'pt-item');
    el.style.width = type.w + 'px';
    el.style.height = type.h + 'px';
    el.innerHTML = type.svg(type.w, type.h);
    return el;
  }

  function buildScene() {
    world.textContent = '';
    physics = P.createWorld();
    placed = [];
    held = null;
    falling = null;

    const floor = mk('div', 'pt-floor');
    floor.style.cssText = 'left:-1600px;width:3600px;height:2400px;transform:translateY(' + FLOOR_Y + 'px)';
    const desk = mk('div', 'pt-desk');
    desk.innerHTML = I.deskSvg();
    desk.style.transform = 'translate(' + (CX - (I.DESK_W + 14) / 2) + 'px,0px)';
    deskTag = mk('div', 'pt-tag');
    deskTag.style.left = CX + 'px';
    deskTag.style.top = '33px';
    deskTag.style.transform = 'translateX(-50%)';
    world.append(floor, desk, deskTag);

    physics.add(P.makeBody({ x: CX, y: I.DESK_TOP_H / 2, w: I.DESK_W, h: I.DESK_TOP_H, isStatic: true, friction: 0.8, tag: 'desk' }));
    physics.add(P.makeBody({ x: CX, y: FLOOR_Y + 60, w: 2400, h: 120, isStatic: true, friction: 0.9, tag: 'floor' }));
    physics.add(P.makeBody({ x: -70, y: 0, w: 100, h: 3000, isStatic: true, friction: 0.2, tag: 'wall' }));
    physics.add(P.makeBody({ x: WORLD_W + 70, y: 0, w: 100, h: 3000, isStatic: true, friction: 0.2, tag: 'wall' }));
  }

  /* ---------- the swinging item ---------- */
  function pickType() {
    let t;
    do { t = I.TYPES[Math.floor(Math.random() * I.TYPES.length)]; } while (t.id === lastTypeId);
    lastTypeId = t.id;
    return t;
  }
  function omega() { return Math.min(3.1, 1.75 + 0.07 * state.count); }

  function surfaceBelow(x, w) {
    let top = Math.abs(x - CX) - w / 2 > I.DESK_W / 2 ? FLOOR_Y : DESK_TOP;
    for (const rec of placed) {
      const b = rec.body;
      if (!b.touched || b.y > DESK_TOP) continue;
      const c = Math.abs(Math.cos(b.angle));
      const s = Math.abs(Math.sin(b.angle));
      const ex = b.hw * c + b.hh * s;
      const ey = b.hw * s + b.hh * c;
      if (Math.abs(b.x - x) < ex + w / 2 - 1) top = Math.min(top, b.y - ey);
    }
    return top;
  }

  function positionHeld() {
    if (!held) return;
    const t = swingT;
    const ramp = Math.min(1, t / 0.9);
    const ease = ramp * ramp * (3 - 2 * ramp);
    const theta = view.A * ease * Math.sin(omega() * t);
    const pivotY = -(view.ay - 14) / view.s;
    const top = pivotY + view.L * Math.cos(theta);
    const x = CX + view.L * Math.sin(theta);
    const w = held.type.w;
    const h = held.type.h;
    held.x = x;
    held.top = top;
    held.y = top + h / 2;
    placeEl(held.el, x, held.y, w, h, 0);
    held.ring.style.transform = 'translate(' + x.toFixed(2) + 'px,' + top.toFixed(2) + 'px)';
    const len = Math.hypot(x - CX, top - pivotY);
    const alpha = Math.atan2(x - CX, top - pivotY);
    held.rope.style.height = len.toFixed(2) + 'px';
    held.rope.style.transform = 'translate(' + CX + 'px,' + pivotY.toFixed(2) + 'px) rotate(' + (-alpha).toFixed(4) + 'rad)';
    if (state.phase === 'swing') {
      const bottom = held.y + h / 2;
      const surface = surfaceBelow(x, w);
      held.guide.style.display = '';
      held.guide.style.height = Math.max(0, surface - bottom).toFixed(1) + 'px';
      held.guide.style.transform = 'translate(' + (x - 1.5).toFixed(2) + 'px,' + bottom.toFixed(2) + 'px)';
    } else {
      held.guide.style.display = 'none';
    }
  }

  function isAiTurn() { return !!state.players[state.cur].ai; }

  function beginTurn() {
    state.phase = 'ready';
    const type = pickType();
    held = { type, el: createItemEl(type), rope: mk('div', 'pt-rope'), ring: mk('div', 'pt-ring'), guide: mk('div', 'pt-guide') };
    held.el.classList.add('is-held');
    world.append(held.guide, held.rope, held.el, held.ring);
    swingT = 0;
    prevX = CX;
    positionHeld();
    updateHud();
    const first = state.count === 0;
    if (first) {
      const name = state.players[state.cur].name;
      showBanner(state.mode === 'ai' && !isAiTurn() ? 'YOUR TURN' : name + '’S TURN', 'small', 1100);
    }
    later(() => {
      if (state.phase !== 'ready') return;
      state.phase = 'swing';
      swingT = 0;
      planAi();
      updateHud();
    }, first ? 1150 : 350);
  }

  function humanCanDrop() {
    return state.phase === 'swing' && !isAiTurn();
  }

  function doDrop() {
    if (state.phase !== 'swing' || !held) return;
    state.phase = 'fall';
    fallT = 0;
    calmT = 0;
    const t = held.type;
    const body = P.makeBody({ x: held.x, y: held.y, w: t.w, h: t.h, density: t.density, friction: 0.8, tag: 'item', type: t.id });
    body.touched = false;
    physics.add(body);
    const rec = { body, el: held.el, type: t };
    placed.push(rec);
    falling = rec;
    held.rope.remove();
    held.ring.remove();
    held.guide.remove();
    held.el.classList.remove('is-held');
    held = null;
    ai = null;
    sound()?.page?.();
    updateHud();
  }

  /* ---------- the AI's hands ---------- */
  function topBody() {
    let best = null;
    let bestTop = Infinity;
    for (const rec of placed) {
      const b = rec.body;
      if (!b.touched || b.y > DESK_TOP) continue;
      const top = b.y - (b.hw * Math.abs(Math.sin(b.angle)) + b.hh * Math.abs(Math.cos(b.angle)));
      if (top < bestTop) { bestTop = top; best = b; }
    }
    return best;
  }

  function planAi() {
    ai = null;
    if (!isAiTurn()) return;
    const top = topBody();
    const aimX = top ? top.x : CX;
    const hard = state.level === 'hard';
    const tired = Math.min(16, state.count * 0.5);        // the AI gets shakier as the tower grows
    let err = gauss() * ((hard ? 4 : 14) + tired * (hard ? 0.8 : 0.5));
    if (Math.random() < (hard ? 0.1 : 0.28) + state.count * 0.008) err = (Math.random() < 0.5 ? -1 : 1) * ((hard ? 20 : 26) + Math.random() * 34);
    ai = {
      x: clamp(aimX + err, CX - REACH + 4, CX + REACH - 4),
      minT: (hard ? 0.9 : 1.0) + Math.random() * (hard ? 0.7 : 1.5),
      tol: hard ? 3 : 6
    };
  }

  function aiStep() {
    if (!ai || state.phase !== 'swing' || !held) return;
    if (swingT < ai.minT) return;
    const crossed = (prevX - ai.x) * (held.x - ai.x) <= 0;
    if (crossed || Math.abs(held.x - ai.x) < ai.tol) doDrop();
  }

  /* ---------- crash / settle logic ---------- */
  function checkCrash() {
    for (const rec of placed) {
      const b = rec.body;
      if (b.y > DESK_TOP + 4 || b.x < -30 || b.x > WORLD_W + 30) return true;
    }
    return false;
  }
  function maxSpeed() {
    let m = 0;
    for (const rec of placed) {
      const b = rec.body;
      m = Math.max(m, Math.hypot(b.vx, b.vy) + Math.abs(b.w) * Math.max(b.hw, b.hh));
    }
    return m;
  }

  function startCrash() {
    state.phase = 'crash';
    crashT = 0;
    if (held) { held.rope.remove(); held.ring.remove(); held.guide.remove(); held.el.remove(); held = null; }
    ai = null;
    stage.classList.remove('shake');
    void stage.offsetWidth;
    stage.classList.add('shake');
    showBanner('CRASH!', 'bad', 1500);
    sound()?.wicket?.();
    updateHud();
  }

  function settled() {
    state.count++;
    falling = null;
    beginTurn();
  }

  /* the current player's tower crashed: note the score, then hand over */
  function endAttempt() {
    state.phase = 'roundover';
    const p = state.cur;
    const name = state.players[p].name;
    const score = state.count;
    state.results[p].push(score);
    if (p === 0 && window.DeskStats) window.DeskStats.record('pencil-tower', { inc: { score: score }, max: { highestTower: score } });
    state.done = state.seqIdx >= state.seq.length - 1;
    updateHud();
    isAiTurn() ? sound()?.lose?.() : sound()?.win?.();
    $('drop-btn').disabled = true;

    const total = state.results[p].reduce((a, b) => a + b, 0);
    $('turn-title').textContent = name + ' stacked ' + score + (score === 1 ? ' item' : ' items');
    $('turn-description').textContent = 'The tower fell. Score noted.';
    const box = $('round-result');
    box.textContent = '';
    const parts = [mk('strong', '', '💥 ' + name + ': ' + score + (score === 1 ? ' item' : ' items'))];
    parts.push(mk('p', '', state.rounds > 1 ? name + '’s total so far: ' + total : 'Score noted on the blackboard.'));
    box.append(...parts);
    box.classList.remove('hidden');
    const btn = $('continue-round');
    if (state.done) {
      btn.textContent = '🏆 SEE FINAL RESULT';
    } else {
      const nxt = state.players[state.seq[state.seqIdx + 1].p];
      btn.textContent = '▶ ' + nxt.name.toUpperCase() + '’S TURN';
    }
    btn.classList.remove('hidden');
  }

  /* ---------- the frame loop ---------- */
  function afterStep(dt) {
    for (const arb of physics.arbiters.values()) {
      [arb.A, arb.B].forEach(b => {
        if (b.isStatic || b.touched) return;
        b.touched = true;
        if (falling && b === falling.body) sound()?.desk?.();
      });
    }
    const ph = state.phase;
    if (ph === 'crash') {
      crashT += dt;
      if (crashT > 1.6) endAttempt();
      return;
    }
    if (ph !== 'ready' && ph !== 'swing' && ph !== 'fall') return;
    if (checkCrash()) { startCrash(); return; }
    if (ph === 'fall') {
      fallT += dt;
      if (falling && falling.body.touched && maxSpeed() < 12) calmT += dt; else calmT = 0;
      if (calmT > 0.55 || fallT > 7) settled();
    }
  }

  function updateCamera(dt) {
    view.sT = zoomTarget();
    view.s += (view.sT - view.s) * Math.min(1, dt * 3);
    applyCamera();
  }

  function render(dt) {
    for (const rec of placed) placeEl(rec.el, rec.body.x, rec.body.y, rec.type.w, rec.type.h, rec.body.angle);
    if (state.phase === 'swing') {
      prevX = held ? held.x : prevX;
      swingT += dt;
    }
    updateCamera(dt);
    if (held) positionHeld();
    if (state.phase === 'swing') aiStep();
  }

  function frame(ts) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    acc += dt;
    let steps = 0;
    while (acc >= 1 / 60 && steps < 4) {
      physics.step(1 / 60);
      acc -= 1 / 60;
      steps++;
      afterStep(1 / 60);
    }
    if (steps === 4) acc = 0;
    render(dt);
  }
  function startLoop() {
    if (running) return;
    running = true;
    lastTs = performance.now();
    acc = 0;
    raf = requestAnimationFrame(frame);
  }
  function stopLoop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  /* ---------- HUD: blackboard, chip, banner, button ---------- */
  let bannerTimer = 0;
  function showBanner(text, cls, ms) {
    const b = $('banner');
    b.textContent = text;
    b.className = 'pt-banner show ' + (cls || '');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { b.className = 'pt-banner'; }, ms || 1000);
  }

  let scoreEls = [];
  function buildScoreboard() {
    const host = $('score-list');
    host.textContent = '';
    scoreEls = state.players.map(p => {
      const box = mk('div', 'pt-st');
      const nm = mk('span', 'pt-st-name', p.name.toUpperCase());
      const sc = mk('strong', 'pt-st-score', '0');
      box.append(nm, sc);
      host.appendChild(box);
      return { box, sc };
    });
  }
  function totalOf(i) {
    const sum = state.results[i].reduce((a, b) => a + b, 0);
    const live = (i === state.cur && ['ready', 'swing', 'fall', 'crash'].includes(state.phase)) ? state.count : 0;
    return sum + live;
  }

  function updateHud() {
    const now = new Date();
    $('pt-board-date').textContent = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0');
    scoreEls.forEach((el, i) => {
      setScore(el.sc, totalOf(i));
      el.box.classList.toggle('is-active', i === state.cur && state.phase !== 'idle');
    });
    $('round-label').textContent = 'TOWER ' + state.count + (state.count === 1 ? ' ITEM' : ' ITEMS');
    $('target-label').textContent = 'ROUND ' + state.round + ' OF ' + state.rounds;
    $('height-chip').textContent = state.count + (state.count === 1 ? ' item' : ' items');

    const name = state.players[state.cur].name;
    const aiTurn = isAiTurn();
    const playing = ['ready', 'swing', 'fall'].includes(state.phase);
    const chip = $('turn-chip');
    deskTag.textContent = playing ? name : '';
    deskTag.style.display = playing ? '' : 'none';
    if (state.phase === 'crash') {
      chip.textContent = 'THE TOWER FELL!';
      chip.classList.remove('is-turn');
    } else if (!playing) {
      chip.textContent = 'TURN OVER';
      chip.classList.remove('is-turn');
    } else {
      chip.textContent = aiTurn ? name.toUpperCase() + ' IS DROPPING…'
        : state.mode === 'ai' ? 'YOUR TURN, ' + name.toUpperCase() : name.toUpperCase() + '’S TURN';
      chip.classList.add('is-turn');
    }

    if (playing) {
      $('turn-title').textContent = aiTurn ? name + ' is dropping…' : (state.mode === 'ai' ? name + ', your turn' : name + '’s turn');
      $('turn-description').textContent = aiTurn ? 'Wait for your turn.' : 'Tap DROP when the item is above the middle of the tower.';
    }

    const btn = $('drop-btn');
    btn.textContent = '';
    const icon = mk('span', '', aiTurn ? '⏳' : '✋');
    icon.setAttribute('aria-hidden', 'true');
    const label = aiTurn ? name.toUpperCase() + ' IS PLAYING…' : (state.mode === 'friends' ? 'DROP · ' + name.toUpperCase() : 'DROP');
    btn.append(icon, document.createTextNode(' ' + label));
    btn.disabled = !humanCanDrop();
    $('drop-hint').textContent = humanCanDrop() ? 'Press DROP, tap the page, or hit the space bar.'
      : (aiTurn ? 'The AI is lining up its drop.' : 'Get ready…');
  }

  function setScore(el, value) {
    if (el.textContent !== String(value)) {
      el.textContent = value;
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
    }
  }

  /* ---------- match flow: everyone builds their own tower until it crashes ---------- */
  function startMatch(mode, players, rounds, level) {
    clearTimers();
    Object.assign(state, {
      mode, level, players, rounds, round: 1, first: 0, seq: [], seqIdx: 0, cur: 0,
      phase: 'idle', count: 0, results: players.map(() => []), done: false
    });
    openPlay('toss-panel');
    if (players.length === 2) (mode === 'ai' ? showTossAi() : showTossFriends());
    else showLots();
  }

  function beginMatch(first) {
    state.first = first;
    const n = state.players.length;
    const order = [];
    for (let k = 0; k < n; k++) order.push((first + k) % n);
    state.seq = [];
    for (let r = 0; r < state.rounds; r++) order.forEach(p => state.seq.push({ r, p }));
    state.seqIdx = 0;
    showPanel('game-panel');
    buildScoreboard();
    startAttempt();
    startLoop();
    later(() => stage.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150);
  }

  function startAttempt() {
    clearTimers();
    const e = state.seq[state.seqIdx];
    state.cur = e.p;
    state.round = e.r + 1;
    state.phase = 'idle';
    state.count = 0;
    state.done = false;
    lastTypeId = null;
    $('round-result').classList.add('hidden');
    $('continue-round').classList.add('hidden');
    $('banner').className = 'pt-banner';
    stage.classList.remove('shake');
    buildScene();
    layout();
    applyCamera();
    updateHud();
    beginTurn();
  }

  $('continue-round').addEventListener('click', () => {
    if (state.done) { finishMatch(); return; }
    state.seqIdx++;
    startAttempt();
  });

  function finishMatch() {
    clearTimers();
    stopLoop();
    const n = state.players.length;
    const totals = state.results.map(r => r.reduce((a, b) => a + b, 0));
    const bests = state.results.map(r => Math.max(0, ...r));
    const top = Math.max(...totals);
    let winners = totals.map((t, i) => i).filter(i => totals[i] === top);
    if (winners.length > 1) {
      const bb = Math.max(...winners.map(i => bests[i]));
      winners = winners.filter(i => bests[i] === bb);
    }
    const draw = winners.length > 1;
    const w = winners[0];
    const youWon = state.mode !== 'ai' || !state.players[w].ai;
    $('match-result-title').textContent = draw ? 'It’s a draw! 🤝' : (state.players[w].ai ? state.players[w].name + ' wins!' : state.players[w].name + ' wins! 🎉');
    $('match-result-copy').textContent = draw
      ? winners.map(i => state.players[i].name).join(' & ') + ' finished level with ' + top + (top === 1 ? ' item.' : ' items.')
      : (state.players[w].ai
        ? 'The AI’s steady hands stacked ' + top + (top === 1 ? ' item. ' : ' items. ') + 'Better luck next time!'
        : state.players[w].name + ' stacked ' + top + (top === 1 ? ' item' : ' items') + ' with the steadiest hands.');
    const host = $('final-score');
    host.textContent = '';
    host.style.gridTemplateColumns = 'repeat(' + (n <= 2 ? n : 2) + ',1fr)';
    const order = totals.map((t, i) => i).sort((a, b) => totals[b] - totals[a] || bests[b] - bests[a]);
    order.forEach(i => {
      const cell = mk('div', winners.includes(i) ? 'is-winner' : '');
      const detail = state.rounds > 1 ? state.results[i].join(' + ') + ' items' : 'items stacked';
      cell.append(mk('strong', '', String(totals[i])), mk('span', '', state.players[i].name), mk('small', '', detail));
      host.appendChild(cell);
    });
    const tallest = Math.max(...bests);
    $('final-foot').textContent = 'TALLEST TOWER: ' + tallest + (tallest === 1 ? ' ITEM' : ' ITEMS') +
      ' · ' + state.rounds + (state.rounds === 1 ? ' ROUND' : ' ROUNDS');
    youWon ? sound()?.win?.() : sound()?.lose?.();
    showPanel('result-panel');
    $('final-board').scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  /* ---------- input ---------- */
  function humanDrop() { if (humanCanDrop()) doDrop(); }
  stage.addEventListener('pointerdown', event => { event.preventDefault(); humanDrop(); });
  $('drop-btn').addEventListener('pointerdown', event => { event.preventDefault(); humanDrop(); });
  $('drop-btn').addEventListener('click', humanDrop);
  document.addEventListener('keydown', event => {
    if (event.code !== 'Space' && event.code !== 'Enter') return;
    if ($('game-panel').classList.contains('hidden')) return;
    if (event.target.closest('input, select, textarea, a, dialog')) return;
    if (event.target.closest('button') && event.target.id !== 'drop-btn') return;
    if (event.code === 'Space') event.preventDefault();
    humanDrop();
  });

  /* ---------- coin toss (winner drops first) ---------- */
  function showToss(title, copy, parts) {
    const box = $('toss-stage');
    box.textContent = '';
    const card = mk('div', 'pt-toss-card');
    card.append(mk('h2', '', title), mk('p', 'khc-muted', copy), ...parts);
    box.appendChild(card);
  }
  function callOptions(onPick) {
    const wrap = mk('div', 'pt-toss-options');
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
    const wrap = mk('div', 'pt-coin-wrap');
    const coin = mk('div', 'pt-coin');
    const face = mk('div', 'pt-coin-face', '2');
    coin.appendChild(face);
    wrap.appendChild(coin);
    return { wrap, coin, face };
  }
  function flip(c, done) {
    const result = fairCoin();
    c.coin.classList.add('flip');
    c.face.textContent = result.toUpperCase();
    sound()?.bell?.();
    later(() => done(result), 1200);
  }
  function actionButton(label, onClick, disabled) {
    const b = mk('button', 'btn btn-primary pt-go', label);
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
      flip(coin, result => tossWon(call === result ? 0 : 1, result));
    }, true);
    const opts = callOptions(c => { call = c; go.disabled = false; });
    showToss('Coin toss', state.players[0].name + ', call heads or tails. The winner stacks first.', [opts, coin.wrap, go]);
  }
  function showTossFriends() {
    let call = null;
    const next = actionButton('PASS TO ' + state.players[1].name.toUpperCase(), () => {
      const coin = makeCoin();
      const go = actionButton('TOSS COIN', () => {
        go.disabled = true;
        flip(coin, result => tossWon(call === result ? 0 : 1, result));
      });
      showToss(state.players[1].name + ', toss the coin', state.players[0].name + ' called ' + call.toUpperCase() + '. Tap to toss.', [coin.wrap, go]);
    }, true);
    const opts = callOptions(c => { call = c; next.disabled = false; });
    showToss(state.players[0].name + ' calls the toss', 'Pick heads or tails, then pass the phone. The winner stacks first.', [opts, next]);
  }
  function tossWon(winner, result) {
    const name = state.players[winner].name;
    showToss(name + ' won the toss!', 'The coin shows ' + result.toUpperCase() + '. ' + name + ' stacks first, until the tower crashes.',
      [actionButton('START GAME', () => beginMatch(winner))]);
    sound()?.win?.();
  }

  function showLots() {
    const chips = mk('div', 'pt-lots');
    const els = state.players.map(p => { const c = mk('span', 'pt-lot', p.name); chips.appendChild(c); return c; });
    const go = actionButton('DRAW LOTS', () => {
      go.disabled = true;
      const winner = Math.floor(fairRand() * state.players.length);
      let i = 0;
      const steps = 14 + winner + state.players.length * 2;
      const tick = () => {
        els.forEach((e, k) => e.classList.toggle('on', k === i % els.length));
        sound()?.tap?.();
        if (i >= steps && i % els.length === winner) {
          showToss(state.players[winner].name + ' goes first!', 'Lots drawn. ' + state.players[winner].name + ' stacks first, then everyone takes a turn.',
            [actionButton('START GAME', () => beginMatch(winner))]);
          sound()?.win?.();
          return;
        }
        i++;
        later(tick, 70 + Math.max(0, i - 10) * 22);
      };
      tick();
    });
    showToss('Who goes first?', 'Draw lots to pick the first player. Everyone then plays in order.', [chips, go]);
  }
  function fairRand() {
    if (window.crypto && window.crypto.getRandomValues) {
      const v = new Uint32Array(1);
      window.crypto.getRandomValues(v);
      return v[0] / 4294967296;
    }
    return Math.random();
  }

  /* ---------- setup screens ---------- */
  $('open-ai').addEventListener('click', () => openPlay('setup-ai'));
  $('open-friends').addEventListener('click', () => openPlay('setup-friends'));
  $('open-how').addEventListener('click', () => {
    const dlg = $('how-dialog');
    dlg.showModal();
    dlg.scrollTop = 0;
  });
  $('back-menu').addEventListener('click', event => { event.preventDefault(); window.location.href = 'pencil-tower.html'; });

  $('ai-name').addEventListener('input', () => {
    $('start-ai').disabled = !$('ai-name').value.trim();
  });
  $('start-ai').addEventListener('click', () => {
    const name = $('ai-name').value.trim();
    if (!name) { $('ai-error').textContent = 'Enter your name first.'; return; }
    $('ai-error').textContent = '';
    startMatch('ai', [{ name, ai: false }, { name: name.toLowerCase() === 'ai' ? 'Computer' : 'AI', ai: true }],
      (Number($('ai-best-of').value) || 1), $('ai-level').value);
  });
  $('start-friends').addEventListener('click', () => {
    const one = $('friend-name-1').value.trim();
    const two = $('friend-name-2').value.trim();
    if (!one || !two) { $('friends-error').textContent = 'Enter both player names.'; return; }
    if (one.toLowerCase() === two.toLowerCase()) { $('friends-error').textContent = 'Use different names for both players.'; return; }
    $('friends-error').textContent = '';
    startMatch('friends', [{ name: one, ai: false }, { name: two, ai: false }], (Number($('best-of').value) || 1), 'easy');
  });

  $('play-again').addEventListener('click', () =>
    openPlay(state.mode === 'ai' ? 'setup-ai' : 'setup-friends'));
  $('exit-game').addEventListener('click', () => { window.location.href = 'pencil-tower.html'; });

  // handy for testing from the console
  window.__pencilTower = { state, get placed() { return placed; }, get held() { return held; } };
})();

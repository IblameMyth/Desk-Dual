(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const sound = () => window.ClassroomSounds;
  const N = 10;
  const COLS = 'ABCDEFGHIJ';
  const FLEET = [
    { id: 'ruler', name: 'Ruler', size: 5 },
    { id: 'pen', name: 'Pen', size: 4 },
    { id: 'pencil', name: 'Small Pencil', size: 3 },
    { id: 'sharpener', name: 'Sharpener', size: 3 },
    { id: 'rubber', name: 'Rubber', size: 2 },
    { id: 'cap', name: 'Pen Cap', size: 2 }
  ];
  const coord = i => COLS[i % N] + (Math.floor(i / N) + 1);

  /* ---------- stationery drawings (drawn across, rotated for "down") ---------- */
  function art(id, L) {
    const W = L * 40;
    switch (id) {
      case 'ruler': {
        let t = '';
        const steps = L * 8;
        for (let i = 0; i <= steps; i++) {
          const x = 6 + (W - 12) * i / steps;
          const len = i % 8 === 0 ? 14 : i % 4 === 0 ? 10 : 6;
          t += '<line x1="' + x + '" y1="9" x2="' + x + '" y2="' + (9 + len) + '" stroke="#7a5d12" stroke-width="1"/>';
        }
        for (let k = 1; k < L; k++) {
          t += '<text x="' + (6 + (W - 12) * k / L) + '" y="32" font-size="9" font-weight="800" text-anchor="middle" fill="#7a5d12">' + k + '</text>';
        }
        return '<rect x="3" y="6" width="' + (W - 6) + '" height="28" rx="3" fill="#f6d869" stroke="#a8841f" stroke-width="1.6"/>' + t;
      }
      case 'pen':
        return '<polygon points="3,20 15,14 15,26" fill="#d9d2c3" stroke="#555" stroke-width="1.2"/>' +
          '<polygon points="3,20 7,18 7,22" fill="#222"/>' +
          '<rect x="15" y="11" width="' + (W - 21) + '" height="18" rx="4" fill="#2f5fb3" stroke="#1c3a73" stroke-width="1.6"/>' +
          '<rect x="' + (W - 34) + '" y="11" width="22" height="18" fill="#1c3a73"/>' +
          '<rect x="' + (W - 54) + '" y="6" width="40" height="5" rx="2" fill="#cfd4da" stroke="#777" stroke-width="1"/>' +
          '<line x1="22" y1="16" x2="' + (W - 58) + '" y2="16" stroke="#8fb4ee" stroke-width="2" stroke-linecap="round"/>';
      case 'pencil':
        return '<polygon points="3,20 22,12 22,28" fill="#e8c39e" stroke="#a47d52" stroke-width="1.2"/>' +
          '<polygon points="3,20 9,17.4 9,22.6" fill="#333"/>' +
          '<rect x="22" y="11" width="' + (W - 46) + '" height="18" fill="#f2c230" stroke="#a47d12" stroke-width="1.6"/>' +
          '<line x1="22" y1="17" x2="' + (W - 24) + '" y2="17" stroke="#c99a12" stroke-width="1.5"/>' +
          '<line x1="22" y1="23" x2="' + (W - 24) + '" y2="23" stroke="#c99a12" stroke-width="1.5"/>' +
          '<rect x="' + (W - 24) + '" y="11" width="10" height="18" fill="#c9ced4" stroke="#6c7a86" stroke-width="1.2"/>' +
          '<rect x="' + (W - 14) + '" y="11" width="11" height="18" rx="4" fill="#f19aa6" stroke="#b8606c" stroke-width="1.2"/>';
      case 'sharpener':
        return '<rect x="4" y="8" width="' + (W - 8) + '" height="24" rx="6" fill="#4aa3df" stroke="#1f6a9f" stroke-width="1.6"/>' +
          '<circle cx="24" cy="20" r="8" fill="#12324a" stroke="#0b2234" stroke-width="1.2"/>' +
          '<rect x="46" y="13" width="' + (W - 76) + '" height="14" rx="2" fill="#cdd5dc" stroke="#6c7a86" stroke-width="1.2"/>' +
          '<circle cx="' + (W - 16) + '" cy="20" r="3.5" fill="#1f6a9f" stroke="#0e3d5e" stroke-width="1"/>' +
          '<line x1="' + (W - 18.5) + '" y1="20" x2="' + (W - 13.5) + '" y2="20" stroke="#0e3d5e" stroke-width="1"/>';
      case 'rubber':
        return '<rect x="4" y="8" width="' + (W - 8) + '" height="24" rx="5" fill="#fbf6ee" stroke="#b2a68f" stroke-width="1.6"/>' +
          '<rect x="' + (W * 0.25) + '" y="8" width="' + (W * 0.5) + '" height="24" fill="#2e7bd0" stroke="#1c4f8d" stroke-width="1.4"/>' +
          '<text x="' + (W / 2) + '" y="24" font-size="8.5" font-weight="900" text-anchor="middle" fill="#fff">RUBBER</text>';
      default: // pen cap
        return '<rect x="4" y="9" width="' + (W - 8) + '" height="22" rx="10" fill="#2b2b2b" stroke="#000" stroke-width="1.4"/>' +
          '<rect x="' + (W - 24) + '" y="9" width="6" height="22" fill="#5a5a5a"/>' +
          '<rect x="16" y="4" width="' + (W - 36) + '" height="7" rx="3" fill="#c8ccd2" stroke="#777" stroke-width="1"/>' +
          '<line x1="14" y1="17" x2="' + (W - 28) + '" y2="17" stroke="#777" stroke-width="2" stroke-linecap="round"/>';
    }
  }
  function shipSvg(id, L, vert) {
    const W = L * 40;
    const body = vert ? '<g transform="translate(40,0) rotate(90)">' + art(id, L) + '</g>' : art(id, L);
    return '<svg viewBox="0 0 ' + (vert ? 40 : W) + ' ' + (vert ? W : 40) + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  /* ---------- helpers ---------- */
  function mk(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function fairCoin() {
    if (window.crypto && window.crypto.getRandomValues) {
      const v = new Uint32Array(1);
      window.crypto.getRandomValues(v);
      return (v[0] & 1) === 0 ? 'heads' : 'tails';
    }
    return Math.random() < 0.5 ? 'heads' : 'tails';
  }
  const pickRandom = arr => arr[Math.floor(Math.random() * arr.length)];

  /* ---------- fleet / board rules ---------- */
  function newFleet() { return FLEET.map(s => ({ id: s.id, name: s.name, size: s.size, cells: [], vert: false, hits: 0 })); }
  function cellsFor(r, c, size, vert) {
    const out = [];
    for (let k = 0; k < size; k++) {
      const rr = r + (vert ? k : 0);
      const cc = c + (vert ? 0 : k);
      if (rr >= N || cc >= N) return null;
      out.push(rr * N + cc);
    }
    return out;
  }
  function occupied(fleet, ignoreId) {
    const set = new Set();
    fleet.forEach(s => { if (s.id !== ignoreId) s.cells.forEach(c => set.add(c)); });
    return set;
  }
  function shipAt(fleet, idx) { return fleet.find(s => s.cells.includes(idx)); }
  function randomFleet() {
    const fleet = newFleet();
    fleet.forEach(s => {
      for (let tries = 0; tries < 500; tries++) {
        const vert = Math.random() < 0.5;
        const cells = cellsFor(Math.floor(Math.random() * N), Math.floor(Math.random() * N), s.size, vert);
        if (!cells) continue;
        const taken = occupied(fleet, s.id);
        if (cells.some(c => taken.has(c))) continue;
        s.cells = cells;
        s.vert = vert;
        return;
      }
    });
    if (fleet.some(s => !s.cells.length)) return randomFleet();
    return fleet;
  }
  const sunkCount = fleet => fleet.filter(s => s.cells.length && s.hits === s.size).length;

  /* ---------- AI ---------- */
  function aiPick(level) {
    const shots = state.shots[0];            // shots the AI has already made at the human
    const fleet = state.fleets[0];           // used only for "which ships are sunk" (public info)
    const free = [];
    for (let i = 0; i < N * N; i++) if (!shots[i]) free.push(i);
    const sunkCells = new Set();
    fleet.forEach(s => { if (s.hits === s.size) s.cells.forEach(c => sunkCells.add(c)); });
    const openHits = [];
    shots.forEach((v, i) => { if (v === 'hit' && !sunkCells.has(i)) openHits.push(i); });

    if (level !== 'hard') {
      if (openHits.length && Math.random() < 0.6) {
        const base = pickRandom(openHits);
        const near = [];
        const r = Math.floor(base / N), c = base % N;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
          const rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < N && cc >= 0 && cc < N && !shots[rr * N + cc]) near.push(rr * N + cc);
        });
        if (near.length) return pickRandom(near);
      }
      return pickRandom(free);
    }

    // hard: score every square by how many remaining items could still cover it
    const weight = new Array(N * N).fill(0);
    fleet.filter(s => s.hits < s.size).forEach(s => {
      [false, true].forEach(vert => {
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cells = cellsFor(r, c, s.size, vert);
            if (!cells) continue;
            if (cells.some(x => shots[x] === 'miss' || sunkCells.has(x))) continue;
            const covered = cells.filter(x => shots[x] === 'hit').length;
            const w = 1 + covered * covered * 40;
            cells.forEach(x => { if (!shots[x]) weight[x] += w; });
          }
        }
      });
    });
    let best = -1;
    let picks = [];
    free.forEach(i => {
      if (weight[i] > best) { best = weight[i]; picks = [i]; }
      else if (weight[i] === best) picks.push(i);
    });
    return pickRandom(picks);
  }

  /* ---------- state ---------- */
  const state = {
    mode: 'ai', level: 'easy', players: [], fleets: [[], []], shots: [[], []],
    turn: 0, starter: 0, view: 0, sel: null, busy: false, over: false, awaitPass: false,
    placing: { p: 0, selId: null, vert: false }, fired: [0, 0], hitCount: [0, 0], timers: [], onReady: null
  };

  function later(fn, ms) {
    const id = setTimeout(() => { state.timers = state.timers.filter(t => t !== id); fn(); }, ms);
    state.timers.push(id);
  }
  function clearTimers() { state.timers.forEach(clearTimeout); state.timers = []; }

  document.addEventListener('pointerdown', () => sound()?.unlock(), { once: true });
  document.addEventListener('click', event => { if (event.target.closest('button, a')) sound()?.tap(); });

  function showPanel(id) {
    ['setup-ai', 'setup-friends', 'toss-panel', 'place-panel', 'battle-panel', 'result-panel']
      .forEach(p => $(p).classList.toggle('hidden', p !== id));
    window.scrollTo(0, 0);
  }
  function openPlay(id) {
    clearTimers();
    $('main-menu').classList.add('hidden');
    $('play-area').classList.remove('hidden');
    showPanel(id);
  }

  /* ---------- board drawing ---------- */
  function buildBoard(o) {
    const host = mk('div', 'bs-host');
    const wrap = mk('div', 'bs-wrap');
    const cols = mk('div', 'bs-cols');
    COLS.split('').forEach(l => cols.appendChild(mk('span', '', l)));
    const rows = mk('div', 'bs-rows');
    for (let i = 1; i <= N; i++) rows.appendChild(mk('span', '', String(i)));
    const board = mk('div', 'bs-board' + (o.onCell ? '' : ' is-locked'));
    const ships = mk('div', 'bs-ships');
    const cells = mk('div', 'bs-cells');

    o.fleet.forEach(s => {
      if (!s.cells.length) return;
      const sunk = s.hits === s.size;
      if (!(o.reveal === 'all' || (o.reveal === 'sunk' && sunk))) return;
      const r = Math.floor(s.cells[0] / N), c = s.cells[0] % N;
      const el = mk('div', 'bs-ship' + (sunk ? ' sunk' : ''));
      el.style.left = c * 10 + '%';
      el.style.top = r * 10 + '%';
      el.style.width = (s.vert ? 1 : s.size) * 10 + '%';
      el.style.height = (s.vert ? s.size : 1) * 10 + '%';
      el.innerHTML = shipSvg(s.id, s.size, s.vert);
      ships.appendChild(el);
    });

    for (let i = 0; i < N * N; i++) {
      const b = mk('button', 'bs-cell');
      b.type = 'button';
      const v = o.shots ? o.shots[i] : null;
      if (v === 'hit') b.classList.add('is-hit');
      if (v === 'miss') b.classList.add('is-miss');
      if (o.sel === i) b.classList.add('is-sel');
      b.setAttribute('aria-label', coord(i) + (v ? ', ' + v : ''));
      if (o.onCell) b.addEventListener('click', () => o.onCell(i)); else b.tabIndex = -1;
      cells.appendChild(b);
    }
    board.append(ships, cells);
    wrap.append(cols, rows, board);
    host.appendChild(wrap);
    return host;
  }

  function fleetChips(fleet) {
    const row = document.createDocumentFragment();
    fleet.forEach(s => {
      const sunk = s.cells.length && s.hits === s.size;
      const chip = mk('div', 'bs-chip' + (sunk ? ' is-sunk' : ''));
      const th = mk('span', 'bs-thumb');
      th.style.setProperty('--L', s.size);
      th.innerHTML = shipSvg(s.id, s.size, false);
      chip.append(th, mk('span', '', s.name));
      row.appendChild(chip);
    });
    return row;
  }

  /* ---------- hand-off cover ---------- */
  function showHandoff(title, name, copy, button, onReady) {
    $('handoff-title').textContent = title;
    $('handoff-name').textContent = name;
    $('handoff-copy').textContent = copy || '';
    $('handoff-ready').textContent = button || 'I’M READY';
    state.onReady = onReady;
    $('handoff').classList.remove('hidden');
  }
  $('handoff-ready').addEventListener('click', () => {
    $('handoff').classList.add('hidden');
    const fn = state.onReady;
    state.onReady = null;
    if (fn) fn();
  });

  /* ---------- toss ---------- */
  function showToss(title, copy, parts) {
    const stage = $('toss-stage');
    stage.textContent = '';
    const card = mk('div', 'bs-toss-card');
    card.append(mk('h2', '', title), mk('p', 'khc-muted', copy), ...parts);
    stage.appendChild(card);
  }
  function callOptions(onPick) {
    const wrap = mk('div', 'bs-toss-options');
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
    const wrap = mk('div', 'bs-coin-wrap');
    const coin = mk('div', 'bs-coin');
    const face = mk('div', 'bs-coin-face', '2');
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
    const b = mk('button', 'btn btn-primary bs-wide', label);
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
    showToss('Coin toss', state.players[0].name + ', call heads or tails. The winner fires first.', [opts, coin.wrap, go]);
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
    showToss(state.players[0].name + ' calls the toss', 'Pick heads or tails, then pass the phone. The winner fires first.', [opts, next]);
  }
  function tossWon(winner, result) {
    state.starter = winner;
    const name = state.players[winner].name;
    showToss(name + ' won the toss!', 'The coin shows ' + result.toUpperCase() + '. ' + name + ' fires first. Now hide your ships!',
      [actionButton(state.mode === 'ai' ? 'HIDE MY SHIPS' : 'PASS TO ' + state.players[0].name.toUpperCase() + ' & HIDE', () => beginPlacement(0))]);
    sound()?.win?.();
  }

  /* ---------- placement ---------- */
  function beginPlacement(p) {
    state.placing = { p, selId: FLEET[0].id, vert: false };
    state.fleets[p] = newFleet();
    showPanel('place-panel');
    renderPlacement();
  }

  function renderPlacement() {
    const { p, selId, vert } = state.placing;
    const fleet = state.fleets[p];
    $('place-title').textContent = state.mode === 'ai' ? state.players[0].name + ', hide your stationery' : state.players[p].name + ', hide your stationery';
    $('rotate-btn').textContent = 'ROTATE: ' + (vert ? 'DOWN' : 'ACROSS');
    const host = $('place-board');
    host.textContent = '';
    host.appendChild(buildBoard({ fleet, reveal: 'all', shots: null, onCell: onPlaceCell }));
    const tray = $('tray');
    tray.textContent = '';
    fleet.forEach(s => {
      const b = mk('button', (s.cells.length ? 'is-placed ' : '') + (s.id === selId ? 'is-sel' : ''));
      b.type = 'button';
      const th = mk('span', 'bs-thumb');
      th.style.setProperty('--L', s.size);
      th.innerHTML = shipSvg(s.id, s.size, false);
      b.append(mk('span', '', s.name + ' · ' + s.size), th);
      b.addEventListener('click', () => {
        if (s.cells.length) { s.cells = []; }
        state.placing.selId = s.id;
        $('place-note').textContent = '';
        renderPlacement();
      });
      tray.appendChild(b);
    });
    $('ready-btn').disabled = fleet.some(s => !s.cells.length);
  }

  function nextUnplaced() {
    const s = state.fleets[state.placing.p].find(x => !x.cells.length);
    return s ? s.id : null;
  }

  function onPlaceCell(i) {
    const { p, selId, vert } = state.placing;
    const fleet = state.fleets[p];
    const here = shipAt(fleet, i);
    if (here) {
      // tapping a placed item picks it up
      here.cells = [];
      state.placing.selId = here.id;
      $('place-note').textContent = '';
      renderPlacement();
      return;
    }
    if (!selId) { $('place-note').textContent = 'Pick an item from the list first.'; return; }
    const ship = fleet.find(s => s.id === selId);
    const cells = cellsFor(Math.floor(i / N), i % N, ship.size, vert);
    if (!cells) { $('place-note').textContent = 'That does not fit on the page. Try another square or rotate.'; return; }
    const taken = occupied(fleet, ship.id);
    if (cells.some(c => taken.has(c))) { $('place-note').textContent = 'Another item is in the way.'; return; }
    ship.cells = cells;
    ship.vert = vert;
    state.placing.selId = nextUnplaced();
    $('place-note').textContent = '';
    renderPlacement();
  }

  $('rotate-btn').addEventListener('click', () => { state.placing.vert = !state.placing.vert; renderPlacement(); });
  $('random-btn').addEventListener('click', () => {
    state.fleets[state.placing.p] = randomFleet();
    state.placing.selId = null;
    $('place-note').textContent = '';
    renderPlacement();
  });
  $('clear-btn').addEventListener('click', () => {
    state.fleets[state.placing.p] = newFleet();
    state.placing.selId = FLEET[0].id;
    $('place-note').textContent = '';
    renderPlacement();
  });
  $('ready-btn').addEventListener('click', () => {
    const p = state.placing.p;
    if (state.mode === 'ai') {
      state.fleets[1] = randomFleet();
      startBattle();
      return;
    }
    if (p === 0) {
      // hide the first page before the phone moves
      $('place-board').textContent = '';
      showHandoff('Pass the phone to', state.players[1].name, 'Hide your ships. ' + state.players[0].name + ' must not look!', 'I’M READY', () => beginPlacement(1));
    } else {
      $('place-board').textContent = '';
      showHandoff('Pass the phone to', state.players[state.starter].name, 'You won the toss, so you fire first.', 'I’M READY', startBattle);
    }
  });

  /* ---------- battle ---------- */
  function startBattle() {
    clearTimers();
    state.shots = [new Array(N * N).fill(null), new Array(N * N).fill(null)];
    state.fired = [0, 0];
    state.hitCount = [0, 0];
    state.turn = state.starter;
    state.view = state.mode === 'friends' ? state.turn : 0;
    state.sel = null;
    state.busy = false;
    state.over = false;
    state.awaitPass = false;
    showPanel('battle-panel');
    setMsg(state.mode === 'ai'
      ? (state.turn === 0 ? 'YOUR TURN · PICK A SQUARE' : state.players[1].name.toUpperCase() + ' FIRES FIRST')
      : state.players[state.turn].name.toUpperCase() + ' FIRES FIRST');
    renderBattle();
    if (state.mode === 'ai' && state.turn === 1) aiTurn();
  }

  function setMsg(text, cls) {
    const m = $('board-msg');
    m.textContent = text;
    m.className = 'bs-msg' + (cls ? ' ' + cls : '');
  }

  function renderBattle() {
    const v = state.view;
    const o = 1 - v;
    const myTurn = !state.over && !state.busy && !state.awaitPass && state.turn === v;
    const now = new Date();
    $('bs-board-date').textContent = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0');
    $('left-label').textContent = state.players[0].name.toUpperCase();
    $('right-label').textContent = state.players[1].name.toUpperCase();
    $('left-score').textContent = sunkCount(state.fleets[1]);
    $('right-score').textContent = sunkCount(state.fleets[0]);

    $('turn-title').textContent = state.over ? 'Game over'
      : state.mode === 'ai'
        ? (state.turn === 0 ? state.players[0].name + ', your turn' : state.players[1].name + ' is aiming…')
        : state.players[v].name + '’s turn';
    $('enemy-label').textContent = state.players[o].name.toUpperCase() + '’S PAGE · TAP A SQUARE';

    const eb = $('enemy-board');
    eb.textContent = '';
    eb.appendChild(buildBoard({
      fleet: state.fleets[o], reveal: 'sunk', shots: state.shots[o], sel: myTurn ? state.sel : null,
      onCell: myTurn ? onTarget : null
    }));
    const ob = $('own-board');
    ob.textContent = '';
    ob.appendChild(buildBoard({ fleet: state.fleets[v], reveal: 'all', shots: state.shots[v] }));
    $('enemy-chips').textContent = '';
    $('enemy-chips').appendChild(fleetChips(state.fleets[o]));
    $('own-chips').textContent = '';
    $('own-chips').appendChild(fleetChips(state.fleets[v]));

    const fire = $('fire-btn');
    if (state.awaitPass) {
      $('callout').textContent = 'Shot done';
      fire.textContent = 'PASS TO ' + state.players[1 - state.turn].name.toUpperCase();
      fire.disabled = false;
    } else {
      $('callout').textContent = state.sel === null ? 'Tap a square' : 'Call: ' + coord(state.sel);
      fire.textContent = state.sel === null ? 'FIRE!' : 'FIRE ' + coord(state.sel) + '!';
      fire.disabled = !myTurn || state.sel === null;
    }
    $('fire-bar').classList.toggle('hidden', state.over);
  }

  function onTarget(i) {
    if (state.busy || state.over || state.awaitPass) return;
    if (state.shots[1 - state.view][i]) { setMsg(coord(i) + ' WAS ALREADY CALLED', ''); return; }
    state.sel = state.sel === i ? null : i;
    renderBattle();
  }

  function shoot(att, idx) {
    const def = 1 - att;
    const ship = shipAt(state.fleets[def], idx);
    state.fired[att]++;
    if (ship) {
      state.shots[def][idx] = 'hit';
      ship.hits++;
      state.hitCount[att]++;
      return { hit: true, ship, sunk: ship.hits === ship.size, all: sunkCount(state.fleets[def]) === state.fleets[def].length };
    }
    state.shots[def][idx] = 'miss';
    return { hit: false, ship: null, sunk: false, all: false };
  }

  function describe(att, idx, r) {
    const who = state.mode === 'ai' ? (att === 0 ? 'YOU' : state.players[1].name.toUpperCase()) : state.players[att].name.toUpperCase();
    if (r.sunk) return coord(idx) + ' · ' + who + ' SUNK THE ' + r.ship.name.toUpperCase() + '!';
    if (r.hit) return coord(idx) + ' · HIT!';
    return coord(idx) + ' · MISS';
  }
  function playSound(r) {
    if (r.sunk) sound()?.bell?.();
    else if (r.hit) sound()?.desk?.();
    else sound()?.chalk?.();
  }

  $('fire-btn').addEventListener('click', () => {
    if (state.over || state.busy) return;
    if (state.sel === null) return;
    const att = state.turn;
    const idx = state.sel;
    if (state.shots[1 - att][idx]) return;
    const r = shoot(att, idx);
    state.sel = null;
    setMsg(describe(att, idx, r), r.sunk ? 'is-sunk' : r.hit ? 'is-hit' : '');
    playSound(r);
    if (r.all) { endGame(att); return; }
    if (state.mode === 'friends') {
      // Switch directly to the other player's view; skip the turn hand-off cover.
      state.turn = 1 - att;
      state.view = state.turn;
      state.sel = null;
      setMsg(state.players[state.turn].name.toUpperCase() + ' · PICK A SQUARE');
      renderBattle();
    } else {
      state.turn = 1;
      state.busy = true;
      renderBattle();
      later(aiTurn, 1300);
    }
  });

  function aiTurn() {
    state.busy = true;
    state.turn = 1;
    renderBattle();
    later(() => {
      const idx = aiPick(state.level);
      const r = shoot(1, idx);
      setMsg(describe(1, idx, r), r.sunk ? 'is-sunk' : r.hit ? 'is-hit' : '');
      playSound(r);
      if (r.all) { endGame(1); return; }
      state.turn = 0;
      state.busy = false;
      renderBattle();
    }, 900);
  }

  function endGame(w) {
    state.over = true;
    state.busy = false;
    renderBattle();
    const name = state.players[w].name;
    if (window.DeskStats) window.DeskStats.record('battleship', { inc: { [w === 0 ? 'wins' : 'losses']: 1, shipsDestroyed: sunkCount(state.fleets[1]) } });
    setMsg(name.toUpperCase() + ' SANK EVERYTHING!', 'is-sunk');
    if (state.mode === 'ai' && w === 1) sound()?.lose?.(); else sound()?.win?.();
    // match over: go straight to the result, no button to press
    later(() => showResult(w), 1700);
  }

  function showResult(w) {
    clearTimers();
    const name = state.players[w].name;
    $('match-result-title').textContent = state.mode === 'ai' && w === 1 ? 'AI wins!' : name + ' wins! 🎉';
    $('match-result-copy').textContent = state.mode === 'ai' && w === 1
      ? 'Your whole stationery box was sunk. Try again!'
      : name + ' sank every item on the enemy page.';
    const boards = $('final-boards');
    boards.textContent = '';
    [0, 1].forEach(p => {
      const fig = mk('figure');
      fig.appendChild(mk('figcaption', '', state.players[p].name + '’s page'));
      fig.appendChild(buildBoard({ fleet: state.fleets[p], reveal: 'all', shots: state.shots[p] }));
      boards.appendChild(fig);
    });
    const sc = $('final-score');
    sc.textContent = '';
    [0, 1].forEach(p => {
      const cell = mk('div');
      const acc = state.fired[p] ? Math.round(100 * state.hitCount[p] / state.fired[p]) : 0;
      cell.append(mk('strong', '', sunkCount(state.fleets[1 - p]) + ' sunk'), mk('span', '', state.players[p].name + ' · ' + state.fired[p] + ' shots · ' + acc + '%'));
      sc.appendChild(cell);
    });
    showPanel('result-panel');
  }

  /* ---------- setup + menu ---------- */
  function startMatch(mode, players, level) {
    clearTimers();
    Object.assign(state, {
      mode, level, players, fleets: [newFleet(), newFleet()], shots: [[], []], starter: 0, turn: 0, view: 0,
      sel: null, busy: false, over: false, awaitPass: false
    });
    openPlay('toss-panel');
    if (mode === 'ai') showTossAi(); else showTossFriends();
  }

  $('open-ai').addEventListener('click', () => openPlay('setup-ai'));
  $('open-friends').addEventListener('click', () => openPlay('setup-friends'));
  $('open-how').addEventListener('click', () => $('how-dialog').showModal());
  $('back-menu').addEventListener('click', () => { window.location.href = 'battleship.html'; });
  $('ai-name').addEventListener('input', () => { $('start-ai').disabled = !$('ai-name').value.trim(); });
  $('start-ai').addEventListener('click', () => {
    const name = $('ai-name').value.trim();
    if (!name) { $('ai-error').textContent = 'Enter your name first.'; return; }
    $('ai-error').textContent = '';
    startMatch('ai', [{ name }, { name: name.toLowerCase() === 'ai' ? 'Computer' : 'AI' }], $('ai-level').value);
  });
  $('start-friends').addEventListener('click', () => {
    const one = $('friend-name-1').value.trim();
    const two = $('friend-name-2').value.trim();
    if (!one || !two) { $('friends-error').textContent = 'Enter both player names.'; return; }
    if (one.toLowerCase() === two.toLowerCase()) { $('friends-error').textContent = 'Use different names for both players.'; return; }
    $('friends-error').textContent = '';
    startMatch('friends', [{ name: one }, { name: two }], 'easy');
  });
  $('play-again').addEventListener('click', () => openPlay(state.mode === 'ai' ? 'setup-ai' : 'setup-friends'));
  $('exit-game').addEventListener('click', () => { window.location.href = 'battleship.html'; });
})();

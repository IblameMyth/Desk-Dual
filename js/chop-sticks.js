(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const sound = () => window.ClassroomSounds;

  /* ---------- rules (pure functions) ---------- */
  // A hand holds 0-4 fingers. 0 means the hand is out (a fist).
  // Rollover rule: exactly 5 knocks a hand out, anything over 5 wraps around by subtracting 5.
  function attackValue(attacker, target) {
    const sum = attacker + target;
    if (sum === 5) return 0;
    return sum > 5 ? sum - 5 : sum;
  }

  function sameSet(a, b, c, d) { return (a === c && b === d) || (a === d && b === c); }

  function legalMoves(g, dedupe) {
    const p = g.turn;
    const o = 1 - p;
    const mine = g.hands[p];
    const theirs = g.hands[o];
    const moves = [];
    for (let i = 0; i < 2; i++) {
      if (!mine[i]) continue;
      for (let j = 0; j < 2; j++) {
        if (!theirs[j]) continue;
        // when searching, two equal hands give the same result, so skip the duplicate
        if (dedupe && i === 1 && mine[0] === mine[1]) continue;
        if (dedupe && j === 1 && theirs[0] === theirs[1]) continue;
        moves.push({ t: 'a', from: i, to: j });
      }
    }
    moves.push(...splitMoves(g));
    return moves;
  }

  // Split rule: only with an EVEN total, and the fingers are shared equally (3+1 -> 2+2, 4+0 -> 2+2).
  function splitMoves(g) {
    const mine = g.hands[g.turn];
    const total = mine[0] + mine[1];
    if (total === 0 || total % 2 !== 0) return [];
    const half = total / 2;
    if (half > 4 || (mine[0] === half && mine[1] === half)) return [];
    return [{ t: 's', l: half, r: half }];
  }

  function applyMove(g, m) {
    const hands = [g.hands[0].slice(), g.hands[1].slice()];
    const p = g.turn;
    if (m.t === 'a') {
      hands[1 - p][m.to] = attackValue(hands[p][m.from], hands[1 - p][m.to]);
    } else {
      hands[p][0] = m.l;
      hands[p][1] = m.r;
    }
    return { hands, turn: 1 - p };
  }

  // returns 0 or 1 for the winner, or -1 while the game goes on
  function winnerOf(g) {
    if (g.hands[0][0] + g.hands[0][1] === 0) return 1;
    if (g.hands[1][0] + g.hands[1][1] === 0) return 0;
    return -1;
  }

  /* ---------- AI ---------- */
  function live(h) { return (h[0] > 0) + (h[1] > 0); }

  function bestMove(g, depth) {
    const memo = new Map();
    function key(s, d) { return s.hands[0] + '|' + s.hands[1] + '|' + s.turn + '|' + d; }
    function search(s, d) {
      const w = winnerOf(s);
      if (w !== -1) return -(100 + d); // the player who just moved won, so the side to move has lost
      if (d === 0) {
        const me = s.hands[s.turn];
        const opp = s.hands[1 - s.turn];
        return 4 * (live(me) - live(opp)) + 0.1 * ((opp[0] + opp[1]) - (me[0] + me[1]));
      }
      const k = key(s, d);
      if (memo.has(k)) return memo.get(k);
      let best = -Infinity;
      for (const m of legalMoves(s, true)) {
        const v = -search(applyMove(s, m), d - 1);
        if (v > best) best = v;
      }
      memo.set(k, best);
      return best;
    }
    let bestScore = -Infinity;
    let picks = [];
    for (const m of legalMoves(g, true)) {
      const v = -search(applyMove(g, m), depth - 1);
      if (v > bestScore + 1e-9) { bestScore = v; picks = [m]; }
      else if (Math.abs(v - bestScore) <= 1e-9) picks.push(m);
    }
    const attacks = picks.filter(m => m.t === 'a');
    if (attacks.length) picks = attacks; // equally good? attack instead of splitting
    return picks[Math.floor(Math.random() * picks.length)];
  }

  function chooseAiMove(g, level) {
    const moves = legalMoves(g, false);
    if (level === 'hard') return bestMove(g, 8);
    // easy: random, but it grabs a knock-out about one time in three
    const kos = moves.filter(m => m.t === 'a' && winnerOf(applyMove(g, m)) === g.turn);
    if (kos.length && Math.random() < 0.34) return kos[0];
    const attacks = moves.filter(m => m.t === 'a');
    const pool = attacks.length && Math.random() < 0.8 ? attacks : moves;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /* ---------- hands ---------- */
  const SKINS = [
    { skin: '#f7d6b5', dark: '#d6a578', nail: '#fbe7d8' },
    { skin: '#c68a5b', dark: '#9d6538', nail: '#e3b998' },
    { skin: '#ecbf93', dark: '#c8935f', nail: '#f6dcc8' },
    { skin: '#9a5f35', dark: '#76441f', nail: '#c58f69' }
  ];
  const SLEEVES = [
    { c: '#f4f1e6', d: '#b3ab94' }, { c: '#aecbe8', d: '#7497bb' }
  ];
  const FINGERS = [ // index, middle, ring, pinky: x, top of the raised finger
    { x: 24, y: 22 }, { x: 43, y: 8 }, { x: 62, y: 18 }, { x: 81, y: 36 }
  ];

  function handSvg() {
    let fingers = '';
    FINGERS.forEach((f, k) => {
      fingers +=
        '<g class="fg" data-k="' + k + '">' +
          '<g class="up">' +
            '<rect class="sk sk-edge" x="' + f.x + '" y="' + f.y + '" width="16" height="' + (104 - f.y) + '" rx="8"/>' +
            '<rect class="nail" x="' + (f.x + 3) + '" y="' + (f.y + 4) + '" width="10" height="11" rx="5"/>' +
            '<path class="crease" d="M' + (f.x + 3) + ' ' + (f.y + 38) + 'H' + (f.x + 13) + 'M' + (f.x + 3) + ' ' + (f.y + 52) + 'H' + (f.x + 13) + '"/>' +
          '</g>' +
          '<g class="dn">' +
            '<rect class="sk sk-edge" x="' + f.x + '" y="78" width="16" height="30" rx="8"/>' +
            '<path class="crease" d="M' + (f.x + 3) + ' 98H' + (f.x + 13) + '"/>' +
          '</g>' +
        '</g>';
    });
    return '<svg viewBox="0 0 120 172" aria-hidden="true" focusable="false">' +
      '<path class="sk sk-edge" d="M21 100C21 86 30 80 42 80L80 80C92 80 101 86 101 100L99 130C98 140 91 144 83 144L39 144C31 144 24 140 23 130Z"/>' +
      fingers +
      '<path class="sk sk-edge" d="M22 112C22 102 38 100 52 108C61 114 57 125 47 126L32 128C26 128 22 122 22 112Z"/>' +
      '<path class="crease" d="M30 114Q38 110 46 114"/>' +
      '<rect class="sl" x="20" y="140" width="82" height="34" rx="4"/>' +
      '<path class="sl-line" d="M20 152H102"/>' +
    '</svg>';
  }

  /* ---------- state ---------- */
  const state = {
    mode: null, level: 'easy', players: [], scores: [0, 0], target: 1, game: 1, starter: 0,
    g: { hands: [[1, 1], [1, 1]], turn: 0 }, sel: null, busy: false, over: false, handoff: false, view: 0, timers: []
  };
  let handEls = [[], []];
  let tagEls = [];

  document.addEventListener('pointerdown', () => sound()?.unlock(), { once: true });
  document.addEventListener('click', event => {
    if (event.target.closest('button, a')) sound()?.tap();
  });

  function later(fn, ms) {
    const id = setTimeout(() => {
      state.timers = state.timers.filter(t => t !== id);
      fn();
    }, ms);
    state.timers.push(id);
  }
  function clearTimers() { state.timers.forEach(clearTimeout); state.timers = []; }

  function showPanel(id) {
    ['setup-ai', 'setup-friends', 'toss-panel', 'game-panel', 'result-panel'].forEach(panel =>
      $(panel).classList.toggle('hidden', panel !== id));
  }
  function openPlay(id) {
    clearTimers();
    $('main-menu').classList.add('hidden');
    $('play-area').classList.remove('hidden');
    showPanel(id);
  }

  /* ---------- building the classroom ---------- */
  function buildSides() {
    handEls = [[], []];
    tagEls = [];
    [0, 1].forEach(p => {
      const side = $('side-' + p);
      side.textContent = '';
      const hands = document.createElement('div');
      hands.className = 'cs-hands';
      for (let i = 0; i < 2; i++) {
        const skin = SKINS[(p * 2 + i) % SKINS.length];
        const sleeve = SLEEVES[p % SLEEVES.length];
        const slot = document.createElement('div');
        slot.className = 'cs-slot';
        slot.style.setProperty('--skin', skin.skin);
        slot.style.setProperty('--skin-d', skin.dark);
        slot.style.setProperty('--nail', skin.nail);
        slot.style.setProperty('--sleeve', sleeve.c);
        slot.style.setProperty('--sleeve-d', sleeve.d);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cs-hand' + (i === 0 ? ' mirror' : '');
        btn.innerHTML = handSvg();
        btn.addEventListener('click', () => onHand(p, i));
        const count = document.createElement('span');
        count.className = 'cs-count';
        const bubble = document.createElement('span');
        bubble.className = 'cs-bubble';
        slot.append(btn, count, bubble);
        hands.appendChild(slot);
        handEls[p].push({ slot, btn, count, bubble });
      }
      const bench = document.createElement('div');
      bench.className = 'cs-bench';
      const top = document.createElement('div');
      top.className = 'cs-bench-top';
      const front = document.createElement('div');
      front.className = 'cs-bench-front';
      const tag = document.createElement('div');
      tag.className = 'cs-tag';
      front.appendChild(tag);
      bench.append(top, front);
      tagEls.push(tag);
      side.append(hands, bench);
    });
  }

  function render() {
    const g = state.g;
    [0, 1].forEach(p => {
      tagEls[p].textContent = state.players[p].name;
      $('side-' + p).classList.toggle('is-turn', !state.over && g.turn === p);
      for (let i = 0; i < 2; i++) {
        const v = g.hands[p][i];
        const h = handEls[p][i];
        h.btn.querySelectorAll('.fg').forEach((f, k) => f.classList.toggle('on', k < v));
        h.slot.classList.toggle('is-dead', v === 0);
        h.slot.classList.toggle('is-sel', state.sel !== null && g.turn === p && state.sel === i);
        const canTarget = state.sel !== null && g.turn !== p && v > 0 && !state.busy && !state.over;
        h.slot.classList.toggle('is-target', canTarget);
        h.count.textContent = v === 0 ? 'OUT' : v;
        h.btn.setAttribute('aria-label',
          state.players[p].name + ' ' + (i === 0 ? 'left' : 'right') + ' hand, ' + (v === 0 ? 'out' : v + (v === 1 ? ' finger' : ' fingers')));
      }
    });
    // with friends the active player's hands are always at the bottom, facing whoever holds the phone
    const bottom = state.mode === 'friends' ? state.view : 0;
    $('side-' + bottom).style.order = '3';
    $('side-' + (1 - bottom)).style.order = '1';
    $('side-' + bottom).classList.add('cs-side-bottom');
    $('side-' + bottom).classList.remove('cs-side-top');
    $('side-' + (1 - bottom)).classList.add('cs-side-top');
    $('side-' + (1 - bottom)).classList.remove('cs-side-bottom');
    const humanTurn = isHumanTurn();
    const sm = splitMoves(g)[0];
    $('split-btn').disabled = !humanTurn || !sm;
    $('split-btn').textContent = sm ? 'SPLIT ' + sm.l + ' · ' + sm.r : 'SPLIT';
    $('split-note').textContent = !humanTurn || state.over ? ''
      : sm ? 'Split shares your fingers equally.'
      : 'Split needs an even total of fingers (and a new arrangement).';
    $('split-btn').classList.toggle('hidden', state.over);
    updateBoardScore();
    updateText();
  }

  function isHumanTurn() {
    if (state.over || state.busy || state.handoff) return false;
    return state.mode === 'friends' || state.g.turn === 0;
  }

  function updateBoardScore() {
    const now = new Date();
    $('cs-board-date').textContent =
      String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0');
    $('left-label').textContent = state.players[0].name.toUpperCase();
    $('right-label').textContent = state.players[1].name.toUpperCase();
    setScore('left-score', state.scores[0]);
    setScore('right-score', state.scores[1]);
    $('round-label').textContent = 'GAME ' + state.game;
    $('target-label').textContent = 'FIRST TO ' + state.target;
  }
  function setScore(id, value) {
    const el = $(id);
    if (el.textContent !== String(value)) {
      el.textContent = value;
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
    }
  }

  function updateText() {
    if (state.over) return;
    const p = state.g.turn;
    const name = state.players[p].name;
    const aiThinking = state.mode === 'ai' && p === 1;
    if (aiThinking) {
      $('turn-title').textContent = name + ' is thinking…';
      $('turn-description').textContent = 'Wait for your turn.';
      $('board-msg').textContent = name.toUpperCase() + ' IS THINKING…';
      return;
    }
    $('turn-title').textContent = state.mode === 'ai' ? name + ', your turn' : name + '’s turn';
    $('turn-description').textContent = state.sel === null
      ? 'Tap one of your hands, then tap an opponent’s hand to attack. Or press SPLIT (even total only).'
      : 'Now tap a live hand of your opponent.';
    $('board-msg').textContent = state.sel === null
      ? (state.mode === 'ai' ? 'YOUR TURN' : name.toUpperCase() + '’S TURN')
      : 'TAP A HAND TO ATTACK';
  }

  /* ---------- playing ---------- */
  function fairCoin() {
    if (window.crypto && window.crypto.getRandomValues) {
      const v = new Uint32Array(1);
      window.crypto.getRandomValues(v);
      return (v[0] & 1) === 0 ? 'heads' : 'tails';
    }
    return Math.random() < 0.5 ? 'heads' : 'tails';
  }

  function startMatch(mode, players, bestOf, level) {
    clearTimers();
    Object.assign(state, {
      mode, level, players, scores: [0, 0], target: Math.ceil(bestOf / 2), game: 1, starter: 0, view: 0,
      sel: null, busy: false, over: false, handoff: false
    });
    openPlay('toss-panel');
    if (mode === 'ai') showTossAi(); else showTossFriends();
  }

  /* ---------- coin toss (winner plays first) ---------- */
  function mk(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function showToss(title, copy, parts) {
    const stage = $('toss-stage');
    stage.textContent = '';
    const card = mk('div', 'cs-toss-card');
    card.append(mk('h2', '', title), mk('p', 'khc-muted', copy), ...parts);
    stage.appendChild(card);
  }
  function callOptions(onPick) {
    const wrap = mk('div', 'cs-toss-options');
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
    const wrap = mk('div', 'cs-coin-wrap');
    const coin = mk('div', 'cs-coin');
    const face = mk('div', 'cs-coin-face', '2');
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
    const b = mk('button', 'btn btn-primary hc-start', label);
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
    showToss('Coin toss', state.players[0].name + ', call heads or tails. The winner plays first.', [opts, coin.wrap, go]);
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
    showToss(state.players[0].name + ' calls the toss', 'Pick heads or tails, then pass the phone. The winner plays first.', [opts, next]);
  }

  function tossWon(winner, result) {
    const name = state.players[winner].name;
    const label = state.mode === 'ai' ? 'START GAME'
      : winner === 1 ? 'START GAME' : 'PASS TO ' + name.toUpperCase() + ' & START';
    showToss(name + ' won the toss!', 'The coin shows ' + result.toUpperCase() + '. ' + name + ' plays first.',
      [actionButton(label, () => beginMatch(winner))]);
    sound()?.win?.();
  }

  function beginMatch(starter) {
    state.starter = starter;
    showPanel('game-panel');
    buildSides();
    startGame(false);
  }

  function startGame(askHandoff) {
    clearTimers();
    state.g = { hands: [[1, 1], [1, 1]], turn: state.starter };
    state.sel = null;
    state.busy = false;
    state.over = false;
    state.handoff = false;
    state.view = state.mode === 'friends' ? state.g.turn : 0;
    $('handoff').classList.add('hidden');
    $('round-result').classList.add('hidden');
    $('continue-round').classList.add('hidden');
    $('split-btn').classList.remove('hidden');
    handEls.forEach(row => row.forEach(h => { h.bubble.className = 'cs-bubble'; }));
    render();
    if (askHandoff && state.mode === 'friends') { showHandoff(); return; }
    maybeAi();
  }

  function maybeAi() {
    if (state.over || state.mode !== 'ai' || state.g.turn !== 1) return;
    state.busy = true;
    render();
    later(() => {
      const move = chooseAiMove(state.g, state.level);
      state.busy = false;
      doMove(move);
    }, 900);
  }

  function onHand(p, i) {
    if (state.over || state.busy || state.handoff) return;
    const g = state.g;
    if (state.mode === 'ai' && g.turn !== 0) return;
    if (p === g.turn) {
      if (g.hands[p][i] === 0) {
        $('board-msg').textContent = 'THAT HAND IS OUT · SPLIT TO REVIVE IT';
        return;
      }
      state.sel = state.sel === i ? null : i;
      render();
      return;
    }
    // tapped an opponent hand
    if (state.sel === null) {
      $('board-msg').textContent = 'PICK ONE OF YOUR HANDS FIRST';
      return;
    }
    if (g.hands[p][i] === 0) {
      $('board-msg').textContent = 'THAT HAND IS ALREADY OUT';
      return;
    }
    doMove({ t: 'a', from: state.sel, to: i });
  }

  function pop(p, i, text, cls) {
    const b = handEls[p][i].bubble;
    b.textContent = text;
    b.className = 'cs-bubble show ' + (cls || '');
    later(() => { b.className = 'cs-bubble'; }, 1100);
  }

  function doMove(m) {
    if (state.busy || state.over) return;
    state.busy = true;
    const g = state.g;
    const p = g.turn;
    const o = 1 - p;
    state.sel = null;
    render();

    if (m.t === 'a') {
      const from = handEls[p][m.from];
      const to = handEls[o][m.to];
      from.slot.classList.add(p === (state.mode === 'friends' ? state.view : 0) ? 'strike-up' : 'strike-down');
      later(() => to.slot.classList.add('is-hit'), 220);
      sound()?.desk();
      later(() => {
        from.slot.classList.remove('strike-up', 'strike-down');
        to.slot.classList.remove('is-hit');
        const before = g.hands[o][m.to];
        state.g = applyMove(g, m);
        const after = state.g.hands[o][m.to];
        pop(o, m.to, after === 0 ? 'OUT!' : '+' + g.hands[p][m.from], after === 0 ? 'bad' : '');
        if (after === 0 && before > 0) sound()?.duck();
        finishMove();
      }, 520);
    } else {
      handEls[p].forEach(h => h.slot.classList.add('is-split'));
      sound()?.chalk();
      later(() => {
        handEls[p].forEach(h => h.slot.classList.remove('is-split'));
        state.g = applyMove(g, m);
        pop(p, 0, 'SPLIT!', 'good');
        finishMove();
      }, 420);
    }
  }

  function finishMove() {
    state.busy = false;
    const w = winnerOf(state.g);
    if (w !== -1) { endGame(w); return; }
    render();
    if (state.mode === 'friends') {
      state.busy = true; // let the move animation finish, then ask to pass the phone
      later(() => { state.busy = false; showHandoff(); }, 800);
      return;
    }
    maybeAi();
  }

  function showHandoff() {
    if (state.mode !== 'friends' || state.over) return;
    state.handoff = true;
    $('handoff-name').textContent = state.players[state.g.turn].name;
    $('handoff').classList.remove('hidden');
    render();
  }
  $('handoff-ready').addEventListener('click', () => {
    state.handoff = false;
    state.view = state.g.turn;
    $('handoff').classList.add('hidden');
    render();
  });

  function endGame(w) {
    state.over = true;
    state.busy = false;
    state.scores[w]++;
    render();
    updateBoardScore();
    const winnerName = state.players[w].name;
    const seriesOver = state.scores[w] >= state.target;
    if (seriesOver && window.DeskStats) window.DeskStats.record('chop-sticks', { inc: { [w === 0 ? 'wins' : 'losses']: 1 } });
    const youWon = state.mode === 'ai' ? w === 0 : true;
    youWon ? sound()?.win() : sound()?.lose();
    $('turn-title').textContent = winnerName + ' wins' + (seriesOver ? ' the match!' : ' the game!');
    $('turn-description').textContent = 'Both of ' + state.players[1 - w].name + '’s hands are out.';
    $('board-msg').textContent = winnerName.toUpperCase() + ' WINS!';
    const box = $('round-result');
    box.textContent = '';
    const strong = document.createElement('strong');
    strong.textContent = '🏆 ' + winnerName + ' wins game ' + state.game;
    const note = document.createElement('p');
    note.textContent = 'Score: ' + state.players[0].name + ' ' + state.scores[0] + ' – ' + state.scores[1] + ' ' + state.players[1].name;
    box.append(strong, note);
    box.classList.remove('hidden');
    const next = $('continue-round');
    if (seriesOver) {
      // match won: go straight to the result, no button to press
      next.classList.add('hidden');
      later(finishMatch, 1600);
    } else {
      next.textContent = 'NEXT GAME';
      next.classList.remove('hidden');
    }
  }

  $('continue-round').addEventListener('click', () => {
    if (state.scores[0] >= state.target || state.scores[1] >= state.target) { finishMatch(); return; }
    state.game++;
    state.starter = 1 - state.starter;
    startGame(true);
  });

  function finishMatch() {
    clearTimers();
    const w = state.scores[0] > state.scores[1] ? 0 : 1;
    const winner = state.players[w];
    $('match-result-title').textContent = state.mode === 'ai' && w === 1 ? 'AI wins!' : winner.name + ' wins! 🎉';
    $('match-result-copy').textContent =
      state.mode === 'ai' && w === 1 ? 'Better luck next time. Try again!' : winner.name + ' knocked out every hand.';
    const host = $('final-score');
    host.textContent = '';
    state.players.forEach((p, i) => {
      const cell = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = state.scores[i];
      const label = document.createElement('span');
      label.textContent = p.name;
      cell.append(strong, label);
      host.appendChild(cell);
    });
    showPanel('result-panel');
  }

  /* ---------- split (even totals only, shared equally) ---------- */
  $('split-btn').addEventListener('click', () => {
    if (!isHumanTurn()) return;
    const m = splitMoves(state.g)[0];
    if (m) doMove(m);
  });

  /* ---------- setup screens ---------- */
  $('open-ai').addEventListener('click', () => openPlay('setup-ai'));
  $('open-friends').addEventListener('click', () => openPlay('setup-friends'));
  $('open-how').addEventListener('click', () => $('how-dialog').showModal());
  $('back-menu').addEventListener('click', () => { window.location.href = 'chop-sticks.html'; });

  $('ai-name').addEventListener('input', () => {
    $('start-ai').disabled = !$('ai-name').value.trim();
  });
  $('start-ai').addEventListener('click', () => {
    const name = $('ai-name').value.trim();
    if (!name) { $('ai-error').textContent = 'Enter your name first.'; return; }
    $('ai-error').textContent = '';
    startMatch('ai', [{ name }, { name: name.toLowerCase() === 'ai' ? 'Computer' : 'AI' }],
      Number($('ai-best-of').value), $('ai-level').value);
  });
  $('start-friends').addEventListener('click', () => {
    const one = $('friend-name-1').value.trim();
    const two = $('friend-name-2').value.trim();
    if (!one || !two) { $('friends-error').textContent = 'Enter both player names.'; return; }
    if (one.toLowerCase() === two.toLowerCase()) { $('friends-error').textContent = 'Use different names for both players.'; return; }
    $('friends-error').textContent = '';
    startMatch('friends', [{ name: one }, { name: two }], Number($('best-of').value), 'easy');
  });

  $('play-again').addEventListener('click', () =>
    openPlay(state.mode === 'ai' ? 'setup-ai' : 'setup-friends'));
  $('exit-game').addEventListener('click', () => { window.location.href = 'chop-sticks.html'; });
})();

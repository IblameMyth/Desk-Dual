/* Name, Place, Animal, Thing — Desk Dual classroom edition. */
(function () {
  'use strict';
  const D = window.NPAT_DATA;
  const $ = (id) => document.getElementById(id);
  const play = (n) => { try { window.ClassroomSounds && window.ClassroomSounds[n] && window.ClassroomSounds[n](); } catch (_) {} };
  const CATS = [
    { key: 'name', label: 'Name', icon: '🧑' }, { key: 'place', label: 'Place', icon: '📍' },
    { key: 'animal', label: 'Animal', icon: '🐾' }, { key: 'thing', label: 'Thing', icon: '✏️' }
  ];
  const TIME = 25;

  /* ---------- word helpers ---------- */
  const norm = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\s-]/gu, '').replace(/[\s-]+/g, ' ').trim();
  const stem = (n) => (n.length > 3 && n.endsWith('s') ? n.slice(0, -1) : n);
  const WORDS = {}, KNOWN = {};
  CATS.forEach((c) => {
    WORDS[c.key] = {}; KNOWN[c.key] = new Set();
    for (const L in D.cats[c.key]) {
      WORDS[c.key][L] = D.cats[c.key][L].split(' ').map((w) => w.replace(/_/g, ' '));
      WORDS[c.key][L].forEach((w) => { const n = norm(w); KNOWN[c.key].add(n); KNOWN[c.key].add(stem(n)); });
    }
  });
  const FICT = D.fiction.split(' ').map((w) => w.replace(/_/g, ' '));
  const FICT_SET = new Set(FICT.flatMap((w) => [norm(w), stem(norm(w))]));
  const known = (cat, n, st) => KNOWN[cat].has(n) || KNOWN[cat].has(st);

  /* Judge one answer: status is blank | bad | ok | unsure. */
  function judge(cat, raw, letter, fictionOK) {
    const n = norm(raw), st = stem(n), a = { raw: raw.trim(), n, st, status: 'ok', why: '', rej: false };
    if (!n) { a.status = 'blank'; a.why = 'blank'; return a; }
    if (n[0] !== letter.toLowerCase()) { a.status = 'bad'; a.why = 'wrong letter'; return a; }
    if (n.replace(/ /g, '').length < 2) { a.status = 'bad'; a.why = 'too short'; return a; }
    if (cat === 'name' && (FICT_SET.has(n) || FICT_SET.has(st))) {
      if (!fictionOK) { a.status = 'bad'; a.why = 'fictional'; }
      return a;
    }
    if (known(cat, n, st)) return a;
    if (cat === 'name' && fictionOK) return a; // any made-up name is fine
    a.status = 'unsure'; a.why = 'unchecked';
    return a;
  }
  const isValid = (a) => a.status === 'ok' || (a.status === 'unsure' && !a.rej);

  /* Points: 10 unique, 5 matching, 0 invalid; optional 15 if the only valid answer. */
  function scoreRound(round, bonus) {
    const np = round.ans.length, pts = round.ans.map(() => ({ name: 0, place: 0, animal: 0, thing: 0, total: 0 }));
    CATS.forEach((c) => {
      const valid = round.ans.map((a) => isValid(a[c.key]));
      const count = valid.filter(Boolean).length;
      round.ans.forEach((a, i) => {
        if (!valid[i]) return;
        const same = round.ans.filter((b, j) => valid[j] && b[c.key].st === a[c.key].st).length;
        pts[i][c.key] = same > 1 ? 5 : (bonus && np > 1 && count === 1 ? 15 : 10);
      });
    });
    pts.forEach((p) => { p.total = p.name + p.place + p.animal + p.thing; });
    return pts;
  }

  /* ---------- AI ---------- */
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function aiAnswers(letter, level, fictionOK) {
    const easy = level === 'easy', out = {};
    CATS.forEach((c) => {
      if (Math.random() > (easy ? 0.6 : 0.93)) { out[c.key] = ''; return; }
      if (easy && Math.random() < 0.08) { const other = pick(D.letters.replace(letter, '').split('')); out[c.key] = pick(WORDS[c.key][other]); return; }
      let list = WORDS[c.key][letter];
      if (c.key === 'name' && fictionOK) { const f = FICT.filter((w) => w[0].toUpperCase() === letter); if (f.length && Math.random() < 0.3) list = f; }
      out[c.key] = easy ? pick(list.slice(0, 3)) : pick(list);
    });
    return out;
  }

  /* ---------- state ---------- */
  let G = null, cur = null, who = 0, timer = null, deadline = 0, submitted = false;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const panels = ['setup-ai', 'setup-friends', 'game-panel', 'result-panel'];
  function show(id) {
    $('main-menu').classList.add('hidden'); $('play-area').classList.remove('hidden');
    panels.forEach((p) => $(p).classList.toggle('hidden', p !== id));
    window.scrollTo(0, 0);
  }
  const committedTotals = () => G.players.map((_, i) => G.log.reduce((s, r) => s + r.pts[i].total, 0));
  function renderScore(live) {
    let t = committedTotals();
    if (live) { const p = scoreRound(cur, G.bonus); t = t.map((v, i) => v + p[i].total); }
    const box = $('score-match'), multi = G.players.length > 2;
    box.className = multi ? 'chalk-match chalk-multi' : 'chalk-match';
    box.replaceChildren(...G.players.flatMap((name, i) => {
      const team = el('div', multi ? 'chalk-multi-player' : 'chalk-team ' + (i ? 'chalk-team-ai' : 'chalk-team-you'));
      team.append(el('span', 'chalk-name', name), el('span', 'chalk-score', String(t[i])));
      return !multi && i === 0 ? [team, el('span', 'chalk-vs', 'vs')] : [team];
    }));
    $('round-label').textContent = 'ROUND ' + (G.r + 1) + ' OF ' + G.rounds + (cur ? ' · LETTER ' + cur.letter : '');
  }

  /* ---------- setup ---------- */
  function begin(cfg) {
    G = Object.assign({ r: 0, log: [] }, cfg);
    G.letters = shuffle(D.letters.split('')).slice(0, G.rounds);
    const d = new Date(); $('np-date').textContent = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
    show('game-panel'); startRound();
  }
  function setupAI() {
    const name = $('ai-name').value.trim();
    begin({ mode: 'ai', players: [name, 'AI'], level: $('ai-level').value, rounds: +$('ai-rounds').value, fiction: $('ai-fiction').value === 'yes', bonus: $('ai-bonus').value === 'yes' });
  }
  function buildNameFields() {
    const n = +$('f-count').value, box = $('f-names'), old = Array.from(box.querySelectorAll('input')).map((i) => i.value);
    box.replaceChildren(...Array.from({ length: n }, (_, i) => {
      const lab = el('label', 'khc-field', 'Player ' + (i + 1)), inp = el('input'); inp.maxLength = 18; inp.placeholder = 'Enter Player ' + (i + 1) + ' name';
      inp.autocomplete = 'off'; inp.value = old[i] || ''; lab.append(inp); return lab;
    }));
  }
  function setupFriends() {
    const names = Array.from($('f-names').querySelectorAll('input')).map((i) => i.value.trim()), err = $('friends-error');
    if (names.some((n) => !n)) { err.textContent = 'Enter every player’s name.'; return; }
    if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) { err.textContent = 'Players need different names.'; return; }
    err.textContent = '';
    begin({ mode: 'friends', players: names, rounds: +$('f-rounds').value, fiction: $('f-fiction').value === 'yes', bonus: $('f-bonus').value === 'yes' });
  }

  /* ---------- round flow ---------- */
  function startRound() {
    cur = { letter: G.letters[G.r], ans: [] }; who = 0;
    $('g-review').classList.add('hidden'); $('g-write').classList.remove('hidden');
    $('letter-card').textContent = '?'; renderScore(false);
    if (G.mode === 'friends') handoff(0, 'Round ' + (G.r + 1) + ' of ' + G.rounds + '. Your 25 seconds start as soon as the letter appears.', beginWrite);
    else beginWrite();
  }
  function handoff(i, copy, then) {
    $('handoff-name').textContent = G.players[i]; $('handoff-copy').textContent = copy;
    $('handoff').classList.remove('hidden');
    $('handoff-ready').onclick = () => { $('handoff').classList.add('hidden'); play('tap'); then(); };
  }
  const inputs = () => Array.from(document.querySelectorAll('#write-fields input'));
  function beginWrite() {
    submitted = false;
    inputs().forEach((i) => { i.value = ''; i.disabled = true; });
    $('done-btn').disabled = true; $('write-note').textContent = '';
    $('who-label').textContent = G.mode === 'friends' ? G.players[who] + ' writes' : G.players[0] + ', get ready';
    setTime(TIME);
    const card = $('letter-card'); card.classList.add('spin');
    let ticks = 0;
    const spin = setInterval(() => {
      card.textContent = D.letters[Math.floor(Math.random() * D.letters.length)]; if (ticks++ % 3 === 0) play('tap');
      if (ticks > 8) {
        clearInterval(spin); card.classList.remove('spin'); card.textContent = cur.letter; play('bell');
        inputs().forEach((i) => { i.disabled = false; }); $('done-btn').disabled = false;
        if (G.mode === 'friends') $('who-label').textContent = G.players[who] + ' writes';
        else $('who-label').textContent = G.players[0] + ' writes';
        inputs()[0].focus(); startTimer();
      }
    }, 90);
  }
  function setTime(s) {
    const left = Math.max(0, s), low = left <= 5;
    $('time-num').textContent = Math.ceil(left);
    $('time-bar').style.transform = 'scaleX(' + (left / TIME) + ')';
    document.querySelector('.np-time').classList.toggle('low', low); document.querySelector('.np-bar').classList.toggle('low', low);
  }
  function startTimer() {
    deadline = Date.now() + TIME * 1000; let lastWhole = TIME;
    clearInterval(timer);
    timer = setInterval(() => {
      const left = (deadline - Date.now()) / 1000; setTime(left);
      const whole = Math.ceil(left); if (whole <= 5 && whole > 0 && whole !== lastWhole) play('tap'); lastWhole = whole;
      if (left <= 0) submit(true);
    }, 100);
  }
  function submit(timeUp) {
    if (submitted) return; submitted = true; clearInterval(timer);
    const vals = {}; inputs().forEach((i) => { vals[i.dataset.cat] = i.value; i.disabled = true; i.blur(); });
    $('done-btn').disabled = true; $('write-note').textContent = timeUp ? 'Time’s up! Pens down.' : '';
    play(timeUp ? 'wicket' : 'page');
    const ans = {}; CATS.forEach((c) => { ans[c.key] = judge(c.key, vals[c.key] || '', cur.letter, G.fiction); });
    cur.ans[who] = ans;
    if (G.mode === 'ai') {
      const ai = aiAnswers(cur.letter, G.level, G.fiction), a2 = {};
      CATS.forEach((c) => { a2[c.key] = judge(c.key, ai[c.key], cur.letter, G.fiction); });
      cur.ans[1] = a2; setTimeout(showReview, 700);
    } else if (who < G.players.length - 1) {
      who++; setTimeout(() => handoff(who, 'Same letter, fresh 25 seconds. Earlier answers are hidden.', beginWrite), 700);
    } else setTimeout(showReview, 700);
  }

  /* ---------- review ---------- */
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  function renderReview() {
    const pts = scoreRound(cur, G.bonus), wrap = el('div', 'np-cards');
    cur.ans.forEach((a, i) => {
      const card = el('section', 'np-pcard'), head = el('header', 'np-pcard-head');
      head.append(el('b', '', G.players[i]), el('span', 'np-total', '+' + pts[i].total)); card.append(head);
      CATS.forEach((c) => {
        const x = a[c.key], ok = isValid(x), row = el('div', 'np-prow'), mid = el('div', 'np-pans');
        mid.append(el('span', 'np-ans' + (x.status === 'blank' ? ' is-empty' : ok ? '' : ' is-bad'), x.status === 'blank' ? '—' : x.raw));
        if (x.why && x.status !== 'blank' && !(x.status === 'unsure' && !x.rej)) mid.append(el('span', 'np-why', x.why));
        if (x.status === 'unsure') {
          const b = el('button', 'np-chk', x.rej ? '✗ REJECTED' : 'UNCHECKED · REJECT?'); b.type = 'button'; b.setAttribute('aria-pressed', String(x.rej));
          b.onclick = () => { x.rej = !x.rej; play('tap'); renderReview(); }; mid.append(b);
        }
        const p = pts[i][c.key];
        row.append(el('span', 'np-plabel', c.icon + ' ' + c.label), mid, el('span', 'np-pts p' + p, '+' + p)); card.append(row);
      });
      wrap.append(card);
    });
    $('review-table').replaceChildren(wrap); renderScore(true);
  }
  function showReview() {
    $('g-write').classList.add('hidden'); $('g-review').classList.remove('hidden');
    $('review-title').textContent = 'Round ' + (G.r + 1) + ' · Letter ' + cur.letter;
    $('review-help').textContent = G.mode === 'ai' ? 'Check the sheet. Words the game can’t verify count unless you reject them.' : 'Check the sheet together. Reject any unchecked word that isn’t real.';
    $('next-btn').textContent = G.r + 1 >= G.rounds ? 'SEE FINAL RESULT' : 'NEXT ROUND';
    renderReview(); play('reveal'); window.scrollTo(0, 0);
  }
  function nextRound() {
    const pts0 = scoreRound(cur, G.bonus); G.log.push({ letter: cur.letter, pts: pts0 });
    try {
      const mine = cur.ans[0];
      window.DeskStats && window.DeskStats.record('npat', { inc: { score: pts0[0].total, rounds: 1, validAnswers: CATS.filter((c) => isValid(mine[c.key])).length, totalAnswers: CATS.length } });
    } catch (_) {}
    G.r++;
    if (G.r >= G.rounds) return finish();
    startRound();
  }

  /* ---------- final ---------- */
  function finish() {
    const t = committedTotals(), top = Math.max(...t), winners = t.map((v, i) => (v === top ? i : -1)).filter((i) => i >= 0);
    const order = t.map((v, i) => i).sort((x, y) => t[y] - t[x]), box = el('div');
    const rank = el('ol', 'np-rank');
    order.forEach((i) => { const li = el('li', t[i] === top ? 'np-win' : ''); li.append(el('span', '', G.players[i]), el('b', '', String(t[i]))); rank.append(li); });
    const tbl = el('table', 'np-table np-wide'), head = el('tr');
    tbl.style.minWidth = (78 + 70 * G.players.length) + 'px';
    ['Round', ...G.players].forEach((h) => head.append(el('th', '', h))); tbl.append(el('thead')); tbl.firstChild.append(head);
    const body = el('tbody');
    G.log.forEach((r, i) => { const tr = el('tr'); tr.append(el('th', '', (i + 1) + ' · ' + r.letter)); r.pts.forEach((p) => tr.append(el('td', '', String(p.total)))); body.append(tr); });
    const foot = el('tfoot'), fr = el('tr'); fr.append(el('th', '', 'Total'));
    t.forEach((v) => fr.append(el('td', 'np-total', String(v)))); foot.append(fr);
    tbl.append(body, foot); box.append(rank, tbl); $('final-table').replaceChildren(box);
    const names = winners.map((i) => G.players[i]);
    $('final-title').textContent = winners.length === 1 ? names[0] + ' wins!' : 'It’s a tie!';
    $('final-copy').textContent = winners.length === 1 ? names[0] + ' tops the class with ' + top + ' points.' : names.join(', ') + ' tie on ' + top + ' points. Call for a decider round!';
    show('result-panel'); renderScore(false);
    if (winners.length > 1) play('bell'); else if (G.mode === 'ai') play(winners[0] === 0 ? 'win' : 'lose'); else play('win');
  }

  /* ---------- wiring ---------- */
  $('open-ai').onclick = () => show('setup-ai');
  $('open-friends').onclick = () => { buildNameFields(); show('setup-friends'); };
  $('f-count').onchange = buildNameFields;
  $('open-how').onclick = () => { const d = $('how-dialog'); if (d.showModal) d.showModal(); else d.setAttribute('open', ''); };
  $('ai-name').addEventListener('input', () => { $('start-ai').disabled = !$('ai-name').value.trim(); });
  $('start-ai').onclick = setupAI; $('start-friends').onclick = setupFriends;
  $('done-btn').onclick = () => submit(false); $('next-btn').onclick = nextRound;
  $('play-again').onclick = () => begin({ mode: G.mode, players: G.players, level: G.level, rounds: G.rounds, fiction: G.fiction, bonus: G.bonus });
  $('write-fields').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return; e.preventDefault();
    const list = inputs(), i = list.indexOf(e.target);
    if (i === list.length - 1) submit(false); else if (i >= 0) list[i + 1].focus();
  });
  document.addEventListener('pointerdown', () => { try { window.ClassroomSounds && window.ClassroomSounds.unlock(); } catch (_) {} }, { once: true });
})();

/* Small DOM helpers. Writes are cached so unchanged values never touch the DOM. */

export function toast(message, ms = 2400) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), ms);
}

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const els = {
    name1: $('name1'),
    name2: $('name2'),
    score1: $('score1'),
    score2: $('score2'),
    round: $('round'),
    turn: $('turn'),
    power: $('power'),
    hint: $('hint'),
  };
  const cache = {};
  const setText = (key, value) => {
    if (cache[key] === value) return;
    cache[key] = value;
    els[key].textContent = value;
  };

  return {
    setNames(a, b) {
      const match = document.querySelector('.chalk-match');
      if (Array.isArray(a)) {
        const key = `multi:${a.join('|')}`;
        if (cache.names === key) return;
        cache.names = key;
        match.className = 'chalk-match chalk-multi';
        match.replaceChildren(...a.map((name, i) => {
          const team = document.createElement('div');
          team.className = 'chalk-multi-player';
          team.dataset.player = `p${i + 1}`;
          const n = document.createElement('span');
          n.className = 'chalk-name';
          n.textContent = name;
          const score = document.createElement('span');
          score.className = 'chalk-score';
          score.id = `multi-score-${i}`;
          score.textContent = '•';
          team.append(n, score);
          return team;
        }));
        return;
      }
      if (!match.classList.contains('chalk-multi')) match.className = 'chalk-match';
      setText('name1', a);
      setText('name2', b);
    },
    setScores(a, b) {
      if (Array.isArray(a)) {
        a.forEach((v, i) => {
          const el = document.getElementById(`multi-score-${i}`);
          if (!el) return;
          const next = String(v);
          if (el.textContent === next) return;
          el.textContent = next;
          el.classList.remove('pop');
          void el.offsetWidth;
          el.classList.add('pop');
        });
        return;
      }
      for (const [key, v] of [['score1', a], ['score2', b]]) {
        const changed = cache[key] !== undefined && cache[key] !== String(v);
        setText(key, String(v));
        if (changed) {
          els[key].classList.remove('pop');
          void els[key].offsetWidth;
          els[key].classList.add('pop');
        }
      }
    },
    setRound(n) {
      setText('round', String(n));
    },
    setTurn(label, side) {
      setText('turn', label);
      if (cache.side !== side) {
        cache.side = side;
        els.turn.dataset.side = side;
      }
    },
    setHint(text) {
      setText('hint', text);
    },
    /** @param {number} p power from 0 to 1 */
    setPower(p) {
      const v = Math.round(p * 50) / 50; // 2% steps
      if (cache.power === v) return;
      cache.power = v;
      els.power.style.setProperty('--power', v.toFixed(2));
      els.power.setAttribute('aria-valuenow', String(Math.round(v * 100)));
    },
    showFatal(message) {
      let box = document.getElementById('fatal');
      if (!box) {
        box = document.createElement('div');
        box.id = 'fatal';
        box.className = 'fatal';
        box.setAttribute('role', 'alert');
        document.body.appendChild(box);
      }
      box.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = message;
      const a = document.createElement('a');
      a.className = 'btn btn-small';
      a.href = 'index.html';
      a.textContent = 'BACK TO MENU';
      box.append(p, a);
    },
  };
}

/** Big "ROUND 2" style banner in the middle of the screen. */
export function banner(text) {
  const el = document.getElementById('banner');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

/** Result overlay (round / match). Buttons: [{label, primary, onClick}]. */
export function showOverlay({ kicker, title, score, scoreLabel = 'Score', side, stats = [], buttons }) {
  const ov = document.getElementById('overlay');
  document.getElementById('ov-kicker').textContent = kicker;
  const t = document.getElementById('ov-title');
  t.textContent = title;
  t.parentElement.dataset.side = side || '';
  document.getElementById('ov-score-label').textContent = scoreLabel;
  document.getElementById('ov-score').textContent = score;
  const list = document.getElementById('ov-stats');
  list.replaceChildren(
    ...stats.map(([label, value]) => {
      const li = document.createElement('li');
      const b = document.createElement('b');
      b.textContent = value;
      li.append(b, label);
      return li;
    })
  );
  const actions = document.getElementById('ov-actions');
  actions.replaceChildren(
    ...buttons.map(({ label, primary, onClick }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn${primary ? ' btn-primary' : ''}`;
      btn.textContent = label;
      btn.addEventListener('click', onClick);
      return btn;
    })
  );
  ov.hidden = false;
  actions.firstElementChild?.focus();
}

export function hideOverlay() {
  document.getElementById('overlay').hidden = true;
}

export function confetti() {
  const box = document.getElementById('confetti');
  if (!box) return;
  const colors = ['#2f6bff', '#ff4a4a', '#ffe14d', '#3ddc84', '#ffffff'];
  for (let i = 0; i < 36; i++) {
    const s = document.createElement('span');
    s.style.left = `${Math.random() * 100}%`;
    s.style.background = colors[i % colors.length];
    s.style.animationDuration = `${2 + Math.random() * 2}s`;
    s.style.animationDelay = `${Math.random() * 0.6}s`;
    s.style.setProperty('--drift', `${(Math.random() - 0.5) * 160}px`);
    box.appendChild(s);
  }
  setTimeout(() => box.replaceChildren(), 5000);
}

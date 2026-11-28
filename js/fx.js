/* Desk Dual - shared animation + sound layer.
   Loaded as a plain script at the end of every page. It only ADDS things on top of the games:
   it never changes game state, sign-in, or storage, and the whole file is wrapped so that if
   anything here ever fails the games carry on exactly as before. */
(function () {
  'use strict';
  try { init(); } catch (err) { if (window.console) console.warn('[fx] effects disabled:', err); }

  function init() {
    var D = document, root = D.documentElement;
    var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var marks = {};              // last time a game played win / lose / etc.
    var lastPlay = {};

    function settings() { try { return JSON.parse(localStorage.getItem('deskduel.settings.v1') || '{}'); } catch (_) { return {}; } }
    function motionOK() { return !(mq && mq.matches) && settings().graphics !== 'low'; }
    function sfx() { return window.ClassroomSounds; }
    function now() { return (window.performance && performance.now()) || Date.now(); }
    function play(name, gap) {
      var s = sfx(); if (!s || typeof s[name] !== 'function') return false;
      var t = now(); if (gap && t - (lastPlay[name] || -1e9) < gap) return false;
      lastPlay[name] = t;
      try { s[name].apply(s, Array.prototype.slice.call(arguments, 2)); } catch (_) {}
      return true;
    }

    /* ---- wrap the games' own sounds: stop stacked duplicates, and remember when win/lose played ---- */
    (function wrap() {
      var s = sfx(); if (!s) return;
      var gaps = { tap: 110, win: 900, lose: 900, bell: 250, chalk: 70, desk: 60 };
      Object.keys(gaps).forEach(function (n) {
        var orig = s[n]; if (typeof orig !== 'function' || orig.__fx) return;
        var wrapped = function () {
          var t = now(); marks[n] = t;
          if (t - (lastPlay['w:' + n] || -1e9) < gaps[n]) return;
          lastPlay['w:' + n] = t;
          return orig.apply(s, arguments);
        };
        wrapped.__fx = true; s[n] = wrapped;
      });
    })();

    /* ---- overlay layer: rings, sparks, confetti canvas ---- */
    var layer, cv, ctx, parts = [], raf = 0, dpr = 1, lastT = 0;
    function getLayer() {
      if (!layer) { layer = D.createElement('div'); layer.id = 'fx-layer'; layer.setAttribute('aria-hidden', 'true'); D.body.appendChild(layer); }
      return layer;
    }
    function resize() { if (!cv) return; dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); }
    function ensureCanvas() {
      if (cv) return;
      cv = D.createElement('canvas'); getLayer().appendChild(cv); ctx = cv.getContext('2d'); resize();
      window.addEventListener('resize', resize);
    }
    var COLORS = ['#f2cf53', '#32609a', '#c93637', '#168044', '#ee7625', '#fff0a1', '#ffffff', '#e8b51c'];
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function addPart(p) { if (parts.length < 320) parts.push(p); }
    function startLoop() { if (!raf) { lastT = 0; raf = requestAnimationFrame(tick); } }
    function tick(t) {
      var dt = lastT ? Math.min((t - lastT) / 1000, 0.05) : 0.016; lastT = t;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.scale(dpr, dpr);
      var h = innerHeight;
      parts = parts.filter(function (p) { return p.life > 0 && p.y < h + 40; });
      parts.forEach(function (p) {
        p.vy += p.g * dt; p.vx *= (1 - p.drag * dt); p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.life -= dt;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2)); ctx.fillStyle = p.c;
        if (p.shape === 'rect') { ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6); }
        else if (p.shape === 'star') { star(p.s); }
        else { ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, 6.2832); ctx.fill(); }
        ctx.restore();
      });
      raf = parts.length ? requestAnimationFrame(tick) : 0;
      if (!raf) ctx.clearRect(0, 0, cv.width, cv.height);
    }
    function star(r) {
      ctx.beginPath();
      for (var i = 0; i < 10; i++) { var a = i * Math.PI / 5, rr = i % 2 ? r * .22 : r * .6; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
    }
    function confetti(opts) {
      if (!motionOK()) return; ensureCanvas(); opts = opts || {};
      var w = innerWidth, h = innerHeight, n = opts.count || 110;
      for (var i = 0; i < n; i++) {
        var side = i % 3, x, y, vx, vy;
        if (side === 0) { x = 0; y = h * .85; vx = rnd(200, 640); vy = rnd(-980, -520); }
        else if (side === 1) { x = w; y = h * .85; vx = rnd(-640, -200); vy = rnd(-980, -520); }
        else { x = rnd(0, w); y = rnd(-40, -5); vx = rnd(-60, 60); vy = rnd(60, 220); }
        addPart({ x: x, y: y, vx: vx, vy: vy, g: 900, drag: .8, rot: rnd(0, 6), vr: rnd(-9, 9), s: rnd(7, 13), c: COLORS[(Math.random() * COLORS.length) | 0], shape: Math.random() < .2 ? 'star' : (Math.random() < .5 ? 'rect' : 'circle'), life: rnd(2.2, 3.4) });
      }
      startLoop();
    }
    function burst(x, y, opts) {
      if (!motionOK()) return; ensureCanvas(); opts = opts || {};
      var n = opts.count || 22, cols = opts.colors || COLORS;
      for (var i = 0; i < n; i++) {
        var a = rnd(0, 6.2832), sp = rnd(80, opts.speed || 340);
        addPart({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, g: 520, drag: 2.2, rot: rnd(0, 6), vr: rnd(-8, 8), s: rnd(5, 10), c: cols[(Math.random() * cols.length) | 0], shape: Math.random() < .4 ? 'star' : 'circle', life: rnd(.5, .95) });
      }
      startLoop();
    }
    function burstOn(el, opts) { if (!el || !el.getBoundingClientRect) return; var r = el.getBoundingClientRect(); if (!r.width && !r.height) return; burst(r.left + r.width / 2, r.top + r.height / 2, opts); }
    function ring(x, y) {
      if (!motionOK()) return; var r = D.createElement('div'); r.className = 'fx-ring'; r.style.left = x + 'px'; r.style.top = y + 'px';
      getLayer().appendChild(r); setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, 650);
    }
    function reflow(el, cls, ms) {
      if (!el || !motionOK()) return;
      el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
      setTimeout(function () { el.classList.remove(cls); el.classList.remove('fx-bump-inline'); }, ms || 700);
    }
    function bump(el) {
      if (!el) return;
      try { if (getComputedStyle(el).display === 'inline') el.classList.add('fx-bump-inline'); } catch (_) {}
      reflow(el, 'fx-bump');
    }
    function shake(el) { reflow(el, 'fx-shake', 520); }
    window.FX = { confetti: confetti, burst: burst, burstOn: burstOn, ring: ring, bump: bump, shake: shake, play: play, motionOK: motionOK };

    /* ---- interaction feedback: click sounds, hover ticks, tap rings ---- */
    var CLICKABLE = 'button,.btn,a.game-card,.game-card,[role="button"],summary,label.chip,.seg button';
    var soundOff = D.body && D.body.getAttribute('data-fx-sound') === 'off';
    D.addEventListener('pointerdown', function () { var s = sfx(); if (s && s.unlock) s.unlock(); }, { once: true, capture: true });
    D.addEventListener('pointerdown', function (e) {
      var el = e.target && e.target.closest && e.target.closest(CLICKABLE);
      if (el && !el.disabled) ring(e.clientX, e.clientY);
    }, true);
    D.addEventListener('click', function (e) {
      if (soundOff) return;
      var el = e.target && e.target.closest && e.target.closest(CLICKABLE);
      if (el && !el.disabled) { var s = sfx(); if (s && s.tap) s.tap(); }
    }, true);
    D.addEventListener('pointerover', function (e) {
      if (soundOff || e.pointerType !== 'mouse') return;
      var el = e.target && e.target.closest && e.target.closest('.btn,.game-card,button');
      if (!el || el.disabled || (e.relatedTarget && el.contains(e.relatedTarget))) return;
      play('hover', 60);
    }, true);

    /* ---- watch the DOM for things the games already do, and decorate them ---- */
    var VIS = '#result-panel,#end-panel,#handoff,#toss-panel,#game-panel,#battle-panel,#place-panel,#how-dialog,#setup-ai,#setup-friends,#ai-panel,#friends-panel,#round-panel,#category-panel,#g-review,.ac-pass';
    var SCORE = '#left-score,#right-score,#score-match,#player-one-score,#player-two-score,#score-list,#score-strip,#score';
    var FLASH = '#turn-title,#phase-title,#who-label,#board-msg,#status,#round-label,#target-label,#letter-card,#banner,#round-result,#ball-result,#callout,#flip-log';
    var vis = new WeakMap(), scoreVal = new WeakMap();
    function isVisible(el) { return !el.hidden && !el.classList.contains('hidden') && (el.open !== false) && el.getClientRects().length > 0; }
    function sum(el) { var m = (el.textContent || '').match(/\d+/g); return m ? m.reduce(function (a, b) { return a + (+b); }, 0) : 0; }
    D.querySelectorAll(VIS).forEach(function (el) { vis.set(el, isVisible(el)); });
    D.querySelectorAll(SCORE).forEach(function (el) { scoreVal.set(el, sum(el)); });

    function onShown(el) {
      var id = el.id || '';
      if (id === 'result-panel' || id === 'end-panel') return endOfMatch();
      if (id === 'handoff' || el.classList.contains('ac-pass')) return play('swipe', 300);
      if (id === 'toss-panel') { play('whoosh', 300); setTimeout(function () { play('clink', 600); }, 1100); return; }
      if (id === 'game-panel' || id === 'battle-panel') return play('whoosh', 400);
      if (id === 'how-dialog' || /^setup-|^place-|^ai-panel$|^friends-panel$|^category-panel$/.test(id)) return play('page', 200);
    }
    function endOfMatch() {
      var t = now();
      setTimeout(function () {
        var lost = now() - (marks.lose || -1e9) < 2200, won = now() - (marks.win || -1e9) < 2200;
        if (lost && !won) { play('thud', 800); return; }
        confetti({ count: 130 });
        if (!won) play('fanfare', 2000);
        setTimeout(function () { confetti({ count: 70 }); }, 700);
      }, 260);
    }
    function scoreChanged(el) {
      var v = sum(el), prev = scoreVal.get(el);
      scoreVal.set(el, v);
      if (prev === undefined || v === prev) return;
      bump(el);
      if (v > prev) { play('coin', 250); burstOn(el, { count: 14, speed: 240 }); }
    }

    var queue = new Set(), scheduled = false;
    function flush() {
      scheduled = false; var items = Array.from(queue); queue.clear();
      items.forEach(function (v) {
        try { var was = vis.get(v), nowVis = isVisible(v); vis.set(v, nowVis); if (nowVis && !was) onShown(v); } catch (_) {}
      });
    }
    var textQueue = new Set();
    var mo = new MutationObserver(function (list) {
      list.forEach(function (m) {
        if (m.type === 'attributes') { if (m.target.matches && m.target.matches(VIS)) queue.add(m.target); }
        else {
          var el = m.target.nodeType === 1 ? m.target : m.target.parentElement; if (!el || !el.closest) return;
          if (el.closest(SCORE)) { var s = el.closest(SCORE); if (!textQueue.has(s)) textQueue.add(s); }
          var f = el.closest(FLASH); if (f && !f.classList.contains('fx-slide') && !f.classList.contains('fx-pop')) textQueue.add(f);
        }
      });
      if (!scheduled) { scheduled = true; requestAnimationFrame(function () { flush(); runText(); }); }
    });
    function runText() {
      var items = Array.from(textQueue); textQueue.clear();
      items.forEach(function (el) {
        try {
          if (el.matches(SCORE)) scoreChanged(el);
          if (el.matches(FLASH) && (el.textContent || '').trim()) reflow(el, 'fx-slide', 500);
        } catch (_) {}
      });
    }
    mo.observe(D.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden', 'open', 'style'] });

    /* ---- home page: number the cards so they rise in one after another ---- */
    D.querySelectorAll('.game-card').forEach(function (c, i) { c.style.setProperty('--i', i); });

    /* ---- turn the animations on once the sign-in gate has let the page show ---- */
    function ready() { if (motionOK()) root.classList.add('fx-ready'); }
    if (!D.getElementById('auth-gate-hide')) ready();
    else {
      var gate = new MutationObserver(function () { if (!D.getElementById('auth-gate-hide')) { gate.disconnect(); ready(); } });
      gate.observe(D.head, { childList: true });
      setTimeout(function () { gate.disconnect(); ready(); }, 8000);
    }
  }
})();

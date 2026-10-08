/*
 * Game controller: two pens, alternating flicks, fall-off-the-desk scoring,
 * best-of-5 matches, AI opponent or local 2-player.
 *
 * Phases: 'aim' (a player may flick) -> 'move' (pens sliding) -> back to 'aim' with the
 * other player, or 'roundEnd' when a pen has left the desk.
 */
import * as ui from './ui.js';
import { FlickInput } from './input.js';
import { DeskRenderer } from './render.js';
import { settings, vibrate } from './settings.js';
import { audio } from './audio.js';
import { AI_BY_LEVEL, PEN_BY_ID, STARTER, loadProgress, completeLevel } from './pens.js';

const params = new URLSearchParams(location.search);
const MODE = params.get('mode') === 'friends' ? 'friends' : (params.get('mode') === 'local' ? 'local' : 'ai');
const LEVEL = Math.max(1, Math.min(10, Number.parseInt(params.get('level') || '1', 10) || 1));
const WIN_SCORE = 3; // best of 5
const FALL_DELAY_MS = 350; // let a falling pen visibly go before the round is called
const MAX_MOVE_MS = 12000; // safety net so a round can never hang
const AI_AIM_MS = 520; // how long the AI "pulls back" before it lets go

const hud = ui.createHud();
const stage = document.getElementById('stage');
const canvas = document.getElementById('desk');

const savedPlayerName = (() => { try { return (localStorage.getItem('deskduel.playerName') || '').trim(); } catch (_) { return ''; } })();
const players = [
  { id: 'p1', name: savedPlayerName || 'YOU', ai: false },
  { id: 'p2', name: MODE === 'ai' ? AI_BY_LEVEL[LEVEL].name : 'PLAYER 2', ai: MODE === 'ai' },
];

function spawnFor(index, portrait) {
  // Start both pens perfectly parallel and comfortably separated.  This is
  // intentionally identical to the smooth Friends-mode setup so the AI mode
  // never starts with the long pen artwork visually crossing or jittering.
  if (portrait) {
    return index === 0
      ? { fx: 0.5, fy: 0.73, angle: 0 }
      : { fx: 0.5, fy: 0.27, angle: Math.PI };
  }
  return index === 0
    ? { fx: 0.30, fy: 0.50, angle: 0 }
    : { fx: 0.70, fy: 0.50, angle: Math.PI };
}

async function main() {
  if (!window.Matter) {
    hud.showFatal('The physics engine could not load. Check your internet connection and refresh the page.');
    return;
  }
  const [{ PhysicsWorld, CONFIG }, { planShot }] = await Promise.all([import('./physics.js'), import('./ai.js')]);
  const renderer = new DeskRenderer(canvas);
  canvas.addEventListener('pen-model-loaded', () => { dirty = true; });

  let physics = null;
  let dirty = true;
  let phase = 'boot';
  let turn = 0;
  let round = 1;
  let scores = [0, 0];
  let stats = { rounds: 0, collisions: 0, strongest: 0 };
  let aiPlan = null;
  let fallAt = 0;
  let moveStart = 0;
  let endTimer = 0;
  let slideLevel = -1;

  const progress = loadProgress();
  if (MODE === 'ai' && LEVEL > progress.unlockedLevel) { location.replace('levels.html'); return; }
  const playerPen = progress.equipped === 'starter' ? STARTER : PEN_BY_ID[progress.equipped] || STARTER;
  const opponentPen = MODE === 'ai' ? PEN_BY_ID[AI_BY_LEVEL[LEVEL].penId] : STARTER;
  document.title = `Desk Duel - ${MODE === 'ai' ? `Level ${LEVEL} vs ${AI_BY_LEVEL[LEVEL].name}` : 'Local 2 player'}`;
  hud.setNames(players[0].name, players[1].name);

  // ---------- input ----------
  const input = new FlickInput({
    element: canvas,
    toWorld(e) {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) * physics.size.w) / r.width,
        y: ((e.clientY - r.top) * physics.size.h) / r.height,
      };
    },
    pick(pt) {
      if (phase !== 'aim' || players[turn].ai) return null; // only the player whose turn it is, never the CPU's pen
      const id = players[turn].id;
      return physics.penContains(id, pt, CONFIG.grabPadding) ? id : null;
    },
    onStart() {
      audio.unlock();
      document.body.classList.add('is-aiming');
    },
    onRelease({ penId, start, current }) {
      document.body.classList.remove('is-aiming');
      if (phase !== 'aim') return;
      const result = physics.flick(penId, start, { x: start.x - current.x, y: start.y - current.y });
      if (result) onShot(result);
      dirty = true;
    },
    onCancel() {
      document.body.classList.remove('is-aiming');
      dirty = true;
    },
  });

  // ---------- layout ----------
  function applyLayout() {
    const cs = getComputedStyle(stage);
    const cw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ch = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (cw < 50 || ch < 50) return;

    const d = cw < ch ? CONFIG.desk.portrait : CONFIG.desk.landscape; // portrait screens get a portrait desk

    // Desktop landscape: use a cover-style fit so the classroom scene fills
    // the whole available stage instead of leaving large empty side bands.
    // The physics world stays exactly the same (1400x800); only the rendered
    // classroom canvas is allowed to extend slightly beyond the stage and is
    // clipped by the stage. Portrait/mobile keeps the safer contain fit.
    const landscapeCover = d === CONFIG.desk.landscape && cw > ch;
    const scale = landscapeCover
      ? Math.max(cw / d.w, ch / d.h)
      : Math.min(cw / d.w, ch / d.h);
    const cssW = Math.floor(d.w * scale);
    const cssH = Math.floor(d.h * scale);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    const dpr = Math.min(window.devicePixelRatio || 1, settings.graphics === 'low' ? 1 : 2);

    const first = !physics;
    if (first) {
      physics = new PhysicsWorld(d.w, d.h, d.playArea);
      const portrait = d.h > d.w;
      players.forEach((p, i) => {
        const model = i === 0 ? playerPen : opponentPen;
        physics.addPen(p.id, { ...spawnFor(i, portrait), skin: i === 0 ? 'blue' : 'red', asset: model.asset, modelId: model.id, strength: model.strength || 1 });
      });
      physics.onCollision = ({ speed }) => {
        if (speed < 0.5) return;
        stats.collisions++;
        audio.hit(speed);
        if (speed > 8) vibrate(15);
      };
    } else if (physics.size.w !== d.w || physics.size.h !== d.h) {
      input.cancel();
      physics.resize(d.w, d.h, d.playArea);
      const portrait = d.h > d.w;
      players.forEach((p, i) => physics.resetPen(p.id, spawnFor(i, portrait)));
      if (aiPlan) planAi(0);
    }
    renderer.resize({ cssW, cssH, dpr, world: d });
    dirty = true;
    if (first) startRound();
  }

  let layoutQueued = false;
  new ResizeObserver(() => {
    if (layoutQueued) return;
    layoutQueued = true;
    requestAnimationFrame(() => {
      layoutQueued = false;
      applyLayout();
    });
  }).observe(stage);

  // ---------- match flow ----------
  function penPos(i) {
    const p = physics.pens.get(players[i].id).body.position;
    return { x: p.x, y: p.y };
  }

  function planAi(extraDelayMs) {
    if (!players[turn].ai) {
      aiPlan = null;
      return;
    }
    aiPlan = { ...planShot(LEVEL, penPos(turn), penPos(1 - turn), physics.size, physics.playArea), t0: performance.now() + extraDelayMs };
  }

  function updateHud() {
    hud.setScores(scores[0], scores[1]);
    hud.setRound(round);
    hud.setTurn(`${players[turn].name} TURN`, turn === 0 ? 'p1' : 'p2');
  }

  function startRound() {
    clearTimeout(endTimer);
    ui.hideOverlay();
    const portrait = physics.size.h > physics.size.w;
    players.forEach((p, i) => physics.resetPen(p.id, spawnFor(i, portrait)));
    turn = (round - 1) % 2; // the starting player alternates each round
    phase = 'aim';
    fallAt = 0;
    updateHud();
    ui.banner(`ROUND ${round}`);
    planAi(800);
    dirty = true;
  }

  function nextRound() {
    round++;
    startRound();
  }

  function restartMatch() {
    scores = [0, 0];
    round = 1;
    stats = { rounds: 0, collisions: 0, strongest: 0 };
    startRound();
  }

  function onShot({ power }) {
    phase = 'move';
    moveStart = performance.now();
    fallAt = 0;
    stats.strongest = Math.max(stats.strongest, power);
    audio.flick(power);
    vibrate(12);
    dirty = true;
  }

  function resolveShot() {
    const fell = players.map((p) => {
      const s = physics.penStatus(p.id);
      return s.fullyOut || s.centerOut;
    });
    if (fell[0] && fell[1]) return endRound(null);
    if (fell[0] || fell[1]) return endRound(fell[0] ? 1 : 0); // the opponent of the fallen pen scores
    turn = 1 - turn;
    phase = 'aim';
    updateHud();
    planAi(0);
    dirty = true;
  }

  function endRound(winner) {
    phase = 'roundEnd';
    stats.rounds++;
    aiPlan = null;
    if (winner !== null) {
      scores[winner]++;
      audio.roundWin();
      vibrate([30, 40, 30]);
    }
    hud.setScores(scores[0], scores[1]);
    const matchOver = winner !== null && scores[winner] >= WIN_SCORE;
    endTimer = setTimeout(() => (matchOver ? showMatch(winner) : showRound(winner)), 800);
  }

  function showRound(winner) {
    const score = `${scores[0]} - ${scores[1]}`;
    if (winner === null) {
      ui.showOverlay({
        kicker: 'DRAW',
        title: 'BOTH PENS FELL',
        score,
        buttons: [{ label: 'REPLAY ROUND', primary: true, onClick: startRound }],
      });
      return;
    }
    ui.showOverlay({
      kicker: 'ROUND WINNER',
      title: `${players[winner].name} WINS!`,
      score,
      side: winner === 0 ? 'p1' : 'p2',
      buttons: [{ label: 'NEXT ROUND', primary: true, onClick: nextRound }],
    });
  }

  function showMatch(winner) {
    phase = 'matchEnd';
    audio.matchWin();
    ui.confetti();
    const playerWon = MODE === 'ai' && winner === 0;
    const reward = playerWon ? PEN_BY_ID[AI_BY_LEVEL[LEVEL].penId] : null;
    if (playerWon) completeLevel(LEVEL);
    const next = Math.min(10, LEVEL + 1);
    const buttons = [];
    if (playerWon && LEVEL < 10) {
      buttons.push({ label: `NEXT: LEVEL ${next}`, primary: true, onClick: () => (location.href = `game.html?mode=ai&level=${next}`) });
    } else if (playerWon && LEVEL === 10) {
      buttons.push({ label: 'PLAY AGAIN', primary: true, onClick: restartMatch });
    } else {
      buttons.push({ label: 'TRY AGAIN', primary: true, onClick: restartMatch });
    }
    buttons.push({ label: 'PEN COLLECTION', onClick: () => (location.href = 'levels.html') });
    buttons.push({ label: 'MAIN MENU', onClick: () => (location.href = 'index.html') });
    ui.showOverlay({
      kicker: playerWon ? 'PEN CAPTURED' : 'MATCH COMPLETE',
      title: playerWon ? `🏆 ${players[winner].name} WINS` : `💥 ${players[winner].name} WINS`,
      scoreLabel: playerWon ? `You won ${reward?.name || 'the opponent pen'}` : 'Final score',
      score: `${scores[0]} - ${scores[1]}`,
      side: winner === 0 ? 'p1' : 'p2',
      stats: [
        ['rounds', String(stats.rounds)],
        ['collisions', String(stats.collisions)],
        ['top shot', `${Math.round(stats.strongest * 100)}%`],
      ],
      buttons,
    });
  }

  // restart button: tap twice so it can't be hit by accident
  const restartBtn = document.getElementById('btn-restart');
  let restartArmed = 0;
  restartBtn.addEventListener('click', () => {
    if (restartArmed) {
      clearTimeout(restartArmed);
      restartArmed = 0;
      restartBtn.textContent = 'RESTART';
      input.cancel();
      restartMatch();
      return;
    }
    restartBtn.textContent = 'SURE?';
    restartArmed = setTimeout(() => {
      restartArmed = 0;
      restartBtn.textContent = 'RESTART';
    }, 2500);
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && aiPlan) aiPlan.t0 = performance.now(); // don't let the CPU "think" while the tab was hidden
  });

  if (params.has('debug')) window.deskDuel = { physics, CONFIG, players, input };

  // ---------- main loop ----------
  function makeAim(pen, grab, current) {
    const px = grab.x - current.x;
    const py = grab.y - current.y;
    const len = Math.hypot(px, py);
    return {
      pen,
      grab,
      current,
      dir: len > 0 ? { x: px / len, y: py / len } : { x: 1, y: 0 },
      power: len < CONFIG.minPull ? 0 : Math.min(len / CONFIG.maxPull, 1),
    };
  }

  const HINTS = {
    human: MODE === 'local' ? null : 'Press your pen, drag backwards, then release.',
    aiming: 'Release to flick!',
    cpu: 'CPU is thinking...',
    moving: 'Sliding... wait for the pens to stop.',
    over: '',
  };

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(now - last, 50);
    last = now;
    physics.update(dt);

    let aim = null;
    let needDraw = dirty;
    const drag = input.state;

    if (phase === 'aim') {
      const pl = players[turn];
      const pos = penPos(turn);
      if (drag) {
        aim = makeAim(pos, drag.start, drag.current);
        hud.setHint(HINTS.aiming);
      } else if (aiPlan) {
        hud.setHint(HINTS.cpu);
        const el = now - aiPlan.t0;
        const think = aiPlan.thinkMs;
        if (el >= think + AI_AIM_MS) {
          const len = aiPlan.power * CONFIG.maxPull;
          const result = physics.flick(pl.id, aiPlan.grab, { x: aiPlan.dir.x * len, y: aiPlan.dir.y * len });
          aiPlan = null;
          if (result) onShot(result);
          needDraw = true;
        } else if (el > think) {
          const k = 1 - (1 - (el - think) / AI_AIM_MS) ** 2; // ease-out pull-back
          const len = aiPlan.power * CONFIG.maxPull * k;
          const cur = { x: aiPlan.grab.x - aiPlan.dir.x * len, y: aiPlan.grab.y - aiPlan.dir.y * len };
          aim = makeAim(pos, aiPlan.grab, cur);
        }
      } else {
        hud.setHint(HINTS.human ?? `${pl.name}: press your pen, drag backwards, release.`);
      }
      hud.setPower(aim ? aim.power : 0);
      if (aim) needDraw = true;
    } else {
      hud.setPower(0);
      hud.setHint(phase === 'move' ? HINTS.moving : HINTS.over);
    }

    if (phase === 'move') {
      needDraw = true;
      if (!fallAt && players.some((p) => physics.penStatus(p.id).fullyOut)) {
        fallAt = now;
        audio.fall();
      }
      const rested = physics.allResting();
      const timedOut = now - moveStart > MAX_MOVE_MS;
      if ((fallAt && now - fallAt > FALL_DELAY_MS) || (!fallAt && rested) || timedOut) {
        if (!rested) physics.freeze();
        resolveShot();
      }
    }

    // pen-on-desk scratch sound follows the fastest pen
    const level = phase === 'move' ? Math.round(Math.min(physics.maxSpeed() / CONFIG.maxSpeed, 1) * 20) / 20 : 0;
    if (level !== slideLevel) {
      slideLevel = level;
      audio.slide(level);
    }

    if (needDraw || ((phase === 'roundEnd' || phase === 'matchEnd') && !physics.allResting())) {
      for (const pen of physics.pens.values()) pen.renderPose = physics.getRenderPose(pen.id);
      renderer.draw(physics, aim, { guide: settings.guide, highlight: phase === 'aim' ? players[turn].id : null });
      dirty = false;
    }
    requestAnimationFrame(frame);
  }

  applyLayout();
  requestAnimationFrame(frame);
}

if (MODE === 'friends') {
  import('./friends.js').then(({ startFriendsGame }) => startFriendsGame());
} else {
  main();
}

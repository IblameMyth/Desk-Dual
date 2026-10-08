/* Local friends mode: 2–5 players, a best-of-match free-for-all: first player to win 3 rounds wins the match. */
import * as ui from './ui.js';
import { FlickInput } from './input.js';
import { DeskRenderer } from './render.js';
import { settings, vibrate } from './settings.js';
import { audio } from './audio.js';
import { PENS, STARTER, PEN_BY_ID } from './pens.js';

const WIN_DELAY = 900;
const FALL_DELAY_MS = 350;
const MAX_MOVE_MS = 12000;
const WIN_SCORE = 3; // first player to win 3 rounds wins the match

function getSetup() {
  try {
    const raw = JSON.parse(localStorage.getItem('deskDuelFriendsSetupV1') || 'null');
    if (!raw || !Array.isArray(raw.players)) return null;
    const players = raw.players.filter(Boolean).slice(0, 5).map((p, i) => ({
      id: `p${i + 1}`,
      name: String(p.name || `PLAYER ${i + 1}`).trim().slice(0, 16) || `PLAYER ${i + 1}`,
      penId: PEN_BY_ID[p.penId] ? p.penId : 'pen1',
      ai: false,
      eliminated: false,
    }));
    return players.length >= 2 ? players : null;
  } catch (_) { return null; }
}

function spawnFor(i, portrait, count) {
  // Keep every pen in its own clean lane at the start of a round.
  // Do NOT use diagonal spawn angles here: the long pen sprites can visually
  // overlap and form an X even though their physics bodies are separate.
  // Pens start parallel (horizontal) with generous spacing; after the first
  // flick, normal physics is free to rotate them naturally.
  const portraitSpawns = [
    [.50,.18,0],
    [.50,.72,Math.PI],
    [.25,.50,0],
    [.75,.50,Math.PI],
    [.50,.50,0]
  ];
  const landscapeSpawns = [
    [.50,.18,0],
    [.50,.72,Math.PI],
    [.25,.50,0],
    [.75,.50,Math.PI],
    [.50,.50,0]
  ];
  const list = portrait ? portraitSpawns : landscapeSpawns;
  const s = list[i % list.length];
  return { fx: s[0], fy: s[1], angle: s[2] };
}

export async function startFriendsGame() {
  const players = getSetup();
  if (!players) { location.replace('friends.html'); return; }
  if (!window.Matter) {
    ui.createHud().showFatal('The physics engine could not load. Check your internet connection and refresh the page.');
    return;
  }

  const [{ PhysicsWorld, CONFIG }] = await Promise.all([import('./physics.js')]);
  const hud = ui.createHud();
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('desk');
  const renderer = new DeskRenderer(canvas);
  // Ensure every chosen real pen model is ready before showing the first round.
  // The rest of game initialization remains unchanged while images load.
  await renderer.preloadPens(players.map((p) => (PEN_BY_ID[p.penId] || STARTER).asset));
  let physics = null, dirty = true, phase = 'boot', turn = 0, round = 1, moveStart = 0, fallAt = 0, endTimer = 0;
  let scores = players.map(() => 0);
  let last = performance.now(), slideLevel = -1;
  let stats = { collisions: 0, strongest: 0 };
  const active = () => players.filter(p => !p.eliminated);

  document.title = `Desk Duel - ${players.length} Friends`;
  const rule = document.querySelector('.chalk-title small');
  if (rule) rule.textContent = 'FRIENDS · FIRST TO 3 ROUNDS';
  const roundLabel = document.getElementById('board-win-rule');
  if (roundLabel) roundLabel.textContent = 'FIRST TO 3';
  hud.setNames(players.map(p => p.name));
  hud.setTurn(`${players[0].name} TURN`, 'p1');
  hud.setRound(1);
  hud.setScores(scores);

  function penPos(i) {
    const body = physics.pens.get(players[i].id).body;
    return { x: body.position.x, y: body.position.y };
  }

  const input = new FlickInput({
    element: canvas,
    toWorld(e) {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX-r.left)*physics.size.w)/r.width, y: ((e.clientY-r.top)*physics.size.h)/r.height };
    },
    pick(pt) {
      if (phase !== 'aim' || players[turn]?.eliminated) return null;
      const id = players[turn].id;
      return physics.penContains(id, pt, CONFIG.grabPadding) ? id : null;
    },
    onStart() { audio.unlock(); document.body.classList.add('is-aiming'); },
    onRelease({ penId, start, current }) {
      document.body.classList.remove('is-aiming');
      if (phase !== 'aim') return;
      const result = physics.flick(penId, start, { x: start.x-current.x, y: start.y-current.y });
      if (result) onShot(result);
      dirty = true;
    },
    onCancel() { document.body.classList.remove('is-aiming'); dirty = true; },
  });

  function updateHud() {
    const p = players[turn];
    hud.setNames(players.map(x => x.name));
    hud.setScores(scores);
    hud.setRound(round);
    hud.setTurn(`${p.name} TURN`, `p${turn + 1}`);
  }

  function nextActive(after) {
    for (let n=1; n<=players.length; n++) {
      const i=(after+n)%players.length;
      if (!players[i].eliminated) return i;
    }
    return after;
  }

  function startRound(showBanner = true) {
    players.forEach(p => p.eliminated=false);
    turn=(round-1)%players.length; phase='aim'; fallAt=0; stats={collisions:0,strongest:0};
    const portrait=physics.size.h>physics.size.w;
    players.forEach((p,i)=>physics.resetPen(p.id, spawnFor(i,portrait,players.length)));
    updateHud(); ui.hideOverlay(); if(showBanner) ui.banner(`ROUND ${round}`); dirty=true;
  }

  function startMatch() {
    scores=players.map(() => 0);
    round=1;
    startRound(true);
  }

  function nextRound() {
    round++;
    startRound(true);
  }

  function onShot({power}) {
    phase='move'; moveStart=performance.now(); fallAt=0; stats.strongest=Math.max(stats.strongest,power);
    audio.flick(power); vibrate(12); dirty=true;
  }

  function resolveShot() {
    const fallen=[];
    players.forEach((p,i)=>{
      if (!p.eliminated) {
        const s=physics.penStatus(p.id);
        if (s.fullyOut || s.centerOut) fallen.push(i);
      }
    });
    fallen.forEach(i=>players[i].eliminated=true);
    const left=active();
    if (left.length<=1) return endRound(left[0]?.id || null);
    turn=nextActive(turn);
    phase='aim';
    updateHud(); dirty=true;
  }

  function endRound(winnerId) {
    phase='roundEnd';
    const winner=players.find(p=>p.id===winnerId);
    if (winner) {
      const winnerIndex=players.indexOf(winner);
      scores[winnerIndex]++;
      audio.roundWin();
      vibrate([30,40,30]);
    }
    hud.setScores(scores);
    const matchOver = winner && scores[players.indexOf(winner)] >= WIN_SCORE;
    clearTimeout(endTimer);
    endTimer=setTimeout(()=>{
      if (matchOver) return showMatch(winner);
      const score=scores.join(' - ');
      ui.showOverlay({
        kicker:'ROUND COMPLETE',
        title:winner ? `${winner.name} WINS THE ROUND!` : 'ROUND DRAW',
        score,
        scoreLabel:'First to 3 rounds wins',
        side:winner ? `p${players.indexOf(winner)+1}` : 'p1',
        buttons:[{label:'NEXT ROUND',primary:true,onClick:nextRound}]
      });
    }, 800);
  }

  function showMatch(winner) {
    phase='matchEnd';
    audio.matchWin(); ui.confetti();
    clearTimeout(endTimer);
    endTimer=setTimeout(()=>ui.showOverlay({
      kicker:'FRIENDS MATCH',
      title:`🏆 ${winner.name} WINS THE MATCH!`,
      score:scores.join(' - '),
      scoreLabel:'First to 3 rounds',
      side:`p${players.indexOf(winner)+1}`,
      stats:[['rounds',String(round)],['winner',winner.name],['pen',PEN_BY_ID[winner.penId]?.name || 'Pen'],['collisions',String(stats.collisions)]],
      buttons:[
        {label:'PLAY AGAIN',primary:true,onClick:startMatch},
        {label:'CHANGE PLAYERS',onClick:()=>location.href='friends.html'},
        {label:'MENU',onClick:()=>location.href='index.html'},
      ]
    }), WIN_DELAY);
  }

  function applyLayout() {
    const cs=getComputedStyle(stage);
    const cw=stage.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
    const ch=stage.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
    if(cw<50||ch<50)return;
    const d=cw<ch?CONFIG.desk.portrait:CONFIG.desk.landscape;
    // Match AI mode: fill the whole available stage with the 2D classroom scene.
    // Keep the fixed physics-world dimensions and map pointer input through the
    // canvas bounds, so visual scaling does not alter shot power or collisions.
    const cssW=Math.floor(cw), cssH=Math.floor(ch);
    canvas.style.width=`${cssW}px`; canvas.style.height=`${cssH}px`;
    const dpr=Math.min(devicePixelRatio||1,settings.graphics==='low'?1:2);
    const first=!physics;
    if(first){
      physics=new PhysicsWorld(d.w,d.h,d.playArea);
      const portrait=d.h>d.w;
      players.forEach((p,i)=>{
        const pen=PEN_BY_ID[p.penId]||STARTER;
        physics.addPen(p.id,{...spawnFor(i,portrait,players.length),skin:`p${(i%2)+1}`,asset:pen.asset,modelId:pen.id,strength:pen.strength||1});
      });
      physics.onCollision=({speed})=>{if(speed<.5)return;stats.collisions++;audio.hit(speed);if(speed>8)vibrate(15);};
    } else if(physics.size.w!==d.w||physics.size.h!==d.h){
      input.cancel(); physics.resize(d.w,d.h,d.playArea); const portrait=d.h>d.w;
      players.forEach((p,i)=>physics.resetPen(p.id,spawnFor(i,portrait,players.length)));
    }
    renderer.resize({cssW,cssH,dpr,world:d});
    dirty=true;
    if(first)startMatch();
  }

  let layoutQueued=false;
  new ResizeObserver(()=>{if(layoutQueued)return;layoutQueued=true;requestAnimationFrame(()=>{layoutQueued=false;applyLayout();});}).observe(stage);

  const restartBtn=document.getElementById('btn-restart');
  let armed=0;
  restartBtn.addEventListener('click',()=>{
    if(armed){clearTimeout(armed);armed=0;restartBtn.textContent='RESTART';input.cancel();startMatch();return;}
    restartBtn.textContent='SURE?';armed=setTimeout(()=>{armed=0;restartBtn.textContent='RESTART';},2500);
  });

  function makeAim(pen,grab,current){
    const px=grab.x-current.x,py=grab.y-current.y,len=Math.hypot(px,py);
    return {pen,grab,current,dir:len?{x:px/len,y:py/len}:{x:1,y:0},power:len<CONFIG.minPull?0:Math.min(len/CONFIG.maxPull,1)};
  }

  function frame(now){
    const dt=Math.min(now-last,50);last=now;physics.update(dt);
    let aim=null,needDraw=dirty,drag=input.state;
    if(phase==='aim'){
      const pos=penPos(turn);
      if(drag){aim=makeAim(pos,drag.start,drag.current);hud.setHint('Release to flick!');}
      else hud.setHint(`${players[turn].name}: press your pen, drag backwards, release.`);
      hud.setPower(aim?aim.power:0); if(aim)needDraw=true;
    } else {hud.setPower(0);hud.setHint(phase==='move'?'Sliding... wait for the pens to stop.':'');}
    if(phase==='move'){
      needDraw=true;
      if(!fallAt && players.some((p)=>!p.eliminated&&physics.penStatus(p.id).fullyOut)){fallAt=now;audio.fall();}
      const rested=physics.allResting(),timedOut=now-moveStart>MAX_MOVE_MS;
      if((fallAt&&now-fallAt>FALL_DELAY_MS)||(!fallAt&&rested)||timedOut){if(!rested)physics.freeze();resolveShot();}
    }
    const level=phase==='move'?Math.round(Math.min(physics.maxSpeed()/CONFIG.maxSpeed,1)*20)/20:0;
    if(level!==slideLevel){slideLevel=level;audio.slide(level);}
    if(needDraw){
      // Feed interpolated 120 Hz physics poses to the renderer so the pens
      // glide continuously instead of stepping between simulation ticks.
      for (const pen of physics.pens.values()) pen.renderPose = physics.getRenderPose(pen.id);
      renderer.draw(physics,aim,{guide:settings.guide,highlight:phase==='aim'?players[turn].id:null});
      dirty=false;
    }
    requestAnimationFrame(frame);
  }

  applyLayout(); requestAnimationFrame(frame);
}

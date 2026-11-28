(() => {
'use strict';
const $=id=>document.getElementById(id);
const COLORS=['p0','p1','p2','p3'],EMOJI=['🟠','🔴','🟢','🟡'];
const NAMES=['Player 1','Player 2','Player 3','Player 4'];
// 24 outer-ring squares, ordered anti-clockwise.
const track=[];
for(let y=1;y<=7;y++)track.push([1,y]);
for(let x=2;x<=7;x++)track.push([x,7]);
for(let y=6;y>=1;y--)track.push([7,y]);
for(let x=6;x>=2;x--)track.push([x,1]);
// Per-player inner approach lanes; the final move enters the center.
const lanes=[
 [[2,3],[3,3],[4,3],[3,4]],
 [[4,2],[4,3],[4,4],[3,4]],
 [[5,4],[4,4],[3,4],[3,3]],
 [[3,5],[3,4],[3,3],[4,3]]
];
const safe=new Set([3,9,15,21]);
const state={mode:'friends',names:NAMES.slice(),turn:0,roll:null,tokens:[],captures:[],bonusStreak:0,finished:false,aiTimer:null,rollTimer:null,legal:[],awaitingPass:false,difficulty:'easy'};
const sound=()=>window.ClassroomSounds;
const isAI=()=>state.mode==='ai'&&state.turn>0;
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const REDUCED=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const ROLL_MS=REDUCED?0:1150;
// Four modelled cowrie shells. A mouth-up shell shows its toothed slit; a mouth-down shell shows its glossy back.
function showDice(shells,label,animate){
 const faces=shells||[1,1,1,1];
 const shell=()=>'<div class="cowrie"><div class="cowrie-flip"><svg class="face up" viewBox="0 0 100 140" aria-hidden="true" focusable="false"><use href="#cowrie-up" width="100" height="140"/></svg><svg class="face down" viewBox="0 0 100 140" aria-hidden="true" focusable="false"><use href="#cowrie-down" width="100" height="140"/></svg></div></div>';
 $('dice').innerHTML='<div class="ac-tray"><div class="ac-shells">'+faces.map(shell).join('')+'</div></div><span class="roll-total">'+label+'</span>';
 [...$('dice').querySelectorAll('.cowrie')].forEach((el,i)=>{
  const flip=el.firstElementChild,rest=faces[i]===1?0:180,tilt=Math.round((Math.random()*30-15)*10)/10;
  flip.style.transform='rotateX('+rest+'deg)';el.style.transform='rotate('+tilt+'deg)';
  if(!animate||REDUCED||!el.animate)return;
  const end=rest+360*(2+Math.floor(Math.random()*2)),dur=820+i*110;
  el.classList.add('flying');
  flip.animate([{transform:'rotateX(0deg)'},{transform:'rotateX('+end+'deg)'}],{duration:dur,easing:'cubic-bezier(.2,.75,.3,1)'});
  const hop=el.animate([
   {transform:'translateY(0) rotate('+tilt+'deg)',offset:0},
   {transform:'translateY(-54px) rotate('+(tilt+140)+'deg)',offset:.38},
   {transform:'translateY(0) rotate('+tilt+'deg)',offset:.7},
   {transform:'translateY(-12px) rotate('+tilt+'deg)',offset:.86},
   {transform:'translateY(0) rotate('+tilt+'deg)',offset:1}
  ],{duration:dur+140,easing:'ease-out'});
  hop.finished.then(()=>el.classList.remove('flying'),()=>el.classList.remove('flying'));
 });
}
function showSetup(panel){$('mode-menu').classList.toggle('hidden',!!panel);document.querySelectorAll('.ac-setup-panel').forEach(el=>el.classList.toggle('hidden',el.id!==panel));}
function begin(mode){
 clearTimeout(state.aiTimer);clearTimeout(state.rollTimer);state.mode=mode;
 if(mode==='ai')state.difficulty=state.difficulty==='hard'?'hard':'easy';
 const lvl=state.difficulty==='hard'?'Hard':'Easy';
 state.names=mode==='ai'?[($('name-one').value.trim()||'Player 1'),'AI 1 ('+lvl+')','AI 2 ('+lvl+')','AI 3 ('+lvl+')']:
 [$('friend-one').value.trim()||'Player 1',$('friend-two').value.trim()||'Player 2',$('friend-three').value.trim()||'Player 3',$('friend-four').value.trim()||'Player 4'];
 if(mode==='friends'&&new Set(state.names.map(n=>n.toLowerCase())).size!==4){alert('Please enter four different player names.');return;}
 state.turn=0;state.roll=null;state.tokens=Array.from({length:4},()=>[-1,-1,-1,-1]);state.captures=[0,0,0,0];state.bonusStreak=0;state.finished=false;state.awaitingPass=false;state.legal=[];
 $('setup').classList.add('hidden');$('game').classList.remove('hidden');$('finish').classList.add('hidden');$('pass-screen').classList.add('hidden');
 showDice(null,'READY TO ROLL',false);render();message(`${state.names[0]}'s turn. Roll the cowries!`);
}
function cellKey(x,y){return `${x},${y}`;}
function positionsFor(p){
 const out=new Map();
 state.tokens[p].forEach((pos,i)=>{if(pos>=0&&pos<24){const idx=(pos+p*6+3)%24;const [x,y]=track[idx];const k=cellKey(x,y);if(!out.has(k))out.set(k,[]);out.get(k).push({p,i});}
 else if(pos>=24&&pos<28){const [x,y]=lanes[p][pos-24];const k=cellKey(x,y);if(!out.has(k))out.set(k,[]);out.get(k).push({p,i});}});
 return out;
}
function allOccupants(){const m=new Map();for(let p=0;p<4;p++)for(const [k,v] of positionsFor(p))m.set(k,[...(m.get(k)||[]),...v]);return m;}
function render(){
 const board=$('board');
 const point=(x,y)=>[85+(x-1)*55,85+(y-1)*55];
 const path=[];
 for(let y=1;y<=7;y++)path.push(point(1,y));
 for(let x=2;x<=7;x++)path.push(point(x,7));
 for(let y=6;y>=1;y--)path.push(point(7,y));
 for(let x=6;x>=2;x--)path.push(point(x,1));
 const lanePixels=[
  [[140,195],[195,195],[250,195],[250,250]],
  [[305,140],[305,195],[305,250],[250,250]],
  [[360,305],[305,305],[250,305],[250,250]],
  [[195,360],[195,305],[195,250],[250,250]]
 ];
 // Each player's home cluster sits on the square where that player's tokens enter the track.
 const homePixels=[[85,250],[250,415],[415,250],[250,85]];
 const colors=['#ee7625','#c93637','#168044','#e8b51c'];
 const dark=['#9b431d','#81272b','#07552e','#9a7010'];
 const light=['#ffb878','#f58a82','#58cf8b','#ffe888'];
 const labels=['ORANGE','RED','GREEN','YELLOW'];
 let svg=`<svg class="ac-board-svg" viewBox="0 0 500 500" role="img" aria-label="Traditional terracotta Ashta Chamma board with cowrie-shell game pieces">
 <defs>
  <linearGradient id="cloth" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d38b6a"/><stop offset=".48" stop-color="#bd7658"/><stop offset="1" stop-color="#d08a68"/></linearGradient>
  <filter id="clothNoise"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="8"/><feColorMatrix values="1 0 0 0 .3 0 1 0 0 .2 0 0 1 0 .15 0 0 0 .12 0"/></filter>
  ${[0,1,2,3].map(q=>`<linearGradient id="gb${q}" x1="0" x2="1"><stop offset="0" stop-color="${dark[q]}"/><stop offset=".28" stop-color="${light[q]}"/><stop offset=".55" stop-color="${colors[q]}"/><stop offset="1" stop-color="${dark[q]}"/></linearGradient><radialGradient id="gh${q}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${light[q]}"/><stop offset=".42" stop-color="${colors[q]}"/><stop offset="1" stop-color="${dark[q]}"/></radialGradient>`).join('')}
  <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="2"/><feOffset dy="2"/><feComponentTransfer><feFuncA type="linear" slope=".35"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
 </defs>
 <rect x="7" y="7" width="486" height="486" fill="url(#cloth)" stroke="#633a2b" stroke-width="5"/>
 <rect x="11" y="11" width="478" height="478" fill="none" stroke="#e7ad88" stroke-width="2"/>
 <rect x="13" y="13" width="474" height="474" filter="url(#clothNoise)" opacity=".23"/>
 <text x="250" y="478" text-anchor="middle" font-family="Georgia,serif" font-size="18" font-weight="bold" fill="#2d211b">ASHTA CHAMMA</text>
 <g fill="#2d211b" font-family="Arial,sans-serif" font-size="9" font-weight="bold" letter-spacing="3">
 <text transform="translate(28 170) rotate(-90)" text-anchor="middle">TACTICAL PLANNING</text>
 <text transform="translate(472 310) rotate(90)" text-anchor="middle">STRATEGY BUILDING</text>
 </g>
 <g fill="none" stroke="#35251d" stroke-width="2.6" stroke-linecap="square">
  <rect x="52" y="52" width="396" height="396"/>
  <path d="M108.57 52V448 M165.14 52V448 M221.71 52V448 M278.29 52V448 M334.86 52V448 M391.43 52V448 M52 108.57H448 M52 165.14H448 M52 221.71H448 M52 278.29H448 M52 334.86H448 M52 391.43H448"/>
  <path d="M108.57 108.57L165.14 165.14 M165.14 108.57L108.57 165.14 M334.86 108.57L391.43 165.14 M391.43 108.57L334.86 165.14 M108.57 334.86L165.14 391.43 M165.14 334.86L108.57 391.43 M334.86 334.86L391.43 391.43 M391.43 334.86L334.86 391.43"/>
 </g>
 <g fill="none" stroke="#5d392b" stroke-width="1.3" opacity=".7">
  <path d="M22 22q18 4 20 17q-7 10-16 0q-7-10 3-13q9-2 11 7 M478 22q-18 4-20 17q7 10 16 0q7-10-3-13q-9-2-11 7"/>
  <path d="M22 478q18-4 20-17q-7-10-16 0q-7 10 3 13q9 2 11-7 M478 478q-18-4-20-17q7-10 16 0q7 10-3 13q-9 2-11-7"/>
 </g>`;
 // Player homes sit in the middle of each board edge. Gotiyas are drawn as turned pawns, back-to-front.
 const homeOffsets=[[-17,-13],[17,-13],[-17,15],[17,15]];
 const pawns=[];
 for(let p=0;p<4;p++){
  const h=homePixels[p];
  for(let i=0;i<4;i++){
   const pos=state.tokens[p]?.[i]??-1;
   let xy=null;
   if(pos===-1)xy=[h[0]+homeOffsets[i][0],h[1]+homeOffsets[i][1]];
   else if(pos>=0&&pos<24)xy=path[(pos+p*6+3)%24];
   else if(pos>=24&&pos<28)xy=lanePixels[p][pos-24];
   else if(pos===28)xy=[250,250];
   if(!xy)continue;
   pawns.push({p,i,pos,x:xy[0],y:xy[1],dx:0,dy:0,k:.82});
  }
 }
 const stacks=new Map();
 pawns.filter(t=>t.pos>=0).forEach(t=>{const key=t.x+','+t.y;if(!stacks.has(key))stacks.set(key,[]);stacks.get(key).push(t);});
 stacks.forEach(list=>{if(list.length<2)return;const n=list.length;list.forEach((t,j)=>{t.dx=(j-(n-1)/2)*(n>2?10:12);t.dy=j%2?3:-3;t.k=n>2?.7:.76;});});
 pawns.sort((a,b)=>(a.y+a.dy)-(b.y+b.dy));
 const canPick=state.roll!==null&&!isAI()&&!state.finished;
 for(const t of pawns){
  const {p,i}=t,sel=canPick&&p===state.turn&&state.legal.includes(i);
  svg+=`<g class="ac-goti ${COLORS[p]}${sel?' selectable':''}" data-p="${p}" data-i="${i}"${sel?` tabindex="0" role="button" aria-label="Move ${labels[p].toLowerCase()} token ${i+1}"`:''} transform="translate(${(t.x+t.dx).toFixed(1)} ${(t.y+t.dy-5).toFixed(1)}) scale(${t.k})">
   ${sel?`<ellipse class="ac-ring" cx="0" cy="13" rx="22" ry="9" fill="none" stroke="#fff4b8" stroke-width="3"/>`:''}
   <ellipse cx="2" cy="14" rx="17" ry="6" fill="#2a1a10" opacity=".3"/>
   <path d="M-15 13C-15 8-9 4-6-5H6C9 4 15 8 15 13C15 17 8 19 0 19C-8 19-15 17-15 13Z" fill="url(#gb${p})" stroke="${dark[p]}" stroke-width="1.4" stroke-linejoin="round"/>
   <path d="M-13 12.5C-8 15.5 8 15.5 13 12.5" fill="none" stroke="#fff" stroke-width="1.2" opacity=".35" stroke-linecap="round"/>
   <ellipse cx="0" cy="-5" rx="10" ry="3.6" fill="url(#gb${p})" stroke="${dark[p]}" stroke-width="1.3"/>
   <circle cx="0" cy="-15" r="9.6" fill="url(#gh${p})" stroke="${dark[p]}" stroke-width="1.4"/>
   <ellipse cx="-3.4" cy="-19.2" rx="3.7" ry="2.4" fill="#fff" opacity=".72"/>
   <text x="0" y="11.5" text-anchor="middle" font-family="Arial,sans-serif" font-size="8.5" font-weight="900" fill="#fff" stroke="${dark[p]}" stroke-width=".6" paint-order="stroke">${i+1}</text>
  </g>`;
 }
 svg+=`<g><circle cx="250" cy="250" r="20" fill="#d9a17d" stroke="#3d2b20" stroke-width="2"/><text x="250" y="254" text-anchor="middle" font-family="Georgia,serif" font-size="10" font-weight="bold" fill="#35251d">HOME</text></g></svg>`;
 board.innerHTML=svg;
 $('score').innerHTML=state.names.map((n,p)=>`<div class="${p===state.turn?'active':''}"><b>${EMOJI[p]} ${escapeHTML(n)}</b><span>${state.tokens[p].filter(v=>v===28).length}/4 HOME · ${state.captures[p]} CUT</span></div>`).join('');
 $('roll').disabled=state.roll!==null||state.finished||isAI()||state.awaitingPass;
 $('roll').textContent=isAI()?'AI THINKING…':'ROLL COWRIES';
}
function message(t){$('status').textContent=t;}
function legalMoves(p,value){
 return state.tokens[p].map((pos,i)=>({pos,i})).filter(({pos})=>{
  if(pos===-1)return value===4||value===8;
  const next=pos+value;if(next>28)return false;
  if(pos<24&&next>=24&&state.captures[p]===0)return false;
  return pos<28;
 });
}
// Traditional cowries give 4 and 8 only 1 time in 16 each (6.25%). Here each is boosted to 16%,
// so entering tokens and earning bonus rolls feels far more frequent. 1/2/3 share the remaining 68%.
const P_CHAMMA=.16,P_ASHTA=.16;
const ROLL_P={1:.68*4/14,2:.68*6/14,3:.68*4/14,4:P_CHAMMA,8:P_ASHTA};
function shellRoll(){
 const r=Math.random();
 if(r<P_CHAMMA)return {shells:[1,1,1,1],value:4};
 if(r<P_CHAMMA+P_ASHTA)return {shells:[0,0,0,0],value:8};
 let shells,up;
 do{shells=Array.from({length:4},()=>Math.random()<.5?1:0);up=shells.reduce((a,b)=>a+b,0);}while(up===0||up===4);
 return {shells,value:up};
}
function roll(){
 if(state.roll!==null||state.finished||state.awaitingPass||isAI()===false&&state.mode==='ai'&&state.turn>0)return;
 const {shells,value}=shellRoll();state.roll=value;state.legal=[];
 $('roll').disabled=true;$('token-choices').innerHTML='';
 showDice(shells,'ROLLING…',true);
 sound()?.tap();
 clearTimeout(state.rollTimer);
 state.rollTimer=setTimeout(()=>resolveRoll(value),ROLL_MS);
}
function resolveRoll(value){
 if(state.finished||state.roll!==value)return;
 const total=$('dice').querySelector('.roll-total');
 if(total)total.textContent=value===8?'ASHTA! · 8':value===4?'CHAMMA! · 4':'ROLLED '+value;
 const moves=legalMoves(state.turn,value);
 if(!moves.length){message(`${state.names[state.turn]} rolled ${value}. No legal move — turn passes.`);$('roll').disabled=true;state.aiTimer=setTimeout(()=>endTurn(false),850);return;}
 if(isAI()){message(`${state.names[state.turn]} rolled ${value}. AI is choosing a token…`);render();state.aiTimer=setTimeout(()=>move(chooseAI(moves)),650);return;}
 message(`${state.names[state.turn]} rolled ${value}. Choose a highlighted token.`);
 state.legal=moves.map(m=>m.i);
 $('token-choices').innerHTML='';
 moves.forEach(({i})=>{const b=document.createElement('button');b.className='ac-token-choice';b.type='button';b.textContent=`MOVE TOKEN ${i+1}`;b.addEventListener('click',()=>move(i));$('token-choices').appendChild(b);});
 render();
}
const trackIdx=(pos,p)=>(pos+p*6+3)%24;
// Chance that an opponent token, sitting `d` squares behind a square, lands on it with its next roll.
function hitChance(target,p){
 let risk=0;
 for(let q=0;q<4;q++){
  if(q===p)continue;
  for(const v of state.tokens[q]){
   if(v<0||v>=24)continue;
   const d=(target-trackIdx(v,q)+24)%24;
   if(d>0&&ROLL_P[d]&&v+d<24)risk+=ROLL_P[d];
  }
 }
 return Math.min(risk,1);
}
function captureCount(target,p){
 let n=0;for(let q=0;q<4;q++)if(q!==p)n+=state.tokens[q].filter(v=>v>=0&&v<24&&trackIdx(v,q)===target).length;return n;
}
// How many rival tokens sit just ahead of a square, i.e. could be hunted from there next turn.
function huntChance(target,p){
 let sum=0;
 for(let q=0;q<4;q++){
  if(q===p)continue;
  for(const v of state.tokens[q]){
   if(v<0||v>=24)continue;
   const t=trackIdx(v,q);if(safe.has(t))continue;
   const d=(t-target+24)%24;
   if(d>0&&ROLL_P[d])sum+=ROLL_P[d];
  }
 }
 return sum;
}
// EASY: plays casually. Often picks a random goti, often overlooks a kill, ignores danger entirely.
function chooseEasy(moves){
 const p=state.turn;
 if(Math.random()<.45)return moves[Math.floor(Math.random()*moves.length)].i;
 const scored=moves.map(m=>{
  const next=m.pos===-1?0:m.pos+state.roll,ti=trackIdx(next,p);
  const cap=next<24&&!safe.has(ti)?captureCount(ti,p):0;
  const sees=cap>0&&Math.random()<.4;           // misses a kill most of the time
  return {...m,score:(sees?80:0)+(next===28?20:0)+next*.4+Math.random()*30};
 }).sort((a,b)=>b.score-a.score);
 return scored[0].i;
}
// HARD: weighs kills, safety, danger from every rival token, finishing, and hunting positions.
function chooseHard(moves){
 const p=state.turn,needKill=state.captures[p]===0;
 const scored=moves.map(m=>{
  const next=m.pos===-1?0:m.pos+state.roll,ti=trackIdx(next,p);
  const onTrack=next<24,isSafe=onTrack&&safe.has(ti);
  let s=0;
  // kills (extra valuable while the inner path is still locked)
  if(onTrack&&!isSafe){const c=captureCount(ti,p);if(c)s+=c*(needKill?170:120)+next*1.5;}
  // progress / finishing
  if(next===28)s+=110;
  else if(next>=24)s+=45+next*2;                // inside a safe inner lane
  else s+=next*1.2;
  if(m.pos===-1)s+=needKill?22:30;              // bring more goti into play
  if(isSafe)s+=14;
  // danger: valuing what would be lost, and what danger is escaped by moving
  const loss=(next+6)*3.2;
  if(onTrack&&!isSafe){
   const cap=captureCount(ti,p); // landing on a kill square removes that rival's threat only partly; keep simple
   s-=hitChance(ti,p)*loss*(cap?.5:1);
  }
  if(m.pos>=0&&m.pos<24&&!safe.has(trackIdx(m.pos,p)))s+=hitChance(trackIdx(m.pos,p),p)*(m.pos+6)*3.2;
  // hunting: stand 1-4 or 8 squares behind a rival that is on an unsafe square
  if(onTrack&&needKill)s+=huntChance(ti,p)*28;else if(onTrack)s+=huntChance(ti,p)*12;
  // locked at the gate without a kill: avoid wasting the last squares before the inner path
  if(needKill&&onTrack&&next>=20)s-=(next-19)*6;
  return {...m,score:s+Math.random()*.5};
 }).sort((a,b)=>b.score-a.score);
 return scored[0].i;
}
function chooseAI(moves){return state.difficulty==='hard'?chooseHard(moves):chooseEasy(moves);}
function move(token){
 if(state.roll===null)return;state.legal=[];const p=state.turn,value=state.roll;let pos=state.tokens[p][token];pos=pos===-1?0:pos+value;state.tokens[p][token]=pos;
 let captured=0;
 if(pos<24){const landed=(pos+p*6+3)%24;if(!safe.has(landed)){for(let q=0;q<4;q++)if(q!==p)state.tokens[q].forEach((v,i)=>{if(v>=0&&v<24&&(v+q*6+3)%24===landed){state.tokens[q][i]=-1;captured++;}});}}
 if(captured)state.captures[p]+=captured;
 $('token-choices').innerHTML='';state.roll=null;
 if(state.tokens[p].every(v=>v===28)){state.finished=true;window.DeskStats&&window.DeskStats.record('ashta-chamma',{inc:{wins:p===0?1:0,tokens:state.tokens[0].filter(v=>v===28).length,completedMatches:1}});render();$('finish').classList.remove('hidden');$('winner').textContent=`🏆 ${state.names[p]} wins Ashta Chamma!`;$('finish-copy').textContent='All four tokens reached the center. What a match!';message(`${state.names[p]} has brought all four tokens home!`);return;}
 const bonus=value===4||value===8||captured>0;
 if(bonus){state.bonusStreak++;if(state.bonusStreak>=3){message(`${state.names[p]} earned three bonus rolls in a row. Turn forfeited!`);state.bonusStreak=0;endTurn(true);return;}message(captured?`${state.names[p]} captured ${captured} token${captured>1?'s':''}! Bonus roll.`:`${state.names[p]} rolled ${value===8?'Ashta':'Chamma'}! Bonus roll.`);}
 else{state.bonusStreak=0;endTurn(false);return;}
 render();if(isAI())scheduleAI();
}
function endTurn(keepMessage){
 state.roll=null;state.legal=[];$('token-choices').innerHTML='';state.turn=(state.turn+1)%4;state.bonusStreak=0;state.awaitingPass=state.mode==='friends';render();
 if(state.mode==='friends'){ $('pass-title').textContent=`Pass to ${state.names[state.turn]}`;$('pass-copy').textContent=`Hand the phone to ${state.names[state.turn]}. Tap when they are ready.`;$('pass-screen').classList.remove('hidden');message(`Waiting for ${state.names[state.turn]} to take the phone.`);}
 else{message(`${state.names[state.turn]}'s turn. ${isAI()?'AI is getting ready…':'Roll the cowries!'}`);if(isAI())scheduleAI();}
}
function scheduleAI(){if(state.finished||!isAI())return;state.aiTimer=setTimeout(roll,900);}
function readyPass(){state.awaitingPass=false;$('pass-screen').classList.add('hidden');render();message(`${state.names[state.turn]}'s turn. Roll the cowries!`);}
function backToMenu(){clearTimeout(state.aiTimer);clearTimeout(state.rollTimer);state.roll=null;state.legal=[];$('game').classList.add('hidden');$('setup').classList.remove('hidden');$('pass-screen').classList.add('hidden');showSetup(null);}
$('open-ai').addEventListener('click',()=>showSetup('setup-ai'));
$('open-friends').addEventListener('click',()=>showSetup('setup-friends'));
$('open-how').addEventListener('click',()=>showSetup('how-panel'));
document.querySelectorAll('.ac-back').forEach(b=>b.addEventListener('click',()=>showSetup(null)));
document.querySelectorAll('.ac-diff-btn').forEach(b=>b.addEventListener('click',()=>{
 state.difficulty=b.dataset.diff;
 document.querySelectorAll('.ac-diff-btn').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-checked',on?'true':'false');});
 const d=$('diff-desc');if(d)d.textContent=state.difficulty==='hard'?'Hard: smart AIs that hunt your tokens, dodge danger and rarely miss a kill.':'Easy: relaxed AIs that miss kills and make mistakes choosing tokens.';
}));
$('start-ai').addEventListener('click',()=>begin('ai'));$('start-friends').addEventListener('click',()=>begin('friends'));
$('board').addEventListener('click',e=>{const g=e.target.closest('.ac-goti.selectable');if(g)move(+g.dataset.i);});
$('board').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const g=e.target.closest('.ac-goti.selectable');if(g){e.preventDefault();move(+g.dataset.i);}});
$('roll').addEventListener('click',roll);$('restart').addEventListener('click',backToMenu);$('finish-menu').addEventListener('click',backToMenu);
$('pass-ready').addEventListener('click',readyPass);$('play-again').addEventListener('click',()=>begin(state.mode));
document.addEventListener('click',e=>{if(e.target.closest('button'))sound()?.tap();});
})();
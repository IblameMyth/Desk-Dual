import { AI_LEVELS, PEN_BY_ID, STARTER, loadProgress, equipPen, resetProgress } from './pens.js';

const $ = id => document.getElementById(id);
let progress = loadProgress();

function renderCollection() {
  const ids = ['starter', ...progress.owned];
  $('progress-text').textContent = `${progress.owned.length}/10 pens won • Level ${progress.unlockedLevel}/10 unlocked`;
  $('collection').replaceChildren(...ids.map(id => {
    const pen = id === 'starter' ? STARTER : PEN_BY_ID[id];
    const card = document.createElement('div');
    card.className = `owned-pen${progress.equipped === id ? ' equipped' : ''}`;
    if (pen.asset) {
      const img = document.createElement('img'); img.src = pen.asset; img.alt = pen.name; card.appendChild(img);
    } else {
      const placeholder = document.createElement('div'); placeholder.style.height='38px'; placeholder.textContent='✦'; placeholder.style.fontSize='30px'; card.appendChild(placeholder);
    }
    const b=document.createElement('b'); b.textContent=pen.name; card.appendChild(b);
    const small=document.createElement('small'); small.textContent=progress.equipped===id?'EQUIPPED':'Owned'; card.appendChild(small);
    if (progress.equipped !== id) { const btn=document.createElement('button'); btn.className='btn btn-small'; btn.textContent='EQUIP'; btn.addEventListener('click',()=>{progress=equipPen(id); renderCollection();}); card.appendChild(btn); }
    return card;
  }));
}

function renderLevels() {
  $('levels').replaceChildren(...AI_LEVELS.map(ai => {
    const pen=PEN_BY_ID[ai.penId]; const unlocked=ai.level<=progress.unlockedLevel; const beaten=progress.owned.includes(ai.penId);
    const card=document.createElement('article'); card.className=`level-card${unlocked?'':' locked'}`;
    const no=document.createElement('div'); no.className='level-no'; no.textContent=ai.level; card.appendChild(no);
    const img=document.createElement('img'); img.className='level-pen'; img.src=pen.asset; img.alt=pen.name; card.appendChild(img);
    const info=document.createElement('div'); info.className='level-info';
    const h=document.createElement('h3'); h.textContent=ai.name; if(beaten){const badge=document.createElement('span');badge.className='badge';badge.textContent='WON';h.appendChild(badge)} info.appendChild(h);
    const p=document.createElement('p'); p.textContent=`Opponent pen: ${pen.name}`; info.appendChild(p); card.appendChild(info);
    const btn=document.createElement('a'); btn.className=`btn btn-small${unlocked?' btn-primary':''}`; btn.textContent=unlocked?(beaten?'PLAY AGAIN':'PLAY'):'LOCKED'; btn.href=unlocked?`game.html?mode=ai&level=${ai.level}`:'#'; if(!unlocked)btn.addEventListener('click',e=>e.preventDefault()); card.appendChild(btn);
    return card;
  }));
}

$('reset').addEventListener('click',()=>{if(confirm('Reset all AI levels and collected pens?')){progress=resetProgress();renderCollection();renderLevels();}});
renderCollection(); renderLevels();

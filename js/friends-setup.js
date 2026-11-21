import { PENS } from './pens.js';

const KEY='deskDuelFriendsSetupV1';
const list=document.getElementById('player-list');
const count=document.getElementById('player-count');
let players=[];
try { const saved=JSON.parse(localStorage.getItem(KEY)||'null'); if(Array.isArray(saved?.players)) players=saved.players.slice(0,2); } catch(_){}
if(players.length<2) players=[
  {name:'',penId:'pen1'},
  {name:'',penId:'pen2'}
];

const options=PENS.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
function render(){
  count.textContent=players.length;
  list.replaceChildren(...players.map((p,i)=>{
    const row=document.createElement('article'); row.className='player-row';
    const badge=document.createElement('div'); badge.className='player-badge'; badge.textContent=i+1;
    const fields=document.createElement('div'); fields.className='player-fields';
    const name=document.createElement('input'); name.type='text'; name.maxLength=16; name.value=p.name||''; name.placeholder=`Enter Player ${i+1} name`; name.setAttribute('aria-label',`Player ${i+1} name`);
    name.addEventListener('input',()=>p.name=name.value);
    const select=document.createElement('select'); select.innerHTML=options; select.value=p.penId||PENS[i%PENS.length].id; select.setAttribute('aria-label',`Player ${i+1} pen`);
    select.addEventListener('change',()=>p.penId=select.value);
    fields.append(name,select);
    const remove=document.createElement('button'); remove.type='button'; remove.className='btn btn-small remove-player'; remove.textContent='REMOVE'; remove.disabled=players.length<=2; remove.addEventListener('click',()=>{players.splice(i,1);render();});
    row.append(badge,fields,remove); return row;
  }));
}

document.getElementById('start-friends').addEventListener('click',()=>{
  const missing=players.some(p=>!(p.name||'').trim());
  if(missing){ alert('Enter every player name before starting.'); return; }
  const names=players.map(p=>p.name.trim().replace(/\s+/g,' ').slice(0,16));
  if(new Set(names.map(name=>name.toLowerCase())).size!==names.length){ alert('Use a different name for every player.'); return; }
  players=players.map((p,i)=>({name:names[i],penId:PENS.some(x=>x.id===p.penId)?p.penId:PENS[i%PENS.length].id}));
  localStorage.setItem(KEY,JSON.stringify({players}));
  location.href='penfight.html?mode=friends';
});
render();

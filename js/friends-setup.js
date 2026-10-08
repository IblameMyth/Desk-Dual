import { PENS } from './pens.js';

const KEY='deskDuelFriendsSetupV1';
const list=document.getElementById('player-list');
const count=document.getElementById('player-count');
let players=[];
try { const saved=JSON.parse(localStorage.getItem(KEY)||'null'); if(Array.isArray(saved?.players)) players=saved.players.slice(0,5); } catch(_){}
if(players.length<2) players=[
  {name:'PLAYER 1',penId:'pen1'},
  {name:'PLAYER 2',penId:'pen2'}
];

const options=PENS.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
function render(){
  count.textContent=players.length;
  list.replaceChildren(...players.map((p,i)=>{
    const row=document.createElement('article'); row.className='player-row';
    const badge=document.createElement('div'); badge.className='player-badge'; badge.textContent=i+1;
    const fields=document.createElement('div'); fields.className='player-fields';
    const name=document.createElement('input'); name.type='text'; name.maxLength=16; name.value=p.name||`PLAYER ${i+1}`; name.placeholder=`PLAYER ${i+1}`; name.setAttribute('aria-label',`Player ${i+1} name`);
    name.addEventListener('input',()=>p.name=name.value);
    const select=document.createElement('select'); select.innerHTML=options; select.value=p.penId||PENS[i%PENS.length].id; select.setAttribute('aria-label',`Player ${i+1} pen`);
    select.addEventListener('change',()=>p.penId=select.value);
    fields.append(name,select);
    const remove=document.createElement('button'); remove.type='button'; remove.className='btn btn-small remove-player'; remove.textContent='REMOVE'; remove.disabled=players.length<=2; remove.addEventListener('click',()=>{players.splice(i,1);render();});
    row.append(badge,fields,remove); return row;
  }));
  document.getElementById('add-player').disabled=players.length>=5;
}

document.getElementById('add-player').addEventListener('click',()=>{ if(players.length>=5)return; players.push({name:`PLAYER ${players.length+1}`,penId:PENS[players.length%PENS.length].id}); render(); });
document.getElementById('start-friends').addEventListener('click',()=>{
  players=players.map((p,i)=>({name:(p.name||`PLAYER ${i+1}`).trim().replace(/\s+/g,' ').slice(0,16)||`PLAYER ${i+1}`,penId:PENS.some(x=>x.id===p.penId)?p.penId:PENS[i%PENS.length].id}));
  localStorage.setItem(KEY,JSON.stringify({players}));
  location.href='game.html?mode=friends';
});
render();

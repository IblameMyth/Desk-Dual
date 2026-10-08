/* Main menu: dialogs (difficulty, how to play, settings), click sound, arrow-key navigation. */
import { toast } from './ui.js';
import { settings, setSetting } from './settings.js';
import { audio } from './audio.js';

function openDialog(d) {
  if (typeof d.showModal === 'function') d.showModal();
  else d.setAttribute('open', '');
}

const nameDialog = document.getElementById('name-dialog');
const nameForm = document.getElementById('name-form');
const nameInput = document.getElementById('player-name-input');
const playerNameKey = 'deskduel.playerName';
const getPlayerName = () => { try { return (localStorage.getItem(playerNameKey) || '').trim(); } catch (_) { return ''; } };
const savePlayerName = (name) => { try { localStorage.setItem(playerNameKey, name); } catch (_) {} };

function requirePlayerName(destination) {
  const current = getPlayerName();
  if (current) { location.href = destination; return; }
  nameDialog.showModal();
  nameInput.focus();
  nameForm.dataset.destination = destination;
}

nameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameInput.value.trim().replace(/\s+/g, ' ');
  if (!name) return;
  savePlayerName(name);
  const destination = nameForm.dataset.destination || 'levels.html';
  nameDialog.close();
  location.href = destination;
});

document.querySelectorAll('.menu-buttons a[href^="levels.html"], .menu-buttons a[href^="game.html"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const current = getPlayerName();
    if (current) return;
    e.preventDefault();
    requirePlayerName(link.href);
  });
});

document.querySelectorAll('dialog').forEach((d) => {
  d.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => d.close()));
  d.addEventListener('click', (e) => {
    if (e.target === d) d.close(); // click on the backdrop
  });
});
document.getElementById('btn-how').addEventListener('click', () => openDialog(document.getElementById('how-dialog')));
document.getElementById('btn-settings').addEventListener('click', () => openDialog(document.getElementById('settings-dialog')));

document.querySelectorAll('[data-soon]').forEach((btn) => {
  btn.addEventListener('click', () => toast(`${btn.dataset.soon} arrives in a later phase.`));
});

// settings: segmented ON/OFF style controls
const parse = (v) => (v === 'true' ? true : v === 'false' ? false : v);
function syncSettings() {
  document.querySelectorAll('.seg').forEach((seg) => {
    const current = settings[seg.dataset.setting];
    seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(parse(b.dataset.value) === current)));
  });
}
document.querySelectorAll('.seg button').forEach((b) => {
  b.addEventListener('click', () => {
    setSetting(b.parentElement.dataset.setting, parse(b.dataset.value));
    syncSettings();
  });
});
syncSettings();

// button click sound (respects the Sound setting)
document.addEventListener('click', (e) => {
  if (e.target.closest('.btn, .seg button')) audio.click();
});

const nav = document.querySelector('.menu-buttons');
nav.addEventListener('keydown', (e) => {
  const items = [...nav.querySelectorAll('.btn')];
  const i = items.indexOf(document.activeElement);
  if (i < 0) return;
  let next = null;
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = items[(i + 1) % items.length];
  else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = items[(i - 1 + items.length) % items.length];
  else if (e.key === 'Home') next = items[0];
  else if (e.key === 'End') next = items[items.length - 1];
  if (next) {
    e.preventDefault();
    next.focus();
  }
});

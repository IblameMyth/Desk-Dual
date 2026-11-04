import { toast } from './ui.js';
import { settings, setSetting } from './settings.js';
import { audio } from './audio.js';
const openDialog = (dialog) => { if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', ''); };
document.querySelectorAll('[data-soon]').forEach((card) => card.addEventListener('click', () => toast(`${card.dataset.soon} is coming soon!`)));
document.querySelectorAll('dialog').forEach((dialog) => { dialog.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => dialog.close())); dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); }); });
document.getElementById('btn-settings').addEventListener('click', () => openDialog(document.getElementById('settings-dialog')));
const parse = (value) => value === 'true' ? true : value === 'false' ? false : value;
function syncSettings() { document.querySelectorAll('.seg').forEach((seg) => { const current = settings[seg.dataset.setting]; seg.querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', String(parse(button.dataset.value) === current))); }); }
document.querySelectorAll('.seg button').forEach((button) => button.addEventListener('click', () => { setSetting(button.parentElement.dataset.setting, parse(button.dataset.value)); syncSettings(); }));
syncSettings();
document.addEventListener('click', (event) => { if (event.target.closest('.game-card, .footer-link, .btn, .seg button')) audio.click(); });

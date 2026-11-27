import { toast } from './ui.js';
import { settings, setSetting } from './settings.js';
import { audio } from './audio.js';
const openDialog = (dialog) => { if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', ''); };
document.querySelectorAll('[data-soon]').forEach((card) => card.addEventListener('click', () => toast(`${card.dataset.soon} is coming soon!`)));
document.querySelectorAll('dialog').forEach((dialog) => { dialog.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => dialog.close())); dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); }); });
const settingsButton = document.getElementById('btn-settings');
if (settingsButton) {
  settingsButton.addEventListener('click', () => openDialog(document.getElementById('settings-dialog')));
}
const howButton = document.getElementById('btn-how');
if (howButton) {
  howButton.addEventListener('click', () => openDialog(document.getElementById('how-dialog')));
}
const parse = (value) => value === 'true' ? true : value === 'false' ? false : value;
function syncSettings() { document.querySelectorAll('.seg').forEach((seg) => { const current = settings[seg.dataset.setting]; seg.querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', String(parse(button.dataset.value) === current))); }); }
document.querySelectorAll('.seg button').forEach((button) => button.addEventListener('click', () => { setSetting(button.parentElement.dataset.setting, parse(button.dataset.value)); syncSettings(); }));
syncSettings();
document.addEventListener('pointerdown', () => audio.unlock(), { once: true });
document.addEventListener('click', (event) => {
  if (event.target.closest('.game-card, .footer-link, .btn, .seg button')) audio.click();
  if (event.target.closest('#btn-how')) audio.reveal();
});

let installPrompt = null;
const installButton = document.getElementById('btn-install-app');

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  if (installButton) installButton.hidden = false;
});

if (installButton) {
  installButton.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
  });
}

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  if (installButton) installButton.hidden = true;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

/* Account button + cloud sync (never blocks the menu if Firebase is missing). */
const accountButton = document.getElementById('btn-account');
if (accountButton) {
  import('./cloud.js').then(({ cloudEnabled, onUser, syncNow, signOutUser }) => {
    if (!cloudEnabled) return; // not configured: keep the SIGN IN link, which explains setup
    onUser((user) => {
      if (user) {
        accountButton.textContent = `SIGN OUT (${(user.displayName || 'PLAYER').split(' ')[0].toUpperCase()})`;
        accountButton.removeAttribute('href');
        accountButton.onclick = async (event) => { event.preventDefault(); await signOutUser(); toast('Signed out.'); };
        syncNow().catch(() => {});
      } else {
        accountButton.textContent = 'SIGN IN';
        accountButton.setAttribute('href', 'signin.html');
        accountButton.onclick = null;
      }
    });
  }).catch(() => {});
}

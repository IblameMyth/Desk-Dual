import { cloudEnabled, signInWithGoogle, finishRedirect, syncNow, friendlyError, onUser } from './cloud.js';

const button = document.getElementById('google-signin');
const statusEl = document.getElementById('signin-status');
const say = (message) => { statusEl.textContent = message; };
const nextParam = new URLSearchParams(location.search).get('next') || '';
const target = /^[a-z0-9-]+\.html$/i.test(nextParam) && nextParam !== 'signin.html' ? nextParam : 'index.html';
const goHome = () => setTimeout(() => { window.location.href = target; }, 800);

let finishing = false;
async function done(user) {
  if (finishing) return;
  finishing = true;
  say(`Welcome${user.displayName ? ', ' + user.displayName : ''}! Saving your progress…`);
  try { await syncNow(); } catch (err) { say(friendlyError(err)); finishing = false; return; }
  goHome();
}

/* Google refuses to sign in inside the browsers built into Instagram, WhatsApp, Facebook, etc. */
const inApp = /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|Snapchat|Twitter|LinkedInApp|MicroMessenger|; wv\)/i.test(navigator.userAgent);
if (inApp) {
  button.disabled = true;
  say('Google sign-in does not work inside this app’s browser. Tap ⋮ or the share icon and choose “Open in Chrome” or “Open in Safari”, or copy the link below.');
  const copy = document.createElement('button');
  copy.type = 'button'; copy.className = 'btn'; copy.textContent = 'COPY LINK';
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); copy.textContent = 'COPIED! PASTE IT IN CHROME / SAFARI'; } catch (_) { say(location.href); }
  });
  button.insertAdjacentElement('afterend', copy);
} else if (!cloudEnabled) {
  say('Cloud save is not set up yet. Add your Firebase values in js/firebase-config.js.');
  button.addEventListener('click', () => say('Setup needed: see FIREBASE_SETUP.md.'));
} else {
  say('Checking sign-in…');
  finishRedirect()
    .then((user) => { if (user) done(user); })
    .catch((e) => say(friendlyError(e)))
    .finally(() => { if (!finishing) say(''); });
  onUser((user) => { if (user) done(user); });   // already signed in (or just came back from Google)
  button.addEventListener('click', async () => {
    button.disabled = true;
    say('Opening Google sign-in…');
    try {
      const user = await signInWithGoogle();
      if (user) await done(user);
    } catch (err) {
      say(friendlyError(err));
    } finally { button.disabled = false; }
  });
}

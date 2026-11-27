import { cloudEnabled, signInWithGoogle, finishRedirect, syncNow, friendlyError, onUser } from './cloud.js';

const button = document.getElementById('google-signin');
const statusEl = document.getElementById('signin-status');
const say = (message) => { statusEl.textContent = message; };
const nextParam = new URLSearchParams(location.search).get('next') || '';
const target = /^[a-z0-9-]+\.html$/i.test(nextParam) && nextParam !== 'signin.html' ? nextParam : 'index.html';
const goHome = () => setTimeout(() => { window.location.href = target; }, 800);

async function done(user) {
  say(`Welcome${user.displayName ? ', ' + user.displayName : ''}! Saving your progress…`);
  // Login already worked. If syncing progress hiccups, don't show an error: it retries on the home page.
  try { await syncNow(); } catch (err) { console.warn('Progress sync failed (will retry):', err); }
  goHome();
}

if (!cloudEnabled) {
  say('Cloud save is not set up yet. Add your Firebase values in js/firebase-config.js.');
  button.addEventListener('click', () => say('Setup needed: see FIREBASE_SETUP.md.'));
} else {
  finishRedirect().then((user) => { if (user) done(user); }).catch((e) => say(friendlyError(e)));
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

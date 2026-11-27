import { cloudEnabled, signInWithGoogle, finishRedirect, syncNow, friendlyError, onUser } from './cloud.js';

const button = document.getElementById('google-signin');
const statusEl = document.getElementById('signin-status');
const say = (message) => { statusEl.textContent = message; };
const goHome = () => setTimeout(() => { window.location.href = 'index.html'; }, 800);

async function done(user) {
  say(`Welcome${user.displayName ? ', ' + user.displayName : ''}! Saving your progress…`);
  try { await syncNow(); } catch (err) { say(friendlyError(err)); return; }
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

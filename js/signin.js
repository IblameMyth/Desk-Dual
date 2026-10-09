import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';

const button = document.getElementById('google-signin');
const status = document.getElementById('signin-status');
const say = (message) => { status.textContent = message; };

if (!isFirebaseConfigured) {
  say('Firebase web app values are missing. Add your real apiKey and appId in js/firebase-config.js.');
  button.addEventListener('click', () => say('Setup required: add the real Firebase apiKey and appId, enable Google under Authentication → Sign-in method, and authorize this website domain.'));
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  getRedirectResult(auth).then((result) => {
    if (result?.user) {
      say(`Signed in as ${result.user.displayName || result.user.email || 'your Google account'}.`);
      setTimeout(() => { window.location.href = 'index.html'; }, 700);
    }
  }).catch((error) => say(errorMessage(error)));

  button.addEventListener('click', async () => {
    button.disabled = true;
    say('Opening Google sign-in…');
    try {
      const result = await signInWithPopup(auth, provider);
      say(`Welcome${result.user.displayName ? ', ' + result.user.displayName : ''}!`);
      setTimeout(() => { window.location.href = 'index.html'; }, 650);
    } catch (error) {
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        try { await signInWithRedirect(auth, provider); return; } catch (redirectError) { error = redirectError; }
      }
      say(errorMessage(error));
    } finally { button.disabled = false; }
  });
}

function errorMessage(error) {
  const messages = {
    'auth/unauthorized-domain': 'This domain is not authorized. Add your Vercel domain in Firebase Authentication → Settings → Authorized domains.',
    'auth/operation-not-allowed': 'Google sign-in is not enabled. Enable Google in Firebase Authentication → Sign-in method.',
    'auth/popup-closed-by-user': 'The Google sign-in window was closed before finishing.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.'
  };
  return messages[error?.code] || `Sign-in failed: ${error?.message || 'Please check your Firebase settings and try again.'}`;
}

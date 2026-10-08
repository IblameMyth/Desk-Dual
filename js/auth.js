import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const $ = id => document.getElementById(id);
const message = (text, error = false) => { $('auth-message').textContent = text; $('auth-message').classList.toggle('is-error', error); };
let auth = null, emailMode = 'signin';

function showAccount(user) {
  const raw = Storage.prototype.setItem;
  if (user) {
    raw.call(localStorage, 'deskduel.activeAccountUid', user.uid);
    $('auth-current').textContent = `Signed in as ${user.displayName || user.phoneNumber || user.email || 'Desk Duel player'}`;
    $('google-signin').hidden = true;
    $('email-form').hidden = true;
    $('signout').hidden = false;
    message('Your game data is now scoped to this account on this browser.');
  } else {
    raw.call(localStorage, 'deskduel.activeAccountUid', '');
    // Empty string means signed out; account-scope treats it as no account.
    $('auth-current').textContent = 'Not signed in';
    $('google-signin').hidden = false;
    $('email-form').hidden = false;
    $('signout').hidden = true;
  }
}

if (!isFirebaseConfigured) {
  $('auth-current').textContent = 'Authentication setup needed';
  message('To activate sign-in, add your Firebase web config in js/firebase-config.js, then enable Email/Password and Google under Firebase Authentication.', true);
  $('google-signin').addEventListener('click', () => message('Firebase is not configured yet. Follow the setup steps in README.md.', true));
  $('email-form').addEventListener('submit', e => { e.preventDefault(); message('Firebase is not configured yet. Enable Email/Password under Firebase Authentication.', true); });
  $('email-mode-toggle').addEventListener('click', () => {
    emailMode = emailMode === 'signin' ? 'signup' : 'signin';
    $('email-submit').textContent = emailMode === 'signin' ? 'SIGN IN WITH GMAIL' : 'CREATE ACCOUNT';
    $('email-password').autocomplete = emailMode === 'signin' ? 'current-password' : 'new-password';
    $('email-mode-toggle').textContent = emailMode === 'signin' ? 'NEW PLAYER? CREATE ACCOUNT' : 'ALREADY HAVE AN ACCOUNT? SIGN IN';
  });
  $('signout').hidden = true;
} else {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  onAuthStateChanged(auth, showAccount);

  $('google-signin').addEventListener('click', async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) { message(e.message || 'Google sign-in failed.', true); }
  });

  $('email-mode-toggle').addEventListener('click', () => {
    emailMode = emailMode === 'signin' ? 'signup' : 'signin';
    $('email-submit').textContent = emailMode === 'signin' ? 'SIGN IN WITH GMAIL' : 'CREATE ACCOUNT';
    $('email-password').autocomplete = emailMode === 'signin' ? 'current-password' : 'new-password';
    $('email-mode-toggle').textContent = emailMode === 'signin' ? 'NEW PLAYER? CREATE ACCOUNT' : 'ALREADY HAVE AN ACCOUNT? SIGN IN';
  });

  $('email-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('email-address').value.trim();
    const password = $('email-password').value;
    try {
      if (emailMode === 'signup') await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
      message(emailMode === 'signup' ? 'Account created successfully.' : 'Signed in successfully.');
    } catch (e) {
      const friendly = ({
        'auth/email-already-in-use': 'This email already has an account. Choose sign in instead.',
        'auth/invalid-credential': 'Email or password is incorrect.',
        'auth/weak-password': 'Choose a password with at least 6 characters.',
        'auth/invalid-email': 'Enter a valid Gmail/email address.'
      })[e.code];
      message(friendly || e.message || 'Email sign-in failed.', true);
    }
  });

  $('signout').addEventListener('click', async () => {
    try { await signOut(auth); message('Signed out. Your account data remains saved separately on this browser.'); }
    catch (e) { message(e.message || 'Could not sign out.', true); }
  });
}

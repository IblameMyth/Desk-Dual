import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';
const $ = id => document.getElementById(id);
const message = (text, error = false) => { const el = $('auth-message'); if (el) { el.textContent = text; el.classList.toggle('is-error', error); } };
let emailMode = 'signin', auth = null, firebaseAuth = null;
function setMode() {
  emailMode = emailMode === 'signin' ? 'signup' : 'signin';
  $('email-submit').textContent = emailMode === 'signin' ? 'SIGN IN WITH EMAIL' : 'CREATE ACCOUNT';
  $('email-password').autocomplete = emailMode === 'signin' ? 'current-password' : 'new-password';
  $('email-mode-toggle').textContent = emailMode === 'signin' ? 'NEW PLAYER? CREATE ACCOUNT' : 'ALREADY HAVE AN ACCOUNT? SIGN IN';
}
$('email-mode-toggle')?.addEventListener('click', setMode);
$('email-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!auth || !firebaseAuth) { message('Email sign-in is not connected. Check Firebase configuration and reload this page.', true); return; }
  const email = $('email-address').value.trim(), password = $('email-password').value;
  try {
    if (emailMode === 'signup') await firebaseAuth.createUserWithEmailAndPassword(auth, email, password);
    else await firebaseAuth.signInWithEmailAndPassword(auth, email, password);
    message(emailMode === 'signup' ? 'Account created successfully.' : 'Signed in successfully.');
  } catch (e) {
    const friendly = ({'auth/email-already-in-use':'This email already has an account. Choose sign in instead.','auth/invalid-credential':'Email or password is incorrect.','auth/weak-password':'Choose a password with at least 6 characters.','auth/invalid-email':'Enter a valid email address.','auth/operation-not-allowed':'Enable Email/Password in Firebase Authentication.'})[e.code];
    message(friendly || e.message || 'Email sign-in failed.', true);
  }
});
$('google-signin')?.addEventListener('click', async () => {
  if (!auth || !firebaseAuth) { message('Google sign-in is not connected. Verify js/firebase-config.js and enable Google in Firebase Authentication.', true); return; }
  try { await firebaseAuth.signInWithPopup(auth, new firebaseAuth.GoogleAuthProvider()); }
  catch (e) { message(({'auth/unauthorized-domain':'Add this website hostname in Firebase Authentication → Settings → Authorized domains.','auth/operation-not-allowed':'Enable Google in Firebase Authentication → Sign-in method.','auth/popup-blocked':'Allow popups for this website, then try again.'})[e.code] || e.message || 'Google sign-in failed.', true); }
});
$('signout')?.addEventListener('click', async () => { try { if (auth && firebaseAuth) await firebaseAuth.signOut(auth); } catch(e) { message(e.message, true); } });
$('auth-current').textContent = 'Account status ready';
$('signout').hidden = true;
if (!isFirebaseConfigured) {
  message('Firebase configuration is missing. Add your real web app values in js/firebase-config.js.', true);
} else {
  try {
    const appSdk = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
    firebaseAuth = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
    const app = appSdk.initializeApp(firebaseConfig); auth = firebaseAuth.getAuth(app);
    firebaseAuth.onAuthStateChanged(auth, user => {
      Storage.prototype.setItem.call(localStorage, 'deskduel.activeAccountUid', user ? user.uid : '');
      $('auth-current').textContent = user ? `Signed in as ${user.displayName || user.email || 'Desk Duel player'}` : 'Not signed in';
      $('google-signin').hidden = !!user; $('email-form').hidden = !!user; $('signout').hidden = !user;
      if (user) message('Signed in successfully.');
    });
  } catch (e) {
    $('auth-current').textContent = 'Account status ready';
    message('Could not load Firebase Authentication. Check your internet connection and browser Console, then reload.', true);
  }
}

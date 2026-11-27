/* Google sign-in + Firestore cloud save for Desk Dual.
   Safe to import on any page: if Firebase is not configured (or fails to load)
   every function quietly does nothing and the games keep using localStorage. */
import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const V = '10.12.5';
const CDN = `https://www.gstatic.com/firebasejs/${V}`;

/* Local keys that get saved to the cloud. */
const KEYS = {
  settings: 'deskduel.settings.v1',
  playerName: 'deskduel.playerName',
  penProgress: 'deskDuelProgressV1',
  friendsSetup: 'deskDuelFriendsSetupV1',
  rajaRoleHistory: 'deskduel.rrc.roleHistory'
};

let fb = null;        // lazily loaded firebase modules
let ready = null;
const listeners = new Set();
let currentUser = null;

export const cloudEnabled = isFirebaseConfigured;
export const getUser = () => currentUser;

async function load() {
  if (!isFirebaseConfigured) return null;
  if (ready) return ready;
  ready = (async () => {
    try {
      const [appM, authM, fsM] = await Promise.all([
        import(`${CDN}/firebase-app.js`),
        import(`${CDN}/firebase-auth.js`),
        import(`${CDN}/firebase-firestore.js`)
      ]);
      const app = appM.initializeApp(firebaseConfig);
      const auth = authM.getAuth(app);
      const db = fsM.getFirestore(app);
      fb = { ...authM, ...fsM, auth, db };
      fb.onAuthStateChanged(auth, (user) => {
        currentUser = user;
        listeners.forEach((fn) => { try { fn(user); } catch (_) {} });
      });
      return fb;
    } catch (err) {
      console.warn('Firebase failed to load', err);
      ready = null;
      return null;
    }
  })();
  return ready;
}

/* Call fn(user|null) once sign-in state is known, and again whenever it changes. */
export function onUser(fn) {
  if (!isFirebaseConfigured) { fn(null); return; }
  load().then(async (m) => {
    if (!m) { fn(null); return; }
    await m.auth.authStateReady();
    listeners.add(fn);
    fn(m.auth.currentUser);
  });
}

export async function signInWithGoogle() {
  const m = await load();
  if (!m) throw Object.assign(new Error('Firebase is not configured.'), { code: 'app/not-configured' });
  const provider = new m.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await m.signInWithPopup(m.auth, provider);
    return result.user;
  } catch (err) {
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
      await m.signInWithRedirect(m.auth, provider);
      return null;
    }
    throw err;
  }
}

export async function finishRedirect() {
  const m = await load();
  if (!m) return null;
  const result = await m.getRedirectResult(m.auth);
  return result?.user || null;
}

export async function signOutUser() {
  const m = await load();
  if (m) await m.signOut(m.auth);
}

/* ---------- local <-> cloud data ---------- */
function readLocal() {
  const out = {};
  for (const [name, key] of Object.entries(KEYS)) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) continue;
      out[name] = name === 'playerName' ? raw : JSON.parse(raw);
    } catch (_) { /* skip corrupt value */ }
  }
  return out;
}

function writeLocal(data) {
  for (const [name, key] of Object.entries(KEYS)) {
    if (data[name] == null) continue;
    try { localStorage.setItem(key, name === 'playerName' ? String(data[name]) : JSON.stringify(data[name])); } catch (_) {}
  }
}

/* Pen Fight progress: never lose levels or pens when merging two devices. */
function mergeProgress(a, b) {
  if (!a) return b; if (!b) return a;
  const owned = [...new Set([...(a.owned || []), ...(b.owned || [])])];
  const lead = (a.unlockedLevel || 1) >= (b.unlockedLevel || 1) ? a : b;
  return { ...b, ...a, owned, unlockedLevel: Math.max(a.unlockedLevel || 1, b.unlockedLevel || 1), equipped: lead.equipped || 'starter' };
}

/* Pull the cloud copy, merge it with this device, save the result in both places. */
export async function syncNow() {
  const m = await load();
  const user = m?.auth.currentUser;
  if (!m || !user) return false;
  const ref = m.doc(m.db, 'users', user.uid);
  const snap = await m.getDoc(ref);
  const cloud = snap.exists() ? (snap.data().data || {}) : {};
  const local = readLocal();
  const merged = { ...local, ...cloud, penProgress: mergeProgress(local.penProgress, cloud.penProgress) };
  // A name/setup already on this device wins only if the cloud has none.
  writeLocal(merged);
  await m.setDoc(ref, {
    profile: { displayName: user.displayName || '', photoURL: user.photoURL || '' },
    data: merged,
    updatedAt: m.serverTimestamp()
  }, { merge: true });
  return true;
}

/* Record one finished match: recordResult('chop-sticks', 'win' | 'loss' | 'draw'). */
export async function recordResult(game, result) {
  const m = await load();
  const user = m?.auth.currentUser;
  if (!m || !user || !/^[a-z0-9-]{1,40}$/.test(game)) return;
  const field = result === 'win' ? 'wins' : result === 'loss' ? 'losses' : 'draws';
  await m.setDoc(m.doc(m.db, 'users', user.uid), {
    stats: { [game]: { played: m.increment(1), [field]: m.increment(1) } },
    updatedAt: m.serverTimestamp()
  }, { merge: true });
}

export async function getStats() {
  const m = await load();
  const user = m?.auth.currentUser;
  if (!m || !user) return {};
  const snap = await m.getDoc(m.doc(m.db, 'users', user.uid));
  return snap.exists() ? (snap.data().stats || {}) : {};
}

export function friendlyError(error) {
  const messages = {
    'app/not-configured': 'Firebase is not set up yet. Add your config in js/firebase-config.js.',
    'auth/unauthorized-domain': 'This website address is not authorized. Add it in Firebase → Authentication → Settings → Authorized domains.',
    'auth/operation-not-allowed': 'Google sign-in is turned off. Enable Google in Firebase → Authentication → Sign-in method.',
    'auth/popup-closed-by-user': 'The Google window was closed before finishing.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'permission-denied': 'Cloud save was refused. Publish firestore.rules in your Firebase project.'
  };
  return messages[error?.code] || `Something went wrong: ${error?.message || 'please try again.'}`;
}

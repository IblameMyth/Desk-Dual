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
  if (!m) return;
  try { await flushPending(); await syncNow(); } catch (_) {}   // save this player's unsynced progress first
  await m.signOut(m.auth);
  clearUserLocal();                                             // the next player starts clean
  try { localStorage.removeItem(OWNER_KEY); } catch (_) {}
}

/* ---------- one device, many accounts ----------
   localStorage belongs to the browser, not to the Google account. Without this, a second account
   signing in on the same browser would inherit (and then upload) the first account's pens, name and
   progress. So we remember which uid owns the data on this device; when a different uid signs in,
   the previous player's local data is wiped and the new account starts from its own cloud copy only. */
const OWNER_KEY = 'deskDuelDeviceOwnerV1';
const PENDING_KEY = 'deskDuelPendingStatsV1';

function clearUserLocal() {
  let hadData = false;
  for (const key of [...Object.values(KEYS), PENDING_KEY]) {
    try {
      if (localStorage.getItem(key) != null) hadData = true;
      localStorage.removeItem(key);
    } catch (_) {}
  }
  return hadData;
}

/* Returns true if another player's local data was removed (the page should reload to drop it from memory). */
export function claimDevice(user) {
  if (!user) return false;
  let owner = null;
  try { owner = localStorage.getItem(OWNER_KEY); } catch (_) {}
  if (owner === user.uid) return false;
  const cleared = clearUserLocal();
  try { localStorage.setItem(OWNER_KEY, user.uid); } catch (_) {}
  return cleared;
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
  claimDevice(user);   // never merge another account's local data into this one
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

/* ---------- per-game stats: users/{uid}/games/{game} ----------
   Every account has its own private documents. Firestore rules (firestore.rules) make sure
   nobody can read or write another account's data and that numbers stay valid. */
export const GAME_IDS = ['penfight', 'raja-rani', 'hand-cricket', 'behrupiye-ko-pakdo', 'stone-paper-scissors',
  'ashta-chamma', 'chidiya-udd', 'chop-sticks', 'battleship', 'pencil-tower', 'bottle-flip', 'npat'];

const readPending = () => { try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]') || []; } catch (_) { return []; } };
const writePending = (list) => { try { localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-50))); } catch (_) {} };
const whole = (v) => Math.max(0, Math.min(1e9, Math.round(Number(v) || 0)));

/* recordGame('chop-sticks', { inc: { wins: 1 }, max: { highScore: 12 }, set: { lastRole: 'Raja' }, union: { pensUnlocked: ['pen1'] } }) */
export async function recordGame(game, ops = {}, { queue = true } = {}) {
  if (!GAME_IDS.includes(game)) return false;
  let uid = null;
  try {
    const m = await load();
    const user = m?.auth.currentUser;
    if (!m || !user) throw new Error('not signed in');
    uid = user.uid;
    const ref = m.doc(m.db, 'users', user.uid, 'games', game);
    await m.runTransaction(m.db, async (tx) => {
      const snap = await tx.get(ref);
      const cur = snap.exists() ? snap.data() : {};
      const next = {};
      for (const [k, v] of Object.entries(ops.inc || {})) next[k] = whole(cur[k]) + whole(v);
      for (const [k, v] of Object.entries(ops.max || {})) next[k] = Math.max(whole(cur[k]), whole(v));
      for (const [k, v] of Object.entries(ops.set || {})) next[k] = typeof v === 'number' ? whole(v) : String(v).slice(0, 30);
      for (const [k, v] of Object.entries(ops.union || {})) {
        next[k] = [...new Set([...(Array.isArray(cur[k]) ? cur[k] : []), ...v.map((x) => String(x).slice(0, 30))])].slice(0, 10);
      }
      tx.set(ref, { ...next, updatedAt: m.serverTimestamp() }, { merge: true });
    });
    return true;
  } catch (err) {
    // queued stats remember their owner, so they can never be uploaded to a different account
    if (queue && uid && err?.code !== 'permission-denied') writePending([...readPending(), { uid, game, ops }]);
    return false;
  }
}

/* Retry stats that could not be saved earlier (offline, closed tab, etc.). */
export async function flushPending() {
  const list = readPending();
  if (!list.length) return;
  const m = await load();
  const uid = m?.auth.currentUser?.uid;
  if (!uid) return;
  writePending([]);
  for (const item of list) if (item.uid === uid) await recordGame(item.game, item.ops);
}

/* All of this player's stats: { 'chop-sticks': { wins: 3, losses: 1 }, ... } */
export async function getGameStats() {
  const m = await load();
  const user = m?.auth.currentUser;
  if (!m || !user) return {};
  const snap = await m.getDocs(m.collection(m.db, 'users', user.uid, 'games'));
  const out = {};
  snap.forEach((d) => { out[d.id] = d.data(); });
  return out;
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

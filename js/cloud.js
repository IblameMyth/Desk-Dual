/* Google sign-in + Firestore cloud save for Desk Dual.
   Safe to import on any page: if Firebase is not configured (or fails to load)
   every function quietly does nothing and the games keep using localStorage. */
import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const V = '10.12.5';
const SYNCED_KEY = 'deskDuelSyncedUid';
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
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  if (mobile) { // popups are unreliable on phones: use the full-page redirect
    await m.signInWithRedirect(m.auth, provider);
    return null;
  }
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
  try { localStorage.setItem(SYNCED_KEY, user.uid); } catch (_) {}
  await ensureGameDocs(m, user);
  return true;
}

/* While playing: send this device's progress/name/settings to the cloud (this device wins). */
export async function pushLocal() {
  const m = await load();
  const user = m?.auth.currentUser;
  if (!m || !user) return false;
  const ref = m.doc(m.db, 'users', user.uid);
  const snap = await m.getDoc(ref);
  const cloud = snap.exists() ? (snap.data().data || {}) : {};
  const local = readLocal();
  const merged = { ...cloud, ...local, penProgress: mergeProgress(local.penProgress, cloud.penProgress) };
  writeLocal(merged);
  await m.setDoc(ref, { data: merged, updatedAt: m.serverTimestamp() }, { merge: true });
  return true;
}

/* First time on this device/account: cloud wins (so a new phone gets the old data).
   After that: this device pushes what it has. */
export async function syncOnLoad() {
  const uid = currentUser?.uid;
  let synced = null;
  try { synced = localStorage.getItem(SYNCED_KEY); } catch (_) {}
  if (uid && synced === uid) { await pushLocal(); await ensureGameDocs(await load(), currentUser); return true; }
  return syncNow();
}

let pushTimer = null;
export function schedulePush(delay = 2500) {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushLocal().catch(() => {}); }, delay);
}

/* Every account gets one stats document per game from the first login, starting at zero. */
const GAME_DEFAULTS = {
  'penfight': { pensUnlocked: [], level: 1, wins: 0, losses: 0 },
  'raja-rani': { rounds: 0, wins: 0, timesRaja: 0, timesRani: 0, timesSipahi: 0, timesChor: 0 },
  'hand-cricket': { runs: 0, wickets: 0, highScore: 0 },
  'behrupiye-ko-pakdo': { correctGuesses: 0, rounds: 0, wins: 0 },
  'stone-paper-scissors': { wins: 0, losses: 0, draws: 0 },
  'ashta-chamma': { wins: 0, tokens: 0, completedMatches: 0 },
  'chidiya-udd': { score: 0, highScore: 0 },
  'chop-sticks': { wins: 0, losses: 0 },
  'battleship': { wins: 0, losses: 0, shipsDestroyed: 0 },
  'pencil-tower': { highestTower: 0, score: 0 },
  'bottle-flip': { successfulFlips: 0, bestStreak: 0 },
  'npat': { score: 0, rounds: 0, validAnswers: 0, totalAnswers: 0 }
};
async function ensureGameDocs(m, user) {
  if (!m || !user) return;
  const snap = await m.getDocs(m.collection(m.db, 'users', user.uid, 'games'));
  const have = new Set();
  snap.forEach((d) => have.add(d.id));
  await Promise.all(Object.entries(GAME_DEFAULTS).filter(([g]) => !have.has(g)).map(([g, zero]) =>
    m.setDoc(m.doc(m.db, 'users', user.uid, 'games', g), { ...zero, updatedAt: m.serverTimestamp() })
      .catch(() => {})));
}

/* ---------- per-game stats: users/{uid}/games/{game} ----------
   Every account has its own private documents. Firestore rules (firestore.rules) make sure
   nobody can read or write another account's data and that numbers stay valid. */
export const GAME_IDS = ['penfight', 'raja-rani', 'hand-cricket', 'behrupiye-ko-pakdo', 'stone-paper-scissors',
  'ashta-chamma', 'chidiya-udd', 'chop-sticks', 'battleship', 'pencil-tower', 'bottle-flip', 'npat'];

const PENDING_KEY = 'deskDuelPendingStatsV1';
const readPending = () => { try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]') || []; } catch (_) { return []; } };
const writePending = (list) => { try { localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-50))); } catch (_) {} };
const whole = (v) => Math.max(0, Math.min(1e9, Math.round(Number(v) || 0)));

/* recordGame('chop-sticks', { inc: { wins: 1 }, max: { highScore: 12 }, set: { lastRole: 'Raja' }, union: { pensUnlocked: ['pen1'] } }) */
export async function recordGame(game, ops = {}, { queue = true } = {}) {
  if (!GAME_IDS.includes(game)) return false;
  try {
    const m = await load();
    const user = m?.auth.currentUser;
    if (!m || !user) throw new Error('not signed in');
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
    schedulePush();
    return true;
  } catch (err) {
    if (queue && err?.code !== 'permission-denied') writePending([...readPending(), { game, ops }]);
    return false;
  }
}

/* Retry stats that could not be saved earlier (offline, closed tab, etc.). */
export async function flushPending() {
  const list = readPending();
  if (!list.length) return;
  writePending([]);
  for (const item of list) await recordGame(item.game, item.ops);
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
    'auth/web-storage-unsupported': 'This browser is blocking storage. Turn off private mode or tracking protection, or open the site in Chrome or Safari.',
    'auth/popup-closed-by-user': 'The Google window was closed before finishing.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'permission-denied': 'Cloud save was refused. Publish firestore.rules in your Firebase project.'
  };
  return messages[error?.code] || `Something went wrong: ${error?.message || 'please try again.'}`;
}

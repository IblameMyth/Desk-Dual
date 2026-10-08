/* User settings, persisted in localStorage. Shared by the menu and the game. */
const KEY = 'deskduel.settings.v1';
const DEFAULTS = { sound: true, vibration: true, graphics: 'high', guide: true, theme: 'light' };

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch (_) {
    return { ...DEFAULTS }; // storage blocked or corrupt: fall back to defaults
  }
}

export const settings = load();

export function applyTheme() {
  document.documentElement.dataset.theme = settings.theme === 'dark' ? 'dark' : 'light';
}

export function setSetting(key, value) {
  if (!(key in DEFAULTS)) return;
  settings[key] = value;
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch (_) {
    /* private mode: setting still applies for this visit */
  }
  if (key === 'theme') applyTheme();
}

export function vibrate(pattern) {
  if (settings.vibration && navigator.vibrate) navigator.vibrate(pattern);
}

applyTheme();

import * as ui from './ui.js';
const params = new URLSearchParams(location.search);
const view = params.get('mode') ? 'game' : (params.get('view') || 'menu');
const bodyClass = { menu: 'menu-page', levels: 'levels-page', friends: 'friends-page', game: 'game-page' }[view] || 'menu-page';
document.body.className = bodyClass;
document.querySelectorAll('[data-view]').forEach((section) => { section.hidden = section.dataset.view !== view; });

if (view === 'menu') import('./main.js');
if (view === 'levels') import('./levels.js');
if (view === 'friends') import('./friends-setup.js');
// The level-select and friends-setup screens had no click feedback: add soft sounds there (never blocks the page).
if (view === 'levels' || view === 'friends') {
  import('./audio.js').then(({ audio }) => {
    document.addEventListener('pointerdown', () => audio.unlock(), { once: true });
    document.addEventListener('click', (event) => { if (event.target.closest('button, a.btn, .btn')) audio.click(); });
  }).catch(() => {});
}
async function loadPhysicsEngine() {
  if (window.Matter) return true;
  // Prefer the bundled local engine: gameplay must not depend on a third-party
  // CDN, ad blocker, captive portal, or internet connection.
  try {
    await import('./matter-fallback.js');
    return Boolean(window.Matter);
  } catch (error) {
    console.error('Local Pen Fight physics failed to initialize:', error);
    return false;
  }
}

if (view === 'game') {
  const date = document.getElementById('board-date');
  const updateDate = () => {
    const now = new Date();
    date.textContent = `${now.getDate()}/${now.getMonth() + 1}`;
    date.dateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  updateDate();
  loadPhysicsEngine().then((loaded) => {
    if (!loaded) {
      const message = 'Pen Fight could not start its local physics engine. Please reload the page.';
      ui.createHud().showFatal(message);
      return;
    }
    import('./game.js');
  });
}

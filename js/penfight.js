import * as ui from './ui.js';
const params = new URLSearchParams(location.search);
const view = params.get('mode') ? 'game' : (params.get('view') || 'menu');
const bodyClass = { menu: 'menu-page', levels: 'levels-page', friends: 'friends-page', game: 'game-page' }[view] || 'menu-page';
document.body.className = bodyClass;
document.querySelectorAll('[data-view]').forEach((section) => { section.hidden = section.dataset.view !== view; });

if (view === 'menu') import('./main.js');
if (view === 'levels') import('./levels.js');
if (view === 'friends') import('./friends-setup.js');
async function loadPhysicsEngine() {
  if (window.Matter) return true;
  // Try independent CDNs in sequence. A single blocked CDN should not prevent
  // Pen Fight from starting; once loaded, Matter is shared by both game modes.
  const sources = [
    'https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js',
    'https://unpkg.com/matter-js@0.20.0/build/matter.min.js'
  ];
  for (const src of sources) {
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const timeout = setTimeout(() => { script.remove(); reject(new Error('Physics CDN timed out')); }, 10000);
        script.src = src;
        script.onload = () => { clearTimeout(timeout); resolve(); };
        script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('Physics CDN failed')); };
        document.head.appendChild(script);
      });
      if (window.Matter) return true;
    } catch (_) { /* Try the next provider. */ }
  }
  return false;
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
      const message = 'Pen Fight could not download its physics engine. Check your connection, then reload the page.';
      ui.createHud().showFatal(message);
      return;
    }
    import('./game.js');
  });
}

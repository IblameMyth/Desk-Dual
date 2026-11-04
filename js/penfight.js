const params = new URLSearchParams(location.search);
const view = params.get('mode') ? 'game' : (params.get('view') || 'menu');
const bodyClass = { menu: 'menu-page', levels: 'levels-page', friends: 'friends-page', game: 'game-page' }[view] || 'menu-page';
document.body.className = bodyClass;
document.querySelectorAll('[data-view]').forEach((section) => { section.hidden = section.dataset.view !== view; });

if (view === 'menu') import('./main.js');
if (view === 'levels') import('./levels.js');
if (view === 'friends') import('./friends-setup.js');
if (view === 'game') {
  const date = document.getElementById('board-date');
  const updateDate = () => {
    const now = new Date();
    date.textContent = `${now.getDate()}/${now.getMonth() + 1}`;
    date.dateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  updateDate();
  import('./game.js');
}

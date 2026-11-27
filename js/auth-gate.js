/* Sign-in gate + stats bridge. Put this as a plain <script> in <head> of every page that needs a login.
   - Hides the page until Firebase says who the player is; if nobody is signed in, sends them to
     signin.html and brings them back afterwards.
   - Exposes window.DeskStats.record(game, ops) so any game (module or classic script) can save
     the signed-in player's stats, e.g. DeskStats.record('chop-sticks', { inc: { wins: 1 } }). */
(function () {
  var base = document.currentScript && document.currentScript.src;
  var cloudUrl = new URL('cloud.js', base || document.baseURI).href;

  var hide = document.createElement('style');
  hide.id = 'auth-gate-hide';
  hide.textContent = 'html{visibility:hidden}';
  document.head.appendChild(hide);

  var reveal = function () { var s = document.getElementById('auth-gate-hide'); if (s) s.remove(); };
  var toSignIn = function () {
    var here = location.pathname.split('/').pop() || 'index.html';
    location.replace('signin.html?next=' + encodeURIComponent(here));
  };

  window.DeskStats = {
    record: function (game, ops) {
      try { import(cloudUrl).then(function (c) { return c.recordGame(game, ops); }).catch(function () {}); } catch (_) {}
    }
  };

  import(cloudUrl).then(function (cloud) {
    if (!cloud.cloudEnabled) { toSignIn(); return; }
    var revealed = false;
    cloud.onUser(function (user) {
      if (!user) { toSignIn(); return; }   // signed out (here or in another tab) or never signed in
      if (!revealed) { revealed = true; reveal(); cloud.flushPending().catch(function () {}); }
    });
  }).catch(toSignIn);
})();

/* Keeps local game data separate for each signed-in Firebase account on this browser.
   Auth identifiers use raw localStorage keys and are never namespaced. */
(function () {
  const rawGet = Storage.prototype.getItem;
  const rawSet = Storage.prototype.setItem;
  const rawRemove = Storage.prototype.removeItem;
  const rawKey = Storage.prototype.key;
  const rawClear = Storage.prototype.clear;
  const accountKey = 'deskduel.activeAccountUid';
  const bypass = new Set([accountKey, 'deskduel.auth.lastEmail', 'deskduel.auth.lastPhone']);
  function scoped(key) {
    if (typeof key !== 'string' || bypass.has(key) || key.startsWith('firebase:') || key.startsWith('firebaseLocalStorageDb')) return key;
    const uid = rawGet.call(localStorage, accountKey) || 'guest';
    return `deskduel.account.${uid}.${key}`;
  }
  Storage.prototype.getItem = function (key) { return rawGet.call(this, scoped(String(key))); };
  Storage.prototype.setItem = function (key, value) { return rawSet.call(this, scoped(String(key)), String(value)); };
  Storage.prototype.removeItem = function (key) { return rawRemove.call(this, scoped(String(key))); };
  // Keep clear() limited to the active account's data so one account cannot erase another's data.
  Storage.prototype.clear = function () {
    const uid = rawGet.call(localStorage, accountKey) || 'guest';
    const prefix = `deskduel.account.${uid}.`;
    const remove = [];
    for (let i = 0; i < this.length; i++) {
      const k = rawKey.call(this, i);
      if (k && k.startsWith(prefix)) remove.push(k);
    }
    remove.forEach(k => rawRemove.call(this, k));
  };
})();

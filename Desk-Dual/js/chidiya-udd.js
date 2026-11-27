(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const sound = () => window.ClassroomSounds;

  const parseAnimals = (text, fly, fallback) => text.trim().split('\n').map(line => {
    const [en, hi, emoji] = line.split('|');
    return { en, hi: hi || '', emoji: emoji || fallback, fly };
  });
  // 100+ animals that can fly, and 100+ that cannot. Format: English|Hindi|emoji
  const FLIERS = parseAnimals(`Sparrow|Chidiya|🐦
Crow|Kauwa|🐦‍⬛
Pigeon|Kabootar|🕊️
Parrot|Tota|🦜
Eagle|Baaz|🦅
Kite|Cheel|🦅
Vulture|Giddh|🦅
Owl|Ullu|🦉
Bat|Chamgadad|🦇
Butterfly|Titli|🦋
Honey Bee|Madhumakkhi|🐝
Mosquito|Machhar|🦟
Housefly|Makkhi|🪰
Duck|Batakh|🦆
Swan|Hans|🦢
Flamingo||🦩
Cuckoo|Koyal|
Kingfisher|Machranga|
Woodpecker|Katphodwa|
Ladybird||🐞
Seagull||
Hawk||🦅
Falcon||🦅
Osprey||🦅
Heron|Bagula|
Stork||
Crane|Sarus|
Pelican||
Albatross||
Hummingbird||
Swallow||
Swift||
Robin||
Starling||
Magpie||
Myna|Maina|
Bulbul|Bulbul|
Nightingale||
Skylark||
Lark||
Finch||
Canary||
Budgerigar||🦜
Cockatoo||🦜
Macaw||🦜
Lovebird||🦜
Parakeet||🦜
Toucan||
Hornbill|Dhanesh|
Oriole||
Sunbird||
Weaver Bird||
Tailorbird||
Drongo||
Shrike||
Blue Jay||
Raven||🐦‍⬛
Rook||🐦‍⬛
Jackdaw||🐦‍⬛
Goose||🦆
Teal||🦆
Mallard||🦆
Cormorant||
Gull||
Tern||
Puffin||
Sandpiper||
Plover||
Lapwing||
Ibis||
Spoonbill||
Egret||
Kestrel||🦅
Harrier||🦅
Buzzard||🦅
Condor||🦅
Goshawk||🦅
Sparrowhawk||🦅
Bee-eater||
Hoopoe|Hudhud|
Nightjar||
Dove|Fakhta|🕊️
Wren||
Thrush||
Warbler||
Bluebird||
Cardinal||
Mockingbird||
Redstart||
Frigatebird||
Gannet||
Shearwater||
Flycatcher||
Wagtail||
Munia||
Koel||
Barbet||
Babbler||
Dragonfly||🪰
Firefly|Jugnu|✨
Grasshopper|Tiddi|🦗
Locust||🦗
Wasp||🐝
Hornet||🐝
Bumblebee||🐝
Moth|Patanga|🦋
Cicada||🦗
Damselfly||🪰
Mayfly||🪰
Gnat||🦟
Horsefly||🪰
Bluebottle||🪰
Fruit Bat||🦇
Vampire Bat||🦇
Flying Fox||🦇
Monarch Butterfly||🦋
Swallowtail||🦋`, true, '🐦');
  const GROUNDED = parseAnimals(`Elephant|Haathi|🐘
Cow|Gaay|🐄
Dog|Kutta|🐕
Cat|Billi|🐈
Lion|Sher|🦁
Tiger|Baagh|🐅
Monkey|Bandar|🐒
Horse|Ghoda|🐎
Buffalo|Bhains|🐃
Goat|Bakri|🐐
Camel|Oont|🐪
Rabbit|Khargosh|🐇
Deer|Hiran|🦌
Fish|Machhli|🐟
Snake|Saanp|🐍
Frog|Mendhak|🐸
Tortoise|Kachua|🐢
Crocodile|Magarmachh|🐊
Bear|Bhaalu|🐻
Fox|Lomdi|🦊
Squirrel|Gilhari|🐿️
Rat|Chuha|🐀
Giraffe||🦒
Zebra||🦓
Kangaroo||🦘
Pig|Suar|🐖
Sheep|Bhed|🐑
Penguin||🐧
Rhino|Gainda|🦏
Hippo||🦛
Wolf|Bhediya|🐺
Crab|Kekda|🦀
Dolphin||🐬
Whale||🐳
Shark||🦈
Octopus||🐙
Snail|Ghonga|🐌
Panda||🐼
Leopard|Tendua|🐆
Donkey|Gadha|🐴
Mule|Khachchar|🐴
Ox|Bail|🐂
Bull|Saand|🐂
Calf|Bachhda|🐄
Lamb||🐑
Ram||🐏
Cheetah||🐆
Jaguar||🐆
Puma||🐈
Lynx||🐈
Hyena||🐺
Jackal|Siyaar|🐺
Mongoose|Nevla|
Porcupine|Sahi|
Hedgehog||🦔
Otter||🦦
Beaver||🦫
Raccoon||🦝
Skunk||🦨
Badger||🦡
Sloth||🦥
Koala||🐨
Gorilla||🦍
Chimpanzee||🐒
Orangutan||🦧
Baboon||🐒
Lemur||🐒
Meerkat||
Armadillo||
Anteater||
Aardvark||
Bison||🦬
Yak||🐂
Llama||🦙
Alpaca||🦙
Antelope||🦌
Gazelle||🦌
Moose||🦌
Reindeer||🦌
Elk||🦌
Wild Boar||🐗
Hamster||🐹
Guinea Pig||🐹
Mouse|Chuha|🐁
Chipmunk||🐿️
Lizard|Chipkali|🦎
Chameleon|Girgit|🦎
Iguana||🦎
Gecko||🦎
Cobra|Nag|🐍
Python|Ajgar|🐍
Viper||🐍
Sea Turtle||🐢
Alligator||🐊
Komodo Dragon||🦎
Salamander||🦎
Newt||🦎
Toad||🐸
Tadpole||🐸
Seal||🦭
Sea Lion||🦭
Walrus||🦭
Orca||🐋
Starfish||⭐
Jellyfish||🐚
Seahorse||🐠
Lobster||🦞
Shrimp||🦐
Squid||🦑
Eel||🐟
Salmon||🐟
Goldfish||🐠
Catfish||🐟
Stingray||🐟
Clownfish||🐠
Swordfish||🐟
Pufferfish||🐡
Oyster||🦪
Clam||🐚
Spider|Makdi|🕷️
Scorpion|Bichchhu|🦂
Centipede|Kankhajura|🐛
Earthworm|Kenchua|🪱
Caterpillar||🐛
Slug||🐌
Ostrich||
Emu||
Kiwi||
Dodo||🦤
Cassowary||`, false, '🐾');

  const BOT_NAMES = ['Rohan', 'Meera', 'Aman', 'Priya', 'Kabir', 'Isha', 'Dev', 'Anaya'];
  const SKINS = [
    { skin: '#f7d6b5', dark: '#d6a578', nail: '#fbe7d8' },
    { skin: '#c68a5b', dark: '#9d6538', nail: '#e3b998' },
    { skin: '#ecbf93', dark: '#c8935f', nail: '#f6dcc8' },
    { skin: '#9a5f35', dark: '#76441f', nail: '#c58f69' },
    { skin: '#dca173', dark: '#b87a4c', nail: '#efc7aa' },
    { skin: '#b0713f', dark: '#8a5429', nail: '#d6a47e' },
    { skin: '#f2c9a3', dark: '#d09c6c', nail: '#f9e0cc' },
    { skin: '#8b5230', dark: '#68391b', nail: '#b9825c' },
    { skin: '#d4a06a', dark: '#ad7a45', nail: '#ecc6a2' },
    { skin: '#6f4226', dark: '#52301a', nail: '#a2704f' }
  ];
  const SLEEVES = [
    { c: '#f4f1e6', d: '#b3ab94' }, { c: '#aecbe8', d: '#7497bb' },
    { c: '#e6d3a1', d: '#b39b5e' }, { c: '#f4f1e6', d: '#b3ab94' },
    { c: '#aecbe8', d: '#7497bb' }
  ];

  const WINDOW_MS = 2000; // every animal gives players exactly 2 seconds
  const READY_MS = 900;
  const RESULT_MS = 2000;

  const state = {
    mode: null, level: 'easy', players: [], round: 0, phase: 'idle',
    elapsed: 0, windowMs: WINDOW_MS, phaseLeft: 0, current: null, pools: { fly: [], ground: [] },
    botPlan: [], paused: false, last: 0, loop: null, outCounter: 0,
    endNext: false, seq: 0
  };
  let seatEls = [];

  document.addEventListener('pointerdown', () => sound()?.unlock(), { once: true });
  document.addEventListener('click', event => {
    if (event.target.closest('button, a') && !event.target.closest('.cu-udd')) sound()?.tap();
  });

  /* ---------- panels ---------- */
  function showPanel(id) {
    ['setup-ai', 'setup-friends', 'game-panel', 'result-panel'].forEach(panel =>
      $(panel).classList.toggle('hidden', panel !== id));
  }
  function openPlay(id) {
    stopLoop();
    $('main-menu').classList.add('hidden');
    $('play-area').classList.remove('hidden');
    showPanel(id);
  }

  /* ---------- hand drawing ---------- */
  function handSvg() {
    return '<svg viewBox="0 0 100 140" aria-hidden="true" focusable="false">' +
      '<g class="cu-finger">' +
        '<rect class="sk sk-edge" x="22" y="4" width="17" height="74" rx="8.5"/>' +
        '<rect class="nail" x="25.5" y="7.5" width="10" height="12" rx="5"/>' +
        '<path class="crease" d="M25 36H36M25 50H36"/>' +
      '</g>' +
      '<path class="sk sk-edge" d="M20 84C20 66 32 60 44 60L58 60C72 60 80 68 80 84L78 104C77 112 70 116 62 116L38 116C30 116 23 112 22 104Z"/>' +
      '<rect class="sk sk-edge" x="40" y="50" width="14" height="30" rx="7"/>' +
      '<rect class="sk sk-edge" x="53" y="52" width="13" height="30" rx="6.5"/>' +
      '<rect class="sk sk-edge" x="65" y="58" width="12" height="26" rx="6"/>' +
      '<path class="sk sk-edge" d="M24 90C24 83 36 81 47 86C55 89 56 98 48 100L31 102C26 102 24 97 24 90Z"/>' +
      '<path class="crease" d="M62 88Q66 94 64 100M72 90Q75 95 73 100"/>' +
      '<rect class="sl" x="22" y="108" width="56" height="32" rx="4"/>' +
      '<path class="sl-line" d="M22 118H78"/>' +
    '</svg>';
  }

  function keyFor(i) { return i === 9 ? '0' : String(i + 1); }

  function buildSeats() {
    const n = state.players.length;
    const rows = n <= 5 ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)];
    const host = $('benches');
    host.textContent = '';
    seatEls = [];
    let index = 0;
    rows.forEach(count => {
      const bench = document.createElement('div');
      bench.className = 'cu-bench';
      bench.style.setProperty('--cols', count);
      for (let k = 0; k < count; k++, index++) {
        const p = state.players[index];
        const skin = SKINS[index % SKINS.length];
        const sleeve = SLEEVES[index % SLEEVES.length];
        const seat = document.createElement('div');
        seat.className = 'cu-seat' + (p.human ? ' is-human' : '');
        seat.dataset.i = index;
        seat.style.setProperty('--skin', skin.skin);
        seat.style.setProperty('--skin-d', skin.dark);
        seat.style.setProperty('--nail', skin.nail);
        seat.style.setProperty('--sleeve', sleeve.c);
        seat.style.setProperty('--sleeve-d', sleeve.d);
        seat.innerHTML =
          '<div class="cu-handwrap"><div class="cu-hand">' + handSvg() + '</div><div class="cu-bubble">UDD!</div></div>' +
          '<div class="cu-desk"><div class="cu-desk-top"></div><div class="cu-desk-front">' +
            '<div class="cu-tag"></div><div class="cu-meta"></div>' +
            (p.human
              ? '<button class="cu-udd" type="button">UDD!<small></small></button>'
              : '<div class="cu-bot">AI</div>') +
          '</div></div>';
        seat.querySelector('.cu-tag').textContent = p.name;
        if (p.human) {
          const btn = seat.querySelector('.cu-udd');
          btn.setAttribute('aria-label', p.name + ' says Udd');
          btn.querySelector('small').textContent =
            state.mode === 'ai' ? '[SPACE]' : '[' + keyFor(index) + ']';
          const idx = index;
          const press = event => {
            event.preventDefault(); // stops the follow-up click, so one tap = one raise
            raise(idx);
            if (navigator.vibrate) navigator.vibrate(15);
          };
          btn.addEventListener('pointerdown', press);
          seat.querySelector('.cu-hand').addEventListener('pointerdown', press);
          // keyboard users (Enter / Space on the focused button) still work
          btn.addEventListener('click', event => { if (event.detail === 0) raise(idx); });
        }
        bench.appendChild(seat);
        seatEls.push(seat);
      }
      host.appendChild(bench);
    });
  }

  function renderSeat(i) {
    const p = state.players[i];
    const el = seatEls[i];
    if (!el) return;
    const calling = state.phase === 'calling';
    const out = !p.alive && !(calling && p.outcome === 'wrong');
    const say = (calling && p.raised) || (state.phase === 'result' && (p.outcome === 'wrong' || p.outcome === 'miss'));
    el.classList.toggle('is-up', calling && p.raised);
    el.classList.toggle('is-say', say);
    el.classList.toggle('is-right', p.outcome === 'right');
    el.classList.toggle('is-wrong', p.outcome === 'wrong');
    el.classList.toggle('is-miss', p.outcome === 'miss');
    el.classList.toggle('is-out', out);
    el.querySelector('.cu-bubble').textContent =
      p.outcome === 'wrong' ? 'OUT!' : p.outcome === 'miss' ? 'MISSED!' : 'UDD!';
    el.querySelector('.cu-meta').textContent = out ? 'OUT' : '✔ ' + p.score;
    const btn = el.querySelector('.cu-udd');
    if (btn) btn.disabled = out || p.raised;
  }
  function renderAll() { state.players.forEach((_, i) => renderSeat(i)); }

  /* ---------- scoreboard + board ---------- */
  function updateScoreboard() {
    const now = new Date();
    $('cu-board-date').textContent =
      String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0');
    const alive = state.players.filter(p => p.alive).length;
    const left = $('left-score');
    if (left.textContent !== String(alive)) {
      left.textContent = alive;
      left.classList.remove('pop');
      void left.offsetWidth;
      left.classList.add('pop');
    }
    $('right-score').textContent = state.round;
    $('round-label').textContent = state.mode === 'ai'
      ? 'YOU : ' + state.players[0].score + ' CORRECT'
      : 'ROUND ' + Math.max(state.round, 1) + ' · LAST ONE OUT WINS';
  }

  function showIdle(text) {
    $('board-idle').textContent = text;
    $('board-idle').classList.remove('hidden');
    $('board-animal').classList.add('hidden');
    $('timer').classList.add('hidden');
  }
  function showAnimal(a) {
    $('animal-name').textContent = a.en;
    $('animal-hi').textContent = a.hi ? '(' + a.hi + ')' : '';
    const box = $('board-animal');
    box.classList.remove('hidden');
    // restart the pop animation for every new animal
    box.style.animation = 'none';
    void box.offsetWidth;
    box.style.animation = '';
    $('board-idle').classList.add('hidden');
    $('timer').classList.remove('hidden');
    $('timer-bar').style.transform = 'scaleX(1)';
  }

  /* ---------- match flow ---------- */
  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function nextAnimal() {
    // pattern repeats forever: 4 animals that cannot fly, then 2 that can.
    // The names inside each group are random (each pool is reshuffled when it runs dry).
    const wantFly = (state.seq++ % 6) >= 4;
    const key = wantFly ? 'fly' : 'ground';
    if (!state.pools[key].length) state.pools[key] = shuffle(wantFly ? FLIERS : GROUNDED);
    return state.pools[key].pop();
  }

  function startMatch(mode, players, level) {
    stopLoop();
    Object.assign(state, {
      mode, level, round: 0, phase: 'ready', elapsed: 0, phaseLeft: READY_MS, current: null,
      pools: { fly: [], ground: [] }, botPlan: [], paused: false, outCounter: 0, endNext: false, seq: 0,
      players: players.map(p => ({
        name: p.name, human: p.human, alive: true, raised: false, score: 0,
        outcome: null, outRound: 0, outOrder: 0, rank: 0
      }))
    });
    $('main-menu').classList.add('hidden');
    $('play-area').classList.remove('hidden');
    showPanel('game-panel');
    buildSeats();
    renderAll();
    updateScoreboard();
    $('round-result').classList.add('hidden');
    $('paused-note').classList.add('hidden');
    $('pause-btn').textContent = 'PAUSE';
    $('pause-btn').classList.remove('hidden');
    $('turn-title').textContent = 'Get ready…';
    $('turn-description').textContent = 'Raise a finger only if the animal can fly. Miss a flier, or raise for one that can’t, and you are out!';
    $('key-hint').textContent = mode === 'ai'
      ? 'You have 2 seconds. Tap UDD! under your hand (or press SPACE) when the animal can fly.'
      : 'You have 2 seconds. Tap your own UDD! button, or use keys 1–9 and 0 for players 1–10.';
    showIdle('Get ready…');
    state.last = performance.now();
    state.loop = setInterval(tick, 40);
  }

  function stopLoop() {
    if (state.loop) clearInterval(state.loop);
    state.loop = null;
    state.phase = 'idle';
  }

  function tick() {
    const now = performance.now();
    const dt = Math.min(now - state.last, 100);
    state.last = now;
    if (state.paused) return;
    if (state.phase === 'ready') {
      state.phaseLeft -= dt;
      if (state.phaseLeft <= 0) beginCall();
    } else if (state.phase === 'calling') {
      state.elapsed += dt;
      state.botPlan.forEach(action => {
        if (!action.done && state.elapsed >= action.at) { action.done = true; raise(action.i); }
      });
      $('timer-bar').style.transform = 'scaleX(' + Math.max(0, 1 - state.elapsed / state.windowMs) + ')';
      if (state.elapsed >= state.windowMs) endCall();
    } else if (state.phase === 'result') {
      state.phaseLeft -= dt;
      if (state.phaseLeft <= 0) afterResult();
    }
  }

  function beginCall() {
    state.round++;
    state.current = nextAnimal();
    state.elapsed = 0;
    state.windowMs = WINDOW_MS;
    state.phase = 'calling';
    // plan when (and whether) each AI classmate reacts
    const lvl = state.level === 'hard'
      ? { fly: 0.95, slip: 0.04, min: 380, max: 0.8 }
      : { fly: 0.78, slip: 0.12, min: 700, max: 0.85 };
    state.botPlan = [];
    state.players.forEach((p, i) => {
      if (p.human || !p.alive) return;
      const acts = Math.random() < (state.current.fly ? lvl.fly : lvl.slip);
      if (acts) {
        state.botPlan.push({ i, done: false, at: lvl.min + Math.random() * (state.windowMs * lvl.max - lvl.min) });
      }
    });
    showAnimal(state.current);
    sound()?.reveal();
    $('turn-title').textContent = 'Can it fly?';
    $('turn-description').textContent = 'You have 2 seconds! Tap UDD! only if it can fly. Miss a flier or slip on a non-flier and you are out!';
    $('round-result').classList.add('hidden');
    renderAll();
    updateScoreboard();
  }

  function raise(i) {
    if (state.phase !== 'calling' || state.paused) return;
    const p = state.players[i];
    if (!p || !p.alive || p.raised) return;
    p.raised = true;
    if (state.current.fly) {
      p.score++;
      p.outcome = 'right';
      sound()?.run(3);
    } else {
      p.alive = false;
      p.outcome = 'wrong';
      p.outRound = state.round;
      p.outOrder = ++state.outCounter;
      sound()?.duck();
    }
    renderSeat(i);
    updateScoreboard();
  }

  function endCall() {
    state.phase = 'result';
    state.phaseLeft = RESULT_MS;
    $('timer').classList.add('hidden');
    const a = state.current;
    // anyone who did not raise a finger for a flying animal in time is out
    if (a.fly) {
      state.players.forEach(pl => {
        if (pl.alive && !pl.raised) {
          pl.alive = false;
          pl.outcome = 'miss';
          pl.outRound = state.round;
          pl.outOrder = ++state.outCounter;
        }
      });
    }
    const right = state.players.filter(pl => pl.outcome === 'right');
    const wrong = state.players.filter(pl => pl.outcome === 'wrong');
    const missed = state.players.filter(pl => pl.outcome === 'miss');
    const names = list => list.map(pl => pl.name).join(', ');
    const are = list => (list.length > 1 ? 'are' : 'is');
    let title;
    let detail;
    if (a.fly) {
      title = '✔ ' + a.en + ' can fly!';
      detail = right.length ? names(right) + ' said “Udd!” and scored.' : 'Nobody raised a finger in time.';
      if (missed.length) detail += ' ' + names(missed) + ' missed it and ' + are(missed) + ' OUT!';
    } else {
      title = '✖ ' + a.en + ' cannot fly!';
      detail = wrong.length
        ? names(wrong) + ' raised by mistake and ' + are(wrong) + ' OUT!'
        : 'Everyone kept their finger down. Well done!';
    }
    if (wrong.length || missed.length) sound()?.duck();
    const box = $('round-result');
    box.textContent = '';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const note = document.createElement('p');
    note.textContent = detail;
    box.append(strong, note);
    box.classList.remove('hidden');

    // the match ends as soon as one player (or nobody) is left standing
    state.endNext = state.players.filter(pl => pl.alive).length <= 1;
    renderAll();
    updateScoreboard();
  }

  function afterResult() {
    if (state.endNext) { finishMatch(); return; }
    state.players.forEach(p => { p.raised = false; p.outcome = null; });
    state.phase = 'ready';
    state.phaseLeft = READY_MS - 200;
    $('round-result').classList.add('hidden');
    $('turn-title').textContent = 'Next animal…';
    showIdle('Next animal…');
    renderAll();
  }

  /* ---------- result ---------- */
  function ordinal(n) {
    const suffix = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
  }

  function finishMatch() {
    stopLoop();
    const players = state.players;
    // the player still standing stayed through every round and wins
    players.forEach(p => {
      if (p.alive) { p.outRound = state.round; p.outOrder = ++state.outCounter; }
    });
    // first to last: stayed longest, then more correct "Udd!", then went out later
    const ranked = players.slice().sort((x, y) =>
      (Number(y.alive) - Number(x.alive)) || (y.outRound - x.outRound) || (y.score - x.score) || (y.outOrder - x.outOrder));
    ranked.forEach((p, k) => {
      const prev = ranked[k - 1];
      p.rank = prev && prev.alive === p.alive && prev.outRound === p.outRound && prev.score === p.score ? prev.rank : k + 1;
    });
    const winners = ranked.filter(p => p.rank === 1);
    const first = winners[0];
    if (window.DeskStats) window.DeskStats.record('chidiya-udd', { set: { score: players[0].score }, max: { highScore: players[0].score } });
    const winnerNames = winners.map(p => p.name).join(' & ');
    const stayed = 'stayed on the bench the longest: ' + first.outRound +
      (first.outRound === 1 ? ' round' : ' rounds') + ' and ' + first.score + ' correct.';

    let title;
    let copy;
    if (state.mode === 'ai') {
      const me = players[0];
      if (me.rank === 1) {
        title = me.name + ' wins! 🎉';
        copy = winners.length > 1 ? 'You tied for first with ' + winners.filter(p => p !== me).map(p => p.name).join(' & ') + '.'
          : 'You ' + stayed;
      } else {
        title = winnerNames + ' win' + (winners.length > 1 ? '' : 's') + '!';
        copy = 'You finished ' + ordinal(me.rank) + ' of ' + players.length + '.';
      }
    } else if (winners.length > 1) {
      title = 'It’s a draw!';
      copy = winnerNames + ' tied for first.';
    } else {
      title = first.name + ' wins! 🎉';
      copy = first.name + ' ' + stayed;
    }
    $('match-result-title').textContent = title;
    $('match-result-copy').textContent = copy;

    const now = new Date();
    $('cu-final-date').textContent =
      String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0');
    const host = $('standings');
    host.textContent = '';
    const head = document.createElement('div');
    head.className = 'cu-final-row cu-final-head';
    ['RANK', 'NAME', 'OUT IN · ✔'].forEach(text => {
      const cell = document.createElement('span');
      cell.textContent = text;
      head.appendChild(cell);
    });
    host.appendChild(head);
    ranked.forEach(p => {
      const row = document.createElement('div');
      row.className = 'cu-final-row' + (p.rank === 1 ? ' win' : '');
      const rank = document.createElement('span');
      rank.className = 'rank';
      rank.textContent = (p.rank === 1 ? '👑 ' : '') + ordinal(p.rank);
      const name = document.createElement('span');
      name.className = 'nm';
      name.textContent = p.name;
      const status = document.createElement('span');
      status.className = 'st';
      status.textContent = 'ROUND ' + p.outRound + ' · ✔ ' + p.score;
      row.append(rank, name, status);
      host.appendChild(row);
    });
    showPanel('result-panel');
    if (state.mode === 'friends' || players[0].rank === 1) sound()?.win(); else sound()?.lose();
  }

  /* ---------- setup screens ---------- */
  function buildFriendFields() {
    const count = Number($('friend-count').value);
    const host = $('friend-names');
    const old = Array.from(host.querySelectorAll('input')).map(input => input.value);
    host.textContent = '';
    for (let i = 0; i < count; i++) {
      const label = document.createElement('label');
      label.className = 'khc-field';
      label.append('Player ' + (i + 1));
      const input = document.createElement('input');
      input.maxLength = 18;
      input.placeholder = 'Enter Player ' + (i + 1) + ' name';
      input.value = old[i] || '';
      label.appendChild(input);
      host.appendChild(label);
    }
  }

  (function initFriendCount() {
    const select = $('friend-count');
    for (let n = 2; n <= 10; n++) {
      const option = document.createElement('option');
      option.value = n;
      option.textContent = n + ' players';
      if (n === 4) option.selected = true;
      select.appendChild(option);
    }
    select.addEventListener('change', buildFriendFields);
    buildFriendFields();
  })();

  $('open-ai').addEventListener('click', () => openPlay('setup-ai'));
  $('open-friends').addEventListener('click', () => openPlay('setup-friends'));
  $('open-how').addEventListener('click', () => $('how-dialog').showModal());
  $('back-menu').addEventListener('click', () => { window.location.href = 'chidiya-udd.html'; });

  $('ai-name').addEventListener('input', () => {
    $('start-ai').disabled = !$('ai-name').value.trim();
  });
  $('start-ai').addEventListener('click', () => {
    const name = $('ai-name').value.trim();
    if (!name) { $('ai-error').textContent = 'Enter your name first.'; return; }
    const bots = shuffle(BOT_NAMES.filter(b => b.toLowerCase() !== name.toLowerCase())).slice(0, 3);
    startMatch('ai',
      [{ name, human: true }, ...bots.map(b => ({ name: b, human: false }))],
      $('ai-level').value);
  });
  $('start-friends').addEventListener('click', () => {
    const names = Array.from($('friend-names').querySelectorAll('input')).map(input => input.value.trim());
    if (names.some(n => !n)) { $('friends-error').textContent = 'Enter every player name.'; return; }
    if (new Set(names.map(n => n.toLowerCase())).size !== names.length) {
      $('friends-error').textContent = 'Use different names for every player.';
      return;
    }
    $('friends-error').textContent = '';
    startMatch('friends', names.map(name => ({ name, human: true })), 'easy');
  });

  /* ---------- controls ---------- */
  function setPaused(value) {
    if (state.phase === 'idle' || state.phase === 'over') return;
    state.paused = value;
    state.last = performance.now();
    $('paused-note').classList.toggle('hidden', !value);
    $('pause-btn').textContent = value ? 'RESUME' : 'PAUSE';
  }
  $('pause-btn').addEventListener('click', () => setPaused(!state.paused));
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });

  document.addEventListener('keydown', event => {
    if (!state.loop || event.repeat) return;
    if (event.target.closest('input, select, textarea, dialog, #pause-btn')) return;
    let index = -1;
    if (state.mode === 'ai') {
      if (event.code === 'Space' || event.key === '1') index = 0;
    } else if (/^[0-9]$/.test(event.key)) {
      index = event.key === '0' ? 9 : Number(event.key) - 1;
    }
    if (index < 0 || index >= state.players.length) return;
    event.preventDefault();
    raise(index);
  });

  $('play-again').addEventListener('click', () =>
    openPlay(state.mode === 'ai' ? 'setup-ai' : 'setup-friends'));
  $('exit-game').addEventListener('click', () => { window.location.href = 'chidiya-udd.html'; });
})();

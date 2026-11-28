(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const sound = () => window.ClassroomSounds;
  const moves = {
    stone: { emoji: '✊', label: 'STONE' },
    paper: { emoji: '✋', label: 'PAPER' },
    scissors: { emoji: '✌️', label: 'SCISSORS' }
  };
  const winsAgainst = { stone: 'scissors', paper: 'stone', scissors: 'paper' };
  const state = {
    mode: null,
    players: [],
    scores: [0, 0],
    round: 1,
    target: 2,
    waiting: false,
    playerOneMove: null,
    playerHistory: [],
    currentVoter: 0
  };

  document.addEventListener('pointerdown', () => sound()?.unlock(), { once: true });
  document.addEventListener('click', event => {
    if (event.target.closest('button, a')) sound()?.tap();
  });

  function showPanel(id) {
    ['setup-ai', 'setup-friends', 'game-panel', 'result-panel'].forEach(panel =>
      $(panel).classList.toggle('hidden', panel !== id));
  }

  function openPlay(id) {
    $('main-menu').classList.add('hidden');
    $('play-area').classList.remove('hidden');
    showPanel(id);
  }

  function resetMatch(mode, players, target) {
    state.mode = mode;
    state.players = players;
    state.scores = [0, 0];
    state.round = 1;
    state.target = target;
    state.waiting = false;
    state.playerOneMove = null;
    state.playerHistory = [];
    state.currentVoter = 0;
    $('main-menu').classList.add('hidden');
    $('play-area').classList.remove('hidden');
    showPanel('game-panel');
    updateScoreboard();
    setTurn();
  }

  function updateScoreboard() {
    if ($('sps-board-date')) {
      const now = new Date();
      $('sps-board-date').textContent =
        `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    $('left-label').textContent = state.players[0].name.toUpperCase();
    $('right-label').textContent = state.players[1].name.toUpperCase();
    $('left-score').textContent = state.scores[0];
    $('right-score').textContent = state.scores[1];
    $('round-label').textContent = `ROUND ${state.round}`;
    $('target-label').textContent = `FIRST TO ${state.target}`;
  }

  function setTurn() {
    state.waiting = false;
    $('move-grid').querySelectorAll('button').forEach(item => item.classList.remove('selected'));
    $('round-result').classList.add('hidden');
    $('continue-round').classList.add('hidden');
    $('move-grid').classList.remove('hidden');
    $('turn-title').textContent =
      state.mode === 'ai' ? `${state.players[0].name}, choose your move` : `${state.players[state.currentVoter].name}, choose secretly`;
    $('turn-description').textContent =
      state.mode === 'ai'
        ? 'Stone beats scissors. Scissors cut paper. Paper covers stone.'
        : 'Choose your move, then pass the device when ready.';
  }

  function aiMove() {
    const choices = Object.keys(moves);
    if (state.mode !== 'ai' || $('ai-level').value !== 'hard' || !state.playerHistory.length) {
      return choices[Math.floor(Math.random() * choices.length)];
    }
    // Detect repeated choices and short cycles. Hard AI adapts to the player's
    // recent behaviour, but keeps a little unpredictability so it isn't perfect.
    const recent = state.playerHistory.slice(-6);
    const counts = { stone: 0, paper: 0, scissors: 0 };
    recent.forEach(move => counts[move]++);
    let likely = recent[recent.length - 1];
    for (const move of choices) if (counts[move] > counts[likely]) likely = move;
    const counter = { stone: 'paper', paper: 'scissors', scissors: 'stone' };
    let prediction = likely;
    if (recent.length >= 3 && recent[recent.length - 1] === recent[recent.length - 3]) {
      // If the player is alternating a two-move pattern, anticipate the next.
      prediction = recent[recent.length - 2];
    }
    if (Math.random() < 0.82) return counter[prediction];
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function winner(left, right) {
    if (left === right) return 0;
    return winsAgainst[left] === right ? 1 : 2;
  }

  function playAiMove(leftMove) {
    state.playerHistory.push(leftMove);
    resolveRound(leftMove, aiMove());
  }

  function resolveRound(leftMove, rightMove) {
    state.waiting = true;
    $('move-grid').classList.add('hidden');
    sound()?.swipe?.();
    const result = winner(leftMove, rightMove);
    if (window.DeskStats) window.DeskStats.record('stone-paper-scissors', { inc: { [result === 1 ? 'wins' : result === 2 ? 'losses' : 'draws']: 1 } });
    if (result === 1) {
      state.scores[0]++;
      sound()?.win();
      sound()?.sparkle?.();
      try { window.FX?.burstOn($('game-panel'), { count: 26 }); } catch (_) {}
    } else if (result === 2) {
      state.scores[1]++;
      sound()?.lose();
    } else {
      sound()?.chalk();
      sound()?.clink?.();
    }

    const title = result === 0
      ? 'IT’S A TIE'
      : result === 1
        ? `${state.players[0].name} wins the round`
        : `${state.players[1].name} wins the round`;
    $('round-result').innerHTML =
      `<strong>${title}</strong>` +
      `<div class="sps-choices">` +
        `<div class="sps-choice"><span>${moves[leftMove].emoji}</span><small>${moves[leftMove].label}</small></div>` +
        `<div class="sps-choice"><span>VS</span></div>` +
        `<div class="sps-choice"><span>${moves[rightMove].emoji}</span><small>${moves[rightMove].label}</small></div>` +
      `</div>`;
    $('round-result').classList.remove('hidden');
    updateScoreboard();

    if (state.scores[0] >= state.target || state.scores[1] >= state.target) {
      $('continue-round').textContent = 'VIEW RESULT';
    } else {
      $('continue-round').textContent = 'NEXT ROUND';
    }
    $('continue-round').classList.remove('hidden');
  }

  function showFriendPass() {
    state.waiting = true;
    $('move-grid').classList.add('hidden');
    $('turn-title').textContent = `Pass the device to ${state.players[1].name}`;
    $('turn-description').textContent = `${state.players[1].name}, choose your move secretly.`;
    $('round-result').innerHTML =
      `<strong>${state.players[0].name} has chosen</strong>` +
      `<div class="sps-choices"><div class="sps-choice"><span>🔒</span><small>MOVE HIDDEN</small></div></div>`;
    $('round-result').classList.remove('hidden');
    $('continue-round').textContent = `CHOOSE AS ${state.players[1].name}`;
    $('continue-round').classList.remove('hidden');
  }

  function buildFriendSecondMove() {
    state.waiting = false;
    state.currentVoter = 1;
    $('move-grid').querySelectorAll('button').forEach(item => item.classList.remove('selected'));
    $('round-result').classList.add('hidden');
    $('continue-round').classList.add('hidden');
    $('move-grid').classList.remove('hidden');
    setTurn();
  }

  function finishMatch() {
    const winnerIndex = state.scores[0] >= state.target ? 0 : state.scores[1] >= state.target ? 1 : null;
    if (winnerIndex === null) return;
    showPanel('result-panel');
    $('match-result-title').textContent = `${state.players[winnerIndex].name} wins!`;
    $('match-result-copy').textContent =
      `${state.players[winnerIndex].name} reached ${state.target} points first.`;
    $('final-score').innerHTML =
      `<div><span>${state.players[0].name}</span><strong>${state.scores[0]}</strong></div>` +
      `<div><span>${state.players[1].name}</span><strong>${state.scores[1]}</strong></div>`;
    sound()?.win();
  }

  $('open-ai').addEventListener('click', () => openPlay('setup-ai'));
  $('open-friends').addEventListener('click', () => openPlay('setup-friends'));
  $('open-how').addEventListener('click', () => $('how-dialog').showModal());
  $('back-menu').addEventListener('click', () => {
    window.location.href = 'stone-paper-scissors.html';
  });

  $('ai-name').addEventListener('input', () => {
    $('start-ai').disabled = !$('ai-name').value.trim();
  });
  $('start-ai').addEventListener('click', () => {
    const name = $('ai-name').value.trim();
    if (!name) {
      $('ai-error').textContent = 'Enter your name first.';
      return;
    }
    resetMatch('ai', [{ name, human: true }, { name: 'AI', human: false }],
      Number($('ai-best-of').value));
  });
  $('start-friends').addEventListener('click', () => {
    const name1 = $('friend-name-1').value.trim();
    const name2 = $('friend-name-2').value.trim();
    if (!name1 || !name2) {
      $('friends-error').textContent = 'Enter both player names.';
      return;
    }
    if (name1.toLowerCase() === name2.toLowerCase()) {
      $('friends-error').textContent = 'Use two different names.';
      return;
    }
    resetMatch('friends', [{ name: name1, human: true }, { name: name2, human: true }],
      Number($('best-of').value));
  });

  $('move-grid').addEventListener('click', event => {
    const button = event.target.closest('[data-move]');
    if (!button || state.waiting) return;
    const move = button.dataset.move;
    $('move-grid').querySelectorAll('button').forEach(item => item.classList.remove('selected'));
    button.classList.add('selected');
    if (state.mode === 'ai') {
      state.waiting = true;
      playAiMove(move);
    } else if (state.currentVoter === 0) {
      state.playerOneMove = move;
      showFriendPass();
    } else {
      resolveRound(state.playerOneMove, move);
    }
  });

  $('continue-round').addEventListener('click', () => {
    if (state.mode === 'friends' && state.currentVoter === 0 && state.waiting && state.playerOneMove) {
      buildFriendSecondMove();
      return;
    }
    if (state.scores[0] >= state.target || state.scores[1] >= state.target) {
      finishMatch();
      return;
    }
    state.round++;
    state.currentVoter = 0;
    state.playerOneMove = null;
    updateScoreboard();
    setTurn();
  });

  $('play-again').addEventListener('click', () =>
    openPlay(state.mode === 'ai' ? 'setup-ai' : 'setup-friends'));
  $('exit-game').addEventListener('click', () => {
    window.location.href = 'stone-paper-scissors.html';
  });
})();

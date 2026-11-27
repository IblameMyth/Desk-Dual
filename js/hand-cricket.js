(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const sound = () => window.ClassroomSounds;
  const MAX_OVERS = 6;
  const BALLS_PER_OVER = 6;
  const MAX_BALLS = MAX_OVERS * BALLS_PER_OVER;
  const state = {
    mode: null, difficulty: 'easy', players: [],
    batter: 0, firstBatter: 0, scores: [0, 0], balls: [0, 0], wickets: [0, 0],
    innings: 1, target: null, waiting: false, out: false, inningsComplete: false,
    tossChoice: null, tossNumber: null, friendTossNumber: null,
    friendStep: null, friendBatterNumber: null,
    humanHistory: []
  };

  document.addEventListener('pointerdown', () => sound()?.unlock(), { once: true });
  document.addEventListener('click', event => {
    if (event.target.closest('button, a')) sound()?.tap();
  });

  function fairCoin() {
    if (window.crypto && window.crypto.getRandomValues) {
      const value = new Uint32Array(1);
      window.crypto.getRandomValues(value);
      return (value[0] & 1) === 0 ? 'heads' : 'tails';
    }
    return Math.random() < 0.5 ? 'heads' : 'tails';
  }

  function showPanel(id) {
    ['setup-ai', 'setup-friends', 'toss-panel', 'game-panel', 'result-panel']
      .forEach(panel => {
        const element = $(panel);
        if (element) element.classList.toggle('hidden', panel !== id);
      });
  }

  function openPlay(id) {
    $('main-menu').classList.add('hidden');
    $('play-area').classList.remove('hidden');
    showPanel(id);
  }

  function returnMenu() {
    $('play-area').classList.add('hidden');
    $('main-menu').classList.remove('hidden');
  }

  function numberButtons() {
    return [1, 2, 3, 4, 5, 6].map(number =>
      `<button type="button" data-number="${number}" aria-label="Choose ${number}">${number}</button>`
    ).join('');
  }

  function handSvg(number, team) {
    const dark = team === 'batter' ? '#193b65' : '#6e2121';
    if (window.HandCricketHand) {
      return window.HandCricketHand.svg(number, dark);
    }
    return '';
  }

  function showHands(batterNumber, bowlerNumber, burst = false) {
    $('choice-stage').innerHTML = `
      <div class="hc-hand-stage ${burst ? 'hc-run-burst' : ''}">
        <div class="hc-hand batter">${handSvg(batterNumber, 'batter')}<strong>${batterNumber}</strong><small>${state.players[state.batter].name.toUpperCase()}</small></div>
        <div class="hc-versus">VS</div>
        <div class="hc-hand bowler">${handSvg(bowlerNumber, 'bowler')}<strong>${bowlerNumber}</strong><small>${state.players[1 - state.batter].name.toUpperCase()}</small></div>
      </div>`;
    $('choice-stage').classList.remove('hidden');
  }

  function startAiToss() {
    const name = $('ai-name').value.trim();
    if (!name) {
      $('ai-error').textContent = 'Enter your name first.';
      return;
    }
    state.mode = 'ai';
    state.difficulty = $('ai-level').value;
    state.players = [{ name, human: true }, { name: 'AI', human: false }];
    state.tossChoice = null;
    state.tossNumber = null;
    showTossAi();
  }

  function showTossAi() {
    showPanel('toss-panel');
    $('toss-stage').innerHTML = `
      <div class="hc-toss-card">
        <h2>Coin toss</h2>
        <p class="hc-muted">${state.players[0].name}, call heads or tails.</p>
        <div class="hc-toss-options">
          <button type="button" data-toss-choice="heads">HEADS</button>
          <button type="button" data-toss-choice="tails">TAILS</button>
        </div>
        <div class="hc-coin-wrap">
          <div class="hc-coin" id="toss-coin"><div class="hc-coin-face">2</div></div>
        </div>
        <button class="btn btn-primary hc-start" id="do-toss" type="button" disabled>TOSS COIN</button>
      </div>`;
    $('toss-stage').querySelectorAll('[data-toss-choice]').forEach(button => {
      button.addEventListener('click', () => {
        state.tossChoice = button.dataset.tossChoice;
        $('toss-stage').querySelectorAll('[data-toss-choice]').forEach(item => item.classList.remove('selected'));
        button.classList.add('selected');
        updateAiTossButton();
      });
    });
  }

  function updateAiTossButton() {
    $('do-toss').disabled = !state.tossChoice;
    if (!$('do-toss').dataset.bound) {
      $('do-toss').dataset.bound = 'true';
      $('do-toss').addEventListener('click', resolveAiToss);
    }
  }

  function resolveAiToss() {
    const result = fairCoin();
    const humanWon = state.tossChoice === result;
    const coin = $('toss-coin');
    coin.classList.add('flip');
    coin.querySelector('.hc-coin-face').textContent = result === 'heads' ? 'HEADS' : 'TAILS';
    sound()?.bell();
    setTimeout(() => {
      $('toss-stage').innerHTML = `
        <div class="hc-toss-card">
          <h2>${humanWon ? 'You won the toss!' : 'AI won the toss!'}</h2>
          <p class="hc-muted">The coin shows ${result.toUpperCase()}.</p>
          <div class="hc-choice-actions">
            ${humanWon
              ? '<button type="button" data-first-choice="bat">BAT FIRST</button><button type="button" data-first-choice="bowl">BOWL FIRST</button>'
              : '<button type="button" data-ai-first-choice="start">CONTINUE</button>'}
          </div>
        </div>`;
      if (humanWon) {
        $('toss-stage').querySelectorAll('[data-first-choice]').forEach(button => {
          button.addEventListener('click', () => resetMatch(button.dataset.firstChoice === 'bat' ? 0 : 1));
        });
      } else {
        const aiBats = Math.random() < 0.5;
        $('toss-stage').querySelector('[data-ai-first-choice]').addEventListener('click', () => resetMatch(aiBats ? 1 : 0));
      }
    }, 1150);
  }

  function startFriendsToss() {
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
    state.mode = 'friends';
    state.players = [{ name: name1, human: true }, { name: name2, human: true }];
    state.tossChoice = null;
    state.tossNumber = null;
    state.friendTossNumber = null;
    showFriendsToss();
  }

  function showFriendsToss() {
    showPanel('toss-panel');
    $('toss-stage').innerHTML = `
      <div class="hc-toss-card">
        <h2>${state.players[0].name} calls the toss</h2>
        <p class="hc-muted">Choose heads or tails, then pass for the coin toss.</p>
        <div class="hc-toss-options">
          <button type="button" data-toss-choice="heads">HEADS</button>
          <button type="button" data-toss-choice="tails">TAILS</button>
        </div>
        <button class="btn btn-primary hc-start" id="friend-toss-ready" type="button" disabled>PASS TO ${state.players[1].name}</button>
      </div>`;
    $('toss-stage').querySelectorAll('[data-toss-choice]').forEach(button => {
      button.addEventListener('click', () => {
        state.tossChoice = button.dataset.tossChoice;
        $('toss-stage').querySelectorAll('[data-toss-choice]').forEach(item => item.classList.remove('selected'));
        button.classList.add('selected');
        updateFriendsToss();
      });
    });
  }

  function updateFriendsToss() {
    $('friend-toss-ready').disabled = !state.tossChoice;
    if (!$('friend-toss-ready').dataset.bound) {
      $('friend-toss-ready').dataset.bound = 'true';
      $('friend-toss-ready').addEventListener('click', showFriendsSecondToss);
    }
  }

  function showFriendsSecondToss() {
    $('toss-stage').innerHTML = `
      <div class="hc-toss-card">
        <h2>${state.players[1].name}, toss the coin</h2>
        <p class="hc-muted">Tap the coin to reveal heads or tails.</p>
        <div class="hc-coin-wrap">
          <div class="hc-coin" id="friend-toss-coin"><div class="hc-coin-face">2</div></div>
        </div>
        <button class="btn btn-primary hc-start" id="friend-toss-submit" type="button">TOSS COIN</button>
      </div>`;
    $('friend-toss-submit').addEventListener('click', resolveFriendsToss);
  }

  function resolveFriendsToss() {
    const result = fairCoin();
    const player1Won = state.tossChoice === result;
    const winner = player1Won ? 0 : 1;
    const coin = $('friend-toss-coin');
    coin.classList.add('flip');
    coin.querySelector('.hc-coin-face').textContent = result === 'heads' ? 'HEADS' : 'TAILS';
    sound()?.bell();
    setTimeout(() => {
      $('toss-stage').innerHTML = `
        <div class="hc-toss-card">
          <h2>${state.players[winner].name} won the toss!</h2>
          <p class="hc-muted">The coin shows ${result.toUpperCase()}.</p>
          <div class="hc-choice-actions">
            <button type="button" data-friend-choice="bat">BAT FIRST</button>
            <button type="button" data-friend-choice="bowl">BOWL FIRST</button>
          </div>
        </div>`;
      $('toss-stage').querySelectorAll('[data-friend-choice]').forEach(button => {
        button.addEventListener('click', () => resetMatch(button.dataset.friendChoice === 'bat' ? winner : 1 - winner));
      });
    }, 1150);
  }

  function resetMatch(firstBatter) {
    state.firstBatter = firstBatter;
    state.batter = firstBatter;
    state.scores = [0, 0];
    state.balls = [0, 0];
    state.wickets = [0, 0];
    state.statsSaved = false;
    state.innings = 1;
    state.target = null;
    state.waiting = false;
    state.out = false;
    state.inningsComplete = false;
    state.friendStep = null;
    state.friendBatterNumber = null;
    state.humanHistory = [];
    $('main-menu').classList.add('hidden');
    $('play-area').classList.remove('hidden');
    showPanel('game-panel');
    updateBoard();
    setTurn();
  }

  function updateBoard() {
    if ($('hc-board-date')) {
      const now = new Date();
      $('hc-board-date').textContent =
        `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    $('player-one-label').textContent = state.players[0].name.toUpperCase();
    $('player-two-label').textContent = state.players[1].name.toUpperCase();
    $('player-one-score').textContent = state.scores[0];
    $('player-two-score').textContent = state.scores[1];
    $('player-one-board').classList.toggle('hc-board-batting', state.batter === 0);
    $('player-two-board').classList.toggle('hc-board-batting', state.batter === 1);
    $('innings-label').textContent = state.innings === 1 ? '1ST INNINGS' : '2ND INNINGS';
    const targetText = state.target === null ? 'NO TARGET' : `TARGET ${state.target + 1}`;
    const balls = state.balls[state.batter];
    const overs = `${Math.floor(balls / BALLS_PER_OVER)}.${balls % BALLS_PER_OVER}`;
    $('target-label').textContent =
      `${state.innings === 1 ? '1ST INNINGS' : '2ND INNINGS'} · ${targetText} · ${state.scores[state.batter]}/${state.wickets[state.batter]} · ${overs} OVERS · LAST BALL ${$('bowler-choice').textContent}`;
  }

  function setTurn() {
    state.waiting = false;
    state.friendStep = null;
    state.friendBatterNumber = null;
    $('ball-result').classList.add('hidden');
    $('continue-round').classList.add('hidden');
    $('choice-stage').classList.remove('hidden');

    if (state.mode === 'friends') {
      buildRunChoice(state.batter);
      return;
    }

    if (state.batter === 0) {
      buildRunChoice(0);
    } else {
      const aiNumber = aiBatNumber();
      state.waiting = true;
      $('choice-stage').innerHTML = `
        <div class="hc-toss-card">
          <h2>AI batting</h2>
          <p class="hc-muted">${state.players[0].name}, choose 1–6 as the bowler.</p>
          <div class="hc-number-grid" id="number-grid">${numberButtons()}</div>
        </div>`;
      $('number-grid').addEventListener('click', event => {
        const button = event.target.closest('[data-number]');
        if (button) playAiBowler(Number(button.dataset.number), aiNumber);
      });
    }
  }

  function buildRunChoice(playerIndex) {
    $('turn-title').textContent = `${state.players[playerIndex].name}, choose a run`;
    $('turn-description').textContent =
      state.innings === 1
        ? 'Pick 1–6. If the bowler shows the same number, you are out.'
        : `Chase ${state.target + 1}. If the bowler matches, you are out.`;
    $('choice-stage').innerHTML =
      `<div class="hc-number-grid" id="number-grid">${numberButtons()}</div>`;
    $('number-grid').addEventListener('click', event => {
      const button = event.target.closest('[data-number]');
      if (!button) return;
      const number = Number(button.dataset.number);
      if (state.mode === 'friends') {
        state.friendBatterNumber = number;
        showFriendPass();
      } else {
        state.humanHistory.push(number);
        const bowlerNumber = aiBowlerNumber();
        playDelivery(number, bowlerNumber);
      }
    });
  }

  function showFriendPass() {
    state.waiting = true;
    const bowler = 1 - state.batter;
    $('choice-stage').classList.add('hidden');
    $('ball-result').innerHTML =
      `<strong>Pass the device</strong>${state.players[bowler].name}, hide the batter's choice and choose the bowler number.`;
    $('ball-result').classList.remove('hidden');
    $('continue-round').textContent = `CHOOSE AS ${state.players[bowler].name}`;
    $('continue-round').classList.remove('hidden');
  }

  function buildFriendBowlerChoice() {
    state.waiting = false;
    state.friendStep = 'bowler';
    $('ball-result').classList.add('hidden');
    $('continue-round').classList.add('hidden');
    $('choice-stage').classList.remove('hidden');
    $('turn-title').textContent = `${state.players[1 - state.batter].name}, choose your bowler number`;
    $('turn-description').textContent = 'Keep the batter turn private and choose 1–6.';
    $('choice-stage').innerHTML =
      `<div class="hc-number-grid" id="number-grid">${numberButtons()}</div>`;
    $('number-grid').addEventListener('click', event => {
      const button = event.target.closest('[data-number]');
      if (!button) return;
      playDelivery(state.friendBatterNumber, Number(button.dataset.number));
    });
  }

  function aiBatNumber() {
    if (state.difficulty === 'hard' && state.target !== null) {
      if (state.scores[1] + 6 >= state.target + 1) return 6;
    }
    return 1 + Math.floor(Math.random() * 6);
  }

  function aiBowlerNumber() {
    // Hard mode learns tendencies, but never locks onto one number. Recent
    // choices matter more and a substantial random chance prevents perfect reads.
    if (state.difficulty === 'hard' && state.humanHistory.length >= 2 && Math.random() < 0.48) {
      const weights = [0, 0, 0, 0, 0, 0, 0];
      state.humanHistory.slice(-12).forEach((number, index, recent) => {
        weights[number] += 1 + index / Math.max(1, recent.length - 1);
      });
      const total = weights.slice(1).reduce((sum, weight) => sum + weight, 0);
      let roll = Math.random() * total;
      for (let number = 1; number <= 6; number++) {
        roll -= weights[number];
        if (roll <= 0) return number;
      }
    }
    return 1 + Math.floor(Math.random() * 6);
  }

  function playAiBowler(bowlerNumber, batterNumber) {
    playDelivery(batterNumber, bowlerNumber);
  }

  function playDelivery(batterNumber, bowlerNumber) {
    if (state.inningsComplete) return;
    $('bowler-choice').textContent = bowlerNumber;
    state.balls[state.batter]++;
    const isOut = batterNumber === bowlerNumber;
    if (isOut) {
      state.out = true;
      state.wickets[state.batter] = 1;
      state.waiting = true;
      showHands(batterNumber, bowlerNumber, false);
      updateBoard();
      $('continue-round').textContent = 'END INNINGS';
      $('continue-round').classList.remove('hidden');
      $('turn-title').textContent = 'Wicket!';
      $('turn-description').textContent = 'Both hands showed the same number.';
      $('ball-result').innerHTML =
        `<strong>${batterNumber} vs ${bowlerNumber} · OUT</strong>${state.players[state.batter].name} finished on ${state.scores[state.batter]} runs.`;
      $('ball-result').classList.remove('hidden');
      if (state.scores[state.batter] === 0) sound()?.duck();
      else sound()?.wicket();
      return;
    }

    state.scores[state.batter] += batterNumber;
    $('turn-title').textContent = `+${batterNumber} run${batterNumber === 1 ? '' : 's'}`;
    $('turn-description').textContent =
      `${state.players[state.batter].name} is on ${state.scores[state.batter]} runs.`;
    showHands(batterNumber, bowlerNumber, batterNumber >= 4);
    $('ball-result').innerHTML =
      `<strong>${batterNumber} vs ${bowlerNumber}</strong>${batterNumber >= 4 ? (batterNumber === 6 ? 'SIX!' : 'FOUR!') : 'Different numbers ·'} ${batterNumber} run${batterNumber === 1 ? '' : 's'} added.`;
    $('ball-result').classList.remove('hidden');
    state.waiting = true;

    const chased = state.innings === 2 && state.scores[state.batter] > state.target;
    const oversFinished = state.balls[state.batter] >= MAX_BALLS;
    state.inningsComplete = chased || oversFinished;
    $('continue-round').textContent = chased ? 'MATCH RESULT' : oversFinished ? 'END INNINGS' : 'NEXT BALL';
    $('continue-round').classList.remove('hidden');
    updateBoard();
    if (batterNumber >= 4) sound()?.boundary(batterNumber);
    else sound()?.run(batterNumber);
  }

  function finishInnings() {
    if (state.innings === 1) {
      state.target = state.scores[state.batter];
      state.innings = 2;
      state.batter = 1 - state.firstBatter;
      state.waiting = true;
      state.inningsComplete = false;
      $('choice-stage').classList.add('hidden');
      $('continue-round').textContent = 'START SECOND INNINGS';
      $('continue-round').classList.remove('hidden');
      $('turn-title').textContent = 'Innings complete';
      $('turn-description').textContent =
        `${state.players[state.firstBatter].name} scored ${state.target}. ${state.players[state.batter].name} needs ${state.target + 1} to win.`;
      $('ball-result').innerHTML =
        `<strong>OUT · ${state.target} RUNS</strong>Second innings is ready.`;
      $('ball-result').classList.remove('hidden');
      updateBoard();
    } else {
      finishMatch();
    }
  }

  function finishMatch() {
    const first = state.scores[0];
    const second = state.scores[1];
    if (!state.statsSaved && window.DeskStats) {
      state.statsSaved = true;
      window.DeskStats.record('hand-cricket', { inc: { runs: first, wickets: state.wickets[1] }, max: { highScore: first } });
    }
    const title = first === second
      ? 'Match tied!'
      : first > second ? `${state.players[0].name} wins!` : `${state.players[1].name} wins!`;
    showPanel('result-panel');
    $('match-result-title').textContent = title;
    $('match-result-copy').textContent = first === second
      ? 'Perfect finish. Great classroom cricket!'
      : 'The chase is complete.';
    $('final-score').innerHTML =
      `<div><span>🏏 ${state.players[0].name}</span><strong>${first}</strong><small>RUNS</small></div>` +
      `<div><span>🏏 ${state.players[1].name}</span><strong>${second}</strong><small>RUNS</small></div>`;
    first === second ? sound()?.bell() : sound()?.win();
  }

  $('open-ai').addEventListener('click', () => openPlay('setup-ai'));
  $('open-friends').addEventListener('click', () => openPlay('setup-friends'));
  $('open-how').addEventListener('click', () => $('how-dialog').showModal());
  $('back-menu').addEventListener('click', returnMenu);
  $('ai-name').addEventListener('input', () => {
    $('start-ai').disabled = !$('ai-name').value.trim();
  });
  $('start-ai').addEventListener('click', startAiToss);
  $('start-friends').addEventListener('click', startFriendsToss);

  $('continue-round').addEventListener('click', () => {
    if (state.mode === 'friends' && state.friendStep !== 'bowler' && state.waiting && !state.out) {
      buildFriendBowlerChoice();
      return;
    }
    if (state.out) {
      state.out = false;
      state.inningsComplete = true;
      if (state.innings === 1) finishInnings();
      else finishMatch();
      return;
    }
    if (state.inningsComplete) {
      if (state.innings === 1) finishInnings();
      else finishMatch();
      return;
    }
    if (state.innings === 2 && state.waiting) {
      setTurn();
      return;
    }
    setTurn();
  });

  $('play-again').addEventListener('click', () =>
    openPlay(state.mode === 'ai' ? 'setup-ai' : 'setup-friends'));
  $('exit-game').addEventListener('click', returnMenu);
})();

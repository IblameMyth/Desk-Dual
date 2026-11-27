/* My Stats: shows ONLY the signed-in player's own numbers (users/{uid}/games/*).
   A new account has no documents yet, so everything shows 0. */
import { onUser, getGameStats } from './cloud.js';

const n = (v) => Number(v) || 0;
const pct = (a, b) => (n(b) ? Math.round((n(a) / n(b)) * 100) : 0) + '%';

const GAMES = [
  ['penfight', '🖊️ Pen Fight', (d) => [['Pens unlocked', Array.isArray(d.pensUnlocked) ? d.pensUnlocked.length : 0], ['Level', n(d.level)], ['Wins', n(d.wins)], ['Losses', n(d.losses)]]],
  ['raja-rani', '👑 Raja Rani Chor Sipahi', (d) => [['Rounds', n(d.rounds)], ['Last role', d.lastRole || '—'], ['Wins', n(d.wins)]]],
  ['hand-cricket', '🏏 Hand Cricket', (d) => [['Runs', n(d.runs)], ['Wickets', n(d.wickets)], ['Highest score', n(d.highScore)]]],
  ['behrupiye-ko-pakdo', '🕵️ Behrupiye Ko Pakdo', (d) => [['Correct guesses', n(d.correctGuesses)], ['Rounds', n(d.rounds)], ['Wins', n(d.wins)]]],
  ['stone-paper-scissors', '✊ Stone Paper Scissors', (d) => [['Wins', n(d.wins)], ['Losses', n(d.losses)], ['Draws', n(d.draws)]]],
  ['ashta-chamma', '🎲 Ashta Chamma', (d) => [['Wins', n(d.wins)], ['Tokens', n(d.tokens)], ['Completed matches', n(d.completedMatches)]]],
  ['chidiya-udd', '🐦 Chidiya Udd', (d) => [['Score', n(d.score)], ['High score', n(d.highScore)]]],
  ['chop-sticks', '🥢 Chop Sticks', (d) => [['Wins', n(d.wins)], ['Losses', n(d.losses)]]],
  ['battleship', '🚢 Battleship', (d) => [['Wins', n(d.wins)], ['Losses', n(d.losses)], ['Ships destroyed', n(d.shipsDestroyed)]]],
  ['pencil-tower', '✏️ Pencil-Box Tower', (d) => [['Highest tower', n(d.highestTower)], ['Score', n(d.score)]]],
  ['bottle-flip', '🍾 Bottle Flip', (d) => [['Successful flips', n(d.successfulFlips)], ['Best streak', n(d.bestStreak)]]],
  ['npat', '📝 Name Place Animal Thing', (d) => [['Score', n(d.score)], ['Rounds', n(d.rounds)], ['Accuracy', pct(d.validAnswers, d.totalAnswers)]]]
];

const grid = document.getElementById('stats-grid');
const owner = document.getElementById('stats-owner');

function card(title, rows) {
  const art = document.createElement('article');
  art.className = 'stats-card';
  const h = document.createElement('h2');
  h.textContent = title;
  const dl = document.createElement('dl');
  for (const [label, value] of rows) {
    const row = document.createElement('div');
    row.className = 'stats-row';
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd'); dd.textContent = String(value);
    row.append(dt, dd);
    dl.appendChild(row);
  }
  art.append(h, dl);
  return art;
}

let shownFor = null;
onUser(async (user) => {
  if (!user || shownFor === user.uid) return;
  shownFor = user.uid;
  owner.textContent = `Report card of ${user.displayName || 'Player'} — only you can see this.`;
  let stats = {};
  try { stats = await getGameStats(); } catch (_) { owner.textContent += ' (Could not load saved stats right now.)'; }
  grid.replaceChildren(...GAMES.map(([id, title, rows]) => card(title, rows(stats[id] || {}))));
});

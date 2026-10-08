// Data-driven pen collection and 10-level AI ladder.
export const PENS = [
  { id: 'pen1', level: 1, name: 'Ball Pen', asset: './assets/pens/pen1.png', value: 1, strength: 0.92 },
  { id: 'pen2', level: 2, name: 'Pentonic', asset: './assets/pens/pen2.png', value: 2, strength: 0.96 },
  { id: 'pen3', level: 3, name: 'Writometer', asset: './assets/pens/pen3.png', value: 3, strength: 1.00 },
  { id: 'pen4', level: 4, name: 'V5', asset: './assets/pens/pen4.png', value: 4, strength: 1.04 },
  { id: 'pen5', level: 5, name: 'V7', asset: './assets/pens/pen5.png', value: 5, strength: 1.08 },
  { id: 'pen6', level: 6, name: 'Uni-ball', asset: './assets/pens/pen6.png', value: 6, strength: 1.12 },
  { id: 'pen7', level: 7, name: 'Reynolds Trimax', asset: './assets/pens/pen7.png', value: 7, strength: 1.16 },
  { id: 'pen8', level: 8, name: 'Fountain Pen', asset: './assets/pens/pen8.png', value: 8, strength: 1.20 },
  { id: 'pen9', level: 9, name: 'Reynolds Trimax Gold', asset: './assets/pens/pen9.png', value: 9, strength: 1.24 },
  { id: 'pen10', level: 10, name: 'Classic Gold', asset: './assets/pens/pen10.png', value: 10, strength: 1.28 },
];

export const AI_LEVELS = [
  { level: 1, name: 'Aarav', penId: 'pen1', errorDeg: 22, powerMin: .35, powerMax: .68, edgeAwareness: .10, think: [650, 1100] },
  { level: 2, name: 'Vihaan', penId: 'pen2', errorDeg: 18, powerMin: .40, powerMax: .72, edgeAwareness: .18, think: [620, 1050] },
  { level: 3, name: 'Arjun', penId: 'pen3', errorDeg: 15, powerMin: .43, powerMax: .76, edgeAwareness: .25, think: [590, 1000] },
  { level: 4, name: 'Kabir', penId: 'pen4', errorDeg: 12, powerMin: .46, powerMax: .79, edgeAwareness: .32, think: [560, 950] },
  { level: 5, name: 'Rohan', penId: 'pen5', errorDeg: 10, powerMin: .48, powerMax: .81, edgeAwareness: .40, think: [540, 900] },
  { level: 6, name: 'Aditya', penId: 'pen6', errorDeg: 8, powerMin: .50, powerMax: .84, edgeAwareness: .48, think: [520, 860] },
  { level: 7, name: 'Ishaan', penId: 'pen7', errorDeg: 6.5, powerMin: .52, powerMax: .86, edgeAwareness: .56, think: [500, 820] },
  { level: 8, name: 'Dev', penId: 'pen8', errorDeg: 5, powerMin: .54, powerMax: .88, edgeAwareness: .64, think: [480, 780] },
  { level: 9, name: 'Krish', penId: 'pen9', errorDeg: 3.8, powerMin: .56, powerMax: .91, edgeAwareness: .73, think: [460, 750] },
  { level: 10, name: 'Vedant', penId: 'pen10', errorDeg: 2.8, powerMin: .58, powerMax: .94, edgeAwareness: .82, think: [440, 720] },
];

export const STARTER = { id: 'starter', name: 'Starter Pencil', asset: './assets/user-pencil.png', value: 0, strength: 0.88 };
export const PEN_BY_ID = Object.fromEntries(PENS.map(p => [p.id, p]));
export const AI_BY_LEVEL = Object.fromEntries(AI_LEVELS.map(l => [l.level, l]));

const KEY = 'deskDuelProgressV1';
const DEFAULT = { unlockedLevel: 1, owned: [], equipped: 'starter' };

export function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
    return { ...DEFAULT, ...(parsed || {}), owned: Array.isArray(parsed?.owned) ? parsed.owned : [] };
  } catch { return { ...DEFAULT, owned: [] }; }
}

export function saveProgress(progress) {
  localStorage.setItem(KEY, JSON.stringify(progress));
  return progress;
}

export function completeLevel(level) {
  const p = loadProgress();
  const ai = AI_BY_LEVEL[level];
  if (!ai) return p;
  if (!p.owned.includes(ai.penId)) p.owned.push(ai.penId);
  p.unlockedLevel = Math.max(p.unlockedLevel, Math.min(10, level + 1));
  p.equipped = ai.penId;
  return saveProgress(p);
}

export function equipPen(id) {
  const p = loadProgress();
  if (id === 'starter' || p.owned.includes(id)) {
    p.equipped = id;
    saveProgress(p);
  }
  return p;
}

export function resetProgress() {
  return saveProgress({ ...DEFAULT, owned: [] });
}

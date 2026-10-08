/* Sound effects generated with the Web Audio API (no audio files, nothing copyrighted). */
import { settings } from './settings.js';

let ctx = null;
let master = null;
let noiseBuf = null;
let slideGain = null;

function ensure() {
  if (!settings.sound) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq, freq2, dur, type = 'sine', vol = 0.2, delay = 0 }) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (freq2) o.frequency.exponentialRampToValueAtTime(freq2, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.03);
}

function noise({ dur, vol, freq, delay = 0 }) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.03);
}

export const audio = {
  /** Call from a user gesture so mobile browsers allow audio. */
  unlock() {
    ensure();
  },
  click() {
    tone({ freq: 720, freq2: 420, dur: 0.07, type: 'square', vol: 0.09 });
  },
  flick(power) {
    noise({ dur: 0.09, vol: 0.2 + power * 0.3, freq: 1800 + power * 1500 });
    tone({ freq: 320 + power * 280, freq2: 140, dur: 0.11, type: 'triangle', vol: 0.15 + power * 0.12 });
  },
  hit(speed) {
    const s = Math.min(speed / 18, 1);
    tone({ freq: 950, freq2: 300, dur: 0.09, type: 'square', vol: 0.06 + s * 0.16 });
    noise({ dur: 0.05, vol: 0.12 + s * 0.2, freq: 3000 });
  },
  fall() {
    tone({ freq: 620, freq2: 80, dur: 0.55, type: 'sine', vol: 0.22 });
  },
  roundWin() {
    [523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.18, type: 'triangle', vol: 0.2, delay: i * 0.1 }));
  },
  matchWin() {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.22, delay: i * 0.13 }));
  },
  /** Quiet scratchy loop whose volume follows the pen speed (level 0..1). */
  slide(level) {
    if (!ctx) return;
    if (!slideGain) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900;
      slideGain = ctx.createGain();
      slideGain.gain.value = 0;
      src.connect(f).connect(slideGain).connect(master);
      src.start();
    }
    slideGain.gain.setTargetAtTime(settings.sound ? level * 0.05 : 0, ctx.currentTime, 0.06);
  },
};

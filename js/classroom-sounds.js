(function () {
  'use strict';

  let context = null;
  let master = null;
  let noiseBuffer = null;

  function soundEnabled() {
    try {
      const stored = JSON.parse(localStorage.getItem('deskduel.settings.v1') || '{}');
      return stored.sound !== false;
    } catch (_) {
      return true;
    }
  }

  function ensure() {
    if (!soundEnabled()) return null;
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.35;
      master.connect(context.destination);
      noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function tone(frequency, duration, options = {}) {
    const ctx = ensure();
    if (!ctx) return;
    const start = ctx.currentTime + (options.delay || 0);
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = options.type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    if (options.frequencyTo) {
      oscillator.frequency.exponentialRampToValueAtTime(options.frequencyTo, start + duration);
    }
    gain.gain.setValueAtTime(options.volume || 0.12, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  function noise(duration, frequency, volume = 0.08, delay = 0) {
    const ctx = ensure();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(filter).connect(gain).connect(master);
    source.start(start);
    source.stop(start + duration + 0.03);
  }

  const classroom = {
    unlock() {
      ensure();
    },
    tap() {
      tone(620, 0.055, { type: 'triangle', volume: 0.08, frequencyTo: 480 });
    },
    chalk() {
      noise(0.11, 1300, 0.045);
      tone(340, 0.09, { type: 'triangle', volume: 0.025 });
    },
    bell() {
      tone(880, 0.38, { type: 'sine', volume: 0.16, frequencyTo: 660 });
      tone(1320, 0.28, { type: 'triangle', volume: 0.07, delay: 0.04, frequencyTo: 990 });
      noise(0.06, 2400, 0.025);
    },
    reveal() {
      tone(420, 0.12, { type: 'triangle', volume: 0.11, frequencyTo: 840 });
      tone(840, 0.16, { type: 'sine', volume: 0.08, delay: 0.12, frequencyTo: 620 });
    },
    vote() {
      tone(520, 0.08, { type: 'square', volume: 0.055, frequencyTo: 390 });
      noise(0.035, 1800, 0.025, 0.06);
    },
    page() {
      noise(0.09, 1800, 0.025);
      tone(270, 0.07, { type: 'triangle', volume: 0.04, frequencyTo: 220 });
    },
    win() {
      [523, 659, 784, 1047].forEach((frequency, index) => {
        tone(frequency, 0.24, {
          type: 'triangle',
          volume: 0.16,
          delay: index * 0.11
        });
      });
      tone(1310, 0.32, { type: 'sine', volume: 0.08, delay: 0.46 });
    },
    boundary(runs) {
      [523, 659, 784].forEach((frequency, index) =>
        tone(frequency, 0.18, { type: 'triangle', volume: runs === 6 ? 0.22 : 0.16, delay: index * 0.09 }));
      noise(runs === 6 ? 0.28 : 0.18, 2200, runs === 6 ? 0.12 : 0.07);
    },
    wicket() {
      noise(0.36, 900, 0.13);
      tone(180, 0.32, { type: 'square', volume: 0.12, frequencyTo: 90 });
      [392, 523, 392, 659].forEach((frequency, index) =>
        tone(frequency, 0.18, { type: 'triangle', volume: 0.14, delay: 0.18 + index * 0.1 }));
    },
    duck() {
      tone(260, 0.16, { type: 'triangle', volume: 0.12, frequencyTo: 190 });
      tone(190, 0.22, { type: 'square', volume: 0.08, delay: 0.14, frequencyTo: 120 });
      noise(0.18, 800, 0.05, 0.32);
    },
    run(runs) {
      tone(620, 0.07, { type: 'triangle', volume: 0.08, frequencyTo: runs >= 3 ? 820 : 520 });
    },
    lose() {
      tone(440, 0.24, { type: 'triangle', volume: 0.13, frequencyTo: 330 });
      tone(330, 0.32, { type: 'triangle', volume: 0.11, delay: 0.18, frequencyTo: 180 });
    },
    desk() {
      noise(0.09, 900, 0.14);
      tone(150, 0.12, { type: 'sine', volume: 0.12, frequencyTo: 80 });
    }
  };

  window.ClassroomSounds = classroom;
})();

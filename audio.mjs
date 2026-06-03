// Cute, lightweight sound effects synthesized with the Web Audio API.
// No audio files (no licensing / no network); fully tunable.

let ctx = null;
function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Gentle airy "puff" — filtered noise swell + a soft rising tone (inflation).
export function playBlow() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const dur = 0.42;

  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = c.createBufferSource();
  noise.buffer = buf;

  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.7;
  bp.frequency.setValueAtTime(480, t);
  bp.frequency.exponentialRampToValueAtTime(1500, t + dur * 0.55);
  bp.frequency.exponentialRampToValueAtTime(720, t + dur);

  const ng = c.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.2, t + 0.13); // swell in
  ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  noise.connect(bp).connect(ng).connect(c.destination);
  noise.start(t);
  noise.stop(t + dur);

  // soft rising tone to suggest the bubble filling
  const o = c.createOscillator();
  const og = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(240, t);
  o.frequency.exponentialRampToValueAtTime(440, t + dur * 0.8);
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.05, t + 0.16);
  og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(og).connect(c.destination);
  o.start(t);
  o.stop(t + dur);
}

// "Switch 清脆 Pip" — a clean rising sine pip + a tiny high click transient.
export function playPop() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;

  // clean rising sine: 520 -> 900 Hz
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(520, t);
  o.frequency.exponentialRampToValueAtTime(900, t + 0.108);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.45, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.14);

  // crisp high click transient
  const len = Math.floor(c.sampleRate * 0.014);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const noise = c.createBufferSource();
  noise.buffer = buf;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2200;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.12, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.014);
  noise.connect(hp).connect(ng).connect(c.destination);
  noise.start(t);
  noise.stop(t + 0.014);
}

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

// "Thin straw blow" — a short, realistic exhale: two filtered-noise breath
// layers shaped like a quick puff through a straw (no tones, no sparkle).
export function playBlow() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;

  const breath = (dur, peak, f0, f1, f2, q, lp) => {
    const len = Math.floor(c.sampleRate * (dur + 0.05));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const ns = c.createBufferSource();
    ns.buffer = buf;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 180;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.linearRampToValueAtTime(f1, t + dur * 0.5);
    bp.frequency.linearRampToValueAtTime(f2, t + dur);
    const lpf = c.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = lp;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + dur * 0.42);       // build airflow
    g.gain.linearRampToValueAtTime(peak * 0.82, t + dur * 0.72); // steady
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);       // taper
    ns.connect(hp).connect(bp).connect(lpf).connect(g).connect(c.destination);
    ns.start(t);
    ns.stop(t + dur + 0.05);
  };

  // shortened straw blow: focused airflow + a softer low body
  breath(0.36, 0.42, 700, 1150, 820, 1.4, 3200);
  breath(0.32, 0.14, 420, 520, 440, 0.7, 2200);
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

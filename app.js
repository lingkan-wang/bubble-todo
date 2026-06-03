// Web build of the bubble to-do for the portfolio frame.
// Same interactions as the desktop app, minus Electron-only bits (click-through,
// file persistence, quit). State is in-memory and reseeded on each load so the
// frame always looks alive for visitors.
import * as store from './store.mjs';
import * as layout from './layout.mjs';
import * as sfx from './audio.mjs';

const girlWrap = document.getElementById('girl-wrap');
const girlImg = document.getElementById('girl');
const attached = document.getElementById('attached-bubble');
const attachedText = attached.querySelector('.bubble-text');
const parkedLayer = document.getElementById('parked-layer');
const flyLayer = document.getElementById('fly-layer');
const hint = document.getElementById('hint');

const DRAG_THRESHOLD = 6;
const PARKED_SIZE = 60;            // smaller bubbles to fit the frame
const BUBBLE_OPTS = { min: 80, max: 150, per: 4.5 };
const parkedOpts = () => ({ originX: 18, originY: 56, cols: 3, gap: PARKED_SIZE + 12 });
function bubbleSizeFor(len) { return layout.bubbleSize(len, BUBBLE_OPTS); }
function newId() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

let state = store.initialState();
const scheduleSave = () => {}; // demo: no persistence

let hinted = false;
function fadeHint() { if (!hinted) { hinted = true; hint.classList.add('hidden'); } }

// ---- girl positioning ------------------------------------------------------
function girlBox() {
  const r = girlWrap.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}
function placeGirl() {
  if (state.girl.x != null && state.girl.y != null) {
    girlWrap.style.left = state.girl.x + 'px';
    girlWrap.style.top = state.girl.y + 'px';
    girlWrap.style.right = 'auto';
    girlWrap.style.bottom = 'auto';
  }
}

// ---- attached bubble -------------------------------------------------------
function positionAttachedBubble() {
  const size = bubbleSizeFor(state.draft.length);
  const box = girlBox();
  const tip = layout.strawTipPx(box);
  const cx = tip.x - size * 0.30;
  const cy = tip.y - size * 0.42;
  attached.style.width = size + 'px';
  attached.style.height = size + 'px';
  attached.style.left = (cx - size / 2) + 'px';
  attached.style.top = (cy - size / 2) + 'px';
}
function renderAttached() {
  if (attachedText.textContent !== state.draft) attachedText.textContent = state.draft;
  positionAttachedBubble();
}

// ---- editing ---------------------------------------------------------------
function beginEdit() {
  attachedText.setAttribute('contenteditable', 'true');
  attachedText.focus();
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(attachedText);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}
attached.addEventListener('click', beginEdit);
attachedText.addEventListener('input', () => {
  state = store.withDraft(state, attachedText.textContent);
  positionAttachedBubble();
});
attachedText.addEventListener('blur', () => attachedText.setAttribute('contenteditable', 'false'));

// ---- girl gesture: drag (clamped to frame) + double-click to blow ----------
let press = null;
let blowing = false;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function onGirlPointerDown(e) {
  if (e.button !== 0) return;
  const box = girlBox();
  press = { startX: e.clientX, startY: e.clientY, offX: e.clientX - box.x, offY: e.clientY - box.y, dragging: false };
  try { girlImg.setPointerCapture(e.pointerId); } catch { /* ignore */ }
}
function onGirlPointerMove(e) {
  if (!press) return;
  if (!press.dragging && Math.hypot(e.clientX - press.startX, e.clientY - press.startY) > DRAG_THRESHOLD) {
    press.dragging = true;
    girlWrap.classList.add('dragging');
  }
  if (press.dragging) {
    const box = girlBox();
    const nx = clamp(e.clientX - press.offX, 0, window.innerWidth - box.w);
    const ny = clamp(e.clientY - press.offY, 0, window.innerHeight - box.h);
    girlWrap.style.left = nx + 'px';
    girlWrap.style.top = ny + 'px';
    girlWrap.style.right = 'auto';
    girlWrap.style.bottom = 'auto';
    positionAttachedBubble();
  }
}
function onGirlPointerUp() {
  if (!press) return;
  if (press.dragging) {
    const box = girlBox();
    state = store.moveGirl(state, box.x, box.y);
  }
  cancelPress();
}
function cancelPress() {
  if (!press) return;
  girlWrap.classList.remove('dragging');
  press = null;
}
function shakeEmptyBubble() {
  attached.classList.remove('shake');
  void attached.offsetWidth;
  attached.classList.add('shake');
}

function onGirlDblClick() {
  if (blowing) return;
  if (!state.draft.trim()) { shakeEmptyBubble(); return; }
  blowing = true;
  fadeHint();
  sfx.playBlow();

  girlImg.classList.remove('blowing'); void girlImg.offsetWidth; girlImg.classList.add('blowing');
  attached.classList.remove('inflate'); void attached.offsetWidth; attached.classList.add('inflate');

  setTimeout(() => { blow(); attached.classList.remove('inflate'); blowing = false; }, 340);
  setTimeout(() => girlImg.classList.remove('blowing'), 620);
}

girlImg.addEventListener('pointerdown', onGirlPointerDown);
girlImg.addEventListener('pointermove', onGirlPointerMove);
girlImg.addEventListener('pointerup', onGirlPointerUp);
girlImg.addEventListener('pointercancel', cancelPress);
girlImg.addEventListener('dblclick', onGirlDblClick);

// ---- blow → fly → re-blow --------------------------------------------------
function blow() {
  const text = state.draft.trim();
  if (!text) return;
  const size = bubbleSizeFor(text.length);
  const box = girlBox();
  const tip = layout.strawTipPx(box);
  const fromCx = tip.x - size * 0.30;
  const fromCy = tip.y - size * 0.42;

  const index = state.todos.length;
  const target = layout.parkedTarget(index, parkedOpts());
  const id = newId();
  state = store.addTodo(state, id, { x: target.x, y: target.y, createdAt: Date.now() });

  flyBubble(fromCx, fromCy, size, target.x + PARKED_SIZE / 2, target.y + PARKED_SIZE / 2, renderParked);

  attachedText.textContent = '';
  positionAttachedBubble();
  attached.classList.remove('reblow'); void attached.offsetWidth; attached.classList.add('reblow');
}

function flyBubble(fromCx, fromCy, size, toCx, toCy, onDone) {
  const clone = document.createElement('div');
  clone.className = 'fly-bubble';
  clone.style.width = size + 'px';
  clone.style.height = size + 'px';
  clone.style.left = (fromCx - size / 2) + 'px';
  clone.style.top = (fromCy - size / 2) + 'px';
  flyLayer.appendChild(clone);

  const dx = toCx - fromCx, dy = toCy - fromCy;
  const midX = dx * 0.5 - Math.abs(dy) * 0.18;
  const midY = dy * 0.5 - 40;
  const endScale = PARKED_SIZE / size;
  const anim = clone.animate(
    [
      { transform: 'translate(0px,0px) scale(1)', opacity: 1 },
      { transform: `translate(${midX}px, ${midY}px) scale(${(1 + endScale) / 2})`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(${endScale})`, opacity: 1 }
    ],
    { duration: 850, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'forwards' }
  );
  anim.onfinish = () => { clone.remove(); if (onDone) onDone(); };
}

// ---- parked cluster --------------------------------------------------------
function renderParked() {
  parkedLayer.innerHTML = '';
  for (const todo of state.todos) parkedLayer.appendChild(buildParked(todo));
}
function buildParked(todo) {
  const el = document.createElement('div');
  el.className = 'parked floating';
  el.dataset.id = todo.id;
  el.style.width = PARKED_SIZE + 'px';
  el.style.height = PARKED_SIZE + 'px';
  el.style.left = todo.x + 'px';
  el.style.top = todo.y + 'px';
  el.style.setProperty('--fx', (3 + Math.random() * 5).toFixed(1) + 'px');
  el.style.setProperty('--fy', (-5 - Math.random() * 6).toFixed(1) + 'px');
  el.style.setProperty('--rot', (Math.random() * 6 - 3).toFixed(1) + 'deg');
  el.style.setProperty('--dur', (4.5 + Math.random() * 2.5).toFixed(1) + 's');
  el.style.setProperty('--delay', (-Math.random() * 4).toFixed(1) + 's');

  const bg = document.createElement('div'); bg.className = 'pbg';
  const txt = document.createElement('div'); txt.className = 'ptext'; txt.textContent = todo.text;
  el.append(bg, txt);

  attachParkedExpand(el, todo.text);
  attachParkedDrag(el, todo.id);
  attachParkedComplete(el, todo.id);
  return el;
}

function expandedParkedSize(len) { return Math.round(Math.max(110, Math.min(190, 60 + len * 5))); }
function attachParkedExpand(el, text) {
  const big = expandedParkedSize(text.length);
  el.addEventListener('mouseenter', () => {
    if (el.classList.contains('dragging')) return;
    el.style.width = big + 'px'; el.style.height = big + 'px';
    el.classList.remove('floating'); el.classList.add('expanded');
  });
  el.addEventListener('mouseleave', () => collapseParked(el));
}
function collapseParked(el) {
  el.style.width = PARKED_SIZE + 'px'; el.style.height = PARKED_SIZE + 'px';
  el.classList.remove('expanded'); el.classList.add('floating');
}

function attachParkedDrag(el, id) {
  let drag = null;
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    el.style.width = PARKED_SIZE + 'px'; el.style.height = PARKED_SIZE + 'px'; el.classList.remove('expanded');
    const r = el.getBoundingClientRect();
    drag = { startX: e.clientX, startY: e.clientY, offX: e.clientX - r.left, offY: e.clientY - r.top, moved: false };
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > DRAG_THRESHOLD) {
      drag.moved = true; el.classList.remove('floating'); el.classList.add('dragging');
    }
    if (drag.moved) {
      el.style.left = clamp(e.clientX - drag.offX, 0, window.innerWidth - PARKED_SIZE) + 'px';
      el.style.top = clamp(e.clientY - drag.offY, 0, window.innerHeight - PARKED_SIZE) + 'px';
    }
  });
  el.addEventListener('pointerup', () => {
    if (!drag) return;
    if (drag.moved) {
      state = store.moveTodo(state, id, parseFloat(el.style.left), parseFloat(el.style.top));
      el.classList.remove('dragging'); el.classList.add('floating');
      el._suppressClick = true; setTimeout(() => { el._suppressClick = false; }, 0);
    }
    drag = null;
  });
  el.addEventListener('pointercancel', () => { drag = null; });
}

function attachParkedComplete(el, id) {
  el.addEventListener('click', () => {
    if (el._suppressClick) return;
    popBubble(el, id);
  });
}
function popBubble(el, id) {
  fadeHint();
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2, radius = r.width / 2;
  el.classList.remove('floating'); el.style.pointerEvents = 'none';
  sfx.playPop();
  burstRing(cx, cy, radius);
  spawnDroplets(cx, cy, radius);
  const anim = el.animate(
    [ { transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.08)', opacity: 1, offset: 0.3 }, { transform: 'scale(1.13)', opacity: 0 } ],
    { duration: 190, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' }
  );
  let done = false;
  const finalize = () => { if (done) return; done = true; el.remove(); state = store.removeTodo(state, id); };
  anim.onfinish = finalize;
  setTimeout(finalize, 300);
}
function burstRing(cx, cy, radius) {
  const ring = document.createElement('div'); ring.className = 'burst-ring';
  const d = radius * 2;
  ring.style.width = d + 'px'; ring.style.height = d + 'px';
  ring.style.left = (cx - radius) + 'px'; ring.style.top = (cy - radius) + 'px';
  flyLayer.appendChild(ring);
  const a = ring.animate([ { transform: 'scale(0.78)', opacity: 0.65 }, { transform: 'scale(1.4)', opacity: 0 } ], { duration: 300, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
  a.onfinish = () => ring.remove();
}
function spawnDroplets(cx, cy, radius) {
  const n = 14;
  for (let i = 0; i < n; i++) {
    const ang = (Math.PI * 2 * i) / n + (Math.random() * 0.4 - 0.2);
    const startR = radius * (0.72 + Math.random() * 0.18);
    const sx = cx + Math.cos(ang) * startR, sy = cy + Math.sin(ang) * startR;
    const sz = 2.5 + Math.random() * 5;
    const d = document.createElement('div'); d.className = 'droplet';
    d.style.width = sz + 'px'; d.style.height = sz + 'px';
    d.style.left = (sx - sz / 2) + 'px'; d.style.top = (sy - sz / 2) + 'px';
    flyLayer.appendChild(d);
    const dist = 10 + Math.random() * 22;
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist + (12 + Math.random() * 20);
    const a = d.animate([ { transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, opacity: 0 } ], { duration: 360 + Math.random() * 240, easing: 'cubic-bezier(.25,.6,.35,1)', fill: 'forwards' });
    a.onfinish = () => d.remove();
  }
}

// ---- init: seed a couple of example to-dos so the frame looks alive --------
function seed() {
  let s = store.initialState();
  const samples = ['Call Mom', 'Water the plants 🌿'];
  const opts = parkedOpts();
  samples.forEach((text, i) => {
    const t = layout.parkedTarget(i, opts);
    s = store.addTodo(store.withDraft(s, text), 't_seed' + i, { x: t.x, y: t.y, createdAt: i });
  });
  return s;
}
state = seed();
placeGirl();
renderAttached();
renderParked();

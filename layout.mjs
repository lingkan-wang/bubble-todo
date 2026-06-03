// Pure geometry. Fractions/sizes are tunable defaults; tune against real assets at runtime.

// Straw mouthpiece tip as a fraction of the girl image box (top-left area, she blows up-left).
export const STRAW_TIP = { fx: 0.05, fy: 0.13 };

export function strawTipPx(box) {
  return { x: box.x + box.w * STRAW_TIP.fx, y: box.y + box.h * STRAW_TIP.fy };
}

// Bubble diameter (px) grows with character count, clamped.
export function bubbleSize(textLen, opts = {}) {
  const min = opts.min ?? 120;
  const max = opts.max ?? 260;
  const per = opts.per ?? 6;
  return Math.max(min, Math.min(max, min + textLen * per));
}

// Target landing point for the index-th parked bubble, a loose grid near top-left.
export function parkedTarget(index, opts = {}) {
  const originX = opts.originX ?? 60;
  const originY = opts.originY ?? 60;
  const cols = opts.cols ?? 3;
  const gap = opts.gap ?? 110;
  const col = index % cols;
  const row = Math.floor(index / cols);
  const stagger = (row % 2) * (gap / 2); // organic offset on alternate rows
  return { x: originX + col * gap + stagger, y: originY + row * gap };
}

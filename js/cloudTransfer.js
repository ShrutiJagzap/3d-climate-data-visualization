// js/cloudTransfer.js
export function cloudTransfer(cloudValue) {
  if (cloudValue === undefined || cloudValue === null || Number.isNaN(cloudValue)) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  // Your backend cloud can be 0..1 or 0..100
  let c = cloudValue;

  // if 0..100 -> normalize to 0..1
  if (c > 1.5) c = c / 100;

  c = clamp01(c);

  // white clouds, alpha depends on density
  const r = 1.0;
  const g = 1.0;
  const b = 1.0;

  // show only meaningful clouds
  const a = c < 0.05 ? 0.0 : (0.15 + 0.85 * c);

  return { r, g, b, a };
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

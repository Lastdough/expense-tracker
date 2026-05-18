// Hex-colour helpers ported from `docs/design/Claude Design v2.0.html`.
// Used by ChipPicker to compute a "halo" border on the selected chip that
// reads against both the chip and the paper background.

function clampHex(hex: string): string {
  const h = (hex || '#000000').replace('#', '');
  return h.length === 6 ? h : '000000';
}

function toRgb(hex: string): { r: number; g: number; b: number } {
  const h = clampHex(hex);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function fromRgb(r: number, g: number, b: number): string {
  const to2 = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + to2(r) + to2(g) + to2(b);
}

export function darkenHex(hex: string, amt = 0.18): string {
  const { r, g, b } = toRgb(hex);
  const f = (v: number) => v * (1 - amt);
  return fromRgb(f(r), f(g), f(b));
}

export function lightenHex(hex: string, amt = 0.35): string {
  const { r, g, b } = toRgb(hex);
  const f = (v: number) => v + (255 - v) * amt;
  return fromRgb(f(r), f(g), f(b));
}

// Perceived luminance (0–1) — Rec. 601 weights.
export function lum(hex: string): number {
  const { r, g, b } = toRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Smart halo: contrasts with BOTH the chip and the paper background.
// - Light chip (fg darker than bg): use fg as halo — a darker outline.
// - Dark chip  (fg lighter than bg): use a lightened bg as halo — a mid-tone
//   that still reads against the paper. Pure fg (often white) would melt in.
export function haloColor(token: { bgColor: string; textColor: string }): string {
  return lum(token.textColor) > lum(token.bgColor)
    ? lightenHex(token.bgColor, 0.42)
    : token.textColor;
}

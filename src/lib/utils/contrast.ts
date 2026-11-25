/**
 * WCAG 2.x contrast ratio between two opaque hex colors (`#rgb` or `#rrggbb`). Used by the token test
 * to prove every text and UI pairing meets AA (SPEC §5).
 */
export function contrastRatio(fg: string, bg: string): number {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function relativeLuminance(color: string): number {
  if (!HEX.test(color)) throw new Error(`Expected a hex color like #1a2b3c, got "${color}"`);
  const hex = color.length === 4 ? color.slice(1).replace(/./g, '$&$&') : color.slice(1);
  const [r = 0, g = 0, b = 0] = [0, 2, 4].map((i) => linear(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function linear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

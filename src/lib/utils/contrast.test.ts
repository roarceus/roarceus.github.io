import { describe, expect, it } from 'vitest';

import { contrastRatio } from './contrast';

// axe-core reports ratios truncated to two decimals, so compare the same way.
const axeFormat = (ratio: number): number => Math.floor(ratio * 100) / 100;

describe('contrastRatio', () => {
  it('gives 21 for white on black', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBe(21);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21);
  });

  it('matches axe for the site text on the page background', () => {
    expect(axeFormat(contrastRatio('#e6edf3', '#0a0e14'))).toBe(16.36);
  });

  it('accepts three-digit hex', () => {
    expect(axeFormat(contrastRatio('#fff', '#326ce5'))).toBe(4.75);
  });

  it('ignores case', () => {
    expect(contrastRatio('#FFFFFF', '#326CE5')).toBe(contrastRatio('#ffffff', '#326ce5'));
  });

  it.each(['blue', '#ggg', '#12345', '', 'rgb(0,0,0)'])('rejects %j', (value) => {
    expect(() => contrastRatio(value, '#000000')).toThrow(/hex color/);
  });
});

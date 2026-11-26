import { describe, expect, it } from 'vitest';

import { codeTheme, styleToClass } from './code-highlight';

type Element = Parameters<typeof styleToClass.span>[0];

const element = (tagName: string, properties: Element['properties']): Element => ({
  type: 'element',
  tagName,
  properties,
  children: [],
});

describe('codeTheme', () => {
  it('colors every token with a CSS variable, never a fixed color', () => {
    const colors = codeTheme.tokenColors.flatMap(({ settings }) => settings.foreground ?? []);
    expect(colors.length).toBeGreaterThan(0);
    for (const color of [...colors, ...Object.values(codeTheme.colors)])
      expect(color).toMatch(/^var\(--code-[a-z-]+\)$/);
  });
});

describe('styleToClass', () => {
  it('turns token colors and font styles into classes', () => {
    const span = element('span', { style: 'color:var(--code-keyword);font-style:italic;font-weight:bold' });
    styleToClass.span(span);
    expect(span.properties).toEqual({ class: 'code-keyword code-italic code-bold' });
  });

  it('keeps existing classes and drops styles it has no class for', () => {
    const span = element('span', { class: 'line', style: 'color:#123456;text-decoration:underline' });
    styleToClass.span(span);
    expect(span.properties).toEqual({ class: 'line code-underline' });
  });

  it('removes the inline background and color from <pre>', () => {
    const pre = element('pre', {
      class: 'astro-code',
      style: 'background-color:var(--code-bg);color:var(--code-fg)',
      tabindex: '0',
    });
    styleToClass.pre(pre);
    expect(pre.properties).toEqual({ class: 'astro-code', tabindex: '0' });
  });
});

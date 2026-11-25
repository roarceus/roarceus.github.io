/**
 * Class recipes shared by the Astro primitives now and the React islands later (Stages 3 and 4), so
 * both render the same "tool" chrome (SPEC §5, ADR 0002). Plain strings: no React, no DOM.
 */

/** Minimum 44 by 44 touch target (SPEC §4). */
export const target = 'min-h-11 min-w-11';

/** Visible keyboard focus on every interactive element. */
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft';

const motion = 'transition-colors duration-ui ease-out';

const BUTTON_BASE = [
  'inline-flex items-center justify-center gap-2 rounded-md px-4 font-mono text-sm font-semibold',
  'cursor-pointer whitespace-nowrap',
  target,
  focusRing,
  motion,
].join(' ');

const BUTTON_VARIANTS = {
  primary: 'bg-accent text-on-accent hover:bg-accent-soft',
  secondary: 'border border-border-strong text-text hover:border-accent-soft hover:text-accent-soft',
  ghost: 'text-text hover:text-accent-soft',
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

export function button(variant: ButtonVariant): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]}`;
}

/** Command chip: runs (or, until Stage 3, links to) a kubectl command. */
export function chip(): string {
  return [
    'inline-flex items-center rounded-md border border-border-strong px-3 font-mono text-sm text-text',
    'whitespace-nowrap hover:border-accent-soft hover:text-accent-soft',
    target,
    focusRing,
    motion,
  ].join(' ');
}

/** Panel surface for cards, the detail panel, and the cluster stage frame. */
export function panel(): string {
  return 'rounded-lg border border-border bg-surface-1';
}

/**
 * Syntax highlighting that works under the CSP (ADR 0004). Shiki writes colors as `style` attributes,
 * which `style-src` blocks. This theme colors tokens with `var(--code-*)` placeholders, and
 * `styleToClass` turns each style into a class (`code-keyword`, `code-italic`) that global.css maps
 * to design tokens. No dependency: Shiki takes a plain theme object and transformer.
 */

interface Element {
  type: 'element';
  tagName: string;
  properties: Record<string, unknown>;
  children: unknown[];
}

const variable = (name: string) => `var(--code-${name})`;

/** Scopes per token kind, after Shiki's built-in css-variables theme. */
const TOKENS: [string, string[]][] = [
  ['comment', ['comment', 'string.quoted.docstring.multi', 'punctuation.definition.comment']],
  [
    'string',
    ['string', 'markup.fenced_code', 'markup.inline', 'string.quoted', 'string.template', 'string.regexp'],
  ],
  [
    'constant',
    [
      'constant.numeric',
      'constant.language',
      'constant.other',
      'variable.language',
      'variable.other.constant',
      'support.constant',
    ],
  ],
  [
    'keyword',
    [
      'keyword',
      'storage',
      'storage.type',
      'storage.modifier',
      'entity.name.tag',
      'entity.name.tag.yaml',
      'support.type.property-name',
      'punctuation.separator.key-value',
    ],
  ],
  [
    'function',
    [
      'entity.name.function',
      'support.function',
      'meta.function-call',
      'entity.name.type',
      'entity.other.attribute-name',
    ],
  ],
];

interface Rule {
  scope: string[];
  settings: { foreground?: string; fontStyle?: string };
}

const RULES: Rule[] = [
  ...TOKENS.map(([name, scope]) => ({ scope, settings: { foreground: variable(name) } })),
  { scope: ['emphasis', 'markup.italic'], settings: { fontStyle: 'italic' } },
  { scope: ['strong', 'markup.bold', 'markup.heading'], settings: { fontStyle: 'bold' } },
];

/** A Shiki theme; `settings` is the TextMate name for the same rules. */
export const codeTheme = {
  name: 'site-code',
  type: 'dark' as const,
  colors: { 'editor.foreground': variable('fg'), 'editor.background': variable('bg') },
  tokenColors: RULES,
  settings: RULES,
};

/** One `prop:value` from Shiki's style attribute, as a class. */
function classFor(declaration: string): string | undefined {
  const [prop = '', value = ''] = declaration.split(':').map((part) => part.trim());
  if (prop === 'color') return /^var\(--(code-[a-z-]+)\)$/.exec(value)?.[1];
  if (prop === 'font-style' && value === 'italic') return 'code-italic';
  if (prop === 'font-weight' && value === 'bold') return 'code-bold';
  if (prop === 'text-decoration' && value.includes('underline')) return 'code-underline';
  return undefined;
}

function moveStyle(node: Element, keep = true): void {
  const { style, ...rest } = node.properties;
  const classes =
    keep && typeof style === 'string' ? style.split(';').flatMap((part) => classFor(part) ?? []) : [];
  const existing = typeof rest.class === 'string' ? [rest.class] : [];
  const merged = [...existing, ...classes].join(' ');
  node.properties = merged === '' ? rest : { ...rest, class: merged };
}

export const styleToClass = {
  name: 'style-to-class',
  /** The block's colors come from the `.astro-code` rule instead. */
  pre(node: Element) {
    moveStyle(node, false);
  },
  span(node: Element) {
    moveStyle(node);
  },
};

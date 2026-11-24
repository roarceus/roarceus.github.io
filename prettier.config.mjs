// @ts-check

/** @type {import('prettier').Config} */
export default {
  printWidth: 110,
  singleQuote: true,
  trailingComma: 'all',
  endOfLine: 'lf',
  plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],
  overrides: [{ files: '*.astro', options: { parser: 'astro' } }],
  tailwindStylesheet: './src/styles/global.css',
};

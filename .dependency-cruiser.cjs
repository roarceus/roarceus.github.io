/**
 * Dependency direction (SPEC §3): pages → layouts/components → lib → types.
 * lib/ never imports UI code, React, or Astro, so all logic stays unit-testable.
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular imports make modules hard to test and reason about.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'lib-is-framework-free',
      severity: 'error',
      comment: 'src/lib must not depend on UI code, React, or Astro.',
      from: { path: '^src/lib/' },
      to: { path: ['^src/(components|layouts|pages)/', '(^|/)node_modules/(react|react-dom|astro)/'] },
    },
    {
      name: 'components-not-pages',
      severity: 'error',
      comment: 'Components and layouts must not import routes.',
      from: { path: '^src/(components|layouts)/' },
      to: { path: '^src/pages/' },
    },
    {
      name: 'config-is-leaf',
      severity: 'error',
      comment: 'src/config holds data; it must not import UI code.',
      from: { path: '^src/config/' },
      to: { path: '^src/(components|layouts|pages)/' },
    },
    // No orphan rule: dependency-cruiser can't parse .astro files, so modules used only from
    // pages and layouts would look orphaned. knip (which understands Astro) catches dead files.
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.json', '.astro'],
    },
  },
};

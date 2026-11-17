import path from 'node:path';

import kolibriFormatConfig from 'kolibri-format/eslint.config.mjs';

const OFF = 0;

/*
 * Rules off, tracked by issue [#6359](https://github.com/learningequality/studio/issues/6359),
 * which enables them one at a time. Stripping by prefix stops
 * a new rule in either plugin from breaking the build before triage.
 *
 * Autofixing `jsdoc/require-param` inserts `@param` stubs, which then raise
 * `jsdoc/require-param-description`.
 */
const DEFERRED_RULE_PREFIXES = ['jsdoc/', 'vuejs-accessibility/'];

const inherited = kolibriFormatConfig.map(entry => {
  if (!entry.rules) {
    return entry;
  }
  const rules = Object.fromEntries(
    Object.entries(entry.rules).filter(
      ([name]) => !DEFERRED_RULE_PREFIXES.some(prefix => name.startsWith(prefix)),
    ),
  );
  return { ...entry, rules };
});

export default [
  ...inherited,
  {
    languageOptions: {
      globals: {
        $: 'readonly',
        _: 'readonly',
        MathQuill: 'readonly',
        HandlebarsIntl: 'readonly',
        MathJax: 'readonly',
        jest: 'readonly',
      },
    },
    settings: {
      // Flat config replaces this key wholesale, so kolibri-format's own
      // `node` and `exports` entries are repeated here.
      'import-x/resolver': {
        node: {
          extensions: ['.js', '.json', '.vue'],
          // pnpm symlinks packages, so the resolver has to follow the links.
          // https://github.com/import-js/eslint-plugin-import/issues/3110
          preserveSymlinks: false,
        },
        exports: true,
        // Resolves Studio's webpack aliases, such as `shared` and `frontend`.
        webpack: { config: path.resolve(import.meta.dirname, 'webpack.config.js') },
      },
    },
    rules: {
      // Remove once Vuetify is gone. Vuetify uses too many unacceptable class names.
      'kolibri/vue-component-class-name-casing': OFF,

      // Vuetify wrappers such as `VListTileTitle` render one element that honors
      // `v-text`. Remove once Vuetify is gone.
      'vue/no-v-text-v-html-on-component': OFF,

      // Vuetify's helper attributes use hyphens and they would
      // not be recognized if auto-formatted to camel case
      'vue/attribute-hyphenation': OFF,

      // Off; tracked by issue #6359: renaming `data-test` and `data-cy` to `data-testid`
      // touches the tests that query them.
      'vue/no-restricted-static-attribute': OFF,

      // Off; tracked by issue #6359: each one needs a translated string, not a format fix.
      'vue/no-bare-strings-in-template': OFF,

      // Off; tracked by issue #6359: fixing these changes rendered styles.
      'kolibri/vue-no-theme-tokens-in-v-bind': OFF,
      'kolibri/vue-no-theme-accessor-in-inline-styles': OFF,
    },
  },
  {
    files: ['**/*.spec.js'],
    rules: {
      // Off; tracked by issue #6359: each one needs the test to read its string
      // from the translator.
      'kolibri/tests-no-hardcoded-strings': OFF,

      // Off; tracked by issue #6359: each one needs the test to render the real child.
      'kolibri/tests-no-stubs': OFF,

      // Off; tracked by issue #6359: wrapping the loose hooks and cases restructures
      // those suites.
      'jest/require-top-level-describe': OFF,
    },
  },
  {
    // Webpack cannot resolve the `node:` scheme in a browser bundle. Specs run
    // under Node, so the rule stays on for them.
    files: ['contentcuration/contentcuration/frontend/**/*.{js,vue}'],
    ignores: ['**/*.spec.js', '**/__tests__/**'],
    rules: {
      'n/prefer-node-protocol': OFF,
    },
  },
  {
    // A test helper, not a spec: its `beforeAll` and `afterAll` are top level
    // by design.
    files: ['contentcuration/contentcuration/frontend/shared/utils/testing.js'],
    rules: {
      'jest/require-top-level-describe': OFF,
    },
  },
];

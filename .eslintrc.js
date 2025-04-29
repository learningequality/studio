const esLintConfig = require('kolibri-format/.eslintrc');

esLintConfig.globals = {
  $: false,
  _: false,
  MathQuill: false,
  HandlebarsIntl: false,
  MathJax: false,
  jest: false,
};
esLintConfig.settings['import/resolver']['webpack'] = { config: require.resolve('./webpack.config.js')};

// Remove once Vuetify is gone-- Vuetify uses too many unacceptable class names
esLintConfig.rules['kolibri/vue-component-class-name-casing'] = 0;

// Dumb
esLintConfig.rules['vue/no-v-text-v-html-on-component'] = 0;

// Vuetify's helper attributes use hyphens and they would
// not be recognized if auto-formatted to camel case
esLintConfig.rules['vue/attribute-hyphenation'] = 0;

module.exports = esLintConfig;

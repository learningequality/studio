const esLintConfig = require('kolibri-tools/.eslintrc');

esLintConfig.globals = {
  $: false,
  _: false,
  MathQuill: false,
  HandlebarsIntl: false,
  MathJax: false,
  Sentry: false,
  jest: false,
  Raven: false,
};
esLintConfig.settings['import/resolver']['webpack'] = { config: 'webpack.config.js'};

// Vuetify's helper attributes use hyphens and they would
// not be recognized if auto-formatted to camel case
esLintConfig.rules['vue/attribute-hyphenation'] = 0;

module.exports = esLintConfig;

const esLintConfig = require('kolibri-tools/.eslintrc');
esLintConfig.globals = {
  // Misc. global variables
  "$": false,
  "_": false,
  "MathQuill": false,
  "HandlebarsIntl": false,
  "MathJax": false,
  "Raven": false,
}
module.exports = esLintConfig;

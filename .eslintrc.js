const esLintConfig = require('kolibri-tools/.eslintrc');
esLintConfig.globals = {
  "$": false,
  "_": false,
  "MathQuill": false,
  "HandlebarsIntl": false,
  "MathJax": false,
  "Raven": false,
}
module.exports = esLintConfig;

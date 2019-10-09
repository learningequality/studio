const htmlHintConfig = require('kolibri-tools/.htmlhintrc');
htmlHintConfig['--vue-component-conventions'] = false;
htmlHintConfig['id-class-value'] = false;
module.exports = htmlHintConfig;

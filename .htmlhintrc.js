const htmlHintConfig = require('kolibri-tools/.htmlhintrc');
htmlHintConfig['id-class-value'] = false;
htmlHintConfig['--vue-component-conventions'] = false;
module.exports = htmlHintConfig;

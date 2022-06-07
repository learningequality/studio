module.exports = {
  extends: [
    'kolibri-tools/.stylelintrc',
  ],
  rules: {
    /*
     * Ignored rules
     * Inline comments explain why rule is ignored
     */
    'selector-max-id': null, // This would require a major refactor
    'at-rule-no-unknown': null, // we're using LESS
    'scss/at-rule-no-unknown': null, // we're using LESS
    'csstree/validator': null // this triggers issues with unknown at rules too.
  },
};

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
    'csstree/validator': null, // this triggers issues with unknown at rules too.
    'selector-pseudo-element-no-unknown': [ 
     true,
     {
         // In Vue 2.6 and later, `::v-deep` is used for deep selectors.  
         // This rule allows `::v-deep` to prevent linting errors.
         ignorePseudoElements: ['v-deep'],
     }
    ]
  },
};

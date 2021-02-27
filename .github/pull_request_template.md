<!-- Please remove any unused sections.

Note that anything written between these symbols will not appear in the actual, published PR. They serve as instructions for filling out this template. You may want to use the 'preview' tab above this textbox to verify formatting before submitting.
-->

## Summary
### Description of the change(s) you made
<!-- Briefly summarize your changes in 1-2 sentences here. -->


### Manual verification steps performed
1. Step 1
2. Step 2
3. ...

### Screenshots (if applicable)
<!-- If not applicable, please delete this section -->

### Does this introduce any tech-debt items?
<!-- List anything that will need to be addressed later -->
___
## Reviewer guidance
### How can a reviewer test these changes?
<!-- If not applicable, please delete this section -->


### Are there any risky areas that deserve extra testing?
<!-- If not applicable, please delete this section -->


## References
<!--
Additional, helpful things to add in this section:
 * links to mockups or specs for new features
 * links to the diffs for any dependency updates, e.g. in iceqube or the perseus plugin
 * references to relevant issues or Notion projects
-->

## Comments
<!-- Additional comments may be added here -->

----

### Contributor's Checklist
<!-- After saving the PR, come through to tick off completed checklist items. Delete any sections that are not applicable to your PR -->

PR process:

- [ ] If this is an important user-facing change, PR or related issue the `CHANGELOG` label been added to this PR. Note: items with this label will be added to the [CHANGELOG](https://github.com/learningequality/studio/blob/master/CHANGELOG.md) at a later time
- [ ] If this includes an internal dependency change, a link to the diff is provided
- [ ] The `docs` label has been added if this introduces a change that needs to be updated in the [user docs](https://kolibri-studio.readthedocs.io/en/latest/index.html)?
- [ ] If any Python requirements have changed, the updated `requirements.txt` files also included in this PR
- [ ] Opportunities for using Google Analytics here are noted
- [ ] Migrations are [safe for a large db](https://www.braintreepayments.com/blog/safe-operations-for-high-volume-postgresql/)

Studio-specifc:

- [ ] All user-facing strings are translated properly
- [ ] The `notranslate` class been added to elements that shouldn't be translated by Google Chrome's automatic translation feature (e.g. icons, user-generated text)
- [ ] All UI components are LTR and RTL compliant
- [ ] Views are organized into `pages`, `components`, and `layouts` directories [as described in the docs](https://github.com/learningequality/studio/blob/vue-refactor/docs/architecture.md#where-does-the-frontend-code-live)
- [ ] Users' storage used is recalculated properly on any changes to main tree files
- [ ] If there new ways this uses user data that needs to be factored into our [Privacy Policy](https://github.com/learningequality/studio/tree/master/contentcuration/contentcuration/templates/policies/text), it has been noted.


Testing:

- [ ] Code is clean and well-commented
- [ ] Contributor has fully tested the PR manually
- [ ] If there are any front-end changes, before/after screenshots are included
- [ ] Critical user journeys are covered by Gherkin stories
- [ ] Any new interactions have been added to the [QA Sheet](https://docs.google.com/spreadsheets/d/1HF4Gy6rb_BLbZoNkZEWZonKFBqPyVEiQq4Ve6XgIYmQ/edit#gid=0)
- [ ] Critical and brittle code paths are covered by unit tests
___

### Reviewer's Checklist
#### This section is for reviewers to fill out.

- [ ] Automated test coverage is satisfactory
- [ ] PR is fully functional
- [ ] PR has been tested for [accessibility regressions](http://kolibri-dev.readthedocs.io/en/develop/manual_testing.html#accessibility-a11y-testing)
- [ ] External dependency files were updated if necessary (`yarn` and `pip`)
- [ ] Documentation is updated
- [ ] Contributor is in AUTHORS.md

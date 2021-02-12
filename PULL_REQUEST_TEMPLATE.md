**Please remove any unused sections**

## Description

*What does this PR do? Briefly describe in 1-2 sentences*

#### Issue Addressed (if applicable)

Addresses #*PR# HERE*

#### Before/After Screenshots (if applicable)

*Insert images here*


## Steps to Test

- [ ] *Step 1*
- [ ] *Step 2*

## Implementation Notes (optional)

#### At a high level, how did you implement this?

*Briefly describe how this works*

#### Does this introduce any tech-debt items?

*List anything that will need to be addressed later*


## Checklist

*Delete any items that don't apply*

- [ ] Is the code clean and well-commented?
- [ ] Has the `docs` label been added if this introduces a change that needs to be updated in the [user docs](https://kolibri-studio.readthedocs.io/en/latest/index.html)?
- [ ] Has the `CHANGELOG` label been added to this pull request? Items with this label will be added to the [CHANGELOG](https://github.com/learningequality/studio/blob/master/CHANGELOG.md) at a later time
- [ ] Are there tests for this change?
- [ ] Are all user-facing strings translated properly (if applicable)?
- [ ] Has the `notranslate` class been added to elements that shouldn't be translated by Google Chrome's automatic translation feature (e.g. icons, user-generated text)?
- [ ] Are all UI components LTR and RTL compliant (if applicable)?
- [ ] Are views organized into `pages`, `components`, and `layouts` directories [as described in the docs](https://github.com/learningequality/studio/blob/vue-refactor/docs/architecture.md#where-does-the-frontend-code-live)?
- [ ] Are users' storage used being recalculated properly on any changes to their main tree files?
- [ ] Are there any new ways this uses user data that needs to be factored into our [Privacy Policy](https://github.com/learningequality/studio/tree/master/contentcuration/contentcuration/templates/policies/text)?
- [ ] Are there any new interactions that need to be added to the [QA Sheet](https://docs.google.com/spreadsheets/d/1HF4Gy6rb_BLbZoNkZEWZonKFBqPyVEiQq4Ve6XgIYmQ/edit#gid=0)?
- [ ] Are there opportunities for using Google Analytics here (if applicable)?
- [ ] If any Python requirements have changed, are the updated requirements.txt files also included in this PR?
- [ ] Are the migrations [safe for a large db](https://www.braintreepayments.com/blog/safe-operations-for-high-volume-postgresql/) (if applicable)?

## Comments

*Any additional notes you'd like to add*

## Reviewers

If you are looking to assign a reviewer, here are some options:
- Jordan jayoshih (full stack)
- Aron aronasorman (back end, devops)
- Micah micahscopes (full stack)
- Kevin kollivier (back end)
- Ivan ivanistheone ([Ricecooker](https://github.com/learningequality/ricecooker))
- Richard rtibbles (full stack, [Kolibri](https://github.com/learningequality/kolibri))
- Radina @radinamatic (documentation)

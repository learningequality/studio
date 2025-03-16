Preparing a pull request
=============

Before opening or approving a PR, consider:

Security and privacy:
- If there new ways this uses user data that needs to be factored into our [Privacy Policy](https://github.com/learningequality/studio/tree/master/contentcuration/contentcuration/templates/policies/text), it has been noted.


Internationalization:
- All user-facing strings are translated properly
- The `notranslate` class been added to elements that shouldn't be translated by Google Chrome's automatic translation feature (e.g. icons, user-generated text)
- All UI components are LTR and RTL compliant

Deployment:
- Migrations are [safe for a large db](https://www.braintreepayments.com/blog/safe-operations-for-high-volume-postgresql/)

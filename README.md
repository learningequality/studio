# Kolibri Studio

[![Python tests](https://github.com/learningequality/studio/actions/workflows/pythontest.yml/badge.svg)](https://github.com/learningequality/studio/actions/workflows/pythontest.yml) [![Javascript Tests](https://github.com/learningequality/studio/actions/workflows/frontendtest.yml/badge.svg)](https://github.com/learningequality/studio/actions/workflows/frontendtest.yml)

[Kolibri Studio](https://studio.learningequality.org) is a web application designed to deliver educational materials to [Kolibri](http://learningequality.org/kolibri/). It supports:

- Organizing and publishing content channels in the format suitable for import from Kolibri
- Curating content and remixing of existing channels into custom channels aligned to various educational standards, country curricula, and special needs
- Creating learning pathways and assessments
- Uploading new content through the web interface or programatically using [ricecooker-powered](https://github.com/learningequality/ricecooker) content import scripts

Kolibri Studio uses the [Django framework](https://www.djangoproject.com/) for the backend and [Vue.js](https://vuejs.org/) for the frontend.

If you are looking for help setting up custom content channels, uploading and organizing resources using Kolibri Studio, please refer to the [User Guide](https://kolibri-studio.readthedocs.io/en/latest/).

<!-- Also update CONTRIBUTING.md (duplicate) -->
## How can I contribute?

1. 📙 **Skim through the [Developer documentation](./docs/_index.md)** to understand where to refer later on.
2. 💻 **Follow the [Local development instructions](./docs/local_dev_docker.md) to set up your development server.**
3. 🔍 **Search for issues tagged as [help wanted](https://github.com/learningequality/studio/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22+no%3Aassignee) or [good first issue](https://github.com/learningequality/studio/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+no%3Aassignee).**
4. 🗣️ **Ask us for an assignment in the comments of an issue you've chosen.** Please request assignment of a reasonable amount of issues at a time. Once you finish your current issue or two, you are welcome to ask for more.

**❓ Where to ask questions**

- For anything development related, refer to the [Developer documentation](./docs/_index.md) at first. Some answers may already be there.
- For questions related to a specific issue or assignment requests, use the corresponding issue's comments section.
- Visit [GitHub Discussions](https://github.com/learningequality/studio/discussions) to ask about anything related to contributing or to troubleshoot development server issues.

**👥 How to connect**

- We encourage you to visit [GitHub Discussions](https://github.com/learningequality/studio/discussions) to connect with the Learning Equality team as well as with other contributors.
- If you'd like to contribute on a regular basis, we are happy to invite you to our open-source community Slack channel. Get in touch with us at info@learningequality.org to receive an invitation.

---

🕖 Please allow us a few days to reply to your comments. If you don't hear from us within a week, reach out via [GitHub Discussions](https://github.com/learningequality/studio/discussions).

As soon as you open a pull request, it may take us a week or two to review it as we're a small team. We appreciate your contribution and will provide feedback.

---

*Thank you for your interest in contributing! Learning Equality was founded by volunteers dedicated to helping make educational materials more accessible to those in need, and every contribution makes a difference.*


## Licensing
Kolibri Studio is licensed under the MIT license. See [LICENSE](./LICENSE) for more details.

Other tools and libraries used in Kolibri Studio are licensed under their respective licenses, and some are only used during development and are not intended for distribution or use in production environments.

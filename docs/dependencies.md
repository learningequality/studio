# Adding or updating dependencies

We use `pip-tools` to ensure all our dependencies use the same versions on all deployments.

To add a dependency, add it to either `requirements.in` or `requirements-dev.in`, then
run `pip-compile requirements[-dev|-docs].in` to generate the .txt file. Please make sure that
both the `.in` and `.txt` file changes are part of the commit when updating dependencies.

To update a dependency, use `pip-compile --upgrade-package [package-name] requirements[-dev|-docs].in`

For more details, please see the [pip-tools docs on Github](https://github.com/jazzband/pip-tools).

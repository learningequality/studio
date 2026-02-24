# Adding or updating dependencies

We use `uv` to manage Python dependencies and generate requirements files.

To add a dependency, add it to either `requirements.in` or `requirements-dev.in`, then
run `uv pip compile requirements[-dev].in` to generate the .txt file. Please make sure that
both the `.in` and `.txt` file changes are part of the commit when updating dependencies.

To update a dependency, use `uv pip compile --upgrade-package [package-name] requirements[-dev].in`

For more details, please see the [uv documentation](https://docs.astral.sh/uv/).

# Kolibri Studio

[![Python tests](https://github.com/learningequality/studio/actions/workflows/pythontest.yml/badge.svg)](https://github.com/learningequality/studio/actions/workflows/pythontest.yml) [![Javascript Tests](https://github.com/learningequality/studio/actions/workflows/frontendtest.yml/badge.svg)](https://github.com/learningequality/studio/actions/workflows/frontendtest.yml) [![codecov](http://codecov.io/github/learningequality/studio/coverage.svg?branch=develop)](http://codecov.io/github/learningequality/studio?branch=develop])

[Kolibri Studio](https://studio.learningequality.org) is a web application designed to deliver educational materials to [Kolibri](http://learningequality.org/kolibri/). It supports:

- Organizing and publishing content channels in the format suitable for import from Kolibri
- Curating content and remixing of existing channels into custom channels aligned to various educational standards, country curricula, and special needs
- Creating learning pathways and assessments
- Uploading new content through the web interface or programatically using [ricecooker-powered](https://github.com/learningequality/ricecooker) content import scripts

Kolibri Studio uses the [Django framework](https://www.djangoproject.com/) for the backend and [Vue.js](https://vuejs.org/) for the frontend.

If you are looking for help setting up custom content channels, uploading and organizing resources using Kolibri Studio, please refer to the [User Guide](https://kolibri-studio.readthedocs.io/en/latest/).

## Local development instructions
The following guide utilizes docker and docker-compose to run select services required for Studio to function. If you would rather install these services on your host, please follow the [host-setup guide](docs/host_services_setup.md).

### Prerequisites
Please install these prerequisites, or alternatives for setting up your local development environment:
- [volta](https://docs.volta.sh/guide/getting-started) or a different node.js manager
- [pyenv](https://kolibri-dev.readthedocs.io/en/develop/howtos/installing_pyenv.html) and [pyenv-virtualenv](https://github.com/pyenv/pyenv-virtualenv#installation)
- [docker](https://docs.docker.com/install/) and [docker-compose](https://docs.docker.com/compose/install/)


### Build your python virtual environment
To determine the preferred version of Python, you can check the `runtime.txt` file:
```bash
$ cat runtime.txt
# This is the required version of Python to run Studio currently.
# This is determined by the default Python 3 version that is installed
# inside Ubuntu Bionic, which is used to build images for Studio.
# We encode it here so that it can be picked up by Github's dependabot
# to manage automated package upgrades.
python-3.9.13
```
Use `pyenv` to install the version of Python listed in that file, and to also set up a virtual environment:
```bash
pyenv install 3.9.13
pyenv virtualenv 3.9.13 studio-py3.9
pyenv activate studio-py3.9
```
Now you may install Studio's Python dependencies:
```bash
pip install -r requirements.txt -r requirements-dev.txt
```
To deactivate the virtual environment, when you're finished developing on Studio for the time being:
```bash
pyenv deactivate
```

#### A note about dependencies on Apple Silicon M1+
If you run into an error with `pip install` related to the `grcpio` package, it is because it currently [does not support M1 with the version for `grcpio` Studio uses](https://github.com/grpc/grpc/issues/25082). In order to fix it, you will need to add the following environmental variables before running `pip install`:
```bash
export GRPC_PYTHON_BUILD_SYSTEM_OPENSSL=1
export GRPC_PYTHON_BUILD_SYSTEM_ZLIB=1
export CFLAGS="-I/opt/homebrew/opt/openssl/include"
export LDFLAGS="-L/opt/homebrew/opt/openssl/lib"
```

### Install frontend dependencies
Install the version of node.js supported by Studio, and install `yarn`:
```bash
volta install node@16
volta install yarn
```
After installing `yarn`, you may now install frontend dependencies:
```bash
yarn install
```

### Install and run services

Studio requires some background services to be running:

* Minio - a local S3 storage emulation
* PostgreSQL (postgres) - a relational database
* Redis - a fast key/value store useful for caching
* Celery - the task manager and executor, which relies on the Studio codebase

Generally speaking, you'll want to open a separate terminal/terminal-tab to run the services. With docker and docker-compose installed, running the above services is as easy as:
```bash
make run-services
```

The above command may take longer the first time it's run. It includes starting the `celery` workers, and the other dependent services through docker, which can be done separately with the following two commands:

```bash
make dcservicesup
make devceleryworkers
```

To confirm that docker-based services are running, you should see three containers when executing `docker ps`. For example:

```bash
> docker ps
CONTAINER ID        IMAGE                             COMMAND                  CREATED             STATUS              PORTS                    NAMES
e09c5c203b93        redis:6.0.9                       "docker-entrypoint.s…"   51 seconds ago      Up 49 seconds       0.0.0.0:6379->6379/tcp   studio_vue-refactor_redis_1
6164371efb6b        minio/minio                       "minio server /data"     51 seconds ago      Up 49 seconds       0.0.0.0:9000->9000/tcp   studio_vue-refactor_minio_1
c86bbfa3a59e        postgres:12.10                      "docker-entrypoint.s…"   51 seconds ago      Up 49 seconds       0.0.0.0:5432->5432/tcp   studio_vue-refactor_postgres_1
```

To stop the services, press <kbd>Ctrl</kbd> + <kbd>C</kbd> in the terminal where you ran `make run-services` (or `dcservicesup`). Once you've done that, you may run the following command to remove the docker containers (they will be recreated when you run `run-services` or `dcservicesup` again):
```bash
make dcservicesdown
```

### Initializing Studio
With the services running, in a separate terminal/terminal-tab, we can now initialize the database for Studio development purposes. The command below will initialize the database tables, import constants, and a user account for development:
```bash
yarn run devsetup
```

### Running the development server
With the services running, in a separate terminal/terminal-tab, and the database initialized, we can start the dev server:
```bash
yarn run devserver:hot  # with Vue hot module reloading
# or
yarn run devserver  # without hot module reloading
```

Either of the above commands will take a few moments to build the frontend. When it finishes, you can sign in with the account created by the `yarn run devsetup` command:
- url: `http://localhost:8080/accounts/login/`
- username: `a@a.com`
- password: `a`

### Running the celery service
Studio uses `celery` for executing asynchronous tasks, which are integral to Studio's channel editing architecture. The celery service does not reload when there are Python changes like the Django devserver does, so it's often preferred to run it separately. If you are developing changes against a task or the celery configuration, you'll need to use `make dcservicesup` to run only the docker-based services.

In a separate terminal/terminal-tab, run the following to start the service and press <kbd>Ctrl</kbd> + <kbd>C</kbd> to stop it:
```bash
make devceleryworkers
```

Stop and restart the above to reload your changes.

## Adding or updating dependencies

We use `pip-tools` to ensure all our dependencies use the same versions on all deployments.

To add a dependency, add it to either `requirements.in` or `requirements-dev.in`, then
run `pip-compile requirements[-dev|-docs].in` to generate the .txt file. Please make sure that
both the `.in` and `.txt` file changes are part of the commit when updating dependencies.

To update a dependency, use `pip-compile --upgrade-package [package-name] requirements[-dev|-docs].in`

For more details, please see the [pip-tools docs on Github](https://github.com/jazzband/pip-tools).

## Additional tools

### Running tests

With Studio's services running, you may run tests with the following commands:

```bash
# backend
make test
# frontend
yarn run test
```

View [more testing tips](docs/running_tests.md)

### Linting

Front-end linting is run using:

```bash
yarn run lint-frontend
```

Some linting errors can be fixed automatically by running:

```bash
yarn run lint-frontend:format
```

Make sure you've set up pre-commit hooks as described above. This will ensure that linting is automatically run on staged changes before every commit.

### Profiling and local production testing

If you want to test the performance of your changes, you can start up a local server with settings closer to a production environment like so:

```bash
# build frontend dependencies
yarn run build
# run the server (no webpack)
yarn run runserver
# or for profiling production more closely
yarn run runserver:prod-profiling
```

Once the local production server is running, you can also use Locust to test your changes under scenarios of high demand like so:

```bash
cd deploy/chaos/loadtest
make timed_run
make stop_slaves  # mac: killall python
```

#### Profiling

In case you need to profile the application to know which part of the code are more time consuming, there are two different profilers available to work in two different modes. Both will store the profiling output in a directory that's determined by the `PROFILE_DIR` env variable. If  this variable is not set, the output files will be store in a folder called profiler inside the OS temp folder (`/tmp/profile` usually)
Note that both profiling modes are incompatible: you can either use one or the other, but not both at the same time. In case the env variables are set for both modes, _All request profiling mode_ will be used.

##### All requests profiling mode

This mode will create interactive html files with all the profiling information for every request the Studio server receives. The name of the files will contain the total execution time, the endpoint  name and a timestamp.

To activate it an env variable called `PROFILE_STUDIO_FULL` must be set.

Example of use:

`PROFILE_STUDIO_FULL=y yarn runserver`

Afterwards no further treatment of the generated files is needed. You can open directly the html files in your browser.

##### Endpoint profiling mode

When using the _all requests mode_ it's usual that the profile folder is soon full of information for requests that are not interesting for the developer, obscuring the files for specific endpoints.

If an env variable called `PROFILE_STUDIO_FILTER` is used, the profiler will be executed only on the http requests containing the text stated by the variable.

Example of use:

`PROFILE_STUDIO_FILTER=edit yarn localprodserver`

For this case, only html requests having the text _edit_ in their request path will be profiled. The profile folder will not have html files, but binary dump files (with the timestamp as filename) of the profiler information that can be later seen by different profiling tools (`snakeviz` that can be installed using pip is recommended). Also while the server is running,  the ten most time consuming lines of code of the filtered request will be shown in the console where Studio has been launched.

Example of snakeviz use:

`snakeviz /tmp/profile/studio\:20200909161405011678.prof`

will open the browser with an interactive diagram with all the profiling information

### Storybook

Storybook is a development environment for UI components. If this is your first encounter with this tool, you can check [this presentation](https://docs.google.com/presentation/d/10JL4C9buygWsTbT62Ym149Yh9zSR9nY_ZqFumBKUY0o/edit?usp=sharing) or [its website](https://storybook.js.org/). You are encouraged to use it any time you need to develop a new UI component. It is especially suitable for smaller to middle size components that represent basic UI building blocks.

An example is worth a thousand words so please have a look at these simple [stories of an example component](./contentcuration/contentcuration/frontend/shared/views/details/DetailsRow.stories.js) to see how to write yours. For detailed information on writing stories you can [go through this tutorial](https://www.learnstorybook.com/intro-to-storybook/).

You can also check [official addons](https://storybook.js.org/addons/).

**Run development server**

```bash
yarn run storybook
```

With detailed webpack information (useful when debugging loaders, addons and similar):

```bash
yarn run storybook:debug
```

**Bundle**

```bash
yarn run storybook:build
```

The output is saved to *storybook-static/*.

### Current usage notes

We've decided not to push our stories to the codebase and keep them locally in the near future. Although this limits the number of advantages Storybook provides, it allows us to start using it as soon as possible without the need to agree on all conventions and it also gives the whole team enough time to test the development workflow so we can decide later if we want to adopt this tool in a larger scale.

Taking into account the above-mentioned, all stories except of example *DetailsRow.stories.js* will be ignored by git as long as you use a naming convention for Storybook source files: *\*.stories.js*.

Although we don't share stories at this point, Storybook is installed and configured in the codebase to prevent the need for everyone to configure everything locally. If you update Storybook Webpack settings, install a new plugin and similar, you are welcome to share such updates with other members of the team.

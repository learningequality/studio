# Kolibri Studio

[![codecov](http://codecov.io/github/learningequality/studio/coverage.svg?branch=develop)](http://codecov.io/github/learningequality/studio?branch=develop])

Check out our [beta site](https://studio.learningequality.org)!

Kolibri Studio is a web application designed to deliver educational materials to [Kolibri](http://learningequality.org/kolibri/). It supports:

- Organizing and publishing content channels in the format suitable for import from Kolibri
- Curating content and remixing of existing channels into custom channels aligned to various educational standards, country curricula, and special needs
- Creating learning pathways and assessments
- Uploading new content through the web interface or programatically using [ricecooker-powered](https://github.com/learningequality/ricecooker) content import scripts

Kolibri Studio uses [Django](https://www.djangoproject.com/) for the backend and is transitioning from [Backbone.js](https://backbonejs.org/) to [Vue.js](https://vuejs.org/) for the frontend.


## Getting started

### Get the code

- Install and set up [Git](https://help.github.com/articles/set-up-git/) on your computer. Try [this tutorial](http://learngitbranching.js.org/) if you need more practice
- [Sign up and configure your GitHub account](https://github.com/join) if you don't have one already.
- Fork the [studio repo](https://github.com/learningequality/studio) to create a copy of the studio repository under your own github username. This will make it easier to [submit pull requests](https://help.github.com/articles/using-pull-requests/>). Read more details [about forking](https://help.github.com/articles/fork-a-repo/) from GitHub
- Clone your repo locally

Tip: [Register your SSH keys](https://help.github.com/en/articles/connecting-to-github-with-ssh) on GitHub to avoid having to repeatedly enter your password.


### Install and run services

Studio requires some background services to be running:

* Minio
* Postgres
* Redis

The instructions below show how to set up the services using Docker. This works for many people, but not everyone. If docker is giving you issues, you can also [manually install](docs/manual_setup.md) the services either on your host machine or in a virtual machine (for example, using Vagrant with Virtualbox or VMWare).

First, [install Docker](https://docs.docker.com/install/).

Next, run

```bash
make dcservicesup
```

This will take a while the first time it's run, and might need to be restarted a couple times if it errors out initially.

To confirm that the services are running, run `docker ps`, and you should see three containers, for example:

```bash
> docker ps
CONTAINER ID        IMAGE                             COMMAND                  CREATED             STATUS              PORTS                    NAMES
e09c5c203b93        redis:4.0.9                       "docker-entrypoint.s…"   51 seconds ago      Up 49 seconds       0.0.0.0:6379->6379/tcp   studio_vue-refactor_redis_1
6164371efb6b        minio/minio                       "minio server /data"     51 seconds ago      Up 49 seconds       0.0.0.0:9000->9000/tcp   studio_vue-refactor_minio_1
c86bbfa3a59e        postgres:9.6                      "docker-entrypoint.s…"   51 seconds ago      Up 49 seconds       0.0.0.0:5432->5432/tcp   studio_vue-refactor_postgres_1
```


To shut down the services, run

```bash
make dcservicesdown
```

### Pipenv and Python dependencies

To develop on Kolibri, you'll need:

* Python 2.7
* [Pipenv](https://pipenv.readthedocs.io/en/latest/)

Managing Python installations can be quite tricky. We *highly* recommend using package managers like `Homebrew <http://brew.sh/>`__ on Mac or ``apt`` on Debian for this. Never modify your system's built-in version of Python

Then set up:

```bash
# Create virtual environment
pipenv shell

# Ensure your environment matches the one specified in Pipfile.lock
pipenv sync --dev

# Set up pre-commit hooks
pre-commit install
```

Exit the virtual environment by running `exit`. Reactivate it by running `pipenv shell` again.


### Yarn and Javascript dependencies

As described above, Kolibri Studio has dependencies that rely on Node.js version 10.x. You'll also need [yarn](https://yarnpkg.com/lang/en/docs/install) installed.

All the javascript dependencies are listed in `package.json`. To install them run the following [yarn](https://yarnpkg.com/en/) command:

```bash
yarn install --network-timeout 1000000
```

The `network-timeout` helps avoid a timeout issue with the Material Icons dependency.


### Initial setup

To set up the database, run:

```bash
yarn run devsetup
```

### Running the development server

In one tab, start `celery` using:

```bash
make prodceleryworkers
```

In another tab, start Django and the webpack build using:


```bash
yarn run devserver:hot  # with Vue hot module reloading
# or
yarn run devserver  # without hot module reloading
```

This will take a few mins to build the frontend. When it's done, you can log in with `a@a.com` password `a` at h[ttp://localhost:8080/accounts/login/](http://localhost:8080/accounts/login/)


## Additional tools

### Running tests

You can run tests using the following command:

```bash
yarn run test
```

View [more testing tips](docs/running_tests.md)


### Profiling and local production testing

If you want to test the performance of your changes, you can start up a local server
with settings closer to a production environment like so:

```bash
yarn run localprodserver
```

Once the local production server is running, you can also use Locust to test your changes
under scenarios of high demand like so:

```bash
cd deploy/chaos/loadtest
make timed_run
make stop_slaves  # mac: killall python
```

### Linting

Front-end linting is run using:

```bash
yarn run lint-all
```

Some linting errors can be fixed automatically by running:

```bash
yarn run lint-all:fix
```

Make sure you've set up pre-commit hooks as described above. This will ensure that linting is automatically run on staged changes before every commit.

### Storybook

Storybook is a development environment for UI components. If this is your first encounter with this tool, you can check [this presentation](https://docs.google.com/presentation/d/10JL4C9buygWsTbT62Ym149Yh9zSR9nY_ZqFumBKUY0o/edit?usp=sharing) or [its website](https://storybook.js.org/). You are encouraged to use it any time you need to develop a new UI component. It is especially suitable for smaller to middle size components that represent basic UI building blocks.

An example is worth a thousand words so please have a look at these simple [stories of an example component](./contentcuration/contentcuration/frontend/shared/views/details/DetailsRow.stories.js) to see how to write yours. For detailed information on writing stories you can [go through this tutorial](https://www.learnstorybook.com/intro-to-storybook/).

You can also check [official addons](https://storybook.js.org/addons/).

**Run development server**

```bash
yarn run storybook
```

With detailed webpack information (useful when debuggin loaders, addons and similar):

```bash
yarn run storybook:debug
```

**Bundle**

```bash
yarn run storybook:build
```

Output is saved to *storybook-static/*.

### Current usage notes

We've decided to not push our stories to codebase and keep them locally in the near future. Although this limits number of advantages Storybook provides, it allows us to start using it as soon as possible without need to agree on all conventions and it also gives the whole team enough time to test the development workflow so we can decide later if we want to adopt this tool in larger scale.

Taking into account the above-mentioned, all stories except of example *DetailsRow.stories.js* will be ignored by git as long as you use naming convention for Storybook source files: *\*.stories.js*.

Although we don't share stories at this point, Storybook is installed and configured in the codebase to prevent need for everyone to configure everything locally. If you update Storybook Webpack settings, install a new plugin and similar, you are welcome to share such updates with other members of the team.

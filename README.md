# Kolibri Studio

[![codecov](http://codecov.io/github/learningequality/studio/coverage.svg?branch=develop)](http://codecov.io/github/learningequality/studio?branch=develop])

[Beta Site](https://studio.learningequality.org)

Kolibri Studio is a web application designed to deliver educational materials to [Kolibri](http://learningequality.org/kolibri/).
Kolibri Studio supports the following workflows:

- Organizing and publishing content channels in the format suitable for import from Kolibri.

- Curating content and remixing of existing channels into custom channels aligned to various educational standards, country curricula, and special needs.

- Creating learning pathways and assessments.

- Uploading new content through the web interface or programatically using [ricecooker-powered](https://github.com/learningequality/ricecooker) chef scripts.

Kolibri Studio uses Django for the backend and Backbone.js for the frontend.

If you would like to get a local preview of Studio, please follow [these instructions](https://github.com/learningequality/studio/blob/develop/docs-developer/local_preview.md)


## Developer Instructions

Follow the instructions below to setup your dev environment and get started. (Note: We do have [instructions](https://github.com/learningequality/studio/blob/develop/docs-developer/docker_setup.md) for setting up your environment using [docker](https://www.docker.com/), but this is currently a work in progress.)


### 0. Get the code

  - Fork the [studio repo](https://github.com/learningequality/studio) to create a copy of the studio repository under your own github username.

    cd [project directory]
    git clone git@github.com:[yourusername]/studio.git

  - The folder `<project directory>/studio` now contains the latest Studio code.
  - For more information on using git, please check out [these instructions](https://github.com/learningequality/studio/blob/develop/docs-developer/git_setup.md)



### 1. Install software prerequisites

You need the following software installed on your machine to run Studio:

  - [python (2.7)](https://www.python.org/downloads/release/python-2713/)
  - [python-pip](https://pip.pypa.io/en/stable/installing/)
  - [nodejs](https://nodejs.org/en/download/)
  - [Postgres DB](https://www.postgresql.org/download/)
  - [redis](https://redis.io/topics/quickstart)
  - [minio](https://www.minio.io/downloads.html)
  - [nginx](https://www.nginx.com/resources/wiki/start/topics/tutorials/install/)
  - [ffmpeg](https://www.ffmpeg.org/)
  - [python-tk](https://wiki.python.org/moin/TkInter)
  - [libmagickwand-dev](http://docs.wand-py.org/en/0.2.4/guide/install.html)

**Ubuntu or Debian:**
You can install all the necessary packages using these commands:

    # Install minio
    wget https://dl.minio.io/server/minio/release/linux-amd64/minio -O /usr/local/bin/minio
    chmod +x /usr/local/bin/minio

    # Install node PPA
    curl -sL https://deb.nodesource.com/setup_6.x | bash -

    # Install packages
    apt-get install -y  python python-pip python-dev python-tk \
        postgresql-server-dev-all postgresql-contrib postgresql-client postgresql \
        ffmpeg nodejs libmagickwand-dev nginx redis-server wkhtmltopdf

**Mac OS X**
You can install the corresponding packages using Homebrew:

    brew install  postgresql@9.6 redis node ffmpeg imagemagick@6 gs
    brew install minio/stable/minio
    brew link --force postgresql@9.6
    brew link --force imagemagick@6

**Windows**
Windows is no longer supported due to some of the required packages.



### 1.5. (Optional) Set up a virtual environment
Run the following command (make sure you are under your project directory folder)

    pipenv shell

This will set up a virtual environment for you. To reactivate, run `pipenv shell`



### 2. Set up python dependencies through pipenv
Run the following commands to install the python dependencies listed in `Pipfile`

    pip install -U pipenv
    pipenv install



### 3. Set up pre-commit hooks

We use [pre-commit](http://pre-commit.com/) to help ensure consistent, clean code. The pip package should already be installed from a prior setup step, but you need to install the git hooks using this command.

    pre-commit install


#### Additional formatting tools

In case you need help formatting your python code to meet pep8 standards, there are a couple tools out there.
    - [autoflake](https://github.com/myint/autoflake) for removing unused imports and unused variables
    - [autopep8](https://github.com/hhatto/autopep8) for fixing whitespace issues.



### 4. Install javascript dependencies

All the javascript dependencies are listed in `package.json`. To install them run:

    npm install -g yarn
    yarn install



### 5. Set up the database and start redis

  5a. Install [postgres](https://www.postgresql.org/download/) if you don't have it already. If you're using a package manager, you need to make sure you install the following packages: `postgresql`, `postgresql-contrib`, and `postgresql-server-dev-all` which will be required to build `psycopg2` python driver.

  5b. Make sure postgres is running

    service postgresql start
    # or pg_ctl -D /usr/local/var/postgresql@9.6 start

  5c. Create a database user with username `learningequality` and password `kolibri`:

         sudo su postgres
         psql
         # mac: psql postgres
           CREATE USER learningequality with NOSUPERUSER INHERIT NOCREATEROLE CREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'kolibri';

  5d. Create a database called `gonano`

         CREATE DATABASE "gonano" WITH TEMPLATE = template0 OWNER = "learningequality";



### 6. Run all database migrations and load constants

You'll only need to run these commands once, to setup the necessary tables and constants in the database:

    # On one terminal, run all external services
    $ yarn run services

    # On another terminal, run devsetup to create all the necessary tables and buckets
    $ yarn run devsetup



### 7. Start the dev server

You're all setup now, and ready to start the Studio local development server:

    make devserver

Alternatively, you can run `pipenv run make devserver` or `yarn make devserver`
This will start any of the required services (e.g. postgres, redis, minio) that are not already running.

Once you see the following output in your terminal, the server is ready:

    Starting development server at http://0.0.0.0:8080/
    Quit the server with CONTROL-C.

You should be able to login at http://127.0.0.1:8080 using email `a@a.com`, password `a`.

_Note: If you are using a Linux environemnt, you may need to increase the amount of listeners to allow the `watch` command to automatically rebuild static assets when you edit them. Please see [here for instructions](https://github.com/guard/listen/wiki/Increasing-the-amount-of-inotify-watchers) on how to do so._



## Start required services manually

Although calling `make devserver` will start the necessary services for you, sometimes it will be useful to start the
services manually. To do so, you can run the following command:

    yarn run services

Make sure to run this command in a separate terminal from the one you run Studio on, as it will continue running until
you force quit it. If you want to see how to start each individual service, check the services command in `package.json`
to learn more.

## Running tests
Make sure you've installed the test requirements, setup a virtual environment, and started the minio server. Then, to
run python tests:

To run all unit tests:

    yarn run unittests

To run all integration tests:

    yarn run apptests

Finally, to run all tests:

    yarn run test

### Customizing Test Runs and Output

If you want more control while testing, there are several options for customizing test runs.
First, make sure you start services manually in a separate terminal using:

    yarn run services

From there, you can run the unit tests directly by calling:

    pytest contentcuration

By default, pytest is configured to recreate a fresh database every time.  This can be painfully slow!  To speed things up, you can ask pytest to recycle table structures between runs:

    pytest contentcuration --reuse-db

For convenience, you can also use yarn to run the tests this way with the following command:

    yarn run unittests:reusedb

If you do end up changing the schema (e.g. by updating a model), remember to run pytest without the `--reuse-db`.  Or, if you want to be more explicit you can use `--create-db` to ensure that the test database's table structure is up to date:

    pytest contentcuration --create-db

Sometimes it's nice to use print statements in your tests to see what's going on.  Pytest disables print statements by default, but you can show them by passing `-s`, e.g.:

    pytest contentcuration -s --reuse-db

### Automatically running tests during development
For running tests continuously during development, pytest-watch is included.  This works well with the `--reuse-db` option:

    ptw contentcuration -- --reuse-db

The extra `--` is required for passing pytest options through pytest-watch.  Sometimes you might want to quickly rerun an isolated set of tests while developing a new feature.  You could do something like this:

    ptw contentcuration/contentcuration/tests/test_megaboard.py -- -s --reuse-db

### Emulating the Travis CI environment
To emulate the Travis CI environment locally:

    docker-compose run studio-app make test

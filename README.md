# Kolibri Studio

[![codecov](http://codecov.io/github/learningequality/studio/coverage.svg?branch=develop)](http://codecov.io/github/learningequality/studio?branch=develop])

Check out our [beta site](https://studio.learningequality.org)!

Kolibri Studio is a web application designed to deliver educational materials to [Kolibri](http://learningequality.org/kolibri/).
Kolibri Studio supports the following workflows:

- Organizing and publishing content channels in the format suitable for import from Kolibri.

- Curating content and remixing of existing channels into custom channels aligned to various educational standards, country curricula, and special needs.

- Creating learning pathways and assessments.

- Uploading new content through the web interface or programatically using [ricecooker-powered](https://github.com/learningequality/ricecooker) content import scripts.

Kolibri Studio uses [Django](https://www.djangoproject.com/) for the backend and is transitioning from [Backbone.js](https://backbonejs.org/) to [Vue.js](https://vuejs.org/) for the frontend.


## Developer Instructions

Follow the instructions below to setup your dev environment and get started. (Note: [docs/docker_setup](docs/docker_setup.md) has instructions for setting up your environment using [docker](https://www.docker.com/), but this is currently a work in progress.)


### 0. Get the code

  - Fork the [studio repo](https://github.com/learningequality/studio) to create a copy of the studio repository under your own github username.

      ```bash
      cd <project directory>
      git clone git@github.com:<yourusername>/studio.git
      ```

  - The folder `<project directory>/studio` now contains the latest Studio code.
  - For more information on using git, please check out [docs/git_setup](docs/git_setup.md)



### 1. Install software prerequisites

You need the following software installed on your machine to run Studio:

  - [python (2.7)](https://www.python.org/downloads/release/python-2713/)
  - [python-pip](https://pip.pypa.io/en/stable/installing/)
  - [nodejs (10.x)](https://nodejs.org/en/download/)
  - [Postgres DB](https://www.postgresql.org/download/)
  - [redis](https://redis.io/topics/quickstart)
  - [minio server](https://www.minio.io/downloads.html)
  - [nginx](https://www.nginx.com/resources/wiki/start/topics/tutorials/install/)
  - [ffmpeg](https://www.ffmpeg.org/)
  - [python-tk](https://wiki.python.org/moin/TkInter)
  - [libmagickwand-dev](http://docs.wand-py.org/en/0.2.4/guide/install.html)
  - [yarn](https://yarnpkg.com/lang/en/docs/install)

You can also use `nodeenv` (which is included as a python development dependency below) or `nvm` to install Node.js 10.x if you need to maintain multiple versions of node:

* http://ekalinin.github.io/nodeenv/
* https://github.com/creationix/nvm

**Ubuntu or Debian**
You can install all the necessary packages using these commands (you may need to add `sudo` if you receive `Permission Denied` errors:

```bash
# Install minio
wget https://dl.minio.io/server/minio/release/linux-amd64/minio -O /usr/local/bin/minio
chmod +x /usr/local/bin/minio

# Install node PPA
curl -sL https://deb.nodesource.com/setup_10.x | bash -

# Install packages
apt-get install -y  python python-pip python-dev python-tk \
    postgresql-server-dev-all postgresql-contrib postgresql-client postgresql \
    ffmpeg nodejs libmagickwand-dev nginx redis-server wkhtmltopdf
```

**Mac OS X**
You can install the corresponding packages using Homebrew:

```bash
brew install  postgresql@9.6 redis node ffmpeg imagemagick@6 gs
brew install minio/stable/minio
brew link --force postgresql@9.6
brew link --force imagemagick@6
```

**Windows**
Windows is no longer supported due to incompatibilities with some of the required packages.



### 2. Set up python dependencies through pipenv

If you haven't installed pipenv,

```bash
pip install -U pipenv
```

Then set up:

```bash
# Create virtual environment
pipenv shell

# Ensure your environment matches the one specified in Pipfile.lock
pipenv sync --dev
```

Exit the virtual environment by running `exit`. Reactivate it by running `pipenv shell` again.


### 3. Set up pre-commit hooks

We use [pre-commit](http://pre-commit.com/) to help ensure consistent, clean code. The pip package should already be installed from a prior setup step, but you need to install the git hooks using this command.

```bash
pre-commit install
```

_Note: you may need to run `pip install pre-commit` if you see `pre-commit command not found`_



### 4. Install javascript dependencies

As described above, Kolibri Studio has dependencies that rely on Node.js version 10.x. You'll also need [yarn](https://yarnpkg.com/lang/en/docs/install) installed.

All the javascript dependencies are listed in `package.json`. To install them run the following [yarn](https://yarnpkg.com/en/) command:

```bash
yarn install
```

This may take a long time.

If you encounter a `ESOCKETTIMEDOUT` error related to `material-design-icons`, you can increase your timeout by setting `network-timeout 600000` inside `~/.yarnrc`.


### 5. Set up the database and start redis

Install [postgres](https://www.postgresql.org/download/) if you don't have it already. If you're using a package manager, you need to make sure you install the following packages: `postgresql`, `postgresql-contrib`, and `postgresql-server-dev-all` which will be required to build `psycopg2` python driver.

Make sure postgres is running:

```bash
service postgresql start
# alternatively: pg_ctl -D /usr/local/var/postgresql@9.6 start
```

Start the client with:

```bash
sudo su postgres  # switch to the postgres account
psql  # mac: psql postgres
```

Create a database user with username `learningequality` and password `kolibri`:

```sql
CREATE USER learningequality with NOSUPERUSER INHERIT NOCREATEROLE CREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'kolibri';
  ```

Create a database called `kolibri-studio`:

```sql
CREATE DATABASE "kolibri-studio" WITH TEMPLATE = template0 ENCODING = "UTF8" OWNER = "learningequality";
```

Press <kbd>Ctrl</kbd>+<kbd>D</kbd> to exit the `psql` client. Finally

```bash
exit  # leave the postgres account
```

To start redis on Linux-based systems, run the following command

```bash
service redis-server start
```

On Mac, it will be started as part of the `yarn run services` command (detailed below).

### 6. Run all database migrations and load constants

These commands setup the necessary tables and contents in the database.


In one terminal, run all external services:

```bash
yarn run services
```

In another terminal, run devsetup to create all the necessary tables and buckets:

```bash
yarn run devsetup
```

When this completes, close the second tab and kill the services.


### 7. Start the dev server

You're all set up now, and ready to start the Studio local development server:

On *Macs only* run this in another terminal first:

```bash
yarn run services
```

Start the server:

```bash
yarn run devserver
```

Once you see the following output in your terminal, the server is ready:

```
Starting development server at http://0.0.0.0:8080/
Quit the server with CONTROL-C.
```

You should be able to login at http://127.0.0.1:8080 using email `a@a.com`, password `a`.

_Note: If you are using a Linux environment, you may need to increase the amount of listeners to allow the `watch` command to automatically rebuild static assets when you edit them. Please see [here for instructions](https://github.com/guard/listen/wiki/Increasing-the-amount-of-inotify-watchers) on how to do so._


## Running tests

You can run tests using the following command:

```bash
yarn run test
```

For more testing tips, please check out [docs/running_tests](docs/running_tests.md).


## Profiling and local production testing

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


## Linting
Front-end linting is run using:

```bash
yarn run lint-all
```

Some linting errors can be fixed automatically by running:

```bash
yarn run lint-all:fix
```

Make sure you've set up pre-commit hooks by following the instructions [here](#3-install-pre-commit-hooks).  This will ensure that linting is automatically run on staged changes before every commit.

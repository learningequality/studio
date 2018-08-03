# Kolibri Studio

Kolibri Studio is a web application and content repository designed to deliver
educational materials to [Kolibri](http://learningequality.org/kolibri/) apps.
Kolibri Studio supports the following workflows:
  - Create, edit, organize, and publish content channels in the format suitable
    for import from Kolibri.
  - Content curation and remixing of existing channels into custom channels
    aligned to various educational standards, country curricula, and special needs.
  - New content can be upload through the web interface or using programatically
    using `ricecooker`-powered chef scripts.

Kolibri Studio uses Django for the backend and Backbone.js for the frontend.


## Getting a local preview of Studio

One of Kolibri Studio's deployment methods use Kubernetes and Docker. If you want a
quick and easy way to get Studio up and running with minimal configuration,
this is the method you want to use. This works best on a Linux or MacOS machine.

## Prerequisites

Download the following applications on to your local machine, in order:

- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/), the program
to control Kubernetes clusters.

- [Docker](https://docs.docker.com/install/), the containerization platform LE uses.

- [Helm](https://www.helm.sh/), an abstracting application on top
  of kubectl to make deployments easier.

- [Minikube](https://github.com/kubernetes/minikube#installation), an
application to get a local Kubernetes cluster up and running.

- [Virtualbox](https://www.virtualbox.org), the Virtual Machine runner that Minikube
will use to run Kubernetes.



### Deploying on Minikube

Follow each of these steps in your terminal to get a local Studio deployment
in a cluster on your local machine:

  1. Clone the Studio repo to your local machine:


  ```bash
  $ git clone https://github.com/learningequality/studio
  $ cd studio/
  ```

  1. Go to the `k8s/` directory in the Kolibri studio repo:

  ```bash
  $ cd k8s/
  ```

  1. Get your local Kubernetes cluster up and running using Minikube:

  ```bash
  $ minikube start --kubernetes-version v1.8.0
  ```

  This should start the Kubernetes cluster, and set up kubectl to
  refer to the minikube cluster.

  1. Point the docker command to the docker daemon running in Minikube:

  ```bash
  $ eval $(minikube docker-env)
  ```

  1. Build the docker images:

  ```bash
  $ make build
  ```

  1. Initialize your Kubernetes cluster with Helm, to allow it to deploy Kubernetes manifests:

  ```
  $ helm init
  ```

  1. Use the images to deploy Kolibri Studio:

  ```
  $ helm upgrade --install mystudio .
  ```

  1. Once Studio is ready to use (it should take about a minute), run this command:

  ```
  $ minikube service mystudio-studio-app --url
  ```

  and open the IP address displayed, in to your browser. You should now see the Studio login page!



## Developer instructions

Follow the instructions below to setup your dev environment and get started.


### Get the code

  - Fork the [studio repo](https://github.com/learningequality/studio) to create
    a copy of the studio repository under your own username on github.
    Note: the code examples below assume your username is `yourusername`, please
    modify and replace with your own user name before running the commands.

  - Clone your fork of the repository to your local machine:

        cd MyCodingProjectsDir
        git clone git@github.com:yourusername/studio.git

  - The folder `MyCodingProjectsDir/studio` now contains the latest Studio code.



### Setting up your local development environment

#### Using docker-compose to set up your environment

##### Prerequisites

You need to install the latest [Docker edition](https://www.docker.com/community-edition).
Make sure it comes with the `docker-compose` executable.

To set up your environment, run `docker-compose up`. It will download all service images needed,
and build the dev environment for Studio under another image. Once all images are pulled, built and
containers started from them, visit `localhost:8080` in your browser, and you should see the Studio
interface!

#### Setting up your environment manually

##### Install software prerequisites

You need the following software installed on your machine to run Studio:
  - python (2.7)
  - python-pip
  - nodejs
  - Postgres DB
  - redis
  - nodejs
  - minio
  - nginx
  - ffmpeg
  - python-tk
  - libmagickwand-dev


On Ubuntu or Debian, you can install all the necessary packages using these commands:

    # install minio
    wget https://dl.minio.io/server/minio/release/linux-amd64/minio -O /usr/local/bin/minio
    chmod +x /usr/local/bin/minio

    # install node PPA
    curl -sL https://deb.nodesource.com/setup_6.x | bash -

    apt-get install -y  python python-pip python-dev python-tk \
        postgresql-server-dev-all postgresql-contrib postgresql-client postgresql \
        ffmpeg nodejs libmagickwand-dev nginx redis-server

On Windows, you'll need to download and install Postgres and Redis manually.

On Mac OS X, you can install the corresponding packages using Homebrew:

    brew install  postgresql@9.6 redis node ffmpeg imagemagick@6 gs
    brew install minio/stable/minio
    brew link --force postgresql@9.6
    brew link --force imagemagick@6



##### Set up python dependencies through pipenv

    pip install -U pipenv
    pipenv install


The file `requirements_dev.txt` contains dependencies that will be helpful for
development and required when using the `--settings=contentcuration.dev_settings`
flag to run the server in development mode.

Pytest and other test related dependencies are stored in `requirements_test.txt`.

##### Install javascript dependencies

All the javascript dependencies are listed in `package.json`. To install them run:

    npm install -g yarn
    yarn install



##### Set up the database and start redis

  1. Install [postgres](https://www.postgresql.org/download/) if you don't have
     it already. If you're using a package manager, you need to make sure you install
     the following packages: `postgresql`, `postgresql-contrib`, and `postgresql-server-dev-all`
     which will be required to build `psycopg2` python driver.

  2. Make sure postgres is running

         service postgresql start
         # or pg_ctl -D /usr/local/var/postgresql@9.6 start

  3. Create a database user with username `learningequality` and password `kolibri`:

         sudo su postgres
         psql
         # mac: psql postgres
           CREATE USER learningequality with NOSUPERUSER INHERIT NOCREATEROLE CREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'kolibri';

  4. Create a database called `gonano`

         CREATE DATABASE "gonano" WITH TEMPLATE = template0 OWNER = "learningequality";

  5. Make sure the Redis server is running (used for job queue)

         service redis-server start
         # mac: redis-server /usr/local/etc/redis.conf

  6. Start the minio server

        MINIO_ACCESS_KEY=development MINIO_SECRET_KEY=development minio server ~/.minio_data



##### Run all database migrations and load constants

You'll only need to run these commands once, to setup the necessary tables and
constants in the database:

    make migrate collectstatic
    cd contentcuration; python manage.py setup --settings=contentcuration.dev_settings; cd ..

##### Start the dev server

You're all setup now, and ready to start the Studio local development server:

    make devserver

This will start any of the required services (e.g. postgres, redis, minio) that are not already running.
Once you see the following output in your terminal, the server is ready:

    Starting development server at http://0.0.0.0:8080/
    Quit the server with CONTROL-C.

You should be able to login at http://127.0.0.1:8080 using email `a@a.com`, password `a`.

##### Start required services manually

Although calling `make devserver` will start the necessary services for you, sometimes it will be useful to start the
services manually. To do so, you can run the following command:

    yarn run services

Make sure to run this command in a separate terminal from the one you run Studio on, as it will continue running until
you force quit it. If you want to see how to start each individual service, check the services command in `package.json`
to learn more.

##### Running tests
Make sure you've installed the test requirements, setup a virtual environment, and started the minio server. Then, to
run python tests:

To run all unit tests:

    yarn run unittests

To run all integration tests:

    yarn run apptests

Finally, to run all tests:

    yarn run test

##### Customizing Test Runs and Output

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

##### Automatically running tests during development
For running tests continuously during development, pytest-watch is included.  This works well with the `--reuse-db` option:

    ptw contentcuration -- --reuse-db

The extra `--` is required for passing pytest options through pytest-watch.  Sometimes you might want to quickly rerun an isolated set of tests while developing a new feature.  You could do something like this:

    ptw contentcuration/contentcuration/tests/test_megaboard.py -- -s --reuse-db

##### Emulating the Travis CI environment
To emulate the Travis CI environment locally:

    docker-compose run studio-app make test

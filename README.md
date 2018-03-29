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

- [ksonnet](https://ksonnet.io/#get-started), an abstracting application on top
  of kubectl to make deployments easier.

- [Minikube](https://github.com/kubernetes/minikube#installation), an 
application to get a local Kubernetes cluster up and running.


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
  
  1. Point ksonnet to the cluster by creating a new environment:

  ```
  $ ks env add test
  ```

  1. Use the images to deploy Kolibri Studio:
  
  ```
  $ ks apply test
  ```
  
  1. Once Studio is ready to use (it should take about a minute), run this command:
  
  ```
  $ minikube service studio-app --url
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

#### Install software prerequisites

You need the following software installed on your machine to run Studio:
  - python (2.7)
  - python-pip
  - nodejs
  - Postgres DB
  - redis
  - ffmpeg
  - python-tk
  - libmagickwand-dev


On Ubuntu or Debian, you can install all the necessary packages using this command:

    apt-get install -y  python python-pip python-dev python-tk \
        postgresql-server-dev-all postgresql-contrib postgresql-client postgresql \
        ffmpeg nodejs libmagickwand-dev

On Windows, you'll need to download and install Postgres and Redis manually.

On Mac OS X, you can install the corresponding packages using Homebrew:

    brew install  postgresql@9.6 redis node ffmpeg imagemagick@6 gs
    brew link --force postgresql@9.6
    brew link --force imagemagick@6



#### Set up python dependencies in a virtual environment

    virtualenv -p python2.7 venv
    source venv/bin/activate
    pip install -r requirements.txt
    pip install -r requirements_dev.txt

The file `requirements_dev.txt` contains dependencies that will be helpful for
development and required when using the `--settings=contentcuration.dev_settings`
flag to run the server in development mode.


#### Install javascript dependencies

All the javascript dependencies are listed in `package.json`. To install them run:

    npm install



#### Set up the database and start redis

  1. Install [postgres](https://www.postgresql.org/download/) if you don't have
     it already. If you're using a package manager, you need to make sure you install
     the following packages: `postgresql`, `postgresql-contrib`, and `postgresql-server-dev-all`
     which will be required to build `psycopg2` python driver.

  2. Make sure postgres is running. 
     
         service postgresql start
         # or pg_ctl -D /usr/local/var/postgresql@9.6 start
     
  3. Create a database user with username `learningequality` and password `kolibri`:
     
         sudo su postgres
         psql
           CREATE USER learningequality with NOSUPERUSER INHERIT NOCREATEROLE CREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'kolibri';

  4. Create a database called `contentcuration`
     
         CREATE DATABASE "contentcuration" WITH TEMPLATE = template0 OWNER = "learningequality";

  5. Make sure the Redis server is running (used for job queue)

         service redis-server start
         # mac: redis-server /usr/local/etc/redis.conf



#### Run all database migrations and load constants

You'll only need to run these commands once, to setup the necessary tables and
constants in the database:

    cd contentcuration
    python manage.py makemigrations
    python manage.py migrate --settings=contentcuration.dev_settings
    python manage.py loadconstants --settings=contentcuration.dev_settings
    python manage.py calculateresources --settings=contentcuration.dev_settings --init
    python manage.py collectstatic --noinput --settings=contentcuration.dev_settings
    python manage.py collectstatic_js_reverse --settings=contentcuration.dev_settings

For your convenience, we've prepared an admin user fixture with username 
`content@learningequality.org` and password `admin123` for you. Load it using:

    python manage.py \
      loaddata contentcuration/contentcuration/fixtures/admin_user.json \
      --settings=contentcuration.dev_settings

You can also load admin user token `26a51f88ae50f4562c075f8031316eff34c58eb8`:

    python manage.py \
      loaddata contentcuration/contentcuration/fixtures/admin_user_token.json \
      --settings=contentcuration.dev_settings

This token is used to authenticate API calls, like when using `ricecooker` scripts.


#### Start the dev server

You're all setup now, and ready to start the Studio local development server:

    python manage.py runserver --settings=contentcuration.dev_settings

You should be able to login at http://127.0.0.1:8000 using `content@learningequality.org:admin123`.

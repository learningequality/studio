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

    brew install  postgresql@9.6 redis node ffmpeg
    brew link --force postgresql@9.6



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
         # mac: psql postgres
           CREATE USER learningequality with NOSUPERUSER INHERIT NOCREATEROLE CREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'kolibri';

  4. Create a database called `gonano`
     
         CREATE DATABASE "gonano" WITH TEMPLATE = template0 OWNER = "learningequality";

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
    python manage.py setup --settings=contentcuration.dev_settings


#### Start the dev server

You're all setup now, and ready to start the Studio local development server:

    python manage.py runserver --settings=contentcuration.dev_settings

You should be able to login at http://127.0.0.1:8000 using email `a@a.com`, password `a`.

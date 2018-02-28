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


### Get the code and configuring git remotes

  - Fork the [studio repo](https://github.com/learningequality/studio) to create
    a copy of the studio repository under your own username on github.
    Note: the code examples below assume your username is `yourusername`, please
    modify and replace with your own user name before running the commands.

  - Clone your fork of the repository to your local machine:
         
        cd MyCodingProjectsDir
        git clone git@github.com:yourusername/studio.git
  
  - Add the main Learning Equality studio repository as the `upstream` remote:
    
        cd studio
        git remote add upstream git@github.com:learningequality/studio.git
    
    Run the command `git remote -v` to confirm that your repo now has two remotes:
    Make sure `origin` refers to your remote repository, `yourusername/studio.git`
    and `upstream` refers to `learningequality/studio.git`.

  - To complete your git setup, you must setup your local develop branch to track
    changes from the `upstream/develop` branch, so that you will always have the
    latest version of the development code. Run the following commands:
    
        git fetch upstream
        git checkout -b tmp
        git branch -D develop
        git checkout -t upstream/develop
        git branch -D tmp
    
    To verify the above steps worked correctly, examine the file `.git/config`
    and confirm that the remote listed for the `develop` branch is `upstream`.

  - From now on, when you want to update your local develop branch you can run:
        
        git checkout develop
        git pull
        
    Since your branch `develop` is setup to track `upstream/develop` you don't
    need to specify remote and branch name arguments to the git pull command.



### Branches, files, commits, and pull requests

You should not be making changes to the `develop` branch directly. Instead, you
should use separate git branch for each code contribution you want to make.
Use short, descriptive name for the branches, e.g., `fix/problem` for a bugfix,
`feature/smthnew` for a new feature, or `docs/someinfo`.

Suppose you want to add support for content "Z" to Kolibri Studio. Here are the
sequence of commands you'll need to use, to setup a feature branch for this:

    git checkout develop
    git pull  # to make sure your develop branch is up to date with upstream/develop
    git checkout -b feature/contentZ

Next, make all the edits and changes to the code on the branch `feature/contentZ`.
After modifying some files, you can add and commit them using:

    git add some/specific/file.py   # add one file
    git add .                       # add all files changed
    git commit -m"message that explains what your code accomplished"

Running `git add` and `git commit` saves the changes to your local git repository.
You need to run `git push` to push your changes to your github repository.
The first time you push, you'll need to run the command:

    git push --set-upstream origin feature/contentZ

After this command, the link between your local branch `feature/contentZ` and the
remote branch `feature/contentZ` inside `yourusername/studio.git` will be established
so any subsequent commits can be pushed using:

    git push

If you're ever confused about which commits exist on your local branch, and on
the remote branch, run this command to show a graphical overview:

    git log --oneline --all --graph

Once you feel your work on the Content Z feature is complete, you can open a pull request
using the "New pull request" button on [this page](https://github.com/learningequality/studio/pulls).
Choose the `develop` branch as the base target for your pull request.
This will start the code review process and get your code merged in!

To learn more about the git, pull request, rebasing, and coding conventions used at LE,
check out [this doc](https://docs.google.com/document/d/10Ynlk6kJFcW3UP9HEVBBXYudcFnSLzMjaBXF_9xuERU/edit?usp=sharing).




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


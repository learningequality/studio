# Manually installing dependencies

## Install

Rather than using Docker, it is also possible to manually install the dependencies on your host machine or in a virtual machine. These dependencies include:

  - [python (3.6)](https://www.python.org/downloads/release/python-3612/)
  - [python-pip](https://pip.pypa.io/en/stable/installing/)
  - [nodejs (16.x)](https://nodejs.org/en/download/)
  - [Postgres DB (12.x)](https://www.postgresql.org/download/)
  - [redis (6.x)](https://redis.io/topics/quickstart)
  - [minio server](https://www.minio.io/downloads.html)
  - [nginx](https://www.nginx.com/resources/wiki/start/topics/tutorials/install/)
  - [ffmpeg](https://www.ffmpeg.org/)
  - [python-tk](https://wiki.python.org/moin/TkInter)
  - [libmagickwand-dev](http://docs.wand-py.org/en/0.2.4/guide/install.html)
  - [yarn](https://yarnpkg.com/lang/en/docs/install)

You can also use `nodeenv` (which is included as a python development dependency below) or `nvm` to install Node.js 16.x if you need to maintain multiple versions of node:

* http://ekalinin.github.io/nodeenv/
* https://github.com/creationix/nvm

### Ubuntu or Debian

You can install all the necessary packages using these commands (you may need to add `sudo` if you receive `Permission Denied` errors:

```bash
# Install minio
wget https://dl.minio.io/server/minio/release/linux-amd64/minio -O /usr/local/bin/minio
chmod +x /usr/local/bin/minio

# Install node PPA
curl -sL https://deb.nodesource.com/setup_16.x | bash -

# Install packages
apt-get install -y  python python-pip python-dev python-tk \
    postgresql-server-dev-all postgresql-contrib postgresql-client postgresql-12 \
    ffmpeg nodejs libmagickwand-dev nginx redis-server wkhtmltopdf
```

### Mac OS X

You can install the corresponding packages using Homebrew:

```bash
brew install  postgresql@12 redis node ffmpeg imagemagick@6 gs
brew install minio/stable/minio
brew link --force postgresql@12
brew link --force imagemagick@6
```

### Windows

Windows is no longer supported due to incompatibilities with some of the required packages.


## Set up the database

Install [postgres](https://www.postgresql.org/download/) if you don't have it already. If you're using a package manager, you need to make sure you install the following packages: `postgresql-12`, `postgresql-contrib`, and `postgresql-server-dev-all` which will be required to build `psycopg2` python driver.

Make sure postgres is running:

```bash
service postgresql start
# alternatively: pg_ctl -D /usr/local/var/postgresql@12 start
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

## Run all database migrations and load constants

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


## Start the dev server

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

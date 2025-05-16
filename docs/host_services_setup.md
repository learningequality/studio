# Supplemental instructions for host services

This guide is a supplement to Kolibri Studio's [local development instructions](./local_dev.md) and provides additional notes and instructions for setting up Kolibri Studio's services manually.

## Prerequisites

## Install system dependencies and services

### Ubuntu or Debian
```bash
# Install packages
sudo apt-get install -y python-tk \
    postgresql-server-dev-all postgresql-contrib postgresql-client postgresql-16 \
    ffmpeg libmagickwand-dev redis-server wkhtmltopdf

# Install minio
wget https://dl.minio.io/server/minio/release/linux-amd64/minio -O bin/minio
sudo chmod +x bin/minio
```

### Mac OS
```bash
brew install postgresql@16 redis ffmpeg imagemagick@6 gs
# note, this version of minio may not be compatible with Studio
brew install minio/stable/minio
brew link --force postgresql@16
brew link --force imagemagick@6
```

### Windows

**Note:** Windows is no longer supported due to incompatibilities with some required packages. If you are developing on Windows, it is recommended to use WSL (Windows Subsystem for Linux). Please follow the [WSL setup guide](./local_dev_wsl.md) for detailed instructions.

## Set up the database

Once you've started postgres, access the postgres client with:

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

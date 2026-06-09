# Local development instructions: Run everything on your host machine

This guide will walk through setting up Kolibri Studio for local development, where you'll run Studio's Python apps and all of Studio's services on your host machine, without the need for docker.

**Note:** If you are developing on Windows, it is recommended to use WSL (Windows Subsystem for Linux). Please follow the [WSL setup guide](./local_dev_wsl.md) for detailed instructions.

## Prerequisites
- [volta](https://docs.volta.sh/guide/getting-started)
- [uv](https://docs.astral.sh/uv/) - Python package installer and virtual environment manager

## Install system dependencies and services
Studio requires some background services to be running:

* Minio - a local S3 storage emulation
* PostgreSQL - a relational database
* Redis - a fast key/value store useful for caching

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

Windows is no longer supported due to incompatibilities with some required packages.

## Set up the database

Make sure postgres is running:

```bash
service postgresql start
# alternatively: pg_ctl -D /usr/local/var/postgresql@16 start
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

## Build your python virtual environment

Studio uses [uv](https://docs.astral.sh/uv/) for Python dependency management and virtual environments. To set up your development environment:

```bash
# Create a virtual environment with uv (this will use the system Python or uv-managed Python)
uv venv --seed

# Activate the virtual environment
source .venv/bin/activate
```

Now you may install Studio's Python dependencies:
```bash
uv pip sync requirements.txt requirements-dev.txt
```

To deactivate the virtual environment, when you're finished developing on Studio for the time being:
```bash
deactivate
```

### A note about `psycopg2`
The packages `postgresql-16`, `postgresql-contrib`, and `postgresql-server-dev-all` are required to build `psycopg2` python driver.

### A note about dependencies on Apple Silicon M1+
If you run into an error with `pip install` related to the `grcpio` package, it is because it currently [does not support M1 with the version for `grcpio` Studio uses](https://github.com/grpc/grpc/issues/25082). In order to fix it, you will need to add the following environmental variables before running `pip install`:
```bash
export GRPC_PYTHON_BUILD_SYSTEM_OPENSSL=1
export GRPC_PYTHON_BUILD_SYSTEM_ZLIB=1
export CFLAGS="-I/opt/homebrew/opt/openssl/include"
export LDFLAGS="-L/opt/homebrew/opt/openssl/lib"
```

## Install frontend dependencies
The project requires `Node 20.X` as the runtime and `pnpm` as the package manager. We make use of [`Volta`](https://docs.volta.sh/guide/getting-started) to manage the same automatically. Please make sure you have volta installed and your shell configured to use volta. You can then install all the dependencies by running:
```bash
corepack use pnpm # or `volta install pnpm`
pnpm install
```

## Run the services

Having installed all the necessary services, initialized your python virtual environment, and installed `pnpm`, you're now ready to start the services. Generally speaking, you'll want to open a separate terminal/terminal-tab to run the services. The following will ensure all services are started, in addition to starting the celery workers service:
```bash
pnpm run services
```

## Initializing Studio
With the services running, in a separate terminal/terminal-tab, we can now initialize the database for Studio development purposes. The command below will initialize the database, in addition to adding a user account for development:
```bash
pnpm run devsetup
```

## Running the development server
With the services running, in a separate terminal/terminal-tab, and the database initialized, we can start the dev server:
```bash
pnpm run devserver:hot  # with Vue hot module reloading
# or
pnpm run devserver  # without hot module reloading
```

Either of the above commands will take a few minutes to build the frontend. When it's done, you can sign in with the account created by the `pnpm run devsetup` command:
- url: `http://localhost:8080/accounts/login/`
- username: `a@a.com`
- password: `a`

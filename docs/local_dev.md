# Local development instructions

The following guide follows the preferred method of running Kolibri Studio locally for development purposes. This guide allows you to run all of Studio's services in docker containers, and the python and webpack servers on your host.

**Note:** If you are developing on Windows or would rather take a manual approach to installation, please see the supplemental documentation in the [WSL setup guide](./local_dev_wsl.md) and [host services setup guide](./host_services_setup.md).

## Prerequisites
The following tools are required to run Studio locally:
- [git](https://git-scm.com/)
- [docker engine](https://docs.docker.com/engine/install/) (community edition)
- [docker Compose](https://docs.docker.com/compose/install/)
- [volta](https://docs.volta.sh/guide/getting-started)
- [pyenv](https://kolibri-dev.readthedocs.io/en/develop/howtos/installing_pyenv.html) and [pyenv-virtualenv](https://github.com/pyenv/pyenv-virtualenv#installation)

## Build your python virtual environment
Once you've cloned the repository, you can set up a python virtual environment using `pyenv` and `pyenv-virtualenv`. This is the recommended way to manage your python versions and virtual environments.

To determine what version of Python studio needs, you can check the `runtime.txt` file:
```bash
$ cat runtime.txt
# This is the required version of Python to run Studio currently.
# This is determined by the default Python 3 version that is installed
# inside Ubuntu Bionic, which is used to build images for Studio.
# We encode it here so that it can be picked up by Github's dependabot
# to manage automated package upgrades.
python-3.10.13
```

So to install python 3.10.13 through `pyenv` and set up a virtual environment:
```bash
pyenv install 3.10.13
pyenv virtualenv 3.10.13 studio-py3.10
pyenv activate studio-py3.10
```

Now you may install Studio's Python dependencies:
```bash
pip install -r requirements.txt -r requirements-dev.txt
```

To deactivate the virtual environment, when you're finished developing on Studio for the time being:
```bash
pyenv deactivate
```

### A note about `psycopg2`
The packages `postgresql-16`, `postgresql-contrib`, and `postgresql-server-dev-all` may be required to build the `psycopg2` python driver.

### A note about dependencies on Apple Silicon M1+
If you run into an error with `pip install` related to the `grcpio` package, it is because it currently [does not support M1 with the version for `grcpio` Studio uses](https://github.com/grpc/grpc/issues/25082). In order to fix it, you will need to add the following environmental variables before running `pip install`:
```bash
export GRPC_PYTHON_BUILD_SYSTEM_OPENSSL=1
export GRPC_PYTHON_BUILD_SYSTEM_ZLIB=1
export CFLAGS="-I/opt/homebrew/opt/openssl/include"
export LDFLAGS="-L/opt/homebrew/opt/openssl/lib"
```

## Install frontend dependencies
The project requires `Node 18.X` as the runtime and `pnpm` as the package manager. You can make use of [`Volta`](https://docs.volta.sh/guide/getting-started) to manage the nodejs version, and pnpm with a few extra steps.

### Volta installation of pnpm
If you have Volta installed, you can use it to install pnpm:
```bash
export VOLTA_FEATURE_PNPM=1
volta install pnpm
```

### Corepack installation of pnpm
If you have Corepack installed, you can use it to install pnpm:
```bash
corepack enable
corepack install
```

### Completing the installation
Once `pnpm` is installed, you can install all the dependencies by running:
```bash
pnpm install
```

## Install and run services

Studio requires some background services to be running:

* Minio - a local storage emulation
* PostgreSQL (postgres) - a relational database
* Redis - a fast key/value store useful for caching
* Celery - the task manager and executor, which relies on the Studio codebase

Before starting the services, you'll want to make sure any other services that may be using the same ports are stopped. For example, if you have a local postgres server running, you'll want to stop it before starting the docker-based services.

Generally speaking, you'll want to open a separate terminal/terminal-tab to run the services. With docker and docker-compose installed, running the above services is as easy as:
```bash
make devrun-services
```

The above command may take longer the first time it's run. It includes starting the `celery` workers (please see 'Running the celery service' section below). You may use the following commands to start the services and the celery workers separately:

```bash
make dcservicesup
make devceleryworkers
```

To confirm that docker-based services are running, you should see three or more containers when executing `docker ps`. For example:

```bash
> docker ps
CONTAINER ID        IMAGE                             COMMAND                  CREATED             STATUS              PORTS                    NAMES
e09c5c203b93        redis:6.0.9                       "docker-entrypoint.s…"   51 seconds ago      Up 49 seconds       0.0.0.0:6379->6379/tcp   studio_vue-refactor_redis_1
6164371efb6b        minio/minio                       "minio server /data"     51 seconds ago      Up 49 seconds       0.0.0.0:9000->9000/tcp   studio_vue-refactor_minio_1
c86bbfa3a59e        postgres:12.10                      "docker-entrypoint.s…"   51 seconds ago      Up 49 seconds       0.0.0.0:5432->5432/tcp   studio_vue-refactor_postgres_1
```

To stop the services, press <kbd>Ctrl</kbd> + <kbd>C</kbd> in the terminal where you ran `make devrun-services` (or `dcservicesup`). Once you've done that, you may run the following command to remove the docker containers (they will be recreated when you run `devrun-services` or `dcservicesup` again):
```bash
make dcservicesdown
```

Lastly, the volumes used by minio and postgres are not removed when you run `dcservicesdown`. If you want to remove them, you can run the following command:
```bash
make dcclean
```

## Initializing Studio
With the services running, in a separate terminal/terminal-tab, we can now initialize the database for Studio development purposes. The command below will initialize the database tables, import constants, enable required postgres extensions and a studio user account for development:
```bash
make devrun-setup
```

## Running the development server
With the services running, in a separate terminal/terminal-tab, and the database initialized, we can start the dev server:
```bash
make devrun-server-hot  # with Vue hot module reloading
# or
make devrun-server  # without hot module reloading
```

### Running within docker
If you want to run the development server within docker, you can use the following command:
```bash
make dcup
```

Either of the above commands will take a few moments to build the frontend. When it finishes, you can sign in with the account created by the `make devrun-setup` command:
- url: `http://localhost:8080/accounts/login/`
- username: `a@a.com`
- password: `a`

## Running the celery service
Studio uses `celery` for executing asynchronous tasks, which are integral to Studio's channel editing architecture. The celery service does not reload when there are Python changes like the Django devserver does, so it's often preferred to run it separately. If you are developing changes against a task or the celery configuration, you'll need to use `make dcservicesup` to run only the docker-based services.

In a separate terminal/terminal-tab, run the following to start the service and press <kbd>Ctrl</kbd> + <kbd>C</kbd> to stop it:
```bash
make devceleryworkers
```

Stop and restart the above to reload your changes.

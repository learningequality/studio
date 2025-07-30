# Local development instructions: With Docker (recommended)

The following guide utilizes docker and docker-compose to run select services required for Studio to function. It's our recommended setup. However, if you would rather install these services on your host, please follow the [host-setup guide](./local_dev_host.md).

**Note:** If you are developing on Windows, it is recommended to use WSL (Windows Subsystem for Linux). Please follow the [WSL setup guide](./local_dev_wsl.md) for detailed instructions.

## Prerequisites
For detailed instructions on installing and configuring Volta, pyenv, and pyenv-virtualenv, please see the [Prerequisites](./local_dev_host.md#prerequisites) section in our Local Development with host guide.

## Build your python virtual environment
For complete instructions on installing Python 3.10.13, creating and activating the virtual environment, and installing Studio’s Python dependencies, please refer to the [Build Your Python Virtual Environment](./local_dev_host.md#build-your-python-virtual-environment) section in our Local Development with host guide.


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

## Install and run services

Studio requires some background services to be running:

* Minio - a local S3 storage emulation
* PostgreSQL (postgres) - a relational database
* Redis - a fast key/value store useful for caching
* Celery - the task manager and executor, which relies on the Studio codebase

Generally speaking, you'll want to open a separate terminal/terminal-tab to run the services. With docker and docker-compose installed, running the above services is as easy as:
```bash
make run-services
```

The above command may take longer the first time it's run. It includes starting the `celery` workers, and the other dependent services through docker, which can be done separately with the following two commands:

```bash
make dcservicesup
make devceleryworkers
```

To confirm that docker-based services are running, you should see three containers when executing `docker ps`. For example:

```bash
> docker ps
CONTAINER ID        IMAGE                             COMMAND                  CREATED             STATUS              PORTS                    NAMES
e09c5c203b93        redis:6.0.9                       "docker-entrypoint.s…"   51 seconds ago      Up 49 seconds       0.0.0.0:6379->6379/tcp   studio_vue-refactor_redis_1
6164371efb6b        minio/minio                       "minio server /data"     51 seconds ago      Up 49 seconds       0.0.0.0:9000->9000/tcp   studio_vue-refactor_minio_1
c86bbfa3a59e        postgres:12.10                      "docker-entrypoint.s…"   51 seconds ago      Up 49 seconds       0.0.0.0:5432->5432/tcp   studio_vue-refactor_postgres_1
```

To stop the services, press <kbd>Ctrl</kbd> + <kbd>C</kbd> in the terminal where you ran `make run-services` (or `dcservicesup`). Once you've done that, you may run the following command to remove the docker containers (they will be recreated when you run `run-services` or `dcservicesup` again):
```bash
make dcservicesdown
```

## Initializing Studio
With the services running, in a separate terminal/terminal-tab, we can now initialize the database for Studio development purposes. The command below will initialize the database tables, import constants, enable required postgres extensions and a studio user account for development:
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

Either of the above commands will take a few moments to build the frontend. When it finishes, you can sign in with the account created by the `pnpm run devsetup` command:
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

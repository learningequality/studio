## What is this directory?
This directory is a space for mounting directories to docker containers, allowing the mounts to be specified in committed code, but the contents of the mounts to remain ignored by git.

### postgres
The `postgres` directory is mounted to `/docker-entrypoint-initdb.d`. Any `.sh` or `.sql` files will be executed when the container is first started with a new data volume. You may read more regarding this functionality on the [Docker Hub page](https://hub.docker.com/_/postgres), under _Initialization scripts_.

When running docker services through the Makefile commands, it specifies a docker-compose project name that depends on the name of the current git branch. This causes the volumes to change when the branch changes, which is helpful when switching between many branches that might have incompatible database schema changes. The downside is that whenever you start a new branch, you'll have to re-initialize the database again, like with `pnpm run devsetup`. Creating a SQL dump from an existing, initialized database and placing it in this directory will allow you to skip this step.

To create a SQL dump of your preferred database data useful for local testing, run `make .docker/postgres/init.sql` while the docker postgres container is running.

> Note: you will likely need to run `make migrate` to ensure your database schema is up-to-date when using this technique.

#### pgpass
Stores the postgres authentication for the docker service for scripting access without manually providing a password, created by `make .docker/pgpass`

### minio
The `minio` directory is mounted to `/data`, since it isn't necessarily useful to have this data isolated based off the current git branch.

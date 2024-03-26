# Local development tools

## Running tests

With Studio's services running, you may run tests with the following commands:

```bash
# backend
make test
# frontend
yarn run test
```

View [more testing tips](./running_tests.md)

## Linting

Front-end linting is run using:

```bash
yarn run lint-frontend
```

Some linting errors can be fixed automatically by running:

```bash
yarn run lint-frontend:format
```

Make sure you've set up pre-commit hooks as described above. This will ensure that linting is automatically run on staged changes before every commit.

## Profiling and local production testing

If you want to test the performance of your changes, you can start up a local server with settings closer to a production environment like so:

```bash
# build frontend dependencies
yarn run build
# run the server (no webpack)
yarn run runserver
# or for profiling production more closely
yarn run runserver:prod-profiling
```

Once the local production server is running, you can also use Locust to test your changes under scenarios of high demand like so:

```bash
cd deploy/chaos/loadtest
make timed_run
make stop_slaves  # mac: killall python
```

### Profiling

In case you need to profile the application to know which part of the code are more time consuming, there are two different profilers available to work in two different modes. Both will store the profiling output in a directory that's determined by the `PROFILE_DIR` env variable. If  this variable is not set, the output files will be store in a folder called profiler inside the OS temp folder (`/tmp/profile` usually)
Note that both profiling modes are incompatible: you can either use one or the other, but not both at the same time. In case the env variables are set for both modes, _All request profiling mode_ will be used.

#### All requests profiling mode

This mode will create interactive html files with all the profiling information for every request the Studio server receives. The name of the files will contain the total execution time, the endpoint  name and a timestamp.

To activate it an env variable called `PROFILE_STUDIO_FULL` must be set.

Example of use:

`PROFILE_STUDIO_FULL=y yarn runserver`

Afterwards no further treatment of the generated files is needed. You can open directly the html files in your browser.

#### Endpoint profiling mode

When using the _all requests mode_ it's usual that the profile folder is soon full of information for requests that are not interesting for the developer, obscuring the files for specific endpoints.

If an env variable called `PROFILE_STUDIO_FILTER` is used, the profiler will be executed only on the http requests containing the text stated by the variable.

Example of use:

`PROFILE_STUDIO_FILTER=edit yarn localprodserver`

For this case, only html requests having the text _edit_ in their request path will be profiled. The profile folder will not have html files, but binary dump files (with the timestamp as filename) of the profiler information that can be later seen by different profiling tools (`snakeviz` that can be installed using pip is recommended). Also while the server is running,  the ten most time consuming lines of code of the filtered request will be shown in the console where Studio has been launched.

Example of snakeviz use:

`snakeviz /tmp/profile/studio\:20200909161405011678.prof`

will open the browser with an interactive diagram with all the profiling information

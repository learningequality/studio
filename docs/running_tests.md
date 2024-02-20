# Running tests

## Backend tests
Make sure you've installed the requirements in `requirements-dev.txt`, set up a virtual environment, and started Studio's necessary services (postgres, minio, and redis). Then you may use the following command to run backend/Python tests:

    make test

## Frontend tests
Make sure you've installed all frontend requirements (`pnpm install`). Then you may use the following command to run all frontend tests:

    pnpm run test

## Tests within Docker
You may run either of the above in `docker` by using `docker-compose run studio-app`. For example:

    docker-compose run studio-app make test
    docker-compose run studio-app pnpm run test

You may run arbitrary commands in the docker container, including customized test runs like those below, by prepending `docker-compose run studio-app ` to the command.

## Customizing Test Runs and Output

### Backend tests

The Python backend tests use the `pytest` runner. With the `pytest.ini` configuration, the command to run these tests is very simple:

    pytest

By default, pytest is configured to recreate a fresh database every time.  This can be painfully slow!  To speed things up, you can ask pytest to recycle table structures between runs:

    pytest --reuse-db

To execute a subset of all tests, like a specific test you're modifying, you have a couple of options at your disposal. First, `pytest` will accept a path to a test file or directory which limits execution to only those tests in the file path:

    pytest contentcuration/contentcuration/tests/test_utils.py

Another option is to use the `-k` switch to filter by matching test names. For instance, to only run the `test_we_are_testing` in `contentcuration/contentcuration/tests/test_utils.py`:

    pytest -k test_we_are_testing

Or slightly faster if you know which file the test lives:

    pytest -k test_we_are_testing contentcuration/contentcuration/tests/test_utils.py

Lastly, sometimes it's nice to use `print` statements in your tests or code to see what's going on. `pytest` disables print statements by default, but you can disable `pytest` suppression of those messages by passing `-s` to `pytest`.

#### Automatically running tests during development
For running tests continuously during development, `pytest-watch` is included. This works well with the `--reuse-db` option:

    ptw contentcuration -- --reuse-db

### Frontend tests
The JavaScript tests use the `jest` test runner. The `pnpm run test` command automatically includes the `jest` configuration in its invocation of tests. To execute a subset of all tests, like a specific test you're modifying, you may pass along a file path:

    pnpm run test contentcuration/contentcuration/frontend/shared/utils/helpers.spec.js

#### Automatically running tests during development
For running tests continuously during development, we have `pnpm` script which will watch for file changes and re-execute tests when they change:

    pnpm run test-jest:dev

This also supports only a subset of tests, like passing a file:

    pnpm run test-jest:dev contentcuration/contentcuration/frontend/shared/utils/helpers.spec.js

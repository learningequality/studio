# Running tests
Make sure you've installed the test requirements, setup a virtual environment, and started the minio server. Then, to
run python tests:

To run all unit tests:

    yarn run unittests

To run all integration tests:

    yarn run apptests

Finally, to run all tests:

    yarn run test

## Customizing Test Runs and Output

If you want more control while testing, there are several options for customizing test runs.
First, make sure you start services manually in a separate terminal using:

    yarn run services

From there, you can run the unit tests directly by calling:

    pytest contentcuration

By default, pytest is configured to recreate a fresh database every time.  This can be painfully slow!  To speed things up, you can ask pytest to recycle table structures between runs:

    pytest contentcuration --reuse-db

For convenience, you can also use yarn to run the tests this way with the following command:

    yarn run unittests:reusedb

If you do end up changing the schema (e.g. by updating a model), remember to run pytest without the `--reuse-db`.  Or, if you want to be more explicit you can use `--create-db` to ensure that the test database's table structure is up to date:

    pytest contentcuration --create-db

Sometimes it's nice to use print statements in your tests to see what's going on.  Pytest disables print statements by default, but you can show them by passing `-s`, e.g.:

    pytest contentcuration -s --reuse-db

## Automatically running tests during development
For running tests continuously during development, pytest-watch is included.  This works well with the `--reuse-db` option:

    ptw contentcuration -- --reuse-db

The extra `--` is required for passing pytest options through pytest-watch.  Sometimes you might want to quickly rerun an isolated set of tests while developing a new feature.  You could do something like this:

    ptw contentcuration/contentcuration/tests/test_megaboard.py -- -s --reuse-db

## Emulating the Travis CI environment
To emulate the Travis CI environment locally:

    docker-compose run studio-app make test

**NOTE: You may need to run `yarn run services` to run tests**

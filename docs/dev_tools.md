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

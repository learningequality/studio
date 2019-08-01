# Kolibri Studio load testing experiment

# Expected behaviour

- None of the requests will return a 500, 502 or 503 error
- None of the requests will take longer than 20 seconds to return a response

# Steps to run

To run against your local studio instance, simply run:

``` bash
$ make run
```

This pings your localhost:8080 server with 100 clients and a 20 users/sec hatch
rate. You can set each of these parameters for a run.

You can also specify the duration to run the tests for, along with the results
file(s), using the following parameters:

```bash
make run TIME_ARG="-t5m" RESULTS_FILE="--csv=profile_results"
```

To run this script against the Studio staging server, change the `URL`
parameter:

``` bash
$ make run URL=https://develop.studio.learningequality.org
USERNAME=<yourusername> PASSWORD=<yourpassword>
```

To customize the number of clients and the hatch rate, set the `NUM_CLIENTS` and
the `HATCH_RATE` respectively:

``` bash
$ make run NUM_CLIENTS=5 HATCH_RATE=1
```

After stopping it, Locust slaves must be stopped:

```bash
$ make stop_slaves
```

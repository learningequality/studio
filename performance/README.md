# Kolibri Studio performance testing tool

# Getting started

These steps assume a working Studio instance setup:

``` bash
cd contentcuration
python manage.py setup_perftest_data
cd ..
yarn run profileserver
```

# Steps to run

To run against your local studio instance, in another shell simply run:

``` bash
cd performance
python run_perftests.py
```

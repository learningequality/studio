SHELL := /bin/bash

URL := "http://localhost:8080"
USERNAME := ""
PASSWORD := ""
NUM_CLIENTS := 100
HATCH_RATE := 20
TIME_ARG :=
RESULTS_FILE :=

slaves:
	for i in {1..$(NUM_CLIENTS)}; do locust --slave & done

run: slaves
	LOCUST_USERNAME=$(USERNAME) LOCUST_PASSWORD=$(PASSWORD) locust ${RESULTS_FILE} ${TIME_ARG} --host=$(URL) --no-web --clients=$(NUM_CLIENTS) --hatch-rate=$(HATCH_RATE) --expect-slaves=$(NUM_CLIENTS)

timed_run: TIME_ARG := -t5m
timed_run: RESULTS_FILE := --csv=locust_profile
timed_run: run

stop_slaves:
	killall locust

.PHONY: slaves run stop_slaves

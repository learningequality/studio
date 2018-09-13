SHELL := /bin/bash
URL := "http://localhost:8080"
USERNAME := ""
PASSWORD := ""
NUM_CLIENTS := 100
HATCH_RATE := 20

slaves:
	for i in {1..$(NUM_CLIENTS)}; do locust --slave & done

run: slaves
	LOCUST_USERNAME=$(USERNAME) LOCUST_PASSWORD=$(PASSWORD) locust --host=$(URL) --no-web --clients=$(NUM_CLIENTS) --hatch-rate=$(HATCH_RATE) --expect-slaves=$(NUM_CLIENTS)

stop_slaves:
	killall locust

.PHONY: slaves run stop_slaves

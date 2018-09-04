URL := "http://localhost:8080"
USERNAME := ""
PASSWORD := ""
NUM_CLIENTS := 100
HATCH_RATE := 20

run:
	LOCUST_USERNAME=$(USERNAME) LOCUST_PASSWORD=$(PASSWORD) locust --host=$(URL) --no-web --clients=$(NUM_CLIENTS) --hatch-rate=$(HATCH_RATE)

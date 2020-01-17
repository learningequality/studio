import json
import os

import requests

PROBER_METRICS_URL = os.getenv("PROBER_METRICS_URL")
COMMIT_SHA = os.getenv("COMMIT_SHA")


def parse_labels(labels):
    result = {}
    label_list = labels.split(",")
    for label in label_list:
        key, value = label.split("=")
        result[key] = value

    return result


def send_data_to_newrelic(metric, newrelic_key, newrelic_id):
    data = json.dumps(metric)
    url = "https://insights-collector.newrelic.com/v1/accounts/{}/events".format(newrelic_id)
    headers = {
        "X-Insert-Key": newrelic_key
    }
    print("Sending data {} to New Relic.".format(data))
    response = requests.post(url, data=data, headers=headers)
    response.raise_for_status()


def parse_metrics_page(newrelic_key, account_id):

    page = requests.get(PROBER_METRICS_URL)
    content = page.text.encode("utf8").replace("\"", "")
    metrics = []
    hostname = content.split("hostname{ptype=sysvars,probe=sysvars,val=")[1].split("}")[0]

    for line in content.splitlines():
        if line.startswith("#TYPE"):
            name = line.split("#TYPE")[1].split()[0]
            metric_dict = {
                "eventType": "ProberMetrics",
                "metric_name": name,
                "hostname": hostname,
                "release_commit_sha": COMMIT_SHA,
            }
            metrics.append(metric_dict)
        elif line.startswith(("total", "success", "latency", "timeouts", "resp_code")):
            data, count, timestamp = line.split()
            labels = data.split("{")[1].split("}")[0]
            labels_dict = parse_labels(labels)
            metrics[-1].update({
                "metric_value": float(count),
                "timestamp": int(timestamp),
            })
            metrics[-1].update(labels_dict)
            send_data_to_newrelic(metrics[-1], newrelic_key, account_id)
        else:
            continue

    return metrics


if __name__ == "__main__":
    newrelic_key = os.getenv("PROBER_NEWRELIC_KEY")
    account_id = os.getenv("PROBER_NEWRELIC_ACCOUNT_ID")
    if newrelic_key and account_id:
        parse_metrics_page(newrelic_key, account_id)
    else:
        print("Environment variables PROBER_NEWRELIC_KEY and PROBER_NEWRELIC_ACCOUNT_ID do not have values. Not sending data to New Relic.")

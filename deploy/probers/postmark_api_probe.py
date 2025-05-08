#!/usr/bin/env python
import requests
from base import BaseProbe

POSTMARK_SERVICE_STATUS_URL = "https://status.postmarkapp.com/api/1.0/services"

# (See here for API details: https://status.postmarkapp.com/api)
ALL_POSSIBLE_STATUSES = ["UP", "MAINTENANCE", "DELAY", "DEGRADED", "DOWN"]

PASSING_POSTMARK_STATUSES = {
    "/services/smtp": ["UP", "MAINTENANCE"],
    "/services/api": ALL_POSSIBLE_STATUSES,
    "/services/inbound": ALL_POSSIBLE_STATUSES,
    "/services/web": ALL_POSSIBLE_STATUSES,
}


class PostmarkProbe(BaseProbe):
    metric = "postmark_api_latency_msec"

    def do_probe(self):
        r = requests.get(url=POSTMARK_SERVICE_STATUS_URL)
        for service in r.json():
            allowed_statuses = PASSING_POSTMARK_STATUSES.get(service["url"])
            passing = service["status"] in allowed_statuses

            if passing:
                continue
            raise Exception(
                "Postmark's `%s` service has status %s, but we require one of the following: %s"
                % (service["name"], service["status"], allowed_statuses)
            )


if __name__ == "__main__":
    PostmarkProbe().run()

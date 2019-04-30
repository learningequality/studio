#!/usr/bin/env python
import json

from base import BaseProbe
from le_utils.constants import content_kinds


class TopicCreationProbe(BaseProbe):

    metric = "topic_creation_latency_msec"
    develop_only = True

    def do_probe(self):
        payload = {
            'title': 'Statistics and Probe-ability',
            'kind': content_kinds.TOPIC,
        }
        self.request("api/create_new_node", action="POST", data=json.dumps(payload))


if __name__ == "__main__":
    TopicCreationProbe().run()

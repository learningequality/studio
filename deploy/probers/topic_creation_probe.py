#!/usr/bin/env python
import json

from base import BaseProbe
from le_utils.constants import content_kinds


class TopicCreationProbe(BaseProbe):

    metric = "topic_creation_latency_msec"
    develop_only = True
    prober_name = "TOPIC-CREATION-PROBER"

    def _get_channel(self):
        response = self.request("api/probers/get_prober_channel")
        return json.loads(response.content)

    def do_probe(self):
        channel = self._get_channel()
        payload = {
            "title": "Statistics and Probeability",
            "kind": content_kinds.TOPIC,
        }
        response = self.request(
            "api/contentnode", action="POST", data=json.dumps(payload)
        )

        # Test saving to channel works
        new_topic = json.loads(response.content)
        new_topic.update({"parent": channel["main_tree"]})
        path = "api/contentnode/{}".format(new_topic["id"])
        self.request(
            path,
            action="PUT",
            data=payload,
            contenttype="application/x-www-form-urlencoded",
        )


if __name__ == "__main__":
    TopicCreationProbe().run()

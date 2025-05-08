#!/usr/bin/env python
import json

from base import BaseProbe


class ChannelCreationProbe(BaseProbe):

    metric = "channel_creation_latency_msec"
    develop_only = True
    prober_name = "CHANNEL-CREATION-PROBER"

    def _get_user_id(self):
        response = self.request("api/internal/authenticate_user_internal")
        return json.loads(response.content)["user_id"]

    def do_probe(self):
        payload = {
            "description": "description",
            "language": "en-PT",
            "name": "test",
            "thumbnail": "b3897c3d96bde7f1cff77ce368924098.png",
            "content_defaults": "{}",
            "editors": [self._get_user_id()],
        }
        self.request(
            "api/channel",
            action="POST",
            data=payload,
            contenttype="application/x-www-form-urlencoded",
        )


if __name__ == "__main__":
    ChannelCreationProbe().run()

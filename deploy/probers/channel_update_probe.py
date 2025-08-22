#!/usr/bin/env python
import json

from base import BaseProbe


class ChannelUpdateProbe(BaseProbe):

    metric = "channel_update_latency_msec"
    prober_name = "CHANNEL-UPDATE-PROBER"
    develop_only = True

    def _get_channel(self):
        response = self.request("api/probers/get_prober_channel")
        return json.loads(response.content)

    def do_probe(self):
        channel = self._get_channel()
        payload = {"name": "New Test Name", "id": channel["id"]}
        path = "api/channel/{}".format(channel["id"])
        self.request(
            path,
            action="PATCH",
            data=payload,
            contenttype="application/x-www-form-urlencoded",
        )


if __name__ == "__main__":
    ChannelUpdateProbe().run()

#!/usr/bin/env python
import json

from base import BaseProbe


class ChannelEditPageProbe(BaseProbe):

    metric = "channel_edit_page_latency_msec"
    prober_name = "CHANNEL-EDIT-PAGE-PROBER"

    def _get_channel(self):
        response = self.request("api/probers/get_prober_channel")
        return json.loads(response.content)

    def do_probe(self):
        channel = self._get_channel()
        path = "channels/{}/edit".format(channel["id"])
        self.request(path)


if __name__ == "__main__":
    ChannelEditPageProbe().run()

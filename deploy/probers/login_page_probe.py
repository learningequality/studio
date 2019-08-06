#!/usr/bin/env python
from base import BaseProbe


class LoginProbe(BaseProbe):

    metric = "login_latency_msec"

    def do_probe(self):
        self._login()


if __name__ == "__main__":
    LoginProbe().run()

#!/usr/bin/env python
import os
import requests
import datetime

from base import BaseProbe

STUDIO_BASE_URL = os.getenv("STUDIO_BASE_URL") or "https://studio.learningequality.org/{path}"

class LoginProbe(BaseProbe):

    metric = "login_latency_msec"

    def do_probe(self):
        r = self._login()


if __name__ == "__main__":
    LoginProbe().run()

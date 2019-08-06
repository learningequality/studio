import datetime
import os

import requests

USERNAME = os.getenv("PROBER_STUDIO_USERNAME") or "a@a.com"
PASSWORD = os.getenv("PROBER_STUDIO_PASSWORD") or "a"
PRODUCTION_MODE_ON = os.getenv("PROBER_STUDIO_PRODUCTION_MODE_ON") or False
STUDIO_BASE_URL = os.getenv("PROBER_STUDIO_BASE_URL") or "http://127.0.0.1:8080/{path}"


class BaseProbe(object):

    metric = "STUB_METRIC"
    develop_only = False

    def __init__(self):
        self.session = requests.Session()

    def do_probe(self):
        pass

    def _login(self):
        # get our initial csrf
        url = self._construct_studio_url("/accounts/login/")
        r = self.session.get(url)
        r.raise_for_status()
        csrf = self.session.cookies.get("csrftoken")
        formdata = {
            "username": USERNAME,
            "password": PASSWORD,
            "csrfmiddlewaretoken": csrf,
        }
        headers = {
            "content-type": "application/x-www-form-urlencoded",
            "referer": url,
        }

        r = self.session.post(
            url,
            data=formdata,
            headers=headers,
        )
        r.raise_for_status()

        return r

    def _construct_studio_url(self, path):
        path_stripped = path.lstrip("/")
        return STUDIO_BASE_URL.format(path=path_stripped)

    def request(self, path, action="GET", data=None, headers=None, contenttype="application/json"):
        data = data or {}
        headers = headers or {}

        # Make sure session is logged in
        if not self.session.cookies.get('csrftoken'):
            self._login()

        url = self._construct_studio_url(path)

        headers.update({
            'X-CSRFToken': self.session.cookies.get('csrftoken'),
        })

        headers.update({'Content-Type': contenttype})
        response = self.session.request(action, url, data=data, headers=headers)
        response.raise_for_status()

        return response

    def run(self):

        if self.develop_only and PRODUCTION_MODE_ON:
            return

        start_time = datetime.datetime.now()

        self.do_probe()

        end_time = datetime.datetime.now()
        elapsed = (end_time - start_time).total_seconds() * 1000

        print("{metric_name} {latency_ms}".format(
            metric_name=self.metric,
            latency_ms=elapsed))

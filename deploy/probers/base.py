import datetime
import os

import requests

USERNAME = os.getenv("PROBER_STUDIO_USERNAME") or "a@a.com"
PASSWORD = os.getenv("PROBER_STUDIO_PASSWORD") or "a"
PRODUCTION_MODE_ON = os.getenv("PROBER_STUDIO_PRODUCTION_MODE_ON") or False
STUDIO_BASE_URL = os.getenv("PROBER_STUDIO_BASE_URL") or "http://127.0.0.1:8080"


class BaseProbe(object):

    metric = "STUB_METRIC"
    develop_only = False
    prober_name = "PROBER"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(
            {"User-Agent": "Studio-Internal-Prober={}".format(self.prober_name)}
        )

    def do_probe(self):
        pass

    def _login(self):
        # get our initial csrf
        url = self._construct_studio_url("/en/accounts/")
        r = self.session.get(url)
        r.raise_for_status()
        csrf = self.session.cookies.get("csrftoken")
        formdata = {
            "username": USERNAME,
            "password": PASSWORD,
        }
        headers = {
            "referer": url,
            "X-Studio-Internal-Prober": "LOGIN-PROBER",
            "X-CSRFToken": csrf,
        }

        r = self.session.post(
            self._construct_studio_url("/en/accounts/login/"),
            json=formdata,
            headers=headers,
            allow_redirects=False,
        )
        r.raise_for_status()

        # Since logging into Studio with correct username and password should redirect, fail otherwise
        if r.status_code != 302:
            raise ProberException("Cannot log into Studio.")

        return r

    def _construct_studio_url(self, path):
        path_stripped = path.lstrip("/")
        url = "{base_url}/{path}".format(base_url=STUDIO_BASE_URL, path=path_stripped)
        return url

    def request(
        self,
        path,
        action="GET",
        data=None,
        headers=None,
        contenttype="application/json",
    ):
        data = data or {}
        headers = headers or {}

        # Make sure session is logged in
        if not self.session.cookies.get("csrftoken"):
            self._login()

        url = self._construct_studio_url(path)

        headers.update(
            {
                "X-CSRFToken": self.session.cookies.get("csrftoken"),
            }
        )

        headers.update({"Content-Type": contenttype})
        headers.update({"X-Studio-Internal-Prober": self.prober_name})
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

        print(  # noqa: T201
            "{metric_name} {latency_ms}".format(
                metric_name=self.metric, latency_ms=elapsed
            )
        )


class ProberException(Exception):
    pass

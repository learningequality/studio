from __future__ import absolute_import

import importlib
from builtins import str

from django.conf import settings
from django.urls import reverse

from .base import StudioTestCase


class AllUrlsTest(StudioTestCase):
    def test_responses(  # noqa: C901
        self, allowed_http_codes=None, default_kwargs=None, quiet=False
    ):
        """
        This is a very liberal test, we are mostly just concerned with making sure
        that no pages throw errors (500).
        Adapted from:
        http://stackoverflow.com/questions/14454001/list-all-suburls-and-check-if-broken-in-python#answer-19162337
        Test all pattern in root urlconf and included ones.
        Do GET requests only.
        A pattern is skipped if any of the conditions applies:
            - pattern has no name in urlconf
            - pattern expects any positinal parameters
            - pattern expects keyword parameters that are not specified in @default_kwargs
        If response code is not in @allowed_http_codes, fail the test.
        Specify @default_kwargs to be used for patterns that expect keyword parameters,
            e.g. if you specify default_kwargs={'username': 'testuser'}, then
            for pattern url(r'^accounts/(?P<username>[\\.\\w-]+)/$'
            the url /accounts/testuser/ will be tested.
        If @quiet=False, print all the urls checked. If status code of the response is not 200,
            print the status code.
        """
        if not allowed_http_codes:
            allowed_http_codes = [200, 302, 400, 401, 403, 404, 405, 412]

        if not default_kwargs:
            default_kwargs = {}

        # Some URLs only use POST requests
        # or don't work without built assets
        # exclude them here.
        url_blacklist = ["api/sync/", "serviceWorker.js"]
        module = importlib.import_module(settings.ROOT_URLCONF)

        def check_urls(urlpatterns, prefix=""):
            for pattern in urlpatterns:
                if hasattr(pattern, "url_patterns"):
                    # this is an included urlconf
                    new_prefix = prefix
                    if pattern.namespace:
                        new_prefix = (
                            prefix + (":" if prefix else "") + pattern.namespace
                        )
                    check_urls(pattern.url_patterns, prefix=new_prefix)
                params = {}
                skip = False

                regex = pattern.pattern.regex
                for url in url_blacklist:
                    if regex.match(url):
                        skip = True
                if regex.groups > 0:
                    # the url expects parameters
                    # use default_kwargs supplied
                    if regex.groups > len(list(regex.groupindex.keys())) or set(
                        regex.groupindex.keys()
                    ) - set(default_kwargs.keys()):
                        # there are positional parameters OR
                        # keyword parameters that are not supplied in default_kwargs
                        # so we skip the url
                        skip = True
                    else:
                        for key in set(default_kwargs.keys()) & set(
                            regex.groupindex.keys()
                        ):
                            params[key] = default_kwargs[key]
                if hasattr(pattern, "name") and pattern.name:
                    name = pattern.name
                else:
                    # if pattern has no name, skip it
                    skip = True
                    name = ""
                fullname = (prefix + ":" + name) if prefix else name
                if not skip:
                    url = reverse(fullname, kwargs=params)
                    print("testing url: {0}".format(url))
                    response = self.client.get(url)

                    # TODO: We should specifically check for 403 errors and
                    # ensure that logging in as admin resolves them.
                    self.assertIn(
                        response.status_code,
                        allowed_http_codes,
                        "{url} gave status code {status_code}".format(
                            url=url, status_code=response.status_code
                        ),
                    )
                    # print status code if it is not 200
                    status = (
                        ""
                        if response.status_code == 200
                        else str(response.status_code) + " "
                    )
                    if not quiet:
                        print(status + url)
                else:
                    if not quiet:
                        print("SKIP " + regex.pattern + " " + fullname)

        check_urls(module.urlpatterns)

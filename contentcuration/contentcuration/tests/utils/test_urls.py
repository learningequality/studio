from django.contrib.sites.models import Site
from django.test import override_settings

from contentcuration.tests.base import StudioTestCase
from contentcuration.utils.urls import canonical_url


class CanonicalUrlTestCase(StudioTestCase):
    @override_settings(SITE_ID=1)
    def test_production_domain_uses_https(self):
        self.assertEqual(
            canonical_url("/settings/"),
            "https://studio.learningequality.org/settings/",
        )

    @override_settings(SITE_ID=3)
    def test_branch_subdomain_uses_https(self):
        self.assertEqual(
            canonical_url("/settings/"),
            "https://unstable.studio.learningequality.org/settings/",
        )

    @override_settings(SITE_ID=2)
    def test_local_dev_loopback_uses_http(self):
        self.assertEqual(canonical_url("/settings/"), "http://127.0.0.1:8080/settings/")

    def test_localhost_uses_http(self):
        site = Site.objects.create(
            pk=9999, domain="localhost:9000", name="Localhost test"
        )
        with override_settings(SITE_ID=site.pk):
            self.assertEqual(
                canonical_url("/settings/"), "http://localhost:9000/settings/"
            )

    @override_settings(SITE_ID=1)
    def test_empty_path_returns_bare_url(self):
        self.assertEqual(canonical_url(), "https://studio.learningequality.org")

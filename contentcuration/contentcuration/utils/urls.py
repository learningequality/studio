from django.contrib.sites.models import Site
from django.contrib.sites.shortcuts import get_current_site

_LOCAL_HOSTS = ("127.0.0.1", "localhost", "::1")


def canonical_url(path="", request=None):
    """Absolute URL on the Site framework's canonical domain.

    Prefer this over ``request.build_absolute_uri`` for URLs handed to
    external systems: the latter reflects the Host header Django actually
    received, which on production is the internal pod hostname rather
    than the public canonical.
    """
    if request is not None:
        domain = get_current_site(request).domain
    else:
        domain = Site.objects.get_current().domain
    scheme = "http" if domain.startswith(_LOCAL_HOSTS) else "https"
    return f"{scheme}://{domain}{path}"

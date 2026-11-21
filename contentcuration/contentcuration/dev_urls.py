import os
import urllib.parse

from django.conf import settings
from django.contrib import admin
from django.http.response import HttpResponseNotFound
from django.http.response import HttpResponseRedirect
from django.urls import include
from django.urls import path
from django.urls import re_path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions

from .urls import urlpatterns
from contentcuration.utils.gcs_storage import is_emulating


def webpack_redirect_view(request):
    return HttpResponseRedirect(
        "http://127.0.0.1:4000/__open-in-editor?{query}".format(
            query=request.GET.urlencode()
        )
    )


def file_server(request, storage_path=None):
    if storage_path is None:
        return HttpResponseNotFound()

    if is_emulating():
        emulator = urllib.parse.urlparse(os.environ["STORAGE_EMULATOR_HOST"])
        hostname = urllib.parse.urlsplit("//" + request.get_host()).hostname
        if ":" in hostname:
            hostname = "[{}]".format(hostname)
        authority = (
            "{}:{}".format(hostname, emulator.port) if emulator.port else hostname
        )
        url = "{}://{}/download/storage/v1/b/{}/o/{}".format(
            emulator.scheme, authority, settings.AWS_S3_BUCKET_NAME, storage_path
        )
    else:
        url = "{}/{}/{}".format(
            settings.AWS_S3_ENDPOINT_URL.rstrip("/"),
            settings.AWS_S3_BUCKET_NAME,
            storage_path,
        )
    return HttpResponseRedirect(url)


schema_view = get_schema_view(
    openapi.Info(
        title="Kolibri Studio API",
        default_version="v0",
        description="Kolibri Studio Swagger API",
        license=openapi.License(name="MIT"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = urlpatterns + [
    re_path(r"^__open-in-editor/", webpack_redirect_view),
    path("admin/", admin.site.urls),
    re_path(
        r"^swagger(?P<format>\.json|\.yaml)$",
        schema_view.without_ui(cache_timeout=0),
        name="schema-json",
    ),
    re_path(
        r"^api_explorer/$",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui",
    ),
    re_path(
        r"^redoc/$", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"
    ),
    re_path(r"^api-auth/", include("rest_framework.urls", namespace="rest_framework")),
    re_path(r"^content/(?P<storage_path>.+)$", file_server),
]

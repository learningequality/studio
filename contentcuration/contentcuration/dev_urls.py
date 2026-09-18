import urllib.parse

from django.conf import settings
from django.contrib import admin
from django.core.files.storage import default_storage
from django.http.response import HttpResponseNotFound
from django.http.response import HttpResponseRedirect
from django.urls import include
from django.urls import path
from django.urls import re_path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions

from .urls import urlpatterns


def webpack_redirect_view(request):
    return HttpResponseRedirect(
        f"http://{settings.WEBPACK_DEV_PUBLIC_HOST}:{settings.WEBPACK_DEV_PUBLIC_PORT}"
        f"/__open-in-editor?{request.GET.urlencode()}"
    )


def file_server(request, storage_path=None):
    """
    Development fallback to redirect file storage requests to Minio
    """
    # generate the minio storage URL, so we can get the GET parameters that give everyone
    # access even if they don't need to log in
    if storage_path is None:
        return HttpResponseNotFound()

    params = urllib.parse.urlparse(default_storage.url(storage_path)).query
    # Unset: minio published beside Studio, not on the browser's own machine.
    endpoint = settings.AWS_S3_PUBLIC_ENDPOINT_URL or "http://{host}:9000".format(
        host=request.META["HTTP_HOST"].split(":")[0]
    )
    url = "{endpoint}/{bucket}/{path}?{params}".format(
        endpoint=endpoint.rstrip("/"),
        bucket=settings.AWS_S3_BUCKET_NAME,
        path=storage_path,
        params=params,
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

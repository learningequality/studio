import urllib.parse

from django.conf import settings
from django.contrib import admin
from django.core.files.storage import default_storage
from django.http.response import HttpResponseNotFound
from django.http.response import HttpResponseRedirect
from django.urls import include
from django.urls import path
from django.urls import re_path
from django.views.generic import TemplateView
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions

from .urls import urlpatterns


def webpack_redirect_view(request):
    return HttpResponseRedirect(
        "http://127.0.0.1:4000/__open-in-editor?{query}".format(
            query=request.GET.urlencode()
        )
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
    host = request.META["HTTP_HOST"].split(":")[0]
    port = 9000  # hardcoded to the default minio IP address
    url = "http://{host}:{port}/{bucket}/{path}?{params}".format(
        host=host,
        port=port,
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

urlpatterns += [
    re_path(r'^editor-dev(?:/.*)?$', TemplateView.as_view(template_name='contentcuration/editor_dev.html')),
]

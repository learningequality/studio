from django.conf import settings
from django.conf.urls import include
from django.conf.urls import url
from django.contrib import admin
from django.http.response import HttpResponseRedirect
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions

import contentcuration.views.files as file_views
from .urls import urlpatterns


def webpack_redirect_view(request):
    return HttpResponseRedirect(
        "http://127.0.0.1:4000/__open-in-editor?{query}".format(
            query=request.GET.urlencode()
        )
    )


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
    url(r"^__open-in-editor/", webpack_redirect_view),
    url(r'^admin/', include(admin.site.urls)),
    url(
        r"^swagger(?P<format>\.json|\.yaml)$",
        schema_view.without_ui(cache_timeout=0),
        name="schema-json",
    ),
    url(
        r"^api_explorer/$",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui",
    ),
    url(
        r"^redoc/$", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"
    ),
    url(r"^api-auth/", include("rest_framework.urls", namespace="rest_framework")),
    url(
        r"^" + settings.STORAGE_URL[1:] + "(?P<path>.*)$",
        file_views.debug_serve_file,
        name="debug_serve_file",
    ),
    url(
        r"^" + settings.CONTENT_DATABASE_URL[1:] + "(?P<path>.*)$",
        file_views.debug_serve_content_database_file,
        name="content_database_debug_serve_file",
    ),
    url(
        r"^" + settings.CSV_URL[1:] + "(?P<path>.*)$",
        file_views.debug_serve_file,
        name="csv_debug_serve_file",
    ),
]

if getattr(settings, "DEBUG_PANEL_ACTIVE", False):

    import debug_toolbar

    urlpatterns = [url(r"^__debug__/", include(debug_toolbar.urls))] + urlpatterns

import os
from wsgiref.util import FileWrapper

from django.conf import settings
from django.core.files.storage import default_storage
from django.http import Http404
from django.http import HttpResponse
from rest_framework.authentication import SessionAuthentication
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import authentication_classes
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated

from contentcuration.models import generate_object_storage_name


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def debug_serve_file(request, path):
    # There's a problem with loading exercise images, so use this endpoint
    # to serve the image files to the /content/storage url
    filename = os.path.basename(path)
    checksum, _ext = os.path.splitext(filename)
    filepath = generate_object_storage_name(checksum, filename)

    if not default_storage.exists(filepath):
        raise Http404("The object requested does not exist.")
    with default_storage.open(filepath, "rb") as fobj:
        response = HttpResponse(
            FileWrapper(fobj), content_type="application/octet-stream"
        )
        return response


def debug_serve_content_database_file(request, path):
    filename = os.path.basename(path)
    path = "/".join([settings.DB_ROOT, filename])
    if not default_storage.exists(path):
        raise Http404("The object requested does not exist.")
    with default_storage.open(path, "rb") as f:
        response = HttpResponse(FileWrapper(f), content_type="application/octet-stream")
        return response

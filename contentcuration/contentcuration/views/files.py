import codecs
import json
import logging
import os
from wsgiref.util import FileWrapper

from builtins import str
from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.core.files.storage import default_storage
from django.http import Http404
from django.http import HttpResponse
from django.http import HttpResponseBadRequest
from django.views.decorators.http import require_http_methods
from rest_framework.authentication import SessionAuthentication
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import authentication_classes
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import JSONRenderer

from contentcuration.models import ContentNode
from contentcuration.models import generate_object_storage_name
from contentcuration.models import generate_storage_url
from contentcuration.serializers import FileSerializer
from contentcuration.serializers import TaskSerializer
from contentcuration.tasks import create_async_task
from contentcuration.utils.files import generate_thumbnail_from_node
from contentcuration.utils.files import get_thumbnail_encoding
from contentcuration.utils.storage_common import get_presigned_upload_url


@api_view(["POST"])
@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def upload_url(request):
    try:
        size = request.data["size"]
        checksum = request.data["checksum"]
        filename = request.data["name"]
    except KeyError:
        raise HttpResponseBadRequest(reason="Must specify: size, checksum, and name")

    try:
        request.user.check_space(float(size), checksum)

    except PermissionDenied as e:
        return HttpResponseBadRequest(reason=str(e), status=418)

    filepath = generate_object_storage_name(checksum, filename)
    checksum_base64 = codecs.encode(codecs.decode(checksum, "hex"), "base64").decode()
    url = get_presigned_upload_url(filepath, checksum_base64, 600, content_length=size)

    return HttpResponse(url)


@require_http_methods(["GET"])
@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def create_thumbnail(request, channel_id, filename):
    task_info = {
        "user": request.user,
        "metadata": {"affects": {"channels": [channel_id]}},
    }
    task_args = {"filename": filename}

    task, task_info = create_async_task("generate-thumbnail", task_info, task_args)
    return HttpResponse(JSONRenderer().render(TaskSerializer(task_info).data))


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def generate_thumbnail(request, contentnode_id):
    logging.debug("Entering the generate_thumbnail endpoint")

    if request.method != "POST":
        return HttpResponseBadRequest(
            "Only POST requests are allowed on this endpoint."
        )

    node = ContentNode.objects.get(pk=contentnode_id)

    thumbnail_object = generate_thumbnail_from_node(node)

    try:
        request.user.check_space(thumbnail_object.file_size, thumbnail_object.checksum)
    except Exception as e:
        if thumbnail_object:
            thumbnail_object.delete()
        raise e

    return HttpResponse(
        json.dumps(
            {
                "success": True,
                "file": JSONRenderer()
                .render(FileSerializer(thumbnail_object).data)
                .decode("utf-8"),
                "path": generate_storage_url(str(thumbnail_object)),
                "encoding": get_thumbnail_encoding(str(thumbnail_object)),
            }
        )
    )


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

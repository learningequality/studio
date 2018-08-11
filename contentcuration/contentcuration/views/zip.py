import datetime
import time
import mimetypes
import os
import re
import zipfile

from django.core.files.storage import default_storage
from django.http import Http404, HttpResponse, HttpResponseNotFound
from django.http.response import FileResponse, HttpResponseNotModified
from django.utils.http import http_date
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.generic.base import View
from le_utils.constants import exercises
from contentcuration.models import generate_object_storage_name

try:
    from urlparse import urljoin
except ImportError:
    from urllib.parse import urljoin


# valid storage filenames consist of 32-char hex plus a file extension
VALID_STORAGE_FILENAME = re.compile("[0-9a-f]{32}(-data)?\.[0-9a-z]+")

# set of file extensions that should be considered zip files and allow access to internal files
POSSIBLE_ZIPPED_FILE_EXTENSIONS = set([".perseus", ".zip", ".epub", ".epub3"])


def _add_access_control_headers(request, response):
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    requested_headers = request.META.get("HTTP_ACCESS_CONTROL_REQUEST_HEADERS", "")
    if requested_headers:
        response["Access-Control-Allow-Headers"] = requested_headers


# DISK PATHS

class ZipContentView(View):
    @xframe_options_exempt
    def options(self, request, *args, **kwargs):
        """
        Handles OPTIONS requests which may be sent as "preflight CORS" requests to check permissions.
        """
        response = HttpResponse()
        _add_access_control_headers(request, response)
        return response

    @xframe_options_exempt
    def get(self, request, zipped_filename, embedded_filepath):
        """
        Handles GET requests and serves a static file from within the zip file.
        """
        assert VALID_STORAGE_FILENAME.match(zipped_filename), "'{}' is not a valid content storage filename".format(zipped_filename)

        storage = default_storage

        # calculate the local file path to the zip file
        filename, ext = os.path.splitext(zipped_filename)
        zipped_path = generate_object_storage_name(filename, zipped_filename)

        # file size
        file_size = 0

        # if the zipfile does not exist on disk, return a 404
        if not storage.exists(zipped_path):
            return HttpResponseNotFound('"%(filename)s" does not exist in storage' % {'filename': zipped_path})

        # if client has a cached version, use that (we can safely assume nothing has changed, due to MD5)
        if request.META.get('HTTP_IF_MODIFIED_SINCE'):
            return HttpResponseNotModified()

        zf_obj = storage.open(zipped_path)

        with zipfile.ZipFile(zf_obj) as zf:
            # if no path, or a directory, is being referenced, look for an index.html file
            if not embedded_filepath or embedded_filepath.endswith("/"):
                embedded_filepath += "index.html"

            # get the details about the embedded file, and ensure it exists
            try:
                info = zf.getinfo(embedded_filepath)
            except KeyError:
                return HttpResponseNotFound('"{}" does not exist inside "{}"'.format(embedded_filepath, zipped_filename))

            # try to guess the MIME type of the embedded file being referenced
            content_type = mimetypes.guess_type(embedded_filepath)[0] or 'application/octet-stream'

            if not os.path.splitext(embedded_filepath)[1] == '.json':
                # generate a streaming response object, pulling data from within the zip  file
                response = FileResponse(zf.open(info), content_type=content_type)
                file_size = info.file_size
            else:
                # load the stream from json file into memory, replace the path_place_holder.
                content = zf.open(info).read()
                str_to_be_replaced = ('$' + exercises.IMG_PLACEHOLDER).encode()
                zipcontent = ('/' + request.resolver_match.url_name + "/" + zipped_filename).encode()
                content_with_path = content.replace(str_to_be_replaced, zipcontent)
                response = HttpResponse(content_with_path, content_type=content_type)
                file_size = len(content_with_path)

        # set the last-modified header to the date marked on the embedded file
        if info.date_time:
            response["Last-Modified"] = http_date(time.mktime(datetime.datetime(*info.date_time).timetuple()))

        #cache these resources forever; this is safe due to the MD5-naming used on content files
        response["Expires"] = "Sun, 17-Jan-2038 19:14:07 GMT"

        # set the content-length header to the size of the embedded file
        if file_size:
            response["Content-Length"] = file_size

        # ensure the browser knows not to try byte-range requests, as we don't support them here
        response["Accept-Ranges"] = "none"

        _add_access_control_headers(request, response)

        # restrict CSP to only allow resources to be loaded from the Studio host, to prevent info leakage
        # (e.g. via passing user info out as GET parameters to an attacker's server), or inadvertent data usage
        host = request.build_absolute_uri('/').strip("/")
        response["Content-Security-Policy"] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: " + host

        return response

import datetime
import time
import mimetypes
import os
import re
import zipfile

from django.conf import settings
from django.core.urlresolvers import reverse
from django.http import Http404, HttpResponse
from django.http.response import FileResponse, HttpResponseNotModified
from django.utils.http import http_date
from django.views.generic.base import View
from le_utils.constants import exercises
from contentcuration.models import generate_storage_url

try:
    from urlparse import urljoin
except ImportError:
    from urllib.parse import urljoin


# valid storage filenames consist of 32-char hex plus a file extension
VALID_STORAGE_FILENAME = re.compile("[0-9a-f]{32}(-data)?\.[0-9a-z]+")

# set of file extensions that should be considered zip files and allow access to internal files
POSSIBLE_ZIPPED_FILE_EXTENSIONS = set([".perseus", ".zip", ".epub", ".epub3"])


# DISK PATHS

def get_content_folder_path(datafolder):
    return os.path.join(
        datafolder,
        "content",
    )

def get_content_storage_folder_path(datafolder=None):
    return os.path.join(
        get_content_folder_path(datafolder),
        "storage",
    ) if datafolder else settings.STORAGE_ROOT

def get_content_storage_file_path(filename, datafolder=None):
    assert VALID_STORAGE_FILENAME.match(filename), "'{}' is not a valid content storage filename".format(filename)
    return os.path.join(
        get_content_storage_folder_path(datafolder),
        filename[0],
        filename[1],
        filename,
    )

class ZipContentView(View):

    def get(self, request, zipped_filename, embedded_filepath):
        """
        Handles GET requests and serves a static file from within the zip file.
        """
        assert VALID_STORAGE_FILENAME.match(zipped_filename), "'{}' is not a valid content storage filename".format(filename)

        # calculate the local file path to the zip file
        zipped_path = generate_storage_url(zipped_filename).lstrip('/')

        # file size
        file_size = 0

        # if the zipfile does not exist on disk, return a 404
        if not os.path.exists(zipped_path):
            raise Http404('"%(filename)s" does not exist locally' % {'filename': zipped_path})

        # if client has a cached version, use that (we can safely assume nothing has changed, due to MD5)
        if request.META.get('HTTP_IF_MODIFIED_SINCE'):
            return HttpResponseNotModified()

        with zipfile.ZipFile(zipped_path) as zf:

            # if no path, or a directory, is being referenced, look for an index.html file
            if not embedded_filepath or embedded_filepath.endswith("/"):
                embedded_filepath += "index.html"

            # get the details about the embedded file, and ensure it exists
            try:
                info = zf.getinfo(embedded_filepath)
            except KeyError:
                raise Http404('"{}" does not exist inside "{}"'.format(embedded_filepath, zipped_filename))

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
        if info.file_size:
            response["Content-Length"] = file_size

        # ensure the browser knows not to try byte-range requests, as we don't support them here
        response["Accept-Ranges"] = "none"

        # allow all origins so that content can be read from within zips within sandboxed iframes
        response["Access-Control-Allow-Origin"] = "*"

        return response

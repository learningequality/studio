import datetime
import logging
import mimetypes
import os
import re
import time
import zipfile
from xml.etree.ElementTree import SubElement

import html5lib
from django.conf import settings
from django.core.files.storage import default_storage
from django.http import HttpResponse
from django.http import HttpResponseNotFound
from django.http import HttpResponseServerError
from django.http.response import FileResponse
from django.http.response import HttpResponseNotModified
from django.utils.http import http_date
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.generic.base import View
from le_utils.constants import exercises
from sentry_sdk import capture_message
from webpack_loader.utils import get_files

from contentcuration.models import generate_object_storage_name

try:
    pass
except ImportError:
    pass


# valid storage filenames consist of 32-char hex plus a file extension
VALID_STORAGE_FILENAME = re.compile("[0-9a-f]{32}(-data)?\\.[0-9a-z]+")

# set of file extensions that should be considered zip files and allow access to internal files
POSSIBLE_ZIPPED_FILE_EXTENSIONS = set([".perseus", ".zip", ".epub", ".epub3"])


def _add_access_control_headers(request, response):
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    requested_headers = request.META.get("HTTP_ACCESS_CONTROL_REQUEST_HEADERS", "")
    if requested_headers:
        response["Access-Control-Allow-Headers"] = requested_headers


def parse_html(content):
    try:
        document = html5lib.parse(content, namespaceHTMLElements=False)

        if not document:
            # Could not parse
            return content

        # Because html5lib parses like a browser, it will
        # always create head and body tags if they are missing.
        head = document.find("head")
        for file in get_files("htmlScreenshot", "js"):
            SubElement(head, "script", attrib={"src": file["url"]})
        # Currently, html5lib strips the doctype, but it's important for correct rendering, so check the original
        # content for the doctype and, if found, prepend it to the content serialized by html5lib
        doctype = None
        try:
            # Now parse the content as a dom tree instead, so that we capture
            # any doctype node as a dom node that we can read.
            tree_builder_dom = html5lib.treebuilders.getTreeBuilder("dom")
            parser_dom = html5lib.HTMLParser(
                tree_builder_dom, namespaceHTMLElements=False
            )
            tree = parser_dom.parse(content)
            # By HTML Spec if doctype is included, it must be the first thing
            # in the document, so it has to be the first child node of the document
            doctype_node = tree.childNodes[0]

            # Check that this node is in fact a doctype node
            if doctype_node.nodeType == doctype_node.DOCUMENT_TYPE_NODE:
                # render to a string by calling the toxml method
                # toxml uses single quotes by default, replace with ""
                doctype = doctype_node.toxml().replace("'", '"')
        except Exception as e:
            logging.warn("Error in HTML5 parsing to determine doctype {}".format(e))

        html = html5lib.serialize(
            document,
            quote_attr_values="always",
            omit_optional_tags=False,
            minimize_boolean_attributes=False,
            use_trailing_solidus=True,
            space_before_trailing_solidus=False,
        )

        if doctype:
            html = doctype + html

        return html
    except html5lib.html5parser.ParseError:
        return content


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

    @xframe_options_exempt  # noqa
    def get(self, request, zipped_filename, embedded_filepath):  # noqa: C901
        """
        Handles GET requests and serves a static file from within the zip file.
        """
        if not VALID_STORAGE_FILENAME.match(zipped_filename):
            return HttpResponseNotFound("Invalid URL for this zip file")

        storage = default_storage

        # calculate the local file path to the zip file
        filename, ext = os.path.splitext(zipped_filename)
        zipped_path = generate_object_storage_name(filename, zipped_filename)

        # file size
        file_size = 0

        # if the zipfile does not exist on disk, return a 404
        if not storage.exists(zipped_path):
            return HttpResponseNotFound("Zipfile does not exist in storage")

        # if client has a cached version, use that (we can safely assume nothing has changed, due to MD5)
        if request.META.get("HTTP_IF_MODIFIED_SINCE"):
            return HttpResponseNotModified()

        zf_obj = storage.open(zipped_path)

        try:
            with zipfile.ZipFile(zf_obj) as zf:
                # if no path, or a directory, is being referenced, look for an index.html file
                if not embedded_filepath or embedded_filepath.endswith("/"):
                    embedded_filepath += "index.html"

                # get the details about the embedded file, and ensure it exists
                try:
                    info = zf.getinfo(embedded_filepath)
                except KeyError:
                    return HttpResponseNotFound(
                        "Embedded file does not exist inside zip"
                    )

                # try to guess the MIME type of the embedded file being referenced
                content_type = (
                    mimetypes.guess_type(embedded_filepath)[0]
                    or "application/octet-stream"
                )

                if embedded_filepath.endswith(".html") and request.GET.get(
                    "screenshot"
                ):
                    content_type = "text/html"

                    content = zf.open(info).read()

                    response = HttpResponse(
                        parse_html(content), content_type=content_type
                    )
                    file_size = info.file_size
                elif not os.path.splitext(embedded_filepath)[1] == ".json":
                    # generate a streaming response object, pulling data from within the zip  file
                    response = FileResponse(zf.open(info), content_type=content_type)
                    file_size = info.file_size
                else:
                    # load the stream from json file into memory, replace the path_place_holder.
                    content = zf.open(info).read()
                    str_to_be_replaced = ("$" + exercises.IMG_PLACEHOLDER).encode()
                    zipcontent = (
                        "/" + request.resolver_match.url_name + "/" + zipped_filename
                    ).encode()
                    content_with_path = content.replace(str_to_be_replaced, zipcontent)
                    response = HttpResponse(
                        content_with_path, content_type=content_type
                    )
                    file_size = len(content_with_path)
        except zipfile.BadZipfile:
            just_downloaded = getattr(
                zf_obj, "just_downloaded", "Unknown (Most likely local file)"
            )
            capture_message(
                "Unable to open zip file. File info: name={}, size={}, mode={}, just_downloaded={}".format(
                    zf_obj.name, zf_obj.size, zf_obj.mode, just_downloaded
                )
            )
            return HttpResponseServerError(
                "Attempt to open zip file failed. Please try again, and if you continue to receive this message, please check that the zip file is valid."
            )

        # set the last-modified header to the date marked on the embedded file
        if info.date_time:
            response["Last-Modified"] = http_date(
                time.mktime(datetime.datetime(*info.date_time).timetuple())
            )

        # cache these resources forever; this is safe due to the MD5-naming used on content files
        response["Expires"] = "Sun, 17-Jan-2038 19:14:07 GMT"

        # set the content-length header to the size of the embedded file
        if file_size:
            response["Content-Length"] = file_size

        # ensure the browser knows not to try byte-range requests, as we don't support them here
        response["Accept-Ranges"] = "none"

        _add_access_control_headers(request, response)

        # restrict CSP to only allow resources to be loaded from the Studio host, to prevent info leakage
        # (e.g. via passing user info out as GET parameters to an attacker's server), or inadvertent data usage
        host = request.build_absolute_uri("/").strip("/")
        response["Content-Security-Policy"] = (
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: " + host
        )

        if getattr(settings, "DEBUG", False):
            response[
                "Content-Security-Policy"
            ] += " http://127.0.0.1:4000 ws://127.0.0.1:4000"

        return response

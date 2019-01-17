import os

from django.contrib.auth.decorators import login_required
from django.contrib.sites.shortcuts import get_current_site
from django.core.files.storage import default_storage
from django.http import StreamingHttpResponse
from rest_framework.authentication import BasicAuthentication
from rest_framework.authentication import SessionAuthentication
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view
from rest_framework.decorators import authentication_classes

from contentcuration.utils.export_writer import ChannelDetailsCSVWriter
from contentcuration.utils.export_writer import ChannelDetailsPDFWriter
from contentcuration.utils.export_writer import ChannelDetailsPPTWriter


def export_iterator(filepath, chunk_size=8192):
    with default_storage.open(filepath) as fobj:
        for chunk in iter(lambda: fobj.read(chunk_size), b""):
            yield chunk


def generate_response(filepath, content_type, filename=None):
    filename = filename or os.path.basename(filepath)
    response = StreamingHttpResponse(export_iterator(filepath), content_type=content_type)
    response['Content-Length'] = default_storage.size(filepath)
    response['Content-Disposition'] = "attachment; filename=%s" % filename
    response.set_cookie(key='fileDownload', value="true")
    response.set_cookie(key='path', value="/")
    return response


@login_required
@api_view(['GET'])
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
def get_channel_details_pdf_endpoint(request, channel_id):
    condensed = bool(request.query_params.get('condensed'))
    filepath = ChannelDetailsPDFWriter([channel_id], site=get_current_site(request), condensed=condensed).write()
    return generate_response(filepath, "application/pdf")


@api_view(['GET'])
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
def get_channel_details_ppt_endpoint(request, channel_id):
    filepath = ChannelDetailsPPTWriter([channel_id], site=get_current_site(request)).write()
    return generate_response(filepath, "application/vnd.openxmlformats-officedocument.presentationml.presentation")


@api_view(['GET'])
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
def get_channel_details_csv_endpoint(request, channel_id):
    filepath = ChannelDetailsCSVWriter([channel_id], site=get_current_site(request)).write()
    return generate_response(filepath, "text/csv")

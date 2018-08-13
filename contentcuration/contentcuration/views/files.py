import json
import logging
import os
from django.http import HttpResponse, HttpResponseBadRequest
from django.conf import settings
from django.core.files import File as DjFile
from django.core.files.storage import default_storage
from rest_framework.renderers import JSONRenderer
from contentcuration.api import write_file_to_storage, get_hash
from contentcuration.utils.files import generate_thumbnail_from_node
from contentcuration.models import File, FormatPreset, ContentNode, License, generate_storage_url, generate_object_storage_name
from contentcuration.serializers import FileSerializer, ContentNodeEditSerializer
from le_utils.constants import format_presets, content_kinds, exercises, licenses
from pressurecooker.videos import guess_video_preset_by_resolution
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import authentication_classes, permission_classes
from wsgiref.util import FileWrapper


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def file_upload(request):
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")

    # Implement logic for switching out files without saving it yet
    filename, ext = os.path.splitext(request.FILES.values()[0]._name)
    size = request.FILES.values()[0]._size
    contentfile = DjFile(request.FILES.values()[0])
    checksum = get_hash(contentfile)
    request.user.check_space(size, checksum)

    file_object = File(
        file_size=size,
        file_on_disk=contentfile,
        checksum=checksum,
        file_format_id=ext[1:].lower(),
        original_filename=request.FILES.values()[0]._name,
        preset_id=request.META.get('HTTP_PRESET'),
        language_id=request.META.get('HTTP_LANGUAGE'),
        uploaded_by=request.user,
    )
    file_object.save()

    return HttpResponse(json.dumps({
        "success": True,
        "filename": str(file_object),
        "file": JSONRenderer().render(FileSerializer(file_object).data)
    }))

@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def file_create(request):
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")

    original_filename, ext = os.path.splitext(request.FILES.values()[0]._name)
    size = request.FILES.values()[0]._size
    contentfile = DjFile(request.FILES.values()[0])
    checksum = get_hash(contentfile)
    request.user.check_space(size, checksum)

    presets = FormatPreset.objects.filter(allowed_formats__extension__contains=ext[1:].lower())
    kind = presets.first().kind
    preferences = json.loads(request.META.get('HTTP_PREFERENCES') or "{}")

    # sometimes we get a string no matter what. Try to parse it again
    if isinstance(preferences, basestring):
        preferences = json.loads(preferences)

    license = License.objects.filter(license_name=preferences.get('license')).first()  # Use filter/first in case preference hasn't been set
    license_id = license.pk if license else None
    new_node = ContentNode(
        title=original_filename,
        kind=kind,
        license_id=license_id,
        author=preferences.get('author') or "",
        aggregator=preferences.get('aggregator') or "",
        provider=preferences.get('provider') or "",
        copyright_holder=preferences.get('copyright_holder'),
        parent_id=settings.ORPHANAGE_ROOT_ID,
    )
    if license and license.is_custom:
        new_node.license_description = preferences.get('license_description')
    new_node.save()
    file_object = File(
        file_on_disk=contentfile,
        checksum=checksum,
        file_format_id=ext[1:].lower(),
        original_filename=request.FILES.values()[0]._name,
        contentnode=new_node,
        file_size=size,
        uploaded_by=request.user,
    )
    file_object.save()

    if kind.pk == content_kinds.VIDEO:
        file_object.preset_id = guess_video_preset_by_resolution(str(file_object.file_on_disk))
    elif presets.filter(supplementary=False).count() == 1:
        file_object.preset = presets.filter(supplementary=False).first()
    file_object.save()

    thumbnail = None
    try:
        if preferences.get('auto_derive_video_thumbnail') and new_node.kind_id == content_kinds.VIDEO \
                or preferences.get('auto_derive_audio_thumbnail') and new_node.kind_id == content_kinds.AUDIO \
                or preferences.get('auto_derive_html5_thumbnail') and new_node.kind_id == content_kinds.HTML5 \
                or preferences.get('auto_derive_document_thumbnail') and new_node.kind_id == content_kinds.DOCUMENT:
            thumbnail = generate_thumbnail_from_node(new_node, set_node=True)
            request.user.check_space(thumbnail.file_size, thumbnail.checksum)
    except Exception:
        if thumbnail:
            thumbnail.delete()

    return HttpResponse(json.dumps({
        "success": True,
        "node": JSONRenderer().render(ContentNodeEditSerializer(new_node).data)
    }))

@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def generate_thumbnail(request):
    logging.debug("Entering the generate_thumbnail endpoint")

    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")

    data = json.loads(request.body)
    node = ContentNode.objects.get(pk=data["node_id"])


    thumbnail_object = generate_thumbnail_from_node(node)
    try:
        request.user.check_space(thumbnail_object.file_size, thumbnail_object.checksum)
    except Exception as e:
        if thumbnail_object:
            thumbnail_object.delete()
        raise e

    return HttpResponse(json.dumps({
        "success": True,
        "file": JSONRenderer().render(FileSerializer(thumbnail_object).data),
        "path": generate_storage_url(str(thumbnail_object)),
    }))

@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def thumbnail_upload(request):
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")

    fobj = request.FILES.values()[0]
    checksum = get_hash(DjFile(fobj))
    request.user.check_space(fobj._size, checksum)

    formatted_filename = write_file_to_storage(fobj)

    return HttpResponse(json.dumps({
        "success": True,
        "formatted_filename": formatted_filename,
        "file": None,
        "path": generate_storage_url(formatted_filename),
    }))

@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def image_upload(request):
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")

    fobj = request.FILES.values()[0]
    name, ext = os.path.splitext(fobj._name)  # gets file extension without leading period
    checksum = get_hash(DjFile(fobj))
    request.user.check_space(fobj._size, checksum)

    file_object = File(
        contentnode_id=request.META.get('HTTP_NODE'),
        original_filename=name,
        preset_id=request.META.get('HTTP_PRESET'),
        file_on_disk=DjFile(request.FILES.values()[0]),
        file_format_id=ext[1:].lower(),
        uploaded_by=request.user
    )
    file_object.save()
    return HttpResponse(json.dumps({
        "success": True,
        "file": JSONRenderer().render(FileSerializer(file_object).data),
        "path": generate_storage_url(str(file_object)),
    }))

@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def exercise_image_upload(request):
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")

    fobj = request.FILES.values()[0]
    name, ext = os.path.splitext(fobj._name)
    checksum = get_hash(DjFile(fobj))
    file_object = File(
        preset_id=format_presets.EXERCISE_IMAGE,
        file_on_disk=DjFile(request.FILES.values()[0]),
        file_format_id=ext[1:].lower(),
    )
    file_object.save()
    return HttpResponse(json.dumps({
        "success": True,
        "formatted_filename": exercises.CONTENT_STORAGE_FORMAT.format(str(file_object)),
        "file_id": file_object.pk,
        "path": generate_storage_url(str(file_object)),
    }))

@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def debug_serve_file(request, path):
    # There's a problem with loading exercise images, so use this endpoint
    # to serve the image files to the /content/storage url
    filename = os.path.basename(path)
    checksum, _ext = os.path.splitext(filename)
    filepath = generate_object_storage_name(checksum, filename)

    with default_storage.open(filepath, 'rb') as fobj:
        response = HttpResponse(FileWrapper(fobj))
        return response

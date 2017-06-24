import json
import logging
import os
from django.http import HttpResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.core.urlresolvers import reverse_lazy
from django.core.files import File as DjFile
from rest_framework.renderers import JSONRenderer
from contentcuration.api import write_file_to_storage
from contentcuration.utils.files import generate_thumbnail_from_node
from contentcuration.models import File, FormatPreset, ContentNode, License, generate_file_on_disk_name, generate_storage_url
from contentcuration.serializers import FileSerializer, ContentNodeEditSerializer
from le_utils.constants import format_presets, content_kinds, file_formats, exercises, licenses
from pressurecooker.videos import guess_video_preset_by_resolution

def file_upload(request):
    if request.method == 'POST':
        #Implement logic for switching out files without saving it yet
        filename, ext = os.path.splitext(request.FILES.values()[0]._name)
        size = request.FILES.values()[0]._size
        file_object = File(
            file_size=size,
            file_on_disk=DjFile(request.FILES.values()[0]),
            file_format_id=ext[1:].lower(),
            original_filename=request.FILES.values()[0]._name,
            preset_id=request.META.get('HTTP_PRESET'),
            language_id=request.META.get('HTTP_LANGUAGE'),
        )
        file_object.save()
        return HttpResponse(json.dumps({
            "success": True,
            "filename": str(file_object),
            "file": JSONRenderer().render(FileSerializer(file_object).data)
        }))

def file_create(request):
    if request.method == 'POST':
        original_filename, ext = os.path.splitext(request.FILES.values()[0]._name)
        size = request.FILES.values()[0]._size
        presets = FormatPreset.objects.filter(allowed_formats__extension__contains=ext[1:].lower())
        kind = presets.first().kind
        preferences = json.loads(request.META.get('HTTP_PREFERENCES'))
        author = preferences.get('author') or ""
        license = License.objects.filter(license_name=preferences.get('license')).first() # Use filter/first in case preference hasn't been set
        license_id = license.pk if license else settings.DEFAULT_LICENSE
        new_node = ContentNode(title=original_filename, kind=kind, license_id=license_id, author=author, copyright_holder=preferences.get('copyright_holder'))
        if license.license_name == licenses.SPECIAL_PERMISSIONS:
            new_node.license_description = preferences.get('license_description')
        new_node.save()
        file_object = File(file_on_disk=DjFile(request.FILES.values()[0]), file_format_id=ext[1:].lower(), original_filename=request.FILES.values()[0]._name, contentnode=new_node, file_size=size)
        file_object.save()
        if kind.pk == content_kinds.VIDEO:
            file_object.preset_id = guess_video_preset_by_resolution(str(file_object.file_on_disk))
        elif presets.filter(supplementary=False).count() == 1:
            file_object.preset = presets.filter(supplementary=False).first()

        file_object.save()

        try:
            if preferences.get('auto_derive_video_thumbnail') and new_node.kind_id == content_kinds.VIDEO \
                or preferences.get('auto_derive_audio_thumbnail') and new_node.kind_id == content_kinds.AUDIO \
                or preferences.get('auto_derive_html5_thumbnail') and new_node.kind_id == content_kinds.HTML5 \
                or preferences.get('auto_derive_document_thumbnail') and new_node.kind_id == content_kinds.DOCUMENT:
                generate_thumbnail_from_node(new_node, set_node=True)
        except Exception:
            pass

        return HttpResponse(json.dumps({
            "success": True,
            "node": JSONRenderer().render(ContentNodeEditSerializer(new_node).data)
        }))

def generate_thumbnail(request):
    logging.debug("Entering the generate_thumbnail endpoint")

    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    else:
        data = json.loads(request.body)
        node = ContentNode.objects.get(pk=data["node_id"])

        thumbnail_object = generate_thumbnail_from_node(node)

        return HttpResponse(json.dumps({
            "success": True,
            "file": JSONRenderer().render(FileSerializer(thumbnail_object).data),
            "path": generate_storage_url(str(thumbnail_object)),
        }))

def thumbnail_upload(request):
    if request.method == 'POST':
        fobj = request.FILES.values()[0]
        formatted_filename = write_file_to_storage(fobj)

        return HttpResponse(json.dumps({
            "success": True,
            "formatted_filename": formatted_filename,
            "file":  None,
            "path": generate_storage_url(formatted_filename),
        }))

def image_upload(request):
    if request.method == 'POST':
        name, ext = os.path.splitext(request.FILES.values()[0]._name) # gets file extension without leading period
        file_object = File(contentnode_id=request.META.get('HTTP_NODE'),original_filename=name, preset_id=request.META.get('HTTP_PRESET'), file_on_disk=DjFile(request.FILES.values()[0]), file_format_id=ext[1:])
        file_object.save()
        return HttpResponse(json.dumps({
            "success": True,
            "file": JSONRenderer().render(FileSerializer(file_object).data),
            "path": generate_storage_url(str(file_object)),
        }))

def exercise_image_upload(request):
    if request.method == 'POST':
        ext = os.path.splitext(request.FILES.values()[0]._name)[1][1:] # gets file extension without leading period
        file_object = File(preset_id=format_presets.EXERCISE_IMAGE, file_on_disk=DjFile(request.FILES.values()[0]), file_format_id=ext)
        file_object.save()
        return HttpResponse(json.dumps({
            "success": True,
            "formatted_filename": exercises.CONTENT_STORAGE_FORMAT.format(str(file_object)),
            "file_id": file_object.pk,
            "path": generate_storage_url(str(file_object)),
        }))

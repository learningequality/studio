import copy
import json
import logging
import os
from rest_framework import status
from django.http import Http404, HttpResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.core import paginator
from django.core.exceptions import ObjectDoesNotExist
from django.core.files.storage import get_storage_class
from django.template import RequestContext
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer
from contentcuration.models import Exercise, AssessmentItem, Channel, License, FileFormat, File, FormatPreset, ContentKind, ContentNode, ContentTag
from contentcuration.serializers import ExerciseSerializer, AssessmentItemSerializer, ChannelSerializer, LicenseSerializer, FileFormatSerializer, FormatPresetSerializer, ContentKindSerializer, ContentNodeSerializer, TagSerializer

def base(request):
    return redirect('channels')    # redirect to the channel list page


def testpage(request):
    return render(request, 'test.html')

def channel_list(request):
    channel_list = Channel.objects.filter(deleted=False) # Todo: only allow access to certain channels?
    channel_serializer = ChannelSerializer(channel_list, many=True)

    licenses = License.objects.all()
    license_serializer = LicenseSerializer(licenses, many=True)
    return render(request, 'channel_list.html', {"channels" : JSONRenderer().render(channel_serializer.data),
                                                 "license_list" : JSONRenderer().render(license_serializer.data)})

def channel(request, channel_id):
    channel = get_object_or_404(Channel, id=channel_id, deleted=False)
    channel_serializer =  ChannelSerializer(channel)

    channel_list = Channel.objects.filter(deleted=False) # Todo: only allow access to certain channels?
    channel_list_serializer = ChannelSerializer(channel_list, many=True)

    fileformats = FileFormat.objects.all()
    fileformat_serializer = FileFormatSerializer(fileformats, many=True)

    licenses = License.objects.all()
    license_serializer = LicenseSerializer(licenses, many=True)

    formatpresets = FormatPreset.objects.all()
    formatpreset_serializer = FormatPresetSerializer(formatpresets, many=True)

    contentkinds = ContentKind.objects.all()
    contentkind_serializer = ContentKindSerializer(contentkinds, many=True)

    return render(request, 'channel_edit.html', {"channel" : JSONRenderer().render(channel_serializer.data),
                                                "channels" : JSONRenderer().render(channel_list_serializer.data),
                                                "fileformat_list" : JSONRenderer().render(fileformat_serializer.data),
                                                 "license_list" : JSONRenderer().render(license_serializer.data),
                                                 "fpreset_list" : JSONRenderer().render(formatpreset_serializer.data),
                                                 "ckinds_list" : JSONRenderer().render(contentkind_serializer.data),
                                                 "ctags": JSONRenderer().render(channel_tags_serializer.data)})

def exercise_list(request):

    exercise_list = Exercise.objects.all().order_by('title')

    paged_list = paginator.Paginator(exercise_list, 25)  # Show 25 exercises per page

    page = request.GET.get('page')

    try:
        exercises = paged_list.page(page)
    except paginator.PageNotAnInteger:
        # If page is not an integer, deliver first page.
        exercises = paged_list.page(1)
    except paginator.EmptyPage:
        # If page is out of range (e.g. 9999), deliver last page of results.
        exercises = paged_list.page(paginator.num_pages)

    serializer = ExerciseSerializer(exercises.object_list, many=True)

    return render(request, 'exercise_list.html', {"exercises": exercises, "blob": JSONRenderer().render(serializer.data)})


def exercise(request, exercise_id):

    exercise = get_object_or_404(Exercise, id=exercise_id)

    serializer = ExerciseSerializer(exercise)

    assessment_items = AssessmentItem.objects.filter(exercise=exercise)

    assessment_serialize = AssessmentItemSerializer(assessment_items, many=True)

    return render(request, 'exercise_edit.html', {"exercise": JSONRenderer().render(serializer.data), "assessment_items": JSONRenderer().render(assessment_serialize.data)})


# TODO-BLOCKER: remove this csrf_exempt! People might upload random stuff here and we don't want that.
@csrf_exempt
def file_upload(request):

    if request.method == 'POST':
        ext = os.path.splitext(request.FILES.values()[0]._name)[1].split(".")[-1]
        original_filename = request.FILES.values()[0]._name
        file_object = File(file_on_disk=request.FILES.values()[0], file_format=FileFormat.objects.get(extension=ext), original_filename = original_filename)
        file_object.save()
        return HttpResponse(json.dumps({
            "success": True,
            "filename": str(file_object),
            "object_id": file_object.pk
        }))

def thumbnail_upload(request):
    return HttpResponse(json.dumps({
        "success": True
    }))

@csrf_exempt
def duplicate_node(request):
    logging.debug("Entering the copy_node endpoint")

    if request.method != 'POST':
        raise HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    else:
        data = json.loads(request.body)

        try:
            node_id = data["node_id"]
            sort_order = data["sort_order"]
            target_parent = data["target_parent"]
        except KeyError:
            raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))

        logging.info("Copying node id %s", node_id)

        new_node = _duplicate_node(node_id, parent=target_parent)
        return HttpResponse(json.dumps({
            "success": True,
            "node_id": new_node.pk
        }))

def _duplicate_node(node, parent=None):
    if isinstance(node, int) or isinstance(node, basestring):
        node = ContentNode.objects.get(pk=node)
    new_node = ContentNode.objects.create(
        title=node.title,
        description=node.description,
        kind=node.kind,
        license=node.license,
        parent=ContentNode.objects.get(pk=parent) if parent else None,
        sort_order=node.sort_order,
        license_owner=node.license_owner,
        changed=True
    )

    # add tags now
    new_node.tags.add(*node.tags.all())

    # copy file object too
    for fobj in node.files.all():
        fobj_copy = copy.copy(fobj)
        fobj_copy.id = None
        fobj_copy.contentnode = new_node
        fobj_copy.save()

    new_node.children = [_duplicate_node(c, parent=None) for c in node.children.all()]
    new_node.save()

    return new_node
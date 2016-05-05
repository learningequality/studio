import copy
import json
import logging
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
from contentcuration.models import Exercise, AssessmentItem, Channel, Node, TopicTree, MimeType, ContentLicense
from contentcuration.serializers import ExerciseSerializer, AssessmentItemSerializer, ChannelSerializer, NodeSerializer, TopicTreeSerializer, MimeTypeSerializer, LicenseSerializer

from kolibri.content.models import File

def base(request):
    return redirect('channels')    # redirect to the channel list page


def testpage(request):
    return render(request, 'test.html')

def channel_list(request):
    channel_list = Channel.objects.all() # Todo: only allow access to certain channels?
    channel_serializer = ChannelSerializer(channel_list, many=True)

    licenses = ContentLicense.objects.all()
    license_serializer = LicenseSerializer(licenses, many=True)
    return render(request, 'channel_list.html', {"channels" : JSONRenderer().render(channel_serializer.data),
                                                 "license_list" : JSONRenderer().render(license_serializer.data)})

def channel(request, channel_id):
    channel = get_object_or_404(Channel, id=channel_id)
    channel_serializer =  ChannelSerializer(channel)

    mimetypes = MimeType.objects.all()
    mimetype_serializer = MimeTypeSerializer(mimetypes, many=True)

    mimetypes = MimeType.objects.all()
    mimetype_serializer = MimeTypeSerializer(mimetypes, many=True)

    licenses = ContentLicense.objects.all()
    license_serializer = LicenseSerializer(licenses, many=True)
    return render(request, 'channel_edit.html', {"channel" : JSONRenderer().render(channel_serializer.data),
                                                 "mimetypes" : JSONRenderer().render(mimetype_serializer.data),
                                                 "license_list" : JSONRenderer().render(license_serializer.data)})

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
        file_object = File(content_copy=request.FILES.values()[0])
        file_object.save()
        return HttpResponse(json.dumps({
            "success": True,
            "filename": str(file_object),
        }))


@csrf_exempt
def duplicate_node(request):
    logging.debug("Entering the copy_node endpoint")

    if request.method != 'POST':
        raise HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    else:
        data = request.POST

        try:
            node_id = data["node_id"]
            sort_order = data["sort_order"]
            target_parent = data["target_parent"]
        except KeyError:
            raise ObjectDoesNotExist("Missing attribute from data: %s".format(data))

        logging.info("Copying node id %s", node_id)
        new_node = _duplicate_node(node_id, parent=target_parent)

        serialized_node = NodeSerializer(new_node)
        return HttpResponse(JSONRenderer().render(serialized_node.data))


def _duplicate_node(node, parent=None):
    if isinstance(node, int) or isinstance(node, basestring):
        node = Node.objects.get(pk=node)

    node = copy.copy(node)
    node.id = node.pk = None
    node.parent = Node.objects.get(pk=parent) if parent else node.parent
    node.published = False

    node.children = [_duplicate_node(c, parent=None) for c in node.children.all()]
    node.save()

    return node
